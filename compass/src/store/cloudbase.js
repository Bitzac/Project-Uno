/* ---------- store + auth: Tencent CloudBase (China site, ap-shanghai) ----------
 * Same flat schema as the Firebase store (CloudBase has no subcollections). The database security rule on every
 * collection only allows doc.owner == auth.uid, and every query includes owner so it stays a subset of the rule.
 * CB is the vendor bundle (web/cn/vendor-entry.js); COMPASS_CONFIG comes from config.js. */
const RCOLS = ['students', ...COLS];
let CBA = null, CDB = null, UID = null, PHONE = '', OTP = null, DEL_VID = null, SETTINGS = {};
const cdoc = d => { const { _id, _openid, ...r } = d; return { ...r, id: _id }; };
const cclean = o => JSON.parse(JSON.stringify(o));
const cmine = (c, extra) => CDB.collection(c).where({ owner: UID, ...(extra || {}) });
function cwatch(q, cb, err) { const l = q.watch({ onChange: s => cb((s.docs || []).map(cdoc)), onError: err || (() => { }) }); return () => l.close(); }
async function cgetAll(c, extra) {
  const out = [];
  for (let skip = 0; ; skip += 100) {
    const r = await cmine(c, extra).skip(skip).limit(100).get();
    const rows = r.data || [];
    out.push(...rows.map(cdoc));
    if (rows.length < 100) return out;
  }
}
const cnewId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 10);

const STORE = {
  canEdit: true, syncLabel: '已同步到云端',
  newId: () => cnewId(),
  watchStudents: (cb, err) => cwatch(cmine('students'), cb, err),
  watchRecords: (c, sid, cb, err) => cwatch(cmine(c, { sid }), cb, err),
  watchPin: cb => cwatch(cmine('settings'), docs => { SETTINGS = docs[0] || {}; cb(SETTINGS.pin || null); }),
  async add(c, sid, obj) { const id = cnewId(); await CDB.collection(c).doc(id).set(cclean({ ...obj, owner: UID, sid })); return id; },
  put: (c, sid, id, obj) => CDB.collection(c).doc(id).set(cclean({ ...obj, owner: UID, sid })),
  del: (c, sid, id) => CDB.collection(c).doc(id).remove(),
  setPin: v => CDB.collection('settings').doc(UID).set(cclean({ ...stripId(SETTINGS), owner: UID, pin: v })),
  async deleteStudent(sid) {
    for (const c of COLS) await runJobs((await cgetAll(c, { sid })).map(d => () => CDB.collection(c).doc(d.id).remove()));
    await CDB.collection('students').doc(sid).remove();
  },
  async writeExamples(ex) {
    const jobs = [], ids = {};
    for (const s of ex.students) { const { id, ...b } = s; ids[id] = cnewId(); jobs.push(() => CDB.collection('students').doc(ids[id]).set(cclean({ ...b, owner: UID, sid: ids[id] }))); }
    for (const s of ex.students) for (const c of SCOLS) for (const { id, ...r } of ex.records[s.id][c] || []) jobs.push(() => CDB.collection(c).doc(cnewId()).set(cclean({ ...r, owner: UID, sid: ids[s.id] })));
    for (const c of PCOLS) for (const { id, ...r } of ex.private[c] || []) jobs.push(() => CDB.collection(c).doc(cnewId()).set(cclean({ ...r, owner: UID, sid: ids[r.sid] })));
    await runJobs(jobs);
  },
  async exportAll() {
    const out = {};
    for (const c of RCOLS) out[c] = (await cgetAll(c)).map(({ owner, ...d }) => d);
    out.settings = (({ owner, pin, id, ...d }) => d)((await cgetAll('settings'))[0] || {});
    return out;
  },
  async deleteAll() {
    for (const c of [...RCOLS, 'settings']) await runJobs((await cgetAll(c)).map(d => () => CDB.collection(c).doc(d.id).remove()));
  }
};
function stripId(o) { const { id, ...r } = o || {}; return r; }

const errText = e => (e && (e.message || e.error_description || e.msg)) || '操作失败，请稍后再试';
const maskPhone = p => { const d = String(p || '').replace(/\D/g, '').slice(-11); return d.length === 11 ? d.slice(0, 3) + '****' + d.slice(7) : String(p || ''); };
const AUTH = {
  kind: 'phone', where: '腾讯云上海地域（云开发数据库）',
  message: errText,
  async init(onUser) {
    const cfg = (window.COMPASS_CONFIG || {}).cloudbase;
    if (!cfg || !window.CB) throw new Error('missing config');
    const app = CB.init({ env: cfg.env, region: cfg.region || 'ap-shanghai', ...(cfg.accessKey ? { accessKey: cfg.accessKey } : {}) });
    CBA = app.auth({ persistence: 'local' }); CDB = app.database();
    const emit = async () => {
      let u = null;
      try { const r = await CBA.getUser(); u = r && r.data && r.data.user; } catch { u = null; }
      UID = u ? u.id : null; PHONE = u ? (u.phone || u.phone_number || '') : '';
      onUser(u ? { id: u.id, label: maskPhone(PHONE), verified: true } : null);
    };
    CBA.onAuthStateChange(() => { emit(); });
    await emit();
  },
  async sendCode(phone) { const { data, error } = await CBA.signInWithOtp({ phone }); if (error) throw error; OTP = data; },
  async verifyCode(code) { if (!OTP || !OTP.verifyOtp) throw new Error('请先获取验证码'); const { error } = await OTP.verifyOtp({ token: code }); if (error) throw error; OTP = null; },
  signOut: () => CBA.signOut(),
  async getSettings() { SETTINGS = (await cgetAll('settings'))[0] || {}; return SETTINGS; },
  async saveConsent(consent) { SETTINGS = { ...stripId(SETTINGS), owner: UID, consent }; await CDB.collection('settings').doc(UID).set(cclean(SETTINGS)); },
  // deleting the sign-in record needs a fresh SMS code: getVerification → verify → sudo → deleteMe
  async requestDeleteCode() { const r = await CBA.getVerification({ phone_number: '+86 ' + String(PHONE).replace(/^\+?86\s*/, ''), target: 'USER' }); DEL_VID = r.verification_id; },
  async deleteAccount({ code }) {
    if (!DEL_VID) throw new Error('请先获取验证码');
    const v = await CBA.verify({ verification_id: DEL_VID, verification_code: code });
    const s = await CBA.sudo({ verification_token: v.verification_token });
    await STORE.deleteAll();
    await CBA.deleteMe({ sudo_token: s.sudo_token });
    DEL_VID = null;
    try { await CBA.signOut(); } catch { }
  }
};
