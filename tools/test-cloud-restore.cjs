const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Execute the real cloud module. Only browser and Supabase boundaries are faked.
const source = fs.readFileSync(path.join(__dirname, '../assets/js/core/cloud.js'), 'utf8');
const RESTORE = 'ef2:restore-pending', JOINED = 'ef2:cloud';
const remoteState = { xp: 123, scores: { chemistry: 10 } };
const remoteSets = [{ id: 'remote-set', name: 'Cloud notes', cards: [['Q', 'A']] }];

function app({ profile = { username: 'existing' }, errors = [], storage = {} } = {}) {
  const saved = new Map(Object.entries(storage)), calls = [], events = new Map();
  const faults = new Set(errors), merged = { state: null, sets: null };
  let session = { user: { id: 'existing-social-user' } };
  const client = {
    rpc: async (name, args) => {
      calls.push({ name, args });
      if (faults.has(name)) return { error: { message: 'Temporary network failure' } };
      if (name === 'ef_me') return { data: profile };
      if (name === 'ef_save_get') return { data: { state: remoteState, sets: remoteSets } };
      if (name === 'ef_save_profile') return { data: { username: args.p_username } };
      if (name === 'ef_claim') return { data: { username: 'claimed' } };
      return { data: {} };
    },
    auth: {
      getSession: async () => ({ data: { session } }),
      signInAnonymously: async () => {
        session = { user: { id: 'new-guest' } };
        return { data: { session } };
      },
      signOut: async () => { session = null; return {}; }
    }
  };
  const EF = {
    esc: (value) => String(value), icon: () => '',
    ls: { get: (key) => saved.get(key) || null, set: (key, value) => saved.set(key, value), del: (key) => saved.delete(key) },
    on: (name, callback) => {
      if (!events.has(name)) events.set(name, []);
      events.get(name).push(callback);
    },
    emit: (name, value) => (events.get(name) || []).forEach((callback) => callback(value)),
    store: { state: () => merged.state || { emptyLocal: true }, merge: (state) => { merged.state = state; } },
    sets: { list: () => merged.sets || [], mergeIn: (sets) => { merged.sets = sets; } }
  };
  vm.runInNewContext(source, {
    window: { EF, EF_CONFIG: { supabaseUrl: 'https://test.supabase.co', supabaseKey: 'public-test-key' }, supabase: { createClient: () => client }, addEventListener() {} },
    document: { querySelector: () => null, querySelectorAll: () => [], addEventListener() {} },
    navigator: { onLine: true }, setTimeout: () => 1, clearTimeout() {}
  });
  return { cloud: EF.cloud, saved, calls, faults, merged };
}

const writes = (instance) => instance.calls.filter((call) => call.name === 'ef_save_put');
const settle = () => new Promise((resolve) => setImmediate(resolve));

(async () => {
  // A failed profile lookup must protect the backup before Join or save can run.
  let a = app({ errors: ['ef_me'] });
  const restore = a.cloud.restoreAuth();
  assert.equal(a.cloud.restorePending(), true, 'the guard must be set before the first RPC resolves');
  await assert.rejects(restore, /Temporary network failure/);
  assert.equal(a.cloud.restorePending(), true);
  await assert.rejects(a.cloud.join({ username: 'renamed-existing' }), /still being restored/);
  assert(!a.calls.some((call) => call.name === 'ef_save_profile'), 'Join cannot modify the existing profile during recovery');
  await a.cloud.pushSave();
  assert.equal(writes(a).length, 0);

  // Existing joined devices also must not upload their stale local state on failure.
  a = app({ errors: ['ef_me'], storage: { [JOINED]: '1' } });
  await assert.rejects(a.cloud.restoreAuth(), /Temporary network failure/);
  await a.cloud.pushSave();
  assert.equal(writes(a).length, 0);

  // A successful profile lookup is not enough: the remote save must arrive first.
  a = app({ errors: ['ef_save_get'] });
  await a.cloud.restoreAuth();
  assert.equal(a.cloud.joined(), true);
  assert.equal(a.cloud.restorePending(), true);
  assert.match(a.cloud.restoreWarning(), /could not be downloaded/);
  await a.cloud.pushSave();
  assert.equal(writes(a).length, 0);
  assert.equal(a.merged.state, null);

  // Signing out explicitly abandons recovery, allowing a new guest to back up.
  await a.cloud.signOut();
  assert.equal(a.cloud.joined(), false);
  assert.equal(a.cloud.restorePending(), false);
  await a.cloud.join({ username: 'new-guest' });
  await settle();
  assert.equal(a.cloud.joined(), true);
  assert.equal(writes(a).length, 1, 'a stale restoration guard must not block the new account');

  // A retry downloads both kinds of data before enabling uploads again.
  a = app({ errors: ['ef_me'] });
  await assert.rejects(a.cloud.restoreAuth(), /Temporary network failure/);
  a.faults.clear();
  await a.cloud.restoreAuth();
  assert.equal(a.cloud.restorePending(), false);
  assert.equal(a.cloud.restoreWarning(), '');
  assert.equal(a.merged.state, remoteState);
  assert.equal(a.merged.sets, remoteSets);
  await a.cloud.pushSave();
  assert.equal(writes(a).length, 1);
  assert.equal(writes(a)[0].args.p_data.state, remoteState);
  assert.equal(writes(a)[0].args.p_data.sets, remoteSets);

  // A genuinely new social user has no profile or backup to protect.
  a = app({ profile: null, storage: { [JOINED]: '1', [RESTORE]: '1' } });
  assert.equal(await a.cloud.restoreAuth(), null);
  assert.equal(a.cloud.joined(), false);
  assert.equal(a.cloud.restorePending(), false);
  await a.cloud.join({ username: 'first-profile' });
  await settle();
  assert.equal(writes(a).length, 1);

  // Explicit account removal or a successful transfer cannot inherit an old guard.
  a = app({ storage: { [JOINED]: '1', [RESTORE]: '1' } });
  await a.cloud.deleteMe();
  assert.equal(a.cloud.restorePending(), false);
  assert.equal(a.cloud.joined(), false);
  a = app({ storage: { [RESTORE]: '1' } });
  await a.cloud.claim('TEST-CODE-0001');
  await settle();
  assert.equal(a.cloud.restorePending(), false);
  assert.equal(a.merged.state, remoteState);
  assert.equal(writes(a).length, 1);

  console.log('Cloud restore: 8 regression scenarios passed (lookup failure, write guard, Join guard, pull failure, sign-out/new Join, retry, new profile, delete/claim).');
})().catch((error) => { console.error(error); process.exitCode = 1; });
