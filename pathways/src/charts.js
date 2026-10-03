// Small SVG charts drawn to scale from trends.json, with a nearest-point tooltip.
const SERIES = Object.fromEntries(T.series.map(s => [s.id, s]));
const usd = v => '$' + fmtNum(v);
const minutes = v => (v < 1 ? `${Math.round(v * 60)} 秒` : v < 60 ? `${v} 分钟` : `${(v / 60).toFixed(1)} 小时`);
const CHART_CFG = {
  compute: { fmt: v => `${sci(v)} FLOP`, tick: sci, labels: ['AlexNet', 'GPT-3', 'GPT-4', 'GPT-6 Astra'] },
  horizon: { fmt: minutes, ticks: [[0.1, '6 秒'], [1, '1 分'], [10, '10 分'], [60, '1 时'], [480, '8 时']], labels: ['GPT-4', 'o1', 'GPT-5', 'Claude Mythos Preview'] },
  capex: { fmt: v => `${(v * 10).toLocaleString('en-US')} 亿美元`, tick: v => String(v) },
  dc: { fmt: v => `${v.toLocaleString('en-US')} TWh`, tick: v => v.toLocaleString('en-US') },
  internet: { fmt: v => `${v}%`, tick: v => v + '%' },
  waymo: { fmt: v => `每周 ${v} 千单`, tick: v => String(v) },
  solar: { fmt: v => `$${v.toFixed(v < 1 ? 2 : 1)}/W`, tick: usd },
  genome: { fmt: v => usd(v), tick: usd },
  launch: { fmt: v => `$${v.toLocaleString('en-US')}/kg`, tick: usd, labels: ['Saturn V', 'Space Shuttle', 'Falcon 9', 'Falcon Heavy'] },
};

function niceStep(span, n) {
  const raw = span / n, p = 10 ** Math.floor(Math.log10(raw));
  return [1, 2, 2.5, 5, 10].map(m => m * p).find(s => span / s <= n) || 10 * p;
}

function drawChart(holder, s, { mini = false } = {}) {
  const cfg = CHART_CFG[s.id] || {};
  const W = Math.max(240, holder.clientWidth || 320);
  const H = mini ? 150 : 190;
  const m = { l: 46, r: 14, t: 14, b: 24 };
  const pw = W - m.l - m.r, ph = H - m.t - m.b;
  const pts = s.points;
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  let x0 = Math.min(...xs), x1 = Math.max(...xs);
  if (s.kind === 'bar') { x0 -= 0.6; x1 += 0.6; } else { const pad = (x1 - x0) * 0.03; x0 -= pad; x1 += pad; }
  let y0, y1, yTicks;
  if (s.log) {
    y0 = 10 ** Math.floor(Math.log10(Math.min(...ys)));
    y1 = 10 ** Math.ceil(Math.log10(Math.max(...ys) * 1.05));
    if (cfg.ticks) yTicks = cfg.ticks.filter(([v]) => v >= y0 && v <= y1);
    else {
      const dec = Math.log10(y1 / y0), step = Math.max(1, Math.ceil(dec / (mini ? 4 : 5)));
      yTicks = [];
      for (let e = Math.log10(y0); e <= Math.log10(y1) + 1e-9; e += step) yTicks.push([10 ** e, cfg.tick ? cfg.tick(10 ** e) : fmtNum(10 ** e)]);
    }
  } else {
    y0 = 0;
    const st = niceStep(Math.max(...ys), mini ? 3 : 4);
    y1 = Math.ceil(Math.max(...ys) * 1.08 / st) * st;
    yTicks = [];
    for (let v = 0; v <= y1 + 1e-9; v += st) yTicks.push([v, cfg.tick ? cfg.tick(v) : fmtNum(v)]);
  }
  const X = x => m.l + (x - x0) / (x1 - x0) * pw;
  const Y = v => (s.log ? m.t + ph - Math.log10(v / y0) / Math.log10(y1 / y0) * ph : m.t + ph - (v - y0) / (y1 - y0) * ph);

  const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': `${s.title}，${s.sub}` });
  const grid = svgEl('g', { class: 'c-grid' }, svg);
  const axis = svgEl('g', { class: 'c-axis' }, svg);
  for (const [v, lab] of yTicks) {
    svgEl('line', { x1: m.l, x2: W - m.r, y1: Y(v), y2: Y(v) }, grid);
    const t = svgEl('text', { x: m.l - 6, y: Y(v) + 3, 'text-anchor': 'end' }, axis);
    t.textContent = lab;
  }
  const xspan = x1 - x0, xstep = s.kind === 'bar' ? 1 : ([1, 2, 5, 10, 20, 25, 50, 100].find(k => xspan / k <= (mini ? 3 : 5)) || 100);
  for (let x = Math.ceil(x0 / xstep) * xstep; x <= x1; x += xstep) {
    const t = svgEl('text', { x: X(x), y: H - 6, 'text-anchor': 'middle' }, axis);
    t.textContent = Math.round(x);
  }
  svgEl('line', { class: 'c-base', x1: m.l, x2: W - m.r, y1: m.t + ph, y2: m.t + ph }, svg);

  const isProj = p => s.proj_from != null && p[0] >= s.proj_from;
  if (s.kind === 'bar') {
    const bw = Math.min(24, pw / pts.length * 0.5);
    for (const p of pts) {
      const x = X(p[0]) - bw / 2, y = Y(p[1]), yb = m.t + ph, r = Math.min(4, (yb - y) / 2);
      svgEl('path', { class: 'c-bar' + (isProj(p) ? ' proj' : ''), d: `M${x} ${yb} V${y + r} Q${x} ${y} ${x + r} ${y} H${x + bw - r} Q${x + bw} ${y} ${x + bw} ${y + r} V${yb} Z` }, svg);
      const t = svgEl('text', { class: 'c-lab', x: X(p[0]), y: y - 5, 'text-anchor': 'middle' }, svg);
      t.textContent = p[1] + (isProj(p) ? '*' : '');
    }
  } else if (s.kind === 'line') {
    const act = pts.filter(p => !isProj(p)), proj = pts.filter(isProj);
    const line = list => list.map((p, i) => `${i ? 'L' : 'M'}${X(p[0]).toFixed(1)} ${Y(p[1]).toFixed(1)}`).join('');
    if (!s.log && act.length > 1) svgEl('path', { class: 'c-area', d: `${line(act)}L${X(act[act.length - 1][0])} ${m.t + ph}L${X(act[0][0])} ${m.t + ph}Z` }, svg);
    svgEl('path', { class: 'c-line', d: line(act) }, svg);
    if (proj.length) svgEl('path', { class: 'c-line proj', d: line([act[act.length - 1], ...proj]) }, svg);
    const dotsAll = pts.length <= 8;
    pts.forEach((p, i) => { if (dotsAll || i === act.length - 1) svgEl('circle', { class: 'c-dot' + (isProj(p) ? ' proj' : ''), cx: X(p[0]), cy: Y(p[1]), r: 4 }, svg); });
    const last = act[act.length - 1];
    const early = X(last[0]) < m.l + pw * 0.35;
    const t = svgEl('text', { class: 'c-lab end', x: X(last[0]) + (early ? 8 : -6), y: Y(last[1]) - 8, 'text-anchor': early ? 'start' : 'end' }, svg);
    t.textContent = (cfg.fmt || fmtNum)(last[1]);
  } else {
    for (const p of pts) svgEl('circle', { class: 'c-dot', cx: X(p[0]), cy: Y(p[1]), r: 4 }, svg);
    const want = cfg.labels || [];
    if (!mini) for (const p of pts) {
      if (!want.includes(p[2])) continue;
      const right = X(p[0]) < m.l + pw * 0.7;
      const t = svgEl('text', { class: 'c-lab' + (p === pts[pts.length - 1] ? ' end' : ''), x: X(p[0]) + (right ? 7 : -7), y: Y(p[1]) + (right ? 4 : -7), 'text-anchor': right ? 'start' : 'end' }, svg);
      t.textContent = p[2];
    }
  }

  // hover layer
  const cross = svgEl('line', { class: 'c-cross', y1: m.t, y2: m.t + ph, opacity: 0 }, svg);
  const hit = svgEl('rect', { x: m.l, y: m.t, width: pw, height: ph, fill: 'transparent' }, svg);
  const tip = document.createElement('div');
  tip.className = 'tip';
  tip.hidden = true;
  const move = e => {
    const r = svg.getBoundingClientRect(), k = W / r.width;
    const px = (e.clientX - r.left) * k, py = (e.clientY - r.top) * k;
    let best = null, bd = Infinity;
    for (const p of pts) {
      const d = s.kind === 'scatter' ? Math.hypot(X(p[0]) - px, Y(p[1]) - py) : Math.abs(X(p[0]) - px);
      if (d < bd) { bd = d; best = p; }
    }
    if (!best) return;
    cross.setAttribute('x1', X(best[0])); cross.setAttribute('x2', X(best[0])); cross.setAttribute('opacity', 1);
    const label = typeof best[2] === 'string' && !/^\d{4}-\d{2}$/.test(best[2]) ? best[2] : '';
    tip.innerHTML = `<b>${esc((cfg.fmt || fmtNum)(best[1]))}</b><span class="num">${esc(fmtYear(best[0]))}${label ? ' · ' + esc(label) : ''}${isProj(best) ? ' · 预测/指引' : ''}</span>`;
    tip.hidden = false;
    const tx = X(best[0]) / k, ty = Y(best[1]) / k;
    const hw = holder.clientWidth;
    tip.style.left = Math.min(hw - tip.offsetWidth - 4, Math.max(4, tx + 10)) + 'px';
    tip.style.top = Math.max(0, ty - tip.offsetHeight - 10 + svg.offsetTop) + 'px';
  };
  hit.addEventListener('pointermove', move);
  hit.addEventListener('pointerdown', move);
  hit.addEventListener('pointerleave', () => { cross.setAttribute('opacity', 0); tip.hidden = true; });

  holder.innerHTML = '';
  holder.appendChild(svg);
  holder.appendChild(tip);
}

function chartCard(s) {
  const el = document.createElement('figure');
  el.className = 'chart glass';
  el.style.margin = '0';
  el.innerHTML = `<div><h4>${esc(s.title)}</h4><p class="sub">${esc(s.sub)}</p></div><div class="c-body" style="position:relative"></div><p class="note">${esc(s.note || '')} <span class="num">数据截至 ${esc(s.asof)}</span></p>${sources(s.src)}`;
  return el;
}

function mountChart(holder, id, opts) {
  const s = SERIES[id];
  if (!s) return;
  const draw = () => drawChart(holder, s, opts);
  draw();
  let w = holder.clientWidth;
  new ResizeObserver(() => { if (holder.clientWidth && Math.abs(holder.clientWidth - w) > 2) { w = holder.clientWidth; draw(); } }).observe(holder);
}
