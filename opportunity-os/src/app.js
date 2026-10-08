// 机会猎手 OS · map, opportunity score, panels. DATA (src/data.js) and GEO (src/geo.js) are inlined by build.mjs.
const $ = s => document.querySelector(s);
const C = DATA.countries, BY = Object.fromEntries(C.map(c => [c.k, c]));
const YRS = DATA.meta.years, Y0 = YRS[0], NOW = DATA.meta.now, iNOW = NOW - Y0;
const TH = DATA.themes, CLS = DATA.classes, SRC = DATA.sources, HS = DATA.meta.hs;
const INC = { 1: '低收入', 2: '中低收入', 3: '中高收入', 4: '高收入' };
const BIG = 100;  // USD bn: "major economy" cut-off used in the overview and default ranking
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const esc = s => String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));

const store = {
  get(k, d) { try { const v = localStorage.getItem('hunter.' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('hunter.' + k, JSON.stringify(v)); } catch { /* storage unavailable */ } },
};

// ---------------------------------------------------------------- formatting
const sgn = (x, d = 1) => x == null || !isFinite(x) ? '—' : (x > 0 ? '+' : x < 0 ? '−' : '') + Math.abs(x).toFixed(d);
const pc = (x, d = 1) => x == null || !isFinite(x) ? '—' : (x < 0 ? '−' : '') + Math.abs(x).toFixed(d) + '%';
const fmtGDP = bn => bn == null ? '—' : bn >= 1000 ? (bn / 1000).toFixed(bn >= 10000 ? 1 : 2) + ' 万亿美元' : Math.round(bn * 10).toLocaleString() + ' 亿美元';
const fmtUSD = v => v == null ? '—' : '$' + Math.round(v).toLocaleString();
const fmtPop = m => m == null ? '—' : m >= 100 ? (m / 100).toFixed(2) + ' 亿' : Math.round(m * 100).toLocaleString() + ' 万';
const g26 = c => c.g[iNOW];
const fmtBn = (bn, signed = false) => {  // USD bn -> 亿美元 / 万亿美元
  if (bn == null || !isFinite(bn)) return '—';
  const s = signed ? (bn > 0 ? '+' : bn < 0 ? '−' : '') : bn < 0 ? '−' : '', a = Math.abs(bn);
  return s + (a >= 1000 ? (a / 1000).toFixed(2) + ' 万亿美元' : Math.round(a * 10).toLocaleString() + ' 亿美元');
};

// ---------------------------------------------------------------- opportunity score
// Each component is a percentile rank (0–100) across all economies with data; the score is their weighted mean.
const COMP = [
  { k: 'growth', zh: '增长动能', f: c => c.g5, dir: 1, ind: '2026–2030 年实际 GDP 年均增速', src: 'IMF WEO 2026.4', raw: c => pc(c.g5) },
  { k: 'size', zh: '市场规模', f: c => c.gdp > 0 ? Math.log(c.gdp) : null, dir: 1, ind: '2026 年名义 GDP（美元，取对数）', src: 'IMF WEO 2026.4', raw: c => fmtGDP(c.gdp) },
  { k: 'demo', zh: '人口动能', f: c => c.popg, dir: 1, ind: '2026–2031 年人口年均增速', src: 'IMF WEO 2026.4', raw: c => pc(c.popg, 2) },
  { k: 'price', zh: '物价稳定', f: c => c.infl == null ? null : Math.abs(c.infl - 2.5), dir: -1, ind: '2026 年通胀与 2.5% 的距离', src: 'IMF WEO 2026.4', raw: c => pc(c.infl) },
  { k: 'fiscal', zh: '财政空间', f: c => c.debt, dir: -1, ind: '2026 年政府总债务 / GDP', src: 'IMF WEO 2026.4', raw: c => pc(c.debt, 0) },
  { k: 'ext', zh: '外部平衡', f: c => c.ca, dir: 1, ind: '2026 年经常账户余额 / GDP', src: 'IMF WEO 2026.4', raw: c => pc(c.ca) },
  { k: 'law', zh: '法治', f: c => c.wb?.rl?.[0], dir: 1, ind: '法治指数（−2.5 至 +2.5）', src: '世界银行 WGI 2025', raw: c => c.wb?.rl ? sgn(c.wb.rl[0], 2) : '—' },
];
const PRESETS = {
  balanced: { zh: '均衡', w: { growth: 25, size: 15, demo: 10, price: 15, fiscal: 10, ext: 10, law: 15 } },
  growth: { zh: '成长优先', w: { growth: 40, size: 10, demo: 20, price: 10, fiscal: 5, ext: 5, law: 10 } },
  steady: { zh: '稳健优先', w: { growth: 15, size: 20, demo: 5, price: 20, fiscal: 15, ext: 10, law: 15 } },
};
function pctRank(pairs) {  // average rank for ties, scaled to 0–100
  const s = pairs.filter(d => d[1] != null && isFinite(d[1])).sort((a, b) => a[1] - b[1]), n = s.length, out = {};
  for (let i = 0; i < n;) {
    let j = i; while (j + 1 < n && s[j + 1][1] === s[i][1]) j++;
    for (let t = i; t <= j; t++) out[s[t][0]] = n > 1 ? (i + j) / 2 / (n - 1) * 100 : 50;
    i = j + 1;
  }
  return out;
}
const PCT = Object.fromEntries(COMP.map(m => {
  const p = pctRank(C.map(c => [c.k, m.f(c)]));
  if (m.dir < 0) for (const k in p) p[k] = 100 - p[k];
  return [m.k, p];
}));

const validW = w => w && COMP.every(m => Number.isFinite(w[m.k]) && w[m.k] >= 0 && w[m.k] <= 50) ? w : null;
const S = {
  mode: ['score', 'stage', 'growth', 'theme', 'flow'].includes(store.get('mode')) ? store.get('mode') : 'score',
  theme: TH[store.get('theme')] ? store.get('theme') : 'ai',
  w: validW(store.get('w')) || { ...PRESETS.balanced.w },
  rf: ['big', 'prof', 'all'].includes(store.get('rf')) ? store.get('rf') : 'big',
  reg: store.get('reg', ''), sel: null, tab: 'sum',
};
let SC = {}, RANK = {}, NRANK = 0;
function computeScores() {
  const tot = COMP.reduce((s, m) => s + S.w[m.k], 0) || 1;
  SC = {};
  for (const c of C) {
    let s = 0, ws = 0, n = 0;
    for (const m of COMP) { const v = PCT[m.k][c.k]; if (v != null) { s += v * S.w[m.k]; ws += S.w[m.k]; n++; } }
    SC[c.k] = PCT.growth[c.k] != null && n >= 5 && ws > tot * 0.5 ? s / ws : null;
  }
  const order = C.filter(c => SC[c.k] != null).sort((a, b) => SC[b.k] - SC[a.k]);
  RANK = Object.fromEntries(order.map((c, i) => [c.k, i + 1])); NRANK = order.length;
}
const presetName = () => Object.entries(PRESETS).find(([, p]) => COMP.every(m => p.w[m.k] === S.w[m.k]))?.[1].zh || '自定义';
const fmtScore = k => SC[k] == null ? '—' : Math.round(SC[k]);

// ---------------------------------------------------------------- themes
function roleOf(c, t) {  // 3 hot, 2 high-growth, 1 mature, 0 profiled but not involved, -1 no profile
  const p = c.p; if (!p) return -1;
  if (p.hot.some(r => r[1] === t)) return 3;
  if (p.growth.some(r => r[1] === t)) return 2;
  if (p.mature.some(r => r[1] === t)) return 1;
  return 0;
}
const PROF = C.filter(c => c.p);
const THEME_STATS = Object.keys(TH).map(t => ({
  t, hot: PROF.filter(c => c.p.hot.some(r => r[1] === t)), grow: PROF.filter(c => c.p.growth.some(r => r[1] === t)),
  mat: PROF.filter(c => c.p.mature.some(r => r[1] === t)),
})).sort((a, b) => b.hot.length - a.hot.length || b.grow.length - a.grow.length);
const hotThemes = c => c.p ? [...new Set(c.p.hot.map(r => r[1]))] : [];
const tpill = t => `<span class="pill th">${TH[t]}</span>`;

// ---------------------------------------------------------------- geometry
// d3 treats rings as spherical: a ring wound the "wrong" way covers the rest of the globe, so flip those polygons.
const rewind = f => {
  const g = f.geometry, polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
  for (const rings of polys) if (d3.geoArea({ type: 'Polygon', coordinates: rings }) > 2 * Math.PI) rings.forEach(r => r.reverse());
  return f;
};
const feats = topojson.feature(GEO, GEO.objects.c).features.filter(f => f.geometry).map(rewind);
const featsBy = d3.group(feats, f => f.properties.k);
const mainPoly = k => {  // largest polygon, so France means metropolitan France
  let best = null, area = -1;
  for (const f of featsBy.get(k) || []) {
    const polys = f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates : [f.geometry.coordinates];
    for (const c of polys) { const p = { type: 'Polygon', coordinates: c }, a = d3.geoArea(p); if (a > area) { area = a; best = p; } }
  }
  return best;
};
const svg = d3.select('#map'), root = svg.append('g'), gGrat = root.append('path').attr('class', 'grat'),
  gC = root.append('g').attr('class', 'ctry'), gDots = root.append('g').attr('class', 'dots'), gFlow = root.append('g').attr('class', 'flows');
let projection, path, W = 0, H = 0;
const zoom = d3.zoom().scaleExtent([1, 14]).on('zoom', e => {
  root.attr('transform', e.transform);
  gDots.selectAll('circle').attr('r', 2.4 / e.transform.k);
  scaleFlowMarks(e.transform.k);
});
svg.call(zoom).on('dblclick.zoom', null);

function layout() {
  const el = $('#stage'); W = el.clientWidth; H = el.clientHeight;
  if (!W || !H) return;
  svg.attr('viewBox', `0 0 ${W} ${H}`);
  const bottom = $('#themes').offsetHeight + 22;
  projection = d3.geoNaturalEarth1().fitExtent([[10, 10], [W - 10, H - bottom]], { type: 'FeatureCollection', features: feats });
  path = d3.geoPath(projection);
  gGrat.attr('d', path(d3.geoGraticule().step([30, 30])()));
  gC.selectAll('path').data(feats).join('path').attr('d', path)
    .classed('nd', f => !BY[f.properties.k])
    .on('pointermove', (e, f) => showTip(e, BY[f.properties.k] ? tipHtml(BY[f.properties.k]) : `<b>${esc(f.properties.n)}</b><div class="r"><span>无 IMF 数据</span><span></span></div>`))
    .on('pointerleave', hideTip)
    .on('click', (e, f) => { if (BY[f.properties.k]) select(f.properties.k); });
  const k = d3.zoomTransform(svg.node()).k;
  gDots.selectAll('circle').data(PROF.filter(c => featsBy.get(c.k))).join('circle')
    .attr('cx', c => projection(d3.geoCentroid(mainPoly(c.k)))[0]).attr('cy', c => projection(d3.geoCentroid(mainPoly(c.k)))[1]).attr('r', 2.4 / k);
  drawFlows();
  paint();
}

// ---------------------------------------------------------------- capital flows layer
// Arcs follow great circles (so Tokyo→US crosses the Pacific); circles are net foreign flows into one market.
const FL = DATA.flows, FTYPE_DASH = { state: '9 4', port: '2 5', fdi: '1 3' };
const LABEL_LEFT = new Set(['KOR', 'IND']);  // keep neighbouring labels apart
const geoC = k => d3.geoCentroid(mainPoly(k));
const maxLink = d3.max(FL.links, l => l[2]), maxNode = d3.max(FL.nodes, n => Math.abs(n[1]));
const linkW = a => 1.2 + Math.sqrt(a / maxLink) * 7, nodeR = a => 4 + Math.sqrt(Math.abs(a) / maxNode) * 18;
function drawFlows() {
  const k = d3.zoomTransform(svg.node()).k;
  gFlow.selectAll('path').data(FL.links).join('path')
    .attr('d', l => path({ type: 'LineString', coordinates: [geoC(l[0]), geoC(l[1])] }))
    .attr('class', l => 't-' + l[3]).attr('stroke-width', l => linkW(l[2])).attr('stroke-dasharray', l => FTYPE_DASH[l[3]])
    .on('pointermove', (e, l) => showTip(e, linkTip(l))).on('pointerleave', hideTip)
    .on('click', (e, l) => select(l[1]));
  gFlow.selectAll('circle.end').data(FL.links).join('circle').attr('class', 'end')
    .attr('cx', l => projection(geoC(l[1]))[0]).attr('cy', l => projection(geoC(l[1]))[1]);
  const nodes = gFlow.selectAll('g.node').data(FL.nodes, n => n[0]).join(enter => {
    const g = enter.append('g').attr('class', 'node');
    g.append('circle'); g.append('text');
    return g;
  }).classed('out', n => n[1] < 0)
    .attr('transform', n => `translate(${projection(geoC(n[0]))})`)
    .on('pointermove', (e, n) => showTip(e, nodeTip(n))).on('pointerleave', hideTip)
    .on('click', (e, n) => select(n[0]));
  nodes.select('text').text(n => `${BY[n[0]].zh} ${fmtBn(n[1], true).replace('美元', '')}`);
  scaleFlowMarks(k);
}
function scaleFlowMarks(k) {
  gFlow.selectAll('circle.end').attr('r', 3 / k);
  gFlow.selectAll('g.node circle').attr('r', n => nodeR(n[1]) / k);
  gFlow.selectAll('g.node text').attr('text-anchor', n => LABEL_LEFT.has(n[0]) ? 'end' : 'start')
    .attr('x', n => (LABEL_LEFT.has(n[0]) ? -1 : 1) * (nodeR(n[1]) + 4) / k).attr('y', 4 / k).style('font-size', `${11.5 / k}px`).style('stroke-width', `${3 / k}px`);
}
function linkTip(l) {
  return `<b>${esc(BY[l[0]].zh)} → ${esc(BY[l[1]].zh)}</b>${row('类型', FL.types[l[3]])}${row('规模', fmtBn(l[2]))}${row('时段', esc(l[5]))}<div class="note" style="margin-top:4px">${esc(l[4])}</div>`;
}
function nodeTip(n) {
  return `<b>${esc(BY[n[0]].zh)} · 外资${n[1] >= 0 ? '净流入' : '净流出'}</b>${row('规模', fmtBn(n[1], true))}${row('时段', esc(n[3]))}<div class="note" style="margin-top:4px">${esc(n[2])}</div>`;
}
function zoomTo(k) {
  const poly = mainPoly(k); if (!poly) return;
  const [[x0, y0], [x1, y1]] = path.bounds(poly), bottom = $('#themes').offsetHeight + 22;
  const s = Math.max(1, Math.min(5, 0.42 / Math.max((x1 - x0) / W, (y1 - y0) / (H - bottom))));
  const t = d3.zoomIdentity.translate(W / 2 - s * (x0 + x1) / 2, (H - bottom) / 2 - s * (y0 + y1) / 2).scale(s);
  (reduced ? svg : svg.transition().duration(650)).call(zoom.transform, t);
}

// ---------------------------------------------------------------- colour
const SEQ_TH = [35, 45, 52, 58, 65, 72], GROW_TH = [0, 1.5, 2.5, 3.5, 5, 7];
const DIV = ['--div-neg3', '--div-neg2', '--div-neg1', '--div-mid', '--div-pos1', '--div-pos2', '--div-pos3'];
const binOf = (v, th) => { const i = th.findIndex(t => v < t); return i < 0 ? th.length : i; };
const seq = t => d3.interpolateLab(css('--seq-lo'), css('--seq-hi'))(t);
const STAGE_T = { 1: 0.14, 2: 0.42, 3: 0.7, 4: 0.97 };
const ROLE_VAR = { 3: '--th-hot', 2: '--th-grow', 1: '--th-mat', 0: '--th-base', '-1': '--nodata' };
const CA_TH = [-6, -3, -1, 1, 3, 6];
function fillFor(c) {
  if (!c) return css('--nodata');
  if (S.mode === 'score') return SC[c.k] == null ? css('--nodata') : seq(binOf(SC[c.k], SEQ_TH) / 6);
  if (S.mode === 'stage') return c.inc ? seq(STAGE_T[c.inc]) : css('--nodata');
  if (S.mode === 'growth') return g26(c) == null ? css('--nodata') : css(DIV[binOf(g26(c), GROW_TH)]);
  if (S.mode === 'flow') return c.ca == null ? css('--nodata') : css(DIV[binOf(c.ca, CA_TH)]);
  return css(ROLE_VAR[roleOf(c, S.theme)]);
}
function paint() {
  gC.selectAll('path').attr('fill', f => fillFor(BY[f.properties.k])).classed('sel', f => f.properties.k === S.sel);
  gC.selectAll('path.sel').raise();
  const lg = $('#legend'), dotk = '<div class="dotk"><i></i>圆点 = 有产业画像的 50 个经济体</div>';
  if (S.mode === 'score') {
    lg.innerHTML = `<b>机会评分 · ${presetName()}权重</b><div class="ramp">${d3.range(7).map(i => `<i style="background:${seq(i / 6)}"></i>`).join('')}</div>
      <div class="lab num"><span>&lt;35</span><span>50</span><span>&gt;72</span></div>${dotk}`;
  } else if (S.mode === 'stage') {
    lg.innerHTML = `<b>发展阶段 · 世界银行收入分组</b><div class="keys">${[4, 3, 2, 1].map(i => `<span><i style="background:${seq(STAGE_T[i])}"></i>${INC[i]}</span>`).join('')}</div>${dotk}`;
  } else if (S.mode === 'growth') {
    lg.innerHTML = `<b>2026 年实际 GDP 增速（IMF 预测）</b><div class="ramp">${DIV.map(v => `<i style="background:${css(v)}"></i>`).join('')}</div>
      <div class="lab num"><span>&lt;0</span><span>2.5–3.5%</span><span>&gt;7%</span></div><div class="note">中性色 ≈ 世界平均 ${pc(DATA.world.g[iNOW])}</div>`;
  } else if (S.mode === 'flow') {
    lg.innerHTML = `<b>资本流向 · 2026</b><div class="ramp">${DIV.map(v => `<i style="background:${css(v)}"></i>`).join('')}</div>
      <div class="lab num"><span>净输入 −6%</span><span>0</span><span>+6% 净输出</span></div>
      <div class="note">底色：2026E 经常账户 / GDP（IMF）</div>
      <div class="keys" style="margin-top:6px">${Object.entries(FL.types).map(([t, n]) => `<span><svg width="22" height="8" aria-hidden="true"><path class="lk t-${t}" d="M1 4H21" stroke-dasharray="${FTYPE_DASH[t]}"/></svg>${n}</span>`).join('')}
      <span><svg width="22" height="12" aria-hidden="true"><circle class="nk" cx="6" cy="6" r="4.5"/><circle class="nk out" cx="16" cy="6" r="4.5"/></svg>外资净流入 / 净流出</span></div>`;
  } else {
    const st = THEME_STATS.find(s => s.t === S.theme);
    lg.innerHTML = `<b>赛道 · ${TH[S.theme]}</b><div class="keys">
      <span><i style="background:${css('--th-hot')}"></i>当前最热（${st.hot.length}）</span>
      <span><i style="background:${css('--th-grow')}"></i>高速增长（${st.grow.length}）</span>
      <span><i style="background:${css('--th-mat')}"></i>成熟产业（${st.mat.length}）</span>
      <span><i style="background:${css('--th-base')}"></i>有画像、未涉及</span>
      <span><i style="background:${css('--nodata')}"></i>无产业画像</span></div>`;
  }
  gFlow.attr('display', S.mode === 'flow' ? null : 'none');
  $('#toFlowMap')?.setAttribute('aria-pressed', S.mode === 'flow');
  document.querySelectorAll('#mode button').forEach(b => b.setAttribute('aria-pressed', b.dataset.m === S.mode));
  document.querySelectorAll('#themes .tchip').forEach(b => b.setAttribute('aria-pressed', S.mode === 'theme' && b.dataset.t === S.theme));
}

// ---------------------------------------------------------------- tooltip
const tip = $('#tip');
function showTip(e, html) {
  tip.innerHTML = html; tip.hidden = false;
  const r = $('#stage').getBoundingClientRect(), tw = tip.offsetWidth, th = tip.offsetHeight;
  let x = e.clientX - r.left + 14, y = e.clientY - r.top + 14;
  if (x + tw > r.width - 8) x = e.clientX - r.left - tw - 14;
  if (y + th > r.height - 8) y = e.clientY - r.top - th - 14;
  tip.style.left = Math.max(8, x) + 'px'; tip.style.top = Math.max(8, y) + 'px';
}
function hideTip() { tip.hidden = true; }
const row = (k, v) => `<div class="r"><span>${k}</span><span>${v}</span></div>`;
function tipHtml(c) {
  const role = S.mode === 'theme' ? roleOf(c, S.theme) : null;
  const roleTxt = { 3: '当前最热', 2: '高速增长', 1: '成熟产业', 0: '未涉及' }[role];
  return `<b>${esc(c.zh)}</b>${row('机会评分', SC[c.k] == null ? '—' : `${fmtScore(c.k)} · 第 ${RANK[c.k]}/${NRANK}`)}
    ${row('2026 年增速', pc(g26(c)))}${row('人均 GDP（PPP）', fmtUSD(c.ppc))}${row('发展阶段', INC[c.inc] || '—')}
    ${roleTxt ? row(TH[S.theme], roleTxt) : ''}
    ${S.mode === 'flow' ? row('经常账户 2026E', `${fmtBn(c.cab, true)}（${pc(c.ca)}）`) : ''}
    <div class="tags">${c.p ? hotThemes(c).map(tpill).join('') : '<span class="pill">仅宏观数据</span>'}</div>`;
}

// ---------------------------------------------------------------- selection and tabs
function select(k, opts = {}) {
  S.sel = k;
  try { history.replaceState(null, '', '#' + k); } catch { /* sandboxed */ }
  paint(); renderCty(); setTab('cty');
  if (opts.zoom) zoomTo(k);
  if (matchMedia('(max-width:1080px)').matches && opts.scroll !== false) $('#panel').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
}
function setTab(t) {
  S.tab = t;
  document.querySelectorAll('.tabs button').forEach(b => b.setAttribute('aria-selected', b.dataset.t === t));
  document.querySelectorAll('.pane').forEach(p => { p.hidden = p.id !== 'p-' + t; });
  ({ sum: renderSum, cty: renderCty, flow: renderFlow, rank: renderRank, how: renderHow })[t]();
  $('#p-' + t).scrollTop = 0;
}
function setMode(m) { S.mode = m; store.set('mode', m); paint(); }
function wireRows(el) {
  el.querySelectorAll('tr.click').forEach(tr => {
    tr.tabIndex = 0;
    const go = () => tr.dataset.k ? select(tr.dataset.k, { zoom: true }) : tr.dataset.t && pickTheme(tr.dataset.t);
    tr.onclick = go; tr.onkeydown = e => { if (e.key === 'Enter') go(); };
  });
}
function pickTheme(t) { S.theme = t; store.set('theme', t); setMode('theme'); }

// ---------------------------------------------------------------- charts
function growthChart(el, c) {
  const w = 380, h = 168, m = { l: 30, r: 6, t: 12, b: 20 };
  const data = YRS.map((y, i) => ({ y, v: c.g[i], wv: DATA.world.g[i] }));
  const vals = data.flatMap(d => [d.v, d.wv]).filter(v => v != null);
  const x = d3.scaleBand(YRS, [m.l, w - m.r]).padding(0.28);
  const y = d3.scaleLinear([Math.min(0, d3.min(vals)), Math.max(1, d3.max(vals))], [h - m.b, m.t]).nice(4);
  const s = d3.select(el).html('').append('svg').attr('viewBox', `0 0 ${w} ${h}`).attr('role', 'img')
    .attr('aria-label', `${c.zh} 实际 GDP 增速 ${YRS[0]}–${YRS.at(-1)}`);
  s.append('g').attr('class', 'grid').selectAll('line').data(y.ticks(4)).join('line').attr('x1', m.l).attr('x2', w - m.r).attr('y1', y).attr('y2', y);
  s.append('g').attr('class', 'axis').selectAll('text').data(y.ticks(4)).join('text')
    .attr('x', m.l - 6).attr('y', d => y(d) + 3).attr('text-anchor', 'end').text(d => d + '%');
  s.append('g').attr('class', 'axis').selectAll('text').data([2015, 2020, 2025, 2031]).join('text')
    .attr('x', d => x(d) + x.bandwidth() / 2).attr('y', h - 4).attr('text-anchor', 'middle').text(d => d);
  const xNow = x(NOW) - x.step() * x.padding() / 2 - 1;
  s.append('line').attr('class', 'base').attr('x1', xNow).attr('x2', xNow).attr('y1', m.t - 6).attr('y2', h - m.b).attr('stroke-dasharray', '2 3');
  s.append('text').attr('class', 'lab').attr('x', xNow + 4).attr('y', m.t - 2).text('预测 →');
  const bw = x.bandwidth();
  s.append('g').selectAll('path').data(data.filter(d => d.v != null)).join('path')
    .attr('fill', d => d.v >= 0 ? 'var(--c1)' : 'var(--div-neg2)').attr('opacity', d => d.y >= NOW ? .45 : 1)
    .attr('d', d => {  // 2px rounded data end, square at the zero line
      const x0 = x(d.y), y0 = y(0), y1 = y(d.v), hgt = Math.abs(y1 - y0), r = Math.min(2, hgt, bw / 2);
      if (hgt < .5) return `M${x0},${y0 - .5}h${bw}v1h${-bw}Z`;
      const up = d.v >= 0, e = up ? y1 + r : y1 - r;
      return `M${x0},${y0}V${e}Q${x0},${y1} ${x0 + r},${y1}H${x0 + bw - r}Q${x0 + bw},${y1} ${x0 + bw},${e}V${y0}Z`;
    });
  s.append('line').attr('class', 'base').attr('x1', m.l).attr('x2', w - m.r).attr('y1', y(0)).attr('y2', y(0));
  s.append('path').attr('fill', 'none').attr('stroke', 'var(--muted)').attr('stroke-width', 1.5).attr('stroke-dasharray', '4 3')
    .attr('d', d3.line().defined(d => d.wv != null).x(d => x(d.y) + bw / 2).y(d => y(d.wv))(data));
  const hover = d3.select(el).append('div').attr('class', 'tip glass').attr('hidden', true);
  const cur = s.append('rect').attr('fill', 'var(--ink)').attr('opacity', 0).attr('y', m.t).attr('height', h - m.b - m.t).attr('width', x.step());
  s.append('g').selectAll('rect').data(data).join('rect').attr('class', 'hit')
    .attr('x', d => x(d.y) - x.step() * x.padding() / 2).attr('width', x.step()).attr('y', 0).attr('height', h)
    .on('pointermove', (e, d) => {
      cur.attr('x', x(d.y) - x.step() * x.padding() / 2).attr('opacity', .06);
      hover.attr('hidden', null).html(`<b>${d.y}${d.y >= NOW ? ' · 预测' : ''}</b>${row(esc(c.zh), pc(d.v))}${row('世界', pc(d.wv))}`);
      const bwid = el.clientWidth, left = (x(d.y) + bw / 2) / w * bwid;
      hover.style('left', (left > bwid / 2 ? left - hover.node().offsetWidth - 10 : left + 10) + 'px');
    })
    .on('pointerleave', () => { hover.attr('hidden', true); cur.attr('opacity', 0); });
}

// ---------------------------------------------------------------- panes
const table = (head, rows, cls = '') => `<div class="tbl"><table class="${cls}"><thead><tr>${head.map(h => `<th${h.n ? ' class="n"' : ''}>${h.t ?? h}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`;
const srcLinks = keys => [...new Set(keys)].map(k => SRC[k]).filter(Boolean).map(([t, u]) => `<li><a href="${u}" target="_blank" rel="noopener">${esc(t)}</a></li>`).join('');

function renderSum() {
  const big = C.filter(c => c.gdp >= BIG && SC[c.k] != null).sort((a, b) => SC[b.k] - SC[a.k]);
  const top = big.slice(0, 10), t3 = THEME_STATS.slice(0, 3);
  const gw = DATA.world.g[iNOW];
  const byG = C.filter(c => c.gdp >= BIG && g26(c) != null).sort((a, b) => g26(b) - g26(a));
  const gRow = c => `<tr class="click" data-k="${c.k}"><td>${esc(c.zh)}</td><td class="n">${pc(g26(c))}</td></tr>`;
  const profGdp = PROF.reduce((s, c) => s + c.gdp, 0) / DATA.world.gdp * 100;
  $('#p-sum').innerHTML = `
    <div><div class="eyebrow">结论 · 截至 ${DATA.meta.profileAsOf}</div>
      <p class="lead">按<b>${presetName()}</b>权重，GDP 超过 1,000 亿美元的 ${big.length} 个经济体中，机会评分前三是
      ${top.slice(0, 3).map(c => `<b>${esc(c.zh)}</b>（${fmtScore(c.k)}）`).join('、')}。
      50 份产业画像里最常被列为“当前最热”的赛道是 ${t3.map(s => `<b>${TH[s.t]}</b>（${s.hot.length} 国）`).join('、')}。
      全球增速 2026 年 ${pc(gw)}（IMF 4 月），7 月下调至 ${pc(DATA.world.gJul)}；霍尔木兹受阻与美联储重新加息是最大的两个外部变量。</p></div>
    <div class="tiles">
      <div class="tile"><span class="k">世界 GDP 2026E</span><span class="v">${(DATA.world.gdp / 1000).toFixed(1)}<small>万亿美元</small></span><span class="d">IMF 2026 年 4 月</span></div>
      <div class="tile"><span class="k">全球实际增速 2026E</span><span class="v">${pc(DATA.world.gJul)}</span><span class="d">7 月更新；4 月为 ${pc(gw)}</span></div>
      ${DATA.tiles.map(([k, v, u, d]) => `<div class="tile"><span class="k">${k}</span><span class="v">${v}<small>${u}</small></span><span class="d">${d}</span></div>`).join('')}
    </div>
    <div class="sec"><h3>钱在往哪里走</h3>
      <p class="note" style="margin:0">外资今年净买入美国证券约 ${fmtBn(686)}、日股约 ${fmtBn(60)}，净卖出韩股约 ${fmtBn(96.7)}、印度股约 ${fmtBn(29)}；国家资本主要流向美国。</p>
      <div><button class="tchip" id="goFlow">查看资本流向</button></div></div>
    <div class="sec"><h3>机会评分前十<small>GDP ≥ 1,000 亿美元 · ${presetName()}权重</small></h3>
      ${table(['#', '国家/地区', { t: '评分', n: 1 }, { t: '26–30 均速', n: 1 }, '热门赛道'], top.map((c, i) => `<tr class="click" data-k="${c.k}">
        <td class="num">${i + 1}</td><td><b>${esc(c.zh)}</b></td><td class="n"><b>${fmtScore(c.k)}</b></td><td class="n">${pc(c.g5)}</td>
        <td>${c.p ? hotThemes(c).slice(0, 2).map(tpill).join(' ') : '<span class="pill">仅数据</span>'}</td></tr>`))}
      <p class="note">评分只衡量宏观基本面（增长、规模、人口、物价、债务、外部平衡、法治），不含估值和治理事件。印尼评分靠前但年内股市跌约 26–29%，正是两者背离的例子。权重可在“评分”页调整。</p></div>
    <div class="sec"><h3>赛道热度<small>50 份画像中出现次数 · 点击在地图上查看</small></h3>
      ${table(['赛道', { t: '当前最热', n: 1 }, { t: '高增长', n: 1 }, { t: '成熟', n: 1 }, '代表'], THEME_STATS.map(s => `<tr class="click" data-t="${s.t}">
        <td><b>${TH[s.t]}</b></td><td class="n">${s.hot.length}</td><td class="n">${s.grow.length}</td><td class="n">${s.mat.length}</td>
        <td>${[...s.hot].sort((a, b) => b.gdp - a.gdp).slice(0, 3).map(c => esc(c.zh)).join('、') || '—'}</td></tr>`))}</div>
    <div class="sec"><h3>全球环境<small>2026 年 10 月</small></h3>
      ${table(['变量', '现状', '对机会的影响'], DATA.global.map(([k, now, eff]) => `<tr><td class="ind">${k}</td><td class="ev">${esc(now)}</td><td class="ev">${esc(eff)}</td></tr>`))}</div>
    <div class="sec"><h3>2026 年增速两端<small>GDP ≥ 1,000 亿美元 · IMF 4 月</small></h3>
      <div class="duo">
        <div>${table(['最快', { t: '增速', n: 1 }], byG.slice(0, 6).map(gRow))}</div>
        <div>${table(['最慢', { t: '增速', n: 1 }], byG.slice(-6).reverse().map(gRow))}</div>
      </div></div>
    <p class="note">产业画像覆盖 50 个经济体，合计约占 2026 年世界 GDP 的 ${profGdp.toFixed(0)}%；其余 ${C.length - PROF.length} 个经济体只有数据部分。内容为研究信息，不构成投资建议。</p>`;
  $('#goFlow').onclick = () => { setMode('flow'); setTab('flow'); };
  wireRows($('#p-sum'));
}

function profTable(rows) {
  return table(['行业', '依据'], rows.map(([n, t, ev]) => `<tr><td class="ind">${esc(n)}<br>${tpill(t)}</td><td class="ev">${esc(ev)}</td></tr>`));
}
function renderCty() {
  const el = $('#p-cty');
  if (!S.sel) {
    const sug = ['VNM', 'IND', 'TWN', 'SAU', 'BRA', 'POL'].map(k => `<button class="tchip" data-k="${k}">${BY[k].zh}</button>`).join('');
    el.innerHTML = `<div class="empty">在地图上点击任一国家或地区，或用顶部搜索框查找。<br>有圆点的 50 个经济体带完整产业画像：热门行业、成熟产业、高增长行业与投资标的。</div>
      <div class="sec"><h3>从这里开始</h3><div class="presets">${sug}</div></div>`;
    el.querySelectorAll('.tchip').forEach(b => b.onclick = () => select(b.dataset.k, { zoom: true }));
    return;
  }
  const c = BY[S.sel], p = c.p, wb = c.wb || {};
  const kv = (k, v, sm = '') => `<div><span>${k}</span><b>${v}${sm ? `<small>${sm}</small>` : ''}</b></div>`;
  const tr = c.tr;
  const sector = wb.agr && wb.ind && wb.srv ? (() => {
    const parts = [['农业', wb.agr[0], '--c3'], ['工业', wb.ind[0], '--c2'], ['服务业', wb.srv[0], '--c1']], tot = parts.reduce((s, d) => s + d[1], 0);
    return `<div class="sec"><h3>产业结构<small>增加值占 GDP · 世界银行 ${wb.srv[1]}</small></h3>
      <div class="stack" role="img" aria-label="农业 ${pc(wb.agr[0])}，工业 ${pc(wb.ind[0])}，服务业 ${pc(wb.srv[0])}">${parts.map(d => `<i style="flex:${d[1] / tot};background:var(${d[2]})"></i>`).join('')}</div>
      <div class="legend-row">${parts.map(d => `<span><i style="background:var(${d[2]})"></i>${d[0]} ${pc(d[1])}</span>`).join('')}</div>
      <p class="note">制造业占 GDP <b>${pc(wb.mfg?.[0])}</b>${wb.tech ? `；高技术产品占制成品出口 <b>${pc(wb.tech[0])}</b>` : ''}${wb.fdi ? `；外商直接投资净流入占 GDP <b>${pc(wb.fdi[0])}</b>` : ''}${wb.urb ? `；城镇化率 <b>${pc(wb.urb[0], 0)}</b>` : ''}。</p></div>`;
  })() : '';
  const exportsSec = tr ? `<div class="sec"><h3>出口结构<small>WITS ${tr.y} · 商品出口 ${fmtGDP(tr.tot)}</small></h3>
    ${table(['品类', '占比', { t: 'RCA', n: 1 }], tr.sec.slice(0, 6).map(([code, sh, rca]) => `<tr><td class="ind">${HS[code]}</td>
      <td><div style="display:flex;align-items:center;gap:8px"><div class="bar" style="flex:1"><i style="width:${Math.min(100, sh)}%"></i></div><span class="num">${pc(sh)}</span></div></td>
      <td class="n">${rca == null ? '—' : rca >= 1 ? `<b>${rca.toFixed(1)}</b>` : rca.toFixed(1)}</td></tr>`))}
    <p class="note">RCA（显示性比较优势）= 该品类占本国出口的比重 ÷ 占世界出口的比重；大于 1 说明该产业在国际上有比较优势，是“成熟产业”的数据旁证。</p></div>` : '';
  const comps = COMP.map(m => {
    const v = PCT[m.k][c.k];
    return `<span class="nm">${m.zh}</span><div class="bar"><i style="width:${v == null ? 0 : v}%"></i></div><span class="num">${v == null ? '—' : Math.round(v)}</span><span class="w num" title="${m.ind}">${m.raw(c)}</span>`;
  }).join('');
  el.innerHTML = `
    <div class="cty-h"><div><h2>${esc(c.zh)}</h2>
      <div class="sub"><span>${esc(c.en)}</span><span>·</span><span>${c.reg || '—'}</span><span class="pill">${INC[c.inc] || '—'}</span>${p ? '<span class="pill a">产业画像</span>' : '<span class="pill">仅宏观数据</span>'}</div></div>
      <div class="score"><b>${fmtScore(c.k)}</b><span>${SC[c.k] == null ? '数据不足' : `机会评分 · 第 ${RANK[c.k]}/${NRANK}`}</span></div></div>
    ${p ? `<div class="thesis"><span class="eyebrow">结论</span>${esc(p.thesis)}</div>` : ''}
    <div class="kv">
      ${kv(`GDP ${c.gdpY || '2026E'}`, fmtGDP(c.gdp))}
      ${kv('实际增速 2026E · IMF 4 月', pc(g26(c)), c.gJul != null ? `IMF 7 月 ${pc(c.gJul)}` : p?.gl ? `${esc(p.gl[1])} ${pc(p.gl[0], 2).replace(/\.?0+%$/, '%')}` : '')}
      ${kv('2026–30 年均增速', pc(c.g5))}
      ${kv('人均 GDP（PPP）', fmtUSD(c.ppc))}
      ${kv('通胀 2026E', pc(c.infl))}
      ${kv('政府债务 / GDP', pc(c.debt, 0))}
      ${kv('经常账户 / GDP', pc(c.ca))}
      ${kv('人口 2026E', fmtPop(c.pop), c.popg != null ? `年均 ${sgn(c.popg, 2)}%` : '')}
    </div>
    ${p ? `
    <div class="sec"><h3>当前最热门行业<small>资金与政策正在集中的方向</small></h3>${profTable(p.hot)}</div>
    <div class="sec"><h3>已经成熟的产业<small>规模与全球份额已确立</small></h3>${profTable(p.mature)}</div>
    <div class="sec"><h3>高速增长的行业<small>未来 3–5 年增速领先</small></h3>${profTable(p.growth)}</div>
    <div class="sec"><h3>可关注的投资标的<small>研究清单，不构成投资建议</small></h3>
      ${table(['类别', '名称', '代码', '理由'], p.assets.map(([cl, n, code, why]) => `<tr><td><span class="pill${cl === 'na' ? '' : ' a'}">${CLS[cl]}</span></td><td class="ind">${esc(n)}</td><td class="code">${esc(code)}</td><td class="ev">${esc(why)}</td></tr>`))}
      ${p.assets.some(a => a[0] !== 'na') ? '<p class="note">代码以交易所为准（例如哥伦比亚 ETF 已由 GXG 改为 COLO、巴航工业由 ERJ 改为 EMBJ）；QDII 场内价格常有溢价。</p>' : ''}</div>
    <div class="sec"><h3>主要风险</h3><ul class="plain">${p.risks.map(r => `<li>${esc(r)}</li>`).join('')}</ul>
      <div class="watch"><b>近期看点</b>${esc(p.watch)}</div></div>` : `<p class="note">该经济体暂无手写产业画像，以下为数据部分。出口结构中 RCA 大于 1 的品类可视为其成熟产业的线索。</p>`}
    <div class="sec"><h3>实际 GDP 增速<small>IMF 2026 年 4 月 · 2026 起为预测</small></h3>
      <div class="legend-row"><span><i style="background:var(--c1)"></i>${esc(c.zh)}</span><span><i class="ln"></i>世界</span><span>浅色 = 预测</span></div>
      <div class="chart" id="gChart"></div></div>
    <div class="sec"><h3>评分拆解<small>各项为全部经济体中的百分位（0–100）</small></h3><div class="comp">${comps}</div></div>
    ${flowSec(c)}
    ${sector}
    ${exportsSec}
    ${p ? `<div class="sec"><h3>来源</h3><ul class="plain src">${srcLinks([...(p.src || []), 'imf4', ...(c.wb ? ['wb'] : []), ...(tr ? ['wits'] : [])])}</ul></div>` : ''}`;
  growthChart($('#gChart'), c);
}

function flowRows(k) {  // 2026 flow items that start or end in k
  return [...FL.links.filter(l => l[0] === k || l[1] === k).map(l => ({ k: l[1] === k ? l[0] : l[1], name: `${BY[l[0]].zh} → ${BY[l[1]].zh}`, amt: l[2], sign: false, txt: l[4], per: l[5], t: FL.types[l[3]] })),
    ...FL.nodes.filter(n => n[0] === k).map(n => ({ k, name: n[1] >= 0 ? `外资 → ${BY[k].zh}` : `${BY[k].zh} → 外资撤出`, amt: n[1], sign: true, txt: n[2], per: n[3], t: '证券投资' }))];
}
function flowSec(c) {
  const wb = c.wb || {}, rows = flowRows(c.k);
  const kv = (k, v, sm = '') => `<div><span>${k}</span><b>${v}${sm ? `<small>${sm}</small>` : ''}</b></div>`;
  return `<div class="sec"><h3>资本流向<small>经常账户为 IMF 2026E；FDI 与证券为世界银行最新年份</small></h3>
    <div class="kv">
      ${kv(c.cab == null ? '经常账户 2026E' : c.cab >= 0 ? '资本净输出（经常账户顺差）' : '资本净输入（经常账户逆差）', fmtBn(c.cab == null ? null : Math.abs(c.cab)), c.ca != null ? `占 GDP ${pc(Math.abs(c.ca))}` : '')}
      ${kv(`FDI 流入 ${wb.fdiIn ? wb.fdiIn[1] : ''}`, fmtBn(wb.fdiIn?.[0]), wb.fdi ? `占 GDP ${pc(wb.fdi[0])}` : '')}
      ${kv(`对外直接投资 ${wb.fdiOut ? wb.fdiOut[1] : ''}`, fmtBn(wb.fdiOut?.[0]))}
      ${kv(`外资股票净流入 ${wb.pef ? wb.pef[1] : ''}`, fmtBn(wb.pef?.[0], true))}
    </div>
    ${rows.length ? table(['2026 年资金通道', { t: '规模', n: 1 }], rows.map(r => `<tr><td><b>${esc(r.name)}</b> <span class="pill">${r.t}</span><div class="ev note">${esc(r.txt)} · ${esc(r.per)}</div></td><td class="n">${fmtBn(r.amt, r.sign)}</td></tr>`)) : ''}</div>`;
}
function renderFlow() {
  const el = $('#p-flow');
  const withCab = C.filter(c => c.cab != null).sort((a, b) => b.cab - a.cab);
  const fdiIn = C.filter(c => c.wb?.fdiIn).sort((a, b) => b.wb.fdiIn[0] - a.wb.fdiIn[0]).slice(0, 10);
  const fdiOut = C.filter(c => c.wb?.fdiOut).sort((a, b) => b.wb.fdiOut[0] - a.wb.fdiOut[0]).slice(0, 10);
  const chan = [...FL.links.map(l => ({ k: l[1], name: `${BY[l[0]].zh} → ${BY[l[1]].zh}`, amt: l[2], sign: false, txt: l[4], per: l[5], t: FL.types[l[3]] })),
    ...FL.nodes.map(n => ({ k: n[0], name: n[1] >= 0 ? `外资 → ${BY[n[0]].zh}` : `${BY[n[0]].zh} → 外资撤出`, amt: n[1], sign: true, txt: n[2], per: n[3], t: '证券投资' }))]
    .sort((a, b) => Math.abs(b.amt) - Math.abs(a.amt));
  const cabRow = c => `<tr class="click" data-k="${c.k}"><td>${esc(c.zh)}</td><td class="n">${fmtBn(Math.abs(c.cab))}</td><td class="n">${pc(Math.abs(c.ca))}</td></tr>`;
  const fdiRow = key => c => `<tr class="click" data-k="${c.k}"><td>${esc(c.zh)}</td><td class="n">${fmtBn(c.wb[key][0])}</td><td class="n">${c.wb[key][1]}</td></tr>`;
  const flowSrc = ['tic', 'ticapr', 'iif', 'ssga', 'bofa', 'fundseu', 'jpflow', 'krh1', 'krflow', 'twflow', 'infpi', 'brflow', 'idfx', 'jpus', 'korus', 'korus2', 'gccswf', 'mgx',
    'southbound', 'cnfdi', 'cnodi', 'bri', 'briaf', 'wgcetf', 'wgccb', 'unctad', 'unctaddc', 'imf4', 'wb'];
  el.innerHTML = `
    <div><div class="eyebrow">结论 · 截至 ${DATA.meta.profileAsOf}</div><p class="lead">${FL.lead}</p></div>
    <div class="tiles">${FL.tiles.map(([k, v, u, d]) => `<div class="tile"><span class="k">${k}</span><span class="v">${v}<small>${u}</small></span><span class="d">${d}</span></div>`).join('')}</div>
    <div><button class="tchip" id="toFlowMap" aria-pressed="${S.mode === 'flow'}">在地图上看资金通道</button></div>
    <div class="sec"><h3>2026 年主要资金通道<small>按规模排序 · 点击查看国家</small></h3>
      ${table(['通道', { t: '规模', n: 1 }], chan.map(r => `<tr class="click" data-k="${r.k}"><td><b>${esc(r.name)}</b> <span class="pill">${r.t}</span><div class="ev note">${esc(r.txt)} · ${esc(r.per)}</div></td><td class="n"><b>${fmtBn(r.amt, r.sign)}</b></td></tr>`))}
      <p class="note">承诺不等于到位：日本 5,500 亿、韩国 3,500 亿美元对美投资只按已确定的项目或注资计规模。不同通道口径不同（TIC 含债券与银行头寸，印度、韩国、台湾为股票），只能比较量级。</p></div>
    <div class="sec"><h3>谁在输出资本、谁在吸收资本<small>IMF 2026E 经常账户</small></h3>
      ${table(['资本净输出（顺差）', { t: '金额', n: 1 }, { t: '占 GDP', n: 1 }], withCab.slice(0, 8).map(cabRow))}
      ${table(['资本净输入（逆差）', { t: '金额', n: 1 }, { t: '占 GDP', n: 1 }], withCab.slice(-8).reverse().map(cabRow))}
      <p class="note">经常账户顺差的国家把多余储蓄借给或投资到海外（资本净输出），逆差国家靠外资弥补（资本净输入）。美国一国逆差约 ${fmtBn(-BY.USA.cab)}，吸收了全球大部分过剩储蓄；中国顺差约 ${fmtBn(BY.CHN.cab)}，是最大的输出方。</p></div>
    <div class="sec"><h3>直接投资<small>世界银行 · 最新年份</small></h3>
      ${table(['FDI 流入前十', { t: '金额', n: 1 }, { t: '年份', n: 1 }], fdiIn.map(fdiRow('fdiIn')))}
      ${table(['对外直接投资前十', { t: '金额', n: 1 }, { t: '年份', n: 1 }], fdiOut.map(fdiRow('fdiOut')))}
      <p class="note">卢森堡、荷兰等通道型金融中心的 FDI 常为负值或大幅波动，反映的是控股公司的资金进出，不是实体投资。</p></div>
    <div class="sec"><h3>按资产类别<small>2026 年</small></h3>
      ${table(['资产 / 渠道', '方向', '规模与时段'], FL.assets.map(([a, dir, txt]) => `<tr><td class="ind">${esc(a)}</td><td><span class="pill${/流入|买入|增加|回流/.test(dir) ? ' a' : ''}">${esc(dir)}</span></td><td class="ev">${esc(txt)}</td></tr>`))}</div>
    <div class="sec"><h3>来源</h3><ul class="plain src">${srcLinks(flowSrc)}</ul></div>`;
  $('#toFlowMap').onclick = () => setMode(S.mode === 'flow' ? 'score' : 'flow');
  wireRows(el);
}
function renderRank() {
  const el = $('#p-rank');
  const regions = [...new Set(C.map(c => c.reg).filter(Boolean))];
  el.innerHTML = `
    <div><div class="eyebrow">机会评分</div>
      <p class="lead">每项指标先在 ${C.length} 个经济体中换算成百分位（0–100），再按权重加权平均；缺失指标按剩余权重重新归一。拖动滑块即时重排，地图同步更新。</p></div>
    <div class="sec"><h3>权重</h3>
      <div class="seg" role="group" aria-label="权重预设" id="presets">${Object.entries(PRESETS).map(([k, v]) => `<button data-p="${k}">${v.zh}</button>`).join('')}</div>
      <div class="sliders">${COMP.map(m => `<div class="sl"><label for="w-${m.k}" title="${m.ind}">${m.zh}</label>
        <input type="range" id="w-${m.k}" min="0" max="50" step="5" value="${S.w[m.k]}"><output id="o-${m.k}" class="num"></output></div>`).join('')}</div></div>
    <div class="sec"><h3>排名</h3>
      <div class="filters"><div class="seg" role="group" aria-label="范围" id="rf">
        <button data-f="big">GDP ≥ 1,000 亿</button><button data-f="prof">有画像</button><button data-f="all">全部</button></div>
        <select id="reg" aria-label="地区"><option value="">全部地区</option>${regions.map(r => `<option${r === S.reg ? ' selected' : ''}>${r}</option>`).join('')}</select></div>
      <div id="rankTbl"></div></div>`;
  const syncW = () => {
    const tot = COMP.reduce((s, m) => s + S.w[m.k], 0) || 1;
    COMP.forEach(m => { $('#o-' + m.k).textContent = Math.round(S.w[m.k] / tot * 100) + '%'; });
    el.querySelectorAll('#presets button').forEach(b => b.setAttribute('aria-pressed', COMP.every(m => PRESETS[b.dataset.p].w[m.k] === S.w[m.k])));
    el.querySelectorAll('#rf button').forEach(b => b.setAttribute('aria-pressed', b.dataset.f === S.rf));
  };
  let raf = 0;
  const update = () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => { computeScores(); store.set('w', S.w); syncW(); rankTable(); paint(); });
  };
  COMP.forEach(m => { $('#w-' + m.k).oninput = e => { S.w[m.k] = +e.target.value; update(); }; });
  el.querySelectorAll('#presets button').forEach(b => b.onclick = () => {
    S.w = { ...PRESETS[b.dataset.p].w }; COMP.forEach(m => { $('#w-' + m.k).value = S.w[m.k]; }); update();
  });
  el.querySelectorAll('#rf button').forEach(b => b.onclick = () => { S.rf = b.dataset.f; store.set('rf', S.rf); syncW(); rankTable(); });
  $('#reg').onchange = e => { S.reg = e.target.value; store.set('reg', S.reg); rankTable(); };
  syncW(); rankTable();
}
function rankTable() {
  const keep = c => SC[c.k] != null && (S.rf === 'all' || (S.rf === 'big' ? c.gdp >= BIG : !!c.p)) && (!S.reg || c.reg === S.reg);
  const rows = C.filter(keep).sort((a, b) => SC[b.k] - SC[a.k]);
  $('#rankTbl').innerHTML = rows.length ? table(['#', '国家/地区', { t: '评分', n: 1 }, { t: '均速', n: 1 }, { t: '通胀', n: 1 }, { t: '债务', n: 1 }, { t: '法治', n: 1 }],
    rows.map(c => `<tr class="click" data-k="${c.k}"><td class="num">${RANK[c.k]}</td><td><b>${esc(c.zh)}</b>${c.p ? ' <span class="pill a">画像</span>' : ''}</td>
      <td class="n"><b>${fmtScore(c.k)}</b></td><td class="n">${pc(c.g5)}</td><td class="n">${pc(c.infl)}</td><td class="n">${pc(c.debt, 0)}</td>
      <td class="n">${c.wb?.rl ? sgn(c.wb.rl[0], 2) : '—'}</td></tr>`)) + `<p class="note">“#”为在全部 ${NRANK} 个经济体中的名次；均速为 2026–2030 年 IMF 预测。</p>`
    : '<div class="empty">没有符合条件的经济体</div>';
  wireRows($('#rankTbl'));
}

function renderHow() {
  const el = $('#p-how');
  if (el.dataset.done) return;
  el.dataset.done = 1;
  const allSrc = Object.keys(SRC);
  el.innerHTML = `
    <div><div class="eyebrow">方法</div>
      <p class="lead">这页回答三件事：一国处在什么发展阶段（数据），哪些行业正在热、已成熟、在高增长（画像 + 出口数据），可以通过哪些资产参与（标的清单）。地图颜色全部来自公开数据，画像为截至 ${DATA.meta.profileAsOf} 的研究判断。</p></div>
    <div class="sec"><h3>数据来源</h3>${table(['内容', '来源', '时点'], [
      ['增长、GDP、人均、通胀、债务、经常账户、人口', 'IMF《世界经济展望》DataMapper API', '2026 年 4 月；2026 年起为预测'],
      ['主要经济体增速修正', 'IMF《世界经济展望》更新', '2026 年 7 月（11 个经济体）'],
      ['收入分组、地区、三次产业、制造业、高技术出口、FDI', '世界银行 WDI', '各国最新可得年份'],
      ['法治指数', '世界银行全球治理指标 WGI', '2025'],
      ['按 HS 大类的出口结构与 RCA', '世界银行 WITS', '2021–2023 最新可得'],
      ['资本净输出 / 输入（经常账户）', 'IMF《世界经济展望》BCA', '2026 年预测'],
      ['FDI 流入与流出、外资股票净流入', '世界银行 WDI（国际收支口径）', '多为 2025 年'],
      ['2026 年资金通道与资产类别流向', '美国财政部 TIC、IIF、道富、美银、世界黄金协会、UNCTAD 及各国报道（见“资金”页）', '截至 2026-10-08'],
      ['边界', 'Natural Earth 1:50m；中国外轮廓为 DataV', '—'],
      ['产业画像、标的、风险', '公开报道与机构数据（见各国来源）', `截至 ${DATA.meta.profileAsOf}`],
    ].map(r => `<tr><td class="ind">${r[0]}</td><td class="ev">${r[1]}</td><td class="ev">${r[2]}</td></tr>`))}</div>
    <div class="sec"><h3>机会评分</h3>${table(['维度', '指标', '方向', { t: '均衡权重', n: 1 }], COMP.map(m => `<tr><td class="ind">${m.zh}</td><td class="ev">${m.ind}（${m.src}）</td>
      <td style="white-space:nowrap">${m.dir > 0 ? '越高越好' : '越低越好'}</td><td class="n">${PRESETS.balanced.w[m.k]}%</td></tr>`))}
      <p class="note">百分位排名对极端值不敏感（如委内瑞拉、阿根廷的高通胀不会把其他国家压扁）。至少要有增长项和 5 项指标才给分，阿富汗、黎巴嫩、斯里兰卡、巴勒斯坦因 IMF 未发布预测而无分。</p></div>
    <div class="sec"><h3>画像怎么分类</h3><ul class="plain">
      <li><b>当前最热门</b>：资金、政策和市场关注正在集中的行业，常伴随估值上行或订单激增。</li>
      <li><b>已经成熟</b>：规模和全球份额已经确立的支柱产业，出口结构里 RCA 大于 1 的品类可作旁证。</li>
      <li><b>高速增长</b>：未来 3–5 年增速领先的行业，热度不一定已经反映在价格里。</li>
      <li><b>标的</b>：按资产类别列出可交易的 ETF、龙头股、债券与 A 股 QDII，并写明理由；受制裁或无渠道的市场注明不可投资。</li></ul></div>
    <div class="sec"><h3>局限</h3><ul class="plain">
      <li>评分只看宏观基本面，不含估值、流动性与治理事件；高分不等于便宜。</li>
      <li>IMF 4 月预测假设霍尔木兹在数月内恢复，若冲突持续，海湾和能源进口国的预测会继续下调。</li>
      <li>中国台湾不在世界银行与 WITS 数据库中，相关项缺失；孟加拉国未向 WITS 报送 2021–2023 年出口数据。</li>
      <li>出口结构按 HS 大类，看不到细分产品（例如“机械电子”同时包含手机和变压器）。</li>
      <li>画像中的市场数据（指数、价格、利率）会很快过时，请以实时行情为准。</li></ul>
      <p class="note"><b>免责声明</b>：本页内容为研究与学习用途的信息整理，不构成任何投资建议或要约。</p></div>
    <div class="sec"><h3>全部来源</h3><ul class="plain src">${srcLinks(allSrc)}</ul></div>`;
}

// ---------------------------------------------------------------- wiring
$('#themes').innerHTML = '<span class="lbl">赛道</span>' + THEME_STATS.map(s => `<button class="tchip" data-t="${s.t}" aria-pressed="false">${TH[s.t]}<b class="num">${s.hot.length}</b></button>`).join('');
document.querySelectorAll('#themes .tchip').forEach(b => b.onclick = () => {
  if (S.mode === 'theme' && S.theme === b.dataset.t) setMode('score'); else pickTheme(b.dataset.t);
});
document.querySelectorAll('#mode button').forEach(b => b.onclick = () => setMode(b.dataset.m));
document.querySelectorAll('.tabs button').forEach(b => b.onclick = () => setTab(b.dataset.t));
$('#qlist').innerHTML = [...C].sort((a, b) => b.gdp - a.gdp).map(c => `<option value="${esc(c.zh)}">${esc(c.en)}</option>`).join('');
const findC = q => {
  q = q.trim().toLowerCase(); if (!q) return null;
  return C.find(c => c.zh.toLowerCase() === q || c.en.toLowerCase() === q || c.k.toLowerCase() === q)
    || C.find(c => c.zh.includes(q) || c.en.toLowerCase().includes(q));
};
$('#q').addEventListener('change', e => { const c = findC(e.target.value); if (c) { select(c.k, { zoom: true }); e.target.value = ''; e.target.blur(); } });
$('#q').addEventListener('keydown', e => { if (e.key === 'Enter') { const c = findC(e.target.value); if (c) { select(c.k, { zoom: true }); e.target.value = ''; } } });
$('#zin').onclick = () => svg.transition().duration(reduced ? 0 : 250).call(zoom.scaleBy, 1.6);
$('#zout').onclick = () => svg.transition().duration(reduced ? 0 : 250).call(zoom.scaleBy, 1 / 1.6);
$('#zreset').onclick = () => svg.transition().duration(reduced ? 0 : 400).call(zoom.transform, d3.zoomIdentity);
let rz = 0;
addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(layout, 120); });
// recolour when the viewer flips light/dark
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => paint());
new MutationObserver(() => paint()).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

computeScores();
layout();
const h = location.hash.slice(1).toUpperCase();
if (BY[h]) { select(h, { zoom: true, scroll: false }); } else setTab('sum');
