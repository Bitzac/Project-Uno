// Candidate scoring: adjustable weights, live ranking against two retrospective baselines, robustness checks.
const CRIT = V.criteria;
const CANDS = V.candidates.map(c => ({ ...c, node: NODE.get(c.id), v: Object.fromEntries(c.scores.map(s => [s.c, s.s])) }));

function readiness(id) {
  const pre = IN.get(id).filter(([, t]) => t === 'e' || t === 'a').map(([a]) => NODE.get(a));
  return { score: pre.length ? 5 * pre.filter(n => n.status !== 'future').length / pre.length : 0, pre };
}
CANDS.forEach(c => { c.ready = readiness(c.id); c.v.enablers = c.ready.score; });

const DEFAULT_W = Object.fromEntries(CRIT.map(c => [c.id, c.w]));
function loadWeights() {
  try {
    const saved = JSON.parse(store.get('pw-weights') || 'null');
    if (saved && CRIT.every(c => typeof saved[c.id] === 'number')) return saved;
  } catch { /* ignore bad storage */ }
  return { ...DEFAULT_W };
}
const norm = w => { const s = CRIT.reduce((a, c) => a + w[c.id], 0) || 1; return Object.fromEntries(CRIT.map(c => [c.id, w[c.id] / s])); };
const totalOf = (v, wn) => CRIT.reduce((a, c) => a + wn[c.id] * v[c.id], 0);
function ranked(w) {
  const wn = norm(w);
  return CANDS.map(c => ({ c, t: totalOf(c.v, wn) })).sort((a, b) => b.t - a.t);
}

// deterministic PRNG so the published numbers are reproducible
function rng(seed) { return () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296); }
function randomWeightWins(n = 20000) {
  const r = rng(20261003), wins = Object.fromEntries(CANDS.map(c => [c.id, 0]));
  for (let i = 0; i < n; i++) {
    const w = Object.fromEntries(CRIT.map(c => [c.id, -Math.log(1 - r())]));
    const wn = norm(w);
    let best = null, bv = -1;
    for (const c of CANDS) { const t = totalOf(c.v, wn); if (t > bv) { bv = t; best = c.id; } }
    wins[best]++;
  }
  return Object.fromEntries(Object.entries(wins).map(([k, v]) => [k, v / n]));
}
function perturbWins(w, n = 6000) {
  // every hand-given score moves by −1, 0 or +1 at random (clamped to 0–5); weights stay as set
  const r = rng(7), wn = norm(w), wins = Object.fromEntries(CANDS.map(c => [c.id, 0]));
  for (let i = 0; i < n; i++) {
    let best = null, bv = -1;
    for (const c of CANDS) {
      let t = 0;
      for (const k of CRIT) {
        let s = c.v[k.id];
        if (!k.auto) s = Math.max(0, Math.min(5, s + Math.floor(r() * 3) - 1));
        t += wn[k.id] * s;
      }
      if (t > bv) { bv = t; best = c.id; }
    }
    wins[best]++;
  }
  return Object.fromEntries(Object.entries(wins).map(([k, v]) => [k, v / n]));
}
const RANDOM_WINS = randomWeightWins();
const pct = x => (x * 100).toFixed(x >= 0.995 || x < 0.005 ? 0 : 1) + '%';

function initScore({ onPick }) {
  let w = loadWeights();
  let picked = CANDS[0].id;
  const wrap = $('#weights');
  wrap.innerHTML = CRIT.map(c => `<div class="w-row"><label for="w-${c.id}">${esc(c.name)}</label><input type="range" id="w-${c.id}" min="0" max="40" step="1" value="${Math.round(w[c.id] * 100)}"><output id="wo-${c.id}" for="w-${c.id}"></output><p class="d">${esc(c.d)}</p></div>`).join('');
  CRIT.forEach(c => $('#w-' + c.id).addEventListener('input', e => { w[c.id] = Number(e.target.value) / 100; update(); }));
  $('#w-reset').addEventListener('click', () => { w = { ...DEFAULT_W }; CRIT.forEach(c => { $('#w-' + c.id).value = Math.round(w[c.id] * 100); }); update(); });

  const baseTotals = wn => V.baselines.map(b => ({ b, t: totalOf(b.scores, wn) }));

  function update() {
    store.set('pw-weights', JSON.stringify(w));
    const wn = norm(w);
    CRIT.forEach(c => { $('#wo-' + c.id).textContent = Math.round(wn[c.id] * 100) + '%'; });
    const rk = ranked(w);
    const bases = baseTotals(wn);
    const pos = t => (t / 5 * 100).toFixed(2) + '%';
    $('#rank').innerHTML = `<div class="rank-axis"><span></span><div><span>0</span><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span></div><span></span></div>` +
      rk.map(({ c, t }, i) => {
        // label the higher baseline above the first row and the lower one below the last row so they never collide
        const lines = bases.map(({ b, t: bt }, j) => {
          const above = j === 0 ? bt >= bases[1].t : bt > bases[0].t;
          const show = (above && i === 0) || (!above && i === rk.length - 1);
          return `<div class="r-base${above ? '' : ' below'}" style="left:${pos(bt)}">${show ? `<span>${esc(b.name)} ${bt.toFixed(2)}</span>` : ''}</div>`;
        }).join('');
        return `<div class="r-row"><span class="nm"><i style="background:${laneVar(c.node.lane)}"></i>${esc(c.name)}</span><div class="r-track">${lines}<div class="r-fill" style="width:${pos(t)};background:${laneVar(c.node.lane)}"></div></div><b>${t.toFixed(2)}</b></div>`;
      }).join('') + '<div class="rank-pad"></div>';
    $('#rank-note').textContent = `虚线：${V.baselines.map(b => b.name).join('、')}的回看得分`;
    const pw = perturbWins(w);
    const bar = obj => {
      const list = CANDS.map(c => [c, obj[c.id]]).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
      return `<div class="bar100">${list.map(([c, v]) => `<i style="width:${v * 100}%;background:${laneVar(c.node.lane)}" title="${esc(c.name)} ${pct(v)}"></i>`).join('')}</div><div class="keys">${list.map(([c, v]) => `<span><i style="background:${laneVar(c.node.lane)}"></i>${esc(c.short)} ${pct(v)}</span>`).join('')}</div>`;
    };
    $('#robust').innerHTML = `<p><b>稳健性</b> <span class="muted">两种扰动下各候选排第一的比例</span></p><p class="small muted">权重完全随机（2 万次）</p>${bar(RANDOM_WINS)}<p class="small muted">当前权重下，每项人工打分随机 ±1（6,000 次）</p>${bar(pw)}`;

    $('#matrix').innerHTML = `<thead><tr><th>候选</th>${CRIT.map(c => `<th class="cell">${esc(c.name)}<br><span class="num">${Math.round(wn[c.id] * 100)}%</span></th>`).join('')}<th class="cell">总分</th></tr></thead><tbody>` +
      rk.map(({ c, t }) => `<tr class="cand${c.id === picked ? ' sel' : ''}" data-id="${c.id}" tabindex="0"><td class="k"><i style="background:${laneVar(c.node.lane)}"></i>${esc(c.name)}</td>${CRIT.map(k => {
        const s = c.v[k.id], on = Math.round(s);
        return `<td class="cell${k.auto ? ' auto' : ''}"><span class="meter" aria-hidden="true">${[1, 2, 3, 4, 5].map(i => `<i class="${i <= on ? 'on' : ''}"></i>`).join('')}</span><span class="num">${k.auto ? s.toFixed(1) : s}</span></td>`;
      }).join('')}<td class="cell tot">${t.toFixed(2)}</td></tr>`).join('') +
      bases.map(({ b, t }) => `<tr><td class="k muted">${esc(b.name)}</td>${CRIT.map(k => `<td class="cell auto"><span class="num">${b.scores[k.id]}</span></td>`).join('')}<td class="cell tot muted">${t.toFixed(2)}</td></tr>`).join('') + '</tbody>';
    document.querySelectorAll('#matrix tr.cand').forEach(tr => {
      const go = () => { picked = tr.dataset.id; update(); renderWhy(); };
      tr.addEventListener('click', go);
      tr.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
    });
  }

  function renderWhy() {
    const c = CANDS.find(x => x.id === picked);
    const ready = c.ready.pre.map(n => `${n.status === 'future' ? '○' : '●'} ${n.name}`).join('、');
    $('#why').innerHTML = `<h3>${esc(c.name)}：每项得分的理由</h3>` + c.scores.map(s => {
      const k = CRIT.find(x => x.id === s.c);
      return `<div class="why-item"><b>${esc(k.name)}<span>${s.s} / 5</span></b><p>${esc(s.why)}</p>${sources(s.src)}</div>`;
    }).join('') + `<div class="why-item"><b>使能就绪<span>${c.ready.score.toFixed(1)} / 5</span></b><p>网络中的直接前提（● 已实现，○ 未实现）：${esc(ready)}。</p><p><button type="button" class="link-btn" data-show="${c.id}">在大网中查看</button></p></div>`;
    $('#why').querySelector('[data-show]').addEventListener('click', () => onPick(c.id));
  }

  update();
  renderWhy();
  return { ranked: () => ranked(w), defaultRanked: () => ranked(DEFAULT_W) };
}
