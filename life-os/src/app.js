// ---------------------------------------------------------------- helpers
const $ = s => document.querySelector(s);
const clamp = (x, a = 0, b = 100) => Math.max(a, Math.min(b, x));
const col = n => n ? `var(--s${n})` : 'var(--ink)';
const fmtInt = v => Math.round(v).toLocaleString('zh-CN');
const wan = v => { const s = (v / 1e4).toFixed(v >= 1e5 ? 0 : 2); return '¥' + (s.includes('.') ? s.replace(/\.?0+$/, '') : s) + ' 万'; };
const hm = h => { const H = Math.floor(h), M = Math.round((h - H) * 60); return H ? `${H}h${M ? String(M).padStart(2, '0') + 'm' : ''}` : `${M}m`; };
const Q = q => `<span class="q${q === '估' ? ' e' : ''}">${q}</span>`;
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage blocked: keep in memory only */ } },
};

const tip = $('#tip');
function showTip(e, html) {
  tip.innerHTML = html; tip.hidden = false;
  const r = tip.getBoundingClientRect();
  let x = e.clientX + 14, y = e.clientY + 14;
  if (x + r.width > innerWidth - 8) x = e.clientX - r.width - 14;
  if (y + r.height > innerHeight - 8) y = e.clientY - r.height - 14;
  tip.style.left = Math.max(8, x) + 'px'; tip.style.top = Math.max(8, y) + 'px';
}
const hideTip = () => { tip.hidden = true; };
const row = (k, v) => `<div class="r"><span>${k}</span><span>${v}</span></div>`;

// ---------------------------------------------------------------- model
const city = id => CITIES.find(c => c.id === id);
const burn = c => c.rent * AREA + c.living + MED_RESERVE;
const MIN_BURN = Math.min(...CITIES.map(burn));
const SCORE = {
  vc: c => 100 * Math.sqrt(c.vc / VC_MAX),
  cost: c => 100 * MIN_BURN / burn(c),
  med: c => 100 * Math.exp(-0.25 * (c.a4 - 0.5)),
  clim: c => clamp(100 - Math.max(0, c.jul - 24) * 10 - (c.heat ? Math.max(0, 5 - c.jan) * 2 : Math.max(0, 12 - c.jan) * 5)),
  air: c => clamp(100 * (1 - (c.pm - 10) / 30)),
  home: c => clamp(100 - c.home * 15),
  root: c => Math.min(100, c.years * 25),
};
const SC = Object.fromEntries(CITIES.map(c => [c.id, Object.fromEntries(DIMS.map(d => [d.k, SCORE[d.k](c)]))]));
const wsum = w => DIMS.reduce((a, d) => a + w[d.k], 0);
const total = (c, w) => DIMS.reduce((a, d) => a + SC[c.id][d.k] * w[d.k], 0) / (wsum(w) || 1);
const ranked = w => CITIES.map(c => ({ c, t: total(c, w) })).sort((a, b) => b.t - a.t);

// 一年：基地 8 个月，呼市 7–8 月，三亚 1–2 月。基地是呼市时，夏站并入基地。
function plan(baseId, own, keep) {
  const c = city(baseId), rentM = c.rent * AREA;
  if (baseId === 'hh') {
    const bm = own ? HH_OWN : burn(c);
    return { base: bm, annual: 10 * bm + 2 * SANYA.cost + (keep && !own ? 2 * rentM : 0) };
  }
  const b = burn(c), hh = own ? HH_OWN : burn(city('hh'));
  return { base: b, annual: 8 * b + 2 * hh + 2 * SANYA.cost + (keep ? 4 * rentM : 0) };
}

// ---------------------------------------------------------------- verdict
const MINE = PRESETS.mine.w;
const wins = Object.values(PRESETS).filter(p => ranked(p.w)[0].c.id === 'bj').length;
const DEF = plan('bj', false, true), DEF_AVG = DEF.annual / 12;

$('#stations').innerHTML = [
  ['bj', '3–6 月 · 9–12 月 · 8 个月', true],
  ['hh', '7–8 月 · 避暑、母亲回家'],
  ['sy', '1–2 月 · 过冬'],
].map(([k, t, base]) => {
  const s = STATION[k];
  return `<div class="station"><i class="${base ? '' : 'ring'}" style="background:${col(s.c)};color:${col(s.c)}"></i><div><em>${s.role}</em><b>${s.name}</b><span>${t}</span></div></div>`;
}).join('');

$('#heroTiles').innerHTML = [
  ['北京基地得分', Math.round(total(city('bj'), MINE)), '/ 100', `4 套权重里 ${wins} 套排第一`],
  ['回呼和浩特', '2h09m', '', `高铁最快 ${Q('实')}`],
  ['基地两人月支出', wan(burn(city('bj'))), '', `北京，含医疗预留 ${Q('估')}`],
  ['启动储备', wan(18 * DEF_AVG), '', `18 个月 × 全年平均 ${wan(DEF_AVG)}/月`],
].map(([k, v, u, d]) => `<div class="tile"><span class="k">${k}</span><span class="v">${v}<small>${u}</small></span><span class="d">${d}</span></div>`).join('');
$('#whyBurn').textContent = wan(burn(city('bj')));
$('#riskCost').innerHTML = `两人月支出：北京 <b class="num">${wan(burn(city('bj')))}</b>，呼市 <b class="num">${wan(burn(city('hh')))}</b> ${Q('估')}`;
{
  const r = ranked(MINE).filter(x => x.c.id !== 'bj');
  $('#altBase').innerHTML = `<b>${r[0].c.name}</b>`;
  $('#altWhy').textContent = `去掉北京后按你的权重排序：${r.slice(0, 3).map(x => `${x.c.name} ${Math.round(x.t)}`).join('、')}；分差小，按事业方向选`;
}

// ---------------------------------------------------------------- life bar
const LIFE_SPAN = 40;
function drawLife() {
  const svg = d3.select('#lifeBar');
  const W = Math.max(900, svg.node().parentNode.clientWidth), H = 150;
  svg.attr('viewBox', `0 0 ${W} ${H}`).attr('height', H).selectAll('*').remove();
  const x = d3.scaleLinear([0, LIFE_SPAN], [16, W - 16]);
  const y0 = 54, bh = 26, rowY = [20, 40];
  const rowOf = { hh: 0, us: 0, bj: 0, hz: 1, trip: 0 };

  // 未来：建议的 3 年基地期 + 之后
  const fut = svg.append('g');
  [[NOW_AGE, NOW_AGE + 3, '基地 3 年', 1], [NOW_AGE + 3, LIFE_SPAN, '之后看收入关口', .45]].forEach(([a, b, t, o]) => {
    fut.append('rect').attr('x', x(a) + 1).attr('y', y0).attr('width', x(b) - x(a) - 2).attr('height', bh).attr('rx', 4)
      .attr('fill', 'none').attr('stroke', 'var(--ink)').attr('stroke-opacity', o).attr('stroke-dasharray', '4 4');
    fut.append('text').attr('x', (x(a) + x(b)) / 2).attr('y', y0 + bh / 2 + 4.5).attr('text-anchor', 'middle')
      .attr('class', 'lbl').attr('font-size', 12).attr('opacity', o === 1 ? 1 : .6).text(t);
  });

  const g = svg.append('g');
  for (const s of STAGES) {
    const x0 = x(s.a0) + 1, x1 = x(s.a1 + 1) - 1, mid = (x0 + x1) / 2, yrs = s.a1 - s.a0 + 1, ly = rowY[rowOf[s.id]];
    g.append('line').attr('class', 'lead-line').attr('x1', mid).attr('x2', mid).attr('y1', ly + 5).attr('y2', y0 - 2);
    const t = g.append('text').attr('x', mid).attr('y', ly).attr('text-anchor', 'middle').attr('class', 'lbl');
    t.append('tspan').text(s.name);
    t.append('tspan').attr('class', 'sub').attr('dx', 4).text(`${yrs} 年`);
    g.append('rect').attr('x', x0).attr('y', y0).attr('width', x1 - x0).attr('height', bh).attr('rx', 4).attr('fill', col(s.c))
      .on('pointermove', e => showTip(e, `<b>${s.name}</b>${row('年龄', `${s.a0}–${s.a1} 岁`)}${row('约', `${BIRTH_YEAR + s.a0}–${BIRTH_YEAR + s.a1 + 1}`)}${row('性质', s.kind)}${row('占 28 年', Math.round(yrs / NOW_AGE * 100) + '%')}`))
      .on('pointerleave', hideTip);
  }

  const ax = svg.append('g').attr('class', 'ax');
  for (const a of [0, 15, 22, 25, NOW_AGE, NOW_AGE + 3, LIFE_SPAN]) {
    ax.append('line').attr('x1', x(a)).attr('x2', x(a)).attr('y1', y0 + bh + 3).attr('y2', y0 + bh + 9);
    ax.append('text').attr('x', x(a)).attr('y', y0 + bh + 22).attr('text-anchor', 'middle').text(a);
    ax.append('text').attr('x', x(a)).attr('y', y0 + bh + 37).attr('text-anchor', 'middle').attr('opacity', .75).text(BIRTH_YEAR + a);
  }
  svg.append('text').attr('class', 'ax').attr('x', 16).attr('y', H - 4).text('岁 / 年份（约）');
  const nx = x(NOW_AGE);
  svg.append('line').attr('x1', nx).attr('x2', nx).attr('y1', y0 - 12).attr('y2', y0 + bh + 9).attr('stroke', 'var(--ink)').attr('stroke-width', 2);
  svg.append('text').attr('x', nx + 5).attr('y', rowY[1]).attr('class', 'lbl').text('现在');
}

function drawStays() {
  const svg = d3.select('#stayBars');
  const W = svg.node().clientWidth || 420, rh = 30, H = STAGES.length * rh + 6, lw = 72, vw = 92;
  svg.attr('viewBox', `0 0 ${W} ${H}`).attr('height', H).selectAll('*').remove();
  const x = d3.scaleLinear([0, 15], [lw, W - vw]);
  STAGES.forEach((s, i) => {
    const yrs = s.a1 - s.a0 + 1, y = i * rh + 4, prev = i ? STAGES[i - 1].a1 - STAGES[i - 1].a0 + 1 : 0;
    const g = svg.append('g');
    g.append('text').attr('x', 0).attr('y', y + 15).attr('font-size', 13).attr('font-weight', 700).text(s.name);
    g.append('rect').attr('x', lw).attr('y', y + 4).attr('width', Math.max(2, x(yrs) - lw)).attr('height', 14).attr('rx', 3)
      .attr('fill', col(s.c)).attr('fill-opacity', s.id === 'trip' ? .45 : 1);
    const t = g.append('text').attr('x', x(yrs) + 8).attr('y', y + 15).attr('class', 'lbl');
    t.append('tspan').text(`${yrs} 年`);
    if (s.id === 'trip') t.append('tspan').attr('class', 'sub').attr('dx', 5).text('流动');
    else if (i) t.append('tspan').attr('class', 'sub').attr('dx', 5).text(`= 上段 × ${(yrs / prev).toFixed(2)}`);
  });
}

$('#stageTable').innerHTML = `<tr><th>阶段</th><th class="n">年龄</th><th class="n">年数</th><th class="n">占 28 年</th><th>留下的资产</th></tr>` +
  STAGES.map(s => { const y = s.a1 - s.a0 + 1; return `<tr><td><span class="dot" style="background:${col(s.c)}"></span><b>${s.name}</b></td><td class="n">${s.a0}–${s.a1}</td><td class="n">${y}</td><td class="n">${(y / NOW_AGE * 100).toFixed(1)}%</td><td>${s.asset}</td></tr>`; }).join('');

// ---------------------------------------------------------------- map
// d3 treats rings as spherical: a ring wound the "wrong" way covers the rest of the globe, so flip those polygons.
const rewind = f => {
  const g = f.geometry, polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
  for (const rings of polys) if (d3.geoArea({ type: 'Polygon', coordinates: rings }) > 2 * Math.PI) rings.forEach(r => r.reverse());
  return f;
};
const feats = k => topojson.feature(GEO, GEO.objects[k]).features.filter(f => f.geometry).map(rewind);
const cnFeats = feats('cn');
const usFeats = feats('us').filter(f => { const [lon, lat] = d3.geoCentroid(f); return lon > -126 && lon < -65 && lat > 24 && lat < 50; });
const visited = new Set(store.get('lifeos.visited', []));
let mapMode = 'past';

function updateCount() { $('#visitCount').textContent = `环游足迹：已点亮 ${visited.size} / ${cnFeats.length} 个省级行政区`; }

function drawUS() {
  const s = d3.select('#usMap'), w = s.node().clientWidth || 148, h = 88;
  s.attr('viewBox', `0 0 ${w} ${h}`);
  const pr = d3.geoAlbers().fitExtent([[2, 2], [w - 2, h - 2]], { type: 'FeatureCollection', features: usFeats });
  s.selectAll('path').data(usFeats).join('path').attr('d', d3.geoPath(pr));
}

function drawMap() {
  const box = $('#mapBox'), W = box.clientWidth, narrow = W < 560;
  const H = Math.round(clamp(W * .72, 300, 600));
  const svg = d3.select('#map').attr('viewBox', `0 0 ${W} ${H}`).attr('height', H);
  svg.selectAll('*').remove();
  const proj = d3.geoConicEqualArea().parallels([25, 47]).rotate([-105, 0])
    .fitExtent([[14, 14], [W - 14, H - 14]], { type: 'FeatureCollection', features: cnFeats });
  const path = d3.geoPath(proj), P = ll => proj(ll);

  svg.append('g').attr('class', 'prov').selectAll('path').data(cnFeats).join('path')
    .attr('d', path).classed('on', f => visited.has(f.properties.k))
    .on('click', (e, f) => {
      const k = f.properties.k;
      visited.has(k) ? visited.delete(k) : visited.add(k);
      d3.select(e.currentTarget).classed('on', visited.has(k));
      store.set('lifeos.visited', [...visited]); updateCount();
      showTip(e, `<b>${f.properties.n}</b>${visited.has(k) ? '已点亮，再点取消' : '已取消'}`);
    })
    .on('pointermove', (e, f) => showTip(e, `<b>${f.properties.n}</b>${visited.has(f.properties.k) ? '已点亮，点击取消' : '去过就点亮'}`))
    .on('pointerleave', hideTip);

  const arc = (a, b, bend = .2) => {
    const [x1, y1] = a, [x2, y2] = b, mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
    return `M${x1},${y1}Q${mx - (y2 - y1) * bend},${my + (x2 - x1) * bend} ${x2},${y2}`;
  };
  const gA = svg.append('g'), gP = svg.append('g').attr('class', 'pt');
  const dot = (ll, color, r, label, sub, tipHtml, ring = false, dx = 9, anchor = 'start') => {
    const [px, py] = P(ll), g = gP.append('g');
    if (ring) g.append('circle').attr('class', 'ring').attr('cx', px).attr('cy', py).attr('r', r + 5).attr('stroke', color);
    g.append('circle').attr('cx', px).attr('cy', py).attr('r', r).attr('fill', color)
      .on('pointermove', e => showTip(e, tipHtml)).on('pointerleave', hideTip);
    const t = g.append('text').attr('x', px + dx).attr('y', py + 4).attr('text-anchor', anchor).text(label);
    if (sub) g.append('text').attr('class', 's').attr('x', px + dx).attr('y', py + 18).attr('text-anchor', anchor).text(sub);
    return t;
  };
  const S = id => STAGES.find(s => s.id === id);
  const stageTip = s => `<b>${s.name}</b>${row('年龄', `${s.a0}–${s.a1} 岁`)}${row('性质', s.kind)}`;

  if (mapMode === 'past') {
    let usPt = null;
    if (!narrow) {
      const cr = $('#usCard').getBoundingClientRect(), br = box.getBoundingClientRect();
      usPt = [cr.left - br.left - 4, cr.top - br.top + 30];
    }
    if (usPt) {
      gA.append('path').attr('class', 'arc').attr('d', arc(P(S('hh').ll), usPt, -.18)).attr('stroke', col(2));
      gA.append('path').attr('class', 'arc').attr('d', arc(usPt, P(S('bj').ll), -.12)).attr('stroke', col(3));
    }
    gA.append('path').attr('class', 'arc').attr('d', arc(P(S('bj').ll), P(S('hz').ll), .18)).attr('stroke', col(4));
    dot(S('hh').ll, col(1), 6, '呼和浩特', '0–14 岁', stageTip(S('hh')), false, -10, 'end');
    dot(S('bj').ll, col(3), 6, '北京', '22–24 岁', stageTip(S('bj')));
    dot(S('hz').ll, col(4), 6, '杭州', '25 岁', stageTip(S('hz')));
  } else {
    const bj = P(STAGES[2].ll);
    gA.append('path').attr('class', 'arc future').attr('d', arc(bj, P(STAGES[0].ll), -.25)).attr('stroke', col(1));
    gA.append('path').attr('class', 'arc future').attr('d', arc(bj, P(SANYA.ll), .15)).attr('stroke', col(0));
    for (const c of CITIES) {
      if (c.id === 'bj' || c.id === 'hh') continue;
      const t = Math.round(total(c, MINE));
      dot(c.ll, 'var(--faint)', 3.5, c.name, `${t} 分`, `<b>${c.name}</b>${row('按你的权重', t + ' 分')}${row('两人月支出', wan(burn(c)))}`, false, 8);
    }
    dot(STAGES[0].ll, col(1), 6, '呼和浩特 · 夏站', '7–8 月', `<b>呼和浩特</b>${row('7 月均温', '23°C')}${row('作用', '避暑、母亲回家')}`, true, -12, 'end');
    dot(STAGES[2].ll, col(3), 7, '北京 · 基地', `${Math.round(total(city('bj'), MINE))} 分 · 8 个月`, `<b>北京</b>${row('按你的权重', Math.round(total(city('bj'), MINE)) + ' 分')}${row('两人月支出', wan(burn(city('bj'))))}`, false, 12);
    dot(SANYA.ll, col(0), 6, '三亚 · 冬站', '1–2 月', `<b>三亚</b>${row('1 月均温', '22°C')}${row('两人月支出', wan(SANYA.cost) + '（冬季短租，估）')}`, true, 12);
  }
}

$('#mapMode').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  mapMode = b.dataset.m;
  for (const x of $('#mapMode').children) x.setAttribute('aria-pressed', x === b);
  $('#usCard').hidden = mapMode !== 'past';
  drawMap();
});

// ---------------------------------------------------------------- city model
const S = { preset: 'mine', w: { ...MINE } };

$('#presets').innerHTML = Object.entries(PRESETS).map(([k, p]) => `<button data-p="${k}" aria-pressed="${k === S.preset}">${p.label}</button>`).join('');
$('#presets').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  S.preset = b.dataset.p; S.w = { ...PRESETS[S.preset].w };
  syncSliders(); renderModel();
});
$('#customBtn').addEventListener('click', e => {
  const open = $('#sliders').hidden;
  $('#sliders').hidden = !open; e.currentTarget.setAttribute('aria-expanded', open);
});
$('#sliders').innerHTML = DIMS.map(d => `<label class="sl"><span>${d.name}</span><output id="o-${d.k}"></output><input type="range" id="w-${d.k}" min="0" max="50" step="5" data-k="${d.k}" aria-label="${d.name}权重"></label>`).join('') + '<div class="sl-sum" id="wsum"></div>';
$('#sliders').addEventListener('input', e => {
  const k = e.target.dataset.k; if (!k) return;
  S.w[k] = +e.target.value; S.preset = 'custom';
  syncSliders(); renderModel();
});
function syncSliders() {
  for (const d of DIMS) { $('#w-' + d.k).value = S.w[d.k]; $('#o-' + d.k).textContent = S.w[d.k]; }
  const s = wsum(S.w);
  $('#wsum').textContent = `合计 ${s}，按比例折算成 100`;
  for (const b of $('#presets').children) b.setAttribute('aria-pressed', b.dataset.p === S.preset);
}

function cellRaw(c, k) {
  switch (k) {
    case 'vc': return [(c.vcQ === '估' ? '≈' : '') + fmtInt(c.vc), `起 ${Q(c.vcQ)}`];
    case 'cost': return [wan(burn(c)), `每月 ${Q('估')}`];
    case 'med': return [c.a4 <= .5 ? '本市' : '≈ ' + hm(c.a4), Q(c.a4Q)];
    case 'clim': return [`${c.jan} / ${c.jul}°C`, c.heat ? '有集中供暖' : '无集中供暖'];
    case 'air': return [String(c.pm), Q(c.pmQ)];
    case 'home': return [c.home ? hm(c.home) : '0', Q(c.homeQ)];
    case 'root': return [c.years + ' 年', ''];
  }
}
const cellNote = (c, k) => ({ vc: c.vcNote, med: c.a4Note, air: c.pmNote, home: c.homeNote })[k] || '';

function renderModel() {
  const r = ranked(S.w), top = r[0].c.id, max = r[0].t, s = wsum(S.w) || 1;
  $('#rank').innerHTML = r.map(({ c, t }) => `<div class="rk${c.id === top ? ' first' : ''}" data-id="${c.id}"><span>${c.name}</span><div class="track"><div class="bar" style="width:${t}%"></div></div><span class="sc">${Math.round(t)}</span></div>`).join('');
  for (const el of $('#rank').children) {
    const c = city(el.dataset.id);
    el.onpointermove = e => showTip(e, `<b>${c.name} · ${Math.round(total(c, S.w))} 分</b>` + DIMS.map(d => row(d.name, `${Math.round(SC[c.id][d.k])} × ${Math.round(S.w[d.k] / s * 100)}% = ${(SC[c.id][d.k] * S.w[d.k] / s).toFixed(1)}`)).join(''));
    el.onpointerleave = hideTip;
  }

  $('#robust').innerHTML = Object.entries(PRESETS).map(([k, p]) => {
    const w = ranked(p.w)[0];
    return `<div class="rb${k === S.preset ? ' cur' : ''}"><span>${p.label}</span><b>${w.c.name}</b><span class="num">${Math.round(w.t)} 分</span></div>`;
  }).join('') + (S.preset === 'custom' ? `<div class="rb cur"><span>自定义</span><b>${r[0].c.name}</b><span class="num">${Math.round(max)} 分</span></div>` : '');
  $('#runnerUp').innerHTML = `当前权重：第一 <b>${r[0].c.name} ${Math.round(r[0].t)}</b>，第二 <b>${r[1].c.name} ${Math.round(r[1].t)}</b>，差 <b class="num">${(r[0].t - r[1].t).toFixed(1)}</b> 分。差距小于 3 分时，指标里的估算误差就可能改变排名。`;

  $('#heat').innerHTML = `<tr><th>城市</th>${DIMS.map(d => `<th>${d.name}<small>${d.sub} · ${Math.round(S.w[d.k] / s * 100)}%</small></th>`).join('')}<th>总分</th></tr>` +
    r.map(({ c, t }) => `<tr class="${c.id === top ? 'first' : ''}"><td>${c.name}</td>${DIMS.map(d => {
      const sc = SC[c.id][d.k], [v, sub] = cellRaw(c, d.k), n = cellNote(c, d.k);
      return `<td style="background:rgba(var(--heat),${(.03 + sc / 100 * .17).toFixed(3)})" title="${n ? n + ' · ' : ''}得分 ${Math.round(sc)}"><b>${v}</b><small>${sub}${sub ? ' · ' : ''}${Math.round(sc)} 分</small></td>`;
    }).join('')}<td class="tot"><b>${Math.round(t)}</b></td></tr>`).join('');
}

// ---------------------------------------------------------------- life plan
const MONTHS = d3.range(12);
$('#months').innerHTML = MONTHS.map(i => {
  const s = STATION[PLAN[i]], first = i === 0 || PLAN[i - 1] !== PLAN[i];
  return `<div class="mo" style="--c:${col(s.c)}" title="${i + 1} 月 · ${s.name}（${s.role}）"><b>${i + 1}</b><span>${first ? s.name : '·'}</span></div>`;
}).join('');
$('#tempLegend').innerHTML = `<span><i></i>按方案，所在地月均温</span><span><i class="dash"></i>全年留在北京</span><span><i class="band"></i>15–25°C 参考带</span><span>北京 11 月 15 日起集中供暖</span>`;

function drawTemp() {
  const svg = d3.select('#tempChart'), W = svg.node().clientWidth || 600, H = 230, m = { l: 36, r: 76, t: 12, b: 26 };
  svg.attr('viewBox', `0 0 ${W} ${H}`).attr('height', H).selectAll('*').remove();
  const x = d3.scalePoint(MONTHS, [m.l + 8, W - m.r]), y = d3.scaleLinear([-12, 32], [H - m.b, m.t]);
  const planT = MONTHS.map(i => TEMP[PLAN[i]][i]), stayT = TEMP.bj;
  svg.append('rect').attr('x', m.l).attr('width', W - m.r - m.l + 8).attr('y', y(25)).attr('height', y(15) - y(25)).attr('fill', 'rgba(var(--heat),.07)');
  const ax = svg.append('g').attr('class', 'ax');
  for (const v of [-10, 0, 10, 20, 30]) {
    ax.append('line').attr('x1', m.l).attr('x2', W - m.r + 8).attr('y1', y(v)).attr('y2', y(v));
    ax.append('text').attr('x', m.l - 6).attr('y', y(v) + 4).attr('text-anchor', 'end').text(v + '°');
  }
  for (const i of MONTHS) ax.append('text').attr('x', x(i)).attr('y', H - 6).attr('text-anchor', 'middle').text(i + 1 + (W < 520 ? '' : '月'));
  const line = d3.line().x((d, i) => x(i)).y(d => y(d));
  svg.append('path').attr('d', line(stayT)).attr('fill', 'none').attr('stroke', 'var(--muted)').attr('stroke-width', 2).attr('stroke-dasharray', '5 4');
  svg.append('path').attr('d', line(planT)).attr('fill', 'none').attr('stroke', 'var(--ink)').attr('stroke-width', 2);
  const g = svg.append('g');
  MONTHS.forEach(i => g.append('circle').attr('cx', x(i)).attr('cy', y(planT[i])).attr('r', 4.5).attr('fill', col(STATION[PLAN[i]].c)).attr('stroke', 'var(--surface)').attr('stroke-width', 2));
  svg.append('text').attr('class', 'lbl').attr('font-size', 12).attr('x', x(11) + 10).attr('y', y(planT[11]) + 4).text('按方案');
  svg.append('text').attr('class', 'sub').attr('x', x(11) + 10).attr('y', y(stayT[11]) + 18).text('全年北京');
  const cur = svg.append('line').attr('y1', m.t).attr('y2', H - m.b).attr('stroke', 'var(--ink)').attr('stroke-dasharray', '2 3').attr('opacity', 0);
  svg.append('rect').attr('class', 'hit').attr('x', m.l).attr('y', m.t).attr('width', W - m.r - m.l + 8).attr('height', H - m.t - m.b)
    .on('pointermove', e => {
      const [mx] = d3.pointer(e), i = MONTHS.reduce((a, b) => Math.abs(x(b) - mx) < Math.abs(x(a) - mx) ? b : a, 0), s = STATION[PLAN[i]];
      cur.attr('x1', x(i)).attr('x2', x(i)).attr('opacity', .6);
      showTip(e, `<b>${i + 1} 月 · ${s.name}（${s.role}）</b>${row('按方案', planT[i].toFixed(1) + '°C')}${row('全年北京', stayT[i].toFixed(1) + '°C')}`);
    })
    .on('pointerleave', () => { cur.attr('opacity', 0); hideTip(); });
}

$('#base').innerHTML = CITIES.map(c => `<option value="${c.id}"${c.id === 'bj' ? ' selected' : ''}>${c.name}</option>`).join('');
function calc() {
  const baseId = $('#base').value, own = $('#own').checked, keep = $('#keep').checked;
  const sv = Math.max(0, +$('#savings').value || 0), p = plan(baseId, own, keep), avg = p.annual / 12, runway = sv / avg, need = 18 * avg;
  const ok = runway >= 18;
  $('#calcTiles').innerHTML = [
    ['基地两人月支出', wan(p.base), city(baseId).name],
    ['全年支出', wan(p.annual), '含两个季节站'],
    ['盈亏线', wan(avg), '全年平均每月'],
    ['储备能撑', runway.toFixed(1), '个月', ok ? '够 18 个月' : `离 18 个月还差 ${wan(need - sv)}`],
  ].map(([k, v, u, d]) => d === undefined
    ? `<div class="tile"><span class="k">${k}</span><span class="v">${v}</span><span class="d">${u}</span></div>`
    : `<div class="tile"><span class="k">${k}</span><span class="v">${v}<small>${u}</small></span><span class="d">${d}</span></div>`).join('');
  const c = city(baseId);
  $('#calcNote').innerHTML = baseId === 'hh'
    ? `呼市做基地：10 个月在家，1–2 月三亚 ${wan(SANYA.cost)}/月${keep && !own ? '，外出时保留租约' : ''}。基地月支出 = 租金 ${c.rent} 元/㎡ × ${AREA}㎡ + 两人生活费 ${fmtInt(c.living)} + 医疗预留 ${fmtInt(MED_RESERVE)}（${own ? '自住房：只算生活费和预留' : '估'}）。`
    : `基地月支出 = 租金 ${c.rent} 元/㎡ × ${AREA}㎡ + 两人生活费 ${fmtInt(c.living)} + 医疗预留 ${fmtInt(MED_RESERVE)}。全年 = 基地 8 个月 + 呼市 2 个月（${wan(own ? HH_OWN : burn(city('hh')))}/月）+ 三亚 2 个月（${wan(SANYA.cost)}/月）${keep ? ` + 外出 4 个月照付基地房租 ${wan(c.rent * AREA)}/月` : ''}。全部为估算。`;

  const fb = plan('hh', own, keep).annual / 12;
  const gates = [
    ['0–6', '个月', '验证', `拿到第一笔收入，或 10 个明确的付费意向。没拿到：<b>换方向，不换城市</b>。`],
    ['6–12', '个月', '起量', `月收入 ≥ 盈亏线的一半，约 <b class="num">${wan(avg / 2)}</b>。没到：砍掉非必要支出，季节站缩到一段。`],
    ['12–18', '个月', '自负盈亏', `月收入 ≥ 盈亏线，约 <b class="num">${wan(avg)}</b>。`],
    ['18', '个月', '硬关口', baseId === 'hh'
      ? `月收入仍不到一半：接项目或兼职补现金流，事业改为副线。`
      : `月收入仍不到一半：基地换呼和浩特，平均月支出降到约 <b class="num">${wan(fb)}</b>，同时接项目补现金流。`],
    ['36', '个月', '复盘基地', `续约${c.name}或换城市。回到上面的选城模型，用三年的真实数据重新打分。`],
  ];
  $('#gates').innerHTML = gates.map(([m, u, h, p]) => `<li><div class="m">${m}<small>${u}</small></div><div><h4>${h}</h4><p>${p}</p></div></li>`).join('');
}
for (const id of ['base', 'savings', 'own', 'keep']) $('#' + id).addEventListener('input', calc);

$('#sources').innerHTML = SOURCES.map(s => `<li>${s.t}${s.u ? ` · <a href="${s.u}" target="_blank" rel="noopener">${new URL(s.u).hostname}</a>` : ''}</li>`).join('');

// ---------------------------------------------------------------- boot
function drawAll() { drawLife(); drawStays(); drawUS(); drawMap(); drawTemp(); }
syncSliders(); renderModel(); calc(); updateCount(); drawAll();
let raf = 0, lastW = innerWidth;
new ResizeObserver(() => {
  if (innerWidth === lastW && raf) return;
  cancelAnimationFrame(raf); raf = requestAnimationFrame(() => { lastW = innerWidth; drawAll(); });
}).observe(document.body);
