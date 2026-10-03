// Validate the four data files, score the candidates, then inline data + sources into one page
// (the Artifact wraps it in <html>/<body>). Fails loudly so a broken edge or a missing source never ships.
import { readFileSync, writeFileSync } from 'node:fs';

const at = f => new URL(f, import.meta.url);
const src = f => readFileSync(at('./src/' + f), 'utf8');
const data = f => JSON.parse(readFileSync(at('./data/' + f), 'utf8'));

const graph = data('graph.json');
const trends = data('trends.json');
const niches = data('niches.json');
const verdict = data('verdict.json');

const errs = [];
const need = (cond, msg) => { if (!cond) errs.push(msg); };
const text = v => typeof v === 'string' && v.trim().length > 0;
const srcOk = (s, where) => {
  need(Array.isArray(s) && s.length > 0, `${where}: src 至少一条`);
  (s || []).forEach((p, i) => need(Array.isArray(p) && text(p[0]) && /^https:\/\//.test(p[1] || ''), `${where}: src[${i}] 需要 [名称, https 链接]`));
};

// graph
const KINDS = ['milestone', 'trend', 'frontier', 'candidate', 'bottleneck'];
const STATUS = ['past', 'now', 'future'];
const EDGE_TYPES = { e: '促成', a: '加速', b: '约束', r: '缓解' };
const lanes = new Set(graph.lanes.map(l => l.id));
const byId = new Map();
for (const n of graph.nodes) {
  const w = `node ${n.id}`;
  need(!byId.has(n.id), `${w}: id 重复`);
  byId.set(n.id, n);
  need(lanes.has(n.lane), `${w}: lane ${n.lane} 不存在`);
  need(Number.isFinite(n.year) && n.year >= 1760 && n.year <= 2045, `${w}: year 应在 1760–2045`);
  need(KINDS.includes(n.kind), `${w}: kind 不合法`);
  need(STATUS.includes(n.status), `${w}: status 不合法`);
  ['name', 'en', 'one'].forEach(k => need(text(n[k]), `${w}.${k} 为空`));
  if (n.status === 'future') need(Array.isArray(n.yr) && n.yr[0] <= n.year && n.year <= n.yr[1], `${w}: future 节点需要包含 year 的 yr 区间`);
  if (n.kind === 'candidate') need(n.status === 'future', `${w}: 候选必须是 future`);
  (n.figs || []).forEach((f, i) => need(text(f.v) && text(f.l), `${w}.figs[${i}] 需要 v 和 l`));
  srcOk(n.src, w);
}
for (const [a, b, t] of graph.edges) {
  const w = `edge ${a}→${b}`;
  need(byId.has(a) && byId.has(b), `${w}: 端点不存在`);
  need(t in EDGE_TYPES, `${w}: 类型 ${t} 不合法`);
  if (byId.has(a) && byId.has(b) && (t === 'e' || t === 'a')) need(byId.get(a).year <= byId.get(b).year + 2, `${w}: 促成/加速边不能从晚的节点指向早的节点`);
}
const deg = new Map([...byId.keys()].map(k => [k, 0]));
graph.edges.forEach(([a, b]) => { deg.set(a, deg.get(a) + 1); deg.set(b, deg.get(b) + 1); });
for (const [k, d] of deg) need(d > 0, `node ${k}: 孤立节点`);
for (const e of graph.eras) {
  need(byId.has(e.bang) && byId.get(e.bang).year === e.start, `era ${e.id}: bang 节点年份应等于 start`);
  srcOk(e.src, `era ${e.id}`);
}

// trends
const chartIds = new Set();
for (const s of trends.series) {
  const w = `trend ${s.id}`;
  chartIds.add(s.id);
  need(text(s.title) && text(s.unit) && text(s.asof), `${w}: title/unit/asof 为空`);
  need(Array.isArray(s.points) && s.points.length >= 3, `${w}: 至少 3 个点`);
  s.points.forEach((p, i) => {
    need(Number.isFinite(p[0]) && Number.isFinite(p[1]), `${w}.points[${i}] 应为数字`);
    if (s.log) need(p[1] > 0, `${w}.points[${i}] 对数轴要求正数`);
    if (i && s.kind !== 'scatter') need(p[0] > s.points[i - 1][0], `${w}: 年份应递增`);
  });
  srcOk(s.src, w);
}
const kpiIds = new Set(trends.kpis.map(k => k.id));
trends.kpis.forEach(k => { need(text(k.v) && text(k.l), `kpi ${k.id}: v/l 为空`); srcOk(k.src, `kpi ${k.id}`); });
for (const n of graph.nodes) if (n.chart) need(chartIds.has(n.chart), `node ${n.id}: chart ${n.chart} 不存在`);

// niches
niches.items.forEach(x => {
  const w = `niche ${x.id}`;
  ['name', 'now', 'fig', 'figl', 'next'].forEach(k => need(text(x[k]), `${w}.${k} 为空`));
  need(byId.has(x.node), `${w}: node 不存在`);
  need(byId.get(x.cand)?.kind === 'candidate', `${w}: cand 不是候选节点`);
  need(Array.isArray(x.win) && x.win[0] <= x.win[1], `${w}: win 需要 [起, 止]`);
  srcOk(x.src, w);
});

// verdict
const crit = verdict.criteria;
const wsum = crit.reduce((s, c) => s + c.w, 0);
need(Math.abs(wsum - 1) < 1e-9, `criteria: 权重之和应为 1，现在是 ${wsum}`);
const manual = crit.filter(c => !c.auto).map(c => c.id);
for (const c of verdict.candidates) {
  const w = `candidate ${c.id}`;
  need(byId.get(c.id)?.kind === 'candidate', `${w}: 图中没有这个候选节点`);
  need(c.scores.map(s => s.c).join() === manual.join(), `${w}: scores 顺序应为 ${manual.join(', ')}`);
  c.scores.forEach(s => {
    need(Number.isInteger(s.s) && s.s >= 0 && s.s <= 5, `${w}.${s.c}: 得分应为 0–5 的整数`);
    need(text(s.why), `${w}.${s.c}: why 为空`);
    srcOk(s.src, `${w}.${s.c}`);
  });
}
need(graph.nodes.filter(n => n.kind === 'candidate').length === verdict.candidates.length, '每个候选节点都要在 verdict.candidates 里打分');
verdict.baselines.forEach(b => crit.forEach(c => need(Number.isInteger(b.scores[c.id]), `baseline ${b.id}.${c.id} 缺失`)));
verdict.counterpoints.forEach((x, i) => { need(text(x.t) && text(x.b), `counterpoints[${i}] 为空`); srcOk(x.src, `counterpoints[${i}]`); });
verdict.watchlist.forEach((x, i) => { need(text(x.k) && text(x.now) && text(x.th) && text(x.m), `watchlist[${i}] 为空`); srcOk(x.src, `watchlist[${i}]`); });
verdict.chain.forEach((x, i) => need(text(x.h) && text(x.what) && text(x.ev) && byId.has(x.node), `chain[${i}] 字段为空或节点不存在`));
verdict.conclusion.figs.forEach((f, i) => need(text(f.v) && text(f.l) && byId.has(f.node), `conclusion.figs[${i}] 字段为空或节点不存在`));
need(verdict.tour.length === 8, 'tour 应为 8 步');
verdict.tour.forEach(t => {
  const w = `tour ${t.id}`;
  need(text(t.title) && Array.isArray(t.body) && t.body.every(text), `${w}: title/body 为空`);
  need(Array.isArray(t.range) && t.range[0] < t.range[1], `${w}: range 不合法`);
  t.focus.forEach(id => need(byId.has(id), `${w}: focus 节点 ${id} 不存在`));
  if (t.chart) need(chartIds.has(t.chart), `${w}: chart ${t.chart} 不存在`);
  (t.kpis || []).forEach(k => need(kpiIds.has(k), `${w}: kpi ${k} 不存在`));
});

if (errs.length) throw new Error('数据校验失败:\n  - ' + errs.join('\n  - '));

// Scores, recomputed here only to print a summary; the page computes the same thing live.
const readiness = id => {
  const pre = graph.edges.filter(([, b, t]) => b === id && (t === 'e' || t === 'a')).map(([a]) => byId.get(a));
  return pre.length ? 5 * pre.filter(n => n.status !== 'future').length / pre.length : 0;
};
const rows = verdict.candidates.map(c => {
  const v = Object.fromEntries(c.scores.map(s => [s.c, s.s]));
  v.enablers = readiness(c.id);
  return { id: c.id, name: c.name, v, total: crit.reduce((s, k) => s + k.w * v[k.id], 0) };
}).sort((a, b) => b.total - a.total);

// Monte Carlo over uniform-random weights (Dirichlet(1,…,1)): how often each candidate ranks first.
let seed = 20261003;
const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
const wins = Object.fromEntries(rows.map(r => [r.id, 0]));
const N = 20000;
for (let i = 0; i < N; i++) {
  const w = crit.map(() => -Math.log(1 - rand()));
  const s = w.reduce((a, b) => a + b, 0);
  let best = null, bestV = -1;
  for (const r of rows) {
    const t = crit.reduce((acc, k, j) => acc + (w[j] / s) * r.v[k.id], 0);
    if (t > bestV) { bestV = t; best = r.id; }
  }
  wins[best]++;
}

const payload = JSON.stringify({ graph, trends, niches, verdict }).replace(/</g, '\\u003c');
const app = ['util.js', 'graph.js', 'charts.js', 'score.js', 'app.js'].map(src).join('\n');
if (/<\/script/i.test(app)) throw new Error('inline script contains </script');
const html = `<title>互联网、AI，下一个是？</title>
<meta name="description" content="1760–2045 年人类技术路径网络：从五次技术浪潮、互联网和 AI 的数据出发，给下一个技术浪潮的候选打分。">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,200..900&family=Noto+Sans+SC:wght@300;400;500;700;900&family=JetBrains+Mono:wght@400;600&display=swap">
<style>${src('style.css')}</style>
${src('body.html')}
<script type="application/json" id="pw-data">${payload}</script>
<script>(()=>{'use strict';
${app}
})();</script>
`;
writeFileSync(at('./index.html'), html);

const nsrc = new Set();
const walk = v => { if (Array.isArray(v)) { if (v.length === 2 && typeof v[1] === 'string' && /^https:\/\//.test(v[1])) nsrc.add(v[1]); else v.forEach(walk); } else if (v && typeof v === 'object') Object.values(v).forEach(walk); };
walk({ graph, trends, niches, verdict });
console.log(`index.html ${(html.length / 1024).toFixed(1)} KB · ${graph.nodes.length} 节点 · ${graph.edges.length} 条边 · ${nsrc.size} 个来源链接`);
console.log('默认权重得分：');
rows.forEach(r => console.log(`  ${r.total.toFixed(2)}  ${r.name}  就绪度 ${r.v.enablers.toFixed(2)}  随机权重第一 ${(100 * wins[r.id] / N).toFixed(1)}%`));
verdict.baselines.forEach(b => console.log(`  ${crit.reduce((s, k) => s + k.w * b.scores[k.id], 0).toFixed(2)}  ${b.name}（刻度线）`));
