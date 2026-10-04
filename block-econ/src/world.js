// 方块世界：480×270 的低分辨率画布，CSS 放大 4 倍并保持像素硬边。
// 1 格方块 = 16 像素；地表在第 11 行（y=176），矿洞在第 22–24 行。
// 所有纹理和角色都由代码画出，不使用任何游戏素材。
import { clamp, lerp, ease, lin } from './state.js';

export const LW = 480, LH = 270, T = 16;
const COLS = 31, ROWS = 30;
export const GROUND = 176;          // 地表 y
export const FLOOR = 400;           // 矿洞地面 y
export const buyerX = i => 174 - i * 20;
export const minerX = i => 30 + i * 30;
export const stockX = j => 200 + j * 9;

function rng(seed) {
  return () => {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const hash = (a, b = 0) => { const r = rng((a * 7919) ^ (b * 104729)); r(); return r(); };
const pick = (r, arr) => arr[Math.floor(r() * arr.length)];
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const shade = (h, k) => '#' + hex(h).map(v => Math.round(clamp(v * k, 0, 255)).toString(16).padStart(2, '0')).join('');

function makeTex(seed, fn) {
  const c = document.createElement('canvas');
  c.width = c.height = T;
  const g = c.getContext('2d');
  const img = g.createImageData(T, T);
  const r = rng(seed);
  for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
    const col = fn(x, y, r);
    if (!col) continue;
    const [R, G, B] = hex(col), o = (y * T + x) * 4;
    img.data[o] = R; img.data[o + 1] = G; img.data[o + 2] = B; img.data[o + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return c;
}

const DIRT = ['#866043', '#866043', '#79553a', '#96704c', '#6b4a31'];
const GRASS = ['#5fa83a', '#6dbb45', '#4f9230', '#64ad3d'];
const STONE = ['#7d7d7d', '#7d7d7d', '#737373', '#888888', '#6a6a6a'];
const DEEP = ['#4a4a52', '#4a4a52', '#42424a', '#55555d', '#3b3b42'];

function oreFn(base, colors, seed) {
  // colors = [暗, 中, 亮]：每簇是 4×4 的宝石形，左上高光、右下暗边
  const SHAPE = ['.mm.', 'Lmmm', 'mmmd', '.md.'];
  const r = rng(seed), spots = new Map();
  for (const [bx, by] of [[2, 2], [10, 3], [3, 10], [10, 10]]) {
    const cx = bx + Math.floor(r() * 3) - 1, cy = by + Math.floor(r() * 3) - 1;
    SHAPE.forEach((row, dy) => [...row].forEach((ch, dx) => {
      if (ch !== '.') spots.set((cy + dy) * T + cx + dx, colors[{ d: 0, m: 1, L: 2 }[ch]]);
    }));
  }
  return (x, y, rr) => spots.get(y * T + x) || pick(rr, base);
}
const deepFn = (x, y, r) => ((y * 7 + (x >> 2)) % 5 === 0 ? '#3a3a41' : pick(r, DEEP));

const TEX = {};
function buildTextures() {
  TEX.dirt = makeTex(11, (x, y, r) => pick(r, DIRT));
  TEX.grass = makeTex(12, (x, y, r) => {
    if (y < 3) return pick(r, GRASS);
    if (y === 3) return r() < 0.55 ? pick(r, GRASS) : pick(r, DIRT);
    if (y === 4 && r() < 0.18) return pick(r, GRASS);
    return pick(r, DIRT);
  });
  TEX.stone = makeTex(13, (x, y, r) => pick(r, STONE));
  TEX.deep = makeTex(14, deepFn);
  TEX.coal = makeTex(15, oreFn(STONE, ['#1c1c1c', '#2e2e2e', '#4a4a4a'], 151));
  TEX.iron = makeTex(16, oreFn(STONE, ['#9c6c4e', '#d8af93', '#f1d6c2'], 161));
  TEX.dia = makeTex(17, oreFn(DEEP, ['#178f89', '#4ee6e0', '#d4fffa'], 171));
  TEX.bedrock = makeTex(18, (x, y, r) => pick(r, ['#2a2a2a', '#555555', '#121212', '#3c3c3c', '#777777']));
  TEX.planks = makeTex(19, (x, y, r) => {
    const board = y >> 2;
    if (y % 4 === 3 || (x + board * 5) % 16 === 0) return '#7a5a32';
    return pick(r, ['#b48a52', '#a87f4b', '#bd9459']);
  });
  TEX.log = makeTex(20, (x, y, r) => (x % 4 === 0 ? '#4f3a24' : pick(r, ['#6b5032', '#5f472c', '#735637'])));
  TEX.leaves = makeTex(21, (x, y, r) => (r() < 0.12 ? null : pick(r, ['#3b8a2c', '#327a25', '#46992f', '#2b6b20'])));
  TEX.red = makeTex(22, (x, y, r) => pick(r, ['#b3312c', '#a52c27', '#bf3a34']));
  TEX.white = makeTex(23, (x, y, r) => pick(r, ['#e9ecec', '#dcdfe0', '#f2f4f4']));
  TEX.ladder = makeTex(24, (x, y) => ((x === 2 || x === 3 || x === 12 || x === 13) ? (x % 2 ? '#6b4c2a' : '#8a6538')
    : (y % 4 === 1 && x > 3 && x < 12) ? '#9a7442' : null));
  TEX.dirtWall = makeTex(25, (x, y, r) => shade(pick(r, DIRT), 0.45));
  TEX.stoneWall = makeTex(26, (x, y, r) => shade(pick(r, STONE), 0.42));
  TEX.deepWall = makeTex(27, (x, y, r) => shade(deepFn(x, y, r), 0.5));
  TEX.lava = [0, 1, 2, 3].map(f => makeTex(30 + f, (x, y, r) => {
    const v = Math.sin((x + f * 2) * 0.7) + Math.cos((y - f) * 0.9) + r() * 0.8;
    return v > 1.1 ? '#ffd23a' : v > 0.2 ? '#ff8a00' : '#d64e00';
  }));
}

// —— 地图 ——
const MAP = [];
const LADDER = new Set();
function buildMap() {
  const r = rng(2024);
  for (let y = 0; y < ROWS; y++) {
    const row = [];
    for (let x = 0; x < COLS; x++) {
      let id = null;
      if (y === 11) id = 'grass';
      else if (y >= 12 && y <= 14) id = 'dirt';
      else if (y >= 15 && y <= 20) { const v = r(); id = v < 0.06 ? 'coal' : v < 0.1 ? 'iron' : 'stone'; }
      else if (y >= 21 && y <= 27) { const near = y === 21 || y === 26; id = r() < (near ? 0.12 : 0.04) ? 'dia' : 'deep'; }
      else if (y === 28) id = r() < 0.5 ? 'bedrock' : 'deep';
      else if (y === 29) id = 'bedrock';
      row.push(id);
    }
    MAP.push(row);
  }
  for (let y = 22; y <= 24; y++) for (let x = 0; x <= 17; x++) MAP[y][x] = 'deepWall';
  for (let x = 0; x <= 17; x++) MAP[25][x] = 'deep';
  MAP[25][15] = MAP[25][16] = 'lava';
  for (let y = 11; y <= 24; y++) {
    MAP[y][1] = y <= 14 ? 'dirtWall' : y <= 20 ? 'stoneWall' : 'deepWall';
    LADDER.add(y);
  }
}

let ready = false;
export function initWorld() {
  if (ready) return;
  buildTextures();
  buildMap();
  ready = true;
}

// —— 像素图形 ——
const PAL_DIAMOND = { o: '#0b3b40', L: '#d4fffa', m: '#5de8e0', d: '#21a8a1' };
const PAL_EMERALD = { o: '#0a3d1c', L: '#b6ffc9', m: '#41d06b', d: '#1d8f43' };
export const SPRITES = {
  diamond: { pal: PAL_DIAMOND, rows: ['..oooo..', '.oLLmmo.', 'oLLmmddo', 'ommmdddo', '.ommddo.', '..oddo..', '...oo...'] },
  emerald: { pal: PAL_EMERALD, rows: ['..oo..', '.oLmo.', 'oLmmdo', 'oLmmdo', 'ommddo', 'ommddo', '.oddo.', '..oo..'] },
  pickaxe: {
    pal: { o: '#2a2a2a', h: '#8a6538', m: '#5de8e0', L: '#c9fffb', s: '#4a2f17' },
    rows: [
      '...oooooo.', '..oLmmmmmo', '...ooo.omo', '.....oh.om',
      '....ohs.om', '...ohs..o.', '..ohs.....', '.ohs......', 'ohs.......', '.o........',
    ],
  },
};
export function drawSprite(g, name, x, y) {
  const { pal, rows } = SPRITES[name];
  for (let j = 0; j < rows.length; j++) for (let i = 0; i < rows[j].length; i++) {
    const c = pal[rows[j][i]];
    if (c) { g.fillStyle = c; g.fillRect(x + i, y + j, 1, 1); }
  }
}

const GLYPHS = {
  0: [' ### ', '#   #', '#  ##', '# # #', '##  #', '#   #', ' ### '],
  1: ['  #  ', ' ##  ', '  #  ', '  #  ', '  #  ', '  #  ', ' ### '],
  2: [' ### ', '#   #', '    #', '   # ', '  #  ', ' #   ', '#####'],
  3: ['#####', '   # ', '  #  ', '   # ', '    #', '#   #', ' ### '],
  4: ['   # ', '  ## ', ' # # ', '#  # ', '#####', '   # ', '   # '],
  5: ['#####', '#    ', '#### ', '    #', '    #', '#   #', ' ### '],
  6: ['  ## ', ' #   ', '#    ', '#### ', '#   #', '#   #', ' ### '],
  7: ['#####', '    #', '   # ', '  #  ', ' #   ', ' #   ', ' #   '],
  8: [' ### ', '#   #', '#   #', ' ### ', '#   #', '#   #', ' ### '],
  9: [' ### ', '#   #', '#   #', ' ####', '    #', '   # ', ' ##  '],
  '?': [' ### ', '#   #', '    #', '   # ', '  #  ', '     ', '  #  '],
  '=': ['     ', '     ', '#####', '     ', '#####', '     ', '     '],
  '+': ['     ', '  #  ', '  #  ', '#####', '  #  ', '  #  ', '     '],
  '!': ['  #  ', '  #  ', '  #  ', '  #  ', '  #  ', '     ', '  #  '],
};
function glyph(g, ch, x, y, color) {
  const rows = GLYPHS[ch];
  g.fillStyle = color;
  for (let j = 0; j < 7; j++) for (let i = 0; i < 5; i++) if (rows[j][i] === '#') g.fillRect(x + i, y + j, 1, 1);
}
const rect = (g, x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };

// —— 角色 ——
const LOOKS = [
  { hat: '#c9a227', hatBrim: true, skin: '#c8946a', hair: '#4a3222', robe: '#7a5c3e', sleeve: '#6a4f34', pants: '#3a2c20' },
  { hat: null, skin: '#b07a52', hair: '#2b1d14', robe: '#7b4a8f', sleeve: '#6a3e7c', pants: '#2e2436' },
  { hat: '#2f5f9e', skin: '#d6a37c', hair: '#6b4a2a', robe: '#3a6ea5', sleeve: '#30608f', pants: '#2b3140' },
  { hat: null, skin: '#c8946a', hair: '#a8a8a8', robe: '#b5523b', sleeve: '#9c4532', pants: '#3a2a26' },
  { hat: '#3f7d3a', hatBrim: false, skin: '#9c6b46', hair: '#2b1d14', robe: '#3f7d3a', sleeve: '#356a31', pants: '#2a3326' },
  { hat: null, skin: '#d6a37c', hair: '#c7862f', robe: '#c7a24a', sleeve: '#ad8c3e', pants: '#3d3424' },
  { hat: '#5b5b5b', hatBrim: true, skin: '#b07a52', hair: '#3a2a1c', robe: '#5b5b5b', sleeve: '#4e4e4e', pants: '#2a2a2a' },
];
const SELLER = { hat: '#7a2f2a', hatBrim: false, skin: '#c8946a', hair: '#3a2a1c', robe: '#2f4f3a', sleeve: '#28432f', pants: '#2a2a2a', apron: true };

// 正面像，16×32，脚底在 (x, yFeet)
function drawPerson(g, x, yFeet, L) {
  const y = yFeet - 32;
  rect(g, x + 4, y + 20, 4, 12, L.pants); rect(g, x + 8, y + 20, 4, 12, shade(L.pants, 0.85));
  rect(g, x + 4, y + 30, 8, 2, '#1e1e1e');
  rect(g, x + 4, y + 8, 8, 12, L.robe);
  if (L.apron) { rect(g, x + 5, y + 10, 6, 10, '#e8e2d4'); rect(g, x + 5, y + 10, 6, 1, '#cfc7b5'); }
  else rect(g, x + 4, y + 15, 8, 1, shade(L.robe, 0.7));
  rect(g, x, y + 8, 4, 12, L.sleeve); rect(g, x + 12, y + 8, 4, 12, L.sleeve);
  rect(g, x, y + 18, 4, 2, L.skin); rect(g, x + 12, y + 18, 4, 2, L.skin);
  rect(g, x + 4, y, 8, 8, L.skin);
  rect(g, x + 4, y, 8, 2, L.hair); rect(g, x + 4, y + 2, 1, 2, L.hair); rect(g, x + 11, y + 2, 1, 2, L.hair);
  rect(g, x + 5, y + 3, 2, 1, shade(L.hair, 0.9)); rect(g, x + 9, y + 3, 2, 1, shade(L.hair, 0.9));
  rect(g, x + 5, y + 4, 1, 1, '#f4f4f4'); rect(g, x + 6, y + 4, 1, 1, '#2b2b4a');
  rect(g, x + 9, y + 4, 1, 1, '#2b2b4a'); rect(g, x + 10, y + 4, 1, 1, '#f4f4f4');
  rect(g, x + 7, y + 6, 2, 1, shade(L.skin, 0.75));
  if (L.hat) {
    rect(g, x + 4, y - 2, 8, 3, L.hat);
    if (L.hatBrim) rect(g, x + 2, y + 1, 12, 1, shade(L.hat, 0.85));
  }
}

// 侧面像（朝右），8×32，frame 0 举镐 / 1 落镐
function drawMiner(g, x, yFeet, frame) {
  const y = yFeet - 32;
  rect(g, x + 2, y + 20, 4, 12, '#4b3a2a'); rect(g, x + 2, y + 29, 4, 3, '#262626');
  rect(g, x + 2, y + 8, 4, 12, '#2f6db5'); rect(g, x + 2, y + 15, 4, 1, '#24548c');
  rect(g, x, y + 3, 8, 5, '#c8946a'); rect(g, x, y + 3, 2, 3, '#4a3222');
  rect(g, x + 5, y + 4, 1, 1, '#f4f4f4'); rect(g, x + 6, y + 4, 1, 1, '#2b2b4a');
  rect(g, x, y, 8, 3, '#e2b635'); rect(g, x - 1, y + 2, 10, 1, '#c99d22'); rect(g, x + 7, y + 1, 2, 1, '#fff6b0');
  const tool = { h: '#8a6538', m: '#9aa4ad', L: '#d9e0e6' };
  if (frame === 0) {
    rect(g, x + 3, y + 5, 3, 7, '#2a62a6'); rect(g, x + 3, y + 4, 3, 2, '#c8946a');
    [[6, 3], [7, 2], [8, 1], [9, 0]].forEach(([i, j]) => rect(g, x + i, y + j, 1, 1, tool.h));
    [[7, -2], [8, -1], [9, 0], [10, 1], [11, 2]].forEach(([i, j], n) => rect(g, x + i, y + j, 1, 1, n % 4 ? tool.m : tool.L));
  } else {
    rect(g, x + 3, y + 10, 6, 3, '#2a62a6'); rect(g, x + 8, y + 10, 2, 3, '#c8946a');
    [[10, 12], [11, 13], [12, 14], [13, 15]].forEach(([i, j]) => rect(g, x + i, y + j, 1, 1, tool.h));
    [[11, 18], [12, 17], [13, 16], [14, 15], [15, 14]].forEach(([i, j], n) => rect(g, x + i, y + j, 1, 1, n % 4 ? tool.m : tool.L));
  }
}

function drawBubble(g, x, y, ch, color) {
  rect(g, x, y, 9, 10, '#ffffff'); rect(g, x - 1, y + 1, 11, 8, '#ffffff');
  rect(g, x + 3, y + 10, 2, 2, '#ffffff');
  glyph(g, ch, x + 2, y + 2 - 1, color);
}

function plus(g, x, y, c, a) {
  g.globalAlpha = a;
  rect(g, x, y + 1, 3, 1, c); rect(g, x + 1, y, 1, 3, c);
  g.globalAlpha = 1;
}

// —— 场景元素 ——
function drawSky(g, cy) {
  for (let sy = 0; sy < LH; sy += 3) {
    const wy = sy + cy;
    if (wy >= GROUND + 16) break;
    const u = clamp((wy + 100) / (GROUND + 100));
    const a = hex('#4f86ee'), b = hex('#b4d8ff');
    g.fillStyle = `rgb(${a.map((v, i) => Math.round(lerp(v, b[i], Math.round(u * 12) / 12))).join(',')})`;
    g.fillRect(0, sy, LW, 3);
  }
}

function drawHills(g, cy) {
  const layers = [
    { base: 136, amp: 18, f: 0.021, c: '#9cc3e6', w: 6 },
    { base: 156, amp: 12, f: 0.035, c: '#7fb36d', w: 4 },
  ];
  for (const L of layers) {
    g.fillStyle = L.c;
    for (let x = 0; x < LW; x += L.w) {
      const h = L.base - Math.round((Math.sin(x * L.f) * 0.6 + Math.sin(x * L.f * 2.3 + 1) * 0.4) * L.amp / 4) * 4;
      g.fillRect(x, h - cy, L.w, GROUND - h);
    }
  }
}

const CLOUDS = [[40, 26, 1.0], [210, 44, 0.8], [330, 18, 1.2], [470, 54, 0.9], [120, 66, 0.7]];
function drawClouds(g, cy, t) {
  for (const [bx, by, sc] of CLOUDS) {
    const w = Math.round(44 * sc), span = LW + 120;
    const x = Math.round(((bx - t * 3 * sc) % span + span) % span) - 60;
    const y = by - cy;
    if (y > LH) continue;
    rect(g, x, y, w, 8, '#ffffff'); rect(g, x + 8, y - 6, w - 20, 6, '#ffffff');
    rect(g, x + 4, y + 8, w - 8, 3, '#dfe9f6');
  }
}

function drawSun(g, cy) {
  const x = 150, y = 22 - cy;
  rect(g, x - 2, y - 2, 24, 24, '#fff2a8'); rect(g, x, y, 20, 20, '#fffbe0');
}

function drawTiles(g, cy, t) {
  const r0 = Math.max(0, Math.floor(cy / T)), r1 = Math.min(ROWS - 1, Math.floor((cy + LH) / T));
  const lf = Math.floor(t * 4) % 4;
  for (let r = r0; r <= r1; r++) for (let c = 0; c < COLS; c++) {
    const id = MAP[r][c];
    if (!id) continue;
    const img = id === 'lava' ? TEX.lava[(lf + c) % 4] : TEX[id];
    g.drawImage(img, c * T, r * T - cy);
    if (c === 1 && LADDER.has(r)) g.drawImage(TEX.ladder, c * T, r * T - cy);
  }
}

function drawFlowers(g, cy) {
  const spots = [[12, '#e23b3b'], [92, '#f2d33a'], [150, '#e23b3b'], [262, '#f2d33a'], [36, '#7ec8ff']];
  for (const [x, c] of spots) {
    rect(g, x + 1, GROUND - 4 - cy, 1, 4, '#3f8a2a');
    rect(g, x, GROUND - 6 - cy, 3, 2, c);
  }
  for (const x of [60, 118, 230, 252]) {
    rect(g, x, GROUND - 3 - cy, 1, 3, '#4f9a33'); rect(g, x + 2, GROUND - 4 - cy, 1, 4, '#5fae3c'); rect(g, x + 4, GROUND - 2 - cy, 1, 2, '#4f9a33');
  }
}

function drawSign(g, cy, price) {
  const x = 197, y = 72 - cy;
  rect(g, 206, 94 - cy, 1, 6, '#3a3a3a'); rect(g, 238, 94 - cy, 1, 6, '#3a3a3a');
  g.drawImage(TEX.planks, 0, 0, 16, 16, x, y, 16, 22);
  g.drawImage(TEX.planks, 0, 0, 16, 16, x + 16, y, 16, 22);
  g.drawImage(TEX.planks, 0, 0, 16, 16, x + 32, y, 18, 22);
  g.strokeStyle = '#5a4128'; g.lineWidth = 1; g.strokeRect(x + 0.5, y + 0.5, 49, 21);
  const label = price == null ? '?' : String(Math.round(price));
  const ink = '#2e2014';
  let cx = 222 - Math.round((8 + 3 + 5 + 3 + label.length * 6 - 1 + 3 + 6) / 2);
  drawSprite(g, 'diamond', cx, y + 7); cx += 11;
  glyph(g, '=', cx, y + 7, ink); cx += 8;
  for (const ch of label) { glyph(g, ch, cx, y + 7, ink); cx += 6; }
  cx += 2;
  drawSprite(g, 'emerald', cx, y + 7);
}

function drawStallBack(g, cy) {
  rect(g, 196, 100 - cy, 4, 76, '#6b5032'); rect(g, 199, 100 - cy, 1, 76, '#4f3a24');
  rect(g, 244, 100 - cy, 4, 76, '#6b5032'); rect(g, 244, 100 - cy, 1, 76, '#4f3a24');
}

function drawStallFront(g, cy) {
  for (let i = 0; i < 3; i++) g.drawImage(TEX.planks, 198 + i * 16, GROUND - 16 - cy);
  rect(g, 198, GROUND - 16 - cy, 48, 1, '#d1a86b');
  rect(g, 190, 96 - cy, 64, 4, '#7a5a32');
  for (let i = 0; i < 8; i++) {
    const x = 190 + i * 8, tex = i % 2 ? TEX.white : TEX.red;
    g.drawImage(tex, 0, 0, 8, 12, x, 100 - cy, 8, 12);
    g.drawImage(tex, 0, 12, 8, 1, x + 1, 112 - cy, 6, 1);
    g.drawImage(tex, 0, 13, 8, 1, x + 2, 113 - cy, 4, 1);
  }
}

function drawStock(g, cy, s, t) {
  const n = Math.ceil(s.stock - 1e-6);
  const tr = s.trade;
  for (let j = 0; j < Math.max(n, 7); j++) {
    let a = clamp((s.stock - j) * 2);
    if (a <= 0) continue;
    if (tr && j < tr.matched && t >= tr.at + j * 0.15) continue;
    g.globalAlpha = a;
    drawSprite(g, 'diamond', stockX(j), GROUND - 24 - cy + Math.round((1 - a) * -6));
    g.globalAlpha = 1;
  }
}

function drawBuyers(g, cy, s, t) {
  const tr = s.trade;
  for (let i = 6; i >= 0; i--) {
    const a = clamp((s.buyers - i) * 2);
    if (a <= 0) continue;
    const x = buyerX(i);
    const bob = (Math.floor(t * 2 + i * 0.7) % 2);
    const yF = GROUND - cy - Math.round((1 - a) * 8);
    g.globalAlpha = a * 0.35; rect(g, x + 2, GROUND - 1 - cy, 12, 2, '#000'); g.globalAlpha = a;
    drawPerson(g, x, yF - bob, LOOKS[i % LOOKS.length]);
    g.globalAlpha = 1;
    if (!tr) continue;
    const land = tr.at + i * 0.15 + 0.6;
    const done = tr.at + Math.max(0, tr.matched - 1) * 0.15 + 0.6;
    if (i < tr.matched && t >= land) {
      const hb = Math.round(Math.sin((t - land) * 4) * 1.5);
      drawSprite(g, 'diamond', x + 4, yF - 44 + hb);
      for (let k = 0; k < 3; k++) {
        const ph = ((t - land) * 1.1 + k * 0.33) % 1;
        plus(g, x + 2 + k * 5, yF - 36 - Math.round(ph * 16), '#7dff6a', 1 - ph);
      }
    } else if (i >= tr.matched && t >= done) {
      drawBubble(g, x + 3, yF - 46, '!', '#d83a2e');
    }
  }
}

function drawFlights(g, cy, s, t) {
  const tr = s.trade;
  if (!tr) return;
  for (let i = 0; i < tr.matched; i++) {
    const u = lin(t, tr.at + i * 0.15, tr.at + i * 0.15 + 0.6);
    if (u <= 0 || u >= 1) continue;
    const e = ease(u);
    const x0 = stockX(i), y0 = GROUND - 24, x1 = buyerX(i) + 4, y1 = GROUND - 44;
    const x = Math.round(lerp(x0, x1, e)), y = Math.round(lerp(y0, y1, e) - Math.sin(Math.PI * u) * 22);
    drawSprite(g, 'diamond', x, y - cy);
  }
}

function drawMine(g, cy, s, t) {
  // 墙上的火把与光晕
  for (let i = 0; i < 4; i++) {
    const x = minerX(i * 2) - 9, y = 360 - cy;
    const fl = Math.floor(t * 6 + i) % 2;
    rect(g, x, y + 2, 2, 6, '#6b4c2a'); rect(g, x, y, 2, 2, fl ? '#ffd23a' : '#ff9a1a'); rect(g, x, y - 1, 1, 1, '#fff2a8');
    g.globalCompositeOperation = 'lighter';
    const gr = g.createRadialGradient(x + 1, y, 1, x + 1, y, 30);
    gr.addColorStop(0, 'rgba(255,170,70,0.28)'); gr.addColorStop(1, 'rgba(255,170,70,0)');
    g.fillStyle = gr; g.fillRect(x - 30, y - 30, 62, 62);
    g.globalCompositeOperation = 'source-over';
  }
  g.globalCompositeOperation = 'lighter';
  const lg = g.createRadialGradient(256, FLOOR - cy, 2, 256, FLOOR - cy, 46);
  lg.addColorStop(0, 'rgba(255,110,0,0.45)'); lg.addColorStop(1, 'rgba(255,110,0,0)');
  g.fillStyle = lg; g.fillRect(200, FLOOR - 50 - cy, 112, 70);
  g.globalCompositeOperation = 'source-over';

  for (let i = 0; i < 7; i++) {
    const x = minerX(i);
    g.drawImage(TEX.dia, x + 10, FLOOR - 16 - cy);
    const a = clamp((s.miners - i) * 2);
    if (a <= 0) continue;
    const frame = Math.floor(t * 3 + i * 0.37) % 2;
    g.globalAlpha = a;
    drawMiner(g, x, FLOOR - cy - Math.round((1 - a) * 12), frame);
    g.globalAlpha = 1;
    if (a < 1) continue;
    if (frame === 1) {
      for (let k = 0; k < 3; k++) rect(g, x + 12 + Math.floor(hash(i, Math.floor(t * 3) + k) * 6), FLOOR - 18 - cy - Math.floor(hash(k, i + Math.floor(t * 3)) * 5), 1, 1, k ? '#bffcff' : '#ffffff');
    }
    const ph = ((t + i * 0.29) / 2.0) % 1;
    if (ph < 0.5) {
      g.globalAlpha = 1 - ph * 2;
      drawSprite(g, 'diamond', x + 14, FLOOR - 28 - cy - Math.round(ph * 2 * 14));
      g.globalAlpha = 1;
    }
  }
}

export function drawWorld(g, s) {
  const t = s.t;
  const cy = Math.round(s.camY);
  g.imageSmoothingEnabled = false;
  g.clearRect(0, 0, LW, LH);
  drawSky(g, cy);
  if (cy < GROUND) { drawSun(g, cy); drawClouds(g, cy, t); drawHills(g, cy); }
  drawTiles(g, cy, t);
  if (cy + LH > 340) drawMine(g, cy, s, t);
  if (cy < GROUND + 10) {
    drawFlowers(g, cy);
    drawStallBack(g, cy);
    drawPerson(g, 214, GROUND - cy, SELLER);
    drawStallFront(g, cy);
    drawSign(g, cy, s.price);
    drawStock(g, cy, s, t);
    drawBuyers(g, cy, s, t);
    drawFlights(g, cy, s, t);
  }
}

// DOM 图标：把像素精灵导出成放大后的 data URL
export function spriteURL(name, scale = 4) {
  const { rows } = SPRITES[name];
  const c = document.createElement('canvas');
  c.width = rows[0].length * scale; c.height = rows.length * scale;
  const g = c.getContext('2d');
  g.scale(scale, scale);
  drawSprite(g, name, 0, 0);
  return c.toDataURL();
}
