// Inline the sources into one self-contained page (the Artifact wraps it in <html>/<body>),
// after checking that every cited source exists and every step and institution is well-formed.
import { readFileSync, writeFileSync } from 'node:fs';
import vm from 'node:vm';
const src = f => readFileSync(new URL('./src/' + f, import.meta.url), 'utf8');
const DATA = ['fund-data.js', 'projects.js'];
const app = [...DATA, 'core.js', 'fund.js', 'boot.js'].map(src).join('\n');

// ----- validate content -----
const D = vm.runInNewContext(DATA.map(src).join('\n') + '\n;({ SRC, ASOF, PHASES, STEPS, ROUNDS, SOURCE_TYPES, SECTORS, INSTS, LISTING, MARKET, KPI, QA, BP, MEETINGS, MEET_SRC, FUNNEL_SRC, BUILTIN })');
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
  for (const k of Object.keys(p.why || {})) if (!typeIds.has(k)) errs.push(`${p.id}: why for unknown type ${k}`);
  for (const k of Object.keys(p.bp || {})) if (!D.BP.some(b => b.id === k)) errs.push(`${p.id}: bp for unknown slide ${k}`);
}
// inline citations written as [[key]] anywhere in the copy
const copy = DATA.map(src).join('\n');
for (const m of copy.matchAll(/\[\[([^\]]+)\]\]/g)) need(m[1], 'inline [[...]]');
if (errs.length) { console.error(errs.join('\n')); process.exit(1); }

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
console.log('index.html', (html.length / 1024).toFixed(1) + ' KB', '·', D.STEPS.length, 'steps ·', D.INSTS.length, 'institutions ·', Object.keys(D.SRC).length, 'sources');
