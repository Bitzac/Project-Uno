// Pulls the morning snapshot and writes it into issues/<date>.json as `data`, keeping any `edit` already there.
//   S&P 500 constituents + GICS sectors .............. Wikipedia (cached in data/sp500.json)
//   stock bars and indicators (SMA, ATR, RSI7 …) ...... TradingView scanner (15-minute delayed), same definitions as lib.mjs
//   model ETFs + VIX / VIX3M (today's bar) ............ TradingView scanner
//   session (previous / next trade date) ............. Nasdaq market-info
//   US economic calendar (event-risk flags) .......... TradingView economic calendar
// signals.mjs runs next and adds data.decision.
// Usage: node usmarket/pipeline/fetch.mjs [--date YYYY-MM-DD] [--force]
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { SECTORS } from './lib.mjs';

const at = f => new URL(f, import.meta.url);
const args = process.argv.slice(2);
const opt = k => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const FORCE = args.includes('--force');
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

const laDate = (d = new Date()) => d.toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
const DATE = opt('--date') || laDate();
const WEEKDAY = new Date(DATE + 'T12:00:00Z').getUTCDay(); // 0 Sun … 6 Sat
const r2 = v => (typeof v === 'number' && Number.isFinite(v) ? Math.round(v * 100) / 100 : null);
const r4 = v => (typeof v === 'number' && Number.isFinite(v) ? Math.round(v * 10000) / 10000 : null);
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
const SECTOR_IDX = Object.fromEntries(SECTORS.map((s, i) => [s[2], i]));
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
const TV_STOCK_COLS = ['name', 'exchange', 'open', 'high', 'low', 'close', 'change', 'premarket_change', 'premarket_volume', 'volume',
  'relative_volume_10d_calc', 'market_cap_basic', 'Perf.W', 'Perf.6M', 'SMA5', 'EMA10', 'SMA50', 'SMA200', 'ATR', 'RSI7',
  'High.1M', 'price_52_week_high', 'gap', 'earnings_release_date', 'earnings_release_next_date'];
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

// Today's bar for the ETFs and indices the model reads; signals.mjs appends it when the history feed lags a day.
// The extra index ETFs are only there so the page can check holdings in them.
const ETF_TICKERS = ['AMEX:SPY', 'AMEX:HYG', 'NASDAQ:IEF', 'NYSE:SGOV', ...SECTORS.map(s => 'AMEX:' + s[0]), 'CBOE:VIX',
  'NASDAQ:QQQ', 'AMEX:IWM', 'AMEX:DIA', 'AMEX:VOO', 'AMEX:VTI', 'NASDAQ:TLT', 'AMEX:GLD', 'NASDAQ:SMH', 'AMEX:RSP'];
const TV_ETF_COLS = ['name', 'open', 'high', 'low', 'close', 'change', 'premarket_change', 'ATR', 'SMA50', 'SMA200', 'High.1M'];
async function etfQuotes() {
  const res = await get('https://scanner.tradingview.com/global/scan', { body: { columns: TV_ETF_COLS, symbols: { tickers: ETF_TICKERS } } });
  const out = {};
  for (const { d } of res.data) {
    const q = Object.fromEntries(TV_ETF_COLS.map((c, i) => [c, d[i]]));
    out[q.name] = { o: r4(q.open), h: r4(q.high), l: r4(q.low), c: r4(q.close), chg: r2(q.change), pm: r2(q.premarket_change),
      atr: r4(q.ATR), s50: r4(q.SMA50), s200: r4(q.SMA200), h1m: r4(q['High.1M']) };
  }
  for (const t of ETF_TICKERS) if (!out[t.split(':')[1]]) warn.push(`缺少报价：${t}`);
  return out;
}

// ---------- calendar ----------
const nasdaqDate = s => { const d = new Date(s + ' 12:00 UTC'); return Number.isNaN(+d) ? null : d.toISOString().slice(0, 10); };
const addDays = (d, n) => { const x = new Date(d + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
async function econ(from, to) {
  try {
    const res = await get(`https://economic-calendar.tradingview.com/events?from=${from}T00:00:00.000Z&to=${to}T23:59:59.000Z&countries=US`,
      { headers: { origin: 'https://www.tradingview.com', referer: 'https://www.tradingview.com/' } });
    return (res.result || []).filter(e => e.importance >= 1).map(e => ({ t: e.date, n: e.title, a: e.actual ?? null, f: e.forecast ?? null, p: e.previous ?? null, u: (e.unit || '') + (e.scale || '') }))
      .sort((a, b) => a.t.localeCompare(b.t));
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
if (!FORCE && (WEEKDAY === 0 || (WEEKDAY !== 6 && info.isBusinessDay === false))) {
  console.log(`SKIP ${DATE}: 非交易日（${WEEKDAY === 0 ? '周日' : '休市'}），不出刊。上一交易日 ${prevTrade}，下一交易日 ${nextTrade}。`);
  process.exit(3);
}
// The session today's bars belong to: today once the market has opened, otherwise the previous trade date.
const session = status === 'open' || status === 'post' || (status === 'closed' && info.isBusinessDay && new Date().getUTCHours() >= 20) ? DATE : prevTrade;

const cons = await constituents();
const [quotes, etfs, events] = await Promise.all([stockQuotes(cons.map(r => r[0])), etfQuotes(), econ(DATE, addDays(DATE, 7))]);

const inds = [...new Set(cons.map(r => r[3]))].sort();
const COLS = ['s', 'n', 'g', 'i', 'mc', 'o', 'h', 'l', 'c', 'chg', 'pm', 'pv', 'w', 'm6', 'rv', 's5', 'e10', 's50', 's200', 'atr', 'rsi7', 'h1m', 'h52', 'gap', 'er', 'en'];
const day = ts => (ts ? new Date(ts * 1000).toISOString().slice(0, 10) : null);
const stocks = [], missing = [];
for (const [s, n, g, i] of cons) {
  const q = quotes[s];
  if (!q || typeof q.close !== 'number') { missing.push(s); continue; }
  stocks.push([s, n, SECTOR_IDX[g], inds.indexOf(i), r2((q.market_cap_basic || 0) / 1e9), r4(q.open), r4(q.high), r4(q.low), r4(q.close),
    r2(q.change), r2(q.premarket_change), q.premarket_volume || 0, r2(q['Perf.W']), r2(q['Perf.6M']), r2(q.relative_volume_10d_calc),
    r4(q.SMA5), r4(q.EMA10), r4(q.SMA50), r4(q.SMA200), r4(q.ATR), r2(q.RSI7), r4(q['High.1M']), r4(q.price_52_week_high), r2(q.gap),
    day(q.earnings_release_date), day(q.earnings_release_next_date)]);
}
if (missing.length > 10) throw new Error(`TradingView 缺少 ${missing.length} 只成分股报价：${missing.slice(0, 20).join(', ')}`);
if (missing.length) warn.push(`缺少报价：${missing.join(', ')}`);
// Before the open the daily change must still describe the previous session; a mostly-zero column means the feed rolled early.
const flat = stocks.filter(r => r[9] === 0 || r[9] === null).length;
if (flat > stocks.length / 2) throw new Error(`${flat} 只成分股当日涨跌为 0，行情源可能已切换到新交易日，停止出刊`);

const data = {
  fetched: new Date().toISOString(), status, session, prev: prevTrade, next: nextTrade, delay: '15 分钟延迟',
  cols: COLS, inds, stocks, etfs, econ: events,
  src: {
    quotes: ['TradingView 行情筛选器（延迟 15 分钟）', 'https://www.tradingview.com/screener/'],
    list: ['Wikipedia：标普 500 成分股与 GICS 行业', 'https://en.wikipedia.org/wiki/List_of_S%26P_500_companies'],
    history: ['Nasdaq 历史行情（2016 年起，按拆股调整）', 'https://www.nasdaq.com/market-activity/quotes/historical'],
    vix: ['CBOE VIX / VIX3M 历史', 'https://www.cboe.com/tradable_products/vix/vix_historical_data/'],
    econ: ['TradingView 经济日历', 'https://www.tradingview.com/economic-calendar/'],
  },
  warn,
};

const file = at(`../issues/${DATE}.json`);
const old = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : null;
const pretty = JSON.stringify({ date: DATE, data, edit: old?.edit || {} }, null, 1)
  .replace(/\[\n\s*([^\[\]{}]*?)\n\s*\]/g, (m, inner) => '[' + inner.replace(/,\n\s*/g, ',') + ']');
writeFileSync(file, pretty + '\n');
console.log(`${DATE} · 市场状态 ${status} · 收盘数据所属交易日 ${session} · ${stocks.length} 只成分股 · ETF ${Object.keys(etfs).length} · 高重要性经济数据 ${events.length}`);
if (warn.length) console.log('警告:\n  ' + warn.join('\n  '));
