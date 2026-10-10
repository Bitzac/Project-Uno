// ---------- render & events ----------
const VIEWS = { overview: vOverview, ladder: vLadder, fourd: vFourD, evidence: vEvidence, quiz: vQuiz, history: vHistory, method: vMethod };

function renderAll() {
  const c = current();
  renderSide(c);
  $('navQuiz').textContent = `${QUESTIONS.filter(q => S.draft[q.id] != null).length}/${QUESTIONS.length}`;
  $('navHist').textContent = S.snaps.length + S.assess.length || '';
  const y = $('main').scrollTop;
  for (const [k, fn] of Object.entries(VIEWS)) {
    const el = $('v-' + k);
    // Only the visible view is rebuilt; hidden ones render when opened.
    if (k === S.view) el.innerHTML = fn(c);
    el.hidden = k !== S.view;
  }
  $('main').scrollTop = y;
}
function renderQuiz() { if (S.view === 'quiz') { const y = $('main').scrollTop; $('v-quiz').innerHTML = vQuiz(current()); $('main').scrollTop = y; } }

function go(view, push = true) {
  if (!VIEWS[view]) view = 'overview';
  S.view = view;
  document.querySelectorAll('#nav button').forEach(b => { if (b.dataset.v === view) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
  renderAll();
  $('main').scrollTop = 0;
  if (window.innerWidth <= 820) window.scrollTo(0, 0);
  if (push) { try { history.replaceState(null, '', '#' + view); } catch { /* sandboxed */ } }
  store.set('view', view);
}

document.addEventListener('click', e => {
  const nav = e.target.closest('#nav button');
  if (nav) return go(nav.dataset.v);
  const g = e.target.closest('[data-go]');
  if (g) return go(g.dataset.go);
  const opt = e.target.closest('.opts button');
  if (opt) {
    const q = opt.dataset.q, a = +opt.dataset.a;
    if (S.draft[q] === a) delete S.draft[q]; else S.draft[q] = a;
    store.set('draft', S.draft);
    opt.parentElement.querySelectorAll('button').forEach(b => b.setAttribute('aria-checked', String(S.draft[q] === +b.dataset.a)));
    $('navQuiz').textContent = `${QUESTIONS.filter(x => S.draft[x.id] != null).length}/${QUESTIONS.length}`;
    const bar = document.querySelector('.quizbar');
    if (bar) { const tmp = document.createElement('div'); tmp.innerHTML = vQuiz(current()); bar.replaceWith(tmp.querySelector('.quizbar')); }
    return;
  }
  const act = e.target.closest('[data-act]');
  if (act && act.dataset.act === 'save') return saveAssessment();
  if (act && act.dataset.act === 'clear') { S.draft = {}; store.set('draft', null); renderQuiz(); $('navQuiz').textContent = `0/${QUESTIONS.length}`; return; }
  const cp = e.target.closest('[data-copy]');
  if (cp) {
    const text = cp.dataset.copy;
    const done = () => toast('已复制：' + text);
    const fallback = () => { const code = cp.parentElement.querySelector('code'); const r = document.createRange(); r.selectNodeContents(code); const s = getSelection(); s.removeAllRanges(); s.addRange(r); toast('已选中，按 ⌘C / Ctrl+C 复制'); };
    try { navigator.clipboard.writeText(text).then(done, fallback); } catch { fallback(); }
  }
});

// keyboard: arrows move within a radio group
document.addEventListener('keydown', e => {
  const opt = e.target.closest && e.target.closest('.opts button');
  if (!opt || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
  const all = [...opt.parentElement.children], i = all.indexOf(opt);
  const n = all[(i + (e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? all.length - 1 : 1)) % all.length];
  n.focus(); e.preventDefault();
});

// tooltip
const tip = $('tip');
function showTip(el, x, y) {
  tip.innerHTML = `<b>${esc(el.getAttribute('data-tip-h'))}</b><span>${esc(el.getAttribute('data-tip'))}</span>`;
  tip.hidden = false;
  const w = tip.offsetWidth, h = tip.offsetHeight;
  let left = Math.min(Math.max(8, x + 14), innerWidth - w - 8), top = y + 16;
  if (top + h > innerHeight - 8) top = y - h - 12;
  tip.style.left = left + 'px'; tip.style.top = Math.max(8, top) + 'px';
}
document.addEventListener('pointermove', e => {
  const el = e.target.closest && e.target.closest('[data-tip]');
  if (el) showTip(el, e.clientX, e.clientY); else tip.hidden = true;
});
document.addEventListener('focusin', e => {
  const el = e.target.closest && e.target.closest('[data-tip]');
  if (el) { const r = el.getBoundingClientRect(); showTip(el, r.left + Math.min(r.width, 200) * .5, r.bottom - 6); } else tip.hidden = true;
});
$('main').addEventListener('scroll', () => { tip.hidden = true; }, { passive: true });

// boot
S.draft = store.get('draft') || {};
const start = (location.hash || '').slice(1) || store.get('view') || 'overview';
go(VIEWS[start] ? start : 'overview', false);
connect();
