// Prints the numbers an editor needs from issues/<date>.json, so every figure in the write-up is copied, not retyped.
// Usage: node usmarket/pipeline/peek.mjs [--date YYYY-MM-DD] [SYMBOL ...]
//   no symbols: session, indices, futures, macro, sectors, themes, breadth, movers, earnings, today's data releases
//   symbols:    one line per stock
import { readFileSync, readdirSync } from 'node:fs';

const args = process.argv.slice(2);
const di = args.indexOf('--date');
const date = di >= 0 ? args.splice(di, 2)[1] : readdirSync(new URL('../issues/', import.meta.url)).filter(f => /^\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort().pop().slice(0, 10);
const { data: d } = JSON.parse(readFileSync(new URL(`../issues/${date}.json`, import.meta.url), 'utf8'));
const C = Object.fromEntries(d.cols.map((c, i) => [c, i]));
const by = Object.fromEntries(d.stocks.map(r => [r[C.s], r]));
const p = v => (typeof v === 'number' ? (v > 0 ? '+' : '') + v.toFixed(2) + '%' : '—');
const stock = s => {
  const r = by[s];
  if (!r) return `${s}: 不在标普 500 名单里`;
  return `${s} ${r[C.n]} | ${d.inds[r[C.i]]} | $${r[C.p]} | 当日 ${p(r[C.c])} | 盘前 ${p(r[C.pm])} (${r[C.pv]} 股) | 周 ${p(r[C.w])} | 月 ${p(r[C.m])} | 年初 ${p(r[C.ytd])} | 相对量 ${r[C.rv]}× | 市值 $${r[C.mc]}B${r[C.er] ? ' | 财报 ' + r[C.er] : ''}`;
};

if (args.length) { args.forEach(s => console.log(stock(s.toUpperCase()))); process.exit(0); }

console.log(`${date} · ${d.kind} · 状态 ${d.status} · 收盘数据属于 ${d.session} · 抓取 ${d.fetched}`);
for (const g of ['idx', 'fut', 'rate', 'vol', 'fx', 'cmd', 'crypto']) {
  console.log(`[${g}] ` + d.macro.filter(m => m.grp === g).map(m => `${m.n} ${m.v}${m.bp != null ? ` ${m.bp > 0 ? '+' : ''}${m.bp}bp` : ' ' + p(m.c)} 周${p(m.w)} 年${p(m.ytd)}`).join(' · '));
}
console.log('[板块] ' + d.sectors.map(s => `${s.n}(${s.k}) ${p(s.c)} 盘前${p(s.pm)} 周${p(s.w)} 年${p(s.ytd)} ${s.adv}涨${s.dec}跌/${s.cnt}`).join('\n       '));
console.log('[主题] ' + d.themes.map(t => `${t.n}(${t.k}) ${p(t.c)} 盘前${p(t.pm)} 年${p(t.ytd)}`).join(' · '));
const b = d.breadth;
console.log(`[宽度] ${b.adv} 涨 ${b.dec} 跌 ${b.unch} 平 · 50 日线上方 ${b.a50}% · 200 日线上方 ${b.a200}% · 新高 ${b.hi} 新低 ${b.lo}${b.pmAdv != null ? ` · 盘前 ${b.pmAdv} 涨 ${b.pmDec} 跌` : ''}`);
for (const k of ['up', 'down', 'pmUp', 'pmDown', 'vol']) if (d.movers[k].length) console.log(`[${k}]\n  ` + d.movers[k].map(stock).join('\n  '));
if (d.earnings.results.length) console.log('[财报已公布] ' + d.earnings.results.map(e => `${e.s} EPS ${e.eA} vs 预期 ${e.eF} (${p(e.sp)}) ${e.t}`).join(' · '));
console.log('[财报未来] ' + d.earnings.upcoming.map(e => `${e.d} ${e.s} ${e.t}`).join(' · '));
console.log('[经济数据] ' + d.econ.filter(e => e.a != null).map(e => `${e.t.slice(5, 16)}Z ${e.n} 实际 ${e.a}${e.u} 预期 ${e.f ?? '—'} 前值 ${e.p ?? '—'}`).join('\n          '));
if (d.warn.length) console.log('[提示] ' + d.warn.join(' · '));
