// Shared data and helpers. Everything is embedded in the page; no network calls.
const DATA = JSON.parse(document.getElementById('pw-data').textContent);
const { graph: G, trends: T, niches: NICHES, verdict: V } = DATA;

const $ = s => document.querySelector(s);
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const href = u => (/^https:\/\//.test(u) ? u : '#');
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* storage blocked */ } },
};
const SVGNS = 'http://www.w3.org/2000/svg';
const svgEl = (tag, attrs = {}, parent) => {
  const el = document.createElementNS(SVGNS, tag);
  for (const k in attrs) if (attrs[k] != null) el.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(el);
  return el;
};

const LANE_IDX = Object.fromEntries(G.lanes.map((l, i) => [l.id, i]));
const LANE = Object.fromEntries(G.lanes.map(l => [l.id, l]));
const laneVar = id => `var(--l${LANE_IDX[id] + 1})`;
const laneShort = id => LANE[id].name.split('·')[0].slice(0, 2);
const NODE = new Map(G.nodes.map(n => [n.id, n]));
const KIND_NAME = { milestone: '里程碑', trend: '现状趋势', frontier: '前沿', candidate: '候选', bottleneck: '瓶颈' };
const STATUS_NAME = { past: '已实现', now: '进行中', future: '预测' };
const EDGE_NAME = { e: '促成', a: '加速', b: '约束', r: '缓解' };
const TODAY = 2026.75;

// adjacency
const OUT = new Map(G.nodes.map(n => [n.id, []]));
const IN = new Map(G.nodes.map(n => [n.id, []]));
G.edges.forEach(([a, b, t]) => { OUT.get(a).push([b, t]); IN.get(b).push([a, t]); });
function chainOf(id) {
  // all ancestors and descendants through 促成/加速 edges, plus direct 约束/缓解 neighbours
  const nodes = new Set([id]);
  const walk = (start, map) => {
    const stack = [start];
    while (stack.length) {
      const cur = stack.pop();
      for (const [nb, t] of map.get(cur)) {
        if (t !== 'e' && t !== 'a') continue;
        if (!nodes.has(nb)) { nodes.add(nb); stack.push(nb); }
      }
    }
  };
  walk(id, IN); walk(id, OUT);
  for (const [nb, t] of [...OUT.get(id), ...IN.get(id)]) if (t === 'b' || t === 'r') nodes.add(nb);
  return nodes;
}

const sources = list => (list && list.length
  ? `<div class="src">${list.map(([n, u]) => `<a href="${esc(href(u))}" target="_blank" rel="noopener">${esc(n)}</a>`).join('')}</div>`
  : '');
const DISCLOSE = '本页由 Claude 编写，Claude 由 Anthropic 开发；此条只转述公开报道和官方发布的数据。';
const yearText = n => (n.yr ? `${n.yr[0]}–${n.yr[1]}` : String(n.year));

const SUP = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
const sci = v => {
  const e = Math.floor(Math.log10(v));
  const m = v / 10 ** e;
  const ms = m.toFixed(m < 9.95 ? 1 : 0);
  return `${ms === '1.0' ? '' : ms + '×'}10${String(e).replace(/./g, c => SUP[c])}`;
};
const fmtNum = v => {
  if (v >= 1e9) return (v / 1e9).toFixed(v >= 1e10 ? 0 : 1) + 'B';
  if (v >= 1e6) return (v / 1e6).toFixed(v >= 1e7 ? 0 : 1) + 'M';
  if (v >= 1e4) return Math.round(v).toLocaleString('en-US');
  if (v >= 100) return Math.round(v).toLocaleString('en-US');
  if (v >= 10) return v.toFixed(0);
  if (v >= 1) return v.toFixed(1);
  return v.toPrecision(2);
};
const fmtYear = y => {
  const yr = Math.floor(y + 1e-6);
  const m = Math.round((y - yr) * 12) + 1;
  return Number.isInteger(y) ? String(y) : `${yr}-${String(Math.min(12, m)).padStart(2, '0')}`;
};
