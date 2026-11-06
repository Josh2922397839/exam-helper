const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync(require('node:path').join(__dirname, '../assets/js/core/account-auth.js'), 'utf8');

function app({ session = null, joined = !!session, available = { google: true, apple: true }, href = 'https://exam-helper.edgeone.app/#/me', authError = null, target = 'https://accounts.google.com/o/oauth2/auth', profile = { username: 'student' }, restoreWarning = '', restorePending = false, restoreError = null } = {}) {
  const calls = [], url = new URL(href), storage = new Map();
  const client = { auth: {
    getSession: async () => ({ data: { session }, error: null }),
    linkIdentity: async (input) => { calls.push(['link', input]); return { data: { url: target }, error: authError }; },
    signInWithOAuth: async (input) => { calls.push(['signin', input]); return { data: { url: target }, error: authError }; },
    exchangeCodeForSession: async (code) => { calls.push(['exchange', code]); return { data: { session: {} }, error: authError }; }
  } };
  const EF = { cloudClient: async () => client, cloud: { joined: () => joined, pushSave: async () => calls.push(['save']), restoreAuth: async () => { calls.push(['restore']); if (restoreError) throw restoreError; return profile; }, restoreWarning: () => restoreWarning, restorePending: () => restorePending }, toast: () => {} };
  const context = { window: { EF, EF_CONFIG: { supabaseUrl: 'https://project.supabase.co', supabaseKey: 'public-test-key' } }, location: { href, origin: url.origin, pathname: url.pathname, assign: (next) => calls.push(['redirect', next]) }, history: { replaceState: (_, __, next) => calls.push(['history', next]) }, sessionStorage: { setItem: (k, v) => storage.set(k, v), removeItem: (k) => storage.delete(k) }, fetch: async () => ({ ok: true, json: async () => ({ external: available }) }), AbortController, URL, URLSearchParams, setTimeout: (fn, delay) => delay === 100 ? 1 : setTimeout(fn, delay), clearTimeout };
  vm.runInNewContext(source, context);
  return { api: EF.accountAuth, calls };
}

(async () => {
  let a = app({ session: { user: { id: 'guest-original', is_anonymous: true } } });
  await a.api.start('google');
  assert(a.calls.some(([kind]) => kind === 'link'));
  assert(!a.calls.some(([kind]) => kind === 'signin'));
  assert.equal(a.calls.find(([kind]) => kind === 'link')[1].options.redirectTo, 'https://exam-helper.edgeone.app/');
  assert.equal(a.calls.find(([kind]) => kind === 'link')[1].options.skipBrowserRedirect, true);

  a = app(); await a.api.start('apple');
  assert(a.calls.some(([kind]) => kind === 'signin'));
  assert(!a.calls.some(([kind]) => kind === 'link'));

  // A leftover guest session with no profile on this device signs in (to bring a profile back) instead of linking
  a = app({ session: { user: { id: 'unfinished-join', is_anonymous: true } }, joined: false });
  await a.api.start('google');
  assert(a.calls.some(([kind]) => kind === 'signin'));
  assert(!a.calls.some(([kind]) => kind === 'link' || kind === 'save'));

  a = app({ available: { google: false, apple: false } });
  await assert.rejects(a.api.start('google'), /not available yet/);
  assert.equal(a.calls.length, 0);

  a = app({ target: 'https://attacker.example/login' });
  await assert.rejects(a.api.start('google'), /securely/);
  assert(!a.calls.some(([kind]) => kind === 'redirect'));

  a = app({ session: { user: { is_anonymous: true } }, authError: { code: 'manual_linking_disabled', message: '<script>private details</script>' } });
  await assert.rejects(a.api.start('apple'), /Account linking is not available/);
  assert(!a.calls.some(([kind]) => kind === 'redirect'));

  a = app({ href: 'https://exam-helper.edgeone.app/?code=one-time-code#/' }); await a.api.ready;
  assert.deepEqual(a.calls.filter(([kind]) => kind === 'exchange'), [['exchange', 'one-time-code']]);
  assert(a.calls.some(([kind]) => kind === 'restore'));
  assert.equal(a.calls.at(-1)[1], '/#/me');
  assert(!a.calls.filter(([kind]) => kind === 'history').some(([, url]) => url.includes('code=')));

  a = app({ href: 'https://exam-helper.edgeone.app/?error=access_denied&error_description=secret#/' }); await a.api.ready;
  assert.match(a.api.notice(), /cancelled/);
  assert(!a.calls.some(([kind]) => kind === 'exchange'));
  assert(!a.calls.filter(([kind]) => kind === 'history').some(([, url]) => url.includes('secret')));
  a = app({ href: 'https://exam-helper.edgeone.app/?code=one-time-code#/', restoreWarning: 'Your cloud progress could not be downloaded yet. Try again when you are online.' }); await a.api.ready;
  assert.equal(a.calls.at(-1)[1], '/#/me');
  assert.match(a.api.notice(), /^Signed in\. Your cloud progress could not be downloaded/);
  assert(!a.api.notice().includes('progress are ready'));
  a = app({ href: 'https://exam-helper.edgeone.app/#/', restorePending: true }); await a.api.ready;
  assert.equal(a.calls.at(-1)[1], '/#/me');
  assert(a.calls.some(([kind]) => kind === 'restore'));
  assert(!a.calls.some(([kind]) => kind === 'exchange'));

  a = app({ href: 'https://exam-helper.edgeone.app/#/', restorePending: true, profile: null }); await a.api.ready;
  assert.equal(a.calls.at(-1)[1], '/#/join');

  for (const href of ['https://exam-helper.edgeone.app/#/', 'https://exam-helper.edgeone.app/?code=one-time-code#/']) {
    a = app({ href, restorePending: true, restoreError: new Error('profile RPC offline') }); await a.api.ready;
    assert.equal(a.calls.at(-1)[1], '/#/me');
    assert.match(a.api.notice(), /You are signed in, but your profile could not be downloaded/);
    assert(!a.calls.some(([kind, url]) => kind === 'history' && url.includes('#/join')));
  }

  a = app({ href: 'https://exam-helper.edgeone.app/?code=expired#/s/math', session: { user: { id: 'guest-original', is_anonymous: true } }, authError: { code: 'invalid_grant' } }); await a.api.ready;
  assert(!a.calls.some(([kind]) => kind === 'restore'));
  assert.equal(a.calls.filter(([kind]) => kind === 'history').at(-1)[1], '/#/s/math');
  assert.match(a.api.notice(), /expired/);
  console.log('Account auth: 14 focused flow checks passed.');
})().catch((error) => { console.error(error); process.exitCode = 1; });
