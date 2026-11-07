/* Social sign-in uses the existing Supabase session. Guest accounts are linked,
   never silently replaced, so their school profile and XP keep the same owner. */
(function () {
  'use strict';
  const EF = window.EF;
  const cfg = window.EF_CONFIG || {};
  const names = { google: 'Google', apple: 'Apple' };
  const pendingKey = 'ef2:oauth-pending';
  let checking = null, checkedAt = 0, providerSettings = null, busy = false;
  let notice = '';

  function message(error) {
    const code = String(error && (error.code || error.error_code) || '');
    if (/identity_already_exists|email_exists|user_already_exists/.test(code)) return 'That sign-in belongs to another account. Your current profile is unchanged. Save its transfer code before signing into a different account.';
    if (/manual_linking_disabled/.test(code)) return 'Account linking is not available yet. Your current profile and progress are safe.';
    if (/provider_disabled|validation_failed/.test(code)) return 'This sign-in option is not available yet. You can continue with your current profile.';
    if (/access_denied|user_cancelled|user_canceled/.test(code)) return 'Sign-in was cancelled. Your current profile is unchanged.';
    if (/bad_code_verifier|flow_state|otp_expired|invalid_grant/.test(code)) return 'That sign-in link expired. Try again in the same browser where you started.';
    return 'Could not finish sign-in. Check your connection and try again. Your saved progress is still on this device.';
  }

  async function providers(force) {
    if (!cfg.supabaseUrl || !cfg.supabaseKey) return { google: false, apple: false, email: false, guest: false };
    if (!force && providerSettings && Date.now() - checkedAt < 60000) return providerSettings;
    if (checking) return checking;
    checking = (async () => {
      const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 8000);
      try {
        const response = await fetch(cfg.supabaseUrl.replace(/\/$/, '') + '/auth/v1/settings', {
          headers: { apikey: cfg.supabaseKey }, signal: ctl.signal, cache: 'no-store'
        });
        if (!response.ok) throw new Error('settings');
        const settings = await response.json();
        const ext = settings.external || {};
        providerSettings = { google: ext.google === true, apple: ext.apple === true, email: ext.email === true && settings.disable_signup !== true, guest: ext.anonymous_users === true };
        checkedAt = Date.now();
        return providerSettings;
      } catch (e) { throw new Error('Could not check sign-in options. Check your connection and try again.'); }
      finally { clearTimeout(timer); checking = null; }
    })();
    return checking;
  }

  function connected(user) {
    const identities = user && Array.isArray(user.identities) ? user.identities : [];
    return Object.keys(names).filter((provider) => identities.some((identity) => identity.provider === provider));
  }

  async function status() {
    const available = await providers();
    const client = await EF.cloudClient();
    const result = await client.auth.getSession();
    if (result.error) throw new Error(message(result.error));
    const user = result.data && result.data.session && result.data.session.user;
    const identities = user && Array.isArray(user.identities) ? user.identities : [];
    return { signedIn: !!user, anonymous: !!(user && user.is_anonymous), connected: connected(user), providers: available,
      email: identities.some((i) => i.provider === 'email') ? user.email : null, pendingEmail: user && user.new_email ? user.new_email : null };
  }

  async function start(provider) {
    if (!Object.prototype.hasOwnProperty.call(names, provider)) throw new Error('Choose Google or Apple to continue.');
    if (busy) return { pending: true };
    busy = true;
    try {
      await api.ready;
      if (!(await providers(true))[provider]) throw new Error(names[provider] + ' sign-in is not available yet. You can continue with your current profile.');
      const client = await EF.cloudClient();
      const sessionResult = await client.auth.getSession();
      if (sessionResult.error) throw new Error(message(sessionResult.error));
      const session = sessionResult.data && sessionResult.data.session;
      if (session && connected(session.user).includes(provider)) return { connected: true };
      // Only our same-origin root is used as a return URL. No caller-provided redirects.
      const redirectTo = location.origin + location.pathname;
      const options = { redirectTo, skipBrowserRedirect: true };
      if (provider === 'google') options.queryParams = { prompt: 'select_account' };
      // With a profile on this device, attach the sign-in to it so its XP and friends keep the same owner.
      // Without one (no session, or a leftover guest session from an unfinished join), sign in instead:
      // that brings back a profile made on another device, or starts a new one.
      const linking = !!(session && EF.cloud.joined());
      if (linking) await EF.cloud.pushSave();
      const result = linking
        ? await client.auth.linkIdentity({ provider, options })
        : await client.auth.signInWithOAuth({ provider, options });
      if (result.error) throw new Error(message(result.error));
      if (!result.data || !result.data.url) throw new Error('Could not open sign-in. Try again.');
      const target = new URL(result.data.url);
      const allowed = [new URL(cfg.supabaseUrl).hostname, 'accounts.google.com', 'appleid.apple.com'];
      if (target.protocol !== 'https:' || !allowed.includes(target.hostname)) throw new Error('Could not open sign-in securely. Try again.');
      try { sessionStorage.setItem(pendingKey, JSON.stringify({ provider, at: Date.now() })); } catch (e) { /* PKCE is managed by the shared auth client. */ }
      location.assign(target.href);
      return { redirecting: true };
    } finally { busy = false; }
  }

  async function callback() {
    const url = new URL(location.href);
    const hashParams = new URLSearchParams(url.hash.slice(1));
    const code = url.searchParams.get('code');
    const errorCode = url.searchParams.get('error_code') || url.searchParams.get('error') || hashParams.get('error_code') || hashParams.get('error');
    const retryRestore = !code && !errorCode && typeof EF.cloud.restorePending === 'function' && EF.cloud.restorePending();
    if (!code && !errorCode && !retryRestore) return;
    // Remove auth codes and provider error details from the address before rendering.
    ['code', 'error', 'error_code', 'error_description'].forEach((key) => url.searchParams.delete(key));
    if (errorCode) url.hash = '#/me';
    history.replaceState(null, '', url.pathname + url.search + url.hash);
    let restoring = retryRestore;
    try {
      if (errorCode) throw { code: errorCode };
      if (code) {
        const client = await EF.cloudClient();
        const result = await client.auth.exchangeCodeForSession(code);
        if (result.error) throw result.error;
        if (!result.data || !result.data.session) throw new Error('session');
        restoring = true;
      }
      const profile = await EF.cloud.restoreAuth();
      history.replaceState(null, '', url.pathname + url.search + (profile ? '#/me' : '#/'));
      notice = profile ? 'Signed in. Your profile and progress are ready.' : 'Signed in! Let’s finish setting up your account.';
      const restoreWarning = profile && typeof EF.cloud.restoreWarning === 'function' ? EF.cloud.restoreWarning() : '';
      if (restoreWarning) notice = 'Signed in. ' + restoreWarning;
    } catch (e) {
      if (restoring) {
        history.replaceState(null, '', url.pathname + url.search + '#/me');
        notice = 'You are signed in, but your profile could not be downloaded yet. Reload when you are online to try again. Your cloud backup is safe.';
      } else { notice = message(e); }
    }
    finally { try { sessionStorage.removeItem(pendingKey); } catch (e) { /* optional */ } }
    setTimeout(() => { if (notice) EF.toast(notice, errorCode ? 'fa-circle-info' : 'fa-user'); }, 100);
  }

  /* Email: a one-time sign-in link (no password). New addresses get a new account.
     linkEmail() adds an email to the account already on this device instead (a guest keeps their progress). */
  const EMAIL_OK = /^[^\s@]{1,64}@[^\s@]+\.[^\s@]{2,}$/;
  function emailMessage(error) {
    const code = String(error && (error.code || error.error_code) || ''), text = String(error && error.message || '');
    if (/email_address_not_authorized/.test(code) || /not authorized/i.test(text)) return 'Email sign-in isn’t open to everyone yet. Use Google, or continue as a guest for now.';
    if (/over_email_send_rate_limit|rate_limit/.test(code) || /rate limit/i.test(text)) return 'Too many sign-in emails were sent. Try again in a little while, or use Google.';
    if (/email_address_invalid|validation_failed/.test(code)) return 'That email address doesn’t look right. Check it and try again.';
    if (/email_exists|user_already_exists/.test(code)) return 'That email already belongs to another account.';
    return 'Couldn’t send the email. Check your connection and try again.';
  }
  async function email(address, link) {
    const a = String(address || '').trim().toLowerCase();
    if (!EMAIL_OK.test(a) || a.length > 254) throw new Error('Type your full email address.');
    await api.ready;
    if (!(await providers(true)).email) throw new Error('Email sign-in is not available yet. Use Google, or continue as a guest.');
    const client = await EF.cloudClient();
    const redirectTo = location.origin + location.pathname;
    const result = link
      ? await client.auth.updateUser({ email: a }, { emailRedirectTo: redirectTo })
      : await client.auth.signInWithOtp({ email: a, options: { emailRedirectTo: redirectTo, shouldCreateUser: true } });
    if (result.error) throw new Error(emailMessage(result.error));
    try { sessionStorage.setItem(pendingKey, JSON.stringify({ provider: 'email', at: Date.now() })); } catch (e) { /* optional */ }
    return { sent: true, email: a };
  }

  const api = EF.accountAuth = { providers, status, start, email, linkEmail: (a) => email(a, true), message, notice: () => notice };
  api.ready = callback();
})();
