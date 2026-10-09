// Daily history: ETFs and stocks from the Nasdaq historical API (last ~10 years, split-adjusted, no dividends),
// VIX and VIX3M from CBOE. Cached under usmarket/.cache/ (git-ignored); a cache file from today is reused.
// CLI: node usmarket/pipeline/history.mjs            → ETFs + VIX
//      node usmarket/pipeline/history.mjs --stocks   → also every S&P 500 constituent (≈ 5 minutes, for backtest.mjs)
import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { ETFS } from './lib.mjs';

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
const CACHE = new URL('../.cache/', import.meta.url);
const today = new Date().toISOString().slice(0, 10);
const num = s => { const v = parseFloat(String(s).replace(/[$,]/g, '')); return Number.isFinite(v) ? v : null; };
const isoDate = s => { const [m, d, y] = s.split('/'); return `${y}-${m}-${d}`; };

async function get(url, json = true) {
  let last;
  for (let i = 0; i < 4; i++) {
    try {
      const res = await fetch(url, { headers: { 'user-agent': UA, accept: json ? 'application/json' : 'text/csv' }, signal: AbortSignal.timeout(60000) });
      if (!res.ok) throw new Error(`${res.status} ${url}`);
      return json ? await res.json() : await res.text();
    } catch (e) { last = e; await new Promise(r => setTimeout(r, 2000 * 2 ** i)); }
  }
  throw last;
}

function cached(name) {
  const f = new URL(name, CACHE);
  if (existsSync(f) && statSync(f).mtime.toISOString().slice(0, 10) === today) return JSON.parse(readFileSync(f, 'utf8'));
  return null;
}
function save(name, obj) {
  mkdirSync(new URL('./', new URL(name, CACHE)), { recursive: true });
  writeFileSync(new URL(name, CACHE), JSON.stringify(obj));
}

export async function nasdaqBars(sym, cls) {
  const res = await get(`https://api.nasdaq.com/api/quote/${encodeURIComponent(sym)}/historical?assetclass=${cls}&fromdate=2016-01-01&todate=${today}&limit=9999`);
  const rows = (res.data?.tradesTable?.rows || []).slice().reverse();
  const b = { d: [], o: [], h: [], l: [], c: [], v: [] };
  for (const r of rows) {
    const c = num(r.close);
    if (c == null) continue;
    const o = num(r.open) ?? c, h = num(r.high) ?? Math.max(o, c), l = num(r.low) ?? Math.min(o, c);
    b.d.push(isoDate(r.date)); b.o.push(o); b.h.push(h); b.l.push(l); b.c.push(c); b.v.push(num(r.volume) ?? 0);
  }
  if (b.c.length < 50) throw new Error(`${sym}: only ${b.c.length} bars`);
  return b;
}

async function pool(items, n, fn) {
  const out = {};
  let next = 0;
  await Promise.all(Array.from({ length: n }, async () => {
    while (next < items.length) {
      const it = items[next++];
      try { out[it] = await fn(it); } catch (e) { out[it] = { error: e.message }; }
    }
  }));
  return out;
}

async function cboe(name) {
  const csv = await get(`https://cdn.cboe.com/api/global/us_indices/daily_prices/${name}_History.csv`, false);
  const d = [], c = [];
  for (const line of csv.trim().split('\n').slice(1)) {
    const p = line.split(',');
    if (p.length >= 5 && /\d/.test(p[4])) { d.push(isoDate(p[0])); c.push(Number(p[4])); }
  }
  return { d, c };
}

export async function loadEtfs() {
  const hit = cached('etfs.json');
  if (hit) return hit;
  const bars = await pool(ETFS, 5, s => nasdaqBars(s, 'etf'));
  const failed = Object.entries(bars).filter(([, b]) => b.error);
  // Only SPY drives the live cap model; the other series feed reference checks and may be missing for a day.
  if (failed.some(([s]) => s === 'SPY')) throw new Error('SPY 历史抓取失败：' + failed.map(([s, b]) => `${s} ${b.error}`).join('; '));
  const empty = { d: [], c: [] };
  const [vix, vix3m] = await Promise.all([cboe('VIX').catch(() => empty), cboe('VIX3M').catch(() => empty)]);
  const out = { asof: today, bars: Object.fromEntries(Object.entries(bars).filter(([, b]) => !b.error)), vix, vix3m, failed: failed.map(([s]) => s) };
  save('etfs.json', out);
  return out;
}

export async function loadStocks(symbols) {
  const hit = cached('stocks.json');
  if (hit) return hit;
  const bars = await pool(symbols, 6, s => nasdaqBars(s, 'stocks'));
  const out = { asof: today, bars: Object.fromEntries(Object.entries(bars).filter(([, b]) => !b.error)), failed: Object.keys(bars).filter(s => bars[s].error) };
  save('stocks.json', out);
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const t0 = Date.now();
  const e = await loadEtfs();
  console.log(`ETF ${Object.keys(e.bars).length} 只 · SPY ${e.bars.SPY.d[0]} → ${e.bars.SPY.d.at(-1)} · VIX ${e.vix.d.at(-1)} · VIX3M ${e.vix3m.d.at(-1)}${e.failed.length ? ' · 失败 ' + e.failed.join(',') : ''}`);
  if (process.argv.includes('--stocks')) {
    const list = JSON.parse(readFileSync(new URL('../data/sp500.json', import.meta.url), 'utf8')).rows.map(r => r[0]);
    const s = await loadStocks(list);
    console.log(`个股 ${Object.keys(s.bars).length} 只 · 失败 ${s.failed.length}：${s.failed.join(',')}`);
  }
  console.log(`${((Date.now() - t0) / 1000).toFixed(0)} 秒`);
}
