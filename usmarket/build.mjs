// Validate every issue in issues/, then inline the newest KEEP issues into one page (the Artifact wraps it in <html>/<body>).
// Fails loudly so an issue with unfinished edits (any "TODO") or a mover without a sourced reason never gets published.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';

const KEEP = 30;
const DRAFT = process.argv.includes('--draft'); // local preview only: report problems instead of stopping
const at = f => new URL(f, import.meta.url);
const src = f => readFileSync(at('./src/' + f), 'utf8');
const SECTOR_ETFS = ['XLK', 'XLC', 'XLY', 'XLP', 'XLV', 'XLF', 'XLI', 'XLE', 'XLB', 'XLU', 'XLRE'];
const NO_NEWS = /^无明确消息/;

function check(issue, file) {
  const errs = [];
  const need = (cond, msg) => { if (!cond) errs.push(msg); };
  const text = v => typeof v === 'string' && v.trim().length > 0 && !/TODO/.test(v);
  const srcOk = (s, where, required = true) => {
    need(Array.isArray(s), `${where}.src 应为数组`);
    if (required) need((s || []).length > 0, `${where}: src 至少一条`);
    (s || []).forEach((p, i) => need(Array.isArray(p) && text(p[0]) && /^https:\/\//.test(p[1] || ''), `${where}: src[${i}] 需要 [名称, https 链接]`));
  };
  const { data: d, edit: e } = issue;

  need(file === issue.date + '.json', `文件名应为 ${issue.date}.json`);
  need(d && Array.isArray(d.stocks) && d.stocks.length >= 490, 'data.stocks 少于 490 只，先重新运行 pipeline/fetch.mjs');
  need(d && d.sectors?.map(s => s.k).join() === SECTOR_ETFS.join(), 'data.sectors 应为 11 个 SPDR 板块');
  need(e && typeof e === 'object', 'edit 缺失');
  if (errs.length || !e) throw new Error(`${file}:\n  - ` + errs.join('\n  - '));

  need(Number.isInteger(e.no) && e.no > 0, 'edit.no 应为正整数');
  need(text(e.edited), 'edit.edited 为空');
  need(text(e.cover?.title) && text(e.cover?.dek), 'edit.cover.title / dek 为空');
  need(Array.isArray(e.cover?.points) && e.cover.points.length >= 3 && e.cover.points.length <= 5, 'edit.cover.points 需要 3–5 条');
  (e.cover?.points || []).forEach((p, i) => need(text(p) && /\d/.test(p), `edit.cover.points[${i}] 需要文字且至少一个数字`));
  for (const k of SECTOR_ETFS) {
    need(text(e.sectors?.[k]?.t), `edit.sectors.${k}.t 为空`);
    srcOk(e.sectors?.[k]?.src || [], `edit.sectors.${k}`, false);
  }
  const shown = [...new Set([...d.movers.up, ...d.movers.down, ...d.movers.pmUp, ...d.movers.pmDown])];
  for (const s of shown) {
    const m = e.movers?.[s];
    need(m && text(m.why), `edit.movers.${s}.why 为空（异动原因）`);
    if (m && text(m.why)) srcOk(m.src, `edit.movers.${s}`, !NO_NEWS.test(m.why));
  }
  need(Array.isArray(e.news) && e.news.length >= 3 && e.news.length <= 8, 'edit.news 需要 3–8 条');
  (e.news || []).forEach((n, i) => {
    ['tag', 'date', 'title', 'body'].forEach(k => need(text(n[k]), `edit.news[${i}].${k} 为空`));
    srcOk(n.src, `edit.news[${i}]`);
  });
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

const app = src('app.js');
const data = JSON.stringify(issues.slice(0, KEEP)).replace(/</g, '\\u003c');
if (/<\/script/i.test(app)) throw new Error('inline script contains </script');
const html = `<title>美股晨报 OS</title>
<meta name="description" content="美股晨报：标普 500 热力图、板块进展、异动股与原因、盘前、宏观、财报与经济日历、市场宽度，每个交易日美西 05:00 出刊。">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=Noto+Sans+SC:wght@400;500;700;900&display=swap">
<style>${src('style.css')}</style>
${src('body.html')}
<script type="application/json" id="issues-data">${data}</script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/d3/7.9.0/d3.min.js"></script>
<script>(()=>{'use strict';
${app}
})();</script>
`;
writeFileSync(at('./index.html'), html);
console.log(`index.html ${(html.length / 1024).toFixed(1)} KB · ${Math.min(issues.length, KEEP)} 期 · 最新 ${issues[0].date} No.${issues[0].edit.no}`);
