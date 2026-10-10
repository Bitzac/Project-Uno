/* ---------- store: claude.ai Artifact db capability ----------
 * students/{sid}/{col} for records, data/private/{col} (admin-only rule) for screening results and parent notes. */
let DB = null;
const apath = (c, sid) => c === 'students' ? 'students' : PCOLS.includes(c) ? `data/private/${c}` : `students/${sid}/${c}`;
const abody = (c, sid, obj) => PCOLS.includes(c) ? { ...obj, sid } : obj;
const asnap = s => s.docs.map(d => ({ id: d.id, ...d.data() }));
const STORE = {
  canEdit: true, syncLabel: '已同步到云端',
  newId: c => DB.collection(apath(c, 'x')).doc().id,
  watchStudents: (cb, err) => DB.collection('students').onSnapshot(s => cb(asnap(s)), err),
  watchPin: cb => DB.doc('data/private/config/pin').onSnapshot(d => cb(d.exists ? d.data() : null), () => { }),
  watchRecords(c, sid, cb, err) {
    if (PCOLS.includes(c)) return DB.collection(apath(c)).where('sid', '==', sid).onSnapshot(s => cb(asnap(s)), () => { }); // hidden from viewers
    return DB.collection(apath(c, sid)).onSnapshot(s => cb(asnap(s)), err);
  },
  async add(c, sid, obj) { const r = DB.collection(apath(c, sid)).doc(); await r.set(abody(c, sid, obj)); return r.id; },
  put: (c, sid, id, obj) => DB.doc(`${apath(c, sid)}/${id}`).set(abody(c, sid, obj)),
  del: (c, sid, id) => DB.doc(`${apath(c, sid)}/${id}`).delete(),
  setPin: v => v ? DB.doc('data/private/config/pin').set(v) : DB.doc('data/private/config/pin').delete(),
  async deleteStudent(sid) {
    const jobs = [];
    for (const c of SCOLS) for (const d of (await DB.collection(apath(c, sid)).get()).docs) jobs.push(() => DB.doc(`${apath(c, sid)}/${d.id}`).delete());
    for (const c of PCOLS) for (const d of (await DB.collection(apath(c)).where('sid', '==', sid).get()).docs) jobs.push(() => DB.doc(`${apath(c)}/${d.id}`).delete());
    await runJobs(jobs);
    await DB.doc('students/' + sid).delete();
  },
  async writeExamples(ex) {
    const jobs = [];
    for (const s of ex.students) {
      const { id, ...b } = s;
      jobs.push(() => DB.doc('students/' + id).set(b));
      for (const c of SCOLS) for (const r of ex.records[id][c] || []) { const { id: rid2, ...rb } = r; jobs.push(() => DB.doc(`students/${id}/${c}/${rid2}`).set(rb)); }
    }
    for (const c of PCOLS) for (const r of ex.private[c] || []) { const { id: rid2, ...rb } = r; jobs.push(() => DB.doc(`data/private/${c}/${rid2}`).set(rb)); }
    await runJobs(jobs);
  }
};

// claude.use resolves asynchronously, or null outside claude.ai: fall back to the browser's local storage
async function connect() {
  let db = null, user = null;
  try { db = window.claude && window.claude.use ? await window.claude.use('db') : null; } catch { db = null; }
  if (!db) { loadLocal(); mode = 'local'; setSync('本地模式 · 只存在此浏览器', true); renderAll(); return; }
  try { user = await window.claude.use('user'); } catch { user = null; }
  if (user) { try { STORE.canEdit = await user.canEdit(); } catch { STORE.canEdit = true; } }
  STORE.syncLabel = STORE.canEdit ? '已同步到云端' : '只读 · 云端数据';
  DB = db;
  connectStore();
}
