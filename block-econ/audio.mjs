// 配乐与音效：纯代码合成，写出 out/audio.wav（44.1kHz 单声道 16-bit）。
// 有配音时（src/voice.js + out/voice/*.wav），人声按字幕时间放入，背景乐和音效在人声期间自动压低。
// 背景乐是原创的音符盒风格循环（C–Am–F–G，96 BPM）；
// 音效按 state.js 逐帧采样触发，所以和画面里的人物出现、成交、曲线绘制严格同步。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DURATION, SCENES, CUES, TRADES, TOASTS, DEMAND_PTS, SUPPLY_PTS, DRAW, SUMMARY_ROW_AT, INSIGHTS, qd, qs } from './src/timeline.js';
import { stateAt, clamp } from './src/state.js';

const SR = 44100;
const N = Math.ceil((DURATION + 0.2) * SR);
const music = new Float32Array(N);
const sfx = new Float32Array(N);
const TAU = Math.PI * 2;
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
const S = Object.fromEntries(SCENES.map(s => [s.id, s]));

function add(buf, t0, dur, fn) {
  const i0 = Math.floor(t0 * SR), n = Math.floor(dur * SR);
  for (let i = 0; i < n; i++) { const k = i0 + i; if (k >= 0 && k < N) buf[k] += fn(i / SR); }
}
function rng(seed) { return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }; }

// —— 乐器 ——
function pluck(buf, t0, midi, vol, decay = 0.5, bright = 0.5) {
  const f = mtof(midi);
  add(buf, t0, Math.min(decay * 6, 4), t => {
    const env = Math.min(1, t / 0.004) * Math.exp(-t / decay), w = TAU * f * t;
    return vol * env * (Math.sin(w) + bright * 0.5 * Math.sin(2 * w) * Math.exp(-t / (decay * 0.5)) + bright * 0.22 * Math.sin(3 * w) * Math.exp(-t / (decay * 0.3)));
  });
}
function bassNote(buf, t0, midi, vol, dur) {
  const f = mtof(midi);
  add(buf, t0, dur + 0.2, t => {
    const ph = (f * t) % 1, tri = 4 * Math.abs(ph - 0.5) - 1;
    return vol * tri * Math.min(1, t / 0.01) * Math.exp(-t / 0.55) * (t > dur ? Math.exp(-(t - dur) / 0.05) : 1);
  });
}
function pad(buf, t0, midis, vol, dur) {
  for (const m of midis) for (const det of [-0.06, 0.06]) {
    const f = mtof(m + det);
    add(buf, t0, dur + 0.8, t => vol * Math.sin(TAU * f * t) * Math.min(1, t / 0.6) * (t > dur ? Math.max(0, 1 - (t - dur) / 0.8) : 1));
  }
}
const sq = w => Math.sin(w) + Math.sin(3 * w) / 3 + Math.sin(5 * w) / 5; // 柔和方波（只取前三个奇次谐波）
function blip(buf, t0, f0, f1, dur, vol) {
  let ph = 0;
  add(buf, t0, dur, t => { const f = f0 + (f1 - f0) * (t / dur); ph += TAU * f / SR; return vol * sq(ph) * Math.min(1, t / 0.003) * (1 - t / dur); });
}
function noiseSweep(buf, t0, dur, vol, c0, c1, seed = 1) {
  const r = rng(seed); let y = 0;
  add(buf, t0, dur, t => {
    const u = t / dur, c = c0 + (c1 - c0) * u, a = 1 - Math.exp(-TAU * c / SR);
    y += a * ((r() * 2 - 1) - y);
    return vol * y * Math.sin(Math.PI * u);
  });
}
function tink(buf, t0, vol, seed) {
  const r = rng(seed);
  add(buf, t0, 0.09, t => vol * ((r() * 2 - 1) * Math.exp(-t / 0.008) * 0.6 + Math.sin(TAU * (2100 + seed % 300) * t) * Math.exp(-t / 0.03)));
}

// —— 背景乐 ——
const BEAT = 60 / 96, BAR = BEAT * 4;
const CHORDS = [[60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62]];
const PENTA = [67, 69, 72, 74, 76, 79, 81, 84];
function makePhrase(seed) {
  // 两小节一句：8 个八分音符位置 × 2，强拍取和弦音、弱拍取五声音阶邻音，部分位置留空
  const r = rng(seed), notes = [];
  for (let bar = 0; bar < 2; bar++) for (let k = 0; k < 8; k++) {
    if (k % 2 && r() < 0.55) continue;
    if (!(k % 2) && r() < 0.18) continue;
    notes.push({ bar, k, pick: r(), long: r() < 0.3 });
  }
  return notes;
}
const PHRASES = [makePhrase(7), makePhrase(19), makePhrase(31), makePhrase(53)];
const ORDER = [0, 1, 0, 2, 0, 1, 3, 2];

const bars = Math.ceil(DURATION / BAR);
for (let b = 0; b < bars; b++) {
  const t0 = b * BAR, ch = CHORDS[b % 4];
  if (t0 >= DURATION - 0.5) break;
  pad(music, t0, ch.map(m => m - 12), 0.012, BAR);
  bassNote(music, t0, ch[0] - 12, 0.07, BEAT * 1.5);
  bassNote(music, t0 + BEAT * 2, ch[0] - 12, 0.055, BEAT * 1.5);
  const arp = [0, 1, 2, 1, 0, 1, 2, 3];
  for (let k = 0; k < 8; k++) {
    const m = arp[k] === 3 ? ch[0] + 12 : ch[arp[k]];
    pluck(music, t0 + k * BEAT / 2, m + 12, 0.035, 0.32, 0.25);
  }
  if (b >= 2) {
    const phrase = PHRASES[ORDER[Math.floor(b / 2) % ORDER.length]];
    for (const n of phrase.filter(n => n.bar === b % 2)) {
      const strong = n.k % 2 === 0;
      const pool = strong ? PENTA.filter(m => ch.some(c => (m - c) % 12 === 0)) : PENTA;
      const m = pool[Math.floor(n.pick * pool.length)];
      pluck(music, t0 + n.k * BEAT / 2, m, 0.07, n.long ? 0.9 : 0.5, 0.55);
    }
  }
}
pad(music, DURATION - 3.2, [48, 55, 60, 64], 0.02, 2.4); // 收尾和弦

// —— 音效 ——
const visible = x => clamp(Math.floor(x + 0.75), 0, 7); // 与 world.js 中 alpha≥0.5 的人数一致
let prev = stateAt(0);
let prevGap = Infinity;
const DT = 1 / 120;
const minerFrame = new Array(7).fill(0);
for (let t = DT; t < DURATION; t += DT) {
  const s = stateAt(t);
  if (s.sc.id !== prev.sc.id && s.sc.id !== 'outro') noiseSweep(sfx, t, 0.5, 0.16, 300, 3200, Math.floor(t));
  const dB = visible(s.buyers) - visible(prev.buyers);
  if (dB > 0) blip(sfx, t, 520, 900, 0.07, 0.05);
  if (dB < 0) blip(sfx, t, 420, 280, 0.06, 0.035);
  if (visible(s.stock) > visible(prev.stock)) { pluck(sfx, t, 93, 0.05, 0.12, 0.2); pluck(sfx, t + 0.02, 100, 0.03, 0.1, 0.1); }
  if (visible(s.miners) > visible(prev.miners)) blip(sfx, t, 300, 620, 0.09, 0.05);
  if (s.price != null && prev.price != null && Math.round(s.price) !== Math.round(prev.price)) blip(sfx, t, 1400, 1400, 0.018, 0.025);
  if (s.sc.id === 'supply') {
    // 只让前 3 名矿工发声，避免 7 人同时敲击连成噪声
    const active = Math.min(3, Math.floor(s.miners + 1e-6));
    for (let i = 0; i < active; i++) {
      const f = Math.floor(t * 3 + i * 0.37) % 2;
      if (f === 1 && minerFrame[i] === 0) tink(sfx, t, 0.035, i * 97 + Math.floor(t * 10));
      minerFrame[i] = f;
    }
  }
  // 价格到达均衡（缺口收敛到 0）时的提示音
  if (s.price != null && ['equilibrium', 'demandShift', 'supplyShift'].includes(s.sc.id)) {
    const gap = Math.abs(qs(s.price, s.sS) - qd(s.price, s.dS));
    if (gap < 0.3 && prevGap >= 0.3 && t > S.equilibrium.t0 + 3) [72, 76, 79, 84].forEach((m, i) => pluck(sfx, t + i * 0.05, m + 12, 0.05, 0.6, 0.4));
    prevGap = gap;
  } else prevGap = Infinity;
  prev = s;
}
[...DEMAND_PTS, ...SUPPLY_PTS].forEach((p, i) => pluck(sfx, p.at, 79 + (i % 4) * 2, 0.06, 0.25, 0.4));
for (const [k, dir] of [['demand', -1], ['supply', 1]]) {
  const { t0, t1 } = DRAW[k], notes = dir > 0 ? PENTA.slice(0, 6) : PENTA.slice(2).reverse();
  notes.forEach((m, i) => pluck(sfx, t0 + (t1 - t0) * i / notes.length, m + 12, 0.045, 0.3, 0.3));
}
for (const tr of TRADES) {
  const p = stateAt(tr.at).trade;
  for (let i = 0; i < p.matched; i++) pluck(sfx, tr.at + i * 0.15 + 0.6, [88, 91, 93, 96][i % 4], 0.06, 0.22, 0.2);
  const done = tr.at + Math.max(0, p.matched - 1) * 0.15 + 0.6;
  if (p.nS > p.matched) blip(sfx, done + 0.1, 160, 90, 0.2, 0.09);
  if (p.nB > p.matched) { blip(sfx, done + 0.1, 330, 330, 0.08, 0.05); blip(sfx, done + 0.22, 247, 247, 0.12, 0.05); }
}
for (const x of TOASTS) [72, 76, 79, 84, 88].forEach((m, i) => pluck(sfx, x.t0 + i * 0.07, m, 0.06, 0.4, 0.5));
for (const ins of Object.values(INSIGHTS)) { pluck(sfx, ins.at, 84, 0.04, 0.4, 0.3); pluck(sfx, ins.at + 0.08, 91, 0.04, 0.5, 0.3); }
SUMMARY_ROW_AT.forEach((at, i) => pluck(sfx, at, 76 + i * 3, 0.04, 0.25, 0.3));
pad(sfx, 0.4, [60, 67, 72, 76], 0.015, 2.5);

// —— 人声：读入每句配音，按字幕时间摆放 ——
const ROOT = path.dirname(fileURLToPath(import.meta.url));
const voice = new Float32Array(N);
const duckOn = new Uint8Array(N);
function readWav(file) {
  const b = fs.readFileSync(file);
  let o = 12;
  while (o < b.length - 8) {
    const id = b.toString('ascii', o, o + 4), len = b.readUInt32LE(o + 4);
    if (id === 'data') return Float32Array.from({ length: len / 2 }, (_, i) => b.readInt16LE(o + 8 + i * 2) / 32768);
    o += 8 + len;
  }
  throw new Error('no data chunk: ' + file);
}
let voiced = 0;
for (const c of CUES) {
  if (!c.voice) continue;
  const clip = readWav(path.join(ROOT, 'out/voice', c.voice.file));
  const i0 = Math.round(c.voice.at * SR);
  for (let j = 0; j < clip.length && i0 + j < N; j++) voice[i0 + j] += clip[j];
  for (let j = Math.max(0, i0 - Math.round(0.1 * SR)); j < Math.min(N, i0 + clip.length + Math.round(0.05 * SR)); j++) duckOn[j] = 1;
  voiced++;
}

// —— 混音：人声期间背景乐 −14 dB 并切掉 600 Hz 以下、音效 −8 dB（起 0.12s / 收 0.35s 平滑），整体软削波，首尾淡入淡出 ——
// 这些参数按成片识别回转定：只压音量时，贝斯和铺底和弦会盖住"愿"字的鼻音韵尾（被识别成"月"），
// 让出 600 Hz 以下后，背景乐不必压到 −23 dB 也能听清。
const musicHP = new Float32Array(music);
{
  const a = Math.exp(-2 * Math.PI * 600 / SR);
  for (let pass = 0; pass < 2; pass++) {
    let lp = 0;
    for (let i = 0; i < N; i++) { lp = (1 - a) * musicHP[i] + a * lp; musicHP[i] -= lp; }
  }
}
const out = new Int16Array(N);
let peak = 0, env = 0;
const aUp = 1 - Math.exp(-1 / (0.12 * SR)), aDown = 1 - Math.exp(-1 / (0.35 * SR));
const mix = new Float32Array(N);
for (let i = 0; i < N; i++) {
  const t = i / SR;
  env += (duckOn[i] - env) * (duckOn[i] > env ? aUp : aDown);
  const fade = Math.min(1, t / 1.2) * clamp((DURATION - t) / 2.5);
  const m = music[i] * (1 - env) + musicHP[i] * env;
  mix[i] = Math.tanh(m * 0.6 * (1 - 0.8 * env) + sfx[i] * (1 - 0.6 * env) + voice[i]) * fade;
  peak = Math.max(peak, Math.abs(mix[i]));
}
const g = 0.89 / peak;
for (let i = 0; i < N; i++) out[i] = Math.round(mix[i] * g * 32767);

const OUT = path.join(ROOT, 'out');
fs.mkdirSync(OUT, { recursive: true });
const hdr = Buffer.alloc(44);
hdr.write('RIFF', 0); hdr.writeUInt32LE(36 + out.byteLength, 4); hdr.write('WAVE', 8);
hdr.write('fmt ', 12); hdr.writeUInt32LE(16, 16); hdr.writeUInt16LE(1, 20); hdr.writeUInt16LE(1, 22);
hdr.writeUInt32LE(SR, 24); hdr.writeUInt32LE(SR * 2, 28); hdr.writeUInt16LE(2, 32); hdr.writeUInt16LE(16, 34);
hdr.write('data', 36); hdr.writeUInt32LE(out.byteLength, 40);
fs.writeFileSync(path.join(OUT, 'audio.wav'), Buffer.concat([hdr, Buffer.from(out.buffer)]));
// 调试用：STEMS=1 时另存背景乐 / 音效 / 人声三条分轨（未压低、未削波）
if (process.env.STEMS) for (const [name, buf] of [['music', music], ['sfx', sfx], ['voice', voice]]) {
  const pcm = Int16Array.from(buf, v => Math.round(clamp(v * (name === 'music' ? 0.6 : 1), -1, 1) * 32767));
  fs.writeFileSync(path.join(OUT, `stem-${name}.wav`), Buffer.concat([hdr, Buffer.from(pcm.buffer)]));
}
console.log(`audio.wav ${DURATION.toFixed(2)}s, ${voiced} voice lines, peak gain ${g.toFixed(2)}`);
