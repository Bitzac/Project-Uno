// Page assembly: hero verdict, map + tour + node evidence, trend charts, niche radar, scoring, counter-arguments, sources.
const C = V.conclusion;
$('#asof').textContent = `数据截至 ${G.asof}`;

// ---------- scoring first: the hero quotes its numbers ----------
const score = initScore({ onPick: id => showOnMap(id) });
const DEF = score.defaultRanked();
const PERTURB_DEFAULT = perturbWins(DEFAULT_W);
const top1 = DEF[0], top2 = DEF[1];
const conf = RANDOM_WINS[top1.c.id] >= 0.8 ? '较高' : RANDOM_WINS[top1.c.id] >= 0.6 ? '中' : '低';

const [word, wordSub] = C.answer.split('：');
$('#answer-word').innerHTML = `${esc(word)}<small>${esc(wordSub || '')}</small>`;
$('#answer-line').textContent = C.line;
$('#answer-dek').textContent = C.dek;
$('#answer-conf').innerHTML = `<b>置信度：${conf}。</b>默认权重下 ${esc(top1.c.name)} ${top1.t.toFixed(2)} 分，比第二名${esc(top2.c.name)}高 ${(top1.t - top2.t).toFixed(2)} 分。权重完全随机时，它在 ${pct(RANDOM_WINS[top1.c.id])} 的情况下排第一；每项人工打分随机 ±1 时，这一比例是 ${pct(PERTURB_DEFAULT[top1.c.id])}。`;
$('#mini-rank').innerHTML = DEF.slice(0, 4).map(({ c, t }) => `<li><span>${esc(c.short)}</span><span class="track"><span class="fill" style="width:${t / 5 * 100}%;background:${laneVar(c.node.lane)}"></span></span><b>${t.toFixed(2)}</b></li>`).join('');
$('#hero-figs').innerHTML = C.figs.map(f => `<button type="button" class="fig" data-node="${f.node}"><b>${esc(f.v)}${f.u ? `<small>${esc(f.u)}</small>` : ''}</b><span>${esc(f.l)}</span></button>`).join('');
$('#chain').innerHTML = V.chain.map(x => `<li class="${x.next ? 'next' : ''}"><span class="yr">${esc(x.yr)}</span><h3>${esc(x.h)}</h3><p class="what">${esc(x.what)}</p><p class="ev">${esc(x.ev)}</p></li>`).join('');
document.querySelectorAll('[data-node]').forEach(b => b.addEventListener('click', () => showOnMap(b.dataset.node)));

// ---------- map ----------
const counts = { e: 0, a: 0, b: 0, r: 0 };
G.edges.forEach(e => counts[e[2]]++);
$('#map-dek').textContent = `${G.nodes.length} 个节点，${G.edges.length} 条连线，${G.lanes.length} 条泳道。连线有四种关系：促成 ${counts.e}、加速 ${counts.a}、约束 ${counts.b}、缓解 ${counts.r}。今天右侧是预测区，未来节点带年份区间。`;

const graph = createGraph({ svg: $('#graph'), box: $('#map-box'), labelsEl: $('#lane-labels'), tip: $('#graph-tip'), onSelect: (id, fromUser) => (id ? openNode(id) : closeNode()) });

let mode = 'tour';
let step = Math.max(0, Math.min(V.tour.length - 1, Number(store.get('pw-step')) || 0));

function setMode(m) {
  mode = m;
  $('#mode-tour').setAttribute('aria-pressed', m === 'tour');
  $('#mode-free').setAttribute('aria-pressed', m === 'free');
  if (m === 'tour') goStep(step);
  else { graph.setTourFocus(null); renderFree(); }
  showTab('tour');
}
$('#mode-tour').addEventListener('click', () => setMode('tour'));
$('#mode-free').addEventListener('click', () => setMode('free'));

function goStep(i, animate = true) {
  step = Math.max(0, Math.min(V.tour.length - 1, i));
  store.set('pw-step', String(step));
  const t = V.tour[step];
  graph.setRange(t.range, animate);
  graph.setTourFocus(t.focus);
  const kpiMap = Object.fromEntries(T.kpis.map(k => [k.id, k]));
  const pat = V.pattern;
  $('#side-tour').innerHTML = `<p class="tour-kicker">${esc(t.kicker)} / 0${V.tour.length}</p><h3>${esc(t.title)}</h3>` +
    t.body.map((p, j) => `<p class="${j ? 'p2' : ''}">${esc(p)}</p>`).join('') +
    (t.pattern ? `<div class="pattern"><p class="small muted">五次浪潮起点的间隔（年）</p><div class="pattern-row">${pat.intervals.map((d, j) => `<div>${d}<span>${G.eras[j].start}→${G.eras[j + 1].start}</span></div>`).join('')}</div></div>` : '') +
    (t.kpis ? `<div class="mini-kpis">${t.kpis.map(k => `<div><b>${esc(kpiMap[k].v)}${kpiMap[k].u ? `<small class="num"> ${esc(kpiMap[k].u)}</small>` : ''}</b><span>${esc(kpiMap[k].l)}</span></div>`).join('')}</div>` : '') +
    (t.chart ? `<div><p class="small muted">${esc(SERIES[t.chart].title)}</p><div class="c-body" id="tour-chart" style="position:relative"></div></div>` : '') +
    (t.note === 'anthropic' ? `<p class="note">${esc(DISCLOSE)}</p>` : '') +
    `<div class="tour-nav"><button type="button" id="t-prev" ${step === 0 ? 'disabled' : ''}>上一步</button><div class="dots">${V.tour.map((x, j) => `<button type="button" aria-label="第 ${j + 1} 步：${esc(x.title)}" ${j === step ? 'aria-current="step"' : ''} data-step="${j}"></button>`).join('')}</div><button type="button" class="primary" id="t-next">${step === V.tour.length - 1 ? '自由探索' : '下一步'}</button></div>`;
  if (t.chart) mountChart($('#tour-chart'), t.chart, { mini: true });
  $('#t-prev').addEventListener('click', () => goStep(step - 1));
  $('#t-next').addEventListener('click', () => (step === V.tour.length - 1 ? setMode('free') : goStep(step + 1)));
  document.querySelectorAll('#side-tour .dots button').forEach(b => b.addEventListener('click', () => goStep(Number(b.dataset.step))));
}

function renderFree() {
  const cands = G.nodes.filter(n => n.kind === 'candidate');
  $('#side-tour').innerHTML = `<p class="tour-kicker">自由探索</p><h3>点任意节点看证据</h3><p class="p2">悬停或点击节点会高亮它的全部上游和下游。用上方的领域和状态筛选器缩小范围，或直接搜索。</p>
    <div class="rel"><h4>7 个候选</h4><div>${cands.map(n => `<button type="button" data-go="${n.id}"><i style="background:${laneVar(n.lane)}"></i>${esc(n.name)}</button>`).join('')}</div></div>
    <div class="rel"><h4>五次浪潮的起点</h4><div>${G.eras.map(e => `<button type="button" data-go="${e.bang}">${e.start} ${esc(e.name)}</button>`).join('')}</div></div>
    <div class="tour-nav"><button type="button" class="primary" id="back-tour">回到导览</button></div>`;
  document.querySelectorAll('#side-tour [data-go]').forEach(b => b.addEventListener('click', () => graph.select(b.dataset.go, true)));
  $('#back-tour').addEventListener('click', () => setMode('tour'));
  graph.setRange([1760, 2045]);
}

function showTab(which) {
  const node = which === 'node';
  $('#tab-tour').setAttribute('aria-selected', !node);
  $('#tab-node').setAttribute('aria-selected', node);
  $('#side-tour').hidden = node;
  $('#side-node').hidden = !node;
}
$('#tab-tour').addEventListener('click', () => { graph.clearSelect(); closeNode(); });
$('#tab-node').addEventListener('click', () => { if (graph.selected) showTab('node'); });

function relButtons(title, list) {
  if (!list.length) return '';
  return `<div class="rel"><h4>${esc(title)}</h4><div>${list.map(id => { const n = NODE.get(id); return `<button type="button" data-go="${id}"><i style="background:${laneVar(n.lane)}"></i>${esc(n.name)}</button>`; }).join('')}</div></div>`;
}
function openNode(id) {
  const n = NODE.get(id);
  const ins = IN.get(id), outs = OUT.get(id);
  const pick = (arr, types) => arr.filter(([, t]) => types.includes(t)).map(([x]) => x);
  const cand = CANDS.find(c => c.id === id);
  let candHtml = '';
  if (cand) {
    const r = DEF.findIndex(x => x.c.id === id) + 1;
    candHtml = `<div class="mini-kpis"><div><b>${DEF[r - 1].t.toFixed(2)}</b><span>默认权重得分，第 ${r} 名</span></div><div><b>${cand.ready.score.toFixed(1)}</b><span>使能就绪（${cand.ready.pre.filter(p => p.status !== 'future').length}/${cand.ready.pre.length} 个前提已实现）</span></div></div><p><a class="link-btn" href="#score">看每项得分的理由</a></p>`;
  }
  $('#side-node').innerHTML = `<div class="node-meta"><span class="pill"><i style="background:${laneVar(n.lane)}"></i>${esc(LANE[n.lane].name)}</span><span class="pill">${esc(KIND_NAME[n.kind])}</span><span class="pill st-${n.status}">${esc(STATUS_NAME[n.status])}</span><span class="num small muted">${esc(yearText(n))}</span></div>
    <div><h3>${esc(n.name)}</h3><p class="node-en">${esc(n.en)}</p></div><p>${esc(n.one)}</p>` +
    (n.figs ? `<div class="mini-kpis">${n.figs.map(f => `<div><b>${esc(f.v)}${f.u ? `<small class="num"> ${esc(f.u)}</small>` : ''}</b><span>${esc(f.l)}</span></div>`).join('')}</div>` : '') +
    candHtml +
    (n.chart ? `<div><p class="small muted">${esc(SERIES[n.chart].title)}</p><div class="c-body" id="node-chart" style="position:relative"></div></div>` : '') +
    relButtons('被谁促成或加速', pick(ins, ['e', 'a'])) + relButtons('促成或加速了谁', pick(outs, ['e', 'a'])) +
    relButtons('受到约束', pick(ins, ['b'])) + relButtons('约束了', pick(outs, ['b'])) +
    relButtons('被缓解', pick(ins, ['r'])) + relButtons('缓解了', pick(outs, ['r'])) +
    `<div class="rel"><h4>来源</h4>${sources(n.src)}</div>` +
    (n.note === 'anthropic' ? `<p class="note">${esc(DISCLOSE)}</p>` : '');
  if (n.chart) mountChart($('#node-chart'), n.chart, { mini: true });
  document.querySelectorAll('#side-node [data-go]').forEach(b => b.addEventListener('click', () => graph.select(b.dataset.go, true)));
  $('#tab-node').disabled = false;
  showTab('node');
}
function closeNode() {
  $('#tab-node').disabled = true;
  showTab('tour');
}
function showOnMap(id) {
  $('#map').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  graph.select(id, true);
}

// filters, search, zoom
const laneOn = new Set(G.lanes.map(l => l.id)), statusOn = new Set(['past', 'now', 'future']);
$('#lane-chips').innerHTML = G.lanes.map(l => `<button type="button" class="chip" aria-pressed="true" data-lane="${l.id}"><i style="background:${laneVar(l.id)}"></i>${esc(laneShort(l.id))}</button>`).join('');
$('#status-chips').innerHTML = Object.entries(STATUS_NAME).map(([k, v]) => `<button type="button" class="chip" aria-pressed="true" data-status="${k}"><i style="background:var(--ink)"></i>${esc(v)}</button>`).join('');
const toggle = (set, key, btn) => {
  if (set.has(key) && set.size > 1) set.delete(key); else set.add(key);
  btn.setAttribute('aria-pressed', set.has(key));
  graph.setFilters(new Set(laneOn), new Set(statusOn));
};
document.querySelectorAll('[data-lane]').forEach(b => b.addEventListener('click', () => toggle(laneOn, b.dataset.lane, b)));
document.querySelectorAll('[data-status]').forEach(b => b.addEventListener('click', () => toggle(statusOn, b.dataset.status, b)));
const search = $('#node-search');
search.addEventListener('input', () => graph.search(search.value));
search.addEventListener('keydown', e => {
  if (e.key === 'Enter') { const hits = graph.search(search.value); if (hits.length) { search.value = ''; graph.search(''); graph.select(hits[0], true); } }
  if (e.key === 'Escape') { search.value = ''; graph.search(''); }
});
$('#zoom-in').addEventListener('click', () => graph.zoomBy(0.6));
$('#zoom-out').addEventListener('click', () => graph.zoomBy(1.6));
$('#zoom-all').addEventListener('click', () => graph.reset());
document.addEventListener('keydown', e => {
  if (e.target.closest && e.target.closest('input, textarea, select')) return;
  if (e.key === 'Escape' && graph.selected) { graph.clearSelect(); closeNode(); return; }
  const r = $('#map').getBoundingClientRect();
  if (r.bottom < 0 || r.top > innerHeight || mode !== 'tour') return;
  if (e.key === 'ArrowRight') { e.preventDefault(); goStep(step + 1); }
  if (e.key === 'ArrowLeft') { e.preventDefault(); goStep(step - 1); }
});

// legend
const lg = (svg, label) => `<span><svg width="22" height="14" viewBox="-11 -7 22 14" aria-hidden="true">${svg}</svg>${label}</span>`;
$('#legend').innerHTML = [
  lg('<circle r="4.5" fill="var(--ink)"/>', '已实现'),
  lg('<circle r="7" fill="none" stroke="var(--ink)" stroke-width="1.2"/><circle r="4.5" fill="var(--ink)"/>', '进行中'),
  lg('<circle r="5" fill="var(--surface)" stroke="var(--ink)" stroke-width="1.5" stroke-dasharray="2 2"/>', '预测（带年份区间）'),
  lg('<path d="M0 -6.5 L6.5 0 L0 6.5 L-6.5 0Z" fill="var(--surface)" stroke="var(--ink)" stroke-width="1.8"/>', '候选'),
  lg('<rect x="-4.5" y="-4.5" width="9" height="9" rx="1.5" fill="var(--ink)"/>', '瓶颈'),
  lg('<circle r="6.5" fill="none" stroke="var(--ink)" stroke-width="1.5"/><circle r="3.5" fill="var(--faint)"/>', '浪潮起点'),
  lg('<line x1="-10" x2="10" stroke="var(--faint)" stroke-width="1.5"/>', '促成'),
  lg('<line x1="-10" x2="10" stroke="var(--faint)" stroke-width="1.5" stroke-dasharray="3 3"/>', '加速'),
  lg('<line x1="-10" x2="10" stroke="var(--crit)" stroke-width="1.5"/>', '约束'),
  lg('<line x1="-10" x2="10" stroke="var(--good)" stroke-width="1.5" stroke-dasharray="6 3"/>', '缓解'),
].join('');

// node table (the accessible, text-only view of the map)
$('#node-table').innerHTML = `<thead><tr><th>年份</th><th>领域</th><th>节点</th><th>类型</th><th>状态</th><th>说明</th></tr></thead><tbody>` +
  [...G.nodes].sort((a, b) => a.year - b.year || LANE_IDX[a.lane] - LANE_IDX[b.lane]).map(n => `<tr><td class="yr">${esc(yearText(n))}</td><td class="k"><i style="background:${laneVar(n.lane)}"></i>${esc(laneShort(n.lane))}</td><td><button type="button" class="link-btn" data-node="${n.id}">${esc(n.name)}</button></td><td class="yr">${esc(KIND_NAME[n.kind])}</td><td class="yr">${esc(STATUS_NAME[n.status])}</td><td>${esc(n.one)}</td></tr>`).join('') + '</tbody>';
document.querySelectorAll('#node-table [data-node]').forEach(b => b.addEventListener('click', () => showOnMap(b.dataset.node)));

// ---------- trends ----------
$('#kpis').innerHTML = T.kpis.map(k => `<div class="kpi glass"><b>${esc(k.v)}${k.u ? `<small>${esc(k.u)}</small>` : ''}</b><span class="l">${esc(k.l)}</span><span class="d">${esc(k.d)}${k.note === 'anthropic' ? ' ' + esc(DISCLOSE) : ''}</span>${sources(k.src)}</div>`).join('');
const mountGroup = (el, ids) => ids.forEach(id => { const card = chartCard(SERIES[id]); el.appendChild(card); mountChart(card.querySelector('.c-body'), id); });
mountGroup($('#charts-ai'), ['compute', 'horizon', 'capex', 'dc']);
mountGroup($('#charts-next'), ['internet', 'waymo', 'solar', 'genome', 'launch']);

// ---------- niches ----------
const W0 = 2026, W1 = 2045, wpos = y => ((Math.max(W0, Math.min(W1, y)) - W0) / (W1 - W0) * 100).toFixed(1) + '%';
$('#niche-table').innerHTML = `<thead><tr><th>方向</th><th>对应候选</th><th>2026 年现状</th><th>关键数字</th><th>下一个里程碑</th><th>时间窗口 <span class="num">${W0}–${W1}</span></th><th>来源</th></tr></thead><tbody>` +
  NICHES.items.map(x => { const c = NODE.get(x.cand); return `<tr><td class="k"><button type="button" class="link-btn" data-node="${x.node}">${esc(x.name)}</button></td><td class="k"><i style="background:${laneVar(c.lane)}"></i>${esc(c.name)}</td><td>${esc(x.now)}</td><td><span class="bigfig">${esc(x.fig)}</span><span>${esc(x.figl)}</span></td><td>${esc(x.next)}</td><td><div class="win" role="img" aria-label="${x.win[0]} 到 ${x.win[1]} 年"><div class="axis"></div><div class="band" style="left:${wpos(x.win[0])};width:calc(${wpos(x.win[1])} - ${wpos(x.win[0])} + 6px)"></div></div><span class="num small muted">${x.win[0]}–${x.win[1]}</span></td><td>${sources(x.src)}</td></tr>`; }).join('') + '</tbody>';
document.querySelectorAll('#niche-table [data-node]').forEach(b => b.addEventListener('click', () => showOnMap(b.dataset.node)));

$('#score-dek').textContent = `7 个候选、7 项指标。6 项人工打分（0–5 分，每个分数都附理由和来源），“使能就绪”由大网自动计算。权重可调，总分按归一化后的权重加权；两条虚线是互联网（1995 年）和深度学习（2012 年）用同一套指标回看的得分。${V.baselineNote}`;

// ---------- verdict ----------
$('#verdict-dek').textContent = `${C.answer}。${C.line}判断成立需要下面的反对意见不成立；观察指标越过阈值时，应重新打分。`;
$('#counter').innerHTML = V.counterpoints.map(x => `<li><b>${esc(x.t)}</b><p>${esc(x.b)}${x.note === 'anthropic' ? ' ' + esc(DISCLOSE) : ''}</p>${sources(x.src)}</li>`).join('');
$('#falsify').innerHTML = C.falsifiers.map(f => `<li>${esc(f)}</li>`).join('');
$('#watch').innerHTML = `<thead><tr><th>指标</th><th>现在</th><th>阈值</th><th>越线意味着</th><th>相关候选</th><th>来源</th></tr></thead><tbody>` +
  V.watchlist.map(x => `<tr><td class="k">${esc(x.k)}</td><td class="num">${esc(x.now)}</td><td class="th">${esc(x.th)}</td><td>${esc(x.m)}</td><td>${x.cand ? `<span class="k"><i style="background:${laneVar(NODE.get(x.cand).lane)}"></i>${esc(NODE.get(x.cand).name)}</span>` : '<span class="muted">AI 本身</span>'}</td><td>${sources(x.src)}</td></tr>`).join('') + '</tbody>';

// ---------- method & sources ----------
$('#method').innerHTML = [
  ['时间轴', '分段线性：1760–1900 占 20% 宽度，1900–1990 占 24%，1990–今天占 36%，今天到 2045 年占 20%。近期更密，所以给得更宽。'],
  ['节点与连线', `节点分为里程碑、现状趋势、前沿、瓶颈和候选五类。连线 A→B 表示 A 促成、加速、约束或缓解 B；构建脚本要求促成和加速边不能从晚的节点指向早的节点（允许 2 年误差）。`],
  ['总分', '总分 = Σ 归一化权重 × 指标得分。6 项指标由人工打 0–5 的整数分，每个分数都附一句理由和至少一个来源。'],
  ['使能就绪', '候选在大网中的直接前提（促成或加速它的节点）里，状态为“已实现”或“进行中”的比例 × 5。连线画法本身是判断，所以默认权重只给 10%。'],
  ['稳健性', '两种检验：权重从均匀狄利克雷分布随机抽取 2 万次；或保持当前权重，把每项人工打分随机 ±1 共 6,000 次。统计各候选排第一的比例。'],
  ['第 6 次浪潮窗口', V.pattern.text],
  ['数据口径', `数据截至 ${G.asof}。优先使用一手来源（Epoch AI、METR、IEA、ITU、IFR、BNEF、公司公告），部分 2026 年的数字来自财经媒体转述。核实不了的数字不写。`],
  ['利益声明', DISCLOSE.replace('此条', '涉及 Anthropic 的条目')],
].map(([h, p]) => `<div><b>${esc(h)}</b><p>${esc(p)}</p></div>`).join('');
const all = new Map();
const walk = v => { if (Array.isArray(v)) { if (v.length === 2 && typeof v[1] === 'string' && /^https:\/\//.test(v[1])) { if (!all.has(v[1])) all.set(v[1], v[0]); } else v.forEach(walk); } else if (v && typeof v === 'object') Object.values(v).forEach(walk); };
walk(DATA);
const host = u => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return ''; } };
const srcRows = [...all].sort((a, b) => host(a[0]).localeCompare(host(b[0])) || a[1].localeCompare(b[1]));
$('#src-sum').textContent = `全部来源（${srcRows.length} 个链接）`;
$('#src-list').innerHTML = srcRows.map(([u, n]) => `<li><a href="${esc(href(u))}" target="_blank" rel="noopener">${esc(n)}</a><span>${esc(host(u))}</span></li>`).join('');
$('#foot').textContent = `数据截至 ${G.asof}。打分是判断，不是预测：每个分数都附理由和来源，可以在打分区调整权重看排名怎么变。`;

goStep(step, false);
