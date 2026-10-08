/* 他者之眼 · 渲染器：window.renderAt(t) 以纯函数方式绘制第 t 秒的画面（逐帧截图用）。 */
'use strict';
const W = 1920, H = 1080;
const $ = (s, el = document) => el.querySelector(s);
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const easeOut = t => 1 - Math.pow(1 - t, 3);
const hash = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };

let TL, PL, RT, proj, land, coast, rivers, riverHi, grat, scenes = [], sceneEls = [];
const GOLD = '220,184,119', GOLDHI = '246,226,178';

/* ---------------- map ---------------- */
const REGIONS = [
  ['SERICA', 98, 41, 1], ['SINAE', 110, 25, 1], ['INDIA', 78, 21, 1], ['PERSIS', 56, 31, 1], ['ARABIA', 45, 22, .9],
  ['SCYTHIA', 68, 52, 1], ['EUROPA', 14, 50, 1], ['AEGYPTUS', 29, 25, .8], ['LIBYA', 12, 22, .9],
  ['OCEANUS INDICUS', 76, 2, .9], ['MARE SINICUM', 116, 14, .8], ['TARTARIA', 98, 50, .9], ['TAPROBANE', 80.7, 7.8, .6],
];

function buildMap(world, rv) {
  const corners = [];
  for (let lon = -20; lon <= 150; lon += 10) corners.push([lon, -38], [lon, 64]);
  for (let lat = -38; lat <= 64; lat += 6) corners.push([-20, lat], [150, lat]);
  proj = d3.geoNaturalEarth1().rotate([-68, 0]).fitExtent([[40, 20], [W - 40, H - 20]], { type: 'MultiPoint', coordinates: corners });
  const path = d3.geoPath(proj);
  const landGeo = topojson.feature(world, world.objects.land);
  land = new Path2D(path(landGeo));
  grat = new Path2D(path(d3.geoGraticule().step([10, 10])()));
  const hiNames = new Set(['Yangtze', 'Chang Jiang', 'Jinsha', 'Tongtian', 'Tuotuo']);
  let rs = '', hs = '';
  for (const f of rv.features) {
    const c = d3.geoCentroid(f);
    if (c[0] < -25 || c[0] > 155 || c[1] < -40 || c[1] > 70) continue;
    const d = path(f) || '';
    rs += d;
    if (hiNames.has(f.properties.name)) hs += d;
  }
  rivers = new Path2D(rs); riverHi = new Path2D(hs);
}
const P = ll => proj(ll);

/* camera: c = 地图基准坐标中心, k = 缩放, a = 屏幕锚点 */
const REGION_SRC = { x0: 870, x1: 1830, y0: 130, y1: 900 };
const REGION_ALL = { x0: 160, x1: 1760, y0: 130, y1: 900 };
const WIDE = { c: [W / 2, H / 2 + 20], k: 1.08, a: [W / 2, H / 2] };
function fit(points, R, kmax = 6.5, kdef = 4.2) {
  const xy = points.map(P);
  const xs = xy.map(p => p[0]), ys = xy.map(p => p[1]);
  const bx0 = Math.min(...xs), bx1 = Math.max(...xs), by0 = Math.min(...ys), by1 = Math.max(...ys);
  const c = [(bx0 + bx1) / 2, (by0 + by1) / 2];
  const pad = 140;
  let k = xy.length < 2 ? kdef : Math.min((R.x1 - R.x0) / (bx1 - bx0 + pad), (R.y1 - R.y0) / (by1 - by0 + pad));
  k = clamp(k, 1.05, kmax);
  return { c, k, a: [(R.x0 + R.x1) / 2, (R.y0 + R.y1) / 2] };
}
function camFor(s, local) {
  // 场景目标镜头 + 慢推（Ken Burns）
  let cam;
  const pts = (s.pins || []).map(p => [p[0], p[1]]);
  (s.routes || []).forEach(r => RT[r].forEach(q => pts.push(q)));
  if (s.focus) { pts.length = 0; s.focus.forEach(k => pts.push(TL.places[k].slice(0, 2))); }
  switch (s.type) {
    case 'source': cam = pts.length ? fit(pts, s.pins.length === 1 && !(s.routes || []).length ? REGION_SRC : REGION_SRC) : WIDE; break;
    case 'excluded': cam = fit(pts, REGION_ALL); cam = { ...cam, k: cam.k * .9 }; break;
    case 'silence': {
      const yl = s.lines[3] ? s.lines[3].t0 - s.start - .6 : 1e9;
      const zoomed = fit(pts, { x0: 1000, x1: 1700, y0: 420, y1: 860 }, 6.5, 6.0);
      cam = local > yl ? zoomed : WIDE;
      if (local > yl && local < yl + 2.4) { const e = ease((local - yl) / 2.4); cam = mixCam(WIDE, zoomed, e); }
      break;
    }
    case 'epilogue': cam = { c: [W / 2 + 40, H / 2 + 30], k: 1.0, a: [W / 2, H / 2] }; break;
    default: cam = { ...WIDE };
  }
  const dur = s.end - s.start;
  const kb = 1 + .045 * clamp(local / dur);
  return { c: cam.c, k: cam.k * kb, a: cam.a };
}
function mixCam(A, B, e, bump = 0) {
  const lk = lerp(Math.log(A.k), Math.log(B.k), e) - bump * Math.sin(Math.PI * e);
  return { c: [lerp(A.c[0], B.c[0], e), lerp(A.c[1], B.c[1], e)], k: Math.exp(lk), a: [lerp(A.a[0], B.a[0], e), lerp(A.a[1], B.a[1], e)] };
}
function cameraAt(t, si) {
  const s = scenes[si], local = t - s.start;
  const target = camFor(s, local);
  const FLY = s.type === 'chapter' ? 2.2 : 2.6;
  if (si === 0 || local >= FLY) return target;
  const p = scenes[si - 1];
  const from = camFor(p, p.end - p.start);
  const e = ease(clamp(local / FLY));
  // 远距离飞行时中途拉远
  const dx = (from.c[0] - target.c[0]), dy = (from.c[1] - target.c[1]);
  const dist = Math.hypot(dx, dy);
  const kboth = Math.min(from.k, target.k);
  const need = (W * .8) / (dist + 1);
  const bump = Math.max(0, Math.log(kboth) - Math.log(Math.max(1.0, need))) * .9;
  return mixCam(from, target, e, bump);
}
const toScreen = (cam, xy) => [(xy[0] - cam.c[0]) * cam.k + cam.a[0], (xy[1] - cam.c[1]) * cam.k + cam.a[1]];

/* catmull-rom 平滑并密化路线（屏幕坐标） */
function smooth(pts, seg = 10) {
  if (pts.length < 3) return pts;
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let j = 0; j < seg; j++) {
      const t = j / seg, t2 = t * t, t3 = t2 * t;
      out.push([0, 1].map(d => .5 * ((2 * p1[d]) + (-p0[d] + p2[d]) * t + (2 * p0[d] - 5 * p1[d] + 4 * p2[d] - p3[d]) * t2 + (-p0[d] + 3 * p1[d] - 3 * p2[d] + p3[d]) * t3)));
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}
function arcPts(a, b) { // 两点之间的弧线（用于跨洲连线）
  const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], d = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const n = [-(b[1] - a[1]) / d, (b[0] - a[0]) / d];
  const c = [m[0] + n[0] * d * .22 * -1, m[1] + n[1] * d * .22 * -1];
  const out = [];
  for (let i = 0; i <= 60; i++) { const t = i / 60; out.push([(1 - t) * (1 - t) * a[0] + 2 * (1 - t) * t * c[0] + t * t * b[0], (1 - t) * (1 - t) * a[1] + 2 * (1 - t) * t * c[1] + t * t * b[1]]); }
  return out;
}
function routeScreen(name, cam) {
  const pts = RT[name].map(ll => toScreen(cam, P(ll)));
  return pts.length === 2 ? arcPts(pts[0], pts[1]) : smooth(pts);
}
function drawPartial(ctx, pts, frac, style) {
  if (frac <= 0) return null;
  let L = 0; const seg = [];
  for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(l); L += l; }
  let rem = L * frac, head = pts[0];
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) {
    if (rem >= seg[i - 1]) { ctx.lineTo(pts[i][0], pts[i][1]); rem -= seg[i - 1]; head = pts[i]; }
    else { const f = rem / seg[i - 1]; head = [lerp(pts[i - 1][0], pts[i][0], f), lerp(pts[i - 1][1], pts[i][1], f)]; ctx.lineTo(head[0], head[1]); break; }
  }
  Object.assign(ctx, style); ctx.stroke(); ctx.setLineDash([]);
  return head;
}

/* ---------------- 背景 / 地图绘制 ---------------- */
let mapCtx, grainCtx, grainTiles = [], seaPattern;
function makeAssets() {
  for (let n = 0; n < 6; n++) {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d'), im = g.createImageData(256, 256);
    for (let i = 0; i < im.data.length; i += 4) { const v = 128 + (hash(i * .37 + n * 1013) - .5) * 255; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; }
    g.putImageData(im, 0, 0); grainTiles.push(c);
  }
  const s = document.createElement('canvas'); s.width = 8; s.height = 7;
  const g = s.getContext('2d'); g.fillStyle = `rgba(${GOLD},.05)`; g.fillRect(0, 0, 8, 1);
  seaPattern = mapCtx.createPattern(s, 'repeat');
}

function drawMap(t, si, cam, mapAlpha) {
  const ctx = mapCtx, s = scenes[si];
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  // 底色：暖黑 + 缓慢移动的光
  const bg = ctx.createRadialGradient(W * .55, H * .42, 50, W * .55, H * .5, W * .75);
  bg.addColorStop(0, '#1a150e'); bg.addColorStop(.55, '#0e0c09'); bg.addColorStop(1, '#070605');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = mapAlpha;
  ctx.fillStyle = seaPattern; ctx.fillRect(0, 0, W, H);
  // 地图
  ctx.setTransform(cam.k, 0, 0, cam.k, cam.a[0] - cam.c[0] * cam.k, cam.a[1] - cam.c[1] * cam.k);
  const lg = ctx.createLinearGradient(0, 0, W, H);
  lg.addColorStop(0, '#1d1810'); lg.addColorStop(.6, '#17130d'); lg.addColorStop(1, '#120f0a');
  ctx.fillStyle = lg; ctx.fill(land);
  const gr = s.graticule ? .2 * clamp((t - s.start - 1) / 2) : 0;
  ctx.lineWidth = .7 / cam.k; ctx.strokeStyle = `rgba(${GOLD},${.055 + gr})`; ctx.stroke(grat);
  ctx.lineWidth = 7 / cam.k; ctx.strokeStyle = `rgba(${GOLD},.045)`; ctx.stroke(land);
  ctx.lineWidth = 1.0 / cam.k; ctx.strokeStyle = `rgba(${GOLD},.62)`; ctx.stroke(land);
  ctx.lineWidth = .8 / cam.k; ctx.strokeStyle = `rgba(${GOLD},.2)`; ctx.stroke(rivers);
  if (s.river) {
    const p = clamp((t - s.lines[1].t0 + .3) / 1.2) * (1 - clamp((t - s.end + 1) / 1));
    ctx.save(); ctx.shadowColor = `rgba(${GOLDHI},.9)`; ctx.shadowBlur = 14 * p;
    ctx.lineWidth = 3.2 / cam.k; ctx.strokeStyle = `rgba(${GOLDHI},${.9 * p})`; ctx.stroke(riverHi); ctx.restore();
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  // 古地名
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const [name, lon, lat, w] of REGIONS) {
    const [x, y] = toScreen(cam, P([lon, lat]));
    if (x < -200 || x > W + 200 || y < -50 || y > H + 50) continue;
    const fs = clamp(15 * Math.pow(cam.k, .45), 14, 30);
    ctx.font = `600 ${fs}px Cinzel`; ctx.letterSpacing = `${fs * .55}px`;
    ctx.fillStyle = `rgba(${GOLD},${.2 * w})`; ctx.fillText(name, x, y);
  }
  ctx.letterSpacing = '0px';
  // 漂浮金尘
  for (let i = 0; i < 90; i++) {
    const sp = .25 + hash(i * 3.1) * .9;
    const x = (hash(i) * W + t * 9 * sp + Math.sin(t * .2 + i) * 30) % (W + 40) - 20;
    const y = (hash(i * 7.7) * H - t * 6 * sp + H * 10) % H;
    const tw = .35 + .65 * Math.pow(.5 + .5 * Math.sin(t * (.6 + hash(i * 5.3)) + i), 3);
    const r = .6 + hash(i * 9.1) * 1.5;
    ctx.globalAlpha = .55 * tw;
    ctx.fillStyle = `rgba(${GOLDHI},.9)`; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawRoutes(t, si, cam, mapAlpha) {
  const ctx = mapCtx, s = scenes[si];
  const fade = sceneAlpha(t, si);
  // 往昔路线：淡淡的记忆
  const memAlpha = s.type === 'epilogue' ? .55 * clamp((t - s.lines[4].t0 + 1.5) / 2.5) : .085;
  if (s.type !== 'chapter' || memAlpha > 0) {
    const seen = new Set();
    for (let j = 0; j < (s.type === 'epilogue' ? scenes.length : si); j++) (scenes[j].routes || []).forEach(r => seen.add(r));
    (s.routes || []).forEach(r => seen.delete(r));
    for (const r of seen) {
      const pts = routeScreen(r, cam);
      ctx.save(); if (s.type === 'epilogue') { ctx.shadowColor = `rgba(${GOLDHI},.8)`; ctx.shadowBlur = 8; }
      drawPartial(ctx, pts, 1, { lineWidth: s.type === 'epilogue' ? 1.3 : 1, strokeStyle: `rgba(${GOLD},${memAlpha * mapAlpha})` });
      ctx.restore();
    }
  }
  // 当前路线
  (s.routes || []).forEach((r, i) => {
    const t0 = s.start + 1.0 + i * .5;
    const frac = easeOut(clamp((t - t0) / 3.2));
    const pts = routeScreen(r, cam);
    ctx.save(); ctx.shadowColor = `rgba(${GOLDHI},.9)`; ctx.shadowBlur = 10;
    const head = drawPartial(ctx, pts, frac, { lineWidth: 1.8, strokeStyle: `rgba(${GOLDHI},${.85 * fade})`, lineCap: 'round' });
    ctx.restore();
    if (head && frac < 1) {
      const g = ctx.createRadialGradient(head[0], head[1], 0, head[0], head[1], 16);
      g.addColorStop(0, `rgba(255,248,225,${fade})`); g.addColorStop(1, 'rgba(255,240,200,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(head[0], head[1], 16, 0, 7); ctx.fill();
    }
    if (frac >= 1) { // 沿线流动的光点
      const k = ((t - t0 - 3.2) * .16 + i * .3) % 1;
      const pp = pointAt(pts, k);
      const g = ctx.createRadialGradient(pp[0], pp[1], 0, pp[0], pp[1], 9);
      g.addColorStop(0, `rgba(255,248,225,${.9 * fade})`); g.addColorStop(1, 'rgba(255,240,200,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(pp[0], pp[1], 9, 0, 7); ctx.fill();
    }
  });
  // 被排除的连线
  if (s.type === 'excluded') {
    const a = toScreen(cam, P(s.pins[0])), b = toScreen(cam, P(s.pins[1]));
    const pts = arcPts(a, b);
    const frac = easeOut(clamp((t - s.start - 1) / 2.4));
    ctx.save(); ctx.setLineDash([3, 9]);
    drawPartial(ctx, pts, frac, { lineWidth: 1.6, strokeStyle: `rgba(200,85,61,${.85 * fade})` });
    ctx.restore();
  }
}
function pointAt(pts, f) {
  let L = 0; const seg = [];
  for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(l); L += l; }
  let rem = L * f;
  for (let i = 1; i < pts.length; i++) { if (rem <= seg[i - 1]) { const q = rem / seg[i - 1]; return [lerp(pts[i - 1][0], pts[i][0], q), lerp(pts[i - 1][1], pts[i][1], q)]; } rem -= seg[i - 1]; }
  return pts[pts.length - 1];
}

function drawPins(t, si, cam) {
  const ctx = mapCtx, s = scenes[si];
  const fade = sceneAlpha(t, si);
  const pins = s.pins || [];
  const fire = new Set((s.fire || []).map(k => k));
  pins.forEach((p, i) => {
    const pt0 = s.pin_at != null ? s.lines[s.pin_at].t0 + 1.2 : s.start + .8;
    const appear = clamp((t - pt0 - i * .35) / .8) * fade;
    if (appear <= 0) return;
    const [x, y] = toScreen(cam, P(p));
    const isFire = [...fire].some(k => TL.places[k] && TL.places[k][2] === p[2]);
    if (isFire) {
      const ft = s.lines.length > 2 ? s.lines[Math.min(2, s.lines.length - 1)].t0 - 1 : s.start + 2;
      const fi = clamp((t - (s.id === 'sogdian' ? s.lines[2].t0 - .4 : s.start + 1.5)) / 1.2) * fade;
      for (let k = 0; k < 3; k++) {
        const fl = .7 + .3 * Math.sin(t * (7 + k * 3.3) + k * 2) * Math.sin(t * (2.3 + k) + i);
        const r = (34 + k * 22) * fl;
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, `rgba(255,${150 - k * 30},60,${.5 * fi / (k + 1)})`); g.addColorStop(1, 'rgba(255,80,20,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
      }
      for (let e = 0; e < 26; e++) { // 余烬
        const life = (t * .45 + hash(e * 2.7 + i)) % 1;
        const ex = x + (hash(e * 1.3) - .5) * 60 + Math.sin(t * 2 + e) * 8 * life;
        const ey = y - life * 120 * (.5 + hash(e * 4.1));
        ctx.globalAlpha = fi * (1 - life) * .9;
        ctx.fillStyle = 'rgba(255,170,90,1)'; ctx.beginPath(); ctx.arc(ex, ey, .8 + hash(e) * 1.4, 0, 7); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    // 脉冲环
    for (let k = 0; k < 2; k++) {
      const ph = ((t - s.start) / 2.6 + k * .5 + i * .17) % 1;
      ctx.strokeStyle = `rgba(${GOLDHI},${(1 - ph) * .7 * appear})`; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(x, y, 5 + ph * 22, 0, 7); ctx.stroke();
    }
    ctx.fillStyle = `rgba(${GOLDHI},${appear})`; ctx.beginPath(); ctx.arc(x, y, 4, 0, 7); ctx.fill();
    ctx.strokeStyle = `rgba(10,9,7,${appear})`; ctx.lineWidth = 1.5; ctx.stroke();
    // 标签
    const left = x > W - 300;
    ctx.textAlign = left ? 'right' : 'left'; ctx.textBaseline = 'alphabetic';
    const lx = x + (left ? -16 : 16);
    ctx.shadowColor = 'rgba(0,0,0,.95)'; ctx.shadowBlur = 8;
    ctx.font = '600 15px Cinzel'; ctx.letterSpacing = '3.5px';
    ctx.fillStyle = `rgba(${GOLDHI},${appear})`; ctx.fillText(p[2], lx, y - 2);
    ctx.font = '400 15px "Noto Serif SC"'; ctx.letterSpacing = '1.5px';
    ctx.fillStyle = `rgba(243,234,219,${.82 * appear})`; ctx.fillText(p[3], lx, y + 19);
    ctx.shadowBlur = 0; ctx.letterSpacing = '0px';
  });
}

function drawGrain(f) {
  const ctx = grainCtx;
  ctx.clearRect(0, 0, W, H);
  ctx.save();
  const tile = grainTiles[f % grainTiles.length];
  const ox = Math.floor(hash(f * 1.7) * 256), oy = Math.floor(hash(f * 2.9) * 256);
  ctx.translate(-ox, -oy);
  ctx.fillStyle = ctx.createPattern(tile, 'repeat'); ctx.globalAlpha = .35;
  ctx.fillRect(0, 0, W + 256, H + 256);
  ctx.restore();
}

/* ---------------- 场景 DOM ---------------- */
const CH = {};
function yearLabel(y) { return y < 0 ? `公元前${-y}年` : `${y}年`; }
function yearLatin(y) { return y < 0 ? `${-y} BC` : `AD ${y}`; }

function R(node, at, delay = 0, dur = .9, dy = 16) { node.classList.add('r'); node._rv = { at, delay, dur, dy }; return node; }

function buildScene(s, i) {
  const root = el('div', 'scene'); root.dataset.id = s.id;
  const add = (n) => (root.appendChild(n), n);
  switch (s.type) {
    case 'title': {
      const w = add(el('div', 'title-wrap'));
      w.append(R(el('div', 't-kick', 'A HISTORY OF CHINA IN NON-SINOSPHERE SOURCES'), -1, .4, 1.6));
      w.append(R(el('div', 't-main gold', '他者之眼'), -1, 1.0, 2.2, 0));
      w.append(R(el('div', 't-latin', 'THROUGH FOREIGN EYES'), -1, 1.9, 1.8));
      w.append(R(el('div', 't-rule'), -1, 2.3, 1.6, 0));
      w.append(R(el('div', 't-sub', '非中华文化圈史料中的中华文明'), -1, 2.6, 1.6));
      root._title = w;
      const g = add(el('div', 'glass rules'));
      g.innerHTML = `<div><h4><em>采信</em>ADMITTED</h4><p>希腊 · 罗马 · 拜占庭 · 印度<br>粟特 · 阿拉伯 · 波斯 · 近代欧洲</p></div><div class="vr"></div>
        <div class="no"><h4><em>排除</em>EXCLUDED</h4><p>中国 · 日本 · 朝鲜半岛 · 越南<br>以及仅见于这些史料的事件</p></div>`;
      R(g, 1, .2, 1.1, 24);
      break;
    }
    case 'thesis': {
      const h = add(el('div', 'th-head'));
      h.append(R(el('div', 'kicker', 'CONCLUSIO · 结论先行'), -1, .3), R(el('h2', '', '外部记录中的中国：三个阶段'), 0, 0));
      const data = [['I', '传说', 'LEGEND', '公元前1世纪 — 7世纪', '丝绸 · 赛里斯 · 想象'], ['II', '惊叹', 'WONDER', '9世纪 — 18世纪中叶', '瓷器 · 纸币 · 秩序'], ['III', '审判与重估', 'JUDGMENT', '1776年 — 今', '停滞 · 炮舰 · 重估']];
      data.forEach((d, k) => {
        const c = add(el('div', 'glass th-card'));
        c.style.left = (180 + k * 540) + 'px';
        c.innerHTML = `<div class="num gold">${d[0]}</div><h3>${d[1]}</h3><div class="lat">${d[2]}</div><div class="yrs">${d[3]}</div><div class="hair"></div><div class="kw">${d[4]}</div>`;
        R(c, k + 1, 0, 1.0, 26);
      });
      break;
    }
    case 'silence': {
      const ax = add(el('div', 'si-axis'));
      const X = y => (y + 3000) / 5000 * 1520;
      ax.innerHTML = `
        <div class="zone silent" style="left:0;width:${X(-300)}px"></div>
        <div class="zone disputed" style="left:${X(-300)}px;width:${X(-100) - X(-300)}px"></div>
        <div class="zone known" style="left:${X(-100)}px;width:${1520 - X(-100)}px"></div>
        <div class="zl" style="left:0">FOREIGN SOURCES · SILENT</div>
        <div class="zl" style="left:${X(700)}px">FOREIGN RECORDS · 外国记录</div>
        <div class="big" style="left:${X(-2400)}px">外国文献 · 沉默</div>
        ${[-3000, -2000, -1000, -300, -100, 500, 1000, 1500, 2000].map(y => `<div class="tk" style="left:${X(y)}px">${y < 0 ? -y + ' BC' : y === 0 ? '0' : 'AD ' + y}</div>`).join('')}`;
      R(ax, 0, .2, 1.2);
      const pin1 = el('div', 'pin l', `<b>前4世纪？</b><s>最早可能的提及 · 有争议</s><i></i>`); pin1.style.left = X(-350) + 'px'; ax.append(R(pin1, 1, .3));
      const pin2 = el('div', 'pin r', `<b>前1世纪</b><s>确凿记载出现</s><i></i>`); pin2.style.left = X(-60) + 'px'; ax.append(R(pin2, 1, 4.2));
      [['商', -1400], ['周', -800], ['孔子', -500]].forEach(([n, y], k) => { const g = el('div', 'ghost', n); g.style.left = X(y) + 'px'; ax.append(R(g, 2, .5 + k * .6, 1.4, 0)); });
      const pin3 = el('div', 'pin l', `<b>1921</b><s>仰韶 · 西方考古</s><i></i>`); pin3.style.left = X(1921) + 'px'; ax.append(R(pin3, 3, .2));
      root._axis = ax;
      add(buildCard(s, 3));
      break;
    }
    case 'names': {
      const h = add(el('div', 'nm-head'));
      h.append(R(el('div', 'big gold', 'CHINA'), 0, 0, 1.4, 0), R(el('div', 'kicker', 'NOMINA · 一个名字的旅程'), 0, .8));
      const g = add(el('div', 'glass nm'));
      const rows = [
        ['sa', 'चीन', 'Cīna', '梵语', '年代有争议', '或源自“秦”'],
        ['el', 'Σῆρες', 'Sēres', '希腊语 · 拉丁语', '前1世纪', '丝之民'],
        ['el', 'Θῖναι · Sinae', 'Thinai · Sinae', '希腊语 · 拉丁语', '1—2世纪', '秦奈'],
        ['el', 'Τζινίστα', 'Tzinista', '拜占庭希腊语', '6世纪', '秦尼斯达'],
        ['el', 'Ταυγάστ', 'Taugast', '拜占庭希腊语', '7世纪', '或源自“拓跋”'],
        ['ar', 'الصين', 'al-Ṣīn', '阿拉伯语', '9世纪', '经波斯语 Chīn'],
        ['la', 'Cathay', 'Catai · Kitai', '中世纪拉丁语 · 意大利语', '13世纪', '源自“契丹”'],
        ['pt', 'China', 'China', '葡萄牙语 → 欧洲诸语', '16世纪', '经梵语、波斯语'],
      ];
      const tb = el('table'); tb.innerHTML = `<tr><th>ORIGINAL</th><th>TRANSLIT.</th><th>语言</th><th>时代</th><th>释义</th></tr>`;
      g.append(tb); R(g, 1, 0, 1.0, 20);
      rows.forEach((r, k) => {
        const tr = el('tr'); tr.innerHTML = `<td class="o" lang="${r[0]}">${r[1]}</td><td class="t">${r[2]}</td><td>${r[3]}</td><td class="m">${r[4]}</td><td>${r[5]}</td>`;
        tb.append(R(tr, k === 0 ? 1 : 2, k === 0 ? .6 : (k - 1) * .75, .8, 8));
      });
      break;
    }
    case 'chapter': {
      const c = add(el('div', 'ch'));
      const ln = el('div', 'lines', '<i></i><i></i>');
      c.append(ln, R(el('div', 'num gold', s.num), -1, .2, 1.6, 0), R(el('h2', 'gold', s.title), -1, .7, 1.8, 0),
        R(el('div', 'lat', s.latin), -1, 1.3, 1.6), R(el('div', 'yrs', s.years), -1, 1.7, 1.6));
      root._lines = ln; root._h2 = $('h2', c);
      break;
    }
    case 'source': {
      add(buildCard(s, null));
      if (s.card.stat) add(buildStat(s.card.stat, s.card.stat_at));
      break;
    }
    case 'excluded': {
      const g = add(el('div', 'glass ex'));
      g.innerHTML = `<div class="kicker">EXCLUSUM · 已排除</div>
        <div class="title">公元166年 · 大秦使者抵汉<div class="strike"></div></div>
        <table><tr><td>中文史料<span class="en">HOU HANSHU · 后汉书</span></td><td>有记载 · 不予采用</td></tr>
        <tr><td>罗马 / 希腊史料<span class="en">LATIN · GREEK SOURCES</span></td><td class="none">无对应记录</td></tr></table>
        <div class="stamp">EXCLUDED<small>排 除</small></div>`;
      R(g, 0, 0, 1.0, 20);
      R($('.strike', g), 1, 3.0, .9, 0); R($('.stamp', g), 1, 3.4, .5, 0);
      root._strike = $('.strike', g);
      break;
    }
    case 'chart': {
      const c = s.chart;
      const g = add(el('div', 'glass chart' + (c.stat ? ' narrow' : '')));
      g.innerHTML = `<h3>${c.title}</h3><div class="src">${c.sub}</div>`;
      g.append(buildChartSVG(c, c.stat ? 1010 : 1580, 520));
      R(g, -1, .3, 1.0, 20);
      if (c.stat) add(buildStat(c.stat, c.stat_at, true));
      break;
    }
    case 'epilogue': {
      const h = add(el('div', 'ep-head'));
      h.append(R(el('div', 'kicker', 'CONCLUSIO · 总结'), 0, 0), R(el('h2', '', '三点结论'), 0, .3));
      const tl = add(el('div', 'ep-tl'));
      const X = y => (y + 100) / 2130 * 1540;
      tl.innerHTML = [['传说', -100, 700], ['惊叹', 750, 1770], ['审判与重估', 1776, 2030]].map(([n, a, b]) => `<div class="band" style="left:${X(a)}px;width:${X(b) - X(a)}px"><span>${n}</span></div>`).join('')
        + [-100, 500, 1000, 1500, 2000].map(y => `<div class="tk" style="left:${X(y)}px">${y < 0 ? '100 BC' : 'AD ' + y}</div>`).join('');
      scenes.filter(x => x.year != null && x.year > -200).forEach((x, k) => { const d = el('div', 'dot'); d.style.left = X(x.year) + 'px'; tl.append(R(d, 0, .3 + k * .05, .5, 0)); });
      R(tl, 0, 0, 1.0, 0);
      const rows = [['I', '始于物', '丝绸 · 纸 · 瓷器 · 茶 · 纸币'], ['II', '镜像', '奢侈 · 市场 · 理性 · 停滞'], ['III', '盲区', '起步晚 · 常有误 · 不识汉文']];
      root._rows = rows.map((r, k) => {
        const g = add(el('div', 'glass ep-row'));
        g.style.top = (420 + k * 150) + 'px';
        g.innerHTML = `<div class="num gold">${r[0]}</div><h3>${r[1]}</h3><p>${r[2]}</p>`;
        return R(g, k + 1, 0, 1.0, 22);
      });
      const fin = add(el('div', 'ep-final'));
      fin.innerHTML = `<div class="q gold">世界在每一个时代<br>是如何看见中国的</div><div class="kicker">THROUGH FOREIGN EYES</div>`;
      R(fin, 4, 1.0, 2.0, 0); root._fin = fin; root._head = h; root._tl = tl;
      break;
    }
    case 'method': {
      const g = add(el('div', 'glass me'));
      g.innerHTML = `<div class="kicker">METHODUS · 方法说明</div><h3>本片如何取舍史料</h3><ul>
        <li><b>✕</b><strong>排除</strong><span>中国、日本、朝鲜半岛、越南文献</span></li>
        <li><b>✕</b><strong>排除</strong><span>仅见于中文史料的事件<em>例：166年“大秦”使者</em></span></li>
        <li><b>✕</b><strong>排除</strong><span>无原始出处的伪托名言<em>例：拿破仑“睡狮论”——未见于其任何著作或书信</em></span></li>
        <li><b class="ok">△</b><strong>标注</strong><span>无法核对原文处，标注英译者或“大意”</span></li></ul>`;
      R(g, -1, .2, 1.0, 20);
      [...g.querySelectorAll('li')].forEach((li, k) => R(li, 0, .8 + k * 1.6, .8, 10));
      break;
    }
    case 'credits': {
      const roll = add(el('div', 'cr-roll'));
      const src = [
        ['古典与拜占庭', ['Vergil, <i>Georgica</i> · c. 29 BC', 'Pliny the Elder, <i>Naturalis Historia</i> · AD 77', '<i>Periplus Maris Erythraei</i> · 1st c.', 'Ptolemy, <i>Geography</i> · c. 150', 'Ammianus Marcellinus, <i>Res Gestae</i> · c. 390', 'Procopius, <i>Wars</i> · c. 552', 'Cosmas Indicopleustes, <i>Christian Topography</i> · c. 550', 'Theophylact Simocatta, <i>History</i> · c. 630']],
        ['粟特 · 阿拉伯 · 波斯', ['<i>Sogdian Ancient Letters</i> · c. 313', "al-Tha'alibi, <i>Lata'if al-Ma'arif</i> · 11th c.", "<i>Akhbar al-Sin wa'l-Hind</i> · 851", 'Abu Zayd al-Sirafi · c. 916', 'Ibn Battuta, <i>Rihla</i> · c. 1355', 'Ghiyath al-Din Naqqash · 1420', 'Ibn Taghribirdi, <i>al-Nujum al-Zahira</i> · 15th c.']],
        ['中世纪与近代欧洲', ['William of Rubruck, <i>Itinerarium</i> · 1255', 'Marco Polo, <i>Le Divisament dou Monde</i> · c. 1298', 'J. González de Mendoza, <i>Historia</i> · 1585', 'M. Ricci & N. Trigault, <i>De Christiana expeditione</i> · 1615', 'M. Martini, <i>De Bello Tartarico</i> · 1654', 'G. W. Leibniz, <i>Novissima Sinica</i> · 1697', 'Voltaire, <i>Essai sur les mœurs</i> · 1756', 'F. Quesnay, <i>Le Despotisme de la Chine</i> · 1767', 'Adam Smith, <i>The Wealth of Nations</i> · 1776', 'Lord Macartney, <i>Journal</i> · 1794', 'W. E. Gladstone, Hansard · 1840', 'Victor Hugo, <i>Lettre au capitaine Butler</i> · 1861']],
        ['现代研究与数据', ['J. G. Andersson, <i>An Early Chinese Culture</i> · 1923', 'Edgar Snow, <i>Red Star Over China</i> · 1937', 'Lucian W. Pye, <i>Foreign Affairs</i> · 1990', 'Angus Maddison, <i>The World Economy: A Millennial Perspective</i> · 2001', 'H. U. Vogel, <i>Marco Polo Was in China</i> · 2013', 'World Bank & DRC, <i>Four Decades of Poverty Reduction in China</i> · 2022']],
        ['制作', ['地图 · Natural Earth（公有领域）', '旁白 · Kokoro-82M 合成男声', '配乐 · 程序合成']],
      ];
      roll.innerHTML = src.map(([h, l]) => `<h4>${h}</h4><p>${l.join('<br>')}</p>`).join('');
      root._roll = roll;
      const end = add(el('div', 'cr-end'));
      end.innerHTML = `<div class="t-main gold">他者之眼</div><div class="t-latin">THROUGH FOREIGN EYES</div>`;
      root._end = end;
      break;
    }
  }
  return root;
}

function buildCard(s, at) {
  const c = s.card;
  const g = el('div', 'glass card');
  const orig = c.orig ? `<div class="orig${c.orig.length > 120 ? ' long' : ''}">${c.orig}</div>${c.orig_note ? `<div class="note">${c.orig_note}</div>` : ''}` : '';
  g.innerHTML = `<div class="kicker">${c.kicker}</div><div class="title">${c.title}</div><div class="sub">${c.sub}</div><div class="hair"></div>${orig}<div class="zh">${c.zh}</div><div class="ref">${c.ref}</div>`;
  const a = at == null ? -1 : at;
  R(g, a, at == null ? .5 : -.3, 1.0, 22);
  const rv = c.reveal != null ? c.reveal : 0;
  const o = $('.orig', g); if (o) R(o, Math.max(a, rv), .4, 1.2, 10);
  R($('.zh', g), Math.max(a, rv), c.orig ? 1.6 : .4, 1.2, 10);
  g.style.top = '0px'; g._center = true;
  return g;
}
function buildStat(st, at, side) {
  const g = el('div', 'glass stat' + (side ? ' side' : ''));
  g.innerHTML = `<div><span class="n gold">${st.n}</span>${st.unit ? `<span class="u">${st.unit}</span>` : ''}</div><div class="cap">${st.cap}</div>${st.src ? `<div class="src">${st.src}</div>` : ''}`;
  if (!side) g.style.bottom = '200px';
  R(g, at, .3, 1.0, 20);
  return g;
}
function buildChartSVG(c, w, h) {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg'); svg.setAttribute('width', w); svg.setAttribute('height', h);
  const X = y => (y - 1000) / 1000 * (w - 60) + 10, Y = v => h - v / 35 * h;
  let g = '';
  [0, 10, 20, 30].forEach(v => { g += `<line x1="0" x2="${w}" y1="${Y(v)}" y2="${Y(v)}" stroke="rgba(${GOLD},${v ? .14 : .4})" stroke-width="1"/><text x="${w + 14}" y="${Y(v) + 5}">${v}%</text>`; });
  [1000, 1200, 1400, 1600, 1800, 2000].forEach(y => { g += `<text x="${X(y)}" y="${h + 32}" text-anchor="middle">${y}</text>`; });
  const d = c.data.map(([y, v], i) => `${i ? 'L' : 'M'}${X(y).toFixed(1)},${Y(v).toFixed(1)}`).join('');
  g += `<path class="ln" d="${d}" fill="none" stroke="rgb(${GOLDHI})" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" style="filter:drop-shadow(0 0 6px rgba(${GOLDHI},.6))"/>`;
  c.data.forEach(([y, v]) => { g += `<circle class="pt" data-y="${y}" cx="${X(y)}" cy="${Y(v)}" r="5" fill="rgb(${GOLDHI})" stroke="#14110c" stroke-width="2"/>`; });
  const lab = { 1820: [0, -64, 'middle'], 1950: [-22, -6, 'end'], 1998: [18, -52, 'start'] };
  c.data.forEach(([y, v]) => { const L = lab[y]; if (L) g += `<g class="lab" data-y="${y}" transform="translate(${X(y) + L[0]},${Y(v) + L[1]})"><text class="vl" text-anchor="${L[2]}">${v}%</text><text class="vy" text-anchor="${L[2]}" y="24">${y}年</text></g>`; });
  svg.innerHTML = g;
  svg._X = X; svg._data = c.data; svg._upto = c.upto; svg._from = c.from_upto || null;
  return svg;
}

/* ---------------- 合成 ---------------- */
function sceneAlpha(t, i) {
  const s = scenes[i];
  const fi = i === 0 ? 1 : clamp((t - (s.start - .35)) / .7);
  const fo = i === scenes.length - 1 ? 1 : clamp(((s.end + .35) - t) / .7);
  return Math.min(fi, fo);
}
function revealTime(s, rv) { return (rv.at < 0 ? s.start : s.lines[rv.at].t0) + rv.delay; }
function sceneIndex(t) { let i = 0; while (i < scenes.length - 1 && t >= scenes[i].end) i++; return i; }

function updateScene(t, i) {
  const s = scenes[i], root = sceneEls[i];
  const a = sceneAlpha(t, i);
  root.style.opacity = a;
  root.style.display = a <= 0 ? 'none' : 'block';
  if (a <= 0) return;
  root.querySelectorAll('.r').forEach(n => {
    const rv = n._rv, p = clamp((t - revealTime(s, rv)) / rv.dur), e = easeOut(p);
    n.style.opacity = e;
    n.style.transform = `translateY(${(1 - e) * rv.dy}px)` + (n.classList.contains('t-main') || n.classList.contains('num') ? ` scale(${1.06 - .06 * e})` : '');
  });
  const local = t - s.start;
  if (s.type === 'title') {
    const p = ease(clamp((t - s.lines[1].t0 + .6) / 1.4));
    root._title.style.transform = `translateY(${-170 * p}px) scale(${1 - .18 * p})`;
  }
  if (s.type === 'chapter') {
    const p = easeOut(clamp((local - .1) / 2.2));
    root._lines.children[0].style.transform = `scaleX(${p})`; root._lines.children[1].style.transform = `scaleX(${p})`;
    root._h2.style.letterSpacing = `${lerp(.42, .16, easeOut(clamp((local - .7) / 2.6)))}em`;
    root._h2.style.paddingLeft = root._h2.style.letterSpacing;
  }
  if (s.type === 'excluded') { const p = clamp((t - revealTime(s, root._strike._rv)) / .9); root._strike.style.transform = `scaleX(${easeOut(p)})`; }
  if (s.type === 'silence') {
    const p = ease(clamp((t - s.lines[3].t0 + .6) / 1.6));
    root._axis.style.transform = `translateY(${-40 * p}px)`;
  }
  if (s.type === 'chart') {
    const svg = root.querySelector('svg'), ln = svg.querySelector('.ln');
    const L = ln.getTotalLength();
    const X = svg._X, data = svg._data;
    const xEnd = X(svg._upto), xFrom = svg._from ? X(svg._from) : X(1000);
    const t0 = s.start + 1.2, p = ease(clamp((t - t0) / (svg._from ? 3.5 : 6)));
    const xNow = lerp(xFrom, xEnd, p);
    // 按横坐标裁切线条
    let lo = 0, hi = L; for (let k = 0; k < 22; k++) { const m = (lo + hi) / 2; if (ln.getPointAtLength(m).x < xNow) lo = m; else hi = m; }
    ln.style.strokeDasharray = `${lo} ${L}`;
    svg.querySelectorAll('.pt').forEach(c => { c.style.opacity = +c.dataset.y <= svg._upto && X(+c.dataset.y) <= xNow + .5 ? 1 : 0; });
    svg.querySelectorAll('.lab').forEach(g => { const y = +g.dataset.y; const on = y <= svg._upto && X(y) <= xNow + .5; const lt = on ? 1 : 0; g.style.opacity = lt; });
  }
  if (s.type === 'epilogue') {
    const p = clamp((t - s.lines[4].t0 + .2) / 1.2);
    root._rows.forEach(r => { r.style.opacity = Math.min(+r.style.opacity, 1 - p); });
    root._head.style.opacity = 1 - p; root._tl.style.opacity = Math.min(+root._tl.style.opacity, 1 - p);
  }
  if (s.type === 'credits') {
    const dur = s.end - s.start, rollEnd = dur - 6.5;
    const hgt = root._roll.offsetHeight;
    const p = clamp(local / rollEnd);
    root._roll.style.transform = `translateY(${lerp(H + 40, -hgt - 60, p)}px)`;
    const e = easeOut(clamp((local - rollEnd + 1.2) / 2.2));
    root._end.style.opacity = e * clamp((dur - local) / 1.8);
    root._end.style.transform = `scale(${1.04 - .04 * e})`;
  }
}

function layoutCards() {
  // 卡片垂直居中于 [120, 880]
  document.querySelectorAll('.card').forEach(g => { const h = g.offsetHeight; g.style.top = Math.round(118 + (770 - h) / 2) + 'px'; });
  document.querySelectorAll('.scene[data-id=silence] .card').forEach(g => { g.style.top = '470px'; });
  document.querySelectorAll('.stat:not(.side)').forEach(g => { g.style.bottom = '196px'; });
}

let hudEls;
function buildHUD() {
  const hud = $('#hud');
  hud.innerHTML = `<div class="chap"></div><div id="axis"><div class="fill"></div>${[-100, 500, 1000, 1500, 2000].map(y => `<div class="tick" style="left:${(y + 100) / 2130 * 812}px"><span>${y < 0 ? '100 BC' : y}</span></div>`).join('')}<div class="mark"></div><div class="yl"></div></div><div class="brand">THROUGH FOREIGN EYES</div>`;
  hudEls = { hud, chap: $('.chap', hud), fill: $('.fill', hud), mark: $('.mark', hud), yl: $('.yl', hud) };
}
function updateHUD(t, si) {
  const s = scenes[si];
  const HUDT = ['source', 'excluded', 'chart'];
  const show = HUDT.includes(s.type) ? 1 : 0;
  const prev = si > 0 && HUDT.includes(scenes[si - 1].type) ? 1 : 0;
  const a = lerp(prev, show, ease(clamp((t - s.start + .35) / .9)));
  hudEls.hud.style.opacity = a;
  // 年份：在场景开头从上一年份滑动过来
  let y = s.year;
  if (y == null) { for (let j = si; j >= 0; j--) if (scenes[j].year != null) { y = scenes[j].year; break; } }
  if (y == null) y = -100;
  let py = y; for (let j = si - 1; j >= 0; j--) if (scenes[j].year != null) { py = scenes[j].year; break; }
  const yy = lerp(py, y, ease(clamp((t - s.start) / 1.8)));
  const x = clamp((yy + 100) / 2130) * 812;
  hudEls.fill.style.width = x + 'px'; hudEls.mark.style.left = x + 'px'; hudEls.yl.style.left = x + 'px';
  hudEls.yl.textContent = s.year != null ? yearLabel(s.year) : '';
  let ch = null; for (let j = si; j >= 0; j--) if (scenes[j].type === 'chapter') { ch = scenes[j]; break; }
  hudEls.chap.innerHTML = ch ? `<b>${ch.num}</b>${ch.title}` : '<b>·</b>序章';
}

function updateSubs(t, si) {
  const s = scenes[si], sub = $('#subs');
  let best = null;
  for (const j of [si - 1, si, si + 1]) {
    if (j < 0 || j >= scenes.length) continue;
    for (const l of scenes[j].lines) if (t >= l.t0 - .15 && t <= l.t1 + .35) best = l;
  }
  if (!best) { sub.style.opacity = 0; return; }
  if (sub._key !== best.key) { sub.textContent = best.text; sub._key = best.key; }
  sub.style.opacity = Math.min(clamp((t - best.t0 + .15) / .2), clamp((best.t1 + .35 - t) / .25));
}

function mapAlphaFor(s) { return ({ chapter: .38, title: .32, thesis: .4, names: .4, chart: .3, method: .3, credits: .22, epilogue: .85, excluded: .75 })[s.type] ?? 1; }

window.renderAt = function (t) {
  const si = sceneIndex(t), s = scenes[si];
  const cam = cameraAt(t, si);
  const prevA = si > 0 ? mapAlphaFor(scenes[si - 1]) : mapAlphaFor(s);
  const ma = lerp(prevA, mapAlphaFor(s), ease(clamp((t - s.start + .35) / 1.2)));
  drawMap(t, si, cam, ma);
  // 地图暗场
  mapCtx.fillStyle = `rgba(7,6,5,${(1 - ma) * .78})`; mapCtx.fillRect(0, 0, W, H);
  drawRoutes(t, si, cam, ma);
  drawPins(t, si, cam);
  for (let i = 0; i < scenes.length; i++) {
    if (Math.abs(i - si) <= 1) updateScene(t, i); else if (sceneEls[i].style.display !== 'none') { sceneEls[i].style.display = 'none'; }
  }
  updateHUD(t, si);
  updateSubs(t, si);
  // 片头片尾黑场
  const fadeIn = clamp(t / 2.0), fadeOut = clamp((TL.duration - t) / 2.5);
  $('#fade').style.opacity = 1 - Math.min(fadeIn, fadeOut);
};

window.init = async function () {
  const [tl, world, rv] = await Promise.all(['../build/timeline.json', 'land-50m.json', 'rivers.json'].map(u => fetch(u).then(r => r.json())));
  TL = tl; RT = tl.routes; scenes = tl.scenes;
  scenes.forEach(s => { s.pins = s.pins || []; });
  mapCtx = $('#map').getContext('2d');
  buildMap(world, rv); makeAssets(); buildHUD();
  const layers = $('#layers');
  sceneEls = scenes.map((s, i) => { const e = buildScene(s, i); e.style.display = 'none'; layers.appendChild(e); return e; });
  // 预热字体：把所有文字以各字重渲染一遍
  const all = scenes.map(s => s.lines.map(l => l.text).join('') + JSON.stringify(s.card || {}) + (s.title || '')).join('') + document.body.innerText;
  const pw = $('#prewarm');
  pw.innerHTML = [300, 400, 600, 900].map(w => `<div style="font-weight:${w}">${all}</div>`).join('') +
    ['Cinzel', 'Cormorant Garamond', 'Noto Serif', 'Noto Naskh Arabic', 'Noto Serif Devanagari'].map(f => `<div style="font-family:'${f}'">${all.replace(/[一-鿿]/g, '')}<i>${all.replace(/[一-鿿]/g, '')}</i><b>A</b></div>`).join('');
  for (let i = 0; i < 3; i++) { await document.fonts.ready; await new Promise(r => setTimeout(r, 300)); }
  sceneEls.forEach(e => e.style.display = 'block'); layoutCards(); sceneEls.forEach(e => e.style.display = 'none');
  window.DURATION = TL.duration;
  window.READY = true;
};
