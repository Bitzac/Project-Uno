// 人口潮汐 · map, timeline, panel. DATA (src/data.js) and GEO (src/geo.js) are inlined by build.mjs.
const $ = s => document.querySelector(s);
const YRS = DATA.years, HIST = DATA.histEnd, Y0 = YRS[0], Y1 = YRS[YRS.length - 1];
const U = DATA.units, NU = U.length, EXT = DATA.ext;
const BLOCS = [{ k: 'CN', zh: '中国', c: '--s-cn' }, { k: 'EU', zh: '欧洲', c: '--s-eu' }, { k: 'US', zh: '美国', c: '--s-us' }];
const VZH = { Low: '低', Medium: '中', High: '高' };
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

const store = {
  get(k, d) { try { const v = localStorage.getItem('tides.' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('tides.' + k, JSON.stringify(v)); } catch { /* storage unavailable */ } },
};
const S = {
  year: 2020, view: store.get('view', 'world'), mode: store.get('mode', 'growth'), scen: store.get('scen', 'Medium'),
  flows: store.get('flows', true), sel: null, tab: 'sum', playing: false,
};

// ---------------------------------------------------------------- numbers
const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const dIdx = y => Math.min(Math.floor((y - Y0) / 10), YRS.length - 2);
function popAt(i, y, v = S.scen) {
  const row = DATA.pop[v][i], k = dIdx(y), t = (y - YRS[k]) / 10, a = row[k], b = row[k + 1];
  return a > 0 && b > 0 ? a * Math.pow(b / a, t) : a + (b - a) * t;
}
function growth(i, y, v = S.scen) {  // annual % over the decade containing y
  const k = dIdx(y), a = DATA.pop[v][i][k], b = DATA.pop[v][i][k + 1];
  return a > 0 && b > 0 ? (Math.pow(b / a, 0.1) - 1) * 100 : NaN;
}
function migRate(i, y) {  // net migration per 1000 residents per year (medium variant)
  const k = dIdx(y), a = DATA.pop.Medium[i][k], b = DATA.pop.Medium[i][k + 1];
  return a > 0 && b > 0 ? DATA.mig[i][k] / Math.sqrt(a * b) / 10 * 1000 : NaN;
}
const blocPop = (b, y, v = S.scen) => U.reduce((s, u, i) => u.bloc === b ? s + popAt(i, y, v) : s, 0);
function fmtPop(k) {
  if (!isFinite(k)) return '—';
  if (k >= 1e5) return (k / 1e5).toFixed(2) + ' 亿';
  if (k >= 10) return (k / 10).toFixed(k < 1000 ? 1 : 0) + ' 万';
  return Math.round(k * 1000).toLocaleString() + ' 人';
}
const fmtWan = k => { const w = k / 10; return (Math.abs(w) >= 100 ? Math.round(w) : w.toFixed(1)) + ' 万'; };
const sgn = (x, d = 2) => !isFinite(x) ? '—' : (x > 0 ? '+' : x < 0 ? '−' : '') + Math.abs(x).toFixed(d);
const era = y => y <= 1950 ? '重建' : y <= HIST ? '观测' : '预测 · ' + VZH[S.scen];
const decadeLabel = y => { const k = dIdx(y); return `${YRS[k]}–${YRS[k + 1]}`; };
const nodeName = j => j < NU ? U[j].zh : EXT[j - NU].zh;
const nodeBloc = j => j < NU ? U[j].bloc : EXT[j - NU].id.slice(2, 4);

// ---------------------------------------------------------------- geometry
// d3 treats rings as spherical: a ring wound the "wrong" way covers the rest of the globe, so flip those polygons.
const rewind = f => {
  const g = f.geometry, polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
  for (const rings of polys) if (d3.geoArea({ type: 'Polygon', coordinates: rings }) > 2 * Math.PI) rings.forEach(r => r.reverse());
  return f;
};
const layers = Object.fromEntries(['world', 'us', 'cn'].map(l => [l, topojson.feature(GEO, GEO.objects[l]).features.filter(f => f.geometry).map(rewind)]));
const keyOf = { CN: 'cn', US: 'us', EU: 'world' };
const featsByUnit = U.map(u => layers[keyOf[u.bloc]].filter(f => f.properties.k === u.geo));
const unitKeys = new Set(U.filter(u => u.bloc === 'EU').map(u => u.geo));
const bgFeats = layers.world.filter(f => !unitKeys.has(f.properties.k));
const noData = layers.cn.filter(f => !U.some(u => u.bloc === 'CN' && u.geo === f.properties.k)); // Taiwan, HK, Macau
const areaKm2 = featsByUnit.map(fs => fs.reduce((s, f) => s + d3.geoArea(f), 0) * 6371 * 6371);
const allFeats = { type: 'FeatureCollection', features: [...layers.world, ...layers.us, ...layers.cn] };

const svg = d3.select('#map'), root = svg.append('g'), gBg = root.append('g').attr('class', 'bg'),
  gUnits = root.append('g').attr('class', 'units'), gFlows = root.append('g').attr('class', 'flows');
let projection, path, W = 0, H = 0, centroid = [];
const zoom = d3.zoom().scaleExtent([1, 14]).on('zoom', e => root.attr('transform', e.transform));
svg.call(zoom).on('dblclick.zoom', null);

function layout() {
  const el = $('#stage'); W = el.clientWidth; H = el.clientHeight;
  svg.attr('viewBox', `0 0 ${W} ${H}`);
  projection = d3.geoNaturalEarth1().fitExtent([[12, 12], [W - 12, H - 84]], allFeats);
  path = d3.geoPath(projection);
  gBg.selectAll('path').data([...bgFeats, ...noData]).join('path').attr('d', path);
  gUnits.selectAll('path').data(U.flatMap((u, i) => featsByUnit[i].map(f => ({ f, i })))).join('path')
    .attr('d', d => path(d.f))
    .on('pointermove', (e, d) => showTip(e, unitTip(d.i)))
    .on('pointerleave', hideTip)
    .on('click', (e, d) => selectUnit(d.i));
  centroid = U.map((u, i) => {
    let best = null, area = -1;
    for (const f of featsByUnit[i]) {
      const polys = f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates : [f.geometry.coordinates];
      for (const c of polys) { const p = { type: 'Polygon', coordinates: c }, a = d3.geoArea(p); if (a > area) { area = a; best = p; } }
    }
    return projection(d3.geoCentroid(best));
  });
  goView(S.view, false);
  paint(); drawFlows(true);
}

const VIEW_BOX = {
  CN: () => U.flatMap((u, i) => u.bloc === 'CN' ? featsByUnit[i] : []),
  US: () => U.flatMap((u, i) => u.bloc === 'US' && !['Alaska', 'Hawaii'].includes(u.en) ? featsByUnit[i] : []),
  EU: () => [{ type: 'Feature', geometry: { type: 'Polygon', coordinates: [[[-12, 35], [-12, 70], [42, 70], [42, 35], [-12, 35]]] } }],
};
function goView(v, animate = true) {
  let t = d3.zoomIdentity;
  if (v !== 'world') {
    const [[x0, y0], [x1, y1]] = path.bounds({ type: 'FeatureCollection', features: VIEW_BOX[v]() });
    const k = Math.min(14, 0.86 / Math.max((x1 - x0) / W, (y1 - y0) / (H - 90)));
    t = d3.zoomIdentity.translate(W / 2 - k * (x0 + x1) / 2, (H - 70) / 2 - k * (y0 + y1) / 2).scale(k);
  }
  (animate && !reduced ? svg.transition().duration(700) : svg).call(zoom.transform, t);
}

// ---------------------------------------------------------------- colour scales
const DIV = ['--div-neg3', '--div-neg2', '--div-neg1', '--div-mid', '--div-pos1', '--div-pos2', '--div-pos3'];
const MODES = {
  growth: { title: '年均人口增减率（本十年）', th: [-1.5, -0.5, -0.1, 0.1, 0.5, 1.5], lab: ['−1.5%', '0', '+1.5%'],
    val: i => growth(i, S.year), fmt: v => sgn(v) + '%' },
  density: { title: '人口密度（人/平方公里）', th: [5, 15, 50, 150, 400, 1000], lab: ['<5', '50', '>1000'], seq: true,
    val: i => popAt(i, S.year) * 1000 / areaKm2[i], fmt: v => Math.round(v).toLocaleString() },
  mig: { title: '净迁移率（‰/年，本十年）', th: [-10, -4, -1, 1, 4, 10], lab: ['−10‰', '0', '+10‰'],
    val: i => migRate(i, S.year), fmt: v => sgn(v, 1) + '‰' },
  error: { title: '回测误差：2000 年预测 2020 年人口', th: [-20, -8, -3, 3, 8, 20], lab: ['低估 20%', '0', '高估 20%'],
    val: i => DATA.backtest.holdout[U[i].id] ?? NaN, fmt: v => sgn(v, 1) + '%' },
};
function colorFor(mode, v) {
  if (!isFinite(v)) return css('--nodata');
  const m = MODES[mode];
  let k = m.th.findIndex(t => v < t); if (k < 0) k = m.th.length;
  if (m.seq) return d3.interpolateLab(css('--seq-lo'), css('--seq-hi'))(k / m.th.length);
  return css(DIV[k]);
}
function paint() {
  const m = MODES[S.mode];
  const fills = U.map((u, i) => DATA.pop.Medium[i][dIdx(S.year)] <= 0 && S.mode !== 'error' ? css('--nodata') : colorFor(S.mode, m.val(i)));
  gUnits.selectAll('path').attr('fill', d => fills[d.i]).classed('sel', d => d.i === S.sel);
  const steps = m.seq ? d3.range(7).map(k => d3.interpolateLab(css('--seq-lo'), css('--seq-hi'))(k / 6)) : DIV.map(css);
  $('#legend').innerHTML = `<b>${m.title}</b><div class="ramp">${steps.map(c => `<i style="background:${c}"></i>`).join('')}</div>
    <div class="lab"><span>${m.lab[0]}</span><span>${m.lab[1]}</span><span>${m.lab[2]}</span></div>
    ${S.flows && S.mode !== 'error' ? `<div class="fl"><span><i></i>区内净流动</span><span><i class="x"></i>跨洲 / 海外</span></div>` : ''}
    ${S.mode === 'error' ? '<div class="lab" style="margin-top:6px">欧洲用 UN 国别预测，不参与此回测</div>' : ''}`;
}

// ---------------------------------------------------------------- flows
const maxFlow = Math.max(...Object.values(DATA.flows).flatMap(f => f.map(r => r[2])));
let flowKey = '';
function extPos(j, y) { const e = EXT[j - NU]; return projection(y >= 1950 ? e.post : e.pre); }
function visibleFlows(y) {
  const rows = DATA.flows[YRS[dIdx(y)]] || [];
  const inView = S.view === 'world' ? () => true : r => nodeBloc(r[0]) === S.view || nodeBloc(r[1]) === S.view;
  return rows.filter(inView).slice(0, S.view === 'world' ? 48 : 40);
}
function drawFlows(force) {
  const key = [dIdx(S.year), S.view, S.flows, S.mode, W, H].join();
  if (!force && key === flowKey) return; flowKey = key;
  const rows = S.flows && S.mode !== 'error' ? visibleFlows(S.year) : [];
  const y = YRS[dIdx(S.year)];
  const pos = j => j < NU ? centroid[j] : extPos(j, y);
  const cross = r => r[0] >= NU || r[1] >= NU || U[r[0]].bloc !== U[r[1]].bloc;
  const arc = r => {
    const [x0, y0] = pos(r[0]), [x1, y1] = pos(r[1]), dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy) || 1;
    const bend = cross(r) ? 0.18 : 0.26, cx = (x0 + x1) / 2 - dy * bend, cy = (y0 + y1) / 2 + dx * bend;
    return `M${x0},${y0}Q${cx},${cy} ${x1},${y1}`;
  };
  gFlows.selectAll('path').data(rows, r => r[0] + '-' + r[1]).join('path')
    .attr('d', arc).classed('x', cross)
    .attr('stroke-width', r => Math.max(0.6, Math.sqrt(r[2] / maxFlow) * 7))
    .on('pointermove', (e, r) => showTip(e, flowTip(r, y, cross(r))))
    .on('pointerleave', hideTip);
  gFlows.selectAll('circle').data(rows, r => r[0] + '-' + r[1]).join('circle')
    .attr('cx', r => pos(r[1])[0]).attr('cy', r => pos(r[1])[1]).classed('x', cross)
    .attr('r', r => (1 + Math.sqrt(r[2] / maxFlow) * 3) / d3.zoomTransform(svg.node()).k);
  const exts = [...new Set(rows.flatMap(r => [r[0], r[1]]).filter(j => j >= NU))];
  gFlows.selectAll('text').data(exts, j => j).join('text')
    .attr('x', j => extPos(j, y)[0] + 6).attr('y', j => extPos(j, y)[1] + 4).text(j => nodeName(j))
    .attr('transform', null).style('font-size', () => `${11 / d3.zoomTransform(svg.node()).k}px`).style('stroke-width', () => `${3 / d3.zoomTransform(svg.node()).k}px`);
}
zoom.on('zoom.labels', e => {
  const k = e.transform.k;
  gFlows.selectAll('text').style('font-size', `${11 / k}px`).style('stroke-width', `${3 / k}px`);
  gFlows.selectAll('circle').attr('r', r => (1 + Math.sqrt(r[2] / maxFlow) * 3) / k);
});

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
function unitTip(i) {
  const err = DATA.backtest.holdout[U[i].id];
  return `<b>${U[i].zh}</b>${row(S.year + ' 年人口', fmtPop(popAt(i, S.year)))}${row('年均增减', sgn(growth(i, S.year)) + '%')}
    ${row('净迁移 ' + decadeLabel(S.year), fmtWan(DATA.mig[i][dIdx(S.year)]))}${row('密度', Math.round(popAt(i, S.year) * 1000 / areaKm2[i]).toLocaleString() + ' 人/km²')}
    ${err != null ? row('回测误差 2000→2020', sgn(err, 1) + '%') : ''}`;
}
function flowTip(r, y, x) {
  return `<b>${nodeName(r[0])} → ${nodeName(r[1])}</b>${row(`${y}–${y + 10} 净流动`, '约 ' + fmtWan(r[2]))}
    ${row('口径', x ? '跨洲：入境记录 / UN 净迁移' : '区内：残差法 + 重力模型')}`;
}

// ---------------------------------------------------------------- charts
function lineChart(el, series, opts = {}) {
  const w = 340, h = opts.h || 170, m = { l: 34, r: 8, t: 8, b: 20 };
  const x = d3.scaleLinear([Y0, Y1], [m.l, w - m.r]);
  const ymax = d3.max(series.flatMap(s => s.pts.map(p => Math.max(p.v, p.hi ?? 0)))) || 1;
  const y = d3.scaleLinear([0, ymax * 1.05], [h - m.b, m.t]).nice(4);
  const s = d3.select(el).html('').append('svg').attr('viewBox', `0 0 ${w} ${h}`).attr('role', 'img').attr('aria-label', opts.label || '');
  s.append('g').attr('class', 'grid').selectAll('line').data(y.ticks(4)).join('line')
    .attr('x1', m.l).attr('x2', w - m.r).attr('y1', y).attr('y2', y);
  s.append('g').attr('class', 'axis').selectAll('text').data(y.ticks(4)).join('text')
    .attr('x', m.l - 6).attr('y', d => y(d) + 3).attr('text-anchor', 'end').text(opts.yfmt || (d => d));
  s.append('g').attr('class', 'axis').selectAll('text').data([1800, 1900, 2000, 2100]).join('text')
    .attr('x', x).attr('y', h - 4).attr('text-anchor', (d, i) => i === 0 ? 'start' : i === 3 ? 'end' : 'middle').text(d => d);
  s.append('line').attr('class', 'now').attr('x1', x(HIST)).attr('x2', x(HIST)).attr('y1', m.t).attr('y2', h - m.b);
  for (const se of series) {
    const band = se.pts.filter(p => p.lo != null);
    if (band.length) s.append('path').attr('fill', se.color).attr('opacity', .16)
      .attr('d', d3.area().x(p => x(p.y)).y0(p => y(p.lo)).y1(p => y(p.hi))(band));
    s.append('path').attr('fill', 'none').attr('stroke', se.color).attr('stroke-width', 2).attr('stroke-linejoin', 'round')
      .attr('d', d3.line().x(p => x(p.y)).y(p => y(p.v))(se.pts.filter(p => p.y <= HIST)));
    s.append('path').attr('fill', 'none').attr('stroke', se.color).attr('stroke-width', 2).attr('stroke-dasharray', '4 3')
      .attr('d', d3.line().x(p => x(p.y)).y(p => y(p.v))(se.pts.filter(p => p.y >= HIST)));
  }
  const cur = s.append('line').attr('class', 'cursor').attr('y1', m.t).attr('y2', h - m.b);
  const dots = s.append('g').selectAll('circle').data(series).join('circle').attr('r', 4).attr('fill', d => d.color)
    .attr('stroke', css('--bg')).attr('stroke-width', 2);
  const hover = d3.select(el).append('div').attr('class', 'tip glass').attr('hidden', true);
  const place = yr => {
    cur.attr('x1', x(yr)).attr('x2', x(yr));
    dots.attr('cx', x(yr)).attr('cy', d => y(d.at(yr)));
  };
  s.append('rect').attr('class', 'hit').attr('x', m.l).attr('y', 0).attr('width', w - m.l - m.r).attr('height', h)
    .on('pointermove', e => {
      const [px] = d3.pointer(e), yr = Math.round(Math.max(Y0, Math.min(Y1, x.invert(px))));
      place(yr);
      hover.attr('hidden', null).html(`<b>${yr}</b>` + series.map(se => row(se.label, opts.vfmt(se.at(yr)))).join(''));
      const bw = el.clientWidth, left = px / w * bw;
      hover.style('left', (left > bw / 2 ? left - hover.node().offsetWidth - 12 : left + 12) + 'px').style('top', '4px');
    })
    .on('pointerleave', () => { hover.attr('hidden', true); place(S.year); });
  place(S.year);
  return place;
}
function barChart(el, vals, opts) {
  const w = 340, h = 120, m = { l: 34, r: 8, t: 8, b: 20 };
  const x = d3.scaleLinear([Y0, Y1], [m.l, w - m.r]);
  const ext = d3.max(vals, v => Math.abs(v.v)) || 1;
  const y = d3.scaleLinear([-ext, ext], [h - m.b, m.t]).nice(2);
  const s = d3.select(el).html('').append('svg').attr('viewBox', `0 0 ${w} ${h}`).attr('role', 'img').attr('aria-label', opts.label);
  s.append('g').attr('class', 'grid').selectAll('line').data(y.ticks(2)).join('line').attr('x1', m.l).attr('x2', w - m.r).attr('y1', y).attr('y2', y);
  s.append('g').attr('class', 'axis').selectAll('text').data(y.ticks(2)).join('text').attr('x', m.l - 6).attr('y', d => y(d) + 3).attr('text-anchor', 'end').text(opts.yfmt);
  s.append('g').attr('class', 'axis').selectAll('text').data([1800, 1900, 2000, 2100]).join('text')
    .attr('x', x).attr('y', h - 4).attr('text-anchor', (d, i) => i === 0 ? 'start' : i === 3 ? 'end' : 'middle').text(d => d);
  s.append('line').attr('class', 'now').attr('x1', x(HIST)).attr('x2', x(HIST)).attr('y1', m.t).attr('y2', h - m.b);
  const bw = (x(1810) - x(1800)) - 2;
  s.append('g').selectAll('path').data(vals).join('path')
    .attr('fill', d => css(d.v >= 0 ? '--div-pos2' : '--div-neg2')).attr('opacity', d => d.y >= HIST ? .55 : 1)
    .attr('d', d => {  // 2px rounded data end, square at the zero line
      const x0 = x(d.y) + 1, y0 = y(0), y1 = y(d.v), r = Math.min(2, Math.abs(y1 - y0));
      if (Math.abs(y1 - y0) < .5) return '';
      const up = d.v >= 0, e = up ? y1 + r : y1 - r;
      return `M${x0},${y0}V${e}Q${x0},${y1} ${x0 + r},${y1}H${x0 + bw - r}Q${x0 + bw},${y1} ${x0 + bw},${e}V${y0}Z`;
    })
    .append('title').text(d => `${d.y}–${d.y + 10}：${opts.vfmt(d.v)}`);
  const cur = s.append('line').attr('class', 'cursor').attr('y1', m.t).attr('y2', h - m.b);
  return yr => cur.attr('x1', x(yr)).attr('x2', x(yr));
}

// ---------------------------------------------------------------- panes
let placeSum = null, placeUnit = [], sumKey = '';
function blocSeries() {
  return BLOCS.map(b => {
    const color = css(b.c);
    const pts = YRS.map(y => ({ y, v: blocPop(b.k, y), lo: y >= HIST ? blocPop(b.k, y, 'Low') : null, hi: y >= HIST ? blocPop(b.k, y, 'High') : null }));
    return { label: b.zh, color, pts, at: yr => blocPop(b.k, yr) };
  });
}
function renderSum() {
  const y = S.year, k = dIdx(y);
  const key = [k, S.scen, S.view].join();
  if (key !== sumKey) {
    sumKey = key;
    const inBloc = i => S.view === 'world' || U[i].bloc === S.view;
    const idx = U.map((u, i) => i).filter(i => inBloc(i) && DATA.pop.Medium[i][k] > 50);
    const g = idx.map(i => [i, growth(i, y)]).filter(d => isFinite(d[1])).sort((a, b) => b[1] - a[1]);
    const mg = idx.map(i => [i, DATA.mig[i][k]]).sort((a, b) => a[1] - b[1]);
    const flows = visibleFlows(y).slice(0, 8);
    $('#p-sum').innerHTML = `
      <div><div class="eyebrow num" id="sumEye"></div>
        <p class="lead">${decadeLabel(y)}：增长最快 <b>${U[g[0][0]].zh}</b>（${sgn(g[0][1])}%/年），收缩最快 <b>${U[g.at(-1)[0]].zh}</b>（${sgn(g.at(-1)[1])}%/年）；
        净迁入最多 <b>${U[mg.at(-1)[0]].zh}</b>（${fmtWan(mg.at(-1)[1])}），净迁出最多 <b>${U[mg[0][0]].zh}</b>（${fmtWan(-mg[0][1])}）。</p></div>
      <div class="tiles" id="tiles"></div>
      <div class="sec"><h3>三地人口 1800–2100</h3>
        <div class="legend-row">${BLOCS.map(b => `<span><i style="background:var(${b.c})"></i>${b.zh}</span>`).join('')}<span><i class="band"></i>低–高情景</span><span>虚线 = 预测</span></div>
        <div class="chart" id="sumChart"></div></div>
      <div class="sec"><h3>${decadeLabel(y)} 主要流向</h3>
        ${flows.length ? `<div class="tbl"><table><thead><tr><th>从</th><th>到</th><th class="n">十年净流动</th></tr></thead><tbody>
        ${flows.map(r => `<tr class="click" data-u="${r[1] < NU ? r[1] : r[0]}"><td>${nodeName(r[0])}</td><td>${nodeName(r[1])}</td><td class="n">${fmtWan(r[2])}</td></tr>`).join('')}
        </tbody></table></div>` : '<div class="empty">这一视角在本十年没有超过 5 千人的流向</div>'}</div>`;
    placeSum = lineChart($('#sumChart'), blocSeries(), { label: '中国、欧洲、美国人口 1800–2100', yfmt: d => d / 1e5 + '亿', vfmt: fmtPop });
    $('#p-sum').querySelectorAll('tr.click').forEach(tr => tr.onclick = () => +tr.dataset.u < NU && selectUnit(+tr.dataset.u));
  }
  $('#sumEye').textContent = `${y} · ${era(y)}`;
  $('#tiles').innerHTML = BLOCS.map(b => {
    const p = blocPop(b.k, y), k2 = dIdx(y), a = blocPop(b.k, YRS[k2]), c = blocPop(b.k, YRS[k2 + 1]);
    const gr = (Math.pow(c / a, .1) - 1) * 100;
    return `<div class="tile"><span class="k"><i style="background:var(${b.c})"></i>${b.zh}</span>
      <span class="v">${fmtPop(p).replace(/ (亿|万)/, '<small>$1</small>')}</span>
      <span class="d ${gr >= 0 ? 'up' : 'down'}">${sgn(gr)}%/年</span></div>`;
  }).join('');
  placeSum && placeSum(y);
}
function renderUnit() {
  const el = $('#p-unit'), i = S.sel;
  if (i == null) { el.innerHTML = '<div class="empty">在地图上点击任一省、州或国家，查看它 1800–2100 年的人口曲线和逐十年净迁移</div>'; placeUnit = []; return; }
  const u = U[i], y = S.year, k = dIdx(y);
  const ins = [], outs = [];
  for (const r of DATA.flows[YRS[k]] || []) { if (r[1] === i) ins.push(r); if (r[0] === i) outs.push(r); }
  const err = DATA.backtest.holdout[u.id];
  el.innerHTML = `
    <div class="unit-h"><h2>${u.zh}</h2><span>${u.en.length > 3 ? u.en : ''} · ${BLOCS.find(b => b.k === u.bloc).zh}</span></div>
    <div class="kv">
      <div><span>${y} 年人口</span><b id="uPop">${fmtPop(popAt(i, y))}</b></div>
      <div><span>年均增减 ${decadeLabel(y)}</span><b class="${growth(i, y) >= 0 ? 'up' : 'down'}">${sgn(growth(i, y))}%</b></div>
      <div><span>净迁移 ${decadeLabel(y)}</span><b>${fmtWan(DATA.mig[i][k])}</b></div>
      <div><span>${err != null ? '回测误差 2000→2020' : '密度'}</span><b>${err != null ? sgn(err, 1) + '%' : Math.round(popAt(i, y) * 1000 / areaKm2[i]) + '/km²'}</b></div>
    </div>
    <div class="sec"><h3>人口</h3><div class="legend-row"><span><i class="band"></i>低–高情景</span><span>虚线 = 预测</span></div><div class="chart" id="uChart"></div></div>
    <div class="sec"><h3>逐十年净迁移</h3><div class="chart" id="uBars"></div></div>
    <div class="sec"><h3>${decadeLabel(y)} 流入 / 流出</h3>
      <div class="tbl"><table><thead><tr><th>方向</th><th>对象</th><th class="n">十年</th></tr></thead><tbody>
      ${ins.slice(0, 5).map(r => `<tr><td>流入</td><td>${nodeName(r[0])}</td><td class="n">${fmtWan(r[2])}</td></tr>`).join('')}
      ${outs.slice(0, 5).map(r => `<tr><td>流出</td><td>${nodeName(r[1])}</td><td class="n">${fmtWan(r[2])}</td></tr>`).join('')}
      ${!ins.length && !outs.length ? '<tr><td colspan="3">本十年没有超过 5 千人的单向流动</td></tr>' : ''}
      </tbody></table></div></div>`;
  const color = css(BLOCS.find(b => b.k === u.bloc).c);
  placeUnit = [
    lineChart($('#uChart'), [{ label: u.zh, color, at: yr => popAt(i, yr),
      pts: YRS.map(yy => ({ y: yy, v: popAt(i, yy), lo: yy >= HIST ? popAt(i, yy, 'Low') : null, hi: yy >= HIST ? popAt(i, yy, 'High') : null })) }],
      { h: 150, label: u.zh + ' 人口', yfmt: d => d >= 1e5 ? d / 1e5 + '亿' : d >= 10 ? d / 10 + '万' : d, vfmt: fmtPop }),
    barChart($('#uBars'), YRS.slice(0, -1).map((yy, j) => ({ y: yy, v: DATA.mig[i][j] })),
      { label: u.zh + ' 逐十年净迁移', yfmt: d => d / 10 + '万', vfmt: fmtWan }),
  ];
  placeUnit.forEach(f => f(y));
}
function renderBt() {
  const bt = DATA.backtest, P = ['0.0', '0.8', '0.9', '0.95', '0.97', '1.0'];
  const name = { '0.0': '份额不变', '1.0': '趋势不衰减' };
  const mean = (rows, set, p) => d3.mean(rows.filter(r => r.set === set), r => r.by[p].mape);
  const table = b => {
    const rows = bt[b].rows;
    return `<div class="tbl"><table><thead><tr><th>衰减系数 φ</th><th class="n">校准 MAPE</th><th class="n">留出 MAPE</th></tr></thead><tbody>
      ${P.map(p => `<tr class="${+p === bt[b].phi ? 'best' : ''}"><td>${p}${name[p] ? ' · ' + name[p] : ''}${+p === bt[b].phi ? ' <span class="pill a">采用</span>' : ''}</td>
      <td class="n">${mean(rows, 'calib', p).toFixed(1)}%</td><td class="n">${mean(rows, 'holdout', p).toFixed(1)}%</td></tr>`).join('')}
      </tbody></table></div>`;
  };
  const cases = b => `<div class="tbl"><table><thead><tr><th>趋势期 → 起点 → 目标</th><th class="n">不变</th><th class="n">φ=${bt[b].phi}</th><th class="n">不衰减</th></tr></thead><tbody>
    ${bt[b].rows.map(r => `<tr><td class="num">${r.base}→${r.anchor}→${r.target} <span class="pill">${r.set === 'calib' ? '校准' : '留出'}</span></td>
    <td class="n">${r.by['0.0'].mape.toFixed(1)}%</td><td class="n">${r.by[String(bt[b].phi)].mape.toFixed(1)}%</td><td class="n">${r.by['1.0'].mape.toFixed(1)}%</td></tr>`).join('')}
    </tbody></table></div>`;
  const hu = (pre, src) => { const v = Object.entries(src).filter(([k]) => k.startsWith(pre)).map(([, v]) => Math.abs(v)); return d3.mean(v).toFixed(1); };
  $('#p-bt').innerHTML = `
    <div><div class="eyebrow">回测结论</div>
      <p class="lead">省/州份额模型用“过去 20 年份额趋势 × 年衰减系数 φ”外推。中美两套校准样本合并后，<b>φ = ${bt.US.phi}</b> 平均误差最低。
      留出检验（2000 年只用此前数据预测 2020 年）：美国各州平均误差 <b>${hu('US-', bt.holdout)}%</b>（份额不变基准 ${hu('US-', bt.holdoutConst)}%），
      中国各省 <b>${hu('CN-', bt.holdout)}%</b>（基准 ${hu('CN-', bt.holdoutConst)}%）。</p></div>
    <button class="chip" id="toErr" aria-pressed="${S.mode === 'error'}"><i></i>在地图上看 2000→2020 各地误差</button>
    <div class="sec"><h3>美国 · 各州</h3>${table('US')}</div>
    <div class="sec"><h3>中国 · 各省</h3>${table('CN')}</div>
    <div class="sec"><h3>逐案例 · 美国</h3>${cases('US')}</div>
    <div class="sec"><h3>逐案例 · 中国</h3>${cases('CN')}</div>
    <p class="note">MAPE = 各单位人口预测误差绝对值的平均（假设国家总量已知，只检验“分配”）。国家总量和欧洲各国采用 UN WPP 2024，本页不重新回测 UN 的总量预测。
    中国 1964–1982 年的人口分布受户籍管制、上山下乡和三线建设影响，趋势外推在这一段反而不如“份额不变”，因此单独用中国样本会选出 φ=0；合并样本更稳健。</p>`;
  $('#toErr').onclick = () => setMode(S.mode === 'error' ? 'growth' : 'error');
}
function renderHow() {
  $('#p-how').innerHTML = `
    <div><div class="eyebrow">怎么读这张图</div>
      <p class="lead">颜色是每个省、州或国家在当前十年的年均人口增减；弧线是净流动，越粗越多，虚线流动方向即迁移方向。紫色弧线是跨洲或流向海外。</p></div>
    <div class="sec"><h3>数据来源与可信度</h3><div class="tbl"><table><thead><tr><th>时段</th><th>来源</th><th>可信度</th></tr></thead><tbody>
      <tr><td class="num">1950–2020</td><td>UN WPP 2024 估计；中国 1953–2020 历次普查；美国 1790–2020 普查</td><td><span class="pill a">高</span></td></tr>
      <tr><td class="num">1800–1950 欧美</td><td>OWID / Gapminder 国别重建（现代国界）；英国、爱尔兰按普查改写</td><td><span class="pill">中</span></td></tr>
      <tr><td class="num">1800–1950 中国</td><td>梁方仲辑嘉庆二十五年（1820）册籍；曹树基《中国人口史》1851、1880 推算；1912、1936 民国统计（修正明显漏报）</td><td><span class="pill">低 ±15%</span></td></tr>
      <tr><td class="num">2020–2100</td><td>UN WPP 2024 低/中/高情景（国家总量、欧洲各国）；省/州份额按回测选定的衰减趋势外推</td><td><span class="pill">情景</span></td></tr>
      <tr><td>跨洲流动</td><td>美国各年代入境登记（DHS 年鉴表 2）× 回流率；欧洲各国移民构成；1944–50 德裔被驱逐</td><td><span class="pill">中</span></td></tr>
    </tbody></table></div></div>
    <div class="sec"><h3>模型</h3><ul class="plain">
      <li><b>净迁移（中美）</b>：残差法。某省/州十年净迁移 = 实际增量 − 全国自然增长率 × 期初人口。</li>
      <li><b>战乱与饥荒</b>：太平天国、西北战争、丁戊奇荒、1942 河南饥荒、1959–61 饥荒期间，受灾省份超出自然增长的减少计为超额死亡，不计为迁出。</li>
      <li><b>净迁移（欧洲）</b>：1950 年后用 UN 各国净迁移；1950 年前只建模跨洲移民和战后驱逐，欧洲内部流动未建模。</li>
      <li><b>流向</b>：净迁出地 → 净迁入地按双约束重力模型（距离衰减）分配；跨洲流量按入境口岸（纽约、旧金山）分配到各州。</li>
      <li><b>未来</b>：UN 低/中/高情景只改变生育率，迁移假设相同，所以三种情景的流向相同。</li>
    </ul></div>
    <div class="sec"><h3>局限</h3><ul class="plain">
      <li>残差法假设同一国内各地自然增长率相同；美国南部 1950 年前、中国少数民族地区生育率更高，会被部分误读为迁入。</li>
      <li>重力模型给出的是“合理分配”，不是登记到的具体路线；单条弧线应读作量级。</li>
      <li>1860 年以前美国普查不含原住民；台湾、香港、澳门未纳入（灰色）。</li>
      <li>俄罗斯按整国计入欧洲。</li>
    </ul></div>`;
}

// ---------------------------------------------------------------- state changes
const pressed = (sel, attr, val) => document.querySelectorAll(sel + ' button').forEach(b => b.setAttribute('aria-pressed', b.dataset[attr] === val));
function setYear(y, fromSlider) {
  y = Math.max(Y0, Math.min(Y1, Math.round(y)));
  if (y === S.year && !fromSlider) return;
  S.year = y;
  $('#year').textContent = y; $('#era').textContent = era(y);
  if (!fromSlider) $('#slider').value = y;
  paint(); drawFlows(); renderSum();
  if (S.tab === 'unit' && S.sel != null) {
    const k = dIdx(y);
    if (k !== setYear.k) renderUnit(); else { $('#uPop') && ($('#uPop').textContent = fmtPop(popAt(S.sel, y))); placeUnit.forEach(f => f(y)); }
  }
  setYear.k = dIdx(y);
}
function setMode(m) { S.mode = m; store.set('mode', m); pressed('#mode', 'm', m); paint(); drawFlows(true); if (S.tab === 'bt') renderBt(); }
function selectUnit(i) { S.sel = i; paint(); setTab('unit'); }
function setTab(t) {
  S.tab = t;
  document.querySelectorAll('.tabs button').forEach(b => b.setAttribute('aria-selected', b.dataset.t === t));
  for (const p of ['sum', 'unit', 'bt', 'how']) $('#p-' + p).hidden = p !== t;
  if (t === 'unit') renderUnit(); if (t === 'bt') renderBt(); if (t === 'how') renderHow(); if (t === 'sum') { sumKey = ''; renderSum(); }
}

document.querySelectorAll('#view button').forEach(b => b.onclick = () => { S.view = b.dataset.v; store.set('view', S.view); pressed('#view', 'v', S.view); goView(S.view); drawFlows(true); sumKey = ''; renderSum(); });
document.querySelectorAll('#mode button').forEach(b => b.onclick = () => setMode(b.dataset.m));
document.querySelectorAll('#scen button').forEach(b => b.onclick = () => {
  S.scen = b.dataset.s; store.set('scen', S.scen); pressed('#scen', 's', S.scen);
  $('#era').textContent = era(S.year); paint(); sumKey = ''; renderSum(); if (S.tab === 'unit') renderUnit();
});
$('#flowsBtn').onclick = () => { S.flows = !S.flows; store.set('flows', S.flows); $('#flowsBtn').setAttribute('aria-pressed', S.flows); paint(); drawFlows(true); };
document.querySelectorAll('.tabs button').forEach(b => b.onclick = () => setTab(b.dataset.t));
$('#slider').addEventListener('input', e => setYear(+e.target.value, true));

// play
let raf = 0, last = 0, acc = 0;
function tick(t) {
  if (!S.playing) return;
  const dt = last ? (t - last) / 1000 : 0; last = t;
  acc += dt * (reduced ? 1 / 0.7 * 10 : 7);  // 7 years/s; reduced motion jumps a decade every 0.7 s
  const step = reduced ? Math.floor(acc / 10) * 10 : Math.floor(acc);
  if (step >= 1) { acc -= step; setYear(S.year + step); }
  if (S.year >= Y1) return stop();
  raf = requestAnimationFrame(tick);
}
function stop() { S.playing = false; cancelAnimationFrame(raf); $('#playIcon').setAttribute('d', 'M4 2.5v11l9-5.5z'); $('#play').setAttribute('aria-label', '播放'); }
$('#play').onclick = () => {
  if (S.playing) return stop();
  if (S.year >= Y1) setYear(Y0);
  S.playing = true; last = 0; acc = 0;
  $('#playIcon').setAttribute('d', 'M4 2.5h3v11H4zM9 2.5h3v11H9z'); $('#play').setAttribute('aria-label', '暂停');
  raf = requestAnimationFrame(tick);
};
document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT' && e.target.type !== 'range') return;
  if (e.key === ' ' && e.target === document.body) { e.preventDefault(); $('#play').click(); }
});

// ticks under the slider
$('#ticks').innerHTML = [1800, 1850, 1900, 1950, 2000, 2050, 2100].map(y => `<span style="left:${(y - Y0) / (Y1 - Y0) * 100}%">${y}</span>`).join('');

// theme changes repaint everything colour-bound
const repaint = () => { paint(); sumKey = ''; renderSum(); if (S.tab === 'unit') renderUnit(); };
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', repaint);
new MutationObserver(repaint).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

// boot
pressed('#view', 'v', S.view); pressed('#mode', 'm', S.mode); pressed('#scen', 's', S.scen);
$('#flowsBtn').setAttribute('aria-pressed', S.flows);
$('#year').textContent = S.year; $('#era').textContent = era(S.year); $('#slider').value = S.year;
layout(); renderSum();
let rz; new ResizeObserver(() => { clearTimeout(rz); rz = setTimeout(layout, 120); }).observe($('#stage'));
