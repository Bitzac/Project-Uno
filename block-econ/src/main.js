// 每帧入口：window.seek(t) 同步画完这一帧（画布 + 图表 + 文字层），不依赖真实时间。
import {
  SCENES, DURATION, qd, qs, DEMAND_PTS, SUPPLY_PTS, DRAW, DOT, EQ_COLS, SUMMARY_ROWS, SUMMARY_ROW_AT, INSIGHTS,
} from './timeline.js';
import { stateAt, clamp, ramp, win, lin } from './state.js';
import { initWorld, drawWorld, spriteURL, GROUND, buyerX, stockX } from './world.js';

const $ = id => document.getElementById(id);
const S = Object.fromEntries(SCENES.map(s => [s.id, s]));
const ICON = {};
const fmt = v => String(Math.round(v));
const markup = s => s.replace(/<([dseb])>/g, '<span class="$1">').replace(/<\/[dseb]>/g, '</span>');

// —— 图表几何：Q 0..11 → x（右侧留出 D′/S′ 标签位），P 0..10 → y ——
const CW = 720, CH = 400, X0 = 72, X1 = 690, Y0 = 352, Y1 = 30;
const sx = q => X0 + q * (X1 - X0) / 11;
const sy = p => Y0 - p * (Y0 - Y1) / 10;
const NS = 'http://www.w3.org/2000/svg';
const el = (tag, attrs = {}, parent) => {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  if (parent) parent.appendChild(n);
  return n;
};
const C = {};

function buildChart(svg) {
  const g = el('g', {}, svg);
  for (let i = 1; i <= 10; i++) {
    el('line', { x1: sx(i), y1: Y0, x2: sx(i), y2: Y1, stroke: 'rgba(255,255,255,0.10)', 'stroke-width': 1 }, g);
    el('line', { x1: X0, y1: sy(i), x2: X1, y2: sy(i), stroke: 'rgba(255,255,255,0.10)', 'stroke-width': 1 }, g);
  }
  const axis = { stroke: 'rgba(255,255,255,0.78)', 'stroke-width': 1.5, fill: 'none', 'stroke-linecap': 'round' };
  el('path', { d: `M${X0},${Y1 - 14} L${X0},${Y0} L${X1 + 14},${Y0}`, ...axis }, g);
  el('path', { d: `M${X0 - 5},${Y1 - 6} L${X0},${Y1 - 14} L${X0 + 5},${Y1 - 6}`, ...axis }, g);
  el('path', { d: `M${X1 + 6},${Y0 - 5} L${X1 + 14},${Y0} L${X1 + 6},${Y0 + 5}`, ...axis }, g);
  for (let i = 0; i <= 10; i += 2) {
    el('text', { x: sx(i), y: Y0 + 26, 'text-anchor': 'middle', class: 'tick' }, g).textContent = i;
    if (i) el('text', { x: X0 - 14, y: sy(i) + 6, 'text-anchor': 'end', class: 'tick' }, g).textContent = i;
  }
  el('text', { x: X0 + 14, y: Y1 - 8, class: 'axl' }, g).textContent = '价格 P（绿宝石/颗）';
  el('text', { x: X1 + 14, y: Y0 + 46, 'text-anchor': 'end', class: 'axl' }, g).textContent = '数量 Q（颗/天）';

  const line = color => ({ stroke: color, 'stroke-width': 3.5, fill: 'none', 'stroke-linecap': 'round' });
  C.gD = el('path', { ...line('var(--demand)'), 'stroke-width': 2, 'stroke-dasharray': '8 8' }, svg);
  C.gS = el('path', { ...line('var(--supply)'), 'stroke-width': 2, 'stroke-dasharray': '8 8' }, svg);
  C.lD = el('path', line('var(--demand)'), svg);
  C.lS = el('path', line('var(--supply)'), svg);
  C.tD = el('text', { class: 'cl', fill: 'var(--demand)' }, svg);
  C.tS = el('text', { class: 'cl', fill: 'var(--supply)' }, svg);
  C.tgD = el('text', { class: 'cl', fill: 'var(--demand)', opacity: 0.6 }, svg);
  C.tgS = el('text', { class: 'cl', fill: 'var(--supply)', opacity: 0.6 }, svg);

  C.arrow = el('g', {}, svg);
  C.arrowLine = el('line', { stroke: '#fff', 'stroke-width': 2, 'stroke-linecap': 'round' }, C.arrow);
  C.arrowHead = el('path', { fill: '#fff' }, C.arrow);
  C.arrowText = el('text', { class: 'tag', 'text-anchor': 'middle' }, C.arrow);

  C.pts = [...DEMAND_PTS.map(p => ({ ...p, c: 'var(--demand)', k: 'demand' })), ...SUPPLY_PTS.map(p => ({ ...p, c: 'var(--supply)', k: 'supply' }))]
    .map(p => ({ ...p, n: el('circle', { cx: sx(p.q), cy: sy(p.p), r: 7, fill: p.c, stroke: '#fff', 'stroke-width': 1.5 }, svg) }));

  C.price = el('g', {}, svg);
  C.pLine = el('line', { stroke: 'rgba(255,255,255,0.85)', 'stroke-width': 1.5, 'stroke-dasharray': '6 6' }, C.price);
  C.pD = el('circle', { r: 6.5, fill: 'var(--demand)', stroke: '#fff', 'stroke-width': 1.5 }, C.price);
  C.pS = el('circle', { r: 6.5, fill: 'var(--supply)', stroke: '#fff', 'stroke-width': 1.5 }, C.price);
  C.gap = el('path', { fill: 'none', 'stroke-width': 2, 'stroke-linecap': 'round' }, C.price);
  C.gapText = el('text', { class: 'tag', 'text-anchor': 'middle' }, C.price);
  C.pText = el('text', { class: 'tag', x: X0 + 12 }, C.price);

  C.oldEq = el('circle', { r: 8, fill: 'none', stroke: '#fff', 'stroke-width': 1.5, 'stroke-dasharray': '3 3' }, svg);
  C.eq = el('g', {}, svg);
  C.eqV = el('line', { stroke: 'rgba(255,255,255,0.7)', 'stroke-width': 1.5, 'stroke-dasharray': '4 5' }, C.eq);
  C.eqHalo = el('circle', { r: 17, fill: 'rgba(255,255,255,0.12)', stroke: 'rgba(255,255,255,0.6)', 'stroke-width': 1 }, C.eq);
  C.eqDot = el('circle', { r: 8.5, fill: '#fff' }, C.eq);
  C.eqQ = el('text', { class: 'tag' }, C.eq);

  C.dot = el('g', {}, svg);
  C.dotHalo = el('circle', { r: 15, fill: 'rgba(255,255,255,0.14)', stroke: 'rgba(255,255,255,0.7)', 'stroke-width': 1 }, C.dot);
  C.dotCore = el('circle', { r: 8, stroke: '#fff', 'stroke-width': 2 }, C.dot);
  C.dotText = el('text', { class: 'tag' }, C.dot);
}

const segD = dS => [[0, 8 + dS], [8 + dS, 0]];
const segS = sS => [[0, 2 - sS], [8 + sS, 10]];
function setLine(node, seg, draw, alpha) {
  const [[q1, p1], [q2, p2]] = seg;
  const x1 = sx(q1), y1 = sy(p1), x2 = sx(q2), y2 = sy(p2);
  const L = Math.hypot(x2 - x1, y2 - y1);
  node.setAttribute('d', `M${x1},${y1} L${x2},${y2}`);
  if (draw != null) { node.style.strokeDasharray = `${L}`; node.style.strokeDashoffset = `${L * (1 - draw)}`; }
  node.style.opacity = draw != null && draw < 0.002 ? 0 : alpha;
}
const setText = (node, x, y, txt, a) => { node.setAttribute('x', x); node.setAttribute('y', y); if (node.textContent !== txt) node.textContent = txt; node.style.opacity = a; };

function updateChart(s) {
  const { t, sc, price, dS, sS } = s;
  const id = sc.id;
  const late = ['equilibrium', 'demandShift', 'supplyShift', 'summary', 'outro'].includes(id);

  let dDraw = 0, dA = 0, sDraw = 0, sA = 0;
  if (id === 'demand') { dDraw = ramp(t, DRAW.demand.t0, DRAW.demand.t1); dA = 1; }
  if (id === 'supply') { sDraw = ramp(t, DRAW.supply.t0, DRAW.supply.t1); sA = 1; dA = 1 - ramp(t, sc.t0, sc.t0 + 0.6); dDraw = 1; }
  if (late) { const a = id === 'equilibrium' ? ramp(t, sc.t0 + 0.4, sc.t0 + 1.4) : 1; dA = sA = a; dDraw = sDraw = 1; }
  setLine(C.lD, segD(dS), dDraw, dA);
  setLine(C.lS, segS(sS), sDraw, sA);
  setText(C.tD, sx(8 + dS) + 8, Y0 - 10, dS > 0.05 ? 'D′' : 'D', dA * clamp(dDraw * 3 - 2));
  setText(C.tS, sx(8 + sS) + 8, sy(10) + 22, sS > 0.05 ? 'S′' : 'S', sA * clamp(sDraw * 3 - 2));

  const gDa = clamp(dS / 0.4) * 0.5, gSa = clamp(sS / 0.4) * 0.5;
  setLine(C.gD, segD(0), null, gDa);
  setLine(C.gS, segS(0), null, gSa);
  setText(C.tgD, sx(8) + 8, Y0 - 10, 'D', gDa > 0 ? 1 : 0);
  setText(C.tgS, sx(8) + 8, sy(10) + 22, 'S', gSa > 0 ? 1 : 0);

  // 移动箭头
  let arA = 0;
  // 需求箭头画在 P=2（Q 6→8），供给箭头画在 P=8（Q 6→8）：这两处没有别的线
  if (id === 'demandShift' && dS > 0.05) { arA = clamp(dS / 0.6); drawArrow(sy(2), 6, dS, '需求增加'); }
  if (id === 'supplyShift' && sS > 0.05) { arA = clamp(sS / 0.6); drawArrow(sy(8), 6, sS, '供给增加'); }
  C.arrow.style.opacity = arA;

  for (const p of C.pts) {
    const a = id === p.k ? ramp(t, p.at, p.at + 0.35) : 0;
    p.n.style.opacity = a;
    p.n.setAttribute('r', 7 * (0.4 + 0.6 * a) + 4 * Math.sin(Math.PI * clamp((t - p.at) / 0.35)));
  }

  // 价格线 + 缺口
  let pA = 0, gapN = 0, at = false;
  if (late && price != null) {
    pA = id === 'equilibrium' ? ramp(t, sc.t0 + 2.5, sc.t0 + 2.9) : 1;
    if (id === 'summary' || id === 'outro') pA = 0;
    const d = qd(price, dS), sp = qs(price, sS), y = sy(price);
    const gap = sp - d;
    gapN = Math.abs(gap);
    at = gapN < 0.3;
    C.pLine.setAttribute('x1', X0); C.pLine.setAttribute('x2', sx(Math.max(d, sp) + 0.9));
    C.pLine.setAttribute('y1', y); C.pLine.setAttribute('y2', y);
    C.pD.setAttribute('cx', sx(d)); C.pD.setAttribute('cy', y);
    C.pS.setAttribute('cx', sx(sp)); C.pS.setAttribute('cy', y);
    // 过剩时括号在价格线上方、短缺时在下方：这两块区域都没有曲线穿过
    const xa = sx(Math.min(d, sp)), xb = sx(Math.max(d, sp)), k = gap > 0 ? -1 : 1;
    C.gap.setAttribute('d', `M${xa},${y + k * 16} V${y + k * 26} H${xb} V${y + k * 16}`);
    C.gap.setAttribute('stroke', gap > 0 ? 'var(--supply)' : 'var(--alert)');
    C.gap.style.opacity = clamp((gapN - 0.3) / 0.4);
    setText(C.gapText, (xa + xb) / 2, gap > 0 ? y - 36 : y + 52, `${gap > 0 ? '过剩' : '短缺'} ${fmt(gapN)}`, clamp((gapN - 0.3) / 0.4));
    C.gapText.setAttribute('fill', gap > 0 ? 'var(--supply)' : 'var(--alert)');
    setText(C.pText, at ? X0 + 12 : sx(Math.max(d, sp) + 0.9) + 10, at ? y - 12 : y + 7, `${at ? 'P* = ' : 'P = '}${fmt(price)}`, 1);
    C.pD.style.opacity = C.pS.style.opacity = 1 - clamp(1 - gapN / 0.3);
  }
  C.price.style.opacity = pA;

  // 均衡点
  const eqA = pA * clamp(1 - gapN / 0.3);
  if (eqA > 0) {
    const q = qd(price, dS), x = sx(q), y = sy(price);
    C.eqV.setAttribute('x1', x); C.eqV.setAttribute('x2', x); C.eqV.setAttribute('y1', y); C.eqV.setAttribute('y2', Y0);
    C.eqHalo.setAttribute('cx', x); C.eqHalo.setAttribute('cy', y);
    C.eqDot.setAttribute('cx', x); C.eqDot.setAttribute('cy', y);
    C.eqHalo.setAttribute('r', 17 + 3 * Math.sin(t * 4));
    setText(C.eqQ, x + 10, Y0 - 12, `Q* = ${fmt(q)}`, 1);
  }
  C.eq.style.opacity = eqA;
  const oldA = (id === 'demandShift' || id === 'supplyShift') ? clamp(Math.max(dS, sS) / 0.4) * 0.7 : 0;
  C.oldEq.setAttribute('cx', sx(3)); C.oldEq.setAttribute('cy', sy(5));
  C.oldEq.style.opacity = oldA;

  // 沿曲线移动的点
  let dotA = 0;
  if (id === 'demand' && price != null) dotA = ramp(t, DOT.demand, DOT.demand + 0.4);
  if (id === 'supply' && price != null) dotA = ramp(t, DOT.supply, DOT.supply + 0.4);
  if (dotA > 0) {
    const q = id === 'demand' ? qd(price) : qs(price);
    const x = sx(q), y = sy(price);
    C.dotHalo.setAttribute('cx', x); C.dotHalo.setAttribute('cy', y);
    C.dotCore.setAttribute('cx', x); C.dotCore.setAttribute('cy', y);
    C.dotCore.setAttribute('fill', id === 'demand' ? 'var(--demand)' : 'var(--supply)');
    setText(C.dotText, x + 22, y + 7, `P ${fmt(price)} · Q ${fmt(q)}`, 1);
  }
  C.dot.style.opacity = dotA;
}

function drawArrow(y, q0, len, label) {
  const xa = sx(q0) + 12, xb = sx(q0 + len) - 14;
  C.arrowLine.setAttribute('x1', xa); C.arrowLine.setAttribute('x2', Math.max(xa, xb - 6));
  C.arrowLine.setAttribute('y1', y); C.arrowLine.setAttribute('y2', y);
  C.arrowHead.setAttribute('d', `M${xb},${y} L${xb - 11},${y - 6} L${xb - 11},${y + 6} Z`);
  setText(C.arrowText, (xa + xb) / 2, y - 16, label, 1);
}

// —— 面板内容（按场景切换） ——
const legend = (d, s) => `<div class="legend">${d ? '<span><i style="background:var(--demand)"></i>需求 D</span>' : ''}${s ? '<span><i style="background:var(--supply)"></i>供给 S</span>' : ''}</div>`;
const head = (h, sub, d, s) => `<header><div><h2>${h}</h2><div class="sub">${sub}</div></div>${legend(d, s)}</header>`;
const cols = (pts, key) => pts.map(p => `<td data-at="${p.at}">${p[key]}</td>`).join('');

const PANELS = {
  demand: () => head('需求曲线', '其他条件不变：价格 ↑ → 需求量 ↓', true, false) + `
    <table><tr><th>价格 P</th>${cols(DEMAND_PTS, 'p')}</tr>
    <tr><th>需求量 Qd</th>${DEMAND_PTS.map(p => `<td data-at="${p.at}" class="d">${p.q}</td>`).join('')}</tr></table>`,
  supply: () => head('供给曲线', '其他条件不变：价格 ↑ → 供给量 ↑', false, true) + `
    <table><tr><th>价格 P</th>${cols(SUPPLY_PTS, 'p')}</tr>
    <tr><th>供给量 Qs</th>${SUPPLY_PTS.map(p => `<td data-at="${p.at}" class="s">${p.q}</td>`).join('')}</tr></table>`,
  equilibrium: () => head('市场均衡', '需求量 = 供给量 的那个价格', true, true) + `
    <table>
    <tr><th>价格 P</th><td data-at="${EQ_COLS[0]}">7</td><td data-at="${EQ_COLS[1]}">3</td><td data-at="${EQ_COLS[2]}">5</td></tr>
    <tr><th>需求量 Qd</th><td class="d" data-at="${EQ_COLS[0]}">1</td><td class="d" data-at="${EQ_COLS[1]}">5</td><td class="d" data-at="${EQ_COLS[2]}">3</td></tr>
    <tr><th>供给量 Qs</th><td class="s" data-at="${EQ_COLS[0]}">5</td><td class="s" data-at="${EQ_COLS[1]}">1</td><td class="s" data-at="${EQ_COLS[2]}">3</td></tr>
    <tr><th>结果</th><td class="s" data-at="${EQ_COLS[0] + 3}">过剩 4</td><td class="dn" data-at="${EQ_COLS[1] + 1.5}">短缺 4</td><td class="up" data-at="${EQ_COLS[2] + 1}">均衡 ✓</td></tr></table>`,
  demandShift: () => head('需求增加', '需求曲线 D → D′ 向右移动', true, true) + shiftTable(S.demandShift.t0 + 13.2, ['6', 'up', '↑'], ['4', 'up', '↑']),
  supplyShift: () => head('供给增加', '供给曲线 S → S′ 向右移动', true, true) + shiftTable(S.supplyShift.t0 + 12.6, ['4', 'dn', '↓'], ['4', 'up', '↑']),
};
function shiftTable(at, p, q) {
  return `<table>
    <tr><th></th><td style="color:var(--ink-2);font-weight:500">之前</td><td data-at="${at}" style="color:var(--ink-2);font-weight:500">之后</td></tr>
    <tr><th>均衡价格 P*</th><td>5</td><td data-at="${at}" class="${p[1]}">${p[0]} ${p[2]}</td></tr>
    <tr><th>成交量 Q*</th><td>3</td><td data-at="${at}" class="${q[1]}">${q[0]} ${q[2]}</td></tr></table>`;
}

let panelScene = null, panelCells = [];
function setPanel(id) {
  if (panelScene === id) return;
  panelScene = id;
  const box = $('panelInner');
  const make = PANELS[id];
  const ins = INSIGHTS[id];
  if (make) box.innerHTML = make() + (ins ? `<div class="insight" data-at="${ins.at}"><span class="k">规律</span>${ins.text}</div>` : '');
  panelCells = [...box.querySelectorAll('[data-at]')].map(n => ({ n, at: +n.dataset.at }));
}

// —— 文字层 ——
let chipScene = null, cueText = null, cardScene = null;
function setChip(sc) {
  if (chipScene === sc.id || !sc.num) return;
  chipScene = sc.id;
  $('chip').innerHTML = `<span class="num">${sc.num}</span><span class="ttl">${sc.title}</span>`;
}
function setCard(id) {
  if (cardScene === id) return;
  cardScene = id;
  const d = `<img class="px" src="${ICON.diamond}">`, e = `<img class="px" src="${ICON.emerald}">`;
  $('titlecard').innerHTML = id === 'outro'
    ? `<div class="k">LESSON 01 · END</div><div class="big">方块经济学</div><div class="mid">价格 = 供需的交点</div><hr><div class="q">${d} 第 1 课 · 完 ${e}</div>`
    : `<div class="k">LESSON 01</div><div class="big">方块经济学</div><div class="mid">供给与需求</div><hr><div class="q">${d} 钻石的价格是怎么定出来的？ ${e}</div>`;
}

function buildSummary() {
  $('summary').innerHTML = `<h3>一张表记住供需</h3><div class="sub">其他条件不变时，曲线移动对均衡的影响</div>
    <table><tr><th>发生了什么</th><th>曲线怎么动</th><th class="c">价格</th><th class="c">成交量</th></tr>
    ${SUMMARY_ROWS.map((r, i) => `<tr data-row="${i}"><td>${r[0]}</td><td style="color:${r[0].startsWith('需求') ? 'var(--demand)' : 'var(--supply)'}">${r[1]}</td>
      <td class="arrow" style="color:${r[2] === '↑' ? 'var(--emerald)' : 'var(--alert)'}">${r[2]}</td>
      <td class="arrow" style="color:${r[3] === '↑' ? 'var(--emerald)' : 'var(--alert)'}">${r[3]}</td></tr>`).join('')}</table>
    <div class="rule"><span><b>价格变动</b> → 沿着曲线移动</span><span><b>其他因素变动</b> → 整条曲线移动</span></div>`;
}

const g = $('world').getContext('2d');
const toW = (wx, wy, cy) => [wx * 4, (wy - cy) * 4];

function render(t) {
  t = clamp(t, 0, DURATION - 1e-6);
  const s = stateAt(t);
  const { sc } = s;
  drawWorld(g, s);

  // 片头 / 片尾 / 黑场 / 压暗
  const intro = win(t, 0.6, 9.4, 0.8), outro = win(t, S.outro.t0 + 0.3, DURATION + 5, 0.6);
  setCard(t < S.summary.t0 ? 'intro' : 'outro');
  $('titlecard').style.opacity = Math.max(intro, outro);
  $('dim').style.opacity = Math.max(0.55 * win(t, 0, 9.6, 1.2), ramp(t, S.summary.t0, S.summary.t0 + 0.8));
  $('black').style.opacity = Math.max(1 - ramp(t, 0, 0.6), ramp(t, DURATION - 1.0, DURATION - 0.05));

  // 章节 + 市场价
  setChip(sc.num ? sc : S.summary);
  const lessonA = win(t, S.demand.t0 + 0.3, S.summary.t1 - 0.3, 0.6);
  const chipInner = sc.num ? win(t, sc.t0 + 0.15, sc.t1 - 0.15, 0.3) : 1;
  $('chip').style.opacity = lessonA;
  $('chip').firstChild && [...$('chip').children].forEach(n => { n.style.opacity = chipInner; });
  $('hud').style.opacity = win(t, S.demand.t0 + 0.5, S.summary.t0 + 0.3, 0.6);
  const v = s.price == null ? '?' : fmt(s.price);
  if ($('hudVal').textContent !== v) $('hudVal').textContent = v;

  // 事件提示
  const tst = $('toast');
  if (s.toast) {
    if (tst.dataset.id !== s.toast.title) {
      tst.dataset.id = s.toast.title;
      tst.innerHTML = `<div class="ico"><img class="px" src="${ICON[s.toast.icon]}"></div><div><div class="k">EVENT</div><div class="h">${s.toast.title}</div><div class="p">${s.toast.text}</div></div>`;
    }
    tst.style.opacity = win(t, s.toast.t0, s.toast.t1, 0.5);
    tst.style.transform = `translateY(${(1 - ramp(t, s.toast.t0 - 0.25, s.toast.t0 + 0.35)) * -18}px)`;
  } else tst.style.opacity = 0;

  // 图表面板
  setPanel(PANELS[sc.id] ? sc.id : panelScene || 'demand');
  $('panel').style.opacity = win(t, S.demand.t0 + 0.8, S.summary.t0 + 0.3, 0.6);
  $('panelInner').style.opacity = PANELS[sc.id] ? win(t, sc.t0 + 0.2, sc.t1 - 0.12, 0.3) : 1;
  for (const c of panelCells) c.n.style.opacity = ramp(t, c.at, c.at + 0.35);
  updateChart(s);

  // 总结
  $('summary').style.opacity = win(t, S.summary.t0 + 0.5, S.summary.t1 - 0.1, 0.6);
  document.querySelectorAll('#summary [data-row]').forEach((n, i) => {
    const a = ramp(t, SUMMARY_ROW_AT[i], SUMMARY_ROW_AT[i] + 0.4);
    n.style.opacity = a; n.style.transform = `translateY(${(1 - a) * 10}px)`;
  });
  $('summary').querySelector('.rule').style.opacity = ramp(t, S.summary.t0 + 5.5, S.summary.t0 + 6.0);

  // 字幕
  $('subs').style.opacity = win(t, 0.5, S.summary.t1 - 0.2, 0.6);
  const cue = s.cue;
  const html = cue ? markup(cue.text) : '';
  if (html !== cueText) { cueText = html; $('subtext').innerHTML = html; }
  $('subtext').style.opacity = cue ? win(t, cue.t0, cue.t1, 0.3) : 0;

  // 世界内标签：成交 / 卖不掉 / 空手
  const tags = { ok: [0, 0, ''], surplus: [0, 0, ''], shortage: [0, 0, ''] };
  let tagA = 0;
  const tr = s.trade;
  if (tr) {
    const done = tr.at + Math.max(0, tr.matched - 1) * 0.15 + 0.6;
    tagA = ramp(t, done, done + 0.3) * (1 - ramp(t, tr.until - 0.3, tr.until));
    const mid = (a, b) => (buyerX(a) + buyerX(b)) / 2 + 8;
    if (tr.matched) tags.ok = [mid(0, tr.matched - 1), 1, `成交 ${tr.matched} 颗`];
    if (tr.nS > tr.matched) tags.surplus = [(stockX(tr.matched) + stockX(tr.nS - 1)) / 2 + 4, 1, `卖不掉 ×${tr.nS - tr.matched}`];
    if (tr.nB > tr.matched) tags.shortage = [mid(tr.matched, tr.nB - 1), 1, `空手 ×${tr.nB - tr.matched}`];
  }
  for (const [k, [wx, on, txt]] of Object.entries(tags)) {
    const n = $('tag-' + k);
    if (on && n.textContent !== txt) n.textContent = txt;
    const [x, y] = toW(wx, GROUND + 22, s.camY);
    n.style.left = `${x}px`; n.style.top = `${y}px`;
    n.style.opacity = on ? tagA : 0;
  }
}

async function boot() {
  initWorld();
  ICON.diamond = spriteURL('diamond', 6);
  ICON.emerald = spriteURL('emerald', 6);
  ICON.pickaxe = spriteURL('pickaxe', 6);
  $('hud').innerHTML = `<span class="lbl">市场价</span><img class="px" src="${ICON.diamond}"><span class="eq">=</span><span class="val" id="hudVal">?</span><img class="px" src="${ICON.emerald}">`;
  $('panel').innerHTML = '<div id="panelInner"></div>';
  const svg = el('svg', { id: 'chart', width: CW, height: CH, viewBox: `0 0 ${CW} ${CH}` });
  buildChart(svg);
  buildSummary();
  for (const k of ['ok', 'surplus', 'shortage']) {
    const n = document.createElement('div');
    n.id = 'tag-' + k; n.className = `glass wtag ${k}`;
    $('tags').appendChild(n);
  }
  await Promise.all([
    document.fonts.load('900 40px "Noto SC"', '价格需求供给均衡'),
    document.fonts.load('500 20px "Noto SC"', '价格需求供给均衡'),
    document.fonts.load('20px "Pixel"', '0123456789'),
    document.fonts.load('128px "Unifont"', '方块经济学'),
  ]);
  await document.fonts.ready;
  // 图表放在表头与表格之间：换场景重建 panelInner 后把 svg 插回去
  window.seek = t => { render(t); const h = $('panelInner').querySelector('header'); if (h && svg.previousSibling !== h) h.after(svg); };
  window.DURATION = DURATION;
  window.seek(Number(new URLSearchParams(location.search).get('t') || 0));
  window.__ready = true;
}
boot();
