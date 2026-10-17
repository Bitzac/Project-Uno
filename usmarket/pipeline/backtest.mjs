// Backtests every rule in lib.mjs on the cached history and writes data/backtest.json (stats, curves, and which rules go live).
// Execution model: signals at the close of day i, orders filled at the open of day i+1; cost CFG.cost per side;
// prices exclude dividends and cash earns 0, for strategies and benchmarks alike.
// Usage: node usmarket/pipeline/history.mjs --stocks && node usmarket/pipeline/backtest.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { CFG, SECTORS, RULES, CHECK_KEYS, sma, realisedVol, stockFeatures, featureAt, regime, rotationScores, selectRotation, stats } from './lib.mjs';
import { loadEtfs, loadStocks } from './history.mjs';

const t0 = Date.now();
const E = await loadEtfs();
const D = E.bars.SPY.d, N = D.length;
const idx = Object.fromEntries(D.map((d, i) => [d, i]));
const alignArr = (dates, arr) => { const out = new Array(N).fill(null); dates.forEach((d, j) => { const i = idx[d]; if (i != null) out[i] = arr[j]; }); return out; };
const etf = {};
for (const [k, b] of Object.entries(E.bars)) {
  etf[k] = { o: alignArr(b.d, b.o), c: alignArr(b.d, b.c), sma200: alignArr(b.d, sma(b.c, 200)) };
}
const spyB = E.bars.SPY;
const spy = { c: spyB.c, sma20: sma(spyB.c, 20), sma50: sma(spyB.c, 50), sma200: sma(spyB.c, 200), vol20: realisedVol(spyB.c, 20) };
const ffill = s => { const m = Object.fromEntries(s.d.map((d, j) => [d, s.c[j]])); let last = null; return D.map(d => (last = m[d] ?? last)); };
const vix = ffill(E.vix), vix3m = ffill(E.vix3m);
const credit = D.map((_, i) => etf.HYG.c[i] / etf.IEF.c[i]);
const creditSma = sma(credit, 50);
const SECT = SECTORS.map(s => s[0]);

function regimeAt(i, use = CHECK_KEYS) {
  return regime({
    spy: { c: spy.c[i], sma20: spy.sma20[i], sma50: spy.sma50[i], sma200: spy.sma200[i], vol20: spy.vol20[i] },
    sectorsAbove: SECT.filter(k => etf[k].sma200[i] != null).map(k => etf[k].c[i] > etf[k].sma200[i]),
    vix: vix[i], vix3m: vix3m[i], credit: credit[i], creditSma50: creditSma[i], use,
  });
}
const S0 = CFG.rot.skip + CFG.rot.look.at(-1) + 1; // first session with every input
const monthEnd = i => i + 1 < N && D[i + 1].slice(0, 7) !== D[i].slice(0, 7);

// ---------- weight-based simulator for ETF portfolios ----------
function simWeights(targetAt) {
  let cash = 1;
  const pos = {}, eq = [1];
  let turnover = 0;
  for (let i = S0; i < N - 1; i++) {
    const j = i + 1, tgt = targetAt(i);
    for (const k in pos) pos[k] *= etf[k].o[j] / etf[k].c[i];
    const eqOpen = cash + Object.values(pos).reduce((a, b) => a + b, 0);
    if (tgt) {
      for (const k of new Set([...Object.keys(pos), ...Object.keys(tgt)])) {
        const want = (tgt[k] || 0) * eqOpen, trade = want - (pos[k] || 0);
        if (Math.abs(trade) < 1e-9) continue;
        turnover += Math.abs(trade);
        cash -= trade + Math.abs(trade) * CFG.cost;
        if (want > 0) pos[k] = want; else delete pos[k];
      }
    }
    for (const k in pos) pos[k] *= etf[k].c[j] / etf[k].o[j];
    eq.push(cash + Object.values(pos).reduce((a, b) => a + b, 0));
  }
  return { eq, turnover: turnover / ((N - 1 - S0) / 252) };
}
const dates = D.slice(S0);
const withStats = r => ({ ...stats(r.eq, dates), turnover: r.turnover });

// benchmarks
const bhSpy = simWeights(i => (i === S0 ? { SPY: 1 } : null));
const ewSect = simWeights(i => {
  if (i !== S0 && !monthEnd(i)) return null;
  const av = SECT.filter(k => etf[k].c[i] != null);
  return Object.fromEntries(av.map(k => [k, 1 / av.length]));
});

// ---------- regime: candidate models, leave-one-out, single indicators ----------
const KEYS = CHECK_KEYS;
function regimeSim(use) {
  let last = null;
  return simWeights(i => { const cap = regimeAt(i, use).cap; if (cap === last) return null; last = cap; return { SPY: cap }; });
}
function singleSim(k) {
  let last = null;
  return simWeights(i => {
    const w = regimeAt(i).checks.find(x => x.k === k).pass ? 1 : 0;
    if (w === last) return null; last = w; return { SPY: w };
  });
}
const H = Math.floor(dates.length / 2);
const halves = eq => [stats(eq.slice(0, H + 1), dates.slice(0, H + 1)), stats(eq.slice(H), dates.slice(H))];
const fullRun = regimeSim(KEYS), full = withStats(fullRun);
const loo = Object.fromEntries(KEYS.map(k => [k, withStats(regimeSim(KEYS.filter(x => x !== k)))]));
const single = Object.fromEntries(KEYS.map(k => [k, withStats(singleSim(k))]));
// leave-one-out reduction: drop every indicator whose removal neither lowers Sharpe nor deepens the max drawdown by 2 points
const reducedUse = KEYS.filter(k => full.sharpe >= loo[k].sharpe || full.mdd - loo[k].mdd >= 0.02);
// Candidate cap models. The live one is the model with the best worse-half Sharpe (robust to one lucky period);
// ties go to the model with fewer inputs.
const MODELS = [
  { id: 'full', n: '5 项信号 × 波动率目标', use: KEYS },
  { id: 'reduced', n: `${reducedUse.length} 项信号（逐项剔除后）× 波动率目标`, use: reducedUse },
  { id: 'trend', n: '200 日均线 × 波动率目标', use: ['trend'] },
  { id: 'vol', n: '仅波动率目标', use: [] },
].filter((m, i, a) => a.findIndex(x => x.use.join() === m.use.join()) === i);
for (const m of MODELS) {
  m.run = regimeSim(m.use);
  m.stats = withStats(m.run);
  m.halves = halves(m.run.eq);
  m.robust = Math.min(m.halves[0].sharpe, m.halves[1].sharpe);
}
const chosen = MODELS.slice().sort((a, b) => b.robust - a.robust || a.use.length - b.use.length)[0];
const finalRun = chosen.run, final = chosen.stats;
const capAt = D.map((_, i) => (i >= S0 ? regimeAt(i, chosen.use) : null));
const timeIn = capAt.slice(S0).reduce((a, r) => a + r.cap, 0) / (N - S0);

// ---------- rotation and core ----------
const closes = Object.fromEntries(SECT.map(k => [k, etf[k].c]));
const sma200s = Object.fromEntries(SECT.map(k => [k, etf[k].sma200]));
function rotationSim(scaleByCap) {
  let held = [], lastCap = null;
  return simWeights(i => {
    const cap = capAt[i].coreW / CFG.core;
    const rebal = i === S0 || monthEnd(i);
    if (rebal) held = selectRotation(rotationScores(closes, sma200s, i), held);
    const w = scaleByCap ? cap : 1;
    if (!rebal && w === lastCap) return null;
    lastCap = w;
    return Object.fromEntries(held.map(k => [k, w / CFG.rot.top]));
  });
}
const rot = rotationSim(false);
const coreRot = rotationSim(true);
let lastCore = null;
const coreSpy = simWeights(i => { const w = capAt[i].coreW / CFG.core; if (w === lastCore) return null; lastCore = w; return { SPY: w }; });

// ---------- stocks ----------
const list = JSON.parse(readFileSync(new URL('../data/sp500.json', import.meta.url), 'utf8')).rows;
const secOf = Object.fromEntries(list.map(r => [r[0], SECTORS.findIndex(s => s[2] === r[2])]));
const ST = await loadStocks(list.map(r => r[0]));
const stocks = Object.entries(ST.bars).map(([s, b]) => {
  const F = stockFeatures(b);
  const loc = new Int32Array(N).fill(-1);
  b.d.forEach((d, j) => { const i = idx[d]; if (i != null) loc[i] = j; });
  return { s, b, F, loc, g: secOf[s] };
});
// cross-sectional percentile of 6-month return, per session
const rank6 = new Map(stocks.map(x => [x.s, new Float32Array(N).fill(NaN)]));
for (let i = S0 - 1; i < N; i++) {
  const v = [];
  for (const x of stocks) { const j = x.loc[i]; if (j >= 0 && x.F.ret126[j] != null) v.push([x.s, x.F.ret126[j]]); }
  v.sort((a, b) => a[1] - b[1]);
  v.forEach(([s], r) => { rank6.get(s)[i] = r / (v.length - 1); });
}
const feat = (x, i) => { const j = x.loc[i]; if (j < 0) return null; const f = featureAt(x.b, x.F, j); f.rank6m = rank6.get(x.s)[i]; return f; };
const satOn = i => capAt[i].satCap > 0;

function tradeStats(key, filter) {
  const rule = RULES[key], trades = [];
  for (const x of stocks) {
    const { b } = x;
    for (let i = S0; i < N - 1; i++) {
      const t = x.loc[i];
      if (t < 0 || t + 1 >= b.c.length) continue;
      const f = feat(x, i);
      if (!rule.entry(f) || (filter && !filter(i))) continue;
      const fill = b.o[t + 1], stop = rule.stop(fill, f);
      if (!(stop < fill)) continue;
      const pos = { maxClose: -Infinity, bars: 0 };
      let px = null, u = t + 1;
      for (; u < b.c.length; u++) {
        if (u > t + 1 && b.o[u] <= stop) { px = b.o[u]; break; }
        if (b.l[u] <= stop) { px = stop; break; }
        pos.bars++; pos.maxClose = Math.max(pos.maxClose, b.c[u]);
        if (rule.exit(featureAt(b, x.F, u), pos)) { u++; px = u < b.c.length ? b.o[u] : b.c[u - 1]; break; }
      }
      if (px == null) { u = b.c.length - 1; px = b.c[u]; }
      trades.push({ r: px / fill - 1 - 2 * CFG.cost, R: (px - fill) / (fill - stop), hold: u - t - 1 });
      while (i < N - 1 && x.loc[i] < u) i++;
    }
  }
  const win = trades.filter(t => t.r > 0), loss = trades.filter(t => t.r <= 0);
  const avg = a => (a.length ? a.reduce((s, t) => s + t.r, 0) / a.length : 0);
  return {
    n: trades.length, win: win.length / (trades.length || 1), avgWin: avg(win), avgLoss: avg(loss),
    payoff: loss.length && avg(loss) ? avg(win) / -avg(loss) : null, exp: avg(trades),
    expR: trades.length ? trades.reduce((s, t) => s + t.R, 0) / trades.length : 0,
    hold: trades.length ? trades.reduce((s, t) => s + t.hold, 0) / trades.length : 0,
  };
}

// Satellite sleeve as its own account: risk and caps scaled by 1/0.4 so it matches 0.5% / 10% of the whole portfolio.
function sleeveSim(keys) {
  const scale = 1 / (1 - CFG.core);
  const bySym = Object.fromEntries(stocks.map(x => [x.s, x]));
  let cash = 1, positions = [], pending = [];
  const eq = [1];
  const px = (x, i, k) => { const j = x.loc[i]; return j < 0 ? null : x.b[k][j]; };
  const lastClose = (p, i) => { for (let q = i; q >= S0; q--) { const v = px(bySym[p.s], q, 'c'); if (v != null) return v; } return p.fill; };
  const value = i => positions.reduce((a, p) => a + p.sh * lastClose(p, i), 0);
  for (let i = S0; i < N - 1; i++) {
    const j = i + 1, eqPrev = cash + value(i);
    // exits decided at yesterday's close fill at today's open
    positions = positions.filter(p => {
      if (!p.exit) return true;
      const o = px(bySym[p.s], j, 'o') ?? lastClose(p, i);
      cash += p.sh * o * (1 - CFG.cost);
      return false;
    });
    // entries
    let invested = value(i);
    const limit = (capAt[i].satCap * scale) * eqPrev;
    for (const c of pending) {
      if (positions.length >= CFG.maxSat) break;
      if (positions.some(p => p.s === c.s) || positions.filter(p => p.g === c.g).length >= CFG.maxPerSector) continue;
      const x = bySym[c.s], fill = px(x, j, 'o');
      if (fill == null) continue;
      const stop = RULES[c.key].stop(fill, c.f);
      if (!(stop < fill)) continue;
      let val = Math.min((eqPrev * CFG.risk * scale) / (fill - stop) * fill, CFG.maxPos * scale * eqPrev, limit - invested);
      if (val < 0.002 * eqPrev) continue;
      cash -= val * (1 + CFG.cost);
      invested += val;
      positions.push({ s: c.s, g: c.g, key: c.key, sh: val / fill, fill, stop, maxClose: -Infinity, bars: 0, fresh: true });
    }
    // stops during the session, rule exits at the close
    positions = positions.filter(p => {
      const x = bySym[p.s], o = px(x, j, 'o'), l = px(x, j, 'l'), c = px(x, j, 'c');
      if (c == null) return true;
      if (!p.fresh && o <= p.stop) { cash += p.sh * o * (1 - CFG.cost); return false; }
      if (l <= p.stop) { cash += p.sh * p.stop * (1 - CFG.cost); return false; }
      p.fresh = false; p.bars++; p.maxClose = Math.max(p.maxClose, c);
      if (RULES[p.key].exit(featureAt(x.b, x.F, x.loc[j]), p)) p.exit = true;
      return true;
    });
    // the cap fell: exit the weakest positions until back under it
    const lim = capAt[j] ? capAt[j].satCap * scale * (cash + value(j)) : 0;
    const live = positions.filter(p => !p.exit).sort((a, b) => lastClose(a, j) / a.fill - lastClose(b, j) / b.fill);
    let inv = live.reduce((a, p) => a + p.sh * lastClose(p, j), 0);
    for (const p of live) { if (inv <= lim * 1.1) break; p.exit = true; inv -= p.sh * lastClose(p, j); }
    eq.push(cash + value(j));
    // tomorrow's entries from today's signals
    pending = [];
    if (capAt[j] && capAt[j].satCap > 0) {
      for (const key of keys) {
        const c = [];
        for (const x of stocks) { const f = feat(x, j); if (f && RULES[key].entry(f)) c.push({ s: x.s, g: x.g, key, f, rk: RULES[key].rank(f) }); }
        c.sort((a, b) => b.rk - a.rk);
        pending.push(...c);
      }
    }
  }
  return { eq, turnover: 0 };
}
// equal-weight universe, rebalanced daily (same survivorship bias as the stock rules)
const ewU = [1];
for (let i = S0 + 1; i < N; i++) {
  let s = 0, n = 0;
  for (const x of stocks) { const a = x.loc[i - 1], b2 = x.loc[i]; if (a >= 0 && b2 >= 0) { s += x.b.c[b2] / x.b.c[a] - 1; n++; } }
  ewU.push(ewU.at(-1) * (1 + s / n));
}

const strat = {};
for (const key of ['s3', 's4', 's5']) {
  const sl = sleeveSim([key]);
  strat[key] = { name: RULES[key].name, all: tradeStats(key), filtered: tradeStats(key, satOn), sleeve: withStats(sl) };
}

// ---------- gate ----------
const beats = (s, b) => s.sharpe > b.sharpe || (s.mdd - b.mdd >= 0.05 && s.cagr >= 0.5 * b.cagr);
const bench = { SPY: withStats(bhSpy), EW_SECT: withStats(ewSect), EW_UNIV: stats(ewU, dates) };
const liveRegime = beats(final, bench.SPY);
// rotation must beat SPY and also beat the simpler core it would replace (SPY under the same cap)
const liveRot = beats(withStats(rot), bench.SPY) && withStats(coreRot).sharpe > withStats(coreSpy).sharpe;
const core = liveRot ? coreRot : coreSpy;
const liveCore = beats(withStats(core), bench.SPY);
// A stock rule qualifies if it has positive expectancy after costs and its sleeve beats the equal-weight universe.
// Qualifying rules are then added best-first, and each one stays only if it raises the combined sleeve's Sharpe.
for (const k in strat) strat[k].qualifies = strat[k].filtered.exp > 0 && strat[k].filtered.expR > 0 && beats(strat[k].sleeve, bench.EW_UNIV);
const liveKeys = [];
let sat = { eq: dates.map(() => 1) }, satStats = null;
for (const k of Object.keys(strat).filter(k => strat[k].qualifies).sort((a, b) => strat[b].sleeve.sharpe - strat[a].sleeve.sharpe)) {
  const trial = liveKeys.length ? sleeveSim([...liveKeys, k]) : null;
  const ts = trial ? stats(trial.eq, dates) : strat[k].sleeve;
  if (!satStats || ts.sharpe > satStats.sharpe) { liveKeys.push(k); sat = trial || sleeveSim([k]); satStats = ts; strat[k].addSharpe = ts.sharpe; }
}
for (const k in strat) strat[k].live = liveKeys.includes(k);
const total = [1];
for (let i = 1; i < dates.length; i++) {
  total.push(total[i - 1] * (1 + CFG.core * (core.eq[i] / core.eq[i - 1] - 1) + (1 - CFG.core) * (sat.eq[i] / sat.eq[i - 1] - 1)));
}

const step = 5, pick = a => a.filter((_, i) => i % step === 0 || i === a.length - 1).map(x => Math.round(x * 10000) / 10000);
const out = {
  built: new Date().toISOString(), window: [dates[0], dates.at(-1)], cost: CFG.cost, universe: stocks.length, failed: ST.failed,
  bench,
  regime: {
    model: { id: chosen.id, n: chosen.n, use: chosen.use }, final, timeIn, live: liveRegime, loo, single,
    models: MODELS.map(m => ({ id: m.id, n: m.n, use: m.use, stats: m.stats, halves: m.halves, robust: m.robust })),
    split: dates[H], spyHalves: halves(bhSpy.eq),
  },
  rotation: { ...withStats(rot), core: withStats(coreRot), live: liveRot },
  core: { ...withStats(core), kind: liveRot ? 'rotation' : 'spy', live: liveCore },
  strat, liveKeys,
  sat: stats(sat.eq, dates), total: stats(total, dates),
  curves: { d: dates.filter((_, i) => i % step === 0 || i === dates.length - 1), spy: pick(bhSpy.eq), regime: pick(finalRun.eq), core: pick(core.eq), sat: pick(sat.eq), total: pick(total), ew: pick(ewU) },
};
writeFileSync(new URL('../data/backtest.json', import.meta.url), JSON.stringify(out) + '\n');

const p = x => (x * 100).toFixed(1) + '%';
const line = (n, s) => console.log(`${n.padEnd(22)} CAGR ${p(s.cagr).padStart(6)}  vol ${p(s.vol).padStart(6)}  Sharpe ${s.sharpe.toFixed(2)}  MaxDD ${p(s.mdd).padStart(7)}${s.turnover != null ? '  换手 ' + s.turnover.toFixed(1) + '×/年' : ''}`);
console.log(`窗口 ${dates[0]} → ${dates.at(-1)} · 个股 ${stocks.length} 只`);
line('SPY 买入持有', bench.SPY); line('板块等权', bench.EW_SECT); line('个股等权(幸存者)', bench.EW_UNIV);
line('总闸 × SPY (全部5项)', full);
for (const k of KEYS) line(`  去掉 ${k}`, loo[k]);
for (const k of KEYS) line(`  只用 ${k}`, single[k]);
console.log(`分段点 ${dates[H]} · SPY 前半 Sharpe ${halves(bhSpy.eq)[0].sharpe.toFixed(2)} 后半 ${halves(bhSpy.eq)[1].sharpe.toFixed(2)}`);
for (const m of MODELS) { line(`模型 ${m.id}`, m.stats); console.log(`    输入 ${m.use.join('+') || '无'} · 前半 Sharpe ${m.halves[0].sharpe.toFixed(2)} MaxDD ${p(m.halves[0].mdd)} | 后半 Sharpe ${m.halves[1].sharpe.toFixed(2)} MaxDD ${p(m.halves[1].mdd)}`); }
console.log(`选用：${chosen.id}（${chosen.n}）· 平均仓位 ${p(timeIn)}`);
line('总闸(最终)', final); line('板块轮动', withStats(rot)); line('核心=轮动×总闸', withStats(coreRot)); line('核心=SPY×总闸', withStats(coreSpy));
for (const k in strat) {
  const s = strat[k];
  console.log(`${k} ${s.name}${s.live ? ' [上线]' : s.qualifies ? ' [合格未加入]' : ' [观察]'} 全部 n=${s.all.n} 胜率 ${p(s.all.win)} 期望 ${p(s.all.exp)} ${s.all.expR.toFixed(2)}R | 总闸过滤 n=${s.filtered.n} 胜率 ${p(s.filtered.win)} 期望 ${p(s.filtered.exp)} ${s.filtered.expR.toFixed(2)}R 盈亏比 ${s.filtered.payoff?.toFixed(2)} 持有 ${s.filtered.hold.toFixed(1)} 天`);
  line(`  ${k} 卫星仓`, s.sleeve);
}
console.log(`上线：总闸 ${liveRegime} · 轮动 ${liveRot} · 核心(${liveRot ? '轮动' : 'SPY'}) ${liveCore} · 个股 ${liveKeys.join(',') || '无'}`);
line('卫星仓(上线策略)', out.sat); line('组合 60/40', out.total); line('对照：总闸×SPY 100%', final);
console.log(`${((Date.now() - t0) / 1000).toFixed(0)} 秒`);
