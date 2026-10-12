// ---------- charts (hand-written SVG / CSS) ----------
const tipAttr = (h, body) => `data-tip-h="${esc(h)}" data-tip="${esc(body)}"`;

function radarSVG(dims, selfDims) {
  const W = 440, H = 380, cx = 220, cy = 192, R = 132, n = dims.length;
  const ang = i => -Math.PI / 2 + i * 2 * Math.PI / n;
  const pt = (i, v) => [cx + Math.cos(ang(i)) * R * v / 100, cy + Math.sin(ang(i)) * R * v / 100];
  const poly = vals => vals.map((v, i) => pt(i, v ?? 0).map(x => x.toFixed(1)).join(',')).join(' ');
  let g = '';
  for (const r of [25, 50, 75, 100]) g += `<polygon class="ring" points="${poly(dims.map(() => r))}"/>`;
  dims.forEach((d, i) => { const [x, y] = pt(i, 100); g += `<line class="ax" x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}"/>`; });
  for (const r of [50]) g += `<text x="${cx + 4}" y="${(cy - R * r / 100 - 3).toFixed(1)}" style="font-size:9.5px;fill:var(--faint)" class="num">${r}</text>`;
  const ev = dims.map(d => d.ev ?? 0);
  g += `<polygon points="${poly(ev)}" style="fill:var(--s1-soft);stroke:var(--s1);stroke-width:2;stroke-linejoin:round"/>`;
  const hasSelf = selfDims && dims.some(d => selfDims[d.id] != null);
  if (hasSelf) g += `<polygon points="${poly(dims.map(d => selfDims[d.id]))}" style="fill:var(--s2-soft);stroke:var(--s2);stroke-width:2;stroke-linejoin:round"/>`;
  dims.forEach((d, i) => {
    const [x, y] = pt(i, ev[i]);
    g += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4" style="fill:var(--s1);stroke:var(--bg);stroke-width:2"/>`;
    if (hasSelf && selfDims[d.id] != null) {
      const [sx, sy] = pt(i, selfDims[d.id]);
      g += `<circle cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="4" style="fill:var(--s2);stroke:var(--bg);stroke-width:2"/>`;
    }
  });
  dims.forEach((d, i) => {
    const a = ang(i), lx = cx + Math.cos(a) * (R + 26), ly = cy + Math.sin(a) * (R + 22);
    const anchor = Math.abs(Math.cos(a)) < .2 ? 'middle' : Math.cos(a) > 0 ? 'start' : 'end';
    const dy = Math.sin(a) < -.5 ? -10 : Math.sin(a) > .5 ? 6 : -4;
    const sv = hasSelf ? selfDims[d.id] : null;
    g += `<text x="${lx.toFixed(1)}" y="${(ly + dy).toFixed(1)}" text-anchor="${anchor}"><tspan class="lbl">${d.name}</tspan><tspan x="${lx.toFixed(1)}" dy="15" class="val" style="fill:var(--ink)">${r0(d.ev)}</tspan>${sv != null ? `<tspan class="val" style="fill:var(--faint)"> · ${r0(sv)}</tspan>` : ''}</text>`;
    const [hx, hy] = pt(i, 100);
    g += `<circle class="hit" cx="${hx.toFixed(1)}" cy="${hy.toFixed(1)}" r="20" tabindex="0" ${tipAttr(d.name + ' · ' + d.desc, `证据 ${r0(d.ev)}${sv != null ? ` · 自评 ${r0(sv)}（差 ${sv - d.ev > 0 ? '+' : ''}${Math.round(sv - d.ev)}）` : ' · 自评未做'}`)}/>`;
  });
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="八维雷达：${dims.map(d => d.name + r0(d.ev)).join('，')}">${g}</svg>`;
}

function dBars(rows) {
  // rows: [{name, en, ev, self}]
  const bar = (v, cls) => `<div class="row"><div class="trackbar ${cls}"><i style="width:${(v ?? 0).toFixed(1)}%"></i></div><em class="${v == null ? 'na' : ''}">${v == null ? '—' : Math.round(v)}</em></div>`;
  return `<div class="dbars">${rows.map(r => `<div class="dbar" tabindex="0" ${tipAttr(r.name + ' ' + r.en, `证据 ${r0(r.ev)} · 自评 ${r.self == null ? '未做' : r0(r.self)}`)}>
    <div class="dn">${r.name}<small>${r.en}</small></div><div class="rows">${bar(r.ev, '')}${bar(r.self, 'self')}</div></div>`).join('')}
    <div class="axisrow" aria-hidden="true"><span></span><div><span>0</span><span>50</span><span>100</span></div></div></div>`;
}

function heatmap(activity, from, to) {
  const DAY = 864e5;
  const start = new Date(from + 'T00:00:00Z');
  start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7)); // back to Monday
  const end = new Date(to + 'T00:00:00Z');
  const endW = end.getTime() + (6 - (end.getUTCDay() + 6) % 7) * DAY; // through Sunday
  const lvl = n => n === 0 ? '' : n <= 2 ? 'l1' : n <= 4 ? 'l2' : n <= 7 ? 'l3' : n <= 11 ? 'l4' : 'l5';
  let cells = '', months = '', lastM = '', col = 0;
  for (let t = start.getTime(); t <= endW; t += DAY) {
    const d = new Date(t), iso = d.toISOString().slice(0, 10), dow = (d.getUTCDay() + 6) % 7;
    if (dow === 0) {
      // label each column by the month its Sunday falls in
      const m = new Date(t + 6 * DAY).toISOString().slice(0, 7);
      months += `<span style="width:22px;flex:none">${m !== lastM ? (+m.slice(5, 7)) + '月' : ''}</span>`;
      lastM = m; col++;
    }
    if (t > end.getTime() || iso < from) { cells += `<i class="out"></i>`; continue; }
    const a = activity[iso] || { s: 0, c: 0, a: 0 }, n = a.s + a.c + a.a;
    cells += `<i class="${lvl(n)}" tabindex="${n ? 0 : -1}" ${tipAttr(iso, n ? `${a.s} 个会话 · ${a.c} 次提交 · ${a.a} 件 Artifact 更新` : '无记录')}></i>`;
  }
  const scale = ['q0', 'q1', 'q2', 'q3', 'q4', 'q5'].map(q => `<i style="background:var(--${q})"></i>`).join('');
  return `<div class="heatscroll"><div class="heatinner"><div class="heatmonths" aria-hidden="true">${months}</div>
    <div class="heatwrap"><div class="heatdays" aria-hidden="true"><span>一</span><span></span><span>三</span><span></span><span>五</span><span></span><span>日</span></div>
    <div class="heat" role="img" aria-label="每日活动日历">${cells}</div></div></div></div>
    <div class="scale">少 ${scale} 多<span style="margin-left:10px">每格 = 当天会话 + 提交 + Artifact 更新</span></div>`;
}

function hbars(rows, max) {
  // rows: [{k, v, tip}]
  return `<div class="facts">${rows.map(r => `<div class="fact" tabindex="0" ${tipAttr(r.k, r.tip || r.v)} style="grid-template-columns:7em minmax(0,1fr) 2.2em;padding:6px 0">
    <b style="font-size:13px">${esc(r.k)}</b><div class="trackbar" style="height:10px;background:none"><i style="width:${(r.v / max * 100).toFixed(1)}%"></i></div><span class="num" style="font-weight:700;text-align:right">${r.v}</span></div>`).join('')}</div>`;
}

function trendSVG(points) {
  // points: [{t: ms, ev?, self?, label}]
  const W = 720, H = 240, L = 36, Rr = 16, T = 14, B = 30;
  const ts = points.map(p => p.t);
  let t0 = Math.min(...ts), t1 = Math.max(...ts);
  if (t1 - t0 < 864e5 * 7) { t0 -= 864e5 * 7; t1 += 864e5 * 7; }
  const x = t => L + (t - t0) / (t1 - t0) * (W - L - Rr);
  const y = v => T + (100 - v) / 100 * (H - T - B);
  let g = '';
  for (const v of [0, 25, 50, 75, 100]) g += `<line class="ax" x1="${L}" x2="${W - Rr}" y1="${y(v)}" y2="${y(v)}"/><text x="${L - 8}" y="${y(v) + 4}" text-anchor="end" class="num" style="font-size:10px">${v}</text>`;
  const day = t => new Date(t).toISOString().slice(5, 10).replace('-', '/');
  g += `<text x="${L}" y="${H - 8}" class="num" style="font-size:10px">${day(t0)}</text><text x="${W - Rr}" y="${H - 8}" text-anchor="end" class="num" style="font-size:10px">${day(t1)}</text>`;
  for (const [key, color, name] of [['ev', '--s1', '证据分'], ['self', '--s2', '自评分']]) {
    const ps = points.filter(p => p[key] != null);
    if (ps.length > 1) g += `<polyline points="${ps.map(p => `${x(p.t).toFixed(1)},${y(p[key]).toFixed(1)}`).join(' ')}" style="fill:none;stroke:var(${color});stroke-width:2;stroke-linejoin:round;stroke-linecap:round"/>`;
    ps.forEach((p, i) => {
      g += `<circle cx="${x(p.t).toFixed(1)}" cy="${y(p[key]).toFixed(1)}" r="5" style="fill:var(${color});stroke:var(--bg);stroke-width:2"/>`;
      if (i === ps.length - 1) g += `<text x="${(x(p.t) + 9).toFixed(1)}" y="${(y(p[key]) + (key === 'ev' ? -6 : 14)).toFixed(1)}" class="val" style="fill:var(--ink);font-size:12px">${name.slice(0, 2)} ${Math.round(p[key])}</text>`;
      g += `<circle class="hit" cx="${x(p.t).toFixed(1)}" cy="${y(p[key]).toFixed(1)}" r="12" tabindex="0" ${tipAttr(`${name} ${Math.round(p[key])}`, p.label)}/>`;
    });
  }
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="分数趋势">${g}</svg>`;
}
