// ---------- helpers ----------
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const today = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
function lsGet(k, d) { try { const v = JSON.parse(localStorage.getItem('cos.' + k)); return v ?? d; } catch { return d; } }
function lsSet(k, v) { try { localStorage.setItem('cos.' + k, JSON.stringify(v)); } catch { } }
function lsDel(k) { try { localStorage.removeItem('cos.' + k); } catch { } }
const newId = () => 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

const I = {
  chev: '<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m3 5 4 4 4-4"/></svg>',
  x: '<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="m3 3 8 8M11 3l-8 8"/></svg>',
  warn: '<svg viewBox="0 0 16 16" fill="none" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><circle cx="8" cy="8" r="6"/><path d="M8 5v3.5M8 11h.01"/></svg>',
  ext: '<svg viewBox="0 0 12 12" width="10" height="10" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="display:inline;vertical-align:-1px"><path d="M5 2H2v8h8V7M7 2h3v3M10 2 5.5 6.5"/></svg>'
};

// ---------- capability modules ----------
// Live modules attach their api ({ render, steps, phases }) from their own file; the rest are placeholders.
const MODULES = [
  { id: 'fund', name: '融资能力', sub: '中国大陆', live: true },
  { id: 'product', name: '产品能力', sub: '想法到 PMF · 中国上线', live: true },
  { id: 'growth', name: '增长获客', sub: '规划中' },
  { id: 'team', name: '团队与组织', sub: '规划中' },
  { id: 'legal', name: '法务合规', sub: '规划中' },
  { id: 'finance', name: '财务管理', sub: '规划中' }
];

// ---------- state ----------
const UI0 = lsGet('ui', {});
const S = { mod: MODULES.some(m => m.live && m.id === UI0.mod) ? UI0.mod : 'fund', tab: UI0.tab || 'overview', ptab: UI0.ptab || 'overview', pid: UI0.pid || BUILTIN[0].id, gov: !!UI0.gov, usd: !!UI0.usd, open: {} };
// Per-project records. Every collection lives at projects/{pid}/{collection}/{docId}.
const COLS = ['steps', 'targets', 'metrics', 'cohorts', 'surveys', 'meta'];
const emptyProg = () => Object.fromEntries(COLS.map(c => [c, {}]));
let mode = 'init', DB = null, RO = false, UNSUB = [], CUSTOM = [], PROG = emptyProg(), pendingRender = false;
const saveUI = () => lsSet('ui', { mod: S.mod, tab: S.tab, ptab: S.ptab, pid: S.pid, gov: S.gov, usd: S.usd });
const allProjects = () => [...BUILTIN, ...CUSTOM];
const curProj = () => allProjects().find(p => p.id === S.pid) || BUILTIN[0];
const byOrder = (a, b) => (a.order ?? 99) - (b.order ?? 99) || String(a.name).localeCompare(String(b.name), 'zh');

function cleanProj(p) {
  if (!p || typeof p !== 'object' || !p.id || !p.name) return null;
  return { id: String(p.id), name: String(p.name).slice(0, 16), sector: SECTORS[p.sector] ? p.sector : 'saas', stage: ROUND_IDS.includes(p.stage) ? p.stage : 'seed', note: String(p.note || '').slice(0, 200), order: Number.isFinite(p.order) ? p.order : 99, custom: true };
}
const TARGET_STATUS = ['target', 'contact', 'meet1', 'meet2', 'ts', 'dd', 'closed', 'pass'];
const nn = v => v === '' || v == null || !Number.isFinite(+v) || +v < 0 ? null : +v;
const txt = (v, n) => String(v || '').slice(0, n);
function cleanRec(c, d) {
  if (!d || typeof d !== 'object') return null;
  const at = txt(d.at, 10);
  if (c === 'steps') return { done: !!d.done, note: txt(d.note, 1000), at };
  if (c === 'targets') return TARGET_STATUS.includes(d.status) ? { status: d.status, note: txt(d.note, 1000), at } : null;
  if (c === 'metrics') return { wau: nn(d.wau), newUsers: nn(d.newUsers), payers: nn(d.payers), revenue: nn(d.revenue), note: txt(d.note, 200), at };
  if (c === 'cohorts') { const size = nn(d.size); return size ? { size, w1: nn(d.w1), w4: nn(d.w4), w12: nn(d.w12), w24: nn(d.w24), at } : null; }
  if (c === 'surveys') {
    if (d.type === 'pmf') { const n = nn(d.n); return n ? { type: 'pmf', n, very: Math.min(nn(d.very) ?? 0, n), date: txt(d.date, 10), at } : null; }
    if (d.type === 'nps') { const p = nn(d.promoters) ?? 0, q = nn(d.passives) ?? 0, r = nn(d.detractors) ?? 0; return p + q + r ? { type: 'nps', promoters: p, passives: q, detractors: r, date: txt(d.date, 10), at } : null; }
    return null;
  }
  if (c === 'meta') return { category: txt(d.category, 20), at };
  return null;
}

// ---------- progress helpers (used by every view) ----------
// Each live module owns a list of phases and steps; step ids are unique across modules (build.mjs checks it).
const modSteps = (mod = 'fund') => mod === 'product' ? PD_STEPS : STEPS;
const modPhases = (mod = 'fund') => mod === 'product' ? PD_PHASES : PHASES;
const stepMeta = sid => STEP_BY_ID[sid] || PD_STEP_BY_ID[sid];
const stepRec = sid => PROG.steps[sid];
const stepDone = sid => { const r = stepRec(sid); return r ? r.done : !!(stepMeta(sid) && stepMeta(sid).pre); };
const stepNote = sid => (stepRec(sid) || {}).note || '';
const stepVisible = st => (!st.br || (st.br === 'gov' && S.gov) || (st.br === 'usd' && S.usd)) && (!st.only || st.only.includes(curProj().sector));
const visibleSteps = (mod = 'fund') => modSteps(mod).filter(stepVisible);
function progressOf(mod = 'fund') {
  const vs = visibleSteps(mod), done = vs.filter(s => stepDone(s.id)).length;
  return { done, total: vs.length, pct: vs.length ? done / vs.length : 0 };
}
function currentPhase(mod = 'fund') {
  const ph = modPhases(mod), first = visibleSteps(mod).find(s => !stepDone(s.id));
  return first ? ph.find(p => p.id === first.ph) : ph[ph.length - 1];
}
const recs = c => Object.entries(PROG[c] || {}).map(([id, r]) => ({ id, ...r }));

// ---------- data layer: cloud db when available, this browser otherwise ----------
const lsProgKey = pid => 'prog.' + pid;
function loadLocal() {
  CUSTOM = (lsGet('custom', []) || []).map(cleanProj).filter(Boolean).sort(byOrder);
  if (!allProjects().some(p => p.id === S.pid)) S.pid = BUILTIN[0].id;
  loadLocalProg();
}
function loadLocalProg() {
  const raw = lsGet(lsProgKey(S.pid), {}) || {};
  PROG = emptyProg();
  for (const c of COLS) for (const [k, v] of Object.entries(raw[c] || {})) { const r = cleanRec(c, v); if (r) PROG[c][k] = r; }
}
const saveLocalProg = pid => lsSet(lsProgKey(pid), PROG);

function setSync(text, cls) { const el = $('sync'); el.className = 'sync ' + (cls || ''); el.querySelector('span').textContent = text; }
function setRO() {
  if (RO) return; RO = true; document.body.classList.add('ro');
  setSync('只读 · 你没有修改权限', 'ro');
}
function onDbError(e) {
  if (e && e.code === 'invalid_argument') { setRO(); toast('你只有查看权限，修改没有保存'); return; }
  if (e && e.code === 'quota_exceeded') { toast('云端存储已满，删除一些记录后再试'); return; }
  setSync('同步中断，显示最后一次数据', 'local');
}

async function connect() {
  let db = null;
  try { db = window.claude && window.claude.use ? await window.claude.use('db') : null; } catch { db = null; }
  if (!db) { mode = 'local'; loadLocal(); setSync('本地模式 · 只保存在此浏览器', 'local'); render(); return; }
  DB = db; mode = 'db'; setSync('已同步到云端');
  try {
    const u = await window.claude.use('user');
    if (u && u.can && (await u.can('data.write')) === false) setRO();
  } catch { }
  DB.collection('projects').onSnapshot(s => {
    CUSTOM = s.docs.map(d => cleanProj({ id: d.id, ...d.data() })).filter(Boolean).sort(byOrder);
    if (!allProjects().some(p => p.id === S.pid)) { S.pid = BUILTIN[0].id; saveUI(); subscribeProg(); }
    render();
  }, onDbError);
  subscribeProg();
  render();
}
function subscribeProg() {
  UNSUB.forEach(u => u()); UNSUB = [];
  PROG = emptyProg();
  if (mode === 'local') { loadLocalProg(); return; }
  if (mode !== 'db') return;
  const pid = S.pid;
  for (const c of COLS) UNSUB.push(DB.collection(`projects/${pid}/${c}`).onSnapshot(s => {
    if (pid !== S.pid) return;
    const o = {};
    for (const d of s.docs) { const r = cleanRec(c, d.data()); if (r) o[d.id] = r; }
    PROG[c] = o; render();
  }, onDbError));
}

// One write at a time per document; later writes wait for earlier ones.
// A rejected write puts the record back the way it was, so the page never shows unsaved data.
const chains = {};
function queueWrite(path, fn, revert) {
  const p = (chains[path] || Promise.resolve()).then(fn, fn).catch(e => { onDbError(e); if (revert) { revert(); render(); } });
  chains[path] = p; return p;
}
function revertRec(pid, c, id, prev) {
  return () => { if (pid !== S.pid) return; const t = { ...PROG[c] }; if (prev) t[id] = prev; else delete t[id]; PROG[c] = t; };
}
function canWrite() {
  if (RO) { toast('你只有查看权限'); return false; }
  if (mode === 'init') { toast('正在连接数据，请稍候再试'); return false; }
  return true;
}
function setStep(sid, patch) {
  if (!canWrite()) return false;
  const pid = S.pid, prev = stepRec(sid), cur = prev || { done: stepDone(sid), note: '' };
  const next = { done: !!cur.done, note: cur.note || '', ...patch, at: today() };
  PROG.steps = { ...PROG.steps, [sid]: next };
  if (mode === 'db') queueWrite(`projects/${pid}/steps/${sid}`, () => DB.doc(`projects/${pid}/steps/${sid}`).set(next), revertRec(pid, 'steps', sid, prev));
  else saveLocalProg(pid);
  return true;
}
function setTarget(iid, patch) {
  if (!canWrite()) return false;
  const pid = S.pid, path = `projects/${pid}/targets/${iid}`, t = { ...PROG.targets }, undo = revertRec(pid, 'targets', iid, t[iid]);
  if (patch === null) { delete t[iid]; PROG.targets = t; if (mode === 'db') queueWrite(path, () => DB.doc(path).delete(), undo); else saveLocalProg(pid); return true; }
  const next = { status: 'target', note: '', ...(t[iid] || {}), ...patch, at: today() };
  t[iid] = next; PROG.targets = t;
  if (mode === 'db') queueWrite(path, () => DB.doc(path).set(next), undo); else saveLocalProg(pid);
  return true;
}
// Generic record write for metrics / cohorts / surveys / meta; null deletes.
function setRec(c, id, body) {
  if (!canWrite()) return false;
  const pid = S.pid, path = `projects/${pid}/${c}/${id}`, t = { ...PROG[c] }, undo = revertRec(pid, c, id, t[id]);
  if (body === null) { delete t[id]; PROG[c] = t; if (mode === 'db') queueWrite(path, () => DB.doc(path).delete(), undo); else saveLocalProg(pid); return true; }
  const next = cleanRec(c, { ...body, at: today() });
  if (!next) { toast('数据不完整，没有保存'); return false; }
  t[id] = next; PROG[c] = t;
  if (mode === 'db') queueWrite(path, () => DB.doc(path).set(next), undo); else saveLocalProg(pid);
  return true;
}
// Step notes save 700 ms after the last keystroke. Switching project saves pending notes first, so they never land in another project.
const pendingNotes = {};
function queueNote(sid, v) {
  if (pendingNotes[sid]) clearTimeout(pendingNotes[sid].t);
  pendingNotes[sid] = { v, t: setTimeout(() => saveNote(sid), 700) };
}
function saveNote(sid) {
  const p = pendingNotes[sid]; if (!p) return;
  clearTimeout(p.t); delete pendingNotes[sid];
  if (p.v !== stepNote(sid)) setStep(sid, { note: p.v });
}
const flushNotes = () => Object.keys(pendingNotes).forEach(saveNote);
const dropNotes = () => Object.keys(pendingNotes).forEach(k => { clearTimeout(pendingNotes[k].t); delete pendingNotes[k]; });

async function addProject(o) {
  if (!canWrite()) return;
  const body = { name: o.name, sector: o.sector, stage: o.stage, note: o.note, order: 10 + CUSTOM.length };
  if (mode === 'db') {
    const r = DB.collection('projects').doc();
    try { await r.set(body); } catch (e) { onDbError(e); return; }
    switchProject(r.id);
  } else {
    const p = cleanProj({ id: newId(), ...body });
    CUSTOM = [...CUSTOM, p].sort(byOrder); lsSet('custom', CUSTOM.map(({ custom, ...r }) => r));
    switchProject(p.id);
  }
  toast('已新增项目「' + o.name + '」');
}
async function deleteProject(pid) {
  if (!canWrite()) return;
  const p = CUSTOM.find(x => x.id === pid); if (!p) return;
  if (pid === S.pid) dropNotes();
  if (mode === 'db') {
    try {
      for (const c of COLS) { const s = await DB.collection(`projects/${pid}/${c}`).get(); for (const d of s.docs) await DB.doc(`projects/${pid}/${c}/${d.id}`).delete(); }
      await DB.doc('projects/' + pid).delete();
    } catch (e) { onDbError(e); return; }
  } else {
    CUSTOM = CUSTOM.filter(x => x.id !== pid); lsSet('custom', CUSTOM.map(({ custom, ...r }) => r)); lsDel(lsProgKey(pid));
  }
  switchProject(BUILTIN[0].id);
  toast('已删除项目「' + p.name + '」');
}
function switchProject(pid) {
  if (pid === S.pid) { render(); return; }
  flushNotes();
  S.pid = pid; S.open = {}; S.armDel = null; saveUI(); subscribeProg(); render();
}

// ---------- render shell ----------
function render() {
  // Don't rebuild the view under the viewer's cursor while they are typing a note.
  const a = document.activeElement;
  if (a && $('main').contains(a) && (a.tagName === 'TEXTAREA' || (a.tagName === 'INPUT' && !['checkbox', 'radio', 'button', 'submit'].includes(a.type)))) { pendingRender = true; return; }
  pendingRender = false;
  renderProjs(); renderRail();
  const m = MODULES.find(x => x.id === S.mod);
  if (m && m.live && m.api) m.api.render($('main'));
  else $('main').innerHTML = `<section class="view planned-v"><h1>${esc(m ? m.name : '')}</h1><p>这个能力模块还在规划中。</p></section>`;
}
function renderProjs() {
  $('projs').innerHTML = allProjects().map(p => `<button role="tab" aria-selected="${p.id === S.pid}" data-act="proj" data-id="${esc(p.id)}">${esc(p.short || p.name)}</button>`).join('')
    + `<button class="add" data-act="newproj" data-w aria-label="新增项目">＋ 新增</button>`;
}
function renderRail() {
  $('rail').innerHTML = `<h2>能力模块</h2>` + MODULES.map(m => { const pr = m.live ? progressOf(m.id) : null; return m.live
    ? `<button class="mod" aria-current="${S.mod === m.id}" data-act="mod" data-id="${m.id}"><b>${esc(m.name)}</b><span class="pct num">${Math.round(pr.pct * 100)}%</span><small>${esc(m.sub)}</small><span class="bar"><i style="width:${(pr.pct * 100).toFixed(1)}%"></i></span></button>`
    : `<div class="mod planned" aria-disabled="true"><b>${esc(m.name)}</b><small>${esc(m.sub)}</small></div>`; }).join('')
    + `<div class="sep"></div><p class="note">按能力分模块构建。每个模块对你的每个项目单独记录进度。</p>`;
}

// ---------- sheet, toast, tooltip ----------
function openSheet(html) {
  const sh = $('sheet'); sh.innerHTML = html; sh.classList.add('on'); sh.setAttribute('aria-hidden', 'false'); $('scrim').classList.add('on');
  sh.scrollTop = 0; const x = sh.querySelector('.x'); if (x) x.focus();
}
function closeSheet() { $('sheet').classList.remove('on'); $('sheet').setAttribute('aria-hidden', 'true'); $('scrim').classList.remove('on'); }
function toast(msg) {
  const t = $('toast'); t.textContent = msg; t.classList.add('on');
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 2600);
}
function showTip(el, x, y) {
  const tip = $('tip'), [head, ...rest] = String(el.dataset.tip).split('\n');
  tip.textContent = '';
  const b = document.createElement('b'); b.textContent = head; tip.appendChild(b);
  if (rest.length) { const s = document.createElement('span'); s.textContent = rest.join(' · '); tip.appendChild(s); }
  tip.classList.add('on');
  const r = tip.getBoundingClientRect(), W = innerWidth, H = innerHeight;
  let left = x + 14, top = y + 14;
  if (left + r.width > W - 12) left = Math.max(12, x - r.width - 14);
  if (top + r.height > H - 12) top = Math.max(12, y - r.height - 14);
  tip.style.left = left + 'px'; tip.style.top = top + 'px';
}
const hideTip = () => $('tip').classList.remove('on');

// ---------- events ----------
const ACT = {
  proj: el => switchProject(el.dataset.id),
  mod: el => { S.mod = el.dataset.id; saveUI(); render(); $('main').scrollTop = 0; },
  newproj: () => Fund.projectForm(),
  close: () => closeSheet()
};
function bind() {
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-act]'); if (!el) return;
    const fn = ACT[el.dataset.act]; if (fn) { e.preventDefault(); fn(el, e); }
  });
  document.addEventListener('change', e => { const el = e.target.closest('[data-chg]'); if (el && ACT[el.dataset.chg]) ACT[el.dataset.chg](el, e); });
  document.addEventListener('input', e => { const el = e.target.closest('[data-inp]'); if (el && ACT[el.dataset.inp]) ACT[el.dataset.inp](el, e); });
  // Submitting with Enter leaves focus in a field, which would hold the re-render; release it first.
  document.addEventListener('submit', e => { const el = e.target.closest('[data-sub]'); if (el && ACT[el.dataset.sub]) { e.preventDefault(); if (el.contains(document.activeElement)) document.activeElement.blur(); ACT[el.dataset.sub](el, e); } });
  // A render held while typing runs once focus leaves the field, but never between pointerdown and click, or it would swallow that click.
  let ptrDown = false;
  const ptrUp = () => { ptrDown = false; setTimeout(() => { if (pendingRender) render(); }, 0); };
  document.addEventListener('pointerdown', () => { ptrDown = true; }, true);
  document.addEventListener('pointerup', ptrUp, true);
  document.addEventListener('pointercancel', ptrUp, true);
  document.addEventListener('focusout', () => setTimeout(() => { if (pendingRender && !ptrDown) render(); }, 0));
  $('scrim').addEventListener('click', closeSheet);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && $('sheet').classList.contains('on')) closeSheet(); });
  document.addEventListener('pointermove', e => { const el = e.target.closest && e.target.closest('[data-tip]'); if (el) showTip(el, e.clientX, e.clientY); else hideTip(); });
  document.addEventListener('focusin', e => { const el = e.target.closest && e.target.closest('[data-tip]'); if (el) { const r = el.getBoundingClientRect(); showTip(el, r.left + r.width / 2, r.bottom); } });
  document.addEventListener('focusout', e => { if (e.target.closest && e.target.closest('[data-tip]')) hideTip(); });
  $('main').addEventListener('scroll', hideTip, { passive: true });
}
