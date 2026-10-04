// t（秒）→ 这一帧的全部状态。纯函数：同一个 t 永远得到同一帧，
// 所以可以多进程分段渲染，配乐也能按同一状态对齐音效。
import {
  SCENES, sceneAt, qd, qs, CAM, PRICE, DSHIFT, SSHIFT, CUES, TRADES, TOASTS,
} from './timeline.js';

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, u) => a + (b - a) * u;
export const ease = x => { x = clamp(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
export const lin = (t, a, b) => (b <= a ? (t >= a ? 1 : 0) : clamp((t - a) / (b - a)));
export const ramp = (t, a, b) => ease(lin(t, a, b));
// 淡入淡出窗口：[a, b] 内为 1，两端各 f 秒过渡
export const win = (t, a, b, f = 0.4) => Math.min(lin(t, a - f / 2, a + f / 2), 1 - lin(t, b - f / 2, b + f / 2));

export function track(t, { start, steps }) {
  let v = start;
  for (const s of steps) {
    if (t < s.at) break;
    if (!s.dur || v == null || s.to == null) { v = s.to; continue; }
    const u = ease((t - s.at) / s.dur);
    v = v + (s.to - v) * u;
    if (u < 1) break;
  }
  return v;
}

const ON_SURFACE = new Set(['equilibrium', 'demandShift', 'supplyShift', 'summary', 'outro']);

export function stateAt(t) {
  const sc = sceneAt(t);
  const rel = t - sc.t0;
  const price = track(t, PRICE);
  const dS = track(t, DSHIFT);
  const sS = track(t, SSHIFT);
  const camY = track(t, CAM);

  let buyers = 0, stock = 0, miners = 0;
  if (price != null) {
    if (sc.id === 'demand') buyers = qd(price, dS);
    if (sc.id === 'supply') miners = qs(price, sS);
    if (ON_SURFACE.has(sc.id)) { buyers = qd(price, dS); stock = qs(price, sS); }
  }

  const trade = TRADES.find(tr => t >= tr.at && t < tr.until) || null;
  let tradeInfo = null;
  if (trade) {
    // 成交量 = 需求量与供给量的较小者，按成交那一刻的价格计算
    const p0 = track(trade.at, PRICE), d0 = track(trade.at, DSHIFT), s0 = track(trade.at, SSHIFT);
    const nB = Math.round(qd(p0, d0)), nS = Math.round(qs(p0, s0));
    tradeInfo = { at: trade.at, until: trade.until, matched: Math.min(nB, nS), nB, nS, p: lin(t, trade.at, trade.at + 0.9) };
  }

  const cue = CUES.find(c => t >= c.t0 - 0.15 && t < c.t1 + 0.15) || null;
  const toast = TOASTS.find(x => t >= x.t0 - 0.5 && t < x.t1 + 0.5) || null;

  return { t, sc, rel, price, dS, sS, camY, buyers, stock, miners, trade: tradeInfo, cue, toast };
}

export { SCENES };
