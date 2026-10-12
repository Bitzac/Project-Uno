// ---------- state & helpers ----------
const S = { snaps: [], assess: [], view: 'overview', draft: {}, db: null, canWrite: null, status: 'loading', saving: false };
const $ = id => document.getElementById(id);
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const mean = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;
const r0 = v => v == null ? '—' : Math.round(v);
const fmt = n => n == null ? '—' : Number(n).toLocaleString('zh-CN');
const fmtTok = n => n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? Math.round(n / 1e3) + 'K' : String(n || 0);
const store = {
  get(k) { try { return JSON.parse(localStorage.getItem('aios.' + k)); } catch { return null; } },
  set(k, v) { try { localStorage.setItem('aios.' + k, JSON.stringify(v)); } catch { /* storage unavailable */ } },
};

// ---------- scoring ----------
const targetOf = (ind, m) => typeof ind.target === 'string' ? m[ind.target] : ind.target;
function scoreSnap(snap) {
  const m = snap.metrics;
  const ind = IND.map(i => {
    const tgt = targetOf(i, m), value = m[i.id] ?? 0;
    return { ...i, value, tgt, score: tgt ? Math.max(0, Math.min(100, value / tgt * 100)) : 0 };
  });
  const dimEv = id => mean(ind.filter(i => i.dim === id).map(i => i.score));
  const dims = DIMS.map(d => ({ ...d, ev: dimEv(d.id) }));
  const ds = FOURD.map(d => ({ ...d, ev: mean(ind.filter(i => i.d === d.id).map(i => i.score)) }));
  return { m, ind, dims, ds, total: mean(dims.map(d => d.ev)) };
}
function scoreSelf(answers) {
  if (!answers) return null;
  const val = q => answers[q.id] == null ? null : answers[q.id] / 3 * 100;
  const pick = f => mean(QUESTIONS.filter(f).map(val).filter(v => v != null));
  const n = QUESTIONS.filter(q => answers[q.id] != null).length;
  return {
    n, complete: n === QUESTIONS.length,
    total: pick(() => true),
    dims: Object.fromEntries(DIMS.map(d => [d.id, pick(q => q.dim === d.id)])),
    ds: Object.fromEntries(FOURD.map(d => [d.id, pick(q => q.d === d.id)])),
  };
}
// Evidence total if one indicator reached its target.
function gainOf(snap, id) {
  const base = scoreSnap(snap).total;
  const i = IND.find(x => x.id === id);
  const m2 = { ...snap.metrics, [id]: targetOf(i, snap.metrics) };
  return scoreSnap({ ...snap, metrics: m2 }).total - base;
}
function ladderOf(m, answers) {
  let level = 0;
  const steps = LADDER.map(st => {
    const checks = st.checks.map(c => ({ t: c.t, ok: c.f(m, answers), v: c.v(m, answers) }));
    const passed = checks.filter(c => c.ok === true).length;
    const done = passed >= (st.need || checks.length);
    return { ...st, checks, passed, done };
  });
  for (const st of steps) { if (st.done) level = st.n; else break; }
  return { level, steps, next: steps.find(s => s.n === level + 1) || null };
}

// One evaluation of the current state: latest snapshot + latest assessment.
function current() {
  const snap = S.snaps.at(-1);
  if (!snap) return null;
  const ev = scoreSnap(snap);
  const a = S.assess.at(-1) || null;
  const self = scoreSelf(a && a.answers);
  const lad = ladderOf(snap.metrics, a && a.answers);
  const combined = self && self.total != null ? 0.6 * ev.total + 0.4 * self.total : ev.total;
  return { snap, ev, a, self, lad, combined };
}
const statusOf = s => s >= 80 ? ['good', '✓', '强项'] : s >= 60 ? ['warn', '!', '合格'] : s >= 40 ? ['serious', '!', '偏弱'] : ['crit', '✕', '短板'];
const chipStatus = s => { const [c, g, l] = statusOf(s); return `<span class="chip"><span class="st ${c}">${g}</span>${l}</span>`; };

// ---------- data ----------
async function connect() {
  const C = window.claude;
  if (!C || typeof C.use !== 'function') { S.status = 'offline'; renderAll(); return; }
  const [db, user] = await Promise.all([C.use('db'), C.use('user')]);
  if (!db) { S.status = 'offline'; renderAll(); return; }
  S.db = db;
  if (user) {
    try { S.canWrite = await user.isOwner() || await user.can('data.write'); } catch { S.canWrite = null; }
  }
  const fail = e => { S.status = e && e.code === 'revoked' ? 'offline' : 'error'; renderAll(); };
  db.collection('snapshots').orderBy('date', 'asc').onSnapshot(q => {
    S.snaps = q.docs.map(d => d.data()).filter(d => d && d.metrics);
    S.status = S.snaps.length ? 'ready' : 'empty';
    renderAll();
  }, fail);
  db.collection('assessments').orderBy('at', 'asc').onSnapshot(q => {
    S.assess = q.docs.map(d => ({ id: d.id, ...d.data() })).filter(d => d.answers);
    if (!Object.keys(S.draft).length && S.assess.length) S.draft = { ...S.assess.at(-1).answers };
    renderAll();
  }, fail);
}

async function saveAssessment() {
  if (!S.db || S.saving) return;
  S.saving = true; renderQuiz();
  const at = new Date().toISOString();
  const id = at.replace(/[:.]/g, '-');
  try {
    await S.db.collection('assessments').doc(id).set({ at, answers: { ...S.draft }, v: 1 });
    store.set('draft', null);
    toast('已保存自评，总览和 4D 已更新');
  } catch (e) {
    S.canWrite = e && e.code === 'invalid_argument' ? false : S.canWrite;
    toast(e && e.code === 'invalid_argument' ? '没有保存权限：只有页面所有者能保存自评' : '保存失败，请稍后再试');
  } finally { S.saving = false; renderAll(); }
}

let toastT;
function toast(msg) {
  const t = $('toast');
  t.textContent = msg; t.hidden = false;
  clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, 2600);
}
