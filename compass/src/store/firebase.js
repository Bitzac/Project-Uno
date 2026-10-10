/* ---------- store + auth: Firebase (overseas site) ----------
 * Flat collections; every document carries owner (uid) and sid. firestore.rules lets a verified user touch only owner == uid.
 * FB is the vendor bundle (web/global/vendor-entry.js); COMPASS_CONFIG comes from config.js. */
const RCOLS = ['students', ...COLS];
let FBA = null, FDB = null, UID = null;
const fsnap = s => s.docs.map(d => ({ ...d.data(), id: d.id }));
const fclean = o => JSON.parse(JSON.stringify(o)); // Firestore rejects undefined
const mine = (c, ...w) => FB.query(FB.collection(FDB, c), FB.where('owner', '==', UID), ...w);
async function fdeleteAll(refs) { for (let i = 0; i < refs.length; i += 400) { const b = FB.writeBatch(FDB); refs.slice(i, i + 400).forEach(r => b.delete(r)); await b.commit(); } }

const STORE = {
  canEdit: true, syncLabel: '已同步到云端',
  newId: c => FB.doc(FB.collection(FDB, c)).id,
  watchStudents: (cb, err) => FB.onSnapshot(mine('students'), s => cb(fsnap(s)), err),
  watchRecords: (c, sid, cb, err) => FB.onSnapshot(mine(c, FB.where('sid', '==', sid)), s => cb(fsnap(s)), err),
  watchPin: cb => FB.onSnapshot(FB.doc(FDB, 'settings', UID), d => cb(d.exists() ? d.data().pin || null : null), () => { }),
  async add(c, sid, obj) { const r = FB.doc(FB.collection(FDB, c)); await FB.setDoc(r, fclean({ ...obj, owner: UID, sid })); return r.id; },
  put: (c, sid, id, obj) => FB.setDoc(FB.doc(FDB, c, id), fclean({ ...obj, owner: UID, sid })),
  del: (c, sid, id) => FB.deleteDoc(FB.doc(FDB, c, id)),
  setPin: v => FB.setDoc(FB.doc(FDB, 'settings', UID), { owner: UID, pin: v }, { merge: true }),
  async deleteStudent(sid) {
    const refs = [];
    for (const c of COLS) (await FB.getDocs(mine(c, FB.where('sid', '==', sid)))).docs.forEach(d => refs.push(d.ref));
    refs.push(FB.doc(FDB, 'students', sid));
    await fdeleteAll(refs);
  },
  async writeExamples(ex) {
    const writes = [], ids = {};
    for (const s of ex.students) { const { id, ...b } = s; ids[id] = STORE.newId('students'); writes.push([FB.doc(FDB, 'students', ids[id]), { ...b, owner: UID, sid: ids[id] }]); }
    for (const s of ex.students) for (const c of SCOLS) for (const { id, ...r } of ex.records[s.id][c] || []) writes.push([FB.doc(FB.collection(FDB, c)), { ...r, owner: UID, sid: ids[s.id] }]);
    for (const c of PCOLS) for (const { id, ...r } of ex.private[c] || []) writes.push([FB.doc(FB.collection(FDB, c)), { ...r, owner: UID, sid: ids[r.sid] }]);
    for (let i = 0; i < writes.length; i += 400) { const b = FB.writeBatch(FDB); writes.slice(i, i + 400).forEach(([r, d]) => b.set(r, fclean(d))); await b.commit(); }
  },
  async exportAll() {
    const out = {};
    for (const c of RCOLS) out[c] = fsnap(await FB.getDocs(mine(c))).map(({ owner, ...d }) => d);
    const st = await FB.getDoc(FB.doc(FDB, 'settings', UID));
    out.settings = st.exists() ? (({ owner, pin, ...d }) => d)(st.data()) : {};
    return out;
  },
  async deleteAll() {
    const refs = [];
    for (const c of RCOLS) (await FB.getDocs(mine(c))).docs.forEach(d => refs.push(d.ref));
    refs.push(FB.doc(FDB, 'settings', UID));
    await fdeleteAll(refs);
  }
};

const FB_ERR = {
  'auth/email-already-in-use': '这个邮箱已经注册过，请直接登录',
  'auth/invalid-email': '邮箱格式不对',
  'auth/invalid-credential': '邮箱或密码不对', 'auth/wrong-password': '邮箱或密码不对', 'auth/user-not-found': '邮箱或密码不对',
  'auth/weak-password': '密码太简单，至少 8 位',
  'auth/too-many-requests': '尝试次数太多，请过几分钟再试',
  'auth/network-request-failed': '网络连接失败，请检查网络后再试',
  'auth/requires-recent-login': '为了安全，请重新登录后再删除账户'
};
const AUTH = {
  kind: 'email', where: 'Google Cloud 伦敦机房（Firestore europe-west2）',
  message: e => FB_ERR[e && e.code] || (e && e.message) || '操作失败，请稍后再试',
  init(onUser) {
    const cfg = (window.COMPASS_CONFIG || {}).firebase;
    if (!cfg || !window.FB) throw new Error('missing config');
    const app = FB.initializeApp(cfg);
    FBA = FB.getAuth(app); FBA.languageCode = 'zh-CN';
    FDB = FB.getFirestore(app);
    if (window.COMPASS_CONFIG.emulator) {
      FB.connectAuthEmulator(FBA, 'http://127.0.0.1:9099', { disableWarnings: true });
      FB.connectFirestoreEmulator(FDB, '127.0.0.1', 8080);
    }
    FB.onAuthStateChanged(FBA, u => { UID = u ? u.uid : null; onUser(u ? { id: u.uid, label: u.email, verified: u.emailVerified } : null); });
  },
  async signUp(email, password) { const c = await FB.createUserWithEmailAndPassword(FBA, email, password); UID = c.user.uid; await FB.sendEmailVerification(c.user); },
  signIn: (email, password) => FB.signInWithEmailAndPassword(FBA, email, password),
  resend: () => FB.sendEmailVerification(FBA.currentUser),
  async reloadVerified() { await FBA.currentUser.reload(); if (!FBA.currentUser.emailVerified) return false; await FBA.currentUser.getIdToken(true); return true; },
  reset: email => FB.sendPasswordResetEmail(FBA, email),
  signOut: () => FB.signOut(FBA),
  async getSettings() { const d = await FB.getDoc(FB.doc(FDB, 'settings', UID)); return d.exists() ? d.data() : {}; },
  saveConsent: consent => FB.setDoc(FB.doc(FDB, 'settings', UID), { owner: UID, consent }, { merge: true }),
  async deleteAccount({ password }) {
    const u = FBA.currentUser;
    await FB.reauthenticateWithCredential(u, FB.EmailAuthProvider.credential(u.email, password));
    await STORE.deleteAll();
    await FB.deleteUser(u);
  }
};
