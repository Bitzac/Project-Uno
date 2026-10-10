// Scoring functions checked against hand-computed values from the official tables. Run: node --test test/standards.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = f => readFileSync(new URL('../src/' + f, import.meta.url), 'utf8');
const prelude = 'const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));const num=v=>(v===null||v===undefined||v===""||!isFinite(+v))?null:+v;const pad2=n=>String(n).padStart(2,"0");const parseD=s=>{const[y,m,d]=String(s).split("-").map(Number);return new Date(y,(m||1)-1,d||1)};const nf=(v,d=0)=>Number(v).toFixed(d);';
const S = new Function(prelude + read('refdata.js') + read('standards.js') +
  'return { gbItemScore, gbBonus, gbEvaluate, whoZ, whoAt, phi, SCREENS, usLetter, levelOf, termKey, termName, snellenDen, who5Band };')();

test('国标 single-item scores', () => {
  assert.equal(S.gbItemScore('run', 'M', 9, 220), 100);       // 初三男 1000 米 3'40"
  assert.equal(S.gbItemScore('r50', 'M', 9, 9.7), 60);
  assert.equal(S.gbItemScore('r50', 'M', 9, 9.8), 50);
  assert.equal(S.gbItemScore('r50', 'M', 9, 11.0), 0);
  assert.equal(S.gbItemScore('sr', 'F', 1, 2.4), 60);
  assert.equal(S.gbItemScore('pullup', 'M', 7, 1), 30);
  assert.equal(S.gbItemScore('bmi', 'M', 1, 18.15), 80);       // rounds to 18.2 → overweight
  assert.equal(S.gbItemScore('bmi', 'M', 1, 20.4), 60);
});

test('国标 bonus points', () => {
  assert.equal(S.gbBonus('run', 'M', 9, 216), 1);
  assert.equal(S.gbBonus('run', 'M', 9, 185), 10);
  assert.equal(S.gbBonus('pullup', 'M', 7, 16), 3);
  assert.equal(S.gbBonus('situp', 'F', 8, 55), 2);
  assert.equal(S.gbBonus('rope', 'M', 1, 125), 8);
  assert.equal(S.gbBonus('bmi', 'M', 1, 20), 0);
});

test('国标 weighted total', () => {
  const r = S.gbEvaluate({ items: { bmi: 19.8, vc: 2900, r50: 8.9, sr: 9.0, jump: 175, situp: 40, run: 235 } }, 'F', 8);
  assert.equal(r.std, 84.2);
  assert.equal(r.total, 84.2);
  assert.equal(S.gbEvaluate({ items: { vc: 2900 } }, 'F', 8).total, null);
});

test('WHO 2007 z-scores', () => {
  assert.equal(+S.whoZ('bmi', 'M', 61, 15.2641).toFixed(4), 0);
  assert.equal(+S.whoZ('bmi', 'M', 61, 18.259).toFixed(2), 2);
  assert.equal(+S.whoZ('hfa', 'F', 228, 163.1548).toFixed(4), 0);
  assert.equal(+S.whoAt('bmi', 'M', 61, 2).toFixed(2), 18.26);
  assert.equal(+S.phi(1.6449).toFixed(3), 0.95);
});

test('screening bands and grades', () => {
  assert.deepEqual(S.SCREENS.SDQ.band(15, 'self'), ['略高', 'warn']);
  assert.deepEqual(S.SCREENS.SDQ.band(14, 'self'), ['接近平均', 'ok']);
  assert.deepEqual(S.SCREENS.SDQ.band(20, 'parent'), ['很高', 'bad']);
  assert.equal(S.SCREENS['GAD-7'].alert(10), true);
  assert.deepEqual(S.who5Band(52), ['良好', 'ok']);
  assert.deepEqual(S.usLetter(91.5), [90, 'A-', 3.7]);
  assert.deepEqual(S.levelOf('cn', 'pts', 100, 84.9), ['良好', 'ok']);
});

test('terms and vision lines', () => {
  assert.equal(S.termKey('cn', '2026-01-10'), '2025-1');
  assert.equal(S.termKey('cn', '2026-02-20'), '2025-2');
  assert.equal(S.termKey('us', '2026-08-20'), '2026-1');
  assert.equal(S.termName('uk', '2025-3'), 'Summer 2026');
  assert.equal(S.snellenDen(6, 0.794), 7.5);
  assert.equal(S.snellenDen(20, 0.63), 32);
});
