// ---------- helpers ----------
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const f1 = v => v.toFixed(1);
const r1 = v => Math.round(v * 10) / 10;
const minus = s => s.replace(/^-/, '−');
function lsGet(k, d) { try { const v = JSON.parse(localStorage.getItem('cr.' + k)); return v ?? d; } catch { return d; } }
function lsSet(k, v) { try { localStorage.setItem('cr.' + k, JSON.stringify(v)); } catch { } }
const clone = o => JSON.parse(JSON.stringify(o));
const N = C.length;

const I = {
  warn: '<svg viewBox="0 0 16 16" fill="none" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><path d="M8 2.5 14.5 13.5h-13z" stroke-linejoin="round"/><path d="M8 6.5v3M8 11.6h.01"/></svg>',
  x: '<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="m3 3 6 6M9 3 3 9"/></svg>'
};

// ---------- scoring ----------
// Indicator → 0–100 against its goalposts; dimension = mean of the indicators a country has data for; overall = mean of chosen dimensions.
const norm = (ind, v) => {
  if (v == null) return null;
  const t = ind.log ? (Math.log(v) - Math.log(ind.w)) / (Math.log(ind.b) - Math.log(ind.w)) : (v - ind.w) / (ind.b - ind.w);
  return Math.max(0, Math.min(1, t)) * 100;
};
const IS = {}, DS = {}, MISS = {};
D.forEach(d => {
  IS[d.id] = {}; DS[d.id] = {}; MISS[d.id] = {};
  d.ind.forEach(ind => { IS[d.id][ind.id] = Object.fromEntries(C.map(c => [c.id, norm(ind, ind.v[c.id])])); });
  C.forEach(c => {
    const xs = d.ind.map(ind => IS[d.id][ind.id][c.id]).filter(x => x != null);
    DS[d.id][c.id] = xs.reduce((s, x) => s + x, 0) / xs.length;
    MISS[d.id][c.id] = d.ind.length - xs.length;
  });
});
const byId = id => C.find(c => c.id === id);
const dimById = id => D.find(d => d.id === id);
const overall = (cid, dims) => dims.reduce((s, d) => s + DS[d.id][cid], 0) / dims.length;
const yrOf = (ind, cid) => (ind.yx && ind.yx[cid]) || ind.yr;
const better = (ind, a, b) => ind.b > ind.w ? a > b : a < b;
function fmtV(ind, v) {
  if (v == null) return '—';
  let dp = ind.dp;
  if (v !== 0 && Math.abs(v) < 0.1 && dp < 2) dp = 2;
  const s = v.toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp });
  return minus((ind.sign && v > 0 ? '+' : '') + s);
}
// Value with its unit as running text reads it ("82.0 岁", "第 13 名"); index scales carry no unit.
function valTxt(ind, v) {
  if (ind.id === 'uni') return `第 ${fmtV(ind, v)} 名`;
  if (/^\d|=/.test(ind.unit)) return fmtV(ind, v);
  if (ind.unit === '%') return fmtV(ind, v) + '%';
  return `${fmtV(ind, v)} ${ind.unit}`;
}
const rankDim = (dId, cid) => 1 + C.filter(c => DS[dId][c.id] > DS[dId][cid]).length;
function rankInd(ind, cid) {
  const v = ind.v[cid]; if (v == null) return null;
  return 1 + C.filter(c => ind.v[c.id] != null && better(ind, ind.v[c.id], v)).length;
}
const withData = ind => C.filter(c => ind.v[c.id] != null).length;

// ---------- state ----------
const VIEWS = ['overview', 'dims', 'ideal', 'method'];
const SHAPE = ['circle', 'square', 'triangle', 'diamond'];
const S = {
  view: 'overview',
  cmp: lsGet('cmp', ['cn', 'us', 'nz', 'de']),
  dims: lsGet('dims', D.map(d => d.id)).filter(id => dimById(id)),
  showIdeal: lsGet('showIdeal', false),
  dim: 'health',
  sort: 'all',
  region: lsGet('region', 'all'),
  pair: lsGet('pair', ['cn', 'de']),
  ideal: lsGet('ideal', null)
};
S.cmp = [0, 1, 2, 3].map(k => (S.cmp && byId(S.cmp[k]) && S.cmp.indexOf(S.cmp[k]) === k) ? S.cmp[k] : null);
if (!S.cmp.some(Boolean)) S.cmp = ['cn', 'us', 'nz', 'de'];
if (S.dims.length < 3) S.dims = D.map(d => d.id);
if (!S.ideal || !S.ideal.imp || !S.ideal.tgt || D.some(d => S.ideal.imp[d.id] == null || S.ideal.tgt[d.id] == null)) S.ideal = { ...clone(DEFAULT_IDEAL), answers: {}, example: true };
S.ideal.answers = S.ideal.answers || {};
if (!Array.isArray(S.pair) || S.pair.length !== 2 || !S.pair.every(byId) || S.pair[0] === S.pair[1]) S.pair = ['cn', 'de'];
const saveIdeal = () => lsSet('ideal', S.ideal);
if (S.region !== 'all' && S.region !== 'cmp' && !REGIONS.includes(S.region)) S.region = 'all';

// A compared country keeps its slot (color + marker shape) for as long as it stays compared; removing one never repaints the others.
const slotOf = id => S.cmp.indexOf(id);
const compared = () => S.cmp.map((id, k) => id ? { c: byId(id), k } : null).filter(Boolean);
const sc = id => { const k = slotOf(id); return k >= 0 ? 's' + k : ''; };
const mk = c => { const k = slotOf(c.id); return k >= 0 ? `<i class="mk ${SHAPE[k]} s${k}" aria-hidden="true"></i>` : '<i class="mk none" aria-hidden="true"></i>'; };

// Region filter: narrows the long lists (ranking, heat table, shape wall, dimension table, matches). Ranks stay global.
const inRegion = c => S.region === 'all' || (S.region === 'cmp' ? slotOf(c.id) >= 0 : c.region === S.region);
const withRank = list => list.map((x, i) => ({ ...x, rank: i + 1 })).filter(x => inRegion(x.c));
const regionChips = () => `<div class="ctl-row filter"><span>范围</span><div class="chips" role="radiogroup" aria-label="按地区筛选">${[['all', `全部 ${N}`], ...REGIONS.map(rg => [rg, `${rg} ${C.filter(c => c.region === rg).length}`]), ['cmp', `对比中 ${compared().length}`]].map(([v, t]) => `<button class="chip" role="radio" aria-checked="${S.region === v}" data-region="${v}">${t}</button>`).join('')}</div></div>`;

const toastEl = $('#toast');
function toast(msg) { toastEl.textContent = msg; toastEl.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => toastEl.classList.remove('on'), 2600); }
function toggleCmp(id) {
  const k = slotOf(id);
  if (k >= 0) {
    if (compared().length <= 1) return toast('至少保留 1 个对比国家');
    S.cmp[k] = null;
  } else {
    const free = S.cmp.indexOf(null);
    if (free < 0) return toast('最多同时对比 4 个国家，先取消一个');
    S.cmp[free] = id;
  }
  lsSet('cmp', S.cmp);
  rerender();
}

// ---------- match ----------
// fit = 100 × (1 − √(Σ w·gap² / Σ w·t²)), gap = max(0, target − score). Exceeding a target earns nothing; one big gap hurts more than several small ones.
function match(cid, ideal = S.ideal) {
  let num = 0, den = 0, ws = 0, wsum = 0;
  const gaps = [];
  D.forEach(d => {
    const w = ideal.imp[d.id], t = ideal.tgt[d.id];
    if (!w) return;
    const s = DS[d.id][cid], g = Math.max(0, t - s);
    num += w * g * g; den += w * t * t; ws += w * s; wsum += w;
    if (g > 0.05) gaps.push({ d, g, w, hard: w === 3 && g >= 10 });
  });
  const fit = den ? 100 * (1 - Math.sqrt(num / den)) : 100;
  return { fit, wavg: wsum ? ws / wsum : 0, gaps: gaps.sort((a, b) => b.w * b.g - a.w * a.g) };
}
const ranked = () => C.map(c => ({ c, ...match(c.id) })).sort((a, b) => b.fit - a.fit || b.wavg - a.wavg);

// ---------- radar ----------
const SHAPES = {
  circle: (x, y, r) => `<circle class="pt" cx="${r1(x)}" cy="${r1(y)}" r="${r}"/>`,
  square: (x, y, r) => `<rect class="pt" x="${r1(x - r * .88)}" y="${r1(y - r * .88)}" width="${r1(r * 1.76)}" height="${r1(r * 1.76)}" rx="1"/>`,
  triangle: (x, y, r) => `<path class="pt" d="M${r1(x)} ${r1(y - r * 1.2)}L${r1(x + r * 1.12)} ${r1(y + r * .8)}L${r1(x - r * 1.12)} ${r1(y + r * .8)}Z"/>`,
  diamond: (x, y, r) => `<path class="pt" d="M${r1(x)} ${r1(y - r * 1.3)}L${r1(x + r * 1.1)} ${r1(y)}L${r1(x)} ${r1(y + r * 1.3)}L${r1(x - r * 1.1)} ${r1(y)}Z"/>`
};
const RG = { W: 640, H: 600, cx: 320, cy: 300, R: 210 };
const compact = () => innerWidth < 560;
function setGeom() { RG.R = compact() ? 168 : 210; }
setGeom();
const ang = (i, n) => -Math.PI / 2 + i * 2 * Math.PI / n;
const at = (i, n, rad, cx = RG.cx, cy = RG.cy) => [cx + rad * Math.cos(ang(i, n)), cy + rad * Math.sin(ang(i, n))];
const pathOf = (vals, R = RG.R, cx = RG.cx, cy = RG.cy) => vals.map((v, i) => (i ? 'L' : 'M') + at(i, vals.length, R * v / 100, cx, cy).map(r1).join(' ')).join('') + 'Z';

function radar({ id, dims, series, ideal }) {
  const n = dims.length, { W, H, cx, cy, R } = RG, pr = compact() ? 6.5 : 4.4;
  const summary = dims.map(d => `${d.name}：` + series.map(({ c }) => `${c.name} ${f1(DS[d.id][c.id])}`).join('，')).join('；');
  let s = `<svg class="radar${compact() ? ' compact' : ''}" id="${id}" viewBox="0 0 ${W} ${H}" role="img" aria-label="雷达图，0–100 分。${esc(summary)}">`;
  s += `<path class="hl" d=""/>`;
  [20, 40, 60, 80, 100].forEach(v => { s += `<path class="ring${v === 100 ? ' outer' : ''}" d="${pathOf(dims.map(() => v))}"/>`; });
  dims.forEach((d, i) => { const [x, y] = at(i, n, R); s += `<line class="axis" data-i="${i}" x1="${cx}" y1="${cy}" x2="${r1(x)}" y2="${r1(y)}"/>`; });
  [20, 40, 60, 80, 100].forEach(v => { const [x, y] = at(0, n, R * v / 100); s += `<text class="tick" x="${r1(x + 6)}" y="${r1(y + (compact() ? 18 : 12))}">${v}</text>`; });
  if (ideal) {
    const vals = dims.map(d => ideal.imp[d.id] ? ideal.tgt[d.id] : 0);
    s += `<g class="ideal" style="--o:${cx}px ${cy}px"><path d="${pathOf(vals)}"/>${vals.map((v, i) => { const [x, y] = at(i, n, R * v / 100); return ideal.imp[dims[i].id] ? `<circle cx="${r1(x)}" cy="${r1(y)}" r="${compact() ? 5 : 3.5}"/>` : ''; }).join('')}</g>`;
  }
  series.forEach(({ c, k }) => {
    const vals = dims.map(d => DS[d.id][c.id]), p = pathOf(vals);
    s += `<g class="ser s${k}" data-c="${c.id}" style="--o:${cx}px ${cy}px"><path class="area" d="${p}"/><path class="edge" d="${p}"/>${vals.map((v, i) => SHAPES[SHAPE[k]](...at(i, n, R * v / 100), pr)).join('')}</g>`;
  });
  const half = Math.PI / n;
  dims.forEach((d, i) => {
    const a = ang(i, n), pt = (aa, rr) => [cx + rr * Math.cos(aa), cy + rr * Math.sin(aa)].map(r1).join(' ');
    s += `<path class="hit" data-i="${i}" d="M${cx} ${cy}L${pt(a - half, R + 44)}L${pt(a, R + 52)}L${pt(a + half, R + 44)}Z"/>`;
  });
  dims.forEach((d, i) => {
    const a = ang(i, n), cos = Math.cos(a), sin = Math.sin(a);
    const [x, y] = [cx + (R + 22) * cos, cy + (R + 22) * sin];
    const anchor = Math.abs(cos) < .2 ? 'middle' : cos > 0 ? 'start' : 'end';
    const fs = compact() ? 26 : 14.5, dy = sin < -.8 ? -2 : sin > .8 ? fs + 1 : fs * .4;
    const aria = `${d.name}：` + series.map(({ c }) => `${c.name} ${f1(DS[d.id][c.id])} 分`).join('，') + '。按回车查看指标';
    s += `<g class="lab-g" data-i="${i}" tabindex="0" role="button" aria-label="${esc(aria)}"><text class="lab" x="${r1(x)}" y="${r1(y + dy)}" text-anchor="${anchor}">${esc(d.name)}</text></g>`;
  });
  return s + '</svg>';
}

// Small multiple: the same axes as the big radar, no labels, one polygon.
function mini(c, dims) {
  const R = 46, cx = 60, cy = 56, vals = dims.map(d => DS[d.id][c.id]);
  return `<svg class="mini" viewBox="0 0 120 112" aria-hidden="true">${[50, 100].map(v => `<path class="ring" d="${pathOf(dims.map(() => v), R, cx, cy)}"/>`).join('')}${dims.map((d, i) => { const [x, y] = at(i, dims.length, R, cx, cy); return `<line class="axis" x1="${cx}" y1="${cy}" x2="${r1(x)}" y2="${r1(y)}"/>`; }).join('')}<path class="poly" d="${pathOf(vals, R, cx, cy)}"/></svg>`;
}

// One tooltip, driven by whichever radar is hovered. Axis wedges are the hit targets, so the reader compares the countries on one dimension at a time.
const tip = $('#tip');
function tipFor(box, i) {
  const ctx = box._ctx; if (!ctx) return;
  const d = ctx.dims[i];
  const rows = ctx.series.map(({ c }) => ({ c, s: DS[d.id][c.id] })).sort((a, b) => b.s - a.s);
  const idl = ctx.ideal && ctx.ideal.imp[d.id] ? `<div class="r ideal"><i class="mk ideal" aria-hidden="true"></i><span>你的目标 · ${IMP[ctx.ideal.imp[d.id]]}</span><b>${ctx.ideal.tgt[d.id]}</b></div>` : '';
  tip.innerHTML = `<h4>${esc(d.name)}<small>点击看 ${d.ind.length} 项指标</small></h4>${rows.map(r => `<div class="r">${mk(r.c)}<span>${r.c.name} <small>第 ${rankDim(d.id, r.c.id)}/${N}</small></span><b>${f1(r.s)}</b></div>`).join('')}${idl}<p>${esc(d.q)}</p>`;
  const svg = box.querySelector('svg');
  svg.querySelectorAll('.axis').forEach(a => a.classList.toggle('on', +a.dataset.i === i));
  svg.querySelectorAll('.lab-g').forEach(a => a.classList.toggle('on', +a.dataset.i === i));
  const n = ctx.dims.length, a = ang(i, n), half = Math.PI / n, R = RG.R, cx = RG.cx, cy = RG.cy;
  const arc = [-1, -.5, 0, .5, 1].map(k => [cx + R * Math.cos(a + k * half), cy + R * Math.sin(a + k * half)].map(r1).join(' '));
  svg.querySelector('.hl').setAttribute('d', `M${cx} ${cy}L${arc.join('L')}Z`);
  tip.classList.add('on');
}
function placeTip(x, y) {
  const w = tip.offsetWidth, h = tip.offsetHeight, vw = innerWidth, vh = innerHeight;
  let l = x + 16, t = y + 16;
  if (l + w > vw - 8) l = x - w - 16;
  if (t + h > vh - 8) t = y - h - 16;
  tip.style.left = Math.max(8, l) + 'px'; tip.style.top = Math.max(8, t) + 'px';
}
function hideTip(box) {
  tip.classList.remove('on');
  if (!box) return;
  const svg = box.querySelector('svg'); if (!svg) return;
  svg.querySelectorAll('.axis.on,.lab-g.on').forEach(a => a.classList.remove('on'));
  svg.querySelector('.hl').setAttribute('d', '');
}
function wireRadar(box, ctx) {
  box._ctx = ctx;
  if (box._wired) return;
  box._wired = true;
  box.addEventListener('pointermove', e => {
    const t = e.target.closest('[data-i]');
    if (!t || t.tagName === 'line') return;
    const i = +t.dataset.i;
    if (box._i !== i) { box._i = i; tipFor(box, i); }
    placeTip(e.clientX, e.clientY);
  });
  box.addEventListener('pointerleave', () => { box._i = null; hideTip(box); });
  box.addEventListener('click', e => {
    const t = e.target.closest('[data-i]'); if (!t) return;
    openDim(box._ctx.dims[+t.dataset.i].id);
  });
  box.addEventListener('focusin', e => {
    const t = e.target.closest('.lab-g'); if (!t) return;
    const i = +t.dataset.i; box._i = i; tipFor(box, i);
    const r = t.getBoundingClientRect(); placeTip(r.right, r.bottom);
  });
  box.addEventListener('focusout', () => { box._i = null; hideTip(box); });
  box.addEventListener('keydown', e => {
    const t = e.target.closest('.lab-g');
    if (t && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openDim(box._ctx.dims[+t.dataset.i].id); }
  });
}
// Hovering a compared country anywhere (chip, row, legend) brings its polygon forward on every radar.
document.addEventListener('pointerover', e => {
  const t = e.target.closest('[data-emph]');
  const id = t && slotOf(t.dataset.emph) >= 0 ? t.dataset.emph : null;
  $$('.radar').forEach(r => {
    if (id) r.setAttribute('data-emph', id); else r.removeAttribute('data-emph');
    r.querySelectorAll('.ser').forEach(g => g.classList.toggle('on', g.dataset.c === id));
  });
});

const legend = (series, withIdeal) => `<div class="legend" aria-hidden="true">${series.map(({ c }) => `<span data-emph="${c.id}">${mk(c)}${c.name}</span>`).join('')}${withIdeal ? '<span><i class="mk ideal"></i>你的理想</span>' : ''}</div>`;
const addSelect = (id, label) => {
  const free = S.cmp.includes(null);
  return `<select class="sel" id="${id}" aria-label="${label}" ${free ? '' : 'disabled'}><option value="">${free ? '＋ 加入对比' : '已满 4 国'}</option>${REGIONS.map(rg => `<optgroup label="${rg}">${C.filter(c => c.region === rg && slotOf(c.id) < 0).map(c => `<option value="${c.id}">${c.name}</option>`).join('')}</optgroup>`).join('')}</select>`;
};
const cmpChips = () => compared().map(({ c, k }) => `<button class="chip on-chip" data-uncmp="${c.id}" data-emph="${c.id}" aria-label="把${c.name}移出对比">${mk(c)}${c.name}${I.x}</button>`).join('');

// ---------- overview ----------
function profile(cid, dims = D) {
  const list = dims.map(d => ({ d, s: DS[d.id][cid], rank: rankDim(d.id, cid) })).sort((a, b) => b.s - a.s);
  return { best: list.slice(0, 3), worst: list.slice(-3).reverse(), min: list[list.length - 1], lead: [...list].sort((a, b) => a.rank - b.rank || b.s - a.s).slice(0, 3) };
}
// Each line names the indicator that best explains the strength (best-ranked) or weakness (worst-ranked) inside that dimension.
function why(x, cid, strong) {
  const inds = x.d.ind.filter(ind => ind.v[cid] != null).map(ind => { const r = rankInd(ind, cid), ties = C.filter(c => ind.v[c.id] === ind.v[cid]).length; return { ind, r, mid: r + (ties - 1) / 2 }; });
  const pick = inds.sort((a, b) => strong ? a.mid - b.mid : b.mid - a.mid)[0];
  return `<b>${x.d.name} ${f1(x.s)}</b>（第 ${x.rank}/${N}）：${esc(pick.ind.name)} ${valTxt(pick.ind, pick.ind.v[cid])}，第 ${pick.r}/${withData(pick.ind)}`;
}

function headline() {
  const all = C.map(c => ({ c, s: overall(c.id, D) })).sort((a, b) => b.s - a.s);
  const cnR = 1 + all.findIndex(x => x.c.id === 'cn'), cnS = all[cnR - 1].s, cn = profile('cn');
  const pick = ids => { const ds = ids.map(dimById); return C.map(c => ({ c, s: overall(c.id, ds) })).sort((a, b) => b.s - a.s); };
  return {
    h1: [`十项等权：${all[0].c.name} ${f1(all[0].s)} 分第一，`, `中国 ${f1(cnS)} 分排第 ${cnR}/${N}`],
    p: `前五依次是${all.slice(0, 5).map(x => `${x.c.name} ${f1(x.s)}`).join('、')}。中国的强项是${cn.lead.map(x => `${x.d.name}（第 ${x.rank}）`).join('、')}，短板是${cn.worst.map(x => `${x.d.name}（${f1(x.s)}，第 ${x.rank}）`).join('、')}。`,
    hard: pick(['safety', 'infra', 'econ']), soft: pick(['gov', 'env', 'life'])
  };
}

function renderOverview() {
  const dims = D.filter(d => S.dims.includes(d.id));
  const series = compared();
  const cur = C.map(c => ({ c, s: overall(c.id, dims) })).sort((a, b) => b.s - a.s);
  const H = headline();
  const sortKey = S.sort === 'all' || S.dims.includes(S.sort) ? S.sort : 'all';
  const rows = withRank(C.map(c => ({ c, s: sortKey === 'all' ? overall(c.id, dims) : DS[sortKey][c.id] })).sort((a, b) => b.s - a.s));
  const shown = withRank(cur);
  const colMax = Object.fromEntries(D.map(d => [d.id, Math.max(...C.map(c => DS[d.id][c.id]))]));
  const allMax = Math.max(...cur.map(x => x.s));
  const [A, B] = S.pair.map(byId);
  const diffs = D.map(d => ({ d, x: DS[d.id][A.id] - DS[d.id][B.id] })).sort((a, b) => Math.abs(b.x) - Math.abs(a.x));
  const maxd = Math.max(...diffs.map(x => Math.abs(x.x)), 1);
  const pairSel = (k, label) => `<select class="sel" data-pairsel="${k}" aria-label="${label}">${REGIONS.map(rg => `<optgroup label="${rg}">${C.filter(c => c.region === rg).map(c => `<option value="${c.id}" ${S.pair[k] === c.id ? 'selected' : ''} ${S.pair[1 - k] === c.id ? 'disabled' : ''}>${c.name}</option>`).join('')}</optgroup>`).join('')}</select>`;
  const topN = list => list.slice(0, 3).map(x => `${x.c.name} ${f1(x.s)}`).join('、');
  const cnAt = list => { const r = 1 + list.findIndex(x => x.c.id === 'cn'); return r <= 3 ? '' : `，中国第 ${r}`; };
  const dimNote = dims.length === D.length ? '十项等权' : `已选 ${dims.length} 项等权`;

  $('#v-overview').innerHTML = `
    <div class="lead">
      <div class="eyebrow">第三版 · ${N} 国 × ${D.length} 维 × ${D.reduce((s, d) => s + d.ind.length, 0)} 项公开指标</div>
      <h1>${H.h1.map(t => `<span class="cl">${esc(t)}</span>`).join('')}</h1>
      <p>${esc(H.p)}</p>
    </div>
    ${regionChips()}
    <div class="ov">
      <div class="chart">
        <div class="ctl">
          <div class="ctl-row"><span>对比</span><div class="chips">${cmpChips()}${addSelect('add-ov', '加入对比的国家')}
            <button class="chip" aria-pressed="${S.showIdeal}" id="tg-ideal"><i class="mk ideal" aria-hidden="true"></i>叠加我的理想</button></div></div>
          <div class="ctl-row"><span>维度</span><div class="chips">${D.map(d => `<button class="chip" aria-pressed="${S.dims.includes(d.id)}" data-dim="${d.id}">${d.name}</button>`).join('')}
            ${dims.length < D.length ? '<button class="chip" id="dims-all">全选</button>' : ''}</div></div>
        </div>
        <div class="radar-box" id="rb-ov">${radar({ id: 'radar-ov', dims, series, ideal: S.showIdeal ? S.ideal : null })}</div>
        ${legend(series, S.showIdeal)}
      </div>
      <div class="panel">
        <h3>综合排名<small>${dimNote} · 点一行加入或移出对比</small></h3>
        <div class="rank" role="list">${shown.map(x => `<button class="rk-row ${sc(x.c.id)}" role="listitem" aria-pressed="${slotOf(x.c.id) >= 0}" data-cmp="${x.c.id}" data-emph="${x.c.id}">
          <span class="rk">${x.rank}</span><span class="nm">${mk(x.c)}${x.c.name}<small>${x.c.region}</small></span>
          <span class="tr" aria-hidden="true"><i style="width:${x.s.toFixed(1)}%"></i></span><b>${f1(x.s)}</b></button>`).join('')}</div>
        <div class="callout" style="margin-top:12px">
          <b>排名取决于你看重什么</b>
          <p>只看治安、基建、经济：${topN(H.hard)} 前三${cnAt(H.hard)}。<br>只看治理与自由、环境、工作与幸福：${topN(H.soft)} 前三${cnAt(H.soft)}。</p>
          <p><a href="#ideal" data-go="ideal">到“理想生活”按你的权重重新排 →</a></p>
        </div>
      </div>
    </div>
    <div class="tbl-wrap">
      <table class="heat">
        <caption class="eyebrow" style="text-align:left;padding:12px 12px 0">维度得分（0–100）· 点表头排序 · 点国家名加入对比 · 底色越深分越高</caption>
        <thead><tr><th>国家</th>${D.map(d => `<th class="n" aria-sort="${sortKey === d.id ? 'descending' : 'none'}"><button data-sort="${d.id}" ${S.dims.includes(d.id) ? '' : 'disabled'}>${d.name}${sortKey === d.id ? ' ↓' : ''}</button></th>`).join('')}<th class="n" aria-sort="${sortKey === 'all' ? 'descending' : 'none'}"><button data-sort="all">综合${sortKey === 'all' ? ' ↓' : ''}</button></th></tr></thead>
        <tbody>${rows.map(({ c }) => `<tr class="${sc(c.id)}">
          <td><button class="cn-btn" data-cmp="${c.id}" data-emph="${c.id}" aria-pressed="${slotOf(c.id) >= 0}">${mk(c)}${c.name}</button></td>
          ${D.map(d => { const v = DS[d.id][c.id], m = MISS[d.id][c.id]; return `<td class="h ${v === colMax[d.id] ? 'mx' : ''} ${S.dims.includes(d.id) ? '' : 'off'}" style="background:color-mix(in srgb,var(--heat) ${(Math.max(0, v - 40) / 60 * 12).toFixed(1)}%,transparent)">${f1(v)}${m ? `<sup title="缺 ${m} 项指标，按其余指标平均">*</sup>` : ''}</td>`; }).join('')}
          <td class="h all ${overall(c.id, dims) === allMax ? 'mx' : ''}">${f1(overall(c.id, dims))}</td></tr>`).join('')}</tbody>
      </table>
    </div>
    <div class="panel">
      <h3>${N} 国形状一览<small>同一套坐标轴（从“${dims[0].name}”起顺时针），按综合分排序 · 点一张加入或移出对比</small></h3>
      <div class="sm-grid">${shown.map(x => `<button class="sm-card ${sc(x.c.id)}" aria-pressed="${slotOf(x.c.id) >= 0}" data-cmp="${x.c.id}" data-emph="${x.c.id}" aria-label="${x.c.name}，综合 ${f1(x.s)}，第 ${x.rank}">
        ${mini(x.c, dims)}<span class="nm">${mk(x.c)}${x.c.name}<b>${f1(x.s)}</b></span><small>第 ${x.rank} · ${x.c.region}</small></button>`).join('')}</div>
    </div>
    <div class="ov">
      <div class="panel">
        <h3>对比国家画像<small>每条写出这个维度里排名最好（或最差）的那项指标</small></h3>
        <div class="find" style="margin-top:12px">${series.map(({ c }) => { const p = profile(c.id), tag = (x, strong) => why(x, c.id, strong); return `<div class="fc" data-emph="${c.id}">
          <h4>${mk(c)}${c.name}<small>综合 ${f1(overall(c.id, D))} · 第 ${1 + C.map(y => overall(y.id, D)).filter(v => v > overall(c.id, D)).length}/${N}</small></h4>
          ${p.best.map(x => `<div class="pm"><em>强</em><span>${tag(x, true)}</span></div>`).join('')}
          ${p.worst.map(x => `<div class="pm"><em>弱</em><span>${tag(x, false)}</span></div>`).join('')}
        </div>`; }).join('')}</div>
      </div>
      <div class="panel">
        <h3>两两对比<small>按分差从大到小</small></h3>
        <div class="ctl" style="margin-top:10px"><div class="ctl-row"><span>A</span>${pairSel(0, '对比国 A')}<span>B</span>${pairSel(1, '对比国 B')}</div></div>
        <div class="pair" role="table" aria-label="${A.name}减${B.name}的维度分差">
          <div class="pair-h" role="row"><span></span><div><span>${B.name}更好</span><span>${A.name}更好</span></div><span></span></div>
          ${diffs.map(({ d, x }) => { const w = Math.abs(x) / maxd * 50; return `<div class="pr ${x >= 0 ? 'pa' : 'pb'}" role="row"><span role="cell">${d.name}</span><div class="tr" role="cell" aria-label="${x >= 0 ? A.name : B.name}高 ${f1(Math.abs(x))} 分"><i class="${x >= 0 ? 'r' : 'l'}" style="width:${w.toFixed(2)}%"></i></div><b role="cell">${minus((x > 0 ? '+' : '') + f1(x))}</b></div>`; }).join('')}
        </div>
      </div>
    </div>`;
  wireRadar($('#rb-ov'), { dims, series, ideal: S.showIdeal ? S.ideal : null });
}

// ---------- dimension detail ----------
function renderDims() {
  const d = dimById(S.dim);
  const order = C.map(c => ({ c, s: DS[d.id][c.id] })).sort((a, b) => b.s - a.s), shown = withRank(order);
  // Mark the best value only when at most two countries share it; a ten-way tie at 100% says nothing.
  const best = Object.fromEntries(d.ind.map(ind => { const xs = C.map(c => IS[d.id][ind.id][c.id] ?? -1), m = Math.max(...xs); return [ind.id, xs.filter(x => x === m).length <= 2 ? m : null]; }));
  $('#v-dims').innerHTML = `
    <div class="seg" role="radiogroup" aria-label="选择维度" style="justify-self:start">${D.map(x => `<button role="radio" aria-checked="${x.id === d.id}" data-pick="${x.id}">${x.name}</button>`).join('')}</div>
    ${regionChips()}
    <div class="dhead">
      <div class="lead"><div class="eyebrow">维度 ${D.indexOf(d) + 1} / ${D.length} · ${d.ind.length} 项指标等权平均</div><h1>${d.name}<small>${d.en}</small></h1><p>${esc(d.q)}</p>
        <p>第一是${order[0].c.name}（${f1(order[0].s)}），最后是${order[N - 1].c.name}（${f1(order[N - 1].s)}），中国第 ${1 + order.findIndex(x => x.c.id === 'cn')}。</p></div>
      <div class="bars" role="list" aria-label="${d.name}维度得分">${shown.map(x => `<div class="bar ${sc(x.c.id)}" role="listitem" data-emph="${x.c.id}"><span><em class="brk">${x.rank}</em>${mk(x.c)}${x.c.name}</span><div class="tr"><i style="width:${x.s.toFixed(1)}%"></i></div><b>${f1(x.s)}</b></div>`).join('')}</div>
    </div>
    <div class="tbl-wrap">
      <table class="ind-tbl">
        <caption class="eyebrow" style="text-align:left;padding:12px 12px 0">原始值 · 换算分 · 按维度分排序</caption>
        <thead><tr><th>国家</th><th class="n">维度分</th>${d.ind.map(ind => `<th><span class="ih">${esc(ind.name)}</span><small class="iu">${esc(ind.unit)} · ${ind.b > ind.w ? '越高越好' : '越低越好'}</small></th>`).join('')}</tr></thead>
        <tbody>${shown.map(({ c, s }) => `<tr class="${sc(c.id)}">
          <td><button class="cn-btn" data-cmp="${c.id}" data-emph="${c.id}" aria-pressed="${slotOf(c.id) >= 0}">${mk(c)}${c.name}</button></td>
          <td class="n"><b class="ds">${f1(s)}</b>${MISS[d.id][c.id] ? '<sup title="有缺失指标">*</sup>' : ''}</td>
          ${d.ind.map(ind => { const v = ind.v[c.id], x = IS[d.id][ind.id][c.id]; if (v == null) return '<td><div class="cell na"><b>—</b><span>无数据</span></div></td>'; const y = ind.yx && ind.yx[c.id]; return `<td><div class="cell ${x === best[ind.id] ? 'best' : ''}"><b>${fmtV(ind, v)}${y ? `<small>${y}</small>` : ''}</b><div class="mini-bar"><i style="width:${x.toFixed(1)}%"></i></div><span>${f1(x)} 分</span></div></td>`; }).join('')}
        </tr>`).join('')}</tbody>
      </table>
    </div>
    <div class="panel"><h3>区间、来源与读数注意<small>口径、年份与偏差</small></h3>
      <ul class="notes" style="margin-top:8px">${d.ind.map(x => `<li><b>${esc(x.name)}</b><span>${fmtV(x, x.w)} 分记 0、${fmtV(x, x.b)} 记 100${x.log ? '（对数刻度）' : ''} · <a href="${SRC[x.src][1]}" target="_blank" rel="noopener">${esc(SRC[x.src][0])}</a> · ${esc(x.yr)}${x.yx ? '（部分国家年份不同，见数值旁）' : ''}${x.note ? `<br>${esc(x.note)}` : ''}</span></li>`).join('')}</ul></div>`;
}
function openDim(id) { S.dim = id; setView('dims'); }

// ---------- ideal life ----------
function applyAnswers() {
  const imp = Object.fromEntries(D.map(d => [d.id, 1])), tgt = Object.fromEntries(D.map(d => [d.id, 70]));
  const best = {};
  QS.forEach(q => {
    const k = S.ideal.answers[q.id]; if (k == null) return;
    Object.entries(q.opts[k].set).forEach(([dim, [w, t]]) => {
      if (best[dim] == null || w >= best[dim]) { best[dim] = w; imp[dim] = w; tgt[dim] = t; }
    });
  });
  Object.assign(S.ideal, { imp, tgt, preset: null, example: false });
}
function idealLead() {
  const r = ranked(), a = r[0], b = r[1];
  const name = S.ideal.preset ? PRESETS.find(p => p.id === S.ideal.preset).name : (Object.keys(S.ideal.answers).length ? `${Object.keys(S.ideal.answers).length} 道选择题生成` : '自定义');
  const hard = a.gaps.filter(g => g.hard);
  const tail = a.gaps.length ? `它离你的目标最远的是${a.gaps.slice(0, 2).map(g => `${g.d.name}（差 ${f1(g.g)}）`).join('、')}` : `它在你关心的每个维度都达到了目标`;
  const cnR = 1 + r.findIndex(x => x.c.id === 'cn');
  return `
    <div class="eyebrow">理想生活 · 当前设定：${esc(name)}${S.ideal.example ? ' · 示例' : ''}</div>
    <h1><span class="cl">按你的设定，最接近的是${a.c.name}，</span><span class="cl">匹配度 ${f1(a.fit)}</span></h1>
    <p>${a.c.name}领先第二名${b.c.name} ${f1(a.fit - b.fit)} 分；中国排第 ${cnR}/${N}（${f1(r[cnR - 1].fit)}）。${tail}${hard.length ? '，其中有你标为“必须”的硬伤' : ''}。${S.ideal.example ? '下面是“成家育儿”的示例设定，点任一选项就换成你自己的。' : ''}</p>`;
}
function idealSide() {
  const r = ranked(), series = compared();
  return `
    <div class="chart">
      <div class="ph">你的理想 vs 对比国家<small>虚线是你的目标；“不在乎”的维度画在 0</small></div>
      <div class="ctl" style="margin-top:8px"><div class="ctl-row"><div class="chips">${cmpChips()}${addSelect('add-idl', '加入对比的国家')}</div></div></div>
      <div class="radar-box" id="rb-idl">${radar({ id: 'radar-idl', dims: D, series, ideal: S.ideal })}</div>
      ${legend(series, true)}
    </div>
    <div class="panel">
      <div class="ph">${N} 国匹配度<small>100 = 每个关心的维度都达标 · 点一行加入或移出对比</small></div>
      <div class="ctl" style="margin-top:8px">${regionChips()}</div>
      <div class="matches" style="margin-top:6px">${withRank(r).map(x => `<button class="m ${sc(x.c.id)}" aria-pressed="${slotOf(x.c.id) >= 0}" data-cmp="${x.c.id}" data-emph="${x.c.id}">
        <span class="rk">${x.rank}</span>
        <span class="nm">${mk(x.c)}${x.c.name}</span>
        <span class="fit">${f1(x.fit)}</span>
        <span class="mt" aria-hidden="true"><i style="width:${x.fit.toFixed(1)}%"></i></span>
        <span class="gaps">${x.gaps.length ? x.gaps.slice(0, 3).map(g => `<span class="gap ${g.hard ? 'hard' : ''}">${g.hard ? I.warn + '硬伤 · ' : ''}${g.d.name} −${f1(g.g)}</span>`).join('') + (x.gaps.length > 3 ? `<span class="gap">另 ${x.gaps.length - 3} 项</span>` : '') : '<span class="gap ok">关心的维度全部达标</span>'}</span>
      </button>`).join('')}</div>
      <p style="margin:10px 0 0;font-size:12px;color:var(--faint)">匹配度 = 100 ×（1 − √(Σ 重要度×缺口² ÷ Σ 重要度×目标²)）。超过目标不加分；一个维度差 30 分，比三个维度各差 10 分扣得更多。“硬伤”= 标为必须且差 10 分以上。</p>
    </div>`;
}
function idealLeft() {
  const id = S.ideal;
  return `
    <div class="panel">
      <div class="ph">快速套用<small>选一种人生剧本</small></div>
      <div class="presets" role="radiogroup" aria-label="预设">${PRESETS.map(p => `<button class="preset" role="radio" aria-checked="${id.preset === p.id}" data-preset="${p.id}"><b>${p.name}</b><small>${p.desc}</small></button>`).join('')}</div>
    </div>
    <div class="panel">
      <div class="ph">或者回答 ${QS.length} 道选择题<small>每选一项，右边立刻重算</small></div>
      <div class="qs">${QS.map(q => `<div class="q"><b>${q.q}</b><div class="chips" role="radiogroup" aria-label="${esc(q.q)}">${q.opts.map((o, k) => `<button class="chip" role="radio" aria-checked="${id.answers[q.id] === k}" data-q="${q.id}" data-k="${k}">${o.t}</button>`).join('')}</div></div>`).join('')}</div>
      ${Object.keys(id.answers).length ? '<div style="margin-top:12px"><button class="btn" id="q-reset">清空答案</button></div>' : ''}
    </div>
    <div class="tbl-wrap">
      <table class="tune">
        <caption class="eyebrow" style="text-align:left;padding:12px 12px 0">逐项微调 · 重要程度和目标分</caption>
        <thead><tr><th>维度</th><th>重要程度</th><th>目标</th><th class="n"></th></tr></thead>
        <tbody>${D.map(d => `<tr class="${id.imp[d.id] ? '' : 'mute'}" data-row="${d.id}">
          <td class="dn">${d.name}</td>
          <td><div class="seg sm" role="radiogroup" aria-label="${d.name}重要程度">${IMP.map((t, w) => `<button role="radio" aria-checked="${id.imp[d.id] === w}" data-imp="${d.id}" data-w="${w}">${t}</button>`).join('')}</div></td>
          <td><input type="range" min="0" max="100" step="5" value="${id.tgt[d.id]}" id="tgt-${d.id}" data-tgt="${d.id}" aria-label="${d.name}目标分"></td>
          <td class="n"><span class="tv" id="tv-${d.id}">${id.tgt[d.id]}</span></td>
        </tr>`).join('')}</tbody>
      </table>
    </div>`;
}
function renderIdeal() {
  $('#v-ideal').innerHTML = `<div class="lead" id="idl-lead">${idealLead()}</div><div class="idl"><div style="display:grid;gap:14px;min-width:0" id="idl-left">${idealLeft()}</div><div class="idl-side" id="idl-side">${idealSide()}</div></div>`;
  wireRadar($('#rb-idl'), { dims: D, series: compared(), ideal: S.ideal });
}
function refreshIdealOut() {
  $('#idl-lead').innerHTML = idealLead();
  $('#idl-side').innerHTML = idealSide();
  wireRadar($('#rb-idl'), { dims: D, series: compared(), ideal: S.ideal });
}
function touched() {
  S.ideal.example = false;
  if (S.ideal.preset) S.ideal.preset = null;
  saveIdeal();
}

// ---------- method ----------
function renderMethod() {
  const gaps = D.flatMap(d => d.ind.flatMap(ind => C.filter(c => ind.v[c.id] == null).map(c => ({ d, ind, c }))));
  const limits = [
    ['维度和权重是一种选择', '换一组维度或权重，排名就会变（总览里有两个反例）。所以这里不给“最好的国家”，只给你在自己权重下的匹配度。'],
    ['国家均值掩盖内部差异', '上海和甘肃、旧金山和密西西比、悉尼和达尔文，差距可能大过国与国之间。目前只做国家层面。'],
    ['统计口径不完全可比', '杀人率年份不同（中国最新 2020）；医保覆盖率各国口径不同；Gallup 中国样本为网络问卷；阿联酋近九成人口是外籍劳工，很多人均指标反映的是这一人口结构。'],
    ['调查型指数带主观成分', '清廉指数、自由之家、WJP、Gallup、幸福报告都依赖问卷或专家打分，评估机构的立场会影响结果，尤其是对中国、新加坡、阿联酋等非西方体制国家。'],
    ['众包数据样本偏差', 'Numbeo 购买力和房价收入比来自用户提交，偏向大城市和外籍人士；Ookla 网速来自用户自测。'],
    ['以“本国居民”为视角', '没有计入签证难度、语言、华人社区、种族歧视、税负、汇率等移居者特有的因素。“可负担”按当地工资衡量，所以泰国、越南分数很低；带着海外收入去生活的人，看到的是另一回事（见“可负担”维度的备注）。'],
    ['部分数据较旧或缺失', `社会流动性指数只有 2020 年一版；LPI 为 2023 年版；共 ${gaps.length} 个国家-指标组合没有数据，所在维度按其余指标平均。`]
  ];
  $('#v-method').innerHTML = `
    <div class="lead"><div class="eyebrow">方法与来源</div><h1>每个分数怎么来的</h1><p>原始数据 → 按全球区间换算成 0–100 → 维度内等权平均 → 维度间等权（或按你的理想权重）。所有原始值、区间和来源都列在下面，可以逐项核对。</p></div>
    <div class="prose">
      <p><b>1. 指标换算。</b>每个指标设一个“0 分”和“100 分”的区间端点，端点取全球大致的底部和前沿水平，所以 100 分不是“这 ${N} 国里最高”，而是接近世界前沿。超出区间按 0 或 100 截断。收入、网速、杀人率、房价收入比、大学排名这类跨数量级的指标用对数刻度。</p>
      <div class="formula">线性：分数 = 100 ×（值 − 0 分端点）÷（100 分端点 − 0 分端点）　　对数：分数 = 100 ×（ln 值 − ln 0 分端点）÷（ln 100 分端点 − ln 0 分端点）</div>
      <p><b>2. 维度分。</b>维度内各指标等权平均；某国缺某项数据时，按其余指标平均，并在表里标 *。<b>3. 综合分。</b>所选维度等权平均。</p>
      <p><b>4. 理想匹配度。</b>你为每个维度设重要程度 w（不在乎 0 · 一般 1 · 重要 2 · 必须 3）和目标分 t。缺口 = max(0, t − 国家得分)。</p>
      <div class="formula">匹配度 = 100 ×（1 − √( Σ w·缺口² ÷ Σ w·t² )）</div>
      <p>超过目标不加分，避免某一项特别强掩盖你在意的短板；缺口平方让一个大缺口比多个小缺口扣分更多。</p>
    </div>
    <div class="tbl-wrap">
      <table class="gp-tbl">
        <caption class="eyebrow" style="text-align:left;padding:12px 12px 0">为什么是这 ${N} 个国家</caption>
        <thead><tr><th>地区</th><th>国家</th><th>入选理由</th></tr></thead>
        <tbody>${C.map((c, i) => `<tr><td>${i && C[i - 1].region === c.region ? '' : `<b>${c.region}</b>`}</td><td>${c.name} <span style="color:var(--faint)">${c.en}</span></td><td>${esc(c.why)}</td></tr>`).join('')}</tbody>
      </table>
    </div>
    <div class="tbl-wrap">
      <table class="gp-tbl">
        <caption class="eyebrow" style="text-align:left;padding:12px 12px 0">全部 ${D.reduce((s, d) => s + d.ind.length, 0)} 项指标的区间与来源</caption>
        <thead><tr><th>维度</th><th>指标</th><th>单位</th><th class="n">0 分</th><th class="n">100 分</th><th>刻度</th><th>年份</th><th>覆盖</th><th>来源</th></tr></thead>
        <tbody>${D.map(d => d.ind.map((ind, k) => `<tr><td>${k ? '' : `<b>${d.name}</b>`}</td><td>${esc(ind.name)}</td><td>${esc(ind.unit)}</td><td class="n">${fmtV(ind, ind.w)}</td><td class="n">${fmtV(ind, ind.b)}</td><td>${ind.log ? '对数' : '线性'}</td><td>${esc(ind.yr)}${ind.yx ? `（${Object.entries(ind.yx).map(([cid, y]) => `${byId(cid).name} ${y}`).join('、')}）` : ''}</td><td class="n">${withData(ind)}/${N}</td><td><a href="${SRC[ind.src][1]}" target="_blank" rel="noopener">${esc(SRC[ind.src][0])}</a></td></tr>`).join('')).join('')}</tbody>
      </table>
    </div>
    <div class="panel"><h3>局限<small>读结论前先读这里</small></h3><ul class="limits" style="margin-top:10px">${limits.map(([b, t]) => `<li><span><b>${b}。</b>${t}</span></li>`).join('')}</ul>
      ${gaps.length ? `<p style="margin:12px 0 0;font-size:13px;color:var(--muted)">缺失数据：${gaps.map(g => `${g.c.name} · ${esc(g.ind.name)}`).join('；')}。</p>` : ''}</div>`;
}

// ---------- views ----------
function setView(v) {
  if (!VIEWS.includes(v)) v = 'overview';
  S.view = v;
  $$('#nav button').forEach(b => b.setAttribute('aria-selected', b.dataset.v === v));
  VIEWS.forEach(x => { $('#v-' + x).hidden = x !== v; });
  hideTip();
  rerender();
  $('#main').scrollTop = 0;
  try { history.replaceState(null, '', '#' + v); } catch { }
}
function rerender() {
  ({ overview: renderOverview, dims: renderDims, ideal: renderIdeal, method: renderMethod })[S.view]();
}

// ---------- events ----------
document.addEventListener('click', e => {
  const t = e.target.closest('button,a');
  if (!t || t.disabled) return;
  const ds = t.dataset;
  if (ds.v) return setView(ds.v);
  if (ds.go) { e.preventDefault(); return setView(ds.go); }
  if (ds.cmp) return toggleCmp(ds.cmp);
  if (ds.uncmp) return toggleCmp(ds.uncmp);
  if (t.id === 'tg-ideal') { S.showIdeal = !S.showIdeal; lsSet('showIdeal', S.showIdeal); return renderOverview(); }
  if (ds.dim) {
    const has = S.dims.includes(ds.dim);
    if (has && S.dims.length <= 3) return toast('至少保留 3 个维度');
    S.dims = has ? S.dims.filter(x => x !== ds.dim) : D.map(d => d.id).filter(id => S.dims.includes(id) || id === ds.dim);
    lsSet('dims', S.dims); return renderOverview();
  }
  if (t.id === 'dims-all') { S.dims = D.map(d => d.id); lsSet('dims', S.dims); return renderOverview(); }
  if (ds.sort) { S.sort = ds.sort; return renderOverview(); }
  if (ds.region) { S.region = ds.region; lsSet('region', S.region); return rerender(); }
  if (ds.pick) { S.dim = ds.pick; return renderDims(); }
  if (ds.preset) {
    const p = PRESETS.find(x => x.id === ds.preset);
    S.ideal = { preset: p.id, answers: {}, example: false, imp: Object.fromEntries(D.map(d => [d.id, p.set[d.id][0]])), tgt: Object.fromEntries(D.map(d => [d.id, p.set[d.id][1]])) };
    saveIdeal(); return renderIdeal();
  }
  if (ds.q) {
    S.ideal.answers = { ...S.ideal.answers, [ds.q]: +ds.k };
    applyAnswers(); saveIdeal(); return renderIdeal();
  }
  if (t.id === 'q-reset') { S.ideal.answers = {}; applyAnswers(); saveIdeal(); return renderIdeal(); }
  if (ds.imp) {
    S.ideal.imp[ds.imp] = +ds.w; touched();
    const row = $(`tr[data-row="${ds.imp}"]`);
    row.classList.toggle('mute', !+ds.w);
    row.querySelectorAll('[data-imp]').forEach(b => b.setAttribute('aria-checked', b.dataset.w === ds.w));
    $$('[data-preset]').forEach(b => b.setAttribute('aria-checked', 'false'));
    return refreshIdealOut();
  }
});
document.addEventListener('change', e => {
  const t = e.target;
  if ((t.id === 'add-ov' || t.id === 'add-idl') && t.value) return toggleCmp(t.value);
  if (t.dataset.pairsel != null) { S.pair[+t.dataset.pairsel] = t.value; lsSet('pair', S.pair); return renderOverview(); }
});
document.addEventListener('input', e => {
  const t = e.target; if (!t.dataset.tgt) return;
  S.ideal.tgt[t.dataset.tgt] = +t.value; touched();
  $('#tv-' + t.dataset.tgt).textContent = t.value;
  $$('[data-preset]').forEach(b => b.setAttribute('aria-checked', 'false'));
  refreshIdealOut();
});
addEventListener('hashchange', () => { const v = location.hash.slice(1); if (VIEWS.includes(v) && v !== S.view) setView(v); });
let wasCompact = compact();
addEventListener('resize', () => { if (compact() !== wasCompact) { wasCompact = compact(); setGeom(); rerender(); } });
$('#main').addEventListener('scroll', () => hideTip(), { passive: true });

setView(VIEWS.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'overview');
