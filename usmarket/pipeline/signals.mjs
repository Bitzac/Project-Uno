// Turns the snapshot (fetch.mjs) and the ETF/VIX history into today's decision (data.decision) and advances the paper
// portfolio in data/ledger.json. Rules, sizing and the cap model come from lib.mjs and data/backtest.json, so the live
// portfolio trades exactly what was tested. Orders are for the next session's open; fills are booked on the next run.
// Usage: node usmarket/pipeline/signals.mjs [--date YYYY-MM-DD] [--asof YYYY-MM-DD [--replay-from YYYY-MM-DD]]
//   --asof         build the stock table from the cached history (history.mjs --stocks) as of that close
//   --replay-from  start a fresh ledger at that session and replay every session up to --asof (marked as replay)
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { CFG, SECTORS, RULES, CASH, sma, realisedVol, stockFeatures, featureAt, regime } from './lib.mjs';
import { loadEtfs, loadStocks } from './history.mjs';

const at = f => new URL(f, import.meta.url);
const args = process.argv.slice(2);
const opt = k => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const ASOF0 = opt('--asof'), REPLAY = opt('--replay-from');
const DATE = opt('--date') || readdirSync(at('../issues/')).filter(f => /^\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort().pop().slice(0, 10);
const file = at(`../issues/${DATE}.json`);
const issue = JSON.parse(readFileSync(file, 'utf8'));
const TEMPLATE = issue.data;
const BT = JSON.parse(readFileSync(at('../data/backtest.json'), 'utf8'));
const USE = BT.regime.model.use, LIVE = BT.liveKeys;
const r2 = v => (typeof v === 'number' && Number.isFinite(v) ? Math.round(v * 100) / 100 : null);
const r4 = v => (typeof v === 'number' && Number.isFinite(v) ? Math.round(v * 10000) / 10000 : null);
const clone = o => JSON.parse(JSON.stringify(o));

const E = await loadEtfs();
const STK = ASOF0 ? await loadStocks(TEMPLATE.stocks.map(r => r[0])) : null;

async function run(D, ASOF, write, replay) {
const data = clone(TEMPLATE);
if (ASOF) data.next = E.bars.SPY.d.find(x => x > D) || TEMPLATE.session;
// ---------- ETF history up to session D ----------
function barsTo(sym, tv) {
  if (!E.bars[sym]) return null;
  const b = clone(E.bars[sym]);
  let n = b.d.findLastIndex(d => d <= D) + 1;
  for (const k of ['d', 'o', 'h', 'l', 'c', 'v']) b[k] = b[k].slice(0, n);
  if (b.d.at(-1) < D && tv && !ASOF && tv.c != null) { b.d.push(D); b.o.push(tv.o); b.h.push(tv.h); b.l.push(tv.l); b.c.push(tv.c); b.v.push(0); }
  return b;
}
function seriesTo(s, tv) {
  const n = s.d.findLastIndex(d => d <= D) + 1;
  const out = { d: s.d.slice(0, n), c: s.c.slice(0, n) };
  if (out.d.at(-1) < D && tv && !ASOF && tv.c != null) { out.d.push(D); out.c.push(tv.c); }
  return out;
}
const tvE = data.etfs || {};
const spyB = barsTo('SPY', tvE.SPY);
if (spyB.d.at(-1) !== D) throw new Error(`SPY 历史最后一天是 ${spyB.d.at(-1)}，不是交易日 ${D}`);
const etfB = Object.fromEntries(['HYG', 'IEF', ...SECTORS.map(s => s[0])].map(k => [k, barsTo(k, tvE[k])]).filter(([, b]) => b));
const vixS = seriesTo(E.vix, tvE.VIX), vix3mS = seriesTo(E.vix3m, tvE.VIX3M);
const lastOn = (s, d) => s.c[s.d.findLastIndex(x => x <= d)];

function regimeOn(k) { // k = bars back from D (0 = D)
  const i = spyB.c.length - 1 - k, d = spyB.d[i];
  const c = spyB.c.slice(0, i + 1);
  const at200 = (b) => { if (!b) return null; const j = b.d.findLastIndex(x => x <= d); if (j < 199) return null; return b.c[j] > sma(b.c.slice(j - 199, j + 1), 200).at(-1); };
  const hy = etfB.HYG, ie = etfB.IEF;
  const ratio = hy && ie ? hy.d.map((x, j) => hy.c[j] / ie.c[ie.d.indexOf(x)]).slice(0, hy.d.findLastIndex(x => x <= d) + 1) : [NaN];
  return regime({
    spy: { c: c.at(-1), sma20: sma(c, 20).at(-1), sma50: sma(c, 50).at(-1), sma200: sma(c, 200).at(-1), vol20: realisedVol(c, 20).at(-1) },
    sectorsAbove: SECTORS.map(s => at200(etfB[s[0]])).filter(x => x != null),
    vix: lastOn(vixS, d), vix3m: lastOn(vix3mS, d), credit: ratio.at(-1), creditSma50: sma(ratio, 50).at(-1), use: USE,
  });
}
const reg = regimeOn(0), regPrev = regimeOn(1);

// ---------- stock features on session D ----------
const C = Object.fromEntries(data.cols.map((c, i) => [c, i]));
let rows = data.stocks;
if (ASOF) {
  // rebuild the stock table from history so every number belongs to the close of D
  const ST = STK;
  rows = rows.flatMap(r => {
    const b0 = ST.bars[r[C.s]];
    if (!b0) return [];
    const n = b0.d.findLastIndex(d => d <= D) + 1;
    if (n < 2 || b0.d[n - 1] !== D) return [];
    const b = Object.fromEntries(Object.entries(b0).map(([k, a]) => [k, a.slice(0, n)]));
    const F = stockFeatures(b), j = n - 1, f = featureAt(b, F, j);
    const out = r.slice();
    Object.assign(out, { [C.o]: f.o, [C.h]: f.h, [C.l]: f.l, [C.c]: f.c, [C.chg]: r2((f.c / b.c[j - 1] - 1) * 100), [C.pm]: null, [C.pv]: 0,
      [C.w]: r2(f.ret5 * 100), [C.m6]: r2(f.ret126 * 100), [C.rv]: r2(f.rv), [C.s5]: r4(f.sma5), [C.e10]: r4(f.ema10), [C.s50]: r4(f.sma50),
      [C.s200]: r4(f.sma200), [C.atr]: r4(f.atr), [C.rsi7]: r2(f.rsi7), [C.h1m]: r4(f.hi1m), [C.h52]: r4(f.hi52), [C.gap]: r2(f.gap * 100) });
    return [out];
  });
  data.stocks = rows;
}
const m6 = rows.map(r => r[C.m6]).filter(v => typeof v === 'number').sort((a, b) => a - b);
const pct = v => { if (typeof v !== 'number') return null; let lo = 0, hi = m6.length; while (lo < hi) { const mid = (lo + hi) >> 1; if (m6[mid] < v) lo = mid + 1; else hi = mid; } return lo / (m6.length - 1); };
const feat = r => ({
  o: r[C.o], h: r[C.h], l: r[C.l], c: r[C.c], sma5: r[C.s5], ema10: r[C.e10], sma50: r[C.s50], sma200: r[C.s200], atr: r[C.atr],
  rsi7: r[C.rsi7], hi1m: r[C.h1m], hi52: r[C.h52], ret5: r[C.w] / 100, ret126: r[C.m6] / 100, rv: r[C.rv], gap: r[C.gap] / 100, rank6m: pct(r[C.m6]),
});
const BY = Object.fromEntries(rows.map(r => [r[C.s], r]));

// ---------- paper portfolio ----------
const LEDGER = at('../data/ledger.json');
let L = existsSync(LEDGER) ? JSON.parse(readFileSync(LEDGER, 'utf8')) : null;
if (L && L.lastSession === D) L = L.before;                  // re-run on the same session: start again from the saved state
if (L && L.lastSession > D) throw new Error(`ledger 已处理到 ${L.lastSession}，不能回到 ${D}`);
const fresh = !L;
if (!L) L = { start: D, liveFrom: null, equity0: 100000, cash: 100000, spy0: spyB.c.at(-1), positions: [], pending: [], closed: [], curve: [], coreTarget: null, peak: 100000 };
const before = clone(L);
const spyO = spyB.o.at(-1), spyC = spyB.c.at(-1);
const px = (s, k) => (s === 'SPY' ? { o: spyO, c: spyC, l: spyB.l.at(-1) }[k] : BY[s]?.[C[k]] ?? null);
const markOf = p => px(p.s, 'c') ?? p.last ?? p.fill;
const valueAt = k => L.positions.reduce((a, p) => a + p.sh * (k === 'o' ? (px(p.s, 'o') ?? markOf(p)) : markOf(p)), 0);
const log = [];
const book = (p, exitPx, why) => {
  L.cash += p.sh * exitPx * (1 - CFG.cost);
  L.closed.push({ s: p.s, key: p.key, fill: p.fill, fillDate: p.fillDate, exit: r4(exitPx), exitDate: D, r: r4(exitPx / p.fill - 1 - 2 * CFG.cost),
    R: p.stop ? r2((exitPx - p.fill) / (p.fill - p.stop)) : null, why });
  log.push(`卖出 ${p.s} ${p.sh} 股 @ ${exitPx.toFixed(2)}（${why}）`);
};

if (!fresh) {
  const eqPrev = L.cash + L.positions.reduce((a, p) => a + p.sh * (p.last ?? p.fill), 0);
  // 1. sells at the open
  L.positions = L.positions.filter(p => {
    const o = L.pending.find(x => x.act === 'sell' && x.s === p.s);
    if (!o) return true;
    book(p, px(p.s, 'o') ?? markOf(p), o.why);
    return false;
  });
  // 2. core sleeve to its target at the open
  const core = L.pending.find(x => x.act === 'adjust' && x.s === 'SPY');
  if (core) {
    const eqOpen = L.cash + valueAt('o');
    let p = L.positions.find(x => x.s === 'SPY');
    const want = core.w * eqOpen, have = p ? p.sh * spyO : 0, trade = want - have;
    if (Math.abs(trade) > 1) {
      L.cash -= trade + Math.abs(trade) * CFG.cost;
      if (!p) { p = { s: 'SPY', key: 'core', sh: 0, fill: spyO, fillDate: D }; L.positions.push(p); }
      if (trade > 0) p.fill = (p.fill * p.sh + trade) / (p.sh + trade / spyO);
      p.sh = r4(p.sh + trade / spyO);
      if (p.sh <= 1e-6) L.positions = L.positions.filter(x => x !== p);
      log.push(`SPY 调整到 ${(core.w * 100).toFixed(0)}% @ ${spyO.toFixed(2)}`);
    }
    L.coreTarget = core.w;
  }
  // 3. satellite buys at the open
  for (const o of L.pending.filter(x => x.act === 'buy')) {
    const fill = px(o.s, 'o');
    if (fill == null || L.positions.some(p => p.s === o.s)) continue;
    const stop = RULES[o.key].stop(fill, o.f);
    if (!(stop < fill)) { log.push(`放弃 ${o.s}：开盘 ${fill} 已低于止损`); continue; }
    const value = Math.min(eqPrev * CFG.risk / (fill - stop) * fill, CFG.maxPos * eqPrev, o.budget);
    if (value < 0.002 * eqPrev) continue;
    const sh = Math.floor(value / fill);
    if (sh < 1) continue;
    L.cash -= sh * fill * (1 + CFG.cost);
    L.positions.push({ s: o.s, key: o.key, g: o.g, sh, fill: r4(fill), fillDate: D, stop: r4(stop), maxClose: -Infinity, bars: 0, fresh: true });
    log.push(`买入 ${o.s} ${sh} 股 @ ${fill.toFixed(2)}，止损 ${stop.toFixed(2)}`);
  }
  // 4. stops during the session, 5. rule exits at the close
  L.positions = L.positions.filter(p => {
    if (p.key === 'core') return true;
    const o = px(p.s, 'o'), l = px(p.s, 'l'), c = px(p.s, 'c');
    if (c == null) return true;
    if (!p.fresh && o <= p.stop) { book(p, o, '跳空跌破止损'); return false; }
    if (l <= p.stop) { book(p, p.stop, '盘中触及止损'); return false; }
    p.fresh = false; p.bars++; p.maxClose = Math.max(p.maxClose, c);
    return true;
  });
}
for (const p of L.positions) p.last = markOf(p);
const eq = L.cash + L.positions.reduce((a, p) => a + p.sh * p.last, 0);
L.peak = Math.max(L.peak, eq);
L.curve = L.curve.filter(x => x[0] < D);
L.curve.push([D, r2(eq), r2(L.equity0 * spyC / L.spy0), replay ? 1 : 0]);
if (!replay && !L.liveFrom) L.liveFrom = D;

// ---------- orders for the next session ----------
const orders = [];
const name = s => BY[s]?.[C.n] ?? s;
// satellite exits by rule
for (const p of L.positions.filter(p => p.key !== 'core')) {
  const r = BY[p.s];
  if (!r) continue;
  const f = feat(r);
  p.atrNow = f.atr;
  if (RULES[p.key].exit(f, p)) orders.push({ act: 'sell', s: p.s, key: p.key, sh: p.sh, px: p.last, w: p.sh * p.last / eq, why: RULES[p.key].exitText(p).replace(/^/, '规则卖出：') });
}
// the cap fell below what the satellite holds: sell the weakest first
let satVal = L.positions.filter(p => p.key !== 'core' && !orders.some(o => o.s === p.s)).reduce((a, p) => a + p.sh * p.last, 0);
const satLimit = reg.satCap * eq;
for (const p of L.positions.filter(p => p.key !== 'core' && !orders.some(o => o.s === p.s)).sort((a, b) => a.last / a.fill - b.last / b.fill)) {
  if (satVal <= satLimit * 1.1) break;
  orders.push({ act: 'sell', s: p.s, key: p.key, sh: p.sh, px: p.last, w: p.sh * p.last / eq, why: `仓位上限降到 ${(reg.cap * 100).toFixed(0)}%，卫星仓先减` });
  satVal -= p.sh * p.last;
}
// core sleeve target
if (L.coreTarget !== reg.coreW) {
  const have = (L.positions.find(p => p.s === 'SPY')?.sh || 0) * spyC / eq;
  orders.push({ act: 'adjust', s: 'SPY', key: 'core', w: reg.coreW, from: r4(have), px: spyC,
    sh: Math.round((reg.coreW * eq) / spyC), why: `核心仓 = min(60%, 仓位上限 ${(reg.cap * 100).toFixed(0)}%)` });
}
// satellite entries
const events = (data.econ || []).filter(e => e.t.slice(0, 10) >= (data.next || D));
const soon = d => d && d >= D && (new Date(d) - new Date(D)) / 864e5 <= 7;
const held = new Set(L.positions.map(p => p.s));
const candidates = [];
for (const key of LIVE) {
  for (const r of rows) {
    const f = feat(r);
    if (!RULES[key].entry(f)) continue;
    candidates.push({ s: r[C.s], key, g: r[C.g], f, rank: RULES[key].rank(f), c: f.c, atr: f.atr, estStop: r4(RULES[key].stop(f.c, f)), en: r[C.en], pm: r[C.pm] });
  }
}
candidates.sort((a, b) => b.rank - a.rank);
let budget = Math.max(0, satLimit - satVal), slots = CFG.maxSat - L.positions.filter(p => p.key !== 'core').length + orders.filter(o => o.act === 'sell' && o.key !== 'core').length;
const perSector = g => L.positions.filter(p => p.g === g && !orders.some(o => o.s === p.s)).length + orders.filter(o => o.act === 'buy' && o.g === g).length;
for (const c of candidates) {
  c.flags = [];
  if (held.has(c.s)) { c.status = 'held'; c.reason = '已持有'; continue; }
  if (soon(c.en)) c.flags.push(`${c.en.slice(5).replace('-', '/')} 发财报`);
  if (reg.satCap <= 0) { c.status = 'skip'; c.reason = `仓位上限 ${(reg.cap * 100).toFixed(0)}%，卫星仓关闭`; continue; }
  if (soon(c.en)) { c.status = 'skip'; c.reason = '5 个交易日内发财报，不开新仓'; continue; }
  if (slots <= 0) { c.status = 'skip'; c.reason = `已满 ${CFG.maxSat} 只`; continue; }
  if (perSector(c.g) >= CFG.maxPerSector) { c.status = 'skip'; c.reason = '同板块已有 2 只'; continue; }
  const stopDist = c.c - c.estStop;
  const value = Math.min(eq * CFG.risk / stopDist * c.c, CFG.maxPos * eq, budget);
  if (value < 0.002 * eq) { c.status = 'skip'; c.reason = '卫星仓预算已用完'; continue; }
  c.status = 'order';
  budget -= value; slots--;
  orders.push({ act: 'buy', s: c.s, key: c.key, g: c.g, sh: Math.floor(value / c.c), px: c.c, w: value / eq, stop: c.estStop, risk: (Math.floor(value / c.c) * stopDist) / eq,
    budget: value * 1.05, f: { atr: c.f.atr, l: c.f.l }, why: RULES[c.key].name, exit: RULES[c.key].exitText({ maxClose: c.c, atrNow: c.atr }) });
}
L.pending = orders.map(o => ({ act: o.act, s: o.s, key: o.key, g: o.g, w: o.w, why: o.why, f: o.f, budget: o.budget }));
L.lastSession = D;
L.before = before;
delete L.before.before;
writeFileSync(LEDGER, JSON.stringify(L) + '\n');
if (!write) return { D, eq, log, orders };

// ---------- decision for the page ----------
const closed = L.closed;
const wins = closed.filter(t => t.r > 0).length;
const dd = eq / L.peak - 1;
const etfTable = Object.fromEntries(Object.entries(tvE).map(([k, v]) => [k, { c: v.c, chg: v.chg, pm: v.pm, atr: v.atr, s50: v.s50, s200: v.s200, h1m: v.h1m }]));
data.decision = {
  session: D, next: data.next, asof: !!ASOF,
  model: BT.regime.model, live: LIVE,
  regime: { ...reg, prevCap: regPrev.cap, checks: reg.checks.map(x => ({ ...x, v: r4(x.v) })), vol20: r4(reg.vol20), volRaw: r4(reg.volRaw), spy: r2(spyC), vix: lastOn(vixS, D), vix3m: lastOn(vix3mS, D) },
  orders: orders.map(o => ({ ...o, f: undefined, budget: undefined, px: r2(o.px), w: r4(o.w), risk: r4(o.risk), name: name(o.s) })),
  positions: L.positions.map(p => ({ s: p.s, key: p.key, sh: p.sh, fill: r2(p.fill), fillDate: p.fillDate, c: r2(p.last), w: r4(p.sh * p.last / eq),
    pnl: r4(p.last / p.fill - 1), stop: r2(p.stop), trail: p.key === 's3' && p.atrNow ? r2(p.maxClose - CFG.s3.trailAtr * p.atrNow) : null, bars: p.bars })),
  candidates: candidates.map(c => ({ s: c.s, key: c.key, c: r2(c.c), stop: c.estStop, status: c.status, reason: c.reason || '', flags: c.flags, pm: c.pm, m6: r2(c.f.ret126 * 100), rv: r2(c.f.rv) })),
  ledger: { start: L.start, liveFrom: L.liveFrom, equity0: L.equity0, eq: r2(eq), ret: r4(eq / L.equity0 - 1), spyRet: r4(spyC / L.spy0 - 1), dd: r4(dd), cash: r2(L.cash),
    trades: closed.length, win: closed.length ? r4(wins / closed.length) : null, recent: closed.slice(-8).reverse(), log },
  curve: L.curve,
  etfs: etfTable,
  events,
};

// edit skeleton: a catalyst line for every stock that has an order or is a candidate
const edit = issue.edit || {};
const TODO = 'TODO';
edit.no ??= TODO; edit.edited ??= TODO;
edit.cover ??= { title: TODO, dek: TODO, points: [TODO, TODO, TODO] };
edit.notes ??= {};
const need = [...new Set([...orders.filter(o => o.s !== 'SPY').map(o => o.s), ...candidates.map(c => c.s)])];
for (const s of need) edit.notes[s] ??= { why: TODO, src: [] };
for (const s of Object.keys(edit.notes)) if (!need.includes(s) && edit.notes[s].why === TODO) delete edit.notes[s];
for (const k of ['sectors', 'movers', 'news']) delete edit[k];
issue.edit = edit;
issue.data = data;
const pretty = JSON.stringify(issue, null, 1).replace(/\[\n\s*([^\[\]{}]*?)\n\s*\]/g, (m, inner) => '[' + inner.replace(/,\n\s*/g, ',') + ']');
writeFileSync(file, pretty + '\n');
return { D, eq, log, orders, reg, regPrev, L, candidates, need, spyC };
}

if (REPLAY) {
  if (!ASOF0) throw new Error('--replay-from 需要同时给 --asof');
  const { existsSync: ex, unlinkSync } = await import('node:fs');
  if (ex(at('../data/ledger.json'))) unlinkSync(at('../data/ledger.json'));
  for (const d of E.bars.SPY.d.filter(d => d >= REPLAY && d < ASOF0)) {
    const r = await run(d, d, false, true);
    for (const l of r.log) console.log(`  回放 ${d} ${l}`);
  }
}
const { D, eq, log, orders, reg, regPrev, L, candidates, need, spyC } = await run(ASOF0 || TEMPLATE.session, ASOF0, true, !!ASOF0);
const closed = L.closed;
const p = x => (x * 100).toFixed(1) + '%';
console.log(`交易日 ${D}${ASOF0 ? '（历史重建）' : ''} · 仓位上限 ${p(reg.cap)}（前一日 ${p(regPrev.cap)}）· 20 日波动 ${p(reg.vol20)} · 核心 ${p(reg.coreW)} · 卫星 ${p(reg.satCap)}`);
console.log(`模拟组合 ${L.start} 起 · 净值 ${eq.toFixed(0)}（${p(eq / L.equity0 - 1)}，SPY ${p(spyC / L.spy0 - 1)}）· 持仓 ${L.positions.length} · 已平仓 ${closed.length}`);
for (const l of log) console.log('  成交 ' + l);
for (const o of orders) console.log(`  指令 ${o.act} ${o.s} ${o.sh ?? ''} ${o.w != null ? p(o.w) : ''} ${o.stop ? '止损 ' + o.stop : ''} ${o.why}`);
console.log(`  候选 ${candidates.map(c => `${c.s}(${c.status}${c.reason ? ':' + c.reason : ''})`).join(' ') || '无'}`);
console.log(`  待写 edit.notes: ${need.join(', ') || '无'}`);
