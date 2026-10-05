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

const I = {
  warn: '<svg viewBox="0 0 16 16" fill="none" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><path d="M8 2.5 14.5 13.5h-13z" stroke-linejoin="round"/><path d="M8 6.5v3M8 11.6h.01"/></svg>'
};

// ---------- scoring ----------
// Indicator → 0–100 against its goalposts; dimension = mean of its indicators; overall = mean of chosen dimensions.
const norm = (ind, v) => {
  const t = ind.log ? (Math.log(v) - Math.log(ind.w)) / (Math.log(ind.b) - Math.log(ind.w)) : (v - ind.w) / (ind.b - ind.w);
  return Math.max(0, Math.min(1, t)) * 100;
};
const IS = {}, DS = {};
D.forEach(d => {
  IS[d.id] = {};
  d.ind.forEach(ind => { IS[d.id][ind.id] = ind.v.map(v => norm(ind, v)); });
  DS[d.id] = C.map((c, i) => d.ind.reduce((s, ind) => s + IS[d.id][ind.id][i], 0) / d.ind.length);
});
const dimById = id => D.find(d => d.id === id);
const cIdx = id => C.findIndex(c => c.id === id);
const overall = (i, dims) => dims.reduce((s, d) => s + DS[d.id][i], 0) / dims.length;
const yrOf = (ind, i) => Array.isArray(ind.yr) ? ind.yr[i] : ind.yr;
const indOf = (dId, iId) => dimById(dId).ind.find(x => x.id === iId);
function fmtV(ind, v) {
  let dp = ind.dp;
  if (v !== 0 && Math.abs(v) < 0.1 && dp < 2) dp = 2;
  const s = v.toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp });
  return minus((ind.sign && v > 0 ? '+' : '') + s);
}
const raw = (dId, iId, cid) => indOf(dId, iId).v[cIdx(cid)];
const val = (dId, iId, cid) => fmtV(indOf(dId, iId), raw(dId, iId, cid));
const rankIn = (dId, cid) => 1 + C.filter((c, i) => DS[dId][i] > DS[dId][cIdx(cid)]).length;
const mk = (c, extra = '') => `<i class="mk ${c.shape} k-${c.id} ${extra}" aria-hidden="true"></i>`;

// ---------- state ----------
const VIEWS = ['overview', 'dims', 'ideal', 'method'];
const S = {
  view: 'overview',
  on: lsGet('on', { cn: true, us: true, nz: true, de: true }),
  dims: lsGet('dims', D.map(d => d.id)).filter(id => dimById(id)),
  showIdeal: lsGet('showIdeal', false),
  dim: 'health',
  pair: lsGet('pair', ['cn', 'de']),
  ideal: lsGet('ideal', null)
};
if (S.dims.length < 3) S.dims = D.map(d => d.id);
if (!C.some(c => S.on[c.id])) S.on = { cn: true, us: true, nz: true, de: true };
if (!S.ideal || !S.ideal.imp || !S.ideal.tgt || D.some(d => S.ideal.imp[d.id] == null || S.ideal.tgt[d.id] == null)) S.ideal = { ...clone(DEFAULT_IDEAL), answers: {}, example: true };
S.ideal.answers = S.ideal.answers || {};
if (!Array.isArray(S.pair) || S.pair.length !== 2 || !S.pair.every(id => cIdx(id) >= 0) || S.pair[0] === S.pair[1]) S.pair = ['cn', 'de'];
const saveIdeal = () => lsSet('ideal', S.ideal);

// ---------- match ----------
// fit = 100 × (1 − √(Σ w·gap² / Σ w·t²)), gap = max(0, target − score). Exceeding a target earns nothing; one big gap hurts more than several small ones.
function match(i, ideal = S.ideal) {
  let num = 0, den = 0, ws = 0, wsum = 0;
  const gaps = [];
  D.forEach(d => {
    const w = ideal.imp[d.id], t = ideal.tgt[d.id];
    if (!w) return;
    const s = DS[d.id][i], g = Math.max(0, t - s);
    num += w * g * g; den += w * t * t; ws += w * s; wsum += w;
    if (g > 0.05) gaps.push({ d, g, w, hard: w === 3 && g >= 10 });
  });
  const fit = den ? 100 * (1 - Math.sqrt(num / den)) : 100;
  return { fit, wavg: wsum ? ws / wsum : 0, gaps: gaps.sort((a, b) => b.w * b.g - a.w * a.g) };
}
const ranked = () => C.map((c, i) => ({ c, i, ...match(i) })).sort((a, b) => b.fit - a.fit || b.wavg - a.wavg);

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
const at = (i, n, rad) => [RG.cx + rad * Math.cos(ang(i, n)), RG.cy + rad * Math.sin(ang(i, n))];
const pathOf = vals => vals.map((v, i) => (i ? 'L' : 'M') + at(i, vals.length, RG.R * v / 100).map(r1).join(' ')).join('') + 'Z';

function radar({ id, dims, countries, ideal }) {
  const n = dims.length, { W, H, cx, cy, R } = RG;
  const summary = dims.map(d => `${d.name}：` + countries.map(c => `${c.name} ${f1(DS[d.id][cIdx(c.id)])}`).join('，')).join('；');
  const pr = compact() ? 6.5 : 4.4;
  let s = `<svg class="radar${compact() ? ' compact' : ''}" id="${id}" viewBox="0 0 ${W} ${H}" role="img" aria-label="雷达图，0–100 分。${esc(summary)}">`;
  s += `<path class="hl" d=""/>`;
  [20, 40, 60, 80, 100].forEach(v => { s += `<path class="ring${v === 100 ? ' outer' : ''}" d="${pathOf(dims.map(() => v))}"/>`; });
  dims.forEach((d, i) => { const [x, y] = at(i, n, R); s += `<line class="axis" data-i="${i}" x1="${cx}" y1="${cy}" x2="${r1(x)}" y2="${r1(y)}"/>`; });
  [20, 40, 60, 80, 100].forEach(v => { const [x, y] = at(0, n, R * v / 100); s += `<text class="tick" x="${r1(x + 6)}" y="${r1(y + (compact() ? 18 : 12))}">${v}</text>`; });
  if (ideal) {
    const vals = dims.map(d => ideal.imp[d.id] ? ideal.tgt[d.id] : 0);
    s += `<g class="ideal" style="--o:${cx}px ${cy}px"><path d="${pathOf(vals)}"/>${vals.map((v, i) => { const [x, y] = at(i, n, R * v / 100); return ideal.imp[dims[i].id] ? `<circle cx="${r1(x)}" cy="${r1(y)}" r="${compact() ? 5 : 3.5}"/>` : ''; }).join('')}</g>`;
  }
  countries.forEach(c => {
    const ci = cIdx(c.id), vals = dims.map(d => DS[d.id][ci]), p = pathOf(vals);
    s += `<g class="ser k-${c.id}" style="--o:${cx}px ${cy}px"><path class="area" d="${p}"/><path class="edge" d="${p}"/>${vals.map((v, i) => SHAPES[c.shape](...at(i, n, R * v / 100), pr)).join('')}</g>`;
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
    const aria = `${d.name}：` + countries.map(c => `${c.name} ${f1(DS[d.id][cIdx(c.id)])} 分`).join('，') + '。按回车查看指标';
    s += `<g class="lab-g" data-i="${i}" tabindex="0" role="button" aria-label="${esc(aria)}"><text class="lab" x="${r1(x)}" y="${r1(y + dy)}" text-anchor="${anchor}">${esc(d.name)}</text></g>`;
  });
  return s + '</svg>';
}

// One tooltip, driven by whichever radar is hovered. Axis wedges are the hit targets, so the reader compares all countries on one dimension at a time.
const tip = $('#tip');
function tipFor(box, i) {
  const ctx = box._ctx; if (!ctx) return;
  const d = ctx.dims[i];
  const rows = ctx.countries.map(c => ({ c, s: DS[d.id][cIdx(c.id)] })).sort((a, b) => b.s - a.s);
  const idl = ctx.ideal && ctx.ideal.imp[d.id] ? `<div class="r ideal">${'<i class="mk ideal" aria-hidden="true"></i>'}<span>你的目标 · ${IMP[ctx.ideal.imp[d.id]]}</span><b>${ctx.ideal.tgt[d.id]}</b></div>` : '';
  tip.innerHTML = `<h4>${esc(d.name)}<small>点击看 ${d.ind.length} 项指标</small></h4>${rows.map(r => `<div class="r">${mk(r.c)}<span>${r.c.name}</span><b>${f1(r.s)}</b></div>`).join('')}${idl}<p>${esc(d.q)}</p>`;
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
// Hovering a country anywhere (chip, tile, legend) brings its polygon forward on every radar.
document.addEventListener('pointerover', e => {
  const t = e.target.closest('[data-emph]');
  $$('.radar').forEach(r => t ? r.setAttribute('data-emph', t.dataset.emph) : r.removeAttribute('data-emph'));
});

const legend = (countries, withIdeal) => `<div class="legend" aria-hidden="true">${countries.map(c => `<span data-emph="${c.id}">${mk(c)}${c.name}</span>`).join('')}${withIdeal ? '<span><i class="mk ideal"></i>你的理想</span>' : ''}</div>`;

// ---------- overview ----------
function profile(cid, dims = D) {
  const i = cIdx(cid);
  const list = dims.map(d => ({ d, s: DS[d.id][i], rank: rankIn(d.id, cid) })).sort((a, b) => b.s - a.s);
  return { best: list.slice(0, 3), worst: list.slice(-3).reverse(), min: list[list.length - 1], lead: [...list].sort((a, b) => a.rank - b.rank || b.s - a.s).slice(0, 3) };
}
const rankOf = (scores, cid) => 1 + scores.filter(x => x.s > scores.find(y => y.c.id === cid).s).length;

// Key numbers per country, read straight from the data so the prose can never drift from the table.
function notesFor(cid) {
  const ratio = (a, b) => Math.round(a / b);
  const hrs = (a, b) => Math.round((raw('life', 'hrs', a) / raw('life', 'hrs', b) - 1) * 100);
  return {
    cn: {
      plus: [
        `<b>治安第 ${rankIn('safety', 'cn')}</b>：杀人率 ${val('safety', 'hom', 'cn')}/10 万，约为美国的 1/${ratio(raw('safety', 'hom', 'us'), raw('safety', 'hom', 'cn'))}；Gallup 法律与秩序 ${val('safety', 'lo', 'cn')}，四国最高。`,
        `<b>增长最快</b>：人均实际 GDP 2019–2025 年均 ${val('econ', 'gro', 'cn')}%，同期德国 ${val('econ', 'gro', 'de')}%。`,
        `<b>网和基建</b>：固定宽带 ${val('infra', 'fbb', 'cn')} Mbps、移动 ${val('infra', 'mob', 'cn')} Mbps，都是德国的 2 倍左右。`
      ],
      minus: [
        `<b>工作最累</b>：年均 ${val('life', 'hrs', 'cn')} 小时，比德国多 ${hrs('cn', 'de')}%；法定假 ${val('life', 'pto', 'cn')} 天。`,
        `<b>房价</b>：房价收入比 ${val('cost', 'pti', 'cn')} 年，是美国的 ${ratio(raw('cost', 'pti', 'cn'), raw('cost', 'pti', 'us'))} 倍。`,
        `<b>环境与治理</b>：PM2.5 ${val('env', 'pm', 'cn')} µg/m³，是 WHO 指导值的 ${ratio(raw('env', 'pm', 'cn'), 5)} 倍；自由之家 ${val('gov', 'fh', 'cn')} 分，WJP 法治 ${val('gov', 'wjp', 'cn')}。`
      ]
    },
    us: {
      plus: [
        `<b>收入最高</b>：人均 GDP（PPP）${val('econ', 'gdp', 'us')} 国际元，本地购买力 ${val('cost', 'lpp', 'us')}（纽约 = 100），房价收入比只有 ${val('cost', 'pti', 'us')} 年。`,
        `<b>网速最快</b>：固定宽带 ${val('infra', 'fbb', 'us')} Mbps，移动 ${val('infra', 'mob', 'us')} Mbps。`,
        `<b>大学天花板</b>：MIT 排第 ${val('edu', 'uni', 'us')}，QS 2027 上榜 184 所。`
      ],
      minus: [
        `<b>治安垫底</b>：杀人率 ${val('safety', 'hom', 'us')}/10 万，是德国的 ${f1(raw('safety', 'hom', 'us') / raw('safety', 'hom', 'de'))} 倍。`,
        `<b>没有法定带薪假</b>：联邦法律不强制任何带薪年假或节假日；年均工作 ${val('life', 'hrs', 'us')} 小时。`,
        `<b>医保缺口</b>：${f1(100 - raw('health', 'cov', 'us'))}% 人口无任何医保，人均医疗支出约 1.35 万美元，是德国的 2 倍多。`
      ]
    },
    nz: {
      plus: [
        `<b>治理与自由第 ${rankIn('gov', 'nz')}</b>：清廉指数 ${val('gov', 'cpi', 'nz')}、自由之家 ${val('gov', 'fh', 'nz')}、政府效能 ${val('gov', 'ge', 'nz')}。`,
        `<b>空气最好</b>：PM2.5 ${val('env', 'pm', 'nz')} µg/m³；医保覆盖 ${val('health', 'cov', 'nz')}%。`,
        `<b>最满意</b>：生活评价 ${val('life', 'whr', 'nz')}，四国最高（全球第 11）。`
      ],
      minus: [
        `<b>增长停滞</b>：人均实际 GDP 2019–2025 年均仅 ${val('econ', 'gro', 'nz')}%。`,
        `<b>年轻人难</b>：青年失业率 ${val('opp', 'yun', 'nz')}%；国内最好的大学排第 ${val('edu', 'uni', 'nz')}。`,
        `<b>治安感受一般</b>：Gallup 法律与秩序 ${val('safety', 'lo', 'nz')}，四国最低（被盗、夜间安全感拖累）。`
      ]
    },
    de: {
      plus: [
        `<b>最均衡</b>：十个维度里最弱的一项也有 ${f1(profile('de').min.s)} 分（${profile('de').min.d.name}）。`,
        `<b>医疗、工作与幸福第 1</b>：年均工作 ${val('life', 'hrs', 'de')} 小时，四国最短；每千人医生 ${val('health', 'doc', 'de')} 人。`,
        `<b>环境第 ${rankIn('env', 'de')}</b>：EPI 全球第 6（${val('env', 'epi', 'de')}）。`
      ],
      minus: [
        `<b>网速最慢</b>：固定宽带 ${val('infra', 'fbb', 'de')} Mbps，约为美国的 1/${ratio(raw('infra', 'fbb', 'us'), raw('infra', 'fbb', 'de'))}；移动 ${val('infra', 'mob', 'de')} Mbps。`,
        `<b>六年零增长</b>：人均实际 GDP 2019–2025 年均 ${val('econ', 'gro', 'de')}%。`,
        `<b>房子不便宜</b>：房价收入比 ${val('cost', 'pti', 'de')} 年，是美国的 ${f1(raw('cost', 'pti', 'de') / raw('cost', 'pti', 'us'))} 倍。`
      ]
    }
  }[cid];
}

function headline() {
  const all = C.map((c, i) => ({ c, s: overall(i, D) })).sort((a, b) => b.s - a.s);
  const top = all[0], cn = profile('cn');
  const pick = ids => { const ds = ids.map(dimById); return C.map((c, i) => ({ c, s: overall(i, ds) })).sort((a, b) => b.s - a.s); };
  const hard = pick(['safety', 'infra', 'econ']), soft = pick(['gov', 'env', 'life']);
  return {
    h1: [`十项等权：${top.c.name} ${f1(top.s)} 分第一，`, `最弱一项也有 ${f1(profile(top.c.id).min.s)} 分`],
    p: `${all.slice(1).map(x => `${x.c.name} ${f1(x.s)}`).join('、')}。中国的强项是${cn.lead.map(x => `${x.d.name}（第 ${x.rank}）`).join('、')}，短板是${cn.worst.map(x => `${x.d.name}（${f1(x.s)}）`).join('、')}。`,
    hard, soft
  };
}

function renderOverview() {
  const dims = D.filter(d => S.dims.includes(d.id));
  const vis = C.filter(c => S.on[c.id]);
  const cur = C.map((c, i) => ({ c, i, s: overall(i, dims) }));
  const H = headline();
  const top = Object.fromEntries(D.map(d => [d.id, Math.max(...DS[d.id])]));
  const [pa, pb] = S.pair.map(cIdx);
  const diffs = D.map(d => ({ d, x: DS[d.id][pa] - DS[d.id][pb] })).sort((a, b) => Math.abs(b.x) - Math.abs(a.x));
  const maxd = Math.max(...diffs.map(x => Math.abs(x.x)), 1);
  const segPair = k => `<div class="seg sm" role="radiogroup" aria-label="${k ? '对比国 B' : '对比国 A'}">${C.map(c => `<button role="radio" aria-checked="${S.pair[k] === c.id}" data-pair="${k}" data-c="${c.id}" ${S.pair[1 - k] === c.id ? 'disabled' : ''}>${c.name}</button>`).join('')}</div>`;
  const A = C[pa], B = C[pb];

  $('#v-overview').innerHTML = `
    <div class="lead">
      <div class="eyebrow">第一版 · 4 国 × 10 维 × ${D.reduce((s, d) => s + d.ind.length, 0)} 项公开指标</div>
      <h1>${H.h1.map(t => `<span class="cl">${esc(t)}</span>`).join('')}</h1>
      <p>${esc(H.p)}</p>
    </div>
    <div class="tiles">${cur.map(x => {
      const pf = profile(x.c.id, dims);
      return `<div class="tile ${S.on[x.c.id] ? '' : 'off'}" data-emph="${x.c.id}">
        <div class="hd">${mk(x.c)}${x.c.name}<small>第 ${rankOf(cur, x.c.id)} / 4</small></div>
        <div class="big">${f1(x.s)}<small>${dims.length === D.length ? '十项等权' : `已选 ${dims.length} 项等权`}</small></div>
        <div class="sw"><span>最强 <b>${pf.best[0].d.name} ${f1(pf.best[0].s)}</b></span><span>最弱 <b>${pf.worst[0].d.name} ${f1(pf.worst[0].s)}</b></span></div>
      </div>`;
    }).join('')}</div>
    <div class="ov">
      <div style="display:grid;gap:12px;min-width:0">
        <div class="chart">
        <div class="ctl">
          <div class="ctl-row"><span>国家</span><div class="chips">${C.map(c => `<button class="chip" aria-pressed="${!!S.on[c.id]}" data-on="${c.id}" data-emph="${c.id}">${mk(c)}${c.name}</button>`).join('')}
            <button class="chip" aria-pressed="${S.showIdeal}" id="tg-ideal"><i class="mk ideal" aria-hidden="true"></i>叠加我的理想</button></div></div>
          <div class="ctl-row"><span>维度</span><div class="chips">${D.map(d => `<button class="chip" aria-pressed="${S.dims.includes(d.id)}" data-dim="${d.id}">${d.name}</button>`).join('')}
            ${dims.length < D.length ? '<button class="chip" id="dims-all">全选</button>' : ''}</div></div>
        </div>
        <div class="radar-box" id="rb-ov">${radar({ id: 'radar-ov', dims, countries: vis, ideal: S.showIdeal ? S.ideal : null })}</div>
        ${legend(vis, S.showIdeal)}
      </div>
        <div class="callout">
          <b>排名取决于你看重什么</b>
          <p>只看治安、基建、经济三项：${H.hard.map(x => `${x.c.name} ${f1(x.s)}`).join(' › ')}。<br>只看治理与自由、环境、工作与幸福三项：${H.soft.map(x => `${x.c.name} ${f1(x.s)}`).join(' › ')}。</p>
          <p><a href="#ideal" data-go="ideal">到“理想生活”按你的权重重新排 →</a></p>
        </div>
      </div>
      <div class="tbl-wrap">
          <table class="score-tbl">
            <caption class="eyebrow" style="text-align:left;padding:12px 12px 0">维度得分（0–100）· 点击一行看指标</caption>
            <thead><tr><th>维度</th>${C.map(c => `<th class="n"><span class="th-c">${mk(c)}${c.name}</span></th>`).join('')}</tr></thead>
            <tbody>${D.map(d => `<tr data-open="${d.id}" class="${S.dims.includes(d.id) ? '' : 'off'}"><td class="dn">${d.name}<small>${d.ind.length} 项指标</small></td>${C.map((c, i) => `<td class="n"><span class="sc ${DS[d.id][i] === top[d.id] ? 'hi' : ''}">${f1(DS[d.id][i])}</span></td>`).join('')}</tr>`).join('')}</tbody>
            <tfoot><tr><td>综合<small style="display:block;font:400 11.5px var(--f-body);color:var(--faint)">${dims.length === D.length ? '十项等权' : `已选 ${dims.length} 项`}</small></td>${cur.map(x => `<td class="n"><span class="sc ${x.s === Math.max(...cur.map(y => y.s)) ? 'hi' : ''}">${f1(x.s)}</span></td>`).join('')}</tr></tfoot>
          </table>
      </div>
    </div>
    <div class="ov">
      <div class="panel">
        <h3>四国画像<small>数字全部来自“维度详解”里的原始指标</small></h3>
        <div class="find" style="margin-top:12px">${C.map(c => { const n = notesFor(c.id); return `<div class="fc" data-emph="${c.id}">
          <h4>${mk(c)}${c.name}</h4>
          ${n.plus.map(t => `<div class="pm"><em>强</em><span>${t}</span></div>`).join('')}
          ${n.minus.map(t => `<div class="pm"><em>弱</em><span>${t}</span></div>`).join('')}
        </div>`; }).join('')}</div>
      </div>
      <div class="panel">
        <h3>两两对比<small>按分差从大到小</small></h3>
        <div class="ctl" style="margin-top:10px">
          <div class="ctl-row"><span>A</span>${segPair(0)}</div>
          <div class="ctl-row"><span>B</span>${segPair(1)}</div>
        </div>
        <div class="pair" role="table" aria-label="${A.name}减${B.name}的维度分差">
          <div class="pair-h" role="row"><span></span><div><span>${mk(B)}${B.name}更好</span><span>${A.name}更好${mk(A)}</span></div><span></span></div>
          ${diffs.map(({ d, x }) => { const w = Math.abs(x) / maxd * 50; const c = x >= 0 ? A : B; return `<div class="pr k-${c.id}" role="row"><span role="cell">${d.name}</span><div class="tr" role="cell" aria-label="${x >= 0 ? A.name : B.name}高 ${f1(Math.abs(x))} 分"><i class="${x >= 0 ? 'r' : 'l'}" style="width:${w.toFixed(2)}%"></i></div><b role="cell">${minus((x > 0 ? '+' : '') + f1(x))}</b></div>`; }).join('')}
        </div>
      </div>
    </div>`;
  wireRadar($('#rb-ov'), { dims, countries: vis, ideal: S.showIdeal ? S.ideal : null });
}

// ---------- dimension detail ----------
function renderDims() {
  const d = dimById(S.dim);
  const best = Object.fromEntries(d.ind.map(ind => [ind.id, Math.max(...IS[d.id][ind.id])]));
  const order = C.map((c, i) => ({ c, s: DS[d.id][i] })).sort((a, b) => b.s - a.s);
  $('#v-dims').innerHTML = `
    <div class="seg" role="radiogroup" aria-label="选择维度" style="justify-self:start">${D.map(x => `<button role="radio" aria-checked="${x.id === d.id}" data-pick="${x.id}">${x.name}</button>`).join('')}</div>
    <div class="dhead">
      <div class="lead"><div class="eyebrow">维度 ${D.indexOf(d) + 1} / ${D.length} · ${d.ind.length} 项指标等权平均</div><h1>${d.name}<small>${d.en}</small></h1><p>${esc(d.q)}</p></div>
      <div class="bars" role="list" aria-label="${d.name}维度得分">${order.map(x => `<div class="bar k-${x.c.id}" role="listitem" data-emph="${x.c.id}"><span>${mk(x.c)}${x.c.name}</span><div class="tr"><i style="width:${x.s.toFixed(1)}%"></i></div><b>${f1(x.s)}</b></div>`).join('')}</div>
    </div>
    <div class="tbl-wrap">
      <table class="ind-tbl">
        <thead><tr><th>指标</th>${C.map(c => `<th><span class="th-c">${mk(c)}${c.name}</span></th>`).join('')}<th>0 分 → 100 分</th><th>来源</th></tr></thead>
        <tbody>${d.ind.map(ind => `<tr>
          <td class="in"><b>${esc(ind.name)}</b><small>${esc(ind.unit)} · ${ind.b > ind.w ? '越高越好' : '越低越好'}${ind.log ? ' · 对数刻度' : ''}</small></td>
          ${C.map((c, i) => { const sc = IS[d.id][ind.id][i]; return `<td><div class="cell k-${c.id} ${sc === best[ind.id] ? 'best' : ''}"><b>${fmtV(ind, ind.v[i])}<small>${Array.isArray(ind.yr) ? ind.yr[i] : ''}</small></b><div class="mini"><i style="width:${sc.toFixed(1)}%"></i></div><span>${f1(sc)} 分</span></div></td>`; }).join('')}
          <td class="gp">${fmtV(ind, ind.w)} → ${fmtV(ind, ind.b)}</td>
          <td class="src"><a href="${SRC[ind.src][1]}" target="_blank" rel="noopener">${esc(SRC[ind.src][0])}</a><br>${Array.isArray(ind.yr) ? '年份见数值' : esc(ind.yr)}</td>
        </tr>`).join('')}</tbody>
      </table>
    </div>
    ${d.ind.some(x => x.note) ? `<div class="panel"><h3>读数注意<small>口径、年份与偏差</small></h3><ul class="notes" style="margin-top:8px">${d.ind.filter(x => x.note).map(x => `<li><b>${esc(x.name)}</b><span>${esc(x.note)}</span></li>`).join('')}</ul></div>` : ''}`;
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
  return `
    <div class="eyebrow">理想生活 · 当前设定：${esc(name)}${S.ideal.example ? ' · 示例' : ''}</div>
    <h1><span class="cl">按你的设定，最接近的是${a.c.name}，</span><span class="cl">匹配度 ${f1(a.fit)}</span></h1>
    <p>${a.c.name}领先第二名${b.c.name} ${f1(a.fit - b.fit)} 分。${tail}${hard.length ? '，其中有你标为“必须”的硬伤' : ''}。${S.ideal.example ? '下面是“成家育儿”的示例设定，点任一选项就换成你自己的。' : ''}</p>`;
}
function idealSide() {
  const r = ranked(), vis = C;
  return `
    <div class="chart">
      <div class="ph">你的理想 vs 四国<small>虚线是你的目标，“不在乎”的维度画在 0</small></div>
      <div class="radar-box" id="rb-idl">${radar({ id: 'radar-idl', dims: D, countries: vis, ideal: S.ideal })}</div>
      ${legend(vis, true)}
    </div>
    <div class="panel">
      <div class="ph">匹配度排名<small>100 = 每个关心的维度都达标</small></div>
      <div class="matches" style="margin-top:6px">${r.map((x, k) => `<div class="m k-${x.c.id}" data-emph="${x.c.id}">
        <span class="rk">${k + 1}</span>
        <span class="nm">${mk(x.c)}${x.c.name}</span>
        <span class="fit">${f1(x.fit)}<small>/100</small></span>
        <div class="mt"><i style="width:${x.fit.toFixed(1)}%"></i></div>
        <div class="gaps">${x.gaps.length ? x.gaps.slice(0, 5).map(g => `<span class="gap ${g.hard ? 'hard' : ''}">${g.hard ? I.warn + '硬伤 · ' : ''}${g.d.name} −${f1(g.g)}</span>`).join('') + (x.gaps.length > 5 ? `<span class="gap">另 ${x.gaps.length - 5} 项</span>` : '') : '<span class="gap ok">关心的维度全部达标</span>'}</div>
      </div>`).join('')}</div>
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
    <div class="panel" style="padding:0;border:0;background:none">
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
      </div>
    </div>`;
}
function renderIdeal() {
  $('#v-ideal').innerHTML = `<div class="lead" id="idl-lead">${idealLead()}</div><div class="idl"><div style="display:grid;gap:14px;min-width:0" id="idl-left">${idealLeft()}</div><div class="idl-side" id="idl-side">${idealSide()}</div></div>`;
  wireRadar($('#rb-idl'), { dims: D, countries: C, ideal: S.ideal });
}
function refreshIdealOut() {
  $('#idl-lead').innerHTML = idealLead();
  $('#idl-side').innerHTML = idealSide();
  wireRadar($('#rb-idl'), { dims: D, countries: C, ideal: S.ideal });
}
function touched() {
  S.ideal.example = false;
  if (S.ideal.preset) S.ideal.preset = null;
  saveIdeal();
}

// ---------- method ----------
function renderMethod() {
  const limits = [
    ['维度和权重是一种选择', '换一组维度或权重，排名就会变（总览里有两个反例）。所以这里不给“最好的国家”，只给你在自己权重下的匹配度。'],
    ['国家均值掩盖内部差异', '上海和甘肃、旧金山和密西西比，差距可能大过国与国之间。第一版只做国家层面。'],
    ['统计口径不完全可比', '杀人率年份不同（中国最新 2020）；医保覆盖率四国口径不同；Gallup 中国样本为网络问卷。'],
    ['调查型指数带主观成分', '清廉指数、自由之家、WJP、Gallup、幸福报告都依赖问卷或专家打分，评估机构的立场会影响结果，尤其是对中国的评估。'],
    ['众包数据样本偏差', 'Numbeo 购买力和房价收入比来自用户提交，偏向大城市和外籍人士；Ookla 网速来自用户自测。'],
    ['以“本国居民”为视角', '没有计入签证难度、语言、华人社区、种族歧视、汇率等移居者特有的因素。'],
    ['部分数据较旧', '社会流动性指数只有 2020 年一版；LPI 为 2023 年版。']
  ];
  $('#v-method').innerHTML = `
    <div class="lead"><div class="eyebrow">方法与来源</div><h1>每个分数怎么来的</h1><p>原始数据 → 按全球区间换算成 0–100 → 维度内等权平均 → 维度间等权（或按你的理想权重）。所有原始值、区间和来源都列在下面，可以逐项核对。</p></div>
    <div class="prose">
      <p><b>1. 指标换算。</b>每个指标设一个“0 分”和“100 分”的区间端点，端点取全球大致的底部和前沿水平，所以 100 分不是“四国最高”，而是接近世界前沿。超出区间按 0 或 100 截断。收入、网速、杀人率、房价收入比、大学排名这类跨数量级的指标用对数刻度。</p>
      <div class="formula">线性：分数 = 100 ×（值 − 0 分端点）÷（100 分端点 − 0 分端点）　　对数：分数 = 100 ×（ln 值 − ln 0 分端点）÷（ln 100 分端点 − ln 0 分端点）</div>
      <p><b>2. 维度分。</b>维度内各指标等权平均。<b>3. 综合分。</b>所选维度等权平均。</p>
      <p><b>4. 理想匹配度。</b>你为每个维度设重要程度 w（不在乎 0 · 一般 1 · 重要 2 · 必须 3）和目标分 t。缺口 = max(0, t − 国家得分)。</p>
      <div class="formula">匹配度 = 100 ×（1 − √( Σ w·缺口² ÷ Σ w·t² )）</div>
      <p>超过目标不加分，避免某一项特别强掩盖你在意的短板；缺口平方让一个大缺口比多个小缺口扣分更多。</p>
    </div>
    <div class="tbl-wrap">
      <table class="gp-tbl">
        <caption class="eyebrow" style="text-align:left;padding:12px 12px 0">全部 ${D.reduce((s, d) => s + d.ind.length, 0)} 项指标的区间与来源</caption>
        <thead><tr><th>维度</th><th>指标</th><th>单位</th><th class="n">0 分</th><th class="n">100 分</th><th>刻度</th><th>年份</th><th>来源</th></tr></thead>
        <tbody>${D.map(d => d.ind.map((ind, k) => `<tr><td>${k ? '' : `<b>${d.name}</b>`}</td><td>${esc(ind.name)}</td><td>${esc(ind.unit)}</td><td class="n">${fmtV(ind, ind.w)}</td><td class="n">${fmtV(ind, ind.b)}</td><td>${ind.log ? '对数' : '线性'}</td><td>${Array.isArray(ind.yr) ? C.map((c, i) => `${c.name} ${ind.yr[i]}`).join(' · ') : esc(ind.yr)}</td><td><a href="${SRC[ind.src][1]}" target="_blank" rel="noopener">${esc(SRC[ind.src][0])}</a></td></tr>`).join('')).join('')}</tbody>
      </table>
    </div>
    <div class="panel"><h3>局限<small>读结论前先读这里</small></h3><ul class="limits" style="margin-top:10px">${limits.map(([b, t]) => `<li><span><b>${b}。</b>${t}</span></li>`).join('')}</ul></div>`;
}

// ---------- views ----------
function setView(v) {
  if (!VIEWS.includes(v)) v = 'overview';
  S.view = v;
  $$('#nav button').forEach(b => b.setAttribute('aria-selected', b.dataset.v === v));
  VIEWS.forEach(x => { $('#v-' + x).hidden = x !== v; });
  hideTip();
  ({ overview: renderOverview, dims: renderDims, ideal: renderIdeal, method: renderMethod })[v]();
  $('#main').scrollTop = 0;
  try { history.replaceState(null, '', '#' + v); } catch { }
}

// ---------- events ----------
document.addEventListener('click', e => {
  const t = e.target.closest('button,a,tr[data-open]');
  if (!t) return;
  const ds = t.dataset;
  if (ds.v) return setView(ds.v);
  if (ds.go) { e.preventDefault(); return setView(ds.go); }
  if (ds.open) return openDim(ds.open);
  if (ds.on) {
    const next = { ...S.on, [ds.on]: !S.on[ds.on] };
    if (!C.some(c => next[c.id])) return;
    S.on = next; lsSet('on', S.on); return renderOverview();
  }
  if (t.id === 'tg-ideal') { S.showIdeal = !S.showIdeal; lsSet('showIdeal', S.showIdeal); return renderOverview(); }
  if (ds.dim) {
    const has = S.dims.includes(ds.dim);
    if (has && S.dims.length <= 3) return;
    S.dims = has ? S.dims.filter(x => x !== ds.dim) : D.map(d => d.id).filter(id => S.dims.includes(id) || id === ds.dim);
    lsSet('dims', S.dims); return renderOverview();
  }
  if (t.id === 'dims-all') { S.dims = D.map(d => d.id); lsSet('dims', S.dims); return renderOverview(); }
  if (ds.pair != null && ds.c) { S.pair[+ds.pair] = ds.c; lsSet('pair', S.pair); return renderOverview(); }
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
document.addEventListener('input', e => {
  const t = e.target; if (!t.dataset.tgt) return;
  S.ideal.tgt[t.dataset.tgt] = +t.value; touched();
  $('#tv-' + t.dataset.tgt).textContent = t.value;
  $$('[data-preset]').forEach(b => b.setAttribute('aria-checked', 'false'));
  refreshIdealOut();
});
addEventListener('hashchange', () => { const v = location.hash.slice(1); if (VIEWS.includes(v) && v !== S.view) setView(v); });
let wasCompact = compact();
addEventListener('resize', () => { if (compact() !== wasCompact) { wasCompact = compact(); setGeom(); setView(S.view); } });
$('#main').addEventListener('scroll', () => hideTip(), { passive: true });

setView(VIEWS.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'overview');
