/* ---------- utilities ---------- */
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const num = v => (v === null || v === undefined || v === '' || !isFinite(+v)) ? null : +v;
const pad2 = n => String(n).padStart(2, '0');
const iso = d => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const todayISO = () => iso(new Date());
const parseD = s => { const [y, m, d] = String(s).split('-').map(Number); return new Date(y, (m || 1) - 1, d || 1); };
const isMonth = s => /^\d{4}-\d{2}$/.test(s || '');
const isDate = s => /^\d{4}-\d{2}-\d{2}$/.test(s || '') && !isNaN(parseD(s));
const addDays = (s, n) => { const d = parseD(s); d.setDate(d.getDate() + n); return iso(d); };
const dayDiff = (a, b) => Math.round((parseD(a) - parseD(b)) / 864e5);
const fmtD = s => s ? String(s).replaceAll('-', '.') : '';
const fmtMD = s => { const d = parseD(s); return `${d.getFullYear() !== new Date().getFullYear() ? d.getFullYear() + '.' : ''}${d.getMonth() + 1}.${d.getDate()}`; };
const nf = (v, d = 0) => Number(v).toLocaleString('zh-CN', { minimumFractionDigits: d, maximumFractionDigits: d });
const mean = a => a.length ? a.reduce((s, x) => s + x, 0) / a.length : null;
const byDate = k => (a, b) => a[k] < b[k] ? -1 : a[k] > b[k] ? 1 : 0;
const rid = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
// birth is stored as YYYY-MM; take the middle of the month
const monthsAt = (s, date) => isMonth(s.birth) ? (parseD(date) - parseD(s.birth + '-15')) / (864e5 * 30.4375) : null;
const ageAt = (s, date) => { const m = monthsAt(s, date); return m == null ? null : Math.floor(m / 12); };
function slope(ys) { // least-squares slope per step
  const n = ys.length; if (n < 2) return 0;
  const mx = (n - 1) / 2, my = mean(ys);
  let a = 0, b = 0;
  ys.forEach((y, i) => { a += (i - mx) * (y - my); b += (i - mx) ** 2; });
  return a / b;
}

function toast(msg) {
  const t = $('toast'); t.textContent = msg; t.classList.add('on');
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 2800);
}

/* ---------- data: students/{sid} with their records below; screening and parent notes under data/private (admin-only) ---------- */
const SCOLS = ['scores', 'fitness', 'health', 'ratings', 'merits', 'moods', 'who5'];
const PCOLS = ['screens', 'notes'];
const COLS = [...SCOLS, ...PCOLS];
const LSK = { students: 'k12-students', ui: 'k12-ui', pin: 'k12-pin' };
const lsRec = (sid, c) => `k12-s-${sid}-${c}`;
const lsPriv = c => `k12-p-${c}`;
const EX = JSON.parse($('examples').textContent);
const D = { students: [], st: null, pin: null, ...Object.fromEntries(COLS.map(c => [c, []])) };
let mode = 'init', CAN_EDIT = true, CUR = null, UNSUB = [], PENDING = null;

function lsGet(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } }
function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { } }
function lsDel(k) { try { localStorage.removeItem(k); } catch { } }

const ST = Object.assign({ view: 'home', cur: null, role: 'parent', term: null, subj: null }, lsGet(LSK.ui) || {});
const saveUI = () => lsSet(LSK.ui, { view: ST.view, cur: ST.cur, role: ST.role });
const isParent = () => ST.role !== 'student';
const canWrite = () => mode !== 'init' && CAN_EDIT;

const str = (v, n) => String(v ?? '').slice(0, n);
function cleanStudent(p) {
  if (!p || typeof p !== 'object' || !p.id || !SYS[p.system]) return null;
  const cohort = num(p.cohort);
  if (cohort == null) return null;
  return { id: p.id, name: str(p.name, 16) || '未命名', sex: p.sex === 'F' ? 'F' : 'M', birth: isMonth(p.birth) ? p.birth : '', system: p.system, cohort: Math.round(cohort), school: str(p.school, 40), cls: str(p.cls, 24), allergy: str(p.allergy, 60), order: num(p.order) ?? 99, example: !!p.example };
}
const byOrder = (a, b) => a.order - b.order || String(a.id).localeCompare(String(b.id));

function clean(col, arr) {
  const out = [];
  const sys = D.st ? D.st.system : 'cn';
  for (const r of Array.isArray(arr) ? arr : []) {
    if (!r || typeof r !== 'object' || !r.id) continue;
    const ex = !!r.example, note = str(r.note, 300);
    if (col === 'scores') {
      const sc = SCALES[r.scale], v = num(r.value), f = num(r.full);
      if (!sc || !isDate(r.date) || !r.subject || v == null || v < sc.min || v > sc.max) continue;
      if (r.scale === 'pts' && !(f > 0 && v <= f)) continue;
      out.push({ id: r.id, date: r.date, subject: str(r.subject, 30), kind: str(r.kind, 20), scale: r.scale, value: v, full: r.scale === 'pts' ? f : null, avg: num(r.avg), lvl: ['H', 'AP'].includes(r.lvl) ? r.lvl : '', note, example: ex });
    } else if (col === 'fitness') {
      if (!isDate(r.date)) continue;
      const def = FIT[SYS[sys].fit].items, items = {}, marks = {};
      for (const k in def) { if (num(r.items && r.items[k]) != null) items[k] = +r.items[k]; }
      for (const k in def) { const m = r.marks && r.marks[k]; if (FG_ZONE[m]) marks[k] = m; else if (num(m) != null) marks[k] = clamp(+m, 0, 100); }
      if (!Object.keys(items).length && !Object.keys(marks).length) continue;
      out.push({ id: r.id, date: r.date, items, marks, note, example: ex });
    } else if (col === 'health') {
      const v = num(r.value);
      if (!['height', 'weight', 'vision'].includes(r.type) || !isDate(r.date) || !(v > 0)) continue;
      out.push({ id: r.id, date: r.date, type: r.type, value: v, value2: r.type === 'vision' ? num(r.value2) : null, note, example: ex });
    } else if (col === 'ratings') {
      if (!/^\d{4}-[123]$/.test(r.term || '') || !RATED.includes(r.dim) || !MARKS[r.mark]) continue;
      out.push({ id: r.id, term: r.term, dim: r.dim, mark: r.mark, by: str(r.by, 20), note, example: ex });
    } else if (col === 'merits') {
      if (!isDate(r.date) || !DIMS.includes(r.dim) || !r.title) continue;
      out.push({ id: r.id, date: r.date, dim: r.dim, title: str(r.title, 60), level: str(r.level, 12), hours: num(r.hours), note, example: ex });
    } else if (col === 'moods') {
      const m = num(r.mood);
      if (!isDate(r.date) || m == null || m < 1 || m > 5) continue;
      const s = num(r.stress), sl = num(r.sleep), a = num(r.active);
      out.push({ id: r.id, date: r.date, mood: Math.round(m), stress: s >= 1 && s <= 5 ? Math.round(s) : null, sleep: sl != null && sl >= 0 && sl <= 16 ? sl : null, active: a != null && a >= 0 && a <= 600 ? a : null, note: str(r.note, 140), example: ex });
    } else if (col === 'who5') {
      const it = Array.isArray(r.items) ? r.items.map(num) : [];
      if (!isDate(r.date) || it.length !== 5 || it.some(x => x == null || x < 0 || x > 5)) continue;
      out.push({ id: r.id, date: r.date, items: it, score: it.reduce((s, x) => s + x, 0) * 4, example: ex });
    } else if (col === 'screens') {
      const sc = SCREENS[r.scale], v = num(r.score);
      if (!sc || !isDate(r.date) || v == null || v < 0 || v > sc.max) continue;
      out.push({ id: r.id, sid: r.sid, date: r.date, scale: r.scale, informant: INFORMANT[r.informant] ? r.informant : 'self', score: v, by: str(r.by, 30), label: str(r.label, 30), note, example: ex });
    } else if (col === 'notes') {
      if (!isDate(r.date) || !r.text) continue;
      out.push({ id: r.id, sid: r.sid, date: r.date, text: str(r.text, 500), example: ex });
    }
  }
  return out.sort(byDate(col === 'ratings' ? 'term' : 'date'));
}

function pickCur() {
  const want = ST.cur;
  CUR = D.students.some(p => p.id === want) || (want && want === PENDING) ? want : (D.students[0] ? D.students[0].id : null);
  D.st = D.students.find(p => p.id === CUR) || null;
}

/* local mode: everything in this browser; the first visit shows the fictional example students */
function loadLocal() {
  let ppl = lsGet(LSK.students);
  if (!Array.isArray(ppl)) {
    ppl = EX.students;
    for (const s of EX.students) for (const c of SCOLS) lsSet(lsRec(s.id, c), EX.records[s.id][c] || []);
    for (const c of PCOLS) lsSet(lsPriv(c), EX.private[c] || []);
    lsSet(LSK.students, ppl);
  }
  D.students = ppl.map(cleanStudent).filter(Boolean).sort(byOrder);
  D.pin = lsGet(LSK.pin);
  pickCur(); loadLocalRecords();
}
function loadLocalRecords() {
  for (const c of SCOLS) D[c] = clean(c, CUR ? lsGet(lsRec(CUR, c)) : []);
  for (const c of PCOLS) D[c] = clean(c, (lsGet(lsPriv(c)) || []).filter(r => r && r.sid === CUR));
}
function saveLocal(c) {
  if (c === 'students') return lsSet(LSK.students, D.students);
  if (PCOLS.includes(c)) { const others = (lsGet(lsPriv(c)) || []).filter(r => r && r.sid !== CUR); return lsSet(lsPriv(c), [...others, ...D[c]]); }
  lsSet(lsRec(CUR, c), D[c]);
}

function setSync(t, warn) { const el = $('sync'); el.classList.toggle('local', !!warn); el.querySelector('span').textContent = t; }

/* cloud data goes through STORE (src/store/*.js, one backend per build target); local mode stays in this file */
let UNSUB_TOP = [];
function connectStore() {
  mode = 'db'; CAN_EDIT = STORE.canEdit; setSync(STORE.syncLabel);
  for (const c of COLS) D[c] = [];
  D.students = []; D.st = null; CUR = null;
  UNSUB_TOP.forEach(u => u());
  let subscribed;
  UNSUB_TOP = [
    STORE.watchStudents(docs => {
      D.students = docs.map(cleanStudent).filter(Boolean).sort(byOrder);
      pickCur();
      if (CUR !== subscribed) { subscribed = CUR; subscribeRecords(); }
      renderAll();
    }, () => setSync('同步中断，显示最后一次数据', true)),
    STORE.watchPin(v => { D.pin = v; })
  ];
  renderAll();
}
function disconnectStore() {
  UNSUB_TOP.forEach(u => u()); UNSUB.forEach(u => u()); UNSUB_TOP = []; UNSUB = [];
  for (const c of COLS) D[c] = [];
  D.students = []; D.st = null; D.pin = null; CUR = null; mode = 'init';
}
function subscribeRecords() {
  UNSUB.forEach(u => u()); UNSUB = [];
  for (const c of COLS) D[c] = [];
  if (!CUR || mode !== 'db') return;
  const sid = CUR;
  for (const c of COLS) UNSUB.push(STORE.watchRecords(c, sid, docs => {
    if (sid !== CUR) return;
    D[c] = clean(c, docs); renderAll();
  }, () => setSync('同步中断，显示最后一次数据', true)));
}
function switchStudent(sid) {
  if (!sid || sid === CUR) return;
  ST.cur = sid; ST.term = null; ST.subj = null; saveUI();
  pickCur();
  if (mode === 'db') subscribeRecords(); else loadLocalRecords();
  renderAll();
}

function guardWrite(noStudent) {
  if (mode === 'init') { toast('正在连接数据，请稍候再试'); return false; }
  if (!CAN_EDIT) { toast('你只有查看权限'); return false; }
  if (!CUR && !noStudent) { toast('请先新建一个学生档案'); return false; }
  return true;
}
const body = (c, obj) => PCOLS.includes(c) ? { ...obj, sid: CUR } : obj;
async function add(c, obj) {
  if (mode === 'db') return STORE.add(c, CUR, obj);
  const id = c[0] + rid('');
  D[c] = clean(c, [...D[c], { id, ...body(c, obj) }]); saveLocal(c); renderAll(); return id;
}
async function put(c, id, obj) {
  if (mode === 'db') return STORE.put(c, CUR, id, obj);
  D[c] = clean(c, [...D[c].filter(x => x.id !== id), { id, ...body(c, obj) }]); saveLocal(c); renderAll();
}
async function del(c, id) {
  if (mode === 'db') return STORE.del(c, CUR, id);
  D[c] = D[c].filter(x => x.id !== id); saveLocal(c); renderAll();
}
async function saveStudent(obj, isNew) {
  if (isNew) {
    const bodyS = { ...obj, order: Math.max(0, ...D.students.filter(p => !p.example).map(p => p.order)) + 1, example: false };
    let id;
    if (mode === 'db') { id = STORE.newId('students'); PENDING = id; await STORE.put('students', id, id, bodyS); }
    else { id = rid('s'); D.students = [...D.students, cleanStudent({ id, ...bodyS })].sort(byOrder); saveLocal('students'); }
    switchStudent(id);
    return id;
  }
  const bodyS = { ...obj, order: D.st.order, example: D.st.example };
  if (mode === 'db') return STORE.put('students', CUR, CUR, bodyS);
  D.students = D.students.map(p => p.id === CUR ? cleanStudent({ id: CUR, ...bodyS }) : p).sort(byOrder);
  saveLocal('students'); pickCur(); renderAll();
}
async function runJobs(jobs) { for (let i = 0; i < jobs.length; i += 8) await Promise.all(jobs.slice(i, i + 8).map(f => f())); }
function dropLocalStudent(sid) {
  for (const c of SCOLS) lsDel(lsRec(sid, c));
  for (const c of PCOLS) lsSet(lsPriv(c), (lsGet(lsPriv(c)) || []).filter(r => r && r.sid !== sid));
  D.students = D.students.filter(p => p.id !== sid); saveLocal('students');
}
async function deleteStudent() {
  const sid = CUR;
  if (mode === 'db') await STORE.deleteStudent(sid); else dropLocalStudent(sid);
  ST.cur = null; pickCur();
  if (mode === 'db') subscribeRecords(); else loadLocalRecords();
  renderAll();
}

/* examples: fictional, marked example:true, removable in one step */
const hasExamples = () => D.students.some(s => s.example);
async function loadExamples() {
  if (mode === 'db') await STORE.writeExamples(EX);
  else { lsDel(LSK.students); loadLocal(); }
  renderAll();
}
async function clearExamples() {
  const ids = D.students.filter(s => s.example).map(s => s.id);
  if (mode === 'db') { for (const sid of ids) await STORE.deleteStudent(sid); }
  else { ids.forEach(dropLocalStudent); ST.cur = null; pickCur(); loadLocalRecords(); }
  renderAll();
  return ids.length;
}

function fail(e) {
  const code = e && e.code;
  if (code === 'invalid_argument' || code === 'permission-denied' || code === 'DATABASE_PERMISSION_DENIED') {
    if (TARGET === 'artifact') { CAN_EDIT = false; setSync('只读 · 云端数据'); closeSheet(); renderAll(); toast('你只有查看权限，无法修改'); }
    else toast('没有权限保存，请重新登录后再试');
  }
  else if (code === 'quota_exceeded' || code === 'resource-exhausted') toast('存储已满，请先删除一些旧记录');
  else toast('保存失败，请检查网络后再试');
}

/* ---------- parent PIN (keeps a child in student view on a shared device; not a security boundary) ---------- */
async function hashPin(pin, salt) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(salt + ':' + pin));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}
const pinSupported = () => !!(window.crypto && crypto.subtle);
async function setPin(pin) {
  const salt = Math.random().toString(36).slice(2, 10);
  const v = pin ? { hash: await hashPin(pin, salt), salt } : null;
  if (mode === 'db') await STORE.setPin(v);
  else { if (v) lsSet(LSK.pin, v); else lsDel(LSK.pin); }
  D.pin = v;
}
async function checkPin(pin) { return !!D.pin && (await hashPin(pin, D.pin.salt)) === D.pin.hash; }

/* ---------- derived model for the current student ---------- */
let M = null;
function derive() {
  const s = D.st; if (!s) return null;
  const sys = SYS[s.system], today = todayISO(), now = new Date();
  const g = gradeAt(s, now), age = ageAt(s, today);
  const tk = d => termKey(s.system, d);
  const scores = D.scores.map(r => ({ ...r, term: tk(r.date), norm: normOf(r), avgNorm: r.avg != null ? clamp(SCALES[r.scale].norm(r.avg, r.full), 0, 100) : null }));
  const curTerm = tk(today);
  const scoreTerms = [...new Set(scores.map(r => r.term))].sort(termCmp);
  const allTerms = [...new Set([curTerm, ...scoreTerms, ...D.ratings.map(r => r.term), ...D.merits.map(r => tk(r.date)), ...D.moods.map(r => tk(r.date)), ...D.who5.map(r => tk(r.date)), ...D.fitness.map(r => tk(r.date))])].sort(termCmp);
  const termGrade = t => { const [y] = t.split('-').map(Number); return y - s.cohort; };

  /* subjects */
  function subjects(t) {
    const by = {};
    for (const r of scores) if (r.term === t) (by[r.subject] = by[r.subject] || []).push(r);
    return Object.entries(by).map(([subject, recs]) => {
      const last = recs[recs.length - 1];
      // trends only compare like with like: the history in the same scale as the latest result
      const all = scores.filter(r => r.subject === subject), hist = all.filter(r => r.scale === last.scale);
      const avgs = recs.filter(r => r.avgNorm != null);
      return {
        subject, recs, last, scale: last.scale, mean: mean(recs.map(r => r.norm)), valueMean: mean(recs.map(r => r.value)),
        avg: avgs.length ? mean(avgs.map(r => r.avgNorm)) : null, lvl: recs.some(r => r.lvl === 'AP') ? 'AP' : recs.some(r => r.lvl === 'H') ? 'H' : '',
        all, hist, trend: hist.length >= 3 ? slope(hist.slice(-5).map(r => r.norm)) : null
      };
    }).sort((a, b) => sys.subjects(termGrade(t)).indexOf(a.subject) - sys.subjects(termGrade(t)).indexOf(b.subject) || a.subject.localeCompare(b.subject));
  }
  function headline(list) {
    if (!list.length) return null;
    const cnt = {}; for (const x of list) cnt[x.scale] = (cnt[x.scale] || 0) + 1;
    const scale = Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a])[0];
    const xs = list.filter(x => x.scale === scale);
    const n = xs.length;
    const h = headOf(scale, xs, n);
    return h && Object.assign(h, { scale });
  }
  function headOf(scale, xs, n) {
    if (scale === 'pts') return { label: '平均得分率', value: nf(mean(xs.map(x => x.mean)), 1), unit: '%', n, norm: mean(xs.map(x => x.mean)) };
    if (scale === 'pct' && s.system === 'us') {
      const gpa = mean(xs.map(x => usLetter(x.mean)[2]));
      const w = mean(xs.map(x => usLetter(x.mean)[2] + (x.lvl === 'AP' ? 1 : x.lvl === 'H' ? 0.5 : 0)));
      return { label: 'GPA（未加权）', value: gpa.toFixed(2), unit: '/4.0', sub: xs.some(x => x.lvl) ? `加权 ${w.toFixed(2)}` : '', n, norm: mean(xs.map(x => x.mean)) };
    }
    if (scale === 'pct') return { label: '平均分', value: nf(mean(xs.map(x => x.mean)), 1), unit: '%', n, norm: mean(xs.map(x => x.mean)) };
    if (scale === 'sb4') return { label: '平均标准等级', value: mean(xs.map(x => x.valueMean)).toFixed(1), unit: '/4', n, norm: mean(xs.map(x => x.mean)) };
    if (scale === 'ks2') return { label: 'KS2 平均标准分', value: nf(mean(xs.map(x => x.valueMean)), 0), unit: '', sub: '100 为达到预期', n, norm: mean(xs.map(x => x.mean)) };
    if (scale === 'gcse') return { label: 'GCSE 平均等级', value: mean(xs.map(x => x.valueMean)).toFixed(1), unit: '/9', n, norm: mean(xs.map(x => x.mean)) };
    if (scale === 'alevel') return { label: 'A-level 平均', value: ALEVEL[Math.round(mean(xs.map(x => x.valueMean)))], unit: '', n, norm: mean(xs.map(x => x.mean)) };
  }

  /* fitness */
  const fits = D.fitness.map(t => {
    const fg = gradeAt(s, parseD(t.date));
    let ev = null, comp = null;
    if (sys.fit === 'gb') {
      const items = { ...t.items };
      if (items.bmi == null) { const b = bmiNear(t.date); if (b) items.bmi = +b.toFixed(1); }
      ev = gbEvaluate({ items }, s.sex, fg); ev.items = items;
      comp = ev.std;
    } else if (sys.fit === 'fg') {
      const z = Object.values(t.marks).filter(m => FG_ZONE[m]);
      comp = z.length ? z.filter(m => m === 'HFZ').length / z.length * 100 : null;
    } else {
      const p = Object.values(t.marks).filter(m => typeof m === 'number');
      comp = p.length ? mean(p) : null;
    }
    return { ...t, g: fg, ev, comp, sy: schoolYear(s.system, parseD(t.date)) };
  });

  /* growth */
  function bmiNear(date) {
    const w = D.health.filter(h => h.type === 'weight' && Math.abs(dayDiff(h.date, date)) <= 60).sort((a, b) => Math.abs(dayDiff(a.date, date)) - Math.abs(dayDiff(b.date, date)))[0];
    const h = D.health.filter(x => x.type === 'height' && Math.abs(dayDiff(x.date, date)) <= 120).sort((a, b) => Math.abs(dayDiff(a.date, date)) - Math.abs(dayDiff(b.date, date)))[0];
    return w && h ? w.value / ((h.value / 100) ** 2) : null;
  }
  const heights = D.health.filter(h => h.type === 'height').map(h => ({ ...h, mo: monthsAt(s, h.date) }));
  const weights = D.health.filter(h => h.type === 'weight').map(h => ({ ...h, mo: monthsAt(s, h.date) }));
  const bmis = weights.map(w => { const b = bmiNear(w.date); return b ? { date: w.date, mo: w.mo, bmi: b, z: w.mo != null ? whoZ('bmi', s.sex, w.mo, b) : null } : null; }).filter(Boolean);
  heights.forEach(h => { h.z = h.mo != null ? whoZ('hfa', s.sex, h.mo, h.value) : null; });
  const vision = D.health.filter(h => h.type === 'vision');

  /* lifestyle: last 30 days of check-ins */
  const recent = D.moods.filter(m => dayDiff(today, m.date) < 30 && dayDiff(today, m.date) >= 0);
  const sr = sleepRange(age);
  const sl = recent.filter(m => m.sleep != null), ac = recent.filter(m => m.active != null);
  const life = {
    n: recent.length, range: sr,
    sleep: sl.length ? mean(sl.map(m => m.sleep)) : null, sleepOk: sl.length ? sl.filter(m => m.sleep >= sr[0]).length / sl.length * 100 : null,
    active: ac.length ? mean(ac.map(m => m.active)) : null, activeOk: ac.length ? ac.filter(m => m.active >= ACTIVE_MIN).length / ac.length * 100 : null,
    mood: recent.length ? mean(recent.map(m => m.mood)) : null, stress: recent.filter(m => m.stress).length ? mean(recent.filter(m => m.stress).map(m => m.stress)) : null,
    low: D.moods.filter(m => dayDiff(today, m.date) < 14 && m.mood <= 2).length
  };

  /* radar: five dimensions per term, each with the data it came from */
  function radar(t) {
    const v = {}, src = {};
    const subj = subjects(t);
    v.academic = subj.length ? mean(subj.map(x => x.mean)) : null;
    v.academicScale = subj.length ? headline(subj).scale : null;
    src.academic = !subj.length ? '本学期暂无成绩' : `${subj.length} 科本学期均值${['pts', 'pct'].includes(v.academicScale) ? '' : `（${SCALES[v.academicScale].name}线性换算为百分制）`}`;
    for (const d of RATED) {
      const r = D.ratings.find(x => x.term === t && x.dim === d);
      v[d] = r ? MARKS[r.mark] : null;
      src[d] = r ? `学期评级 ${r.mark}（${MARK_CN[r.mark]}）${r.by ? ' · ' + r.by : ''}` : '本学期暂无评级';
    }
    const [ty] = t.split('-').map(Number);
    const comps = [];
    const ft = fits.filter(f => f.sy === ty && f.comp != null).pop();
    if (ft) comps.push(['体测', ft.comp]);
    const w5 = D.who5.filter(w => tk(w.date) === t);
    if (w5.length) comps.push(['WHO-5', mean(w5.map(w => w.score))]);
    const mt = D.moods.filter(m => tk(m.date) === t);
    const tAge = mt.length ? ageAt(s, mt[mt.length - 1].date) : age;
    const ms = mt.filter(m => m.sleep != null);
    if (ms.length >= 5) comps.push(['睡眠达标', ms.filter(m => m.sleep >= sleepRange(tAge)[0]).length / ms.length * 100]);
    if (mt.length >= 5) comps.push(['心情', (mean(mt.map(m => m.mood)) - 1) / 4 * 100]);
    v.health = comps.length ? mean(comps.map(c => c[1])) : null;
    src.health = comps.length ? comps.map(c => `${c[0]} ${nf(c[1], 0)}`).join(' · ') : '本学期暂无体测、自评或打卡';
    return { v, src };
  }

  // default: the latest term (up to now) with at least three of the five dimensions, else the latest term with scores
  const full = allTerms.filter(t => termCmp(t, curTerm) <= 0).reverse().find(t => DIMS.filter(k => radar(t).v[k] != null).length >= 3);
  const defTerm = full || (scoreTerms.includes(curTerm) ? curTerm : (scoreTerms[scoreTerms.length - 1] || curTerm));
  const term = ST.term && allTerms.includes(ST.term) ? ST.term : defTerm;
  const prevTerm = allTerms[allTerms.indexOf(term) - 1] || null;
  const subj = subjects(term);
  const R = radar(term), Rp = prevTerm ? radar(prevTerm) : null;
  const lastFit = fits[fits.length - 1] || null;
  const who5 = D.who5;
  const screens = D.screens.slice().sort(byDate('date')).reverse();
  return {
    s, sys, g, age, today, term, prevTerm, terms: allTerms, curTerm, scoreTerms, scores, subj, head: headline(subj),
    headPrev: prevTerm ? headline(subjects(prevTerm)) : null, subjects, radar: R, radarPrev: Rp,
    fits, lastFit, heights, weights, bmis, vision, life, who5, screens, bmiNear
  };
}

/* ---------- rule-based assessment: every line cites the data behind it ---------- */
function insights(m) {
  const out = [], s = m.s, P = isParent(), sp = t => /[A-Za-z]/.test(t) ? ` ${t} ` : t, dimName = k => sp(m.sys.dim(k));
  const R = m.radar.v, Rp = m.radarPrev ? m.radarPrev.v : null;
  const have = DIMS.filter(k => R[k] != null);
  if (have.length >= 3) {
    const hi = have.reduce((a, b) => R[b] > R[a] ? b : a), lo = have.reduce((a, b) => R[b] < R[a] ? b : a);
    if (R[hi] - R[lo] >= 5) {
      out.push({ k: 'up', t: `五维中<b>${dimName(hi)}</b>最突出（${nf(R[hi], 0)}）` });
      out.push({ k: 'info', t: P ? `<b>${dimName(lo)}</b>相对最弱（${nf(R[lo], 0)}），可作为下学期重点` : `<b>${dimName(lo)}</b>还有提升空间（${nf(R[lo], 0)}）` });
    }
  }
  if (Rp) for (const k of DIMS) if (R[k] != null && Rp[k] != null && Math.abs(R[k] - Rp[k]) >= 5 && !(k === 'academic' && R.academicScale !== Rp.academicScale)) {
    const d = R[k] - Rp[k];
    out.push({ k: d > 0 ? 'up' : 'down', t: `${dimName(k)}比上学期${d > 0 ? '提高' : '下降'} <b>${nf(Math.abs(d), 0)}</b>` });
  }
  for (const x of m.subj) {
    if (x.trend != null && Math.abs(x.trend) >= 3) {
      const n = Math.min(5, x.hist.length);
      out.push({ k: x.trend > 0 ? 'up' : 'down', t: `<b>${sp(esc(x.subject))}</b>近 ${n} 次成绩平均每次${x.trend > 0 ? '提高' : '下降'} ${nf(Math.abs(x.trend), 1)} 分（百分制）` });
    }
    if (x.avg != null && x.mean - x.avg >= 10) out.push({ k: 'up', t: `<b>${sp(esc(x.subject))}</b>高出班级均分 ${nf(x.mean - x.avg, 1)} 分` });
    else if (x.avg != null && x.avg - x.mean >= 5) out.push({ k: 'down', t: `<b>${sp(esc(x.subject))}</b>低于班级均分 ${nf(x.avg - x.mean, 1)} 分` });
  }
  const f = m.lastFit;
  if (f && dayDiff(m.today, f.date) < 400) {
    if (m.sys.fit === 'gb' && f.ev) {
      const weak = f.ev.rows.filter(r => r.sc != null && r.sc < 60);
      if (weak.length) out.push({ k: 'warn', t: `体测 ${weak.map(r => `<b>${gbItemName(r.k, s.sex)}</b> ${r.sc} 分`).join('、')}，未及格` });
      if (f.ev.total != null) out.push({ k: f.ev.total >= 80 ? 'up' : 'info', t: `体测总分 <b>${nf(f.ev.total, 1)}</b>，${gbGrade(f.ev.total)[0]}` });
    } else if (m.sys.fit === 'fg') {
      const ni = Object.entries(f.marks).filter(([, z]) => z === 'NI' || z === 'NIHR');
      if (ni.length) out.push({ k: 'warn', t: `FitnessGram ${ni.map(([k]) => `<b>${FIT.fg.items[k].name}</b>`).join('、')} 未进入健康区` });
    } else {
      const low = Object.entries(f.marks).filter(([, p]) => typeof p === 'number' && p < 20);
      if (low.length) out.push({ k: 'warn', t: `${low.map(([k, p]) => `<b>${FIT.eurofit.items[k].name}</b> 第 ${nf(p, 0)} 百分位`).join('、')}，低于同龄欧洲常模 20%` });
    }
  }
  const L = m.life;
  if (L.sleep != null && L.sleep < L.range[0]) out.push({ k: 'warn', t: `近 30 天平均睡眠 <b>${nf(L.sleep, 1)} 小时</b>，低于 ${m.age} 岁建议的 ${L.range[0]}–${L.range[1]} 小时` });
  if (L.active != null && L.active < ACTIVE_MIN) out.push({ k: 'info', t: `近 30 天日均运动 <b>${nf(L.active, 0)} 分钟</b>，WHO 建议每天平均 60 分钟` });
  const v = m.vision[m.vision.length - 1];
  if (v) {
    const vs = VISION[m.sys.vision], prev = m.vision[m.vision.length - 2];
    const low = [['左眼', v.value], ['右眼', v.value2]].filter(([, d]) => d != null && visionLow(d, m.age));
    if (low.length) out.push({ k: 'warn', t: `视力 ${low.map(([e, d]) => `${e} <b>${vs.show(d)}</b>`).join('、')}，低于正常` });
    if (prev) {
      const drop = Math.max(Math.log10(prev.value) - Math.log10(v.value), prev.value2 && v.value2 ? Math.log10(prev.value2) - Math.log10(v.value2) : 0);
      if (drop >= 0.1) out.push({ k: 'down', t: `视力比 ${fmtD(prev.date)} 下降 ${nf(drop * 10, 0)} 行` });
    }
  }
  const b = m.bmis[m.bmis.length - 1];
  if (b && b.z != null) { const t = bmiZTag(b.z); if (t[1] !== 'ok') out.push({ k: 'warn', t: `BMI ${nf(b.bmi, 1)}，按 WHO 2007 标准为<b>${t[0]}</b>（z = ${nf(b.z, 1)}）` }); }
  // parent-only: well-being and screening
  if (P) {
    const w = m.who5[m.who5.length - 1];
    if (w && dayDiff(m.today, w.date) < 120) {
      const bd = who5Band(w.score);
      if (bd[1] !== 'ok') out.push({ k: 'alert', t: `WHO-5 幸福感指数 <b>${w.score}</b>（${fmtMD(w.date)}），${bd[0]}`, parent: true });
    }
    if (L.low >= 3) out.push({ k: 'alert', t: `近 14 天有 <b>${L.low} 天</b>心情打卡为低落`, parent: true });
    const seen = new Set();
    for (const x of m.screens) {
      const key = x.scale + x.informant; if (seen.has(key)) continue; seen.add(key);
      const sc = SCREENS[x.scale];
      if (dayDiff(m.today, x.date) < 365 && sc.alert(x.score, x.informant)) out.push({ k: 'alert', t: `${esc(x.scale === 'other' ? x.label || '其他量表' : x.scale)} ${x.score} 分（${fmtMD(x.date)}），${sc.band(x.score, x.informant)[0]}`, parent: true });
    }
  }
  return out;
}
const hasAlert = list => list.some(x => x.k === 'alert');
