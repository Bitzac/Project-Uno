// Indicators and trading rules shared by backtest.mjs and signals.mjs, so the rules that are tested are the rules that trade.
// Bars are ascending arrays { d, o, h, l, c, v }. Every rule reads one "feature" object describing a single session.

export const CFG = {
  cost: 0.0005,                       // per side, applied to traded value
  regimeMap: [0, 0, 0.3, 0.6, 0.8, 1], // score 0..5 → stock exposure cap before the volatility scaler
  volTarget: 0.15,                     // SPY 20-day realised vol target
  volSteps: [1, 0.75, 0.5, 0.25],      // the scaler is rounded down to one of these to avoid daily churn
  core: 0.6,                           // core sleeve share; the satellite gets what the cap leaves above it
  rot: { top: 3, keep: 5, look: [63, 126, 252], skip: 21 },
  risk: 0.005, maxPos: 0.1, maxSat: 8, maxPerSector: 2,
  s3: { stopAtr: 2, trailAtr: 3, rank: 0.8, rv: 1.5, nearHigh: 0.95 },
  s4: { stopAtr: 3, rsi: 25, drop: -0.05, maxBars: 7 },
  s5: { gap: 0.04, rv: 2, maxBars: 20 },
};

export const SECTORS = [
  ['XLK', '信息技术', 'Information Technology'], ['XLC', '通信服务', 'Communication Services'], ['XLY', '可选消费', 'Consumer Discretionary'],
  ['XLP', '必需消费', 'Consumer Staples'], ['XLV', '医疗保健', 'Health Care'], ['XLF', '金融', 'Financials'], ['XLI', '工业', 'Industrials'],
  ['XLE', '能源', 'Energy'], ['XLB', '原材料', 'Materials'], ['XLU', '公用事业', 'Utilities'], ['XLRE', '房地产', 'Real Estate'],
];
export const ETFS = ['SPY', 'RSP', 'QQQ', 'IWM', ...SECTORS.map(s => s[0]), 'HYG', 'IEF', 'SGOV', 'BIL', 'TLT', 'GLD'];
export const CASH = 'SGOV';

// ---------- indicators (arrays in, arrays out; null until enough history) ----------
export function sma(a, n) {
  const out = new Array(a.length).fill(null);
  let s = 0;
  for (let i = 0; i < a.length; i++) {
    s += a[i];
    if (i >= n) s -= a[i - n];
    if (i >= n - 1) out[i] = s / n;
  }
  return out;
}
export function ema(a, n) {
  const out = new Array(a.length).fill(null), k = 2 / (n + 1);
  for (let i = n - 1; i < a.length; i++) {
    out[i] = i === n - 1 ? a.slice(0, n).reduce((x, y) => x + y, 0) / n : a[i] * k + out[i - 1] * (1 - k);
  }
  return out;
}
// Wilder's moving average (RMA), as TradingView uses for ATR and RSI
function rma(a, n, from = 0) {
  const out = new Array(a.length).fill(null);
  if (a.length < from + n) return out;
  let s = 0;
  for (let i = from; i < from + n; i++) s += a[i];
  out[from + n - 1] = s / n;
  for (let i = from + n; i < a.length; i++) out[i] = (out[i - 1] * (n - 1) + a[i]) / n;
  return out;
}
export function atr(h, l, c, n = 14) {
  const tr = h.map((x, i) => (i === 0 ? x - l[i] : Math.max(x - l[i], Math.abs(x - c[i - 1]), Math.abs(l[i] - c[i - 1]))));
  return rma(tr, n);
}
export function rsi(c, n) {
  const up = c.map((x, i) => (i ? Math.max(x - c[i - 1], 0) : 0));
  const dn = c.map((x, i) => (i ? Math.max(c[i - 1] - x, 0) : 0));
  const au = rma(up, n, 1), ad = rma(dn, n, 1);
  return c.map((_, i) => (au[i] == null ? null : ad[i] === 0 ? 100 : 100 - 100 / (1 + au[i] / ad[i])));
}
export function rollMax(a, n) {
  const out = new Array(a.length).fill(null), q = [];
  for (let i = 0; i < a.length; i++) {
    while (q.length && a[q[q.length - 1]] <= a[i]) q.pop();
    q.push(i);
    if (q[0] <= i - n) q.shift();
    if (i >= n - 1) out[i] = a[q[0]];
  }
  return out;
}
export function realisedVol(c, n = 20) {
  const r = c.map((x, i) => (i ? Math.log(x / c[i - 1]) : 0));
  const out = new Array(c.length).fill(null);
  for (let i = n; i < c.length; i++) {
    const w = r.slice(i - n + 1, i + 1), m = w.reduce((a, b) => a + b, 0) / n;
    out[i] = Math.sqrt(w.reduce((a, b) => a + (b - m) ** 2, 0) / (n - 1) * 252);
  }
  return out;
}

// Per-stock feature arrays used by the stock rules (the live pipeline builds the same fields from TradingView).
export function stockFeatures(b) {
  const n = b.c.length;
  const avgV = sma(b.v, 10);
  return {
    sma5: sma(b.c, 5), ema10: ema(b.c, 10), sma50: sma(b.c, 50), sma200: sma(b.c, 200),
    atr: atr(b.h, b.l, b.c, 14), rsi7: rsi(b.c, 7), hi1m: rollMax(b.h, 21), hi52: rollMax(b.h, 252),
    ret5: b.c.map((x, i) => (i >= 5 ? x / b.c[i - 5] - 1 : null)),
    ret126: b.c.map((x, i) => (i >= 126 ? x / b.c[i - 126] - 1 : null)),
    rv: b.v.map((x, i) => (i >= 1 && avgV[i - 1] ? x / avgV[i - 1] : null)),
    gap: b.o.map((x, i) => (i ? x / b.c[i - 1] - 1 : null)),
    n,
  };
}
// One session's feature object from arrays
export function featureAt(b, F, i) {
  return {
    o: b.o[i], h: b.h[i], l: b.l[i], c: b.c[i], sma5: F.sma5[i], ema10: F.ema10[i], sma50: F.sma50[i], sma200: F.sma200[i],
    atr: F.atr[i], rsi7: F.rsi7[i], hi1m: F.hi1m[i], hi52: F.hi52[i], ret5: F.ret5[i], ret126: F.ret126[i], rv: F.rv[i], gap: F.gap[i],
  };
}

// ---------- stock rules ----------
const ok = (...xs) => xs.every(x => typeof x === 'number' && Number.isFinite(x));
export const RULES = {
  s3: {
    name: '趋势突破',
    entry: f => ok(f.c, f.sma50, f.sma200, f.h, f.hi1m, f.hi52, f.rank6m, f.rv, f.atr) &&
      f.c > f.sma50 && f.sma50 > f.sma200 && f.h >= f.hi1m && f.c >= CFG.s3.nearHigh * f.hi52 && f.rank6m >= CFG.s3.rank && f.rv >= CFG.s3.rv,
    stop: (fill, f) => fill - CFG.s3.stopAtr * f.atr,
    exit: (f, pos) => f.c < f.sma50 || f.c < pos.maxClose - CFG.s3.trailAtr * f.atr,
    exitText: pos => `收盘跌破 50 日线，或跌破 ${(pos.maxClose - CFG.s3.trailAtr * pos.atrNow).toFixed(2)}（最高收盘 − 3×ATR）`,
    rank: f => f.ret126,
  },
  s4: {
    name: '趋势回调',
    entry: f => ok(f.c, f.sma200, f.rsi7, f.ret5, f.atr) && f.c > f.sma200 && f.rsi7 < CFG.s4.rsi && f.ret5 <= CFG.s4.drop,
    stop: (fill, f) => fill - CFG.s4.stopAtr * f.atr,
    exit: (f, pos) => f.c > f.sma5 || pos.bars >= CFG.s4.maxBars,
    exitText: () => `收盘站上 5 日线，或持有满 ${CFG.s4.maxBars} 个交易日`,
    rank: f => -f.rsi7,
  },
  s5: {
    name: '放量跳空',
    entry: f => ok(f.gap, f.rv, f.o, f.c, f.l) && f.gap >= CFG.s5.gap && f.rv >= CFG.s5.rv && f.c >= f.o,
    stop: (fill, f) => f.l,
    exit: (f, pos) => f.c < f.ema10 || pos.bars >= CFG.s5.maxBars,
    exitText: () => `收盘跌破 10 日 EMA，或持有满 ${CFG.s5.maxBars} 个交易日`,
    rank: f => f.gap,
  },
};

// ---------- regime and rotation ----------
// ctx: { spy: {c, sma20, sma50, sma200, vol20}, sectorsAbove: [bool], vix, vix3m, credit, creditSma50, use: [check keys] }
// All five checks are always evaluated for display; only the keys in ctx.use move the cap. With use = [] the cap is the
// volatility scaler alone. backtest.mjs picks `use` and stores it in data/backtest.json (regime.model).
export const CHECK_KEYS = ['trend', 'breadth', 'vol', 'credit', 'momentum'];
export function regime(ctx) {
  const above = ctx.sectorsAbove.filter(Boolean).length, total = ctx.sectorsAbove.length;
  const use = ctx.use ?? CHECK_KEYS;
  const checks = [
    { k: 'trend', n: '趋势', pass: ctx.spy.c > ctx.spy.sma200, v: ctx.spy.c / ctx.spy.sma200 - 1, rule: 'SPY 收盘 > 200 日均线' },
    { k: 'breadth', n: '宽度', pass: above / total > 0.5, v: above / total, rule: '11 个板块 ETF 中过半站上 200 日均线', extra: `${above}/${total}` },
    { k: 'vol', n: '波动结构', pass: ctx.vix < ctx.vix3m, v: ctx.vix / ctx.vix3m, rule: 'VIX < VIX3M（期限结构正常）' },
    { k: 'credit', n: '信用', pass: ctx.credit > ctx.creditSma50, v: ctx.credit / ctx.creditSma50 - 1, rule: 'HYG/IEF 比值 > 其 50 日均线' },
    { k: 'momentum', n: '动能', pass: ctx.spy.sma20 > ctx.spy.sma50, v: ctx.spy.sma20 / ctx.spy.sma50 - 1, rule: 'SPY 20 日均线 > 50 日均线' },
  ].map(x => ({ ...x, used: use.includes(x.k) }));
  const used = checks.filter(x => x.used), score = used.filter(x => x.pass).length;
  const map = ctx.map || CFG.regimeMap;
  const raw = Math.min(1, CFG.volTarget / ctx.spy.vol20);
  const volMult = CFG.volSteps.find(s => raw >= s) ?? CFG.volSteps[CFG.volSteps.length - 1];
  const signal = used.length ? map[Math.round(score * 5 / used.length)] : 1;
  const cap = signal * volMult;
  return { checks, score, max: used.length, signal, volMult, volRaw: raw, vol20: ctx.spy.vol20, cap, coreW: Math.min(CFG.core, cap), satCap: Math.max(0, cap - CFG.core) };
}

// closes: { XLK: [..] } aligned to the same calendar; i: session index
export function rotationScores(closes, sma200s, i) {
  const { look, skip } = CFG.rot;
  const out = [];
  for (const [k, c] of Object.entries(closes)) {
    const j = i - skip;
    if (j - look[look.length - 1] < 0 || c[j - look[look.length - 1]] == null || c[i] == null) continue;
    const rets = look.map(L => c[j] / c[j - L] - 1);
    out.push({ k, score: rets.reduce((a, b) => a + b, 0) / rets.length, r3: rets[0], r6: rets[1], r12: rets[2], above: sma200s[k][i] != null && c[i] > sma200s[k][i] });
  }
  out.sort((a, b) => b.score - a.score);
  out.forEach((x, r) => { x.rank = r + 1; });
  return out;
}
export function selectRotation(ranked, held) {
  const { top, keep } = CFG.rot;
  const keepers = held.filter(k => { const x = ranked.find(r => r.k === k); return x && x.rank <= keep && x.above; });
  const picks = [...keepers];
  for (const x of ranked) { if (picks.length >= top) break; if (x.above && !picks.includes(x.k)) picks.push(x.k); }
  return picks.slice(0, top);
}

// ---------- performance stats ----------
export function stats(equity, dates) {
  const n = equity.length;
  const years = (new Date(dates[n - 1]) - new Date(dates[0])) / (365.25 * 864e5);
  const rets = equity.map((x, i) => (i ? x / equity[i - 1] - 1 : 0)).slice(1);
  const m = rets.reduce((a, b) => a + b, 0) / rets.length;
  const sd = Math.sqrt(rets.reduce((a, b) => a + (b - m) ** 2, 0) / (rets.length - 1));
  let peak = -Infinity, mdd = 0;
  for (const x of equity) { peak = Math.max(peak, x); mdd = Math.min(mdd, x / peak - 1); }
  return { cagr: (equity[n - 1] / equity[0]) ** (1 / years) - 1, vol: sd * Math.sqrt(252), sharpe: sd ? (m / sd) * Math.sqrt(252) : 0, mdd, total: equity[n - 1] / equity[0] - 1, years };
}
