// Validate every issue in issues/, then inline the newest KEEP issues and the sources into one page
// (the Artifact wraps it in <html>/<body>). Fails loudly so a bad daily issue never gets published.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';

const KEEP = 30;
const SECTION_ORDER = ['outdoor', 'ai', 'tech', 'politics', 'markets'];
const at = f => new URL(f, import.meta.url);
const src = f => readFileSync(at('./src/' + f), 'utf8');

function check(issue, file) {
  const errs = [];
  const need = (cond, msg) => { if (!cond) errs.push(msg); };
  const text = v => typeof v === 'string' && v.trim().length > 0;
  const srcOk = (s, where) => {
    need(Array.isArray(s) && s.length > 0, `${where}: src 至少一条`);
    (s || []).forEach((p, i) => need(Array.isArray(p) && text(p[0]) && /^https:\/\//.test(p[1] || ''), `${where}: src[${i}] 需要 [名称, https 链接]`));
  };
  const story = (x, where, isLead) => {
    need(x && typeof x === 'object', `${where}: 缺失`);
    if (!x) return;
    ['tag', 'date', 'title'].forEach(k => need(text(x[k]), `${where}.${k} 为空`));
    if (isLead) need(Array.isArray(x.body) && x.body.length > 0 && x.body.every(text), `${where}.body 需要段落数组`);
    else need(text(x.body), `${where}.body 为空`);
    (x.figs || []).forEach((f, i) => need(text(f.v) && text(f.l), `${where}.figs[${i}] 需要 v 和 l`));
    srcOk(x.src, where);
  };

  need(file === issue.date + '.json', `文件名应为 ${issue.date}.json`);
  need(/^\d{4}-\d{2}-\d{2}$/.test(issue.date || ''), 'date 格式应为 YYYY-MM-DD');
  need(Number.isInteger(issue.no) && issue.no > 0, 'no 应为正整数');
  need(text(issue.edited), 'edited 为空');
  need(issue.cover && text(issue.cover.title) && text(issue.cover.dek), 'cover.title / cover.dek 为空');
  need(Array.isArray(issue.cover?.points) && issue.cover.points.length === 5, 'cover.points 需要 5 条，每个板块一条');
  (issue.cover?.points || []).forEach((p, i) => need(p.sec === SECTION_ORDER[i] && text(p.text), `cover.points[${i}] 应为 ${SECTION_ORDER[i]}`));
  need(Array.isArray(issue.sections) && issue.sections.map(s => s.id).join() === SECTION_ORDER.join(), `sections 顺序应为 ${SECTION_ORDER.join(', ')}`);
  (issue.sections || []).forEach(s => {
    story(s.lead, `${s.id}.lead`, true);
    need(Array.isArray(s.items) && s.items.length >= 3, `${s.id}.items 至少 3 条`);
    (s.items || []).forEach((it, i) => story(it, `${s.id}.items[${i}]`, false));
    if (s.table) {
      need(Array.isArray(s.table.cols) && s.table.rows.every(r => r.length === s.table.cols.length), `${s.id}.table 每行列数应与 cols 一致`);
      srcOk(s.table.src, `${s.id}.table`);
    }
  });
  const mk = (issue.sections || []).find(s => s.id === 'markets');
  need(mk && mk.quotes && Array.isArray(mk.quotes.groups), 'markets.quotes.groups 缺失');
  (mk?.quotes?.groups || []).forEach((g, gi) => {
    need(text(g.name) && g.rows.length > 0, `quotes.groups[${gi}] 为空`);
    g.rows.forEach((r, ri) => {
      const where = `quotes.${g.name}[${ri}]`;
      need(text(r.n) && text(r.v) && text(r.d), `${where} 需要 n / v / d`);
      need(r.c === null || (typeof r.c === 'number' && Number.isFinite(r.c)), `${where}.c 应为数字或 null`);
      need(typeof r.c === 'number' || text(r.ct), `${where}: c 为 null 时需要 ct`);
    });
  });
  if (mk?.quotes) srcOk(mk.quotes.src, 'markets.quotes');
  (issue.agenda || []).forEach((a, i) => need(text(a.d) && text(a.t) && SECTION_ORDER.includes(a.sec), `agenda[${i}] 需要 d / sec / t`));

  if (errs.length) throw new Error(`${file}:\n  - ` + errs.join('\n  - '));
}

const files = readdirSync(at('./issues/')).filter(f => /^\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort().reverse();
if (!files.length) throw new Error('issues/ 下没有期刊');
const issues = files.map(f => {
  const issue = JSON.parse(readFileSync(at('./issues/' + f), 'utf8'));
  check(issue, f);
  return issue;
});
for (let i = 1; i < issues.length; i++) {
  if (issues[i - 1].no !== issues[i].no + 1) console.warn(`warning: 期号不连续 ${issues[i].date} No.${issues[i].no} → ${issues[i - 1].date} No.${issues[i - 1].no}`);
}

const app = src('app.js');
const data = JSON.stringify(issues.slice(0, KEEP)).replace(/</g, '\\u003c');
if (/<\/script/i.test(app)) throw new Error('inline script contains </script');
const html = `<title>UNO 日刊</title>
<meta name="description" content="UNO 日刊：户外运动、AI、科技前沿、政治经济、国际市场，每日一期。">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,300..900&family=Noto+Sans+SC:wght@300;400;500;700;800;900&display=swap">
<style>${src('style.css')}</style>
${src('body.html')}
<script type="application/json" id="issues-data">${data}</script>
<script>(()=>{'use strict';
${app}
})();</script>
`;
writeFileSync(at('./index.html'), html);
console.log(`index.html ${(html.length / 1024).toFixed(1)} KB · ${Math.min(issues.length, KEEP)} 期 · 最新 ${issues[0].date} No.${issues[0].no}`);
