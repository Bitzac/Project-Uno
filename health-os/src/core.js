/* ---------- utilities ---------- */
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const num = v => (v === null || v === undefined || v === '' || !isFinite(+v)) ? null : +v;
const pad2 = n => String(n).padStart(2, '0');
const iso = d => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const todayISO = () => iso(new Date());
const parseD = s => { const [y, m, d] = String(s).split('-').map(Number); return new Date(y, (m || 1) - 1, d || 1); };
const dayDiff = (a, b) => Math.round((parseD(a) - parseD(b)) / 864e5);
const addDays = (s, n) => { const d = parseD(s); d.setDate(d.getDate() + n); return iso(d); };
const addPeriod = (s, r) => { if (r === 'daily') return addDays(s, 1); if (r === 'weekly') return addDays(s, 7); const d = parseD(s); d.setMonth(d.getMonth() + 1); return iso(d); };
const isMonth = s => /^\d{4}-\d{2}$/.test(s || '');
const isDate = s => /^\d{4}-\d{2}-\d{2}$/.test(s || '') && !isNaN(parseD(s));
const fmtD = s => s ? String(s).replaceAll('-', '.') : '';
const fmtMD = s => { const d = parseD(s); return `${d.getFullYear() !== new Date().getFullYear() ? d.getFullYear() + '年' : ''}${d.getMonth() + 1}月${d.getDate()}日`; };
const WK = '日一二三四五六';
const nf = (v, d = 0) => Number(v).toLocaleString('zh-CN', { minimumFractionDigits: d, maximumFractionDigits: d });
const byDate = k => (a, b) => a[k] < b[k] ? -1 : a[k] > b[k] ? 1 : 0;
const strip = o => { const { id, ...r } = o; return r; };

/* ---------- vocabulary ---------- */
const PART = Object.fromEntries(PARTS.map(p => [p.id, p]));
const SEVN = ['正常', '留意', '轻度', '中度', '严重'];
const SEVC = ['#9FD8FF', '#FADB5F', '#FF8C1A', '#EF3E36', '#C8157E'];
const STATUS = { active: '进行中', improving: '好转中', resolved: '已解决' };
const SOURCES = ['体检', '就诊', '自述'];
const SIDEN = { '': '双侧', L: '左侧', R: '右侧' };
const VT = {
  weight: { name: '体重', unit: 'kg', d: 1, min: 20, max: 300, part: '' },
  rhr: { name: '静息心率', unit: 'bpm', d: 0, min: 25, max: 220, part: 'heart' },
  bp: { name: '血压', unit: 'mmHg', d: 0, min: 50, max: 260, part: 'heart' },
  sleep: { name: '睡眠', unit: '小时', d: 1, min: 0, max: 16, part: 'brain' },
  steps: { name: '日均步数', unit: '步', d: 0, min: 0, max: 100000, part: '' }
};
const VT_ORDER = ['weight', 'rhr', 'bp', 'sleep', 'steps'];
const LAB_CATS = ['血脂', '肝功能', '肾功能', '血糖', '血常规', '甲状腺', '感染', '肿瘤标志物', '维生素', '骨代谢', '心功能', '尿常规', '眼科', '其他'];
const LAB_PRESETS = [
  { key: 'TC', name: '总胆固醇', unit: 'mmol/L', low: null, high: 5.2, cat: '血脂', part: 'heart' },
  { key: 'TG', name: '甘油三酯', unit: 'mmol/L', low: null, high: 1.7, cat: '血脂', part: 'heart' },
  { key: 'LDL-C', name: '低密度脂蛋白胆固醇', unit: 'mmol/L', low: null, high: 3.4, cat: '血脂', part: 'heart' },
  { key: 'HDL-C', name: '高密度脂蛋白胆固醇', unit: 'mmol/L', low: 1.0, high: null, cat: '血脂', part: 'heart' },
  { key: 'ALT', name: '谷丙转氨酶', unit: 'U/L', low: 9, high: 50, cat: '肝功能', part: 'liver', f: [7, 40] },
  { key: 'AST', name: '谷草转氨酶', unit: 'U/L', low: 15, high: 40, cat: '肝功能', part: 'liver', f: [13, 35] },
  { key: 'GGT', name: 'γ-谷氨酰转移酶', unit: 'U/L', low: 10, high: 60, cat: '肝功能', part: 'liver', f: [7, 45] },
  { key: 'TBIL', name: '总胆红素', unit: 'μmol/L', low: 3.4, high: 20.5, cat: '肝功能', part: 'liver' },
  { key: 'ALB', name: '白蛋白', unit: 'g/L', low: 40, high: 55, cat: '肝功能', part: 'liver' },
  { key: 'Cr', name: '肌酐', unit: 'μmol/L', low: 57, high: 111, cat: '肾功能', part: 'kidneys', f: [41, 81] },
  { key: 'UA', name: '尿酸', unit: 'μmol/L', low: 208, high: 428, cat: '肾功能', part: 'kidneys', f: [155, 357] },
  { key: 'BUN', name: '尿素', unit: 'mmol/L', low: 3.1, high: 8.0, cat: '肾功能', part: 'kidneys' },
  { key: 'eGFR', name: '估算肾小球滤过率', unit: 'mL/min/1.73m²', low: 90, high: null, cat: '肾功能', part: 'kidneys' },
  { key: 'FPG', name: '空腹血糖', unit: 'mmol/L', low: 3.9, high: 6.1, cat: '血糖', part: 'pancreas' },
  { key: 'HbA1c', name: '糖化血红蛋白', unit: '%', low: 4.0, high: 6.0, cat: '血糖', part: 'pancreas' },
  { key: 'Hb', name: '血红蛋白', unit: 'g/L', low: 130, high: 175, cat: '血常规', part: '', f: [115, 150] },
  { key: 'WBC', name: '白细胞计数', unit: '×10⁹/L', low: 3.5, high: 9.5, cat: '血常规', part: '' },
  { key: 'PLT', name: '血小板计数', unit: '×10⁹/L', low: 125, high: 350, cat: '血常规', part: '' },
  { key: 'TSH', name: '促甲状腺激素', unit: 'mIU/L', low: 0.27, high: 4.2, cat: '甲状腺', part: 'thyroid' },
  { key: 'FT4', name: '游离甲状腺素', unit: 'pmol/L', low: 12, high: 22, cat: '甲状腺', part: 'thyroid' },
  { key: 'UBT', name: 'C13 尿素呼气试验', unit: 'DOB', low: null, high: 4.0, cat: '感染', part: 'stomach' },
  { key: 'AFP', name: '甲胎蛋白', unit: 'ng/mL', low: null, high: 7, cat: '肿瘤标志物', part: 'liver' },
  { key: 'CEA', name: '癌胚抗原', unit: 'ng/mL', low: null, high: 5, cat: '肿瘤标志物', part: 'colon' },
  { key: 'PSA', name: '前列腺特异性抗原', unit: 'ng/mL', low: null, high: 4, cat: '肿瘤标志物', part: 'bladder', only: 'M' },
  { key: '25OHD', name: '25-羟基维生素 D', unit: 'ng/mL', low: 30, high: 100, cat: '维生素', part: '' },
  { key: 'IOP', name: '眼压', unit: 'mmHg', low: 10, high: 21, cat: '眼科', part: 'eyes' }
];
// sex-specific reference intervals: WS/T 404 (ALT, AST, GGT, Cr, Hb); uric acid per common Chinese lab ranges
const presets = () => LAB_PRESETS.filter(p => !p.only || p.only === SEX()).map(p => SEX() === 'F' && p.f ? { ...p, low: p.f[0], high: p.f[1] } : p);
const PLAN_KINDS = { recheck: '复查', med: '用药', exercise: '运动', habit: '习惯' };
const REPEATS = { '': '不重复', daily: '每天', weekly: '每周', monthly: '每月' };

/* ---------- data: one document per person, their records in sub-collections ---------- */
const COLS = ['issues', 'vitals', 'labs', 'plans'];
const LSK = { people: 'bos-people', ui: 'bos-ui' };
const lsRec = (pid, c) => `bos-p-${pid}-${c}`;
const EX = JSON.parse($('examples').textContent);
const D = { issues: [], vitals: [], labs: [], plans: [], profile: null, people: [] };
let mode = 'init', DB = null, RO = false, CUR = null, UNSUB = [], PENDING = null;
const SEX = () => D.profile && D.profile.sex === '女' ? 'F' : 'M';
const curParts = () => PARTS.filter(p => !p.sex || p.sex === SEX());

function clean(col, arr) {
  const out = [];
  for (const r of Array.isArray(arr) ? arr : []) {
    if (!r || typeof r !== 'object' || !r.id) continue;
    if (col === 'issues') {
      if (!PART[r.part] || !r.title) continue;
      out.push({ ...r, title: String(r.title), sev: clamp(Math.round(+r.sev || 1), 1, 4), status: STATUS[r.status] ? r.status : 'active', side: PART[r.part].pair && (r.side === 'L' || r.side === 'R') ? r.side : '', since: isMonth(r.since) ? r.since : '', source: SOURCES.includes(r.source) ? r.source : '自述', note: String(r.note || '') });
    } else if (col === 'vitals') {
      if (!VT[r.type] || !isDate(r.date) || num(r.value) === null) continue;
      if (r.type === 'bp' && num(r.value2) === null) continue;
      out.push({ ...r, value: +r.value, value2: r.type === 'bp' ? +r.value2 : null, note: String(r.note || '') });
    } else if (col === 'labs') {
      if (!r.name || num(r.value) === null || !isDate(r.date)) continue;
      out.push({ ...r, name: String(r.name), key: String(r.key || r.name), value: +r.value, low: num(r.low), high: num(r.high), part: PART[r.part] ? r.part : '', cat: LAB_CATS.includes(r.cat) ? r.cat : '其他', unit: String(r.unit || ''), note: String(r.note || '') });
    } else if (col === 'plans') {
      if (!r.title || !isDate(r.due)) continue;
      out.push({ ...r, title: String(r.title), kind: PLAN_KINDS[r.kind] ? r.kind : 'recheck', repeat: REPEATS[r.repeat] !== undefined ? r.repeat : '', part: PART[r.part] ? r.part : '', done: !!r.done, note: String(r.note || '') });
    }
  }
  return out;
}
function cleanProfile(p) {
  if (!p || typeof p !== 'object' || !p.id) return null;
  return { id: p.id, name: String(p.name || '').slice(0, 12) || '未命名', sex: p.sex === '女' ? '女' : '男', birth: isMonth(p.birth) ? p.birth : '', height: num(p.height), weight: num(p.weight), blood: ['A', 'B', 'AB', 'O'].includes(p.blood) ? p.blood : '', rh: p.rh === '-' ? '-' : '+', rhr: num(p.rhr), allergy: String(p.allergy || '').slice(0, 60), order: num(p.order) ?? 99, example: !!p.example };
}
const byOrder = (a, b) => a.order - b.order || String(a.id).localeCompare(String(b.id));
const profileBody = p => { const { id, ...r } = p; return r; };
function lsGet(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } }
function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { } }
function lsDel(k) { try { localStorage.removeItem(k); } catch { } }
function pickCur() {
  const want = ST.cur;
  CUR = D.people.some(p => p.id === want) || (want && want === PENDING) ? want : (D.people[0] ? D.people[0].id : null);
  D.profile = D.people.find(p => p.id === CUR) || null;
}
function loadLocal() {
  let ppl = lsGet(LSK.people);
  if (!Array.isArray(ppl)) { // first visit without cloud: show the fictional demo person
    ppl = [{ ...EX.profile, id: 'demo', name: '示例', order: 3 }];
    for (const c of COLS) lsSet(lsRec('demo', c), EX[c]);
    lsSet(LSK.people, ppl);
  }
  D.people = ppl.map(cleanProfile).filter(Boolean).sort(byOrder);
  pickCur(); loadLocalRecords();
}
function loadLocalRecords() { for (const c of COLS) D[c] = clean(c, CUR ? lsGet(lsRec(CUR, c)) : []); }
function saveLocal(c) { if (c === 'people') lsSet(LSK.people, D.people); else lsSet(lsRec(CUR, c), D[c]); }

function setSync(t, warn) { $('sync').classList.toggle('local', !!warn); $('sync').querySelector('span').textContent = t; }

async function connect() {
  let db = null;
  try { db = window.claude && window.claude.use ? await window.claude.use('db') : null; } catch { db = null; }
  if (!db) { mode = 'local'; setSync('本地模式 · 只保存在此浏览器', true); renderAll(); return; }
  DB = db; mode = 'db'; setSync('已同步到云端');
  let subscribed = null;
  DB.collection('people').onSnapshot(s => {
    D.people = s.docs.map(d => cleanProfile({ id: d.id, ...d.data() })).filter(Boolean).sort(byOrder);
    pickCur();
    if (CUR !== subscribed) { subscribed = CUR; subscribeRecords(); onPersonChange(); }
    renderAll();
  }, () => setSync('同步中断，显示最后一次数据', true));
}
function subscribeRecords() {
  UNSUB.forEach(u => u()); UNSUB = [];
  for (const c of COLS) D[c] = [];
  if (!CUR || mode !== 'db') return;
  const pid = CUR;
  for (const c of COLS) UNSUB.push(DB.collection(`people/${pid}/${c}`).onSnapshot(s => {
    if (pid !== CUR) return;
    D[c] = clean(c, s.docs.map(d => ({ id: d.id, ...d.data() }))); renderAll();
  }, () => setSync('同步中断，显示最后一次数据', true)));
}
function switchPerson(pid) {
  if (!pid || pid === CUR) return;
  ST.cur = pid; saveUI();
  ST.sel = null; ST.vt = null; ST.q = ''; $('q').value = '';
  pickCur();
  if (mode === 'db') subscribeRecords(); else loadLocalRecords();
  onPersonChange(); renderAll();
}
function guardWrite(noPerson) {
  if (RO) return false;
  if (mode === 'init') { toast('正在连接数据，请稍候再试'); return false; }
  if (!CUR && !noPerson) { toast('请先新建一个档案'); return false; }
  return true;
}
const recPath = c => `people/${CUR}/${c}`;
async function add(c, obj) {
  if (mode === 'db') { const r = DB.collection(recPath(c)).doc(); await r.set(obj); return r.id; }
  const id = c[0] + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  D[c] = [...D[c], { id, ...obj }]; saveLocal(c); renderAll(); return id;
}
async function put(c, id, obj) {
  if (mode === 'db') return DB.doc(recPath(c) + '/' + id).set(obj);
  D[c] = D[c].map(x => x.id === id ? { id, ...obj } : x); saveLocal(c); renderAll();
}
async function del(c, id) {
  if (mode === 'db') return DB.doc(recPath(c) + '/' + id).delete();
  D[c] = D[c].filter(x => x.id !== id); saveLocal(c); renderAll();
}
async function putProfile(obj) {
  const body = { ...obj, order: D.profile ? D.profile.order : obj.order ?? 99 };
  if (mode === 'db') return DB.doc('people/' + CUR).set(body);
  D.people = D.people.map(p => p.id === CUR ? cleanProfile({ id: CUR, ...body }) : p).sort(byOrder);
  saveLocal('people'); pickCur(); onPersonChange(); renderAll();
}
async function createPerson(obj) {
  const body = { ...obj, order: Math.max(0, ...D.people.filter(p => !p.example).map(p => p.order)) + 1 };
  let id;
  if (mode === 'db') { const r = DB.collection('people').doc(); id = r.id; PENDING = id; await r.set(body); }
  else { id = 'p' + Date.now().toString(36); D.people = [...D.people, cleanProfile({ id, ...body })].sort(byOrder); saveLocal('people'); }
  switchPerson(id);
  return id;
}
async function deletePerson() {
  const pid = CUR;
  if (mode === 'db') {
    const jobs = [];
    for (const c of COLS) for (const x of D[c]) jobs.push(`people/${pid}/${c}/${x.id}`);
    for (let i = 0; i < jobs.length; i += 8) await Promise.all(jobs.slice(i, i + 8).map(path => DB.doc(path).delete()));
    await DB.doc('people/' + pid).delete();
  } else {
    for (const c of COLS) lsDel(lsRec(pid, c));
    D.people = D.people.filter(p => p.id !== pid); saveLocal('people');
  }
  ST.cur = null; pickCur();
  if (mode === 'db') subscribeRecords(); else loadLocalRecords();
  onPersonChange(); renderAll();
}
function fail(e) {
  if (e && e.code === 'invalid_argument') { RO = true; document.body.classList.add('ro'); closeForm(); renderAll(); toast('你只有查看权限，无法修改这份健康档案'); }
  else if (e && e.code === 'quota_exceeded') toast('存储已满，请先删除一些旧记录');
  else if (typeof e === 'string') throw e;
  else toast('保存失败，请检查网络后再试');
}

/* ---------- derived facts ---------- */
let SM = {};
function sevMap() {
  const m = {};
  for (const i of D.issues) {
    if (i.status === 'resolved') continue;
    const p = m[i.part] || (m[i.part] = { L: 0, R: 0, all: 0, n: 0 });
    p.n++; p.all = Math.max(p.all, i.sev);
    if (i.side !== 'R') p.L = Math.max(p.L, i.sev);
    if (i.side !== 'L') p.R = Math.max(p.R, i.sev);
  }
  return m;
}
const partSev = id => SM[id] ? SM[id].all : 0;
const sideSev = (id, side) => { const s = SM[id]; if (!s) return 0; return side === 'L' ? s.L : side === 'R' ? s.R : s.all; };
const series = t => D.vitals.filter(v => v.type === t).sort(byDate('date'));
const latestV = t => { const s = series(t); return s[s.length - 1] || null; };
const curWeight = () => latestV('weight')?.value ?? D.profile?.weight ?? null;
const curRhr = () => latestV('rhr')?.value ?? D.profile?.rhr ?? null;
function bmiVal() { const h = D.profile?.height, w = curWeight(); return h && w ? w / ((h / 100) ** 2) : null; }
function ageVal(p) {
  const b = (p || D.profile)?.birth; if (!isMonth(b)) return null;
  const [y, m] = b.split('-').map(Number), n = new Date();
  return n.getFullYear() - y - (n.getMonth() + 1 < m ? 1 : 0);
}
// reference standards: BMI WS/T 428-2013; BP 中国高血压防治指南 2018; sleep AASM 7–9 h; RHR 60–100
const bmiTag = b => b == null ? null : b < 18.5 ? { t: '偏瘦', s: 2 } : b < 24 ? { t: '正常', s: 0 } : b < 28 ? { t: '超重', s: 1 } : { t: '肥胖', s: 2 };
const rhrTag = v => v == null ? null : v < 50 ? { t: '偏慢', s: 1 } : v < 60 ? { t: '偏慢', s: 0 } : v <= 100 ? { t: '正常', s: 0 } : { t: '偏快', s: 2 };
const bpTag = (s, d) => s == null ? null : (s >= 160 || d >= 100) ? { t: '高血压 2 级', s: 3 } : (s >= 140 || d >= 90) ? { t: '高血压 1 级', s: 2 } : (s >= 120 || d >= 80) ? { t: '正常高值', s: 1 } : { t: '正常', s: 0 };
const sleepTag = v => v == null ? null : v < 6 ? { t: '明显不足', s: 2 } : v < 7 ? { t: '偏少', s: 1 } : v <= 9 ? { t: '正常', s: 0 } : { t: '偏多', s: 1 };
const stepsTag = v => v == null ? null : v >= 7000 ? { t: '达标', s: 0 } : { t: '偏少', s: 1 };
function vitalTag(t, v) {
  if (!v) return null;
  if (t === 'weight') return bmiTag(bmiVal()) && { t: 'BMI ' + nf(bmiVal(), 1) + ' ' + bmiTag(bmiVal()).t, s: bmiTag(bmiVal()).s };
  if (t === 'rhr') return rhrTag(v.value);
  if (t === 'bp') return bpTag(v.value, v.value2);
  if (t === 'sleep') return sleepTag(v.value);
  if (t === 'steps') return stepsTag(v.value);
}
const tagPill = tg => tg ? `<span class="pill ${tg.s ? 's' + tg.s : 'ok'}"><i></i>${esc(tg.t)}</span>` : '';
const sevPill = (s, txt) => s ? `<span class="pill s${s}"><i></i>${txt || SEVN[s]}</span>` : `<span class="pill ok"><i></i>${txt || '正常'}</span>`;
function labStatus(l) {
  if (l.high != null && l.value > l.high) return { t: '偏高', dir: 1 };
  if (l.low != null && l.value < l.low) return { t: '偏低', dir: -1 };
  return { t: '正常', dir: 0 };
}
const labPill = l => { const s = labStatus(l); return s.dir ? `<span class="pill s2"><i></i>${s.t} ${s.dir > 0 ? '↑' : '↓'}</span>` : `<span class="pill ok"><i></i>正常</span>`; };
const refText = l => l.low != null && l.high != null ? `${l.low}–${l.high}` : l.high != null ? `≤ ${l.high}` : l.low != null ? `≥ ${l.low}` : '未填';
function labGroups() { // latest + history per indicator key
  const g = {};
  for (const l of D.labs) (g[l.key] || (g[l.key] = [])).push(l);
  return Object.values(g).map(a => { a.sort(byDate('date')); return { latest: a[a.length - 1], prev: a[a.length - 2] || null, all: a }; });
}
const lastReport = () => D.labs.reduce((m, l) => l.date > m ? l.date : m, '');
function planStatus(p) {
  if (p.done) return { t: '已完成', c: 'mute', g: 'done' };
  const d = dayDiff(p.due, todayISO());
  if (d < 0) return { t: `逾期 ${-d} 天`, c: 's3', g: 'overdue' };
  if (d === 0) return { t: '今天', c: 's1', g: 'today' };
  if (d <= 7) return { t: `还有 ${d} 天`, c: 'plan', g: 'week' };
  return { t: fmtMD(p.due), c: '', g: 'later' };
}
const planPill = p => { const s = planStatus(p); return `<span class="pill ${s.c}">${s.c && s.c[0] === 's' ? '<i></i>' : ''}${esc(s.t)}</span>`; };
const partName = id => id ? PART[id].name : '全身';

/* ---------- UI state ---------- */
const ST = { mod: 'issue', q: '', grp: { issue: 'zone', lab: 'cat' }, vt: null, sel: null, armed: null, cur: null };
{
  const u = lsGet(LSK.ui);
  if (u && ['issue', 'vital', 'lab', 'plan'].includes(u.mod)) ST.mod = u.mod;
  if (u && u.grp) Object.assign(ST.grp, u.grp);
  if (u && typeof u.cur === 'string') ST.cur = u.cur;
}
const saveUI = () => lsSet(LSK.ui, { mod: ST.mod, grp: ST.grp, cur: ST.cur || CUR });
let armTimer = 0;
function arm(key) { ST.armed = key; clearTimeout(armTimer); armTimer = setTimeout(() => { ST.armed = null; renderAll(); }, 3200); }
const armed = key => ST.armed === key;

/* ---------- sidebar ---------- */
const stat = (v, l, cls) => `<div class="stat"><b class="num ${cls || ''}">${v}</b><span>${l}</span></div>`;
const zoneOf = id => id ? PART[id].zone : '';
function inZone(partId) { return G.zone === 'all' || zoneOf(partId) === G.zone; }
function match(...fields) { const q = ST.q.trim().toLowerCase(); return !q || fields.some(f => String(f || '').toLowerCase().includes(q)); }

function renderSide() {
  document.querySelectorAll('.mods button').forEach(b => b.setAttribute('aria-selected', String(b.dataset.mod === ST.mod)));
  $('n-issue').textContent = D.issues.filter(i => i.status !== 'resolved').length || '';
  $('n-vital').textContent = D.vitals.length || '';
  $('n-lab').textContent = labGroups().filter(g => labStatus(g.latest).dir).length || '';
  $('n-plan').textContent = D.plans.filter(p => !p.done).length || '';
  const segMap = { issue: ['分区', '严重度'], lab: ['分类', '异常优先'] };
  const seg = segMap[ST.mod];
  $('seg').hidden = !seg || !!(ST.mod === 'vital' && ST.vt);
  if (seg) {
    $('g-a').textContent = seg[0]; $('g-b').textContent = seg[1];
    const b = ST.grp[ST.mod] !== (ST.mod === 'issue' ? 'zone' : 'cat');
    $('g-a').setAttribute('aria-pressed', String(!b)); $('g-b').setAttribute('aria-pressed', String(b));
  }
  $('tools').hidden = ST.mod === 'vital';
  $('q').placeholder = { issue: '搜索问题、部位', vital: '', lab: '搜索指标，如 ALT、尿酸', plan: '搜索计划' }[ST.mod];
  $('addLbl').textContent = { issue: '记录问题', vital: '记录体征', lab: '录入指标', plan: '新建计划' }[ST.mod];
  const zc = $('zchip');
  zc.hidden = G.zone === 'all' || ST.mod === 'vital';
  if (!zc.hidden) zc.innerHTML = `只看 <button type="button" data-act="zall" aria-label="取消筛选，查看全身">${ZONES[G.zone].name}<i>×</i></button>`;
  $('exNotice').hidden = RO || !COLS.some(c => D[c].some(x => x.example));
  ({ issue: sideIssue, vital: sideVital, lab: sideLab, plan: sidePlan })[ST.mod]();
}

function sideIssue() {
  const act = D.issues.filter(i => i.status !== 'resolved');
  const parts = new Set(act.map(i => i.part));
  $('stats').innerHTML = stat(parts.size, '需关注部位') + stat(act.length, '未解决问题') + stat(act.filter(i => i.sev >= 3).length, '中度及以上') + stat(D.issues.length - act.length, '已解决');
  const worst = [...act].sort((a, b) => b.sev - a.sev || (b.since > a.since ? 1 : -1))[0];
  if (worst) {
    const next = D.plans.filter(p => !p.done && p.part === worst.part).sort(byDate('due'))[0];
    const od = next ? -dayDiff(next.due, todayISO()) : 0;
    $('trail').innerHTML = `最需要处理：<b>${esc(PART[worst.part].name)} · ${esc(worst.title)}</b>（${SEVN[worst.sev]}）${next ? `，下一步 ${esc(next.title)}（${od > 0 ? `<b>已逾期 ${od} 天</b>` : fmtMD(next.due)}）` : ''}`;
  } else $('trail').textContent = D.issues.length ? '所有问题都已解决。' : '还没有记录问题。点身体上的部位，或用下方按钮记录。';
  const list = D.issues.filter(i => inZone(i.part) && match(i.title, PART[i.part].name, i.note, PART[i.part].sys));
  const ord = (a, b) => (a.status === 'resolved') - (b.status === 'resolved') || b.sev - a.sev || (b.since > a.since ? 1 : -1);
  let groups;
  if (ST.grp.issue === 'zone') groups = Object.entries(ZONES).map(([z, info]) => [info.name, list.filter(i => PART[i.part].zone === z).sort(ord)]);
  else groups = [4, 3, 2, 1].map(s => [SEVN[s], list.filter(i => i.status !== 'resolved' && i.sev === s).sort(ord)]).concat([['已解决', list.filter(i => i.status === 'resolved').sort(ord)]]);
  groups = groups.filter(g => g[1].length);
  $('list').innerHTML = groups.length ? groups.map(([h, a]) => `<div class="group-h"><span>${h}</span><span class="num">${a.length}</span></div>` + a.map(i => {
    const res = i.status === 'resolved', cur = ST.sel && ST.sel.issue === i.id;
    return `<button class="item${res ? ' done' : ''}" data-act="issue" data-id="${esc(i.id)}" aria-current="${cur}"><i class="dot ${res ? 'res' : 's' + i.sev}"></i><div><div class="nm">${esc(i.title)}</div><div class="sub">${esc(PART[i.part].name)}${i.side ? ' · ' + SIDEN[i.side] : ''} · ${STATUS[i.status]}${i.since ? ' · 自 ' + fmtD(i.since) : ''}</div></div>${res ? '<span class="pill mute">已解决</span>' : sevPill(i.sev)}</button>`;
  }).join('')).join('') : `<div class="empty">${ST.q ? '没有匹配的问题' : G.zone !== 'all' ? `${ZONES[G.zone].name}没有记录问题` : '还没有记录问题'}</div>`;
}

function spark(vals) {
  if (vals.length < 2) return '<svg viewBox="0 0 128 40"></svg>';
  const w = 128, h = 40, p = 5, mn = Math.min(...vals), mx = Math.max(...vals), sp = mx - mn || 1;
  const pts = vals.map((v, i) => [p + i * (w - 2 * p) / (vals.length - 1), h - p - (v - mn) / sp * (h - 2 * p)]);
  const d = pts.map((q, i) => (i ? 'L' : 'M') + q[0].toFixed(1) + ',' + q[1].toFixed(1)).join('');
  const e = pts[pts.length - 1];
  return `<svg viewBox="0 0 ${w} ${h}" aria-hidden="true"><path d="${d}L${e[0].toFixed(1)},${h}L${p},${h}Z" style="fill:var(--c-vital);opacity:.1"/><path d="${d}" style="fill:none;stroke:var(--c-vital);stroke-width:2;stroke-linecap:round;stroke-linejoin:round"/><circle cx="${e[0].toFixed(1)}" cy="${e[1].toFixed(1)}" r="4" style="fill:var(--c-vital);stroke:var(--bg);stroke-width:2"/></svg>`;
}
const vfmt = (t, v) => t === 'bp' ? `${v.value}/${v.value2}` : nf(v.value, VT[t].d);
function delta30(t) {
  const s = series(t); if (s.length < 2) return null;
  const last = s[s.length - 1], target = addDays(last.date, -30);
  let best = null;
  for (const v of s) if (v !== last && (best === null || Math.abs(dayDiff(v.date, target)) < Math.abs(dayDiff(best.date, target)))) best = v;
  return best ? { d: last.value - best.value, days: dayDiff(last.date, best.date) } : null;
}
function sideVital() {
  const w = latestV('weight'), h = latestV('rhr'), b = latestV('bp'), bm = bmiVal();
  $('stats').innerHTML = stat(w ? nf(w.value, 1) : '—', '体重 kg') + stat(bm ? nf(bm, 1) : '—', 'BMI') + stat(h ? h.value : '—', '心率 bpm') + stat(b ? `${b.value}/${b.value2}` : '—', '血压 mmHg', 'sm');
  const dw = delta30('weight'), bt = b && bpTag(b.value, b.value2);
  const bits = [];
  if (dw) bits.push(`近 ${dw.days} 天体重 <b>${dw.d > 0 ? '+' : dw.d < 0 ? '−' : '±'}${nf(Math.abs(dw.d), 1)} kg</b>`);
  if (bt) bits.push(`血压 ${b.value}/${b.value2} mmHg 属<b>${bt.t}</b>（正常高值 120–139/80–89）`);
  $('trail').innerHTML = bits.join('，') || '还没有体征记录。';
  if (ST.vt) return vitalDetail(ST.vt);
  $('list').innerHTML = VT_ORDER.map(t => {
    const s = series(t), last = s[s.length - 1], cur = VT[t];
    const vals = s.map(v => v.value);
    return `<button class="vcard" data-act="vt" data-type="${t}"><div class="vh"><i class="kd k-vital"></i><b>${cur.name}</b>${tagPill(vitalTag(t, last))}</div><div class="vv">${last ? `<b>${vfmt(t, last)}</b>${cur.unit}` : '<b>—</b>'}</div>${spark(vals.slice(-12))}<div class="vd">${last ? `${fmtMD(last.date)} · 共 ${s.length} 条` : '暂无记录，点这里添加'}</div></button>`;
  }).join('') + '<p class="note">参考标准：BMI 按国家卫生行业标准 WS/T 428-2013；血压分级按《中国高血压防治指南（2018）》；成人睡眠 7–9 小时（AASM）；静息心率 60–100 次/分。</p>';
}
const CH = {};
function bandOf(t) {
  const h = D.profile?.height;
  if (t === 'weight' && h) return { lo: 18.5 * (h / 100) ** 2, hi: 23.9 * (h / 100) ** 2, label: 'BMI 正常' };
  if (t === 'rhr') return { lo: 60, hi: 100, label: '正常 60–100' };
  if (t === 'sleep') return { lo: 7, hi: 9, label: '建议 7–9 小时' };
  if (t === 'steps') return { lo: 7000, hi: null, label: '7,000 步' };
  if (t === 'bp') return { lines: [[140, '收缩压 140'], [90, '舒张压 90']] };
  return null;
}
function niceTicks(lo, hi, n) {
  const span = hi - lo || 1, step0 = span / n, mag = 10 ** Math.floor(Math.log10(step0)), r = step0 / mag;
  const step = (r < 1.5 ? 1 : r < 3 ? 2 : r < 7 ? 5 : 10) * mag;
  const a = Math.floor(lo / step) * step, b = Math.ceil(hi / step) * step, out = [];
  for (let v = a; v <= b + step * 1e-6; v += step) out.push(+v.toFixed(6));
  return out;
}
function bigChart(t) {
  const s = series(t);
  if (s.length < 2) return `<div class="chart"><div class="empty">至少需要 2 条记录才能画趋势</div></div>`;
  const W = 340, H = 180, m = { l: 40, r: 16, t: 14, b: 26 };
  const ys = t === 'bp' ? [...s.map(v => v.value), ...s.map(v => v.value2)] : s.map(v => v.value);
  let lo = Math.min(...ys), hi = Math.max(...ys);
  const band = bandOf(t), span = hi - lo || Math.abs(hi) * 0.1 || 1;
  if (band && band.lines) { for (const [v] of band.lines) { if (v > hi && v - hi < span * 1.2) hi = v; if (v < lo && lo - v < span * 1.2) lo = v; } }
  else if (band) {
    if (band.hi != null && band.hi < lo) lo = Math.max(band.hi, lo - span * 1.2);
    else if (band.lo > hi) hi = Math.min(band.lo, hi + span * 1.2);
    else { lo = Math.min(lo, Math.max(band.lo, lo - span * 0.5)); if (band.hi != null) hi = Math.max(hi, Math.min(band.hi, hi + span * 0.5)); }
  }
  const ticks = niceTicks(lo - span * 0.08, hi + span * 0.08, 4);
  const y0 = ticks[0], y1 = ticks[ticks.length - 1];
  const t0 = parseD(s[0].date).getTime(), t1 = parseD(s[s.length - 1].date).getTime();
  const X = d => m.l + (parseD(d).getTime() - t0) / ((t1 - t0) || 1) * (W - m.l - m.r);
  const Y = v => m.t + (1 - (v - y0) / ((y1 - y0) || 1)) * (H - m.t - m.b);
  let g = '';
  for (const v of ticks) g += `<line class="axl" x1="${m.l}" x2="${W - m.r}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}"/><text class="ax" x="${m.l - 6}" y="${(Y(v) + 4).toFixed(1)}" text-anchor="end">${nf(v, v % 1 ? 1 : 0)}</text>`;
  if (band && !band.lines) {
    const a = Y(Math.min(y1, band.hi ?? y1)), b = Y(Math.max(y0, band.lo));
    if (b > a) g += `<rect x="${m.l}" y="${a.toFixed(1)}" width="${W - m.l - m.r}" height="${(b - a).toFixed(1)}" style="fill:var(--band)"/><text class="bandlbl" x="${W - m.r - 4}" y="${(a + 13).toFixed(1)}" text-anchor="end">${band.label}</text>`;
  }
  if (band && band.lines) for (const [v, l] of band.lines) if (v >= y0 && v <= y1) g += `<line x1="${m.l}" x2="${W - m.r}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}" style="stroke:var(--s3);stroke-width:1;opacity:.55"/><text class="bandlbl" x="${m.l + 4}" y="${(Y(v) - 4).toFixed(1)}">${l}</text>`;
  g += `<text class="ax" x="${m.l}" y="${H - 6}">${fmtD(s[0].date).slice(5)}</text><text class="ax" x="${W - m.r}" y="${H - 6}" text-anchor="end">${fmtD(s[s.length - 1].date).slice(5)}</text>`;
  const line = (key, cls) => s.map((v, i) => (i ? 'L' : 'M') + X(v.date).toFixed(1) + ',' + Y(v[key]).toFixed(1)).join('');
  const L1 = line('value');
  const last = s[s.length - 1];
  if (t !== 'bp') g += `<path d="${L1}L${X(last.date).toFixed(1)},${Y(y0).toFixed(1)}L${m.l},${Y(y0).toFixed(1)}Z" style="fill:var(--c-vital);opacity:.1"/>`;
  g += `<path d="${L1}" style="fill:none;stroke:var(--c-vital);stroke-width:2;stroke-linecap:round;stroke-linejoin:round"/>`;
  if (t === 'bp') g += `<path d="${line('value2')}" style="fill:none;stroke:var(--c-lab);stroke-width:2;stroke-linecap:round;stroke-linejoin:round"/><circle cx="${X(last.date).toFixed(1)}" cy="${Y(last.value2).toFixed(1)}" r="4" style="fill:var(--c-lab);stroke:var(--bg);stroke-width:2"/>`;
  g += `<circle cx="${X(last.date).toFixed(1)}" cy="${Y(last.value).toFixed(1)}" r="4" style="fill:var(--c-vital);stroke:var(--bg);stroke-width:2"/>`;
  g += `<line id="chx" x1="0" x2="0" y1="${m.t}" y2="${H - m.b}" style="stroke:var(--faint);stroke-width:1" visibility="hidden"/>`;
  CH.cur = { t, s, X, W, H };
  const lg = t === 'bp' ? `<div class="lgd"><span><i style="background:var(--c-vital)"></i>收缩压</span><span><i style="background:var(--c-lab)"></i>舒张压</span></div>` : '';
  return `<div class="chart" id="chart">${lg}<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${VT[t].name}趋势，${s.length} 条记录">${g}</svg><div class="tip" id="ctip" hidden></div></div>`;
}
function vitalDetail(t) {
  const s = series(t), cur = VT[t], last = s[s.length - 1];
  const recs = [...s].reverse().map(v => `<div class="rec"><span class="num">${fmtD(v.date)}</span><span><span class="num">${vfmt(t, v)}</span> <small>${cur.unit}${v.note ? ' · ' + esc(v.note) : ''}</small></span><button class="ib${armed('v' + v.id) ? ' arm' : ''}" data-act="vdel" data-id="${esc(v.id)}" data-w aria-label="删除这条记录">${armed('v' + v.id) ? '确认删除' : '×'}</button></div>`).join('');
  $('list').innerHTML = `<button class="back" data-act="vback">‹ 全部体征</button><div class="dhead"><div><h2>${cur.name}</h2><div class="meta">${last ? `最新 ${vfmt(t, last)} ${cur.unit} · ${fmtMD(last.date)}` : '暂无记录'}</div></div>${tagPill(vitalTag(t, last))}</div>${bigChart(t)}<div class="tacts" data-w><button class="btn primary sm" data-act="vadd" data-type="${t}">＋ 记录${cur.name}</button></div>${recs || '<div class="empty">还没有记录</div>'}`;
  const ch = $('chart'); if (!ch) return;
  const svg = ch.querySelector('svg');
  const move = e => {
    const c = CH.cur; if (!c) return;
    const r = svg.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * c.W;
    let bi = 0, bd = 1e9; c.s.forEach((v, i) => { const d = Math.abs(c.X(v.date) - x); if (d < bd) { bd = d; bi = i; } });
    const v = c.s[bi], px = c.X(v.date);
    const ln = $('chx'); ln.setAttribute('x1', px); ln.setAttribute('x2', px); ln.setAttribute('visibility', 'visible');
    const tip = $('ctip'); tip.hidden = false;
    tip.innerHTML = `${fmtD(v.date)} · <b class="num">${vfmt(c.t, v)}</b> ${VT[c.t].unit}`;
    const left = px / c.W * r.width + (r.left - ch.getBoundingClientRect().left);
    tip.style.left = clamp(left - tip.offsetWidth / 2, 4, ch.clientWidth - tip.offsetWidth - 4) + 'px'; tip.style.top = '6px';
  };
  svg.addEventListener('pointermove', move);
  svg.addEventListener('pointerleave', () => { $('ctip').hidden = true; $('chx').setAttribute('visibility', 'hidden'); });
}

function rangeSvg(l, W, H, big) {
  const v = l.value;
  const a0 = l.low ?? Math.min(v, l.high ?? v) * 0.5, b0 = l.high ?? Math.max(v, l.low ?? v) * 1.6;
  let lo = Math.min(a0, v), hi = Math.max(b0, v); const sp = hi - lo || 1; lo -= sp * 0.08; hi += sp * 0.08;
  const X = x => 6 + (x - lo) / (hi - lo) * (W - 12);
  const nl = X(l.low ?? lo), nh = X(l.high ?? hi), st = labStatus(l);
  const cy = big ? 16 : H / 2, th = big ? 10 : 6;
  let s = `<rect class="trk" x="6" y="${cy - th / 2}" width="${W - 12}" height="${th}" rx="${th / 2}"/><rect class="nrm" x="${nl.toFixed(1)}" y="${cy - th / 2}" width="${Math.max(2, nh - nl).toFixed(1)}" height="${th}" rx="${th / 2}"/>`;
  if (big) {
    if (l.low != null) s += `<text class="ax" x="${nl.toFixed(1)}" y="${cy + 24}" text-anchor="middle">${l.low}</text>`;
    if (l.high != null) s += `<text class="ax" x="${nh.toFixed(1)}" y="${cy + 24}" text-anchor="middle">${l.high}</text>`;
  }
  s += `<circle class="mk" cx="${X(v).toFixed(1)}" cy="${cy}" r="${big ? 6 : 4.5}" style="fill:${st.dir ? 'var(--s2)' : 'var(--ink)'}"/>`;
  return `<svg class="${big ? '' : 'rbar'}" viewBox="0 0 ${W} ${H}" aria-hidden="true">${s}</svg>`;
}
function sideLab() {
  const gs = labGroups(), abn = gs.filter(g => labStatus(g.latest).dir), lr = lastReport();
  const parts = new Set(abn.map(g => g.latest.part).filter(Boolean));
  $('stats').innerHTML = stat(gs.length, '指标') + stat(abn.length, '异常') + stat(parts.size, '涉及部位') + stat(lr ? fmtD(lr).slice(0, 7) : '—', '最近体检', 'sm');
  const worse = gs.filter(g => g.prev && labStatus(g.latest).dir && (g.latest.value - g.prev.value) * labStatus(g.latest).dir > 0);
  $('trail').innerHTML = worse.length ? `对比 ${fmtD(worse[0].prev.date).slice(0, 7)}，继续变差：` + worse.slice(0, 3).map(g => `<b>${esc(g.latest.key)} ${g.prev.value} → ${g.latest.value}</b>`).join('、') : abn.length ? `${abn.length} 项超出参考范围` : gs.length ? '全部指标在参考范围内' : '还没有体检指标。';
  const list = gs.filter(g => inZone(g.latest.part) || (!g.latest.part && G.zone === 'all')).filter(g => match(g.latest.name, g.latest.key, g.latest.cat, partName(g.latest.part)));
  const ord = (a, b) => (!!labStatus(b.latest).dir - !!labStatus(a.latest).dir) || a.latest.name.localeCompare(b.latest.name, 'zh');
  let groups;
  if (ST.grp.lab === 'cat') groups = LAB_CATS.map(c => [c, list.filter(g => g.latest.cat === c).sort(ord)]);
  else groups = [['超出参考范围', list.filter(g => labStatus(g.latest).dir).sort(ord)], ['正常', list.filter(g => !labStatus(g.latest).dir).sort(ord)]];
  groups = groups.filter(g => g[1].length);
  $('list').innerHTML = groups.length ? groups.map(([h, a]) => `<div class="group-h"><span>${h}</span><span class="num">${a.filter(g => labStatus(g.latest).dir).length ? a.filter(g => labStatus(g.latest).dir).length + ' 异常 · ' : ''}${a.length}</span></div>` + a.map(g => {
    const l = g.latest, cur = ST.sel && ST.sel.kind === 'lab' && ST.sel.key === l.key;
    const ch = g.prev ? (l.value > g.prev.value ? '↑' : l.value < g.prev.value ? '↓' : '→') + ' 上次 ' + g.prev.value : '';
    return `<button class="item lab" data-act="lab" data-key="${esc(l.key)}" aria-current="${cur}" style="grid-template-columns:minmax(0,1fr) auto"><div><div class="nm">${esc(l.name)}<span class="code">${esc(l.key)}</span></div><div class="lv"><b>${l.value}</b>${esc(l.unit)}${rangeSvg(l, 120, 14)}</div><div class="sub">${esc(partName(l.part))} · 参考 ${refText(l)}${ch ? ' · ' + ch : ''}</div></div>${labPill(l)}</button>`;
  }).join('')).join('') : `<div class="empty">${ST.q ? '没有匹配的指标' : G.zone !== 'all' ? `${ZONES[G.zone].name}没有相关指标` : '还没有体检指标'}</div>`;
}

function sidePlan() {
  const open = D.plans.filter(p => !p.done);
  const st = open.map(planStatus);
  $('stats').innerHTML = stat(open.length, '待办') + stat(st.filter(s => s.g === 'overdue').length, '已逾期') + stat(st.filter(s => s.g === 'today' || s.g === 'week').length, '7 天内') + stat(D.plans.length - open.length, '已完成');
  const od = open.filter(p => planStatus(p).g === 'overdue').sort(byDate('due'))[0];
  const nx = open.filter(p => planStatus(p).g !== 'overdue').sort(byDate('due'))[0];
  $('trail').innerHTML = od ? `已逾期：<b>${esc(od.title)}</b>（${-dayDiff(od.due, todayISO())} 天）` : nx ? `下一项：<b>${esc(nx.title)}</b>，${planStatus(nx).t}` : D.plans.length ? '所有计划都已完成。' : '还没有计划。';
  const list = D.plans.filter(p => inZone(p.part) || (!p.part && G.zone === 'all')).filter(p => match(p.title, p.note, partName(p.part), PLAN_KINDS[p.kind]));
  const G5 = [['overdue', '已逾期'], ['today', '今天'], ['week', '7 天内'], ['later', '以后'], ['done', '已完成']];
  const groups = G5.map(([g, h]) => [h, list.filter(p => planStatus(p).g === g).sort(byDate('due'))]).filter(g => g[1].length);
  $('list').innerHTML = groups.length ? groups.map(([h, a]) => `<div class="group-h"><span>${h}</span><span class="num">${a.length}</span></div>` + a.map(p => {
    const cur = ST.sel && ST.sel.plan === p.id;
    return `<div class="prow"><button class="chk" data-act="chk" data-id="${esc(p.id)}" aria-pressed="${p.done}" aria-label="${p.done ? '标记为未完成' : p.repeat ? '打卡' : '标记完成'}：${esc(p.title)}"></button><button class="item${p.done ? ' done' : ''}" data-act="plan" data-id="${esc(p.id)}" aria-current="${cur}"><div><div class="nm">${esc(p.title)}</div><div class="sub">${PLAN_KINDS[p.kind]} · ${esc(partName(p.part))}${p.repeat ? ' · ' + REPEATS[p.repeat] : ''} · ${fmtMD(p.due)} 周${WK[parseD(p.due).getDay()]}</div></div>${planPill(p)}</button></div>`;
  }).join('')).join('') : `<div class="empty">${ST.q ? '没有匹配的计划' : '还没有计划'}</div>`;
}

/* ---------- stage: profile, zone HUD, card ---------- */
function renderProfile() {
  const p = D.profile, el = $('profile');
  const sevCount = [0, 0, 0, 0, 0];
  const cps = curParts();
  for (const x of cps) sevCount[partSev(x.id)]++;
  const seg = sevCount.map((n, s) => n ? `<i style="flex:${n};background:${SEVC[s]}" title="${SEVN[s]} ${n}"></i>` : '').join('');
  const leg = sevCount.map((n, s) => `<span><i style="background:${SEVC[s]}"></i>${SEVN[s]} <b class="num">${n}</b></span>`).join('');
  const sevBlock = `<div class="pf-sev"><div class="k"><span>${cps.length} 个部位状态</span><span>按最严重问题</span></div><div class="sevbar" role="img" aria-label="${sevCount.map((n, s) => SEVN[s] + ' ' + n).join('，')}">${seg}</div><div class="sevleg">${leg}</div></div>`;
  if (!p) {
    el.classList.remove('compact');
    el.innerHTML = `<div class="pf-head"><div class="pf-ava">+</div><div><b>还没有档案</b><small>先新建一个档案</small></div></div><div class="pf-full"><p class="pf-empty">每个人一份档案，问题、体征、体检和计划分开保存。</p><button class="btn primary sm" data-act="pnew" data-w>新建档案</button></div><div class="pf-strip"><button class="linkbtn" data-act="pnew" data-w>新建档案</button></div>`;
    return;
  }
  const age = ageVal(), w = curWeight(), bm = bmiVal(), hr = curRhr(), bp = latestV('bp'), sl = latestV('sleep');
  const lw = latestV('weight');
  const row = (k, v, tag) => `<dt>${k}</dt><dd>${v}${tag || ''}</dd>`;
  el.classList.toggle('compact', !!ST.sel);
  el.innerHTML = `<div class="pf-head"><div class="pf-ava${p.sex === '女' ? ' f' : ''}">${esc(p.name.slice(0, 1))}</div><div><b>${esc(p.name)}${p.example ? ' <span class="chip-ex">示例</span>' : ''}</b><small>${p.sex} · ${age != null ? age + ' 岁' : '年龄未填'}${p.blood ? ` · ${p.blood} 型` : ''}</small></div><button class="linkbtn" data-act="pedit" data-w>编辑</button></div>
<div class="pf-full"><dl class="pf">${row('年龄', age != null ? `<b>${age}</b>岁` : '—')}${row('身高', p.height ? `<b>${p.height}</b>cm` : '—')}${row('体重', w ? `<b>${nf(w, 1)}</b>kg` : '—')}${row('BMI', bm ? `<b>${nf(bm, 1)}</b>` : '—', tagPill(bmiTag(bm)))}${row('血型', p.blood ? `<b>${p.blood}</b>型 Rh${p.rh === '-' ? '−' : '+'}` : '—')}${row('静息心率', hr ? `<b>${hr}</b>bpm` : '—', tagPill(rhrTag(hr)))}${row('血压', bp ? `<b>${bp.value}/${bp.value2}</b>` : '—', bp ? tagPill(bpTag(bp.value, bp.value2)) : '')}${row('睡眠', sl ? `<b>${nf(sl.value, 1)}</b>h` : '—', tagPill(sleepTag(sl?.value)))}${p.allergy ? row('过敏', esc(p.allergy)) : ''}</dl>${lw ? `<div class="pf-empty" style="font-size:12.5px;margin-top:8px">体重、心率、血压、睡眠取自最近一次体征记录（${fmtMD(lw.date)}）</div>` : ''}${sevBlock}</div>
<div class="pf-strip"><span>年龄<b>${age ?? '—'}</b></span><span>身高 cm<b>${p.height ?? '—'}</b></span><span>体重 kg<b>${w ? nf(w, 1) : '—'}</b></span><span>BMI<b>${bm ? nf(bm, 1) : '—'}</b></span><span>血型<b>${p.blood ? p.blood + (p.rh === '-' ? '−' : '+') : '—'}</b></span><span>心率<b>${hr ?? '—'}</b></span><span>血压<b>${bp ? bp.value + '/' + bp.value2 : '—'}</b></span><span>睡眠 h<b>${sl ? nf(sl.value, 1) : '—'}</b></span></div>`;
}

function renderPeople() {
  const el = $('people');
  el.innerHTML = D.people.map(p => {
    const a = ageVal(p);
    return `<button role="tab" data-pid="${esc(p.id)}" aria-selected="${p.id === CUR}"><i class="av${p.sex === '女' ? ' f' : ''}">${esc(p.name.slice(0, 1))}</i><span>${esc(p.name)}</span><small>${p.sex}${a != null ? ' · ' + a : ''}</small></button>`;
  }).join('') + `<button class="add" data-act="pnew" data-w aria-label="新建档案">＋ 新建</button>`;
}

function renderZoneHud() {
  const z = G.zone, parts = z === 'all' ? curParts() : curParts().filter(p => p.zone === z);
  const n = parts.filter(p => partSev(p.id)).length;
  $('zoneHud').innerHTML = `<div class="k">当前视图</div><div class="v">${z === 'all' ? '全身' : ZONES[z].name}</div><div class="z">${parts.length} 个部位 · 需关注 <b class="num">${n}</b> 处</div>${z === 'all' ? '<div class="z">点击头部、内脏或躯干四肢查看细节</div>' : '<button class="back" data-act="zall">‹ 返回全身</button>'}`;
  document.querySelectorAll('.hud-tr [data-zone]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.zone === z)));
}

function issueBlock(i, hl) {
  const k = 'i' + i.id;
  const st = i.status === 'active' ? `<button data-act="istat" data-id="${esc(i.id)}" data-s="improving">标记好转</button><button data-act="istat" data-id="${esc(i.id)}" data-s="resolved">已解决</button>`
    : i.status === 'improving' ? `<button data-act="istat" data-id="${esc(i.id)}" data-s="resolved">已解决</button><button data-act="istat" data-id="${esc(i.id)}" data-s="active">仍未好转</button>`
    : `<button data-act="istat" data-id="${esc(i.id)}" data-s="active">复发</button>`;
  return `<div class="iss${hl ? ' hl' : ''}"><div class="it"><b>${esc(i.title)}</b>${i.status === 'resolved' ? '<span class="pill mute">已解决</span>' : sevPill(i.sev)}</div><div class="im">${i.side ? SIDEN[i.side] + ' · ' : ''}${STATUS[i.status]}${i.since ? ' · 自 ' + fmtD(i.since) : ''} · ${i.source}${i.example ? ' · <span class="chip-ex">示例</span>' : ''}</div>${i.note ? `<p>${esc(i.note)}</p>` : ''}<div class="ia" data-w>${st}<button data-act="iedit" data-id="${esc(i.id)}">编辑</button><button data-act="idel" data-id="${esc(i.id)}" class="${armed(k) ? 'arm' : ''}">${armed(k) ? '确认删除' : '删除'}</button></div></div>`;
}
function renderCard() {
  const el = $('card'), s = ST.sel;
  if (!s) { el.hidden = true; return; }
  let h = `<button class="x" data-act="close" aria-label="关闭">×</button>`;
  if (s.kind === 'part') {
    const p = PART[s.id];
    const iss = D.issues.filter(i => i.part === s.id).sort((a, b) => (a.status === 'resolved') - (b.status === 'resolved') || b.sev - a.sev);
    const labs = labGroups().filter(g => g.latest.part === s.id).sort((a, b) => !!labStatus(b.latest).dir - !!labStatus(a.latest).dir);
    const plans = D.plans.filter(x => x.part === s.id).sort((a, b) => a.done - b.done || (a.due < b.due ? -1 : 1));
    h += `<h2>${esc(p.name)}${sevPill(partSev(s.id))}</h2><div class="en">${ZONES[p.zone].name} · ${esc(p.sys)}${p.pair && SM[s.id] ? ` · 左 ${SEVN[SM[s.id].L]} / 右 ${SEVN[SM[s.id].R]}` : ''}</div>`;
    h += iss.length ? `<h4>问题 <span class="num">${iss.length}</span></h4>` + iss.map(i => issueBlock(i, s.issue === i.id)).join('') : `<p class="ok-msg">这个部位还没有记录问题。</p>`;
    if (labs.length) h += `<h4>相关指标 <span class="num">${labs.length}</span></h4>` + labs.map(g => `<button class="cl" data-act="lab" data-key="${esc(g.latest.key)}"><div><span>${esc(g.latest.name)}</span><small>${fmtD(g.latest.date)} · 参考 ${refText(g.latest)}</small></div><div class="r"><span><b class="num">${g.latest.value}</b> <small>${esc(g.latest.unit)}</small></span>${labPill(g.latest)}</div></button>`).join('');
    if (plans.length) h += `<h4>计划 <span class="num">${plans.length}</span></h4>` + plans.map(x => `<div class="cl"><div><span>${esc(x.title)}</span><small>${PLAN_KINDS[x.kind]}${x.repeat ? ' · ' + REPEATS[x.repeat] : ''} · ${fmtMD(x.due)}</small></div><div class="r">${planPill(x)}<button class="linkbtn" data-act="pedit2" data-id="${esc(x.id)}" data-w>编辑</button></div></div>`).join('');
    h += `<div class="cacts" data-w><button class="btn primary sm" data-act="iadd" data-part="${s.id}">＋ 记录问题</button><button class="btn ghost sm" data-act="padd" data-part="${s.id}">＋ 计划</button></div>`;
  } else if (s.kind === 'lab') {
    const g = labGroups().find(x => x.latest.key === s.key);
    if (!g) { ST.sel = null; el.hidden = true; return; }
    const l = g.latest;
    h += `<h2>${esc(l.name)}</h2><div class="en">${esc(l.key)} · ${esc(l.cat)} · ${esc(partName(l.part))}</div><div class="big"><b>${l.value}</b><span>${esc(l.unit)}</span>${labPill(l)}</div><div class="rbig">${rangeSvg(l, 320, 46, true)}</div><div class="en">参考范围 ${refText(l)} ${esc(l.unit)} · ${fmtD(l.date)}</div>`;
    h += `<h4>历史 <span class="num">${g.all.length}</span></h4><table class="hist">${[...g.all].reverse().map(x => `<tr><td class="num">${fmtD(x.date)}</td><td><span class="num">${x.value}</span> ${esc(x.unit)} ${labStatus(x).dir ? `<small style="color:var(--muted)">${labStatus(x).t}</small>` : ''}</td><td><button class="ib${armed('l' + x.id) ? ' arm' : ''}" data-act="ldel" data-id="${esc(x.id)}" data-w aria-label="删除这次记录">${armed('l' + x.id) ? '确认删除' : '×'}</button></td></tr>`).join('')}</table>`;
    h += `<div class="cacts">${l.part ? `<button class="btn ghost sm" data-act="part" data-id="${l.part}">查看${esc(PART[l.part].name)}</button>` : ''}<button class="btn primary sm" data-act="ladd" data-key="${esc(l.key)}" data-w>＋ 录入新数值</button></div>`;
  }
  el.innerHTML = h; el.hidden = false;
}

function renderAll() {
  SM = sevMap();
  renderPeople(); renderSide(); renderProfile(); renderZoneHud(); renderCard();
  if (typeof refresh3D === 'function') refresh3D();
}

/* ---------- selection ---------- */
function selectPart(id, side, extra) {
  if (!PART[id]) return;
  const p = PART[id];
  if (G.zone !== p.zone) setZone(p.zone, { noFly: true });
  ST.sel = { kind: 'part', id, side: side || '', ...(extra || {}) };
  flyTo(partCam(id, side));
  renderAll(); renderCallouts();
}
function selectLab(key) {
  const g = labGroups().find(x => x.latest.key === key); if (!g) return;
  const part = g.latest.part;
  if (part && G.zone !== PART[part].zone) setZone(PART[part].zone, { noFly: true });
  if (part) flyTo(partCam(part));
  ST.sel = { kind: 'lab', key, id: part || null };
  renderAll(); renderCallouts();
}
function clearSel() { ST.sel = null; renderAll(); renderCallouts(); }
function setZone(z, opts) {
  G.zone = z;
  if (ST.sel && ST.sel.id && PART[ST.sel.id] && z !== 'all' && PART[ST.sel.id].zone !== z) ST.sel = null;
  if (z === 'all') ST.sel = null;
  if (!(opts && opts.noFly)) flyTo(z === 'all' ? { ...OVERVIEW_CAM, yaw: 0 } : ZONES[z].cam);
  renderAll(); renderCallouts();
}
function partCam(id, side) {
  const p = PART[id], zc = ZONES[p.zone].cam, c = p.cam || {};
  let s = side;
  if (!s && p.pair && SM[id]) s = SM[id].R > SM[id].L ? 'R' : 'L';
  const yaw = c.yawL !== undefined ? (s === 'R' ? c.yawR : c.yawL) : (c.yaw ?? 0);
  // organs and facial features get a close-up centred on the part; hair and brain keep the head view
  const close = p.zone === 'organs' ? 0.3 : p.zone === 'head' && !['hair', 'brain'].includes(id) ? 0.22 : 0;
  return { y: c.y ?? (close ? p.a[1] : zc.y), h: c.h ?? (close || zc.h), yaw };
}

/* ---------- toast ---------- */
let toastT = 0;
function toast(t) { const el = $('toast'); el.textContent = t; el.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => el.hidden = true, 2600); }
