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
// Only `fund` is built in v1; the rest are placeholders so the system's shape is visible.
const MODULES = [
  { id: 'fund', name: '融资能力', sub: '中国大陆 · v1', live: true },
  { id: 'product', name: '产品能力', sub: '规划中' },
  { id: 'growth', name: '增长获客', sub: '规划中' },
  { id: 'team', name: '团队与组织', sub: '规划中' },
  { id: 'legal', name: '法务合规', sub: '规划中' },
  { id: 'finance', name: '财务管理', sub: '规划中' }
];

// ---------- state ----------
const UI0 = lsGet('ui', {});
const S = { mod: 'fund', tab: UI0.tab || 'overview', pid: UI0.pid || BUILTIN[0].id, gov: !!UI0.gov, usd: !!UI0.usd, open: {} };
let mode = 'init', DB = null, RO = false, UNSUB = [], CUSTOM = [], PROG = { steps: {}, targets: {} }, pendingRender = false;
const saveUI = () => lsSet('ui', { tab: S.tab, pid: S.pid, gov: S.gov, usd: S.usd });
const allProjects = () => [...BUILTIN, ...CUSTOM];
const curProj = () => allProjects().find(p => p.id === S.pid) || BUILTIN[0];
const byOrder = (a, b) => (a.order ?? 99) - (b.order ?? 99) || String(a.name).localeCompare(String(b.name), 'zh');

function cleanProj(p) {
  if (!p || typeof p !== 'object' || !p.id || !p.name) return null;
  return { id: String(p.id), name: String(p.name).slice(0, 16), sector: SECTORS[p.sector] ? p.sector : 'saas', stage: ROUND_IDS.includes(p.stage) ? p.stage : 'seed', note: String(p.note || '').slice(0, 200), order: Number.isFinite(p.order) ? p.order : 99, custom: true };
}
const TARGET_STATUS = ['target', 'contact', 'meet1', 'meet2', 'ts', 'dd', 'closed', 'pass'];
function cleanRec(c, d) {
  if (!d || typeof d !== 'object') return null;
  if (c === 'steps') return { done: !!d.done, note: String(d.note || '').slice(0, 1000), at: String(d.at || '') };
  return TARGET_STATUS.includes(d.status) ? { status: d.status, note: String(d.note || '').slice(0, 1000), at: String(d.at || '') } : null;
}

// ---------- progress helpers (used by every view) ----------
const stepRec = sid => PROG.steps[sid];
const stepDone = sid => { const r = stepRec(sid); return r ? r.done : !!(STEP_BY_ID[sid] && STEP_BY_ID[sid].pre); };
const stepNote = sid => (stepRec(sid) || {}).note || '';
const stepVisible = st => (!st.br || (st.br === 'gov' && S.gov) || (st.br === 'usd' && S.usd)) && (!st.only || st.only.includes(curProj().sector));
const visibleSteps = () => STEPS.filter(stepVisible);
function progressOf() {
  const vs = visibleSteps(), done = vs.filter(s => stepDone(s.id)).length;
  return { done, total: vs.length, pct: vs.length ? done / vs.length : 0 };
}
function currentPhase() {
  const first = visibleSteps().find(s => !stepDone(s.id));
  return first ? PHASES.find(p => p.id === first.ph) : PHASES[PHASES.length - 1];
}

// ---------- data layer: cloud db when available, this browser otherwise ----------
const lsProgKey = pid => 'prog.' + pid;
function loadLocal() {
  CUSTOM = (lsGet('custom', []) || []).map(cleanProj).filter(Boolean).sort(byOrder);
  if (!allProjects().some(p => p.id === S.pid)) S.pid = BUILTIN[0].id;
  loadLocalProg();
}
function loadLocalProg() {
  const raw = lsGet(lsProgKey(S.pid), {}) || {};
  PROG = { steps: {}, targets: {} };
  for (const c of ['steps', 'targets']) for (const [k, v] of Object.entries(raw[c] || {})) { const r = cleanRec(c, v); if (r) PROG[c][k] = r; }
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
  PROG = { steps: {}, targets: {} };
  if (mode === 'local') { loadLocalProg(); return; }
  if (mode !== 'db') return;
  const pid = S.pid;
  for (const c of ['steps', 'targets']) UNSUB.push(DB.collection(`projects/${pid}/${c}`).onSnapshot(s => {
    if (pid !== S.pid) return;
    const o = {};
    for (const d of s.docs) { const r = cleanRec(c, d.data()); if (r) o[d.id] = r; }
    PROG[c] = o; render();
  }, onDbError));
}

// One write at a time per document; later writes wait for earlier ones.
const chains = {};
function queueWrite(path, fn) {
  const p = (chains[path] || Promise.resolve()).then(fn, fn).catch(onDbError);
  chains[path] = p; return p;
}
function canWrite() {
  if (RO) { toast('你只有查看权限'); return false; }
  if (mode === 'init') { toast('正在连接数据，请稍候再试'); return false; }
  return true;
}
function setStep(sid, patch) {
  if (!canWrite()) return false;
  const pid = S.pid, cur = stepRec(sid) || { done: stepDone(sid), note: '' };
  const next = { done: !!cur.done, note: cur.note || '', ...patch, at: today() };
  PROG.steps = { ...PROG.steps, [sid]: next };
  if (mode === 'db') queueWrite(`projects/${pid}/steps/${sid}`, () => DB.doc(`projects/${pid}/steps/${sid}`).set(next));
  else saveLocalProg(pid);
  return true;
}
function setTarget(iid, patch) {
  if (!canWrite()) return false;
  const pid = S.pid, path = `projects/${pid}/targets/${iid}`, t = { ...PROG.targets };
  if (patch === null) { delete t[iid]; PROG.targets = t; if (mode === 'db') queueWrite(path, () => DB.doc(path).delete()); else saveLocalProg(pid); return true; }
  const next = { status: 'target', note: '', ...(t[iid] || {}), ...patch, at: today() };
  t[iid] = next; PROG.targets = t;
  if (mode === 'db') queueWrite(path, () => DB.doc(path).set(next)); else saveLocalProg(pid);
  return true;
}
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
  if (mode === 'db') {
    try {
      for (const c of ['steps', 'targets']) { const s = await DB.collection(`projects/${pid}/${c}`).get(); for (const d of s.docs) await DB.doc(`projects/${pid}/${c}/${d.id}`).delete(); }
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
  S.pid = pid; S.open = {}; saveUI(); subscribeProg(); render();
}

// ---------- render shell ----------
function render() {
  // Don't rebuild the view under the viewer's cursor while they are typing a note.
  const a = document.activeElement;
  if (a && $('main').contains(a) && (a.tagName === 'TEXTAREA' || (a.tagName === 'INPUT' && a.type === 'text'))) { pendingRender = true; return; }
  pendingRender = false;
  renderProjs(); renderRail();
  const m = MODULES.find(x => x.id === S.mod);
  if (m && m.live) Fund.render($('main'));
  else $('main').innerHTML = `<section class="view planned-v"><h1>${esc(m ? m.name : '')}</h1><p>这个能力模块还在规划中。</p></section>`;
}
function renderProjs() {
  $('projs').innerHTML = allProjects().map(p => `<button role="tab" aria-selected="${p.id === S.pid}" data-act="proj" data-id="${esc(p.id)}">${esc(p.short || p.name)}</button>`).join('')
    + `<button class="add" data-act="newproj" data-w aria-label="新增项目">＋ 新增</button>`;
}
function renderRail() {
  const pr = progressOf();
  $('rail').innerHTML = `<h2>能力模块</h2>` + MODULES.map(m => m.live
    ? `<button class="mod" aria-current="${S.mod === m.id}" data-act="mod" data-id="${m.id}"><b>${esc(m.name)}</b><span class="pct num">${Math.round(pr.pct * 100)}%</span><small>${esc(m.sub)}</small><span class="bar"><i style="width:${(pr.pct * 100).toFixed(1)}%"></i></span></button>`
    : `<div class="mod planned" aria-disabled="true"><b>${esc(m.name)}</b><small>${esc(m.sub)}</small></div>`).join('')
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
  mod: el => { S.mod = el.dataset.id; render(); },
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
  document.addEventListener('submit', e => { const el = e.target.closest('[data-sub]'); if (el && ACT[el.dataset.sub]) { e.preventDefault(); ACT[el.dataset.sub](el, e); } });
  document.addEventListener('focusout', () => setTimeout(() => { if (pendingRender) render(); }, 0));
  $('scrim').addEventListener('click', closeSheet);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && $('sheet').classList.contains('on')) closeSheet(); });
  document.addEventListener('pointermove', e => { const el = e.target.closest && e.target.closest('[data-tip]'); if (el) showTip(el, e.clientX, e.clientY); else hideTip(); });
  document.addEventListener('focusin', e => { const el = e.target.closest && e.target.closest('[data-tip]'); if (el) { const r = el.getBoundingClientRect(); showTip(el, r.left + r.width / 2, r.bottom); } });
  document.addEventListener('focusout', e => { if (e.target.closest && e.target.closest('[data-tip]')) hideTip(); });
  $('main').addEventListener('scroll', hideTip, { passive: true });
}
