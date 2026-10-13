// Inline the sources into one self-contained page (the Artifact wraps it in <html>/<body>),
// after checking that every cited source exists and every step and institution is well-formed.
import { readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import vm from 'node:vm';
const src = f => readFileSync(new URL('./src/' + f, import.meta.url), 'utf8');
const repo = p => new URL('../' + p, import.meta.url);
const DATA = ['fund-data.js', 'product-data.js', 'projects.js'];
const app = [...DATA, 'core.js', 'ui.js', 'fund.js', 'product.js', 'boot.js'].map(src).join('\n');

// ----- validate content -----
const D = vm.runInNewContext(DATA.map(src).join('\n') + '\n;({ SRC, ASOF, PHASES, STEPS, ROUNDS, SOURCE_TYPES, SECTORS, INSTS, LISTING, MARKET, KPI, QA, BP, MEETINGS, MEET_SRC, FUNNEL_SRC, BUILTIN, PD_PHASES, PD_STEPS, LAUNCH, LAUNCH_FORMS, PMF_RULES, AUDIT, AUDIT_DIMS, FUND_TARGETS, ROUND_IDS, RET_CATS, DEFAULT_CAT })');
const errs = [];
const need = (k, where) => { if (!D.SRC[k]) errs.push(`${where}: unknown source "${k}"`); };
for (const [k, s] of Object.entries(D.SRC)) {
  if (!/^https:\/\//.test(s.u)) errs.push(`SRC.${k}: url must be https`);
  if (!/^\d{4}(-\d{2}){0,2}$/.test(s.d)) errs.push(`SRC.${k}: date "${s.d}" must be YYYY[-MM[-DD]]`);
  if (!s.t) errs.push(`SRC.${k}: missing title`);
}
const phaseIds = new Set(D.PHASES.map(p => p.id)), typeIds = new Set(D.SOURCE_TYPES.map(t => t.id)), seen = new Set();
for (const p of D.PHASES) (p.src || []).forEach(k => need(k, `phase ${p.id}`));
for (const s of D.STEPS) {
  if (seen.has(s.id)) errs.push(`step ${s.id}: duplicate id`); seen.add(s.id);
  if (!/^[a-z0-9-]+$/.test(s.id)) errs.push(`step ${s.id}: id must be [a-z0-9-]`);
  if (!phaseIds.has(s.ph)) errs.push(`step ${s.id}: unknown phase ${s.ph}`);
  (s.src || []).forEach(k => need(k, `step ${s.id}`));
}
for (const r of D.ROUNDS) { (r.src || []).forEach(k => need(k, `round ${r.id}`)); if (r.avg) need(r.avg.src, `round ${r.id} avg`); r.who.forEach(t => typeIds.has(t) || errs.push(`round ${r.id}: unknown type ${t}`)); }
for (const t of D.SOURCE_TYPES) (t.src || []).forEach(k => need(k, `type ${t.id}`));
for (const [k, s] of Object.entries(D.SECTORS)) for (const t of typeIds) { if (!(t in s.fit)) errs.push(`sector ${k}: no fit for ${t}`); if (!s.why[t]) errs.push(`sector ${k}: no why for ${t}`); }
const instIds = new Set();
for (const i of D.INSTS) {
  if (instIds.has(i.id)) errs.push(`inst ${i.id}: duplicate id`); instIds.add(i.id);
  if (!/^[a-z0-9-]+$/.test(i.id)) errs.push(`inst ${i.id}: id must be [a-z0-9-]`);
  if (!typeIds.has(i.type)) errs.push(`inst ${i.id}: unknown type ${i.type}`);
  if (!/^https:\/\//.test(i.src)) errs.push(`inst ${i.id}: source must be https`);
  if (!i.ev || !i.focus || !i.srcT) errs.push(`inst ${i.id}: missing evidence`);
}
for (const l of D.LISTING) l.src.forEach(k => need(k, `listing ${l.b}`));
for (const m of [...D.MARKET, ...D.KPI]) need(m.src, `market ${m.l}`);
for (const q of D.QA) (q.src || []).forEach(k => need(k, `qa ${q.q}`));
[...D.MEET_SRC, ...D.FUNNEL_SRC].forEach(k => need(k, 'pitch notes'));
for (const p of D.BUILTIN) {
  (p.flags || []).forEach(f => (f.src || []).forEach(k => need(k, `${p.id} flag ${f.t}`)));
  (p.qa || []).forEach(q => (q.src || []).forEach(k => need(k, `${p.id} qa ${q.q}`)));
  if (!D.SECTORS[p.sector]) errs.push(`${p.id}: unknown sector`);
  if (p.kpi) need(p.kpi.src, `${p.id} kpi`);
  (p.precedents || []).forEach(c => { if (!/^https:\/\//.test(c.src) || !c.co || !c.deal || !c.d) errs.push(`${p.id} precedent ${c.co}: needs https src, deal and date`); });
  for (const k of Object.keys(p.why || {})) if (!typeIds.has(k)) errs.push(`${p.id}: why for unknown type ${k}`);
  for (const k of Object.keys(p.bp || {})) if (!D.BP.some(b => b.id === k)) errs.push(`${p.id}: bp for unknown slide ${k}`);
}
// ----- product module -----
const pdPhases = new Set(D.PD_PHASES.map(p => p.id)), pdSteps = new Set(D.PD_STEPS.map(s => s.id));
for (const s of D.PD_STEPS) {
  if (seen.has(s.id)) errs.push(`step ${s.id}: duplicate id (across modules)`); seen.add(s.id);
  if (!/^pd-[a-z0-9-]+$/.test(s.id)) errs.push(`step ${s.id}: product step ids start with pd-`);
  if (!pdPhases.has(s.ph)) errs.push(`step ${s.id}: unknown product phase ${s.ph}`);
  (s.src || []).forEach(k => need(k, `step ${s.id}`));
  (s.links || []).forEach(l => seen.has(l) || D.STEPS.some(x => x.id === l) || errs.push(`step ${s.id}: links to unknown step ${l}`));
}
for (const r of D.LAUNCH) {
  for (const f of D.LAUNCH_FORMS) if (!['must', 'maybe', 'no'].includes(r.v[f.id])) errs.push(`launch ${r.id}: no value for ${f.id}`);
  if (!r.src || !r.src.length) errs.push(`launch ${r.id}: needs a source`); (r.src || []).forEach(k => need(k, `launch ${r.id}`));
  if (r.step && !pdSteps.has(r.step)) errs.push(`launch ${r.id}: unknown step ${r.step}`);
}
// product.js evaluates exactly these four rules and reads exactly these metric fields
const RULE_IDS = ['data', 'ellis', 'flat', 'height'], METRIC_KEYS = ['wau', 'newUsers', 'payers', 'revenue'];
if (D.PMF_RULES.map(x => x.id).join() !== RULE_IDS.join()) errs.push(`pmf rules must be ${RULE_IDS.join(', ')} in that order`);
for (const x of D.PMF_RULES) x.src.forEach(k => need(k, `pmf rule ${x.id}`));
for (const id of D.ROUND_IDS) if (!D.FUND_TARGETS[id]) errs.push(`fund targets: missing round ${id}`);
for (const ts of Object.values(D.FUND_TARGETS)) for (const x of ts) {
  if (x.step && !pdSteps.has(x.step)) errs.push(`fund target "${x.t}": unknown step ${x.step}`);
  if (x.rule && x.rule !== 'all' && !RULE_IDS.includes(x.rule)) errs.push(`fund target "${x.t}": unknown rule ${x.rule}`);
  if (x.metric && !METRIC_KEYS.includes(x.metric)) errs.push(`fund target "${x.t}": unknown metric ${x.metric}`);
}
const catIds = new Set(D.RET_CATS.map(c => c.id)), sectorIds = new Set(Object.keys(D.SECTORS)), projIds = new Set(D.BUILTIN.map(p => p.id));
for (const k of sectorIds) if (!catIds.has(D.DEFAULT_CAT[k])) errs.push(`default retention category for sector ${k}: "${D.DEFAULT_CAT[k]}" is not in RET_CATS`);
for (const s of [...D.STEPS, ...D.PD_STEPS]) {
  (s.only || []).forEach(k => sectorIds.has(k) || errs.push(`step ${s.id}: only for unknown sector ${k}`));
  Object.keys(s.tip || {}).forEach(k => sectorIds.has(k) || projIds.has(k) || errs.push(`step ${s.id}: tip for unknown project or sector ${k}`));
}
for (const r of D.LAUNCH) (r.for || []).forEach(k => sectorIds.has(k) || errs.push(`launch ${r.id}: for unknown sector ${k}`));
for (const [pid, a] of Object.entries(D.AUDIT)) {
  if (!D.BUILTIN.some(p => p.id === pid)) errs.push(`audit ${pid}: unknown project`);
  for (const d of D.AUDIT_DIMS) {
    const c = a[d.id]; if (!c) { errs.push(`audit ${pid}.${d.id}: missing`); continue; }
    if (!['ok', 'part', 'gap'].includes(c.st)) errs.push(`audit ${pid}.${d.id}: bad status`);
    const [file, line, ...rest] = c.ev.split(':');
    if (rest.length || (line !== undefined && !/^[1-9]\d*$/.test(line))) errs.push(`audit ${pid}.${d.id}: evidence must be path or path:line, got ${c.ev}`);
    else if (!existsSync(repo(file)) || !statSync(repo(file)).isFile()) errs.push(`audit ${pid}.${d.id}: evidence file ${file} not found`);
    else if (line) { const t = readFileSync(repo(file), 'utf8'), n = t.split('\n').length - (t.endsWith('\n') ? 1 : 0); if (+line > n) errs.push(`audit ${pid}.${d.id}: ${file} has only ${n} lines, no line ${line}`); }
    if (c.step && !pdSteps.has(c.step)) errs.push(`audit ${pid}.${d.id}: unknown step ${c.step}`);
    if (c.st !== 'ok' && !c.step && d.id !== 'resilience') errs.push(`audit ${pid}.${d.id}: a gap needs a step`);
  }
}
// inline citations written as [[key]] anywhere in the copy
const copy = DATA.map(src).join('\n');
for (const m of copy.matchAll(/\[\[([^\]]+)\]\]/g)) need(m[1], 'inline [[...]]');
if (errs.length) { console.error(errs.join('\n')); if (!process.env.DRAFT) process.exit(1); console.error(`DRAFT: ${errs.length} problems ignored`); }

const html = `<title>事业 OS</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=Noto+Sans+SC:wght@400;500;700;900&display=swap">
<style>${src('style.css')}</style>
${src('body.html')}
<script>(()=>{'use strict';
${app}
})();</script>
`;
if (/<\/script/i.test(app)) throw new Error('inline script contains </script');
writeFileSync(new URL('./index.html', import.meta.url), html);
console.log('index.html', (html.length / 1024).toFixed(1) + ' KB', '·', D.STEPS.length, '+', D.PD_STEPS.length, 'steps ·', D.INSTS.length, 'institutions ·', D.LAUNCH.length, 'launch rules ·', Object.keys(D.SRC).length, 'sources');
