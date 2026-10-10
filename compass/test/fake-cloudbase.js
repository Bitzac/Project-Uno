// In-browser stand-in for the CloudBase JS SDK surface used by src/store/cloudbase.js (auth + database + watch).
// It persists to localStorage and enforces the same rule as web/cn/db-rules.json: a signed-in user may only query,
// write or delete documents whose owner is their own uid. SMS code is always 123456.
(() => {
  const KEY = 'fake-cloudbase';
  let S = JSON.parse(localStorage.getItem(KEY) || 'null') || { users: {}, session: null, db: {} };
  const save = () => localStorage.setItem(KEY, JSON.stringify(S));
  const watchers = new Set(), authCbs = new Set();
  const uid = () => S.session;
  const denied = () => Object.assign(new Error('DATABASE_PERMISSION_DENIED'), { code: 'DATABASE_PERMISSION_DENIED' });
  const fireAuth = () => setTimeout(() => authCbs.forEach(cb => cb('SIGNED_IN')), 0);
  const notify = () => watchers.forEach(w => w.fire());

  function collection(name) {
    const docs = () => (S.db[name] = S.db[name] || {});
    const rows = w => Object.entries(docs()).map(([id, d]) => ({ _id: id, ...d })).filter(d => Object.entries(w).every(([k, v]) => d[k] === v));
    const guard = w => { if (!uid() || w.owner !== uid()) throw denied(); };
    const query = (w = {}, skip = 0, lim = 100) => ({
      where: x => query({ ...w, ...x }, skip, lim),
      skip: n => query(w, n, lim),
      limit: n => query(w, skip, n),
      async get() { guard(w); return { data: rows(w).slice(skip, skip + lim) }; },
      watch({ onChange, onError }) {
        try { guard(w); } catch (e) { setTimeout(() => onError(e), 0); return { close() { } }; }
        const me = { fire: () => onChange({ docs: rows(w), docChanges: [] }) };
        watchers.add(me); setTimeout(me.fire, 0);
        return { close: () => watchers.delete(me) };
      }
    });
    return {
      ...query(),
      doc: id => ({
        async set(d) { const old = docs()[id]; if (!uid() || d.owner !== uid() || (old && old.owner !== uid())) throw denied(); docs()[id] = JSON.parse(JSON.stringify(d)); save(); notify(); return {}; },
        async remove() { const old = docs()[id]; if (!uid() || (old && old.owner !== uid())) throw denied(); delete docs()[id]; save(); notify(); return {}; }
      })
    };
  }

  const auth = {
    async signInWithOtp({ phone }) {
      return { error: null, data: { async verifyOtp({ token }) {
        if (String(token) !== '123456') return { error: { message: '验证码错误' } };
        S.users[phone] = S.users[phone] || { id: 'u' + phone, phone };
        S.session = S.users[phone].id; save(); fireAuth();
        return { error: null, data: {} };
      } } };
    },
    async getUser() { const u = Object.values(S.users).find(x => x.id === S.session); return { data: { user: u || null } }; },
    onAuthStateChange(cb) { authCbs.add(cb); return { data: { subscription: { unsubscribe: () => authCbs.delete(cb) } } }; },
    async signOut() { S.session = null; save(); fireAuth(); return { data: {}, error: null }; },
    async getVerification({ phone_number }) { if (!phone_number.startsWith('+86 ')) throw new Error('bad phone format'); return { verification_id: 'v-' + phone_number }; },
    async verify({ verification_code }) { if (String(verification_code) !== '123456') throw new Error('验证码错误'); return { verification_token: 'vt' }; },
    async sudo({ verification_token }) { if (verification_token !== 'vt') throw new Error('bad token'); return { sudo_token: 'st' }; },
    async deleteMe({ sudo_token }) { if (sudo_token !== 'st') throw new Error('bad sudo'); for (const k in S.users) if (S.users[k].id === S.session) delete S.users[k]; save(); return {}; }
  };
  window.CB = { init: () => ({ auth: () => auth, database: () => ({ collection }) }) };
})();
