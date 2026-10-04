// 剧本的唯一数据源：场景时长、字幕、价格与曲线移动的关键帧、成交、提示卡。
// 画面（main.js / world.js）和配乐（audio.mjs）都从这里读，改时长只改这一处。
//
// 下面所有时刻都按"设计时间"（场景内的相对秒数）书写，再经 T(场景, 秒) 换算成绝对时间。
// 有配音时（src/voice.js），某句配音比字幕窗口长，就把这一段窗口拉长到能读完，
// 窗口里的动画关键帧按比例一起移动，所以声音、字幕、画面始终对齐。
import { VOICE } from './voice.js';

export const W = 1920;
export const H = 1080;
export const FPS = 30;
export const VOICE_LEAD = 0.15;   // 字幕出现后多久开始读
const VOICE_TAIL = 0.45;          // 读完后留白

export const SCENES = [
  { id: 'intro', dur: 10 },
  { id: 'demand', dur: 24, num: '01', title: '需求' },
  { id: 'supply', dur: 24, num: '02', title: '供给' },
  { id: 'equilibrium', dur: 28, num: '03', title: '均衡' },
  { id: 'demandShift', dur: 17, num: '04', title: '需求增加' },
  { id: 'supplyShift', dur: 16, num: '05', title: '供给增加' },
  { id: 'summary', dur: 11, num: '06', title: '总结' },
  { id: 'outro', dur: 4 },
];

// 字幕：<d> 需求色  <s> 供给色  <e> 绿宝石色  <b> 强调。每行 [场景, 设计起点, 设计终点, 文本]
const SCRIPT = [
  ['intro', 0.6, 4.6, '一颗钻石，为什么能换 5 颗绿宝石？'],
  ['intro', 4.8, 9.8, '先说结论：价格由<d>想买的人</d>和<s>愿卖的人</s>共同决定。'],

  ['demand', 0.3, 5.0, '先看<d>需求</d>：村民想买钻石，买多少要看价格。'],
  ['demand', 5.0, 9.5, '1 颗钻石卖 7 颗绿宝石，只有 1 位村民愿意买。'],
  ['demand', 9.5, 15.0, '越便宜买的人越多：降到 1 颗，7 位村民都来排队。'],
  ['demand', 15.0, 19.5, '把每个价格下的购买量连起来，就是<d>需求曲线</d>。'],
  ['demand', 19.5, 24.0, '价格越高，需求量越少——曲线向下倾斜。'],

  ['supply', 0.3, 5.5, '再看<s>供给</s>：钻石藏在深层，下矿要费镐、费火把，还得躲岩浆。'],
  ['supply', 5.5, 9.5, '只卖 3 颗绿宝石：只有 1 位矿工觉得值得下矿。'],
  ['supply', 9.5, 15.5, '价格越高越多人愿意下矿：涨到 9 颗，7 位矿工都来挖。'],
  ['supply', 15.5, 19.5, '把它们连起来，就是<s>供给曲线</s>。'],
  ['supply', 19.5, 24.0, '价格越高，供给量越多——曲线向上倾斜。'],

  ['equilibrium', 0.3, 4.0, '把两条曲线放在一起。'],
  ['equilibrium', 4.0, 9.5, '定价 7 颗：挖来 5 颗，只卖出 1 颗，4 颗砸在手里——<b>过剩</b>。'],
  ['equilibrium', 9.5, 12.0, '卖家只好降价，过剩随之缩小。'],
  ['equilibrium', 12.0, 17.5, '反过来定价 3 颗：5 人要买，只挖来 1 颗，4 人空手——<b>短缺</b>。'],
  ['equilibrium', 17.5, 20.0, '买家愿意加价，短缺随之缩小。'],
  ['equilibrium', 20.0, 24.0, '停在 5 颗：想买 3 颗，愿卖 3 颗，刚好成交。'],
  ['equilibrium', 24.0, 28.0, '交点就是<e>均衡点</e>，它决定市场价格和成交量。'],

  ['demandShift', 0.3, 5.5, '假如版本更新，钻石能打造更强的装备：同样价格下，想买的人变多了。'],
  ['demandShift', 5.5, 10.5, '价格以外的因素变了，整条<d>需求曲线</d>向右移动。'],
  ['demandShift', 10.5, 17.0, '新交点：价格从 5 涨到 6，成交量从 3 升到 4。<d>需求增加</d>，价涨量增。'],

  ['supplyShift', 0.3, 5.0, '再假如矿工都换上效率附魔镐，挖钻石更省力。'],
  ['supplyShift', 5.0, 10.0, '同样价格下愿意卖的更多，<s>供给曲线</s>向右移动。'],
  ['supplyShift', 10.0, 16.0, '新交点：价格从 5 降到 4，成交量从 3 升到 4。<s>供给增加</s>，价跌量增。'],

  ['summary', 0.3, 5.5, '总结：市场价格由<d>需求</d>和<s>供给</s>的交点决定。'],
  ['summary', 5.5, 11.0, '价格变动只会沿着曲线走；价格以外的因素变了，曲线才会移动。'],
];

// 每个场景一条分段线性映射：设计时间 → 实际时间。字幕窗口按配音需要拉长，窗口之间的空隙不变。
const WARP = {};
for (const sc of SCENES) {
  const pts = [[0, 0]];
  let d = 0;
  SCRIPT.forEach(([id, a, b], i) => {
    if (id !== sc.id) return;
    const n = pts.at(-1)[1] + (a - d);
    const need = VOICE ? VOICE.clips[i] + VOICE_LEAD + VOICE_TAIL : 0;
    pts.push([a, n], [b, n + Math.max(b - a, need)]);
    d = b;
  });
  pts.push([sc.dur, pts.at(-1)[1] + (sc.dur - d)]);
  WARP[sc.id] = pts;
  sc.dur = pts.at(-1)[1];
}
{
  let acc = 0;
  for (const s of SCENES) { s.t0 = acc; acc += s.dur; s.t1 = acc; }
}
export const DURATION = SCENES[SCENES.length - 1].t1;
const S = Object.fromEntries(SCENES.map(s => [s.id, s.t0]));
export const sceneAt = t => SCENES.find(s => t < s.t1) || SCENES[SCENES.length - 1];

// 设计时间 → 绝对时间
export function T(scene, x) {
  const pts = WARP[scene];
  for (let i = 1; i < pts.length; i++) {
    const [d0, n0] = pts[i - 1], [d1, n1] = pts[i];
    if (x <= d1 || i === pts.length - 1) return S[scene] + (d1 > d0 ? n0 + (x - d0) * (n1 - n0) / (d1 - d0) : n1);
  }
  return S[scene] + x;
}

// 线性模型（单位：价格 = 绿宝石/颗钻石，数量 = 颗/天）
//   需求 Qd = 8 + dS − P      供给 Qs = P − 2 + sS
//   基准均衡 P=5 Q=3；需求 +2 → P=6 Q=4；供给 +2 → P=4 Q=4
export const qd = (p, dS = 0) => Math.max(0, 8 + dS - p);
export const qs = (p, sS = 0) => Math.max(0, p - 2 + sS);

export const CUES = SCRIPT.map(([id, a, b, text], i) => ({
  t0: T(id, a), t1: T(id, b), text,
  voice: VOICE ? { at: T(id, a) + VOICE_LEAD, dur: VOICE.clips[i], file: `${String(i).padStart(2, '0')}.wav` } : null,
}));

// 关键帧：到 at 秒时，在 dur 秒内缓动到 to（dur 省略 = 瞬切；to 为 null = 价格未知）
const k = (scene, at, to, dur = 0) => ({ at: T(scene, at), to, dur: dur && T(scene, at + dur) - T(scene, at) });

export const CAM = {
  start: -96,
  steps: [
    k('intro', 0.3, 0, 3.4),
    k('supply', 0, 208, 2.4),
    k('equilibrium', 0, 0, 2.4),
  ],
};

export const PRICE = {
  start: null,
  steps: [
    k('demand', 5.0, 7), k('demand', 10.0, 5, 0.6), k('demand', 11.5, 3, 0.6), k('demand', 13.0, 1, 0.6),
    k('demand', 18.0, 7, 4.0),
    k('supply', 0, null), k('supply', 5.5, 3), k('supply', 10.0, 5, 0.6), k('supply', 11.5, 7, 0.6), k('supply', 13.0, 9, 0.6),
    k('supply', 18.5, 3, 3.5),
    k('equilibrium', 0, null), k('equilibrium', 2.5, 7), k('equilibrium', 9.5, 5, 2.2),
    k('equilibrium', 12.0, 3), k('equilibrium', 17.5, 5, 2.2),
    k('demandShift', 10.5, 6, 2.5),
    k('supplyShift', 0, 5, 1.0), k('supplyShift', 10.0, 4, 2.5),
  ],
};

export const DSHIFT = { start: 0, steps: [k('demandShift', 5.5, 2, 3.0), k('supplyShift', 0, 0, 1.0)] };
export const SSHIFT = { start: 0, steps: [k('supplyShift', 5.0, 2, 3.0)] };

// 散点：在 at 秒出现，同时揭开表格对应列
export const DEMAND_PTS = [
  { at: T('demand', 5.0), p: 7, q: 1 }, { at: T('demand', 10.0), p: 5, q: 3 },
  { at: T('demand', 11.5), p: 3, q: 5 }, { at: T('demand', 13.0), p: 1, q: 7 },
];
export const SUPPLY_PTS = [
  { at: T('supply', 5.5), p: 3, q: 1 }, { at: T('supply', 10.0), p: 5, q: 3 },
  { at: T('supply', 11.5), p: 7, q: 5 }, { at: T('supply', 13.0), p: 9, q: 7 },
];
export const DRAW = {
  demand: { t0: T('demand', 15.0), t1: T('demand', 17.5) },
  supply: { t0: T('supply', 15.5), t1: T('supply', 18.0) },
};
export const DOT = { demand: T('demand', 17.5), supply: T('supply', 18.0) };

// 均衡场景表格三列的揭开时间
export const EQ_COLS = [T('equilibrium', 2.5), T('equilibrium', 12.0), T('equilibrium', 20.0)];

// 成交：at 时钻石飞向排队的村民，until 前保持结果（剩货 / 空手）
export const TRADES = [
  { at: T('equilibrium', 5.5), until: T('equilibrium', 9.4) },
  { at: T('equilibrium', 13.5), until: T('equilibrium', 17.4) },
  { at: T('equilibrium', 21.0), until: T('equilibrium', 28.0) },
  { at: T('demandShift', 14.0), until: T('demandShift', 17.0) },
  { at: T('supplyShift', 13.5), until: T('supplyShift', 16.0) },
];

export const TOASTS = [
  { t0: T('demandShift', 0.5), t1: T('demandShift', 5.6), icon: 'diamond', title: '版本更新', text: '钻石装备可以附魔升级，人人都想要' },
  { t0: T('supplyShift', 0.6), t1: T('supplyShift', 5.4), icon: 'pickaxe', title: '矿工升级', text: '效率附魔镐：同样时间挖得更多' },
];

// 面板底部的规律条
export const INSIGHTS = {
  demand: { at: T('demand', 19.5), text: '需求定律：价格越高，需求量越少' },
  supply: { at: T('supply', 19.5), text: '供给定律：价格越高，供给量越多' },
  equilibrium: { at: T('equilibrium', 24.0), text: '高于均衡价 → 过剩 → 降价；低于 → 短缺 → 涨价' },
  demandShift: { at: T('demandShift', 13.5), text: '需求增加：价格 ↑，成交量 ↑' },
  supplyShift: { at: T('supplyShift', 12.8), text: '供给增加：价格 ↓，成交量 ↑' },
};

export const SUMMARY_ROWS = [
  ['需求增加', '需求曲线右移', '↑', '↑'],
  ['需求减少', '需求曲线左移', '↓', '↓'],
  ['供给增加', '供给曲线右移', '↓', '↑'],
  ['供给减少', '供给曲线左移', '↑', '↓'],
];
export const SUMMARY_ROW_AT = SUMMARY_ROWS.map((_, i) => T('summary', 1.0 + i * 0.6));
