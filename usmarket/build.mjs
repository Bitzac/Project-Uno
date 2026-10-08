// Validate every issue in issues/, then inline the newest KEEP issues, the backtest and the rule constants into one page
// (the Artifact wraps it in <html>/<body>). Fails loudly so an issue with unfinished edits or malformed orders never ships.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { CFG } from './pipeline/lib.mjs';

const KEEP = 30;
const DRAFT = process.argv.includes('--draft'); // local preview only: report problems instead of stopping
const at = f => new URL(f, import.meta.url);
const src = f => readFileSync(at('./src/' + f), 'utf8');
const NO_NEWS = /^无明确消息/;

function check(issue, file) {
  const errs = [];
  const need = (cond, msg) => { if (!cond) errs.push(msg); };
  const text = v => typeof v === 'string' && v.trim().length > 0 && !/TODO/.test(v);
  const n = v => typeof v === 'number' && Number.isFinite(v);
  const srcOk = (s, where, required) => {
    need(Array.isArray(s), `${where}.src 应为数组`);
    if (required) need((s || []).length > 0, `${where}: src 至少一条`);
    (s || []).forEach((p, i) => need(Array.isArray(p) && text(p[0]) && /^https:\/\//.test(p[1] || ''), `${where}: src[${i}] 需要 [名称, https 链接]`));
  };
  const { data: d, edit: e } = issue;
  need(file === issue.date + '.json', `文件名应为 ${issue.date}.json`);
  need(d && Array.isArray(d.stocks) && d.stocks.length >= 490, 'data.stocks 少于 490 只，先重新运行 fetch.mjs');
  const dec = d?.decision;
  need(dec && dec.regime && n(dec.regime.cap) && n(dec.regime.vol20), 'data.decision 缺失，先运行 signals.mjs');
  need(e && typeof e === 'object', 'edit 缺失');
  if (errs.length) throw new Error(`${file}:\n  - ` + errs.join('\n  - '));

  for (const [i, o] of dec.orders.entries()) {
    const w = `orders[${i}] ${o.s}`;
    need(['buy', 'sell', 'adjust'].includes(o.act), `${w}: act 不对`);
    need(n(o.px) && o.px > 0 && n(o.w), `${w}: 需要参考价和仓位比例`);
    if (o.act === 'buy') need(n(o.stop) && o.stop < o.px && n(o.risk) && o.risk <= CFG.risk * 1.05 && n(o.sh) && o.sh >= 1, `${w}: 买入需要止损、股数，风险不超过 ${CFG.risk * 100}%`);
  }
  need(Number.isInteger(e.no) && e.no > 0, 'edit.no 应为正整数');
  need(text(e.edited), 'edit.edited 为空');
  need(text(e.cover?.title) && text(e.cover?.dek), 'edit.cover.title / dek 为空');
  need(Array.isArray(e.cover?.points) && e.cover.points.length >= 3 && e.cover.points.length <= 5, 'edit.cover.points 需要 3–5 条');
  (e.cover?.points || []).forEach((p, i) => need(text(p) && /\d/.test(p), `edit.cover.points[${i}] 需要文字且至少一个数字`));
  const tickers = [...new Set([...dec.orders.filter(o => o.s !== 'SPY').map(o => o.s), ...dec.candidates.map(c => c.s)])];
  for (const s of tickers) {
    const m = e.notes?.[s];
    need(m && text(m.why), `edit.notes.${s}.why 为空（指令或候选股的催化剂）`);
    if (m && text(m.why)) srcOk(m.src, `edit.notes.${s}`, !NO_NEWS.test(m.why));
  }
  need(!/TODO/.test(JSON.stringify(e)), 'edit 里还有 TODO');
  if (errs.length) {
    const msg = `${file}:\n  - ` + errs.join('\n  - ');
    if (!DRAFT) throw new Error(msg);
    console.warn('[draft] ' + msg.split('\n').slice(0, 8).join('\n') + (errs.length > 7 ? `\n  … 共 ${errs.length} 项` : ''));
  }
}

const files = readdirSync(at('./issues/')).filter(f => /^\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort().reverse();
if (!files.length) throw new Error('issues/ 下没有期刊');
const issues = files.map(f => {
  const issue = JSON.parse(readFileSync(at('./issues/' + f), 'utf8'));
  check(issue, f);
  return issue;
});
for (let i = 1; i < issues.length; i++) {
  if (issues[i - 1].edit.no !== issues[i].edit.no + 1) console.warn(`warning: 期号不连续 ${issues[i].date} No.${issues[i].edit.no} → ${issues[i - 1].date} No.${issues[i - 1].edit.no}`);
}
const bt = JSON.parse(readFileSync(at('./data/backtest.json'), 'utf8'));

const app = src('app.js');
const json = v => JSON.stringify(v).replace(/</g, '\\u003c');
if (/<\/script/i.test(app)) throw new Error('inline script contains </script');
const html = `<title>美股晨报 OS</title>
<meta name="description" content="美股晨报决策台：按波动率决定仓位上限，核心仓 SPY + 卫星仓趋势突破个股，每天给出买卖指令、止损和股数，附 9 年回测与模拟组合实盘记录。">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=Noto+Sans+SC:wght@400;500;700;900&display=swap">
<style>${src('style.css')}</style>
${src('body.html')}
<script type="application/json" id="issues-data">${json(issues.slice(0, KEEP))}</script>
<script type="application/json" id="bt-data">${json(bt)}</script>
<script type="application/json" id="cfg-data">${json(CFG)}</script>
<script>(()=>{'use strict';
${app}
})();</script>
`;
writeFileSync(at('./index.html'), html);
console.log(`index.html ${(html.length / 1024).toFixed(1)} KB · ${Math.min(issues.length, KEEP)} 期 · 最新 ${issues[0].date} No.${issues[0].edit.no}`);
