// Pulls the morning snapshot and writes it into issues/<date>.json as `data`, keeping any `edit` already there.
//   S&P 500 constituents + GICS sectors ......... Wikipedia (cached in data/sp500.json)
//   quotes, pre-market, perf, SMA, 52w range ..... TradingView scanner (15-minute delayed)
//   session (previous / next trade date) ........ Nasdaq market-info
//   earnings calendar and results ............... Nasdaq earnings calendar
//   US economic calendar ........................ TradingView economic calendar
// Usage: node usmarket/pipeline/fetch.mjs [--date YYYY-MM-DD] [--force]
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const at = f => new URL(f, import.meta.url);
const args = process.argv.slice(2);
const opt = k => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const FORCE = args.includes('--force');
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

const laDate = (d = new Date()) => d.toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
const DATE = opt('--date') || laDate();
const WEEKDAY = new Date(DATE + 'T12:00:00Z').getUTCDay(); // 0 Sun … 6 Sat
const r2 = v => (typeof v === 'number' && Number.isFinite(v) ? Math.round(v * 100) / 100 : null);
const r1 = v => (typeof v === 'number' && Number.isFinite(v) ? Math.round(v * 10) / 10 : null);
const warn = [];

async function get(url, { json = true, body, headers = {}, tries = 3 } = {}) {
  let last;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, {
        method: body ? 'POST' : 'GET',
        headers: { 'user-agent': UA, accept: json ? 'application/json' : 'text/html', ...(body ? { 'content-type': 'application/json' } : {}), ...headers },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(45000),
      });
      if (!res.ok) throw new Error(`${res.status} ${url}`);
      return json ? await res.json() : await res.text();
    } catch (e) {
      last = e;
      await new Promise(r => setTimeout(r, 2000 * 2 ** i));
    }
  }
  throw last;
}

// ---------- constituents ----------
const SECTORS = [
  ['Information Technology', 'XLK', '信息技术'],
  ['Communication Services', 'XLC', '通信服务'],
  ['Consumer Discretionary', 'XLY', '可选消费'],
  ['Consumer Staples', 'XLP', '必需消费'],
  ['Health Care', 'XLV', '医疗保健'],
  ['Financials', 'XLF', '金融'],
  ['Industrials', 'XLI', '工业'],
  ['Energy', 'XLE', '能源'],
  ['Materials', 'XLB', '原材料'],
  ['Utilities', 'XLU', '公用事业'],
  ['Real Estate', 'XLRE', '房地产'],
];
const SECTOR_IDX = Object.fromEntries(SECTORS.map((s, i) => [s[0], i]));

const strip = h => h.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&#39;|&#039;/g, "'").replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ').trim();
async function constituents() {
  const cache = at('../data/sp500.json');
  try {
    const html = await get('https://en.wikipedia.org/wiki/List_of_S%26P_500_companies', { json: false });
    const start = html.indexOf('id="constituents"');
    const table = html.slice(start, html.indexOf('</table>', start));
    const rows = [];
    for (const tr of table.split(/<tr[\s>]/).slice(1)) {
      const td = [...tr.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(m => strip(m[1]));
      if (td.length >= 4 && /^[A-Z.]{1,6}$/.test(td[0]) && td[2] in SECTOR_IDX) rows.push([td[0], td[1], td[2], td[3]]);
    }
    if (rows.length < 495 || rows.length > 510) throw new Error(`parsed ${rows.length} rows`);
    writeFileSync(cache, JSON.stringify({ asof: new Date().toISOString().slice(0, 10), src: 'https://en.wikipedia.org/wiki/List_of_S%26P_500_companies', rows }) + '\n');
    return rows;
  } catch (e) {
    if (!existsSync(cache)) throw new Error('S&P 500 list unavailable and no cache: ' + e.message);
    const c = JSON.parse(readFileSync(cache, 'utf8'));
    warn.push(`成分股名单取自 ${c.asof} 的缓存（Wikipedia 抓取失败：${e.message}）`);
    return c.rows;
  }
}

// ---------- TradingView ----------
const TV_STOCK_COLS = ['name', 'exchange', 'close', 'change', 'high', 'low', 'premarket_change', 'premarket_close', 'premarket_volume',
  'volume', 'relative_volume_10d_calc', 'market_cap_basic', 'Perf.W', 'Perf.1M', 'Perf.YTD',
  'price_52_week_high', 'price_52_week_low', 'SMA50', 'SMA200', 'earnings_release_date', 'earnings_release_next_date'];
const PRIMARY = ['NASDAQ', 'NYSE', 'AMEX', 'CBOE', 'NYSE ARCA', 'BATS'];

async function stockQuotes(symbols) {
  const res = await get('https://scanner.tradingview.com/america/scan', {
    body: { columns: TV_STOCK_COLS, filter: [{ left: 'name', operation: 'in_range', right: symbols }], range: [0, 2000] },
  });
  const best = {};
  for (const { s, d } of res.data) {
    const row = Object.fromEntries(TV_STOCK_COLS.map((c, i) => [c, d[i]]));
    if (!PRIMARY.includes(row.exchange)) continue;
    const prev = best[row.name];
    if (!prev || (row.volume || 0) > (prev.volume || 0)) best[row.name] = { ...row, tv: s };
  }
  return best;
}

const TV_MACRO_COLS = ['name', 'description', 'close', 'change', 'change_abs', 'premarket_change', 'premarket_close', 'Perf.W', 'Perf.1M', 'Perf.YTD'];
async function macroQuotes(tickers) {
  const res = await get('https://scanner.tradingview.com/global/scan', { body: { columns: TV_MACRO_COLS, symbols: { tickers } } });
  return Object.fromEntries(res.data.map(({ s, d }) => [s, Object.fromEntries(TV_MACRO_COLS.map((c, i) => [c, d[i]]))]));
}

// [group, TradingView ticker, label, unit/kind]. kind: px (price, % change), y (yield, change in bp), fx
const MACRO = [
  ['idx', 'SP:SPX', '标普 500'], ['idx', 'NASDAQ:NDX', '纳指 100'], ['idx', 'DJ:DJI', '道指'], ['idx', 'TVC:RUT', '罗素 2000'],
  ['idx', 'NASDAQ:IXIC', '纳斯达克综指'], ['idx', 'AMEX:RSP', '标普 500 等权 ETF'],
  ['fut', 'CME_MINI:ES1!', '标普期货'], ['fut', 'CME_MINI:NQ1!', '纳指期货'], ['fut', 'CBOT_MINI:YM1!', '道指期货'], ['fut', 'CME_MINI:RTY1!', '罗素期货'],
  ['rate', 'TVC:US02Y', '2 年美债', 'y'], ['rate', 'TVC:US10Y', '10 年美债', 'y'], ['rate', 'TVC:US30Y', '30 年美债', 'y'],
  ['vol', 'CBOE:VIX', 'VIX 恐慌指数'],
  ['fx', 'TVC:DXY', '美元指数'], ['fx', 'FX:EURUSD', '欧元/美元'], ['fx', 'FX:USDJPY', '美元/日元'], ['fx', 'FX_IDC:USDCNH', '美元/离岸人民币'],
  ['cmd', 'NYMEX:CL1!', 'WTI 原油'], ['cmd', 'ICEEUR:BRN1!', '布伦特原油'], ['cmd', 'NYMEX:NG1!', '天然气'], ['cmd', 'COMEX:GC1!', '黄金'],
  ['cmd', 'TVC:SILVER', '白银'], ['cmd', 'COMEX:HG1!', '铜'],
  ['crypto', 'BITSTAMP:BTCUSD', '比特币'], ['crypto', 'BITSTAMP:ETHUSD', '以太坊'],
];
const THEMES = [
  ['NASDAQ:SMH', '半导体'], ['CBOE:IGV', '软件'], ['AMEX:KRE', '地区银行'], ['AMEX:XBI', '生物科技'], ['CBOE:ITA', '航空国防'],
  ['AMEX:XHB', '住宅建筑'], ['CBOE:IYT', '交通运输'], ['AMEX:XOP', '油气开采'], ['AMEX:GDX', '金矿'], ['AMEX:URA', '铀与核电'],
  ['AMEX:TAN', '太阳能'], ['AMEX:KWEB', '中概互联'], ['CBOE:ARKK', '创新成长'], ['AMEX:IWM', '小盘股'],
];

// ---------- calendars ----------
const nasdaqDate = s => { const d = new Date(s + ' 12:00 UTC'); return Number.isNaN(+d) ? null : d.toISOString().slice(0, 10); };
const money = s => { if (!s || s === 'N/A') return null; const neg = /\(/.test(s); const v = parseFloat(s.replace(/[$,()]/g, '')); return Number.isFinite(v) ? (neg ? -v : v) : null; };
const addDays = (d, n) => { const x = new Date(d + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };

async function earningsDay(day, spx) {
  try {
    const res = await get(`https://api.nasdaq.com/api/calendar/earnings?date=${day}`);
    return (res.data?.rows || []).map(r => {
      const mc = money(r.marketCap);
      return {
        d: day, s: r.symbol, n: r.name,
        t: /pre-market/.test(r.time) ? 'bmo' : /after-hours/.test(r.time) ? 'amc' : '',
        mc: mc ? r1(mc / 1e9) : null, eF: money(r.epsForecast), eA: money(r.eps), sp: r.surprise && r.surprise !== 'N/A' ? r2(parseFloat(r.surprise)) : null,
        ests: r.noOfEsts && r.noOfEsts !== 'N/A' ? Number(r.noOfEsts) : null, q: r.fiscalQuarterEnding || '', spx: spx.has(r.symbol),
      };
    }).filter(r => r.spx || (r.mc || 0) >= 20);
  } catch (e) {
    warn.push(`财报日历 ${day} 抓取失败：${e.message}`);
    return [];
  }
}

async function econ(from, to) {
  try {
    const res = await get(`https://economic-calendar.tradingview.com/events?from=${from}T00:00:00.000Z&to=${to}T23:59:59.000Z&countries=US`,
      { headers: { origin: 'https://www.tradingview.com', referer: 'https://www.tradingview.com/' } });
    return (res.result || []).filter(e => e.importance >= 0).map(e => ({
      t: e.date, n: e.title, per: e.period || '', a: e.actual ?? null, f: e.forecast ?? null, p: e.previous ?? null,
      u: (e.unit || '') + (e.scale || ''), imp: e.importance, src: e.source || '',
    })).sort((a, b) => a.t.localeCompare(b.t));
  } catch (e) {
    warn.push(`经济日历抓取失败：${e.message}`);
    return [];
  }
}

// ---------- main ----------
const info = (await get('https://api.nasdaq.com/api/market-info')).data;
const prevTrade = nasdaqDate(info.previousTradeDate);
const nextTrade = nasdaqDate(info.nextTradeDate);
const status = /pre/i.test(info.mrktStatus) ? 'pre' : /open/i.test(info.mrktStatus) ? 'open' : /after/i.test(info.mrktStatus) ? 'post' : 'closed';
const kind = WEEKDAY === 6 ? 'weekly' : 'daily';
if (!FORCE && (WEEKDAY === 0 || (WEEKDAY !== 6 && info.isBusinessDay === false))) {
  console.log(`SKIP ${DATE}: 非交易日（${WEEKDAY === 0 ? '周日' : '休市'}），不出刊。上一交易日 ${prevTrade}，下一交易日 ${nextTrade}。`);
  process.exit(3);
}
// The session the closing numbers belong to: today if the market has opened, otherwise the previous trade date.
const session = status === 'open' || status === 'post' || (status === 'closed' && info.isBusinessDay && new Date().getUTCHours() >= 20) ? DATE : prevTrade;

const cons = await constituents();
const symbols = cons.map(r => r[0]);
const spx = new Set(symbols);
const [quotes, macro] = await Promise.all([
  stockQuotes(symbols),
  macroQuotes([...MACRO.map(m => m[1]), ...SECTORS.map(s => 'AMEX:' + s[1]), ...THEMES.map(t => t[0])]),
]);

const inds = [...new Set(cons.map(r => r[3]))].sort();
const COLS = ['s', 'n', 'g', 'i', 'mc', 'p', 'c', 'pm', 'pv', 'w', 'm', 'ytd', 'rv', 'v', 'a50', 'a200', 'hi', 'lo', 'er', 'en'];
const nowSec = Date.now() / 1000;
const stocks = [];
const missing = [];
for (const [s, n, g, i] of cons) {
  const q = quotes[s];
  if (!q || typeof q.close !== 'number') { missing.push(s); continue; }
  const near = (a, b) => typeof a === 'number' && typeof b === 'number' && Math.abs(a - b) / b < 0.0005;
  const er = q.earnings_release_date && nowSec - q.earnings_release_date < 4 * 86400 && q.earnings_release_date < nowSec + 86400
    ? new Date(q.earnings_release_date * 1000).toISOString().slice(0, 10) : null;
  const en = q.earnings_release_next_date && q.earnings_release_next_date - nowSec < 8 * 86400 && q.earnings_release_next_date > nowSec - 86400
    ? new Date(q.earnings_release_next_date * 1000).toISOString().slice(0, 10) : null;
  stocks.push([s, n, SECTOR_IDX[g], inds.indexOf(i), r1((q.market_cap_basic || 0) / 1e9), r2(q.close), r2(q.change),
    r2(q.premarket_change), q.premarket_volume || 0, r2(q['Perf.W']), r2(q['Perf.1M']), r2(q['Perf.YTD']),
    r2(q.relative_volume_10d_calc), r2((q.volume || 0) / 1e6),
    q.SMA50 ? (q.close > q.SMA50 ? 1 : 0) : null, q.SMA200 ? (q.close > q.SMA200 ? 1 : 0) : null,
    near(q.high, q.price_52_week_high) ? 1 : 0, near(q.low, q.price_52_week_low) ? 1 : 0, er, en]);
}
if (missing.length > 10) throw new Error(`TradingView 缺少 ${missing.length} 只成分股报价：${missing.slice(0, 20).join(', ')}`);
if (missing.length) warn.push(`缺少报价：${missing.join(', ')}`);
// Before the open the daily change must still describe the previous session; a mostly-zero column means the feed rolled early.
const flat = stocks.filter(r => r[6] === 0 || r[6] === null).length;
if (flat > stocks.length / 2) throw new Error(`${flat} 只成分股当日涨跌为 0，行情源可能已切换到新交易日，停止出刊`);

const K = Object.fromEntries(COLS.map((c, i) => [c, i]));
const val = (row, k) => row[K[k]];
const metric = kind === 'weekly' ? 'w' : 'c';
const by = (k, dir, filter = () => true, n = 8) => stocks.filter(r => typeof val(r, k) === 'number' && filter(r))
  .sort((a, b) => dir * (val(b, k) - val(a, k))).slice(0, n).map(r => val(r, 's'));
const pmLiquid = r => val(r, 'pv') >= 10000 && Math.abs(val(r, 'pm')) >= 1;
const movers = {
  up: by(metric, 1, r => val(r, metric) > 0),
  down: by(metric, -1, r => val(r, metric) < 0),
  pmUp: status === 'pre' ? by('pm', 1, r => pmLiquid(r) && val(r, 'pm') > 0, 5) : [],
  pmDown: status === 'pre' ? by('pm', -1, r => pmLiquid(r) && val(r, 'pm') < 0, 5) : [],
  vol: by('rv', 1, r => val(r, 'v') > 0, 8),
};

const mq = t => macro[t] || {};
const sectors = SECTORS.map(([g, etf, zh], gi) => {
  const q = mq('AMEX:' + etf);
  const rows = stocks.filter(r => val(r, 'g') === gi);
  const cap = rows.reduce((a, r) => a + (val(r, 'mc') || 0), 0);
  const cnt = (k, test) => rows.filter(r => test(val(r, k))).length;
  return {
    k: etf, g, n: zh, c: r2(q.change), pm: r2(q.premarket_change), w: r2(q['Perf.W']), m: r2(q['Perf.1M']), ytd: r2(q['Perf.YTD']), px: r2(q.close),
    cnt: rows.length, cap: r1(cap), adv: cnt(metric, v => v > 0), dec: cnt(metric, v => v < 0),
    a50: rows.length ? r1(100 * cnt('a50', v => v === 1) / rows.length) : null,
    a200: rows.length ? r1(100 * cnt('a200', v => v === 1) / rows.length) : null,
  };
});
const themes = THEMES.map(([t, zh]) => {
  const q = mq(t);
  if (q.close == null) warn.push(`缺少报价：${t}`);
  return { k: t.split(':')[1], n: zh, c: r2(q.change), pm: r2(q.premarket_change), w: r2(q['Perf.W']), m: r2(q['Perf.1M']), ytd: r2(q['Perf.YTD']), px: r2(q.close) };
});
const macroOut = MACRO.map(([grp, t, zh, kindQ]) => {
  const q = mq(t);
  if (q.close == null) warn.push(`缺少报价：${t}`);
  return { grp, k: t.split(':')[1], n: zh, v: typeof q.close === 'number' && q.close < 20 ? Math.round(q.close * 1e4) / 1e4 : r2(q.close), c: r2(q.change), bp: kindQ === 'y' && typeof q.change_abs === 'number' ? r1(q.change_abs * 100) : null,
    pm: r2(q.premarket_change), w: r2(q['Perf.W']), m: r2(q['Perf.1M']), ytd: r2(q['Perf.YTD']) };
});

const n = stocks.length;
const count = test => stocks.filter(test).length;
const breadth = {
  n, adv: count(r => val(r, metric) > 0), dec: count(r => val(r, metric) < 0), unch: count(r => val(r, metric) === 0),
  a50: r1(100 * count(r => val(r, 'a50') === 1) / n), a200: r1(100 * count(r => val(r, 'a200') === 1) / n),
  hi: count(r => val(r, 'hi') === 1), lo: count(r => val(r, 'lo') === 1),
  pmAdv: status === 'pre' ? count(r => val(r, 'pv') > 0 && val(r, 'pm') > 0) : null,
  pmDec: status === 'pre' ? count(r => val(r, 'pv') > 0 && val(r, 'pm') < 0) : null,
};

// earnings: the last session's reports (results) and the next week (upcoming)
const days = [];
for (let i = 0; i <= 7; i++) { const d = addDays(DATE, i); const wd = new Date(d + 'T12:00:00Z').getUTCDay(); if (wd > 0 && wd < 6) days.push(d); }
const [past, ...ahead] = await Promise.all([earningsDay(prevTrade, spx), ...days.map(d => earningsDay(d, spx))]);
const upcoming = ahead.flat();
const results = [...past.filter(r => r.eA != null), ...upcoming.filter(r => r.d === DATE && r.eA != null)];
const events = await econ(prevTrade, addDays(DATE, 7));

const data = {
  fetched: new Date().toISOString(),
  kind, status, session, prev: prevTrade, next: nextTrade,
  delay: '15 分钟延迟',
  cols: COLS, inds, stocks,
  sectors, themes, macro: macroOut, breadth, movers,
  earnings: { results, upcoming: upcoming.filter(r => r.eA == null || r.d !== DATE) },
  econ: events,
  src: {
    quotes: ['TradingView 行情筛选器（延迟 15 分钟）', 'https://www.tradingview.com/screener/'],
    list: ['Wikipedia：标普 500 成分股与 GICS 行业', 'https://en.wikipedia.org/wiki/List_of_S%26P_500_companies'],
    session: ['Nasdaq 市场状态', 'https://www.nasdaq.com/market-activity'],
    earnings: ['Nasdaq 财报日历', 'https://www.nasdaq.com/market-activity/earnings'],
    econ: ['TradingView 经济日历', 'https://www.tradingview.com/economic-calendar/'],
  },
  warn,
};

// ---------- edit skeleton ----------
const file = at(`../issues/${DATE}.json`);
const old = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : null;
const edit = old?.edit || {};
const TODO = 'TODO';
edit.no ??= TODO;
edit.edited ??= TODO;
edit.cover ??= { title: TODO, dek: TODO, points: [TODO, TODO, TODO] };
edit.sectors ??= {};
for (const s of SECTORS) edit.sectors[s[1]] ??= { t: TODO, src: [] };
edit.movers ??= {};
const need = [...new Set([...movers.up, ...movers.down, ...movers.pmUp, ...movers.pmDown])];
for (const s of need) edit.movers[s] ??= { why: TODO, src: [] };
for (const s of Object.keys(edit.movers)) if (!need.includes(s) && edit.movers[s].why === TODO) delete edit.movers[s];
edit.news ??= [{ tag: TODO, date: TODO, title: TODO, body: TODO, src: [] }];

// one line per stock row / flat array keeps the file diffable and small
const pretty = JSON.stringify({ date: DATE, data, edit }, null, 1)
  .replace(/\[\n\s*([^\[\]{}]*?)\n\s*\]/g, (m, inner) => '[' + inner.replace(/,\n\s*/g, ',') + ']');
writeFileSync(file, pretty + '\n');

const fmt = (s, k) => { const r = stocks.find(x => val(x, 's') === s); return `${s} ${val(r, k) > 0 ? '+' : ''}${val(r, k)}%`; };
console.log(`${DATE} · ${kind} · 市场状态 ${status} · 收盘数据所属交易日 ${session} · ${n} 只成分股`);
console.log(`涨幅榜: ${movers.up.map(s => fmt(s, metric)).join(', ')}`);
console.log(`跌幅榜: ${movers.down.map(s => fmt(s, metric)).join(', ')}`);
if (movers.pmUp.length || movers.pmDown.length) console.log(`盘前: ${[...movers.pmUp, ...movers.pmDown].map(s => fmt(s, 'pm')).join(', ')}`);
console.log(`板块: ${sectors.map(s => `${s.n} ${s.c}%`).join(' · ')}`);
console.log(`财报: 已公布 ${results.length} · 未来 ${data.earnings.upcoming.length} · 经济数据 ${events.length}`);
console.log(`待写 edit.movers: ${need.join(', ')}`);
if (warn.length) console.log('警告:\n  ' + warn.join('\n  '));
