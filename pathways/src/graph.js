// The 1760–2045 map: piecewise time scale, eight lanes with greedy label packing, pan/zoom, chain highlighting.
function createGraph({ svg, box, labelsEl, tip, onSelect }) {
  const BREAKS = [1760, 1900, 1990, TODAY, 2045];
  const FRACS = [0, 0.2, 0.44, 0.8, 1];
  const toU = y => {
    if (y <= BREAKS[0]) return 0;
    for (let i = 1; i < BREAKS.length; i++) if (y <= BREAKS[i]) return FRACS[i - 1] + (FRACS[i] - FRACS[i - 1]) * (y - BREAKS[i - 1]) / (BREAKS[i] - BREAKS[i - 1]);
    return 1;
  };
  const CIRCLED = ['', '①', '②', '③', '④', '⑤'];
  const PRIORITY = n => (n.kind === 'candidate' ? 0 : n.bang ? 1 : n.status === 'now' ? 2 : n.kind === 'bottleneck' ? 3 : n.kind === 'frontier' ? 4 : 5);
  const ctx = document.createElement('canvas').getContext('2d');
  const fontOf = n => (n.kind === 'candidate' ? '900 13px "Noto Sans SC", sans-serif' : n.bang ? '700 11.5px "Noto Sans SC", sans-serif' : '400 11.5px "Noto Sans SC", sans-serif');
  const measure = n => { ctx.font = fontOf(n); return ctx.measureText(n.name).width; };
  const radius = n => (n.kind === 'candidate' ? 8 : n.status === 'now' ? 5.5 : 4.5);

  let W = 0, H = 0, laneW = 104, laneH = 66, top = 52, plotX = 0, plotW = 0, compact = false;
  let view = [0, 1];
  const st = { lanes: new Set(G.lanes.map(l => l.id)), statuses: new Set(['past', 'now', 'future']), tourFocus: null, hover: null, selected: null, hits: null };
  let nodeEls = new Map(), edgeEls = [], parts = {};
  let widths = new Map();

  const X = y => plotX + (toU(y) - view[0]) / (view[1] - view[0]) * plotW;
  const laneTop = i => top + i * laneH;
  const trackY = (i, t) => laneTop(i) + (compact ? 14 : 16) + t * (compact ? 15 : 19);
  const visible = n => st.lanes.has(n.lane) && st.statuses.has(n.status);

  function measureAll() { widths = new Map(G.nodes.map(n => [n.id, measure(n)])); }

  function size() {
    W = box.clientWidth;
    compact = W < 640;
    laneW = compact ? 58 : 108;
    laneH = compact ? 52 : 64;
    top = 50;
    H = top + G.lanes.length * laneH + 26;
    plotX = laneW + 10;
    plotW = Math.max(100, W - plotX - 18);
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('height', H);
    box.style.setProperty('--lane-w', laneW + 'px');
    labelsEl.innerHTML = G.lanes.map((l, i) => `<div style="top:${laneTop(i)}px;height:${laneH}px"><i style="background:${laneVar(l.id)}"></i><p>${esc(compact ? laneShort(l.id) : l.name)}${compact ? '' : `<span>${esc(l.en)}</span>`}</p></div>`).join('');
  }

  function build() {
    svg.innerHTML = '';
    const defs = svgEl('defs', {}, svg);
    const clip = svgEl('clipPath', { id: 'plot-clip' }, defs);
    parts.clipRect = svgEl('rect', { y: 0 }, clip);
    const pat = svgEl('pattern', { id: 'future-hatch', width: 7, height: 7, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, defs);
    svgEl('line', { x1: 0, y1: 0, x2: 0, y2: 7, stroke: 'var(--accent)', 'stroke-width': 1, opacity: 0.07 }, pat);
    const plot = svgEl('g', { 'clip-path': 'url(#plot-clip)' }, svg);
    parts.era = svgEl('g', { class: 'g-era' }, plot);
    parts.eraRects = G.eras.map((e, i) => svgEl('rect', { y: top, height: G.lanes.length * laneH, fill: i % 2 ? 'var(--accent)' : 'var(--ink)', opacity: i % 2 ? 0.035 : 0.02 }, parts.era));
    parts.eraLabels = G.eras.map(e => svgEl('text', { y: 38, class: 'era-n' }, parts.era));
    parts.future = svgEl('g', { class: 'g-future' }, plot);
    parts.futureRect = svgEl('rect', { y: top, height: G.lanes.length * laneH, fill: 'url(#future-hatch)' }, parts.future);
    parts.futureBg = svgEl('rect', { y: top, height: G.lanes.length * laneH, fill: 'var(--future)' }, parts.future);
    parts.futureText = svgEl('text', { y: 38 }, parts.future);
    parts.futureText.textContent = '预测区';
    parts.axis = svgEl('g', { class: 'g-axis' }, plot);
    parts.lanes = svgEl('g', { class: 'g-lane' }, svg);
    G.lanes.forEach((l, i) => { if (i) svgEl('line', { x1: 0, x2: W, y1: laneTop(i), y2: laneTop(i) }, parts.lanes); });
    svgEl('line', { x1: 0, x2: W, y1: top, y2: top }, parts.lanes);
    svgEl('line', { x1: 0, x2: W, y1: top + G.lanes.length * laneH, y2: top + G.lanes.length * laneH }, parts.lanes);
    parts.window = svgEl('g', { class: 'g-window' }, plot);
    parts.winLine = svgEl('path', { fill: 'none' }, parts.window);
    parts.winText = svgEl('text', { y: 47, 'text-anchor': 'middle' }, parts.window);
    parts.winText.textContent = '第 6 次浪潮起点窗口';
    parts.today = svgEl('g', { class: 'g-today' }, plot);
    parts.todayLine = svgEl('line', { y1: 18, y2: top + G.lanes.length * laneH }, parts.today);
    parts.todayText = svgEl('text', { y: 14, 'text-anchor': 'middle' }, parts.today);
    parts.todayText.textContent = '今天';
    const gEdges = svgEl('g', { class: 'g-edge' }, plot);
    const gNodes = svgEl('g', {}, plot);

    edgeEls = [];
    for (const [a, b, t] of G.edges) {
      const na = NODE.get(a), nb = NODE.get(b);
      if (!visible(na) || !visible(nb)) continue;
      const el = svgEl('path', { class: `t-${t}` }, gEdges);
      edgeEls.push({ a, b, t, el });
    }
    nodeEls = new Map();
    for (const n of G.nodes) {
      if (!visible(n)) continue;
      const r = radius(n);
      const g = svgEl('g', { class: `g-node k-${n.kind} st-${n.status}${n.bang ? ' bang' : ''}`, 'data-id': n.id, role: 'button', tabindex: '-1', 'aria-label': `${n.name}，${yearText(n)}` }, gNodes);
      const col = laneVar(n.lane);
      let range = null;
      if (n.yr) range = svgEl('path', { class: 'range', stroke: col, fill: 'none' }, g);
      svgEl('circle', { r: 12, fill: 'transparent' }, g);
      if (n.bang) svgEl('circle', { r: 8.5, class: 'bang-ring' }, g);
      if (n.kind === 'candidate') {
        svgEl('path', { d: 'M0 -9 L9 0 L0 9 L-9 0Z', fill: 'var(--surface)', stroke: col, 'stroke-width': 2 }, g);
        svgEl('circle', { r: 3, fill: col }, g);
      } else if (n.kind === 'bottleneck') {
        svgEl('rect', { x: -5, y: -5, width: 10, height: 10, rx: 1.5, fill: n.status === 'future' ? 'var(--surface)' : col, stroke: n.status === 'future' ? col : 'var(--surface)', 'stroke-width': n.status === 'future' ? 1.5 : 2, 'stroke-dasharray': n.status === 'future' ? '2 2' : null, class: n.status === 'future' ? '' : 'dot' }, g);
      } else if (n.status === 'future') {
        svgEl('circle', { r: 5, fill: 'var(--surface)', stroke: col, 'stroke-width': 1.5, 'stroke-dasharray': '2 2' }, g);
      } else {
        if (n.status === 'now') svgEl('circle', { r: 8.5, class: 'halo', stroke: col }, g);
        svgEl('circle', { r, fill: col, class: 'dot' }, g);
      }
      const text = svgEl('text', { x: r + 5, y: 4 }, g);
      text.textContent = n.name;
      nodeEls.set(n.id, { g, text, range, n });
    }
    layout();
    applyFocus();
  }

  function ticks() {
    parts.axis.innerHTML = '';
    const y0 = BREAKS[0], y1 = 2045, accepted = [];
    const pri = y => (y % 100 === 0 ? 5 : y % 50 === 0 ? 4 : y % 10 === 0 ? 3 : y % 5 === 0 ? 2 : 1);
    const cands = [];
    const xt = X(TODAY);
    for (let y = y0; y <= y1; y++) { const x = X(y); if (x >= plotX + 14 && x <= W - 14 && Math.abs(x - xt) > 24) cands.push([pri(y), y, x]); }
    cands.sort((p, q) => q[0] - p[0] || p[1] - q[1]);
    for (const [p, y, x] of cands) {
      if (p < 2 && accepted.length > 2) continue;
      if (accepted.every(a => Math.abs(a[1] - x) >= (compact ? 40 : 46))) accepted.push([y, x]);
    }
    for (const [y, x] of accepted) {
      svgEl('line', { x1: x, x2: x, y1: top, y2: top + G.lanes.length * laneH }, parts.axis);
      const t = svgEl('text', { x, y: 14, 'text-anchor': 'middle' }, parts.axis);
      t.textContent = y;
      const tb = svgEl('text', { x, y: H - 8, 'text-anchor': 'middle' }, parts.axis);
      tb.textContent = y;
    }
  }

  function layout() {
    parts.clipRect.setAttribute('x', plotX - 6);
    parts.clipRect.setAttribute('width', W - plotX + 6);
    parts.clipRect.setAttribute('height', H);
    ticks();
    G.eras.forEach((e, i) => {
      const x0 = X(e.start), x1 = X(e.end);
      parts.eraRects[i].setAttribute('x', x0);
      parts.eraRects[i].setAttribute('width', Math.max(0, x1 - x0));
      const lab = parts.eraLabels[i];
      const full = `${CIRCLED[e.no]} ${e.name}`;
      ctx.font = '800 11px Archivo, "Noto Sans SC", sans-serif';
      lab.textContent = x1 - x0 > ctx.measureText(full).width + 12 ? full : CIRCLED[e.no];
      lab.setAttribute('x', Math.max(plotX, x0) + 5);
    });
    const xt = X(TODAY), xe = X(2045);
    parts.futureRect.setAttribute('x', xt); parts.futureRect.setAttribute('width', Math.max(0, xe - xt));
    parts.futureBg.setAttribute('x', xt); parts.futureBg.setAttribute('width', Math.max(0, xe - xt));
    parts.futureText.setAttribute('x', xt + 6);
    parts.todayLine.setAttribute('x1', xt); parts.todayLine.setAttribute('x2', xt);
    parts.todayText.setAttribute('x', xt);
    const w0 = X(2004), w1 = X(2034);
    parts.winLine.setAttribute('d', `M${w0} 46 V50 M${w0} 48 H${w1} M${w1} 46 V50`);
    parts.winText.setAttribute('x', (w0 + w1) / 2);
    ctx.font = '10px "JetBrains Mono", monospace';
    parts.winText.style.display = (w1 - w0) > ctx.measureText(parts.winText.textContent).width + 8 ? '' : 'none';
    parts.winLine.parentNode.style.opacity = '';

    // pack nodes into three tracks per lane
    const byLane = new Map(G.lanes.map(l => [l.id, []]));
    for (const { n } of nodeEls.values()) byLane.get(n.lane).push(n);
    for (const [laneId, list] of byLane) {
      const li = LANE_IDX[laneId];
      const occ = [[], [], []];
      const free = (t, a, b) => occ[t].every(([p, q]) => b <= p || a >= q);
      list.sort((p, q) => PRIORITY(p) - PRIORITY(q) || p.year - q.year);
      for (const n of list) {
        const x = X(n.year), r = radius(n), tw = widths.get(n.id);
        const left = x + r + 7 + tw > W - 6;
        let a = left ? x - r - 7 - tw : x - r - 3, b = left ? x + r + 3 : x + r + 7 + tw;
        if (n.yr) { a = Math.min(a, X(n.yr[0]) - 2); b = Math.max(b, X(n.yr[1]) + 2); }
        const pref = n._track ?? 0;
        const order = [pref, ...[0, 1, 2].filter(t => t !== pref)];
        let track = order.find(t => free(t, a, b));
        let label = track != null;
        if (!label) {
          const da = x - r - 2, db = x + r + 2;
          track = order.find(t => free(t, da, db));
          if (track == null) track = pref;
          occ[track].push([da, db]);
        } else occ[track].push([a, b]);
        n._track = track; n._x = x; n._y = trackY(li, track); n._label = label; n._left = left;
      }
    }
    for (const { g, text, range, n } of nodeEls.values()) {
      g.setAttribute('transform', `translate(${n._x.toFixed(1)},${n._y.toFixed(1)})`);
      text.style.display = n._label ? '' : 'none';
      text.setAttribute('x', n._left ? -(radius(n) + 5) : radius(n) + 5);
      text.setAttribute('text-anchor', n._left ? 'end' : 'start');
      if (range) {
        const a = X(n.yr[0]) - n._x, b = X(n.yr[1]) - n._x;
        range.setAttribute('d', `M${a} -3 V3 M${a} 0 H${b} M${b} -3 V3`);
      }
    }
    for (const e of edgeEls) {
      const A = NODE.get(e.a), B = NODE.get(e.b);
      const x1 = A._x, y1 = A._y, x2 = B._x, y2 = B._y;
      if ((x1 < plotX && x2 < plotX) || (x1 > W && x2 > W)) { e.el.setAttribute('d', ''); continue; }
      const dx = Math.max(18, Math.abs(x2 - x1) * 0.45);
      e.el.setAttribute('d', `M${x1.toFixed(1)} ${y1.toFixed(1)} C${(x1 + dx).toFixed(1)} ${y1.toFixed(1)} ${(x2 - dx).toFixed(1)} ${y2.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`);
    }
  }

  function activeFocus() {
    if (st.hover) return chainOf(st.hover);
    if (st.selected) return chainOf(st.selected);
    if (st.hits && st.hits.size) return st.hits;
    return st.tourFocus;
  }
  function applyFocus() {
    const f = activeFocus();
    svg.classList.toggle('focusing', !!f);
    for (const [id, { g }] of nodeEls) {
      g.classList.toggle('on', !!f && f.has(id));
      g.classList.toggle('hit', !!st.hits && st.hits.has(id));
      g.classList.toggle('sel', st.selected === id);
    }
    for (const e of edgeEls) e.el.classList.toggle('on', !!f && f.has(e.a) && f.has(e.b));
  }

  // view changes
  let raf = 0;
  const schedule = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; layout(); }); };
  function setView(u0, u1) {
    let span = Math.min(1, Math.max(0.025, u1 - u0));
    let a = u0, b = u0 + span;
    if (a < 0) { a = 0; b = span; }
    if (b > 1) { b = 1; a = 1 - span; }
    view = [a, b];
    schedule();
  }
  let anim = 0;
  function animateTo(u0, u1) {
    cancelAnimationFrame(anim);
    const from = [...view], t0 = performance.now(), dur = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 520;
    const step = now => {
      const k = dur ? Math.min(1, (now - t0) / dur) : 1;
      const e = 1 - Math.pow(1 - k, 3);
      view = [from[0] + (u0 - from[0]) * e, from[1] + (u1 - from[1]) * e];
      layout();
      if (k < 1) anim = requestAnimationFrame(step);
    };
    anim = requestAnimationFrame(step);
  }
  const zoomAt = (px, factor) => {
    const span = view[1] - view[0];
    const uc = view[0] + (px - plotX) / plotW * span;
    const ns = Math.min(1, Math.max(0.025, span * factor));
    setView(uc - (px - plotX) / plotW * ns, uc - (px - plotX) / plotW * ns + ns);
  };
  const localX = clientX => (clientX - svg.getBoundingClientRect().left) * (W / svg.getBoundingClientRect().width);

  svg.addEventListener('wheel', e => {
    if (e.ctrlKey || e.metaKey) { e.preventDefault(); cancelAnimationFrame(anim); zoomAt(localX(e.clientX), Math.exp(e.deltaY * 0.01)); }
    else if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) { e.preventDefault(); cancelAnimationFrame(anim); const span = view[1] - view[0]; setView(view[0] + e.deltaX / plotW * span, view[1] + e.deltaX / plotW * span); }
  }, { passive: false });

  const pointers = new Map();
  let drag = null, pinch = null;
  svg.addEventListener('pointerdown', e => {
    pointers.set(e.pointerId, e.clientX);
    try { svg.setPointerCapture(e.pointerId); } catch { /* not capturable */ }
    cancelAnimationFrame(anim);
    if (pointers.size === 1) drag = { x0: e.clientX, v0: [...view], moved: false, target: e.target.closest('.g-node') };
    if (pointers.size === 2) {
      const xs = [...pointers.values()];
      pinch = { d0: Math.abs(xs[0] - xs[1]) || 1, v0: [...view], cx: localX((xs[0] + xs[1]) / 2) };
      drag = null;
    }
  });
  svg.addEventListener('pointermove', e => {
    if (pointers.has(e.pointerId)) pointers.set(e.pointerId, e.clientX);
    if (pinch && pointers.size === 2) {
      const xs = [...pointers.values()];
      const d = Math.abs(xs[0] - xs[1]) || 1;
      const span0 = pinch.v0[1] - pinch.v0[0];
      const uc = pinch.v0[0] + (pinch.cx - plotX) / plotW * span0;
      const ns = Math.min(1, Math.max(0.025, span0 * pinch.d0 / d));
      setView(uc - (pinch.cx - plotX) / plotW * ns, uc - (pinch.cx - plotX) / plotW * ns + ns);
      return;
    }
    if (drag) {
      const dxp = (e.clientX - drag.x0) * (W / svg.getBoundingClientRect().width);
      if (Math.abs(dxp) > 4) { drag.moved = true; svg.classList.add('dragging'); hideTip(); }
      if (drag.moved) { const span = drag.v0[1] - drag.v0[0]; setView(drag.v0[0] - dxp / plotW * span, drag.v0[1] - dxp / plotW * span); }
      return;
    }
    const g = e.target.closest && e.target.closest('.g-node');
    hoverNode(g ? g.dataset.id : null, e);
  });
  const endPointer = e => {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinch = null;
    if (drag && pointers.size === 0) {
      if (!drag.moved) {
        if (drag.target) select(drag.target.dataset.id, true);
        else if (st.selected) clearSelect(true);
      }
      drag = null;
      svg.classList.remove('dragging');
    }
  };
  svg.addEventListener('pointerup', endPointer);
  svg.addEventListener('pointercancel', endPointer);
  svg.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse' && !drag) hoverNode(null); });

  function hoverNode(id, e) {
    if (id === st.hover) { if (id && e) placeTip(id); return; }
    st.hover = id;
    applyFocus();
    if (id) { showTip(id); placeTip(id); } else hideTip();
  }
  function showTip(id) {
    const n = NODE.get(id);
    tip.innerHTML = `<b>${esc(n.name)}</b><span class="num">${esc(yearText(n))} · ${esc(LANE[n.lane].name)} · ${esc(KIND_NAME[n.kind])}</span><br>${esc(n.one)}`;
    tip.hidden = false;
  }
  function placeTip(id) {
    const n = NODE.get(id);
    const scale = svg.getBoundingClientRect().width / W;
    const bw = box.clientWidth, tw = tip.offsetWidth, th = tip.offsetHeight;
    let x = n._x * scale + 14, y = n._y * scale + 14;
    if (x + tw > bw - 8) x = n._x * scale - tw - 14;
    if (y + th > box.clientHeight - 8) y = n._y * scale - th - 14;
    tip.style.left = Math.max(8, x) + 'px';
    tip.style.top = Math.max(8, y) + 'px';
  }
  function hideTip() { tip.hidden = true; }

  function select(id, fromUser) {
    st.selected = id;
    st.hover = null;
    hideTip();
    const n = NODE.get(id);
    if (n && nodeEls.has(id) && (n._x < plotX || n._x > W - 20)) {
      const span = view[1] - view[0], u = toU(n.year);
      animateTo(Math.max(0, Math.min(1 - span, u - span / 2)), Math.max(0, Math.min(1 - span, u - span / 2)) + span);
    }
    applyFocus();
    if (onSelect) onSelect(id, fromUser);
  }
  function clearSelect(fromUser) {
    st.selected = null;
    applyFocus();
    if (onSelect && fromUser) onSelect(null, true);
  }

  new ResizeObserver(() => { const w = box.clientWidth; if (w && w !== W) { size(); build(); } }).observe(box);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { measureAll(); layout(); });

  measureAll();
  size();
  build();

  return {
    setTourFocus(ids) { st.tourFocus = ids ? new Set(ids) : null; applyFocus(); },
    setRange([y0, y1], animate = true) { const a = toU(y0), b = toU(y1); if (animate) animateTo(a, b); else { view = [a, b]; layout(); } },
    select, clearSelect,
    get selected() { return st.selected; },
    setFilters(lanes, statuses) { st.lanes = lanes; st.statuses = statuses; build(); },
    search(q) {
      q = q.trim().toLowerCase();
      st.hits = q ? new Set(G.nodes.filter(n => visible(n) && (n.name.toLowerCase().includes(q) || n.en.toLowerCase().includes(q))).map(n => n.id)) : null;
      applyFocus();
      return st.hits ? [...st.hits] : [];
    },
    zoomBy(f) { zoomAt(plotX + plotW / 2, f); },
    reset() { animateTo(0, 1); },
  };
}
