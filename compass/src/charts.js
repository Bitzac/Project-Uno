/* ---------- SVG charts: hairline grid, 2px lines, ringed markers, data-tip hover ---------- */
const f1 = v => Math.round(v * 10) / 10;
const tipAttr = t => t ? ` data-tip="${esc(t)}"` : '';

// five-axis radar; null values leave a gap (no vertex) instead of pretending to be zero
function radarSVG(labels, cur, prev, o = {}) {
  const W = o.w || 360, H = o.h || 320, cx = W / 2, cy = H / 2 + 6, R = Math.min(W, H) / 2 - 58;
  const n = labels.length, ang = i => -Math.PI / 2 + i * 2 * Math.PI / n;
  const pt = (i, v) => [cx + Math.cos(ang(i)) * R * v / 100, cy + Math.sin(ang(i)) * R * v / 100];
  let s = `<svg class="radar" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.aria || '综合素质五维图')}">`;
  for (const r of [20, 40, 60, 80, 100]) s += `<polygon class="ring${r === 60 ? ' mid' : ''}" points="${labels.map((_, i) => pt(i, r).map(f1).join(',')).join(' ')}"/>`;
  labels.forEach((_, i) => { const [x, y] = pt(i, 100); s += `<line class="spoke" x1="${cx}" y1="${cy}" x2="${f1(x)}" y2="${f1(y)}"/>`; });
  const ta = ang(0) + Math.PI / n; // scale labels sit between the first two axes
  for (const r of [100]) s += `<text class="rtick" x="${f1(cx + Math.cos(ta) * R * r / 100 + 3)}" y="${f1(cy + Math.sin(ta) * R * r / 100 - 3)}">${r}</text>`;
  const poly = (vals, cls) => {
    const ps = vals.map((v, i) => v == null ? null : pt(i, clamp(v, 0, 100))).filter(Boolean);
    if (ps.length < 3) return '';
    return `<polygon class="${cls}" points="${ps.map(p => p.map(f1).join(',')).join(' ')}"/>`;
  };
  if (prev) s += poly(prev, 'rp-prev');
  s += poly(cur, 'rp-cur');
  cur.forEach((v, i) => {
    if (v == null) return;
    const [x, y] = pt(i, clamp(v, 0, 100));
    s += `<circle class="rdot" cx="${f1(x)}" cy="${f1(y)}" r="4.5"${tipAttr(`${labels[i]} ${nf(v, 0)}${prev && prev[i] != null ? `（上期 ${nf(prev[i], 0)}）` : ''}`)}/>`;
  });
  labels.forEach((l, i) => {
    const [x, y] = pt(i, 100), a = ang(i), dx = Math.cos(a), dy = Math.sin(a);
    const tx = x + dx * 16, ty = y + dy * 16 + (dy > 0.3 ? 12 : dy < -0.3 ? -8 : 4);
    const anchor = Math.abs(dx) < 0.2 ? 'middle' : dx > 0 ? 'start' : 'end';
    const v = cur[i];
    s += `<text class="rlab" x="${f1(tx)}" y="${f1(ty)}" text-anchor="${anchor}">${esc(l)}</text>`;
    s += `<text class="rval${v == null ? ' na' : ''}" x="${f1(tx)}" y="${f1(ty + 16)}" text-anchor="${anchor}">${v == null ? '暂无' : nf(v, 0)}</text>`;
  });
  return s + '</svg>';
}

// generic line chart: x and y are numeric; ticks carry their own labels
function lineSVG(c) {
  const W = c.w || 640, H = c.h || 240, m = Object.assign({ l: 40, r: 64, t: 14, b: 28 }, c.m || {});
  const X = v => m.l + (v - c.x.min) / ((c.x.max - c.x.min) || 1) * (W - m.l - m.r);
  const Y = v => H - m.b - (clamp(v, c.y.min, c.y.max) - c.y.min) / ((c.y.max - c.y.min) || 1) * (H - m.t - m.b);
  let s = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(c.aria || '')}">`;
  for (const b of c.bands || []) s += `<rect class="band ${b.cls || ''}" x="${m.l}" y="${f1(Y(b.y1))}" width="${W - m.l - m.r}" height="${f1(Math.max(0, Y(b.y0) - Y(b.y1)))}"/>` + (b.label ? `<text class="blab" x="${W - m.r + 6}" y="${f1((Y(b.y0) + Y(b.y1)) / 2 + 4)}">${esc(b.label)}</text>` : '');
  for (const t of c.y.ticks) s += `<line class="grid" x1="${m.l}" x2="${W - m.r}" y1="${f1(Y(t.v))}" y2="${f1(Y(t.v))}"/><text class="tick" x="${m.l - 8}" y="${f1(Y(t.v) + 4)}" text-anchor="end">${esc(t.label ?? t.v)}</text>`;
  for (const t of c.x.ticks) s += `<text class="tick" x="${f1(X(t.v))}" y="${H - 8}" text-anchor="middle">${esc(t.label)}</text>`;
  s += `<line class="axis" x1="${m.l}" x2="${W - m.r}" y1="${H - m.b}" y2="${H - m.b}"/>`;
  for (const ln of c.series) {
    const ps = ln.pts.filter(p => p.y != null);
    if (!ps.length) continue;
    const d = ps.map((p, i) => `${i ? 'L' : 'M'}${f1(X(p.x))} ${f1(Y(p.y))}`).join('');
    if (ln.area && ps.length > 1) s += `<path class="area ${ln.cls}" d="${d}L${f1(X(ps[ps.length - 1].x))} ${H - m.b}L${f1(X(ps[0].x))} ${H - m.b}Z"/>`;
    if (ps.length > 1) s += `<path class="line ${ln.cls}${ln.dash ? ' dash' : ''}" d="${d}"/>`;
    if (ln.dots !== false) for (const p of ps) s += `<circle class="dot ${ln.cls}" cx="${f1(X(p.x))}" cy="${f1(Y(p.y))}" r="${ln.r || 4}"/><circle class="hit" cx="${f1(X(p.x))}" cy="${f1(Y(p.y))}" r="12"${tipAttr(p.tip)}/>`;
    if (ln.label) { const p = ps[ps.length - 1]; s += `<text class="elab" x="${f1(X(p.x) + 9)}" y="${f1(Y(p.y) + 4)}">${esc(ln.label)}</text>`; }
  }
  return s + '</svg>';
}

// daily bars against a recommended band (sleep hours, active minutes)
function barsSVG(c) {
  const W = c.w || 640, H = c.h || 150, m = { l: 34, r: 12, t: 10, b: 24 };
  const n = c.days, bw = (W - m.l - m.r) / n;
  const Y = v => H - m.b - clamp(v, 0, c.max) / c.max * (H - m.t - m.b);
  let s = `<svg class="chart bars" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(c.aria || '')}">`;
  if (c.band) s += `<rect class="band" x="${m.l}" y="${f1(Y(c.band[1]))}" width="${W - m.l - m.r}" height="${f1(Y(c.band[0]) - Y(c.band[1]))}"/>`;
  for (const t of c.ticks) s += `<line class="grid" x1="${m.l}" x2="${W - m.r}" y1="${f1(Y(t))}" y2="${f1(Y(t))}"/><text class="tick" x="${m.l - 6}" y="${f1(Y(t) + 4)}" text-anchor="end">${t}</text>`;
  c.vals.forEach((v, i) => {
    const x = m.l + i * bw + Math.max(1, bw * 0.18), w = Math.max(2, Math.min(14, bw * 0.64));
    if (v.y == null) return;
    const y = Y(v.y), h = H - m.b - y;
    s += `<path class="bar${v.ok ? '' : ' low'}" d="M${f1(x)} ${H - m.b}V${f1(y + Math.min(3, h))}q0 -3 3 -3h${f1(w - 6)}q3 0 3 3V${H - m.b}Z"/>`;
    s += `<rect class="hit" x="${f1(m.l + i * bw)}" y="${m.t}" width="${f1(bw)}" height="${H - m.t - m.b}"${tipAttr(v.tip)}/>`;
  });
  for (const t of c.xt) s += `<text class="tick" x="${f1(m.l + t.i * bw + bw / 2)}" y="${H - 6}" text-anchor="middle">${esc(t.label)}</text>`;
  s += `<line class="axis" x1="${m.l}" x2="${W - m.r}" y1="${H - m.b}" y2="${H - m.b}"/>`;
  return s + '</svg>';
}

function spark(arr, o = {}) {
  if (!arr.length) return '';
  const w = o.w || 92, h = o.h || 28, pad = 4, lo = Math.min(...arr, o.lo ?? 100), hi = Math.max(...arr, o.hi ?? 0);
  const x = i => arr.length === 1 ? w / 2 : pad + i * (w - pad * 2) / (arr.length - 1);
  const y = v => hi === lo ? h / 2 : h - pad - (v - lo) / (hi - lo) * (h - pad * 2);
  const up = arr[arr.length - 1] >= arr[0] ? 'up' : 'dn';
  const d = arr.map((v, i) => `${i ? 'L' : 'M'}${f1(x(i))} ${f1(y(v))}`).join('');
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" aria-hidden="true"><path class="sl ${up}" d="${d}"/><circle class="${up}" cx="${f1(x(arr.length - 1))}" cy="${f1(y(arr[arr.length - 1]))}" r="3"/></svg>`;
}

// line-art face for the 1–5 mood scale
function moodFace(level, size = 28) {
  const c = size / 2, r = c - 1.5, my = c + r * 0.32, w = r * 0.5;
  const curve = [0, -0.34, -0.16, 0, 0.18, 0.36][level] * r;
  return `<svg class="face f${level}" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" aria-hidden="true"><circle cx="${c}" cy="${c}" r="${r}"/><circle class="eye" cx="${f1(c - r * 0.36)}" cy="${f1(c - r * 0.16)}" r="${f1(r * 0.09)}"/><circle class="eye" cx="${f1(c + r * 0.36)}" cy="${f1(c - r * 0.16)}" r="${f1(r * 0.09)}"/><path d="M${f1(c - w)} ${f1(my - curve / 2)}Q${c} ${f1(my + curve)} ${f1(c + w)} ${f1(my - curve / 2)}"/></svg>`;
}

// nice round ticks between lo and hi
function niceTicks(lo, hi, n = 4) {
  const span = hi - lo || 1, step0 = span / n, mag = Math.pow(10, Math.floor(Math.log10(step0)));
  const step = [1, 2, 2.5, 5, 10].map(k => k * mag).find(s => span / s <= n) || 10 * mag;
  const a = Math.floor(lo / step) * step, b = Math.ceil(hi / step) * step, out = [];
  for (let v = a; v <= b + step / 2; v += step) out.push(+v.toFixed(6));
  return out;
}
