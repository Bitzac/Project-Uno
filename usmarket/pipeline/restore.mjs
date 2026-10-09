// Brings the repo up to date from the published page. Every publish embeds the issues, the paper ledger and the backtest,
// so a run that published but could not push loses nothing: the next run restores from the page before it starts.
// Usage: node usmarket/pipeline/restore.mjs <artifact html saved by Artifact read>
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const at = f => new URL(f, import.meta.url);
const html = readFileSync(process.argv[2], 'utf8');
const grab = id => {
  const m = html.match(new RegExp(`<script type="application/json" id="${id}">([\\s\\S]*?)</script>`));
  return m ? JSON.parse(m[1]) : null;
};
const pretty = obj => JSON.stringify(obj, null, 1).replace(/\[\n\s*([^\[\]{}]*?)\n\s*\]/g, (m, inner) => '[' + inner.replace(/,\n\s*/g, ',') + ']') + '\n';
const done = [];

for (const issue of grab('issues-data') || []) {
  const file = at(`../issues/${issue.date}.json`);
  const local = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : null;
  const newer = !local || (issue.data?.fetched || '') > (local.data?.fetched || '') ||
    ((issue.data?.fetched || '') === (local.data?.fetched || '') && JSON.stringify(issue.edit) !== JSON.stringify(local.edit) && !/TODO/.test(JSON.stringify(issue.edit)));
  if (newer) { writeFileSync(file, pretty(issue)); done.push(`issues/${issue.date}.json`); }
}

const ledger = grab('ledger-data');
const lf = at('../data/ledger.json');
if (ledger) {
  const local = existsSync(lf) ? JSON.parse(readFileSync(lf, 'utf8')) : null;
  if (!local || (ledger.lastSession || '') > (local.lastSession || '')) { writeFileSync(lf, JSON.stringify(ledger) + '\n'); done.push(`data/ledger.json → ${ledger.lastSession}`); }
}

const bt = grab('bt-data');
const bf = at('../data/backtest.json');
if (bt) {
  const local = existsSync(bf) ? JSON.parse(readFileSync(bf, 'utf8')) : null;
  if (!local || (bt.built || '') > (local.built || '')) { writeFileSync(bf, JSON.stringify(bt) + '\n'); done.push(`data/backtest.json → ${bt.built}`); }
}

console.log(done.length ? `从页面恢复：\n  ${done.join('\n  ')}` : '仓库已是最新，无需恢复');
