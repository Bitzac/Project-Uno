// ---------- fundraising module (China) ----------
const Fund = (() => {
  const TABS = [
    { id: 'overview', n: '总览' }, { id: 'rounds', n: '轮次地图' }, { id: 'sources', n: '找资方' },
    { id: 'pitch', n: '路演' }, { id: 'process', n: '交割流程' }, { id: 'progress', n: '我的进度' }
  ];
  const TYPE = Object.fromEntries(SOURCE_TYPES.map(t => [t.id, t]));
  const ROUND = Object.fromEntries(ROUNDS.map(r => [r.id, r]));
  const STATUS_N = { target: '目标', contact: '已联系', meet1: '首次会面', meet2: '二次会/立项', ts: '已签 TS', dd: '尽调中', closed: '已交割', pass: '放弃 / 被拒' };
  const COLS = [
    { n: '待接触', s: ['target'] }, { n: '接触中', s: ['contact', 'meet1', 'meet2'] },
    { n: '谈判中', s: ['ts', 'dd'] }, { n: '结果', s: ['closed', 'pass'] }
  ];
  const FUNNEL = ['contact', 'meet1', 'meet2', 'ts', 'dd', 'closed'];

  // ----- references: each view numbers the sources it cites, listed at its foot -----
  let REFS = [];
  function ref(...keys) {
    return keys.filter(k => SRC[k]).map(k => {
      let i = REFS.indexOf(k); if (i < 0) { REFS.push(k); i = REFS.length - 1; }
      return `<sup class="ref"><a href="#ref-${i + 1}" title="${esc(SRC[k].t)}">[${i + 1}]</a></sup>`;
    }).join('');
  }
  // Inline citations inside copy: "…[[src-key]]" renders as a numbered reference.
  const rich = s => String(s ?? '').replace(/\[\[([a-z0-9-]+)\]\]/g, (_, k) => ref(k));
  const plain = s => String(s ?? '').replace(/\[\[[^\]]+\]\]/g, '').replace(/<[^>]+>/g, '');
  const plainRich = s => String(s ?? '').replace(/\[\[[^\]]+\]\]/g, '');
  const refsHTML = () => REFS.length ? `<section class="panel"><h3>来源 <small>截至 ${esc(ASOF)} 的公开资料；点击打开原文</small></h3><ol class="refs">${REFS.map((k, i) => `<li id="ref-${i + 1}"><span><a href="${esc(SRC[k].u)}" target="_blank" rel="noopener">${esc(SRC[k].t)}</a> · ${esc(SRC[k].d)}</span></li>`).join('')}</ol></section>` : '';
  const foot = () => `<p class="foot">本页数据来自公开报道与法规原文，口径与日期见各条来源；机构信息只列公开可查的投资案例，不代表其当前一定在投。内容不构成投资或法律意见，签约前请律师与财务顾问复核。</p>`;

  // ----- small pieces -----
  const proj = () => curProj();
  const sector = () => SECTORS[proj().sector];
  const fitOf = (tid, p = proj()) => SECTORS[p.sector].fit[tid] ?? 0;
  const whyOf = (tid, p = proj()) => (p.why && p.why[tid]) || SECTORS[p.sector].why[tid] || '';
  const rankedTypes = (p = proj()) => SOURCE_TYPES.map(t => ({ t, f: fitOf(t.id, p) })).sort((a, b) => b.f - a.f || SOURCE_TYPES.indexOf(a.t) - SOURCE_TYPES.indexOf(b.t));
  const nextRound = () => ROUND[proj().stage] || ROUNDS[0];
  const instFits = (i, p = proj()) => i.fit.includes('general') || i.fit.includes(SECTORS[p.sector].key);
  const instsOf = (tid, p = proj()) => INSTS.filter(i => i.type === tid && instFits(i, p)).sort((a, b) => (b.fit.includes(SECTORS[p.sector].key) - a.fit.includes(SECTORS[p.sector].key)));
  const wk = a => a[0] === a[1] ? `${a[0]} 周` : `${a[0]}–${a[1]} 周`;
  const yi = n => n >= 1e4 ? (n / 1e4 >= 10 ? Math.round(n / 1e4) : +(n / 1e4).toFixed(1)) + ' 亿' : Math.round(n) + ' 万';

  function stepRow(st, opts = {}) {
    const done = stepDone(st.id), open = !!S.open[st.id], note = stepNote(st.id), p = proj();
    const tip = st.tip && (st.tip[p.id] || st.tip[p.sector]);
    const br = st.br === 'gov' ? '<span class="tag acc">国资支线</span>' : st.br === 'usd' ? '<span class="tag acc">美元支线</span>' : '';
    const ph = opts.phase ? `<span class="tag">${esc(PHASES.find(x => x.id === st.ph).n)}</span>` : '';
    const rec = stepRec(st.id);
    return `<div class="steprow${done ? ' done' : ''}">
      <input type="checkbox" class="chk" id="chk-${st.id}" data-chg="step" data-id="${st.id}" data-w ${done ? 'checked' : ''} aria-label="${esc(st.t)}">
      <div><label class="t" for="chk-${st.id}">${esc(st.t)}${note ? '<i class="notedot" title="有备注"></i>' : ''}${br}${ph}</label>
        <div class="d">${rich(st.d)}${st.src ? ref(...st.src) : ''}</div>
        ${open ? `<div class="more">
          ${st.out ? `<div class="pn"><b>产出物</b><span>${rich(st.out)}</span></div>` : ''}
          ${st.who ? `<div class="pn"><b>谁来做</b><span>${esc(st.who)}</span></div>` : ''}
          ${tip ? `<div class="pn"><b>${esc(p.short || p.name)}</b><span>${rich(tip)}</span></div>` : ''}
          <textarea id="note-${st.id}" data-inp="note" data-id="${st.id}" data-w placeholder="备注：约了谁、卡在哪、下一步…">${esc(note)}</textarea>
          ${rec && rec.at ? `<span class="meta">最后更新 ${esc(rec.at)}</span>` : ''}
        </div>` : ''}
      </div>
      <button class="tgl" data-act="open" data-id="${st.id}" aria-expanded="${open}" aria-label="${open ? '收起' : '展开'}详情">${I.chev}</button>
    </div>`;
  }

  // ----- charts -----
  function roundsChart() {
    const rs = ROUNDS.filter(r => r.amt), W = 760, H = 290, L = 70, R = 16, T = 26, B = 50;
    const lo = 2, hi = 6, y = v => T + (hi - Math.log10(v)) / (hi - lo) * (H - T - B);
    const bw = (W - L - R) / rs.length, x = i => L + bw * (i + .5), cur = nextRound().id;
    const ticks = [[1e2, '100 万'], [1e3, '1,000 万'], [1e4, '1 亿'], [1e5, '10 亿'], [1e6, '100 亿']];
    let g = `<g class="grid">${ticks.map(([v]) => `<line x1="${L}" x2="${W - R}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}"/>`).join('')}</g>`;
    g += ticks.map(([v, t]) => `<text x="${L - 10}" y="${(y(v) + 4).toFixed(1)}" text-anchor="end">${t}</text>`).join('');
    rs.forEach((r, i) => {
      const cx = x(i), y1 = y(r.amt[1]), y0 = y(r.amt[0]), isCur = r.id === cur;
      if (isCur) g += `<rect class="now-band" x="${(cx - bw / 2 + 3).toFixed(1)}" y="${T - 18}" width="${(bw - 6).toFixed(1)}" height="${H - B - T + 18}" rx="10"/><text class="now-t" x="${cx.toFixed(1)}" y="${T - 5}" text-anchor="middle">下一轮</text>`;
      const tipText = `${yi(r.amt[0])}–${yi(r.amt[1])}元\n${r.n} · 常见单笔金额${r.avg ? ' · 平均约 ' + yi(r.avg.v) + '元' : ''}`;
      g += `<g class="h" tabindex="0" data-tip="${esc(tipText)}"><rect class="hit" x="${(cx - bw / 2).toFixed(1)}" y="${T}" width="${bw.toFixed(1)}" height="${H - B - T}"/>
        <g class="mk"><line class="rng" x1="${cx.toFixed(1)}" x2="${cx.toFixed(1)}" y1="${y0.toFixed(1)}" y2="${y1.toFixed(1)}"/><circle class="dot" cx="${cx.toFixed(1)}" cy="${y0.toFixed(1)}" r="4.5"/><circle class="dot" cx="${cx.toFixed(1)}" cy="${y1.toFixed(1)}" r="4.5"/>
        ${r.avg ? `<line class="rng" x1="${(cx - 9).toFixed(1)}" x2="${(cx + 9).toFixed(1)}" y1="${y(r.avg.v).toFixed(1)}" y2="${y(r.avg.v).toFixed(1)}"/>` : ''}</g></g>`;
      g += `<text class="lb" x="${cx.toFixed(1)}" y="${H - B + 20}" text-anchor="middle">${esc(r.n)}</text><text class="sub" x="${cx.toFixed(1)}" y="${H - B + 36}" text-anchor="middle">${yi(r.amt[0])}–${yi(r.amt[1])}</text>`;
    });
    g += `<line class="axis" x1="${L}" x2="${W - R}" y1="${H - B}" y2="${H - B}" stroke="currentColor" stroke-opacity=".2"/>`;
    return `<figure class="fig"><div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="各轮次常见单笔融资金额区间，对数刻度">${g}</svg></div>
      <div class="legend"><span><i></i>常见单笔金额区间（竖线两端）</span>${rs.some(r => r.avg) ? '<span><i style="width:10px"></i>短横：统计平均值</span>' : ''}<span><i class="now"></i>你的下一轮</span></div>
      <figcaption>纵轴为对数刻度：每一格是上一格的 10 倍。区间口径见下方各轮卡片的来源。</figcaption></figure>`;
  }
  function dilutionChart() {
    const rs = ROUNDS.filter(r => r.dil), W = 760, H = 200, L = 70, R = 16, T = 18, B = 40, max = 30;
    const y = v => T + (1 - v / max) * (H - T - B), bw = (W - L - R) / rs.length, x = i => L + bw * (i + .5), cur = nextRound().id;
    let g = `<g class="grid">${[0, 10, 20, 30].map(v => `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/>`).join('')}</g>`;
    g += [0, 10, 20, 30].map(v => `<text x="${L - 10}" y="${y(v) + 4}" text-anchor="end">${v}%</text>`).join('');
    rs.forEach((r, i) => {
      const cx = x(i), w = 22, isCur = r.id === cur;
      if (isCur) g += `<rect class="now-band" x="${(cx - bw / 2 + 3).toFixed(1)}" y="${T - 8}" width="${(bw - 6).toFixed(1)}" height="${H - B - T + 8}" rx="10"/>`;
      const top = y(r.dil[1]), bot = y(r.dil[0]);
      g += `<g class="h" tabindex="0" data-tip="${esc(`${r.dil[0]}%–${r.dil[1]}%\n${r.n} · 常见出让比例`)}"><rect class="hit" x="${(cx - bw / 2).toFixed(1)}" y="${T}" width="${bw.toFixed(1)}" height="${H - B - T}"/>
        <rect class="bar mk" x="${(cx - w / 2).toFixed(1)}" y="${top.toFixed(1)}" width="${w}" height="${Math.max(3, bot - top).toFixed(1)}" rx="4"/></g>
        <text x="${cx.toFixed(1)}" y="${(top - 7).toFixed(1)}" text-anchor="middle">${r.dil[0]}–${r.dil[1]}%</text>
        <text class="lb" x="${cx.toFixed(1)}" y="${H - B + 20}" text-anchor="middle">${esc(r.n)}</text>`;
    });
    return `<figure class="fig"><div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="各轮次常见出让比例区间">${g}</svg></div>
      <figcaption>每轮新增股份占融资后总股本的比例。多轮累计后，创始团队通常在 B 轮前后跌破 51%，在那之前就要设计好控制权（见交割流程「准备」阶段）。</figcaption></figure>`;
  }
  function gantt() {
    const ph = PHASES.filter(p => p.w), W = 760, rowH = 34, T = 30, L = 120, R = 70, H = T + ph.length * rowH + 30;
    const total = ph.reduce((s, p) => s + p.w[1], 0), xmax = Math.ceil(total / 4) * 4, x = v => L + v / xmax * (W - L - R);
    const curId = currentPhase().id;
    let start = 0, g = `<g class="grid">${Array.from({ length: xmax / 4 + 1 }, (_, i) => i * 4).map(v => `<line x1="${x(v).toFixed(1)}" x2="${x(v).toFixed(1)}" y1="${T - 6}" y2="${T + ph.length * rowH}"/>`).join('')}</g>`;
    g += Array.from({ length: xmax / 4 + 1 }, (_, i) => i * 4).map(v => `<text x="${x(v).toFixed(1)}" y="${T - 12}" text-anchor="middle">${v}</text>`).join('') + `<text x="${W - R + 8}" y="${T - 12}">周</text>`;
    ph.forEach((p, i) => {
      const yy = T + i * rowH, isCur = p.id === curId, s0 = start;
      if (isCur) g += `<rect class="now-band" x="4" y="${yy + 2}" width="${W - 8}" height="${rowH - 4}" rx="9"/>`;
      g += `<text class="lb" x="${L - 12}" y="${yy + rowH / 2 + 4}" text-anchor="end">${esc(p.n)}</text>`;
      g += `<g class="h" tabindex="0" data-tip="${esc(`${wk(p.w)}\n${p.n} · ${p.short || ''}`)}"><rect class="hit" x="${L}" y="${yy}" width="${W - L - R}" height="${rowH}"/>
        <rect class="bar lo mk" x="${x(s0).toFixed(1)}" y="${yy + 10}" width="${Math.max(3, x(s0 + p.w[1]) - x(s0)).toFixed(1)}" height="14" rx="4"/>
        <rect class="bar mk" x="${x(s0).toFixed(1)}" y="${yy + 10}" width="${Math.max(3, x(s0 + p.w[0]) - x(s0)).toFixed(1)}" height="14" rx="4"/></g>
        <text x="${(x(s0 + p.w[1]) + 8).toFixed(1)}" y="${yy + rowH / 2 + 4}">${wk(p.w)}</text>`;
      start += p.w[0];
    });
    const sumMin = ph.reduce((s, p) => s + p.w[0], 0), sumMax = total;
    return `<figure class="fig gantt"><div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="一轮融资各阶段的典型时长，合计约 ${sumMin} 到 ${sumMax} 周">${g}</svg></div>
      <div class="legend"><span><i class="sw" style="background:var(--accent)"></i>顺利时</span><span><i class="sw" style="background:var(--h3)"></i>常见上限</span><span><i class="now"></i>你所在的阶段</span></div>
      <figcaption>每段从上一段「顺利时」的终点起算。合计约 ${sumMin}–${sumMax} 周；时长口径见各阶段说明的来源。</figcaption></figure>`;
  }
  function heatmap() {
    const ps = allProjects();
    const scale = [0, 1, 2, 3, 4, 5].map(v => `<i class="s${v}" style="display:inline-block;background:${v ? `var(--h${v})` : 'var(--line-soft)'}"></i>`).join('');
    return `<div class="heat"><table><thead><tr><th>资方类型</th>${ps.map(p => `<th class="c">${esc(p.short || p.name)}</th>`).join('')}</tr></thead><tbody>
      ${SOURCE_TYPES.map(t => `<tr><td class="nm">${esc(t.n)}<small>${esc(t.amt || '')}</small></td>${ps.map(p => { const f = fitOf(t.id, p); return `<td><button class="cell s${f}" data-act="type" data-id="${t.id}" data-pid="${esc(p.id)}" data-tip="${esc(`${f} / 5\n${p.short || p.name} × ${t.n}`)}" aria-label="${esc(`${p.name}与${t.n}的适配度 ${f} 分`)}">${f}</button></td>`; }).join('')}</tr>`).join('')}
      </tbody></table></div><div class="scale">0 不适配 ${scale} 5 最对口</div>`;
  }

  // ----- views -----
  function vOverview() {
    const p = proj(), pr = progressOf(), cp = currentPhase(), nr = nextRound(), top = rankedTypes().slice(0, 3);
    const todo = visibleSteps().filter(s => !stepDone(s.id)).slice(0, 3);
    const C = 2 * Math.PI * 56, off = C * (1 - pr.pct);
    const phIdx = PHASES.findIndex(x => x.id === cp.id);
    return `<div class="vhead"><div><div class="eyebrow">融资能力 · 中国大陆</div><h1>${esc(p.name)} 的融资路线</h1>
      <p>${esc(p.status || '')}</p></div></div>
    <section class="panel"><div class="hero">
      <div class="ring"><svg viewBox="0 0 132 132" aria-hidden="true"><circle class="tr" cx="66" cy="66" r="56" fill="none" stroke-width="7"/><circle class="fg" cx="66" cy="66" r="56" fill="none" stroke-width="7" stroke-linecap="round" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}" transform="rotate(-90 66 66)"/></svg>
        <div><b>${Math.round(pr.pct * 100)}%</b><span>${pr.done} / ${pr.total} 步</span></div></div>
      <div class="where"><h2>下一轮：<em>${esc(nr.n)}</em>。你在第 ${phIdx + 1} 段「${esc(cp.n)}」</h2>
        <p class="lead">${rich(p.lead)}</p>
        <div class="chips"><button class="btn pri sm" data-act="tab" data-id="process">打开交割流程</button><button class="btn ghost sm" data-act="tab" data-id="sources">看对口资方</button><button class="btn ghost sm" data-act="tab" data-id="pitch">准备路演</button></div>
      </div></div></section>
    <section class="panel"><h3>市场现在什么样 <small>中国大陆股权投资</small></h3><div class="kpis">${KPI.map(k => `<div class="kpi"><b>${esc(k.v)}<small>${esc(k.u || '')}</small></b><span>${esc(k.l)}${ref(k.src)}</span><em>${esc(k.d || '')}</em></div>`).join('')}</div></section>
    <div class="cols">
      <section class="panel"><h3>先做这 3 件事 <small>按流程顺序，勾掉一件补上一件</small></h3>
        ${todo.length ? todo.map(s => stepRow(s, { phase: true })).join('') : '<p class="empty">全部步骤都已完成。</p>'}</section>
      <section class="panel"><h3>最对口的资方 <small>适配度 0–5</small></h3><div class="rank">
        ${top.map(({ t, f }) => `<button class="rk" data-act="type" data-id="${t.id}"><span><b>${esc(t.n)}</b><small>${esc(plain(whyOf(t.id)).slice(0, 46))}…</small></span><span class="meter" role="img" aria-label="${f} 分"><i style="width:${f * 20}%"></i></span><span class="num">${f}</span></button>`).join('')}
      </div><button class="btn ghost sm" data-act="tab" data-id="sources" style="justify-self:start">全部 ${SOURCE_TYPES.length} 类资方 →</button></section>
    </div>
    <section class="panel"><h3>投资人一定会问的风险 <small>${esc(p.short || p.name)}</small></h3><div class="flags">
      ${(p.flags || []).map(f => `<div class="flag">${I.warn}<div><b>${esc(f.t)}</b>${f.src ? ref(...f.src) : ''}<br><span>${rich(f.d)}</span></div></div>`).join('') || '<p class="muted small">新增项目没有预置风险清单，可在「路演」页按通用问题自查。</p>'}
    </div></section>
    <section class="panel"><h3>整条路 <small>单轮融资 ${PHASES.length} 段；轮次之间重复这条路</small></h3>${gantt()}</section>`;
  }

  function vRounds() {
    const nr = nextRound();
    return `<div class="vhead"><div><div class="eyebrow">全轮次</div><h1>从种子到上市</h1>
      <p>${rich(ROUNDS_LEAD)}</p></div></div>
    <section class="panel"><h3>每轮拿多少钱 <small>常见单笔金额</small></h3>${roundsChart()}</section>
    <section class="panel"><h3>每轮让出多少 <small>常见出让比例</small></h3>${dilutionChart()}</section>
    <div class="rounds">${ROUNDS.map(r => `<article class="rc${r.id === nr.id ? ' now' : ''}"><h4>${esc(r.n)} <small>${esc(r.en)}</small></h4>
      <dl>${r.amt ? `<dt>金额</dt><dd>${yi(r.amt[0])}–${yi(r.amt[1])}元${r.avg ? `；平均 ${yi(r.avg.v)}元${ref(r.avg.src)}` : ''}</dd>` : ''}
      ${r.dil ? `<dt>出让</dt><dd>${r.dil[0]}%–${r.dil[1]}%</dd>` : ''}
      <dt>主力资方</dt><dd>${r.who.map(id => esc(TYPE[id] ? TYPE[id].short || TYPE[id].n : id)).join('、')}</dd>
      ${r.gap ? `<dt>间隔</dt><dd>${esc(r.gap)}</dd>` : ''}</dl>
      <p><b>要拿到这一轮，通常已经有：</b>${rich(r.gate)}${r.src ? ref(...r.src) : ''}</p></article>`).join('')}</div>
    <section class="panel"><h3>上市：五个板块的门槛 <small>交易所规则原文</small></h3><div class="tbl"><table><thead><tr><th>板块</th><th>定位</th><th>典型上市标准（之一）</th><th>对你意味着</th></tr></thead><tbody>
      ${LISTING.map(l => `<tr><td><b>${esc(l.b)}</b></td><td>${esc(l.pos)}</td><td>${rich(l.std)}${ref(...l.src)}</td><td>${esc(l.mean)}</td></tr>`).join('')}
    </tbody></table></div></section>
    <section class="panel"><h3>市场数据 <small>募资与投资两端</small></h3><div class="tbl"><table><thead><tr><th>指标</th><th>数值</th><th>时间</th><th>说明什么</th></tr></thead><tbody>
      ${MARKET.map(m => `<tr><td>${esc(m.l)}</td><td class="n"><b>${esc(m.v)}</b>${ref(m.src)}</td><td class="n">${esc(m.d)}</td><td>${esc(m.mean)}</td></tr>`).join('')}
    </tbody></table></div></section>`;
  }

  function instRow(i) {
    const t = PROG.targets[i.id];
    return `<div class="inst"><b>${esc(i.n)}</b>
      <div class="ev">${esc(i.focus)}。${esc(i.ev)} <a href="${esc(i.src)}" target="_blank" rel="noopener">${esc(i.srcT)} ${I.ext}</a></div>
      <div class="act">${t ? `<select data-chg="tstatus" data-id="${i.id}" data-w aria-label="${esc(i.n)} 的进度">${TARGET_STATUS.map(s => `<option value="${s}" ${t.status === s ? 'selected' : ''}>${STATUS_N[s]}</option>`).join('')}</select>`
        : `<button class="btn ghost sm" data-act="target" data-id="${i.id}" data-w>＋ 目标清单</button>`}</div></div>`;
  }
  function typeCard(t, f) {
    const list = instsOf(t.id), shown = list.slice(0, 4), rest = list.slice(4);
    return `<article class="sc" id="type-${t.id}"><div class="hd"><h4>${esc(t.n)}${f >= 4 ? '<span class="tag ok"><i></i>优先</span>' : f <= 1 ? '<span class="tag">不建议</span>' : ''}</h4>
      <div class="fit"><span class="meter" style="width:72px" role="img" aria-label="适配度 ${f} 分"><i style="width:${f * 20}%"></i></span><b>${f}</b>/5</div></div>
      <p class="why">${rich(whyOf(t.id))}</p>
      <div class="facts"><div>常见额度<b>${esc(t.amt)}</b></div><div>周期<b>${esc(t.cyc)}</b></div><div>门槛<b>${rich(t.gate)}</b></div><div>要留意的条款<b>${rich(t.terms)}</b></div></div>
      <p class="why"><b>怎么接触：</b>${rich(t.how)}${t.src ? ref(...t.src) : ''}</p>
      ${list.length ? `<div class="insts">${shown.map(instRow).join('')}</div>${rest.length ? `<details class="more-insts"><summary>再看 ${rest.length} 家</summary><div class="insts">${rest.map(instRow).join('')}</div></details>` : ''}` : ''}
    </article>`;
  }
  function vSources() {
    const p = proj(), r = rankedTypes(), top = r.slice(0, 3).map(x => x.t.short || x.t.n).join('、');
    return `<div class="vhead"><div><div class="eyebrow">找对口资方</div><h1>${esc(p.short || p.name)}先找：${esc(top)}</h1>
      <p>${rich(SOURCES_LEAD)}</p></div></div>
    <section class="panel"><h3>适配度矩阵 <small>点格子看这一类资方的门槛和机构</small></h3>${heatmap()}</section>
    <div class="srcs">${r.map(({ t, f }) => typeCard(t, f)).join('')}</div>`;
  }

  function vPitch() {
    const p = proj(), pitchSteps = STEPS.filter(s => s.ph === 'pitch' && stepVisible(s));
    const mine = Object.values(PROG.targets);
    const reached = FUNNEL.map(s => ({ s, n: mine.filter(t => FUNNEL.indexOf(t.status) >= FUNNEL.indexOf(s)).length }));
    const mx = Math.max(1, ...reached.map(x => x.n));
    return `<div class="vhead"><div><div class="eyebrow">路演</div><h1>一份 BP、四次会、一个投决会</h1>
      <p>${rich(PITCH_LEAD)}</p></div></div>
    <section class="panel"><h3>投资机构内部怎么过会 <small>你见到的人和最终拍板的人不是同一批</small></h3>${meetFlow()}</section>
    <section class="panel"><h3>BP 结构 · ${BP.length} 页 <small>每页回答投资人的一个问题；下划线后是${esc(p.short || p.name)}的要点</small></h3>
      <div class="slides">${BP.map(b => `<div class="sl"><b>${esc(b.t)}</b><span>${esc(b.q)}</span>${p.bp && p.bp[b.id] ? `<em>${rich(p.bp[b.id])}</em>` : ''}</div>`).join('')}</div></section>
    <div class="cols">
      <section class="panel"><h3>路演材料与动作 <small>勾选即记入进度</small></h3>${pitchSteps.map(s => stepRow(s)).join('')}</section>
      <section class="panel"><h3>你的漏斗 <small>按「目标清单」里每家机构走到的最远一步</small></h3>
        ${mine.length ? `<div class="funnel">${reached.map(x => `<div class="fbar"><span>${STATUS_N[x.s]}</span><div class="tr" data-tip="${esc(`${x.n} 家\n${STATUS_N[x.s]}`)}"><i style="width:${(x.n / mx * 100).toFixed(1)}%"></i><em style="left:calc(${(x.n / mx * 100).toFixed(1)}% + 8px)">${x.n}</em></div></div>`).join('')}</div>`
        : `<p class="empty">还没有目标机构。到「找资方」点「＋ 目标清单」，这里会按进度画出漏斗。</p>`}
        <p class="small muted">${rich(FUNNEL_NOTE)}${ref(...FUNNEL_SRC)}</p></section>
    </div>
    <section class="panel"><h3>投资人必问 <small>${esc(p.short || p.name)}的专属问题在前</small></h3><div class="qa">
      ${[...(p.qa || []), ...QA].map(q => `<details><summary>${esc(q.q)}${I.chev}</summary><p>${rich(q.a)}${q.src ? ref(...q.src) : ''}</p></details>`).join('')}
    </div></section>`;
  }
  function meetFlow() {
    const W = 760, H = 150, n = MEETINGS.length, gap = 14, bw = (W - gap * (n - 1)) / n;
    let g = `<defs><marker id="ar" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 8 4 0 8z" fill="currentColor" opacity=".55"/></marker></defs>`;
    MEETINGS.forEach((m, i) => {
      const x = i * (bw + gap);
      g += `<rect x="${x.toFixed(1)}" y="26" width="${bw.toFixed(1)}" height="96" rx="14" class="${m.hi ? 'hi' : ''}"/>
        <text class="k" x="${(x + 12).toFixed(1)}" y="18">${esc(m.k)}</text>
        <text x="${(x + 12).toFixed(1)}" y="52">${esc(m.n)}</text>
        <text class="s" x="${(x + 12).toFixed(1)}" y="74">${esc(m.who)}</text>
        <text class="s" x="${(x + 12).toFixed(1)}" y="92">${esc(m.dur)}</text>
        <text class="s" x="${(x + 12).toFixed(1)}" y="110">${esc(m.out)}</text>`;
      if (i < n - 1) g += `<line x1="${(x + bw + 2).toFixed(1)}" x2="${(x + bw + gap - 2).toFixed(1)}" y1="74" y2="74" marker-end="url(#ar)" style="color:var(--faint)"/>`;
    });
    return `<figure class="fig"><div class="flow"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(MEETINGS.map(m => m.n).join(' → '))}">${g}</svg></div><figcaption>${rich(MEET_NOTE)}${ref(...MEET_SRC)}</figcaption></figure>`;
  }

  function vProcess() {
    const cp = currentPhase();
    return `<div class="vhead"><div><div class="eyebrow">单轮交割</div><h1>一轮融资：从准备到打款</h1>
      <p>${rich(PROCESS_LEAD)}</p></div></div>
    <section class="panel"><h3>时间线 <small>悬停看每段时长</small></h3>${gantt()}
      <div class="branch"><span>你的投资方里有：</span><button class="chip" aria-pressed="${S.gov}" data-act="br" data-id="gov">国资 / 国有创投</button><button class="chip" aria-pressed="${S.usd}" data-act="br" data-id="usd">美元基金（境外架构）</button><span class="small">打开后对应支线步骤会加入清单</span></div></section>
    ${PHASES.map(ph => { const ss = STEPS.filter(s => s.ph === ph.id && stepVisible(s)); if (!ss.length) return ''; const d = ss.filter(s => stepDone(s.id)).length;
      return `<section class="panel phase${ph.id === cp.id ? ' now' : ''}" id="ph-${ph.id}"><header><h3>${esc(ph.n)} <small>${ph.w ? wk(ph.w) : ''}</small></h3><span class="cnt">${d} / ${ss.length}</span></header>
        <p>${rich(ph.d)}${ph.src ? ref(...ph.src) : ''}</p>${ss.map(s => stepRow(s)).join('')}</section>`; }).join('')}`;
  }

  function vProgress() {
    const p = proj(), pr = progressOf(), cp = currentPhase(), ts = PROG.targets;
    const card = id => { const i = INSTS.find(x => x.id === id); if (!i) return ''; const t = ts[id];
      return `<div class="card"><b>${esc(i.n)}</b><small>${esc(TYPE[i.type] ? TYPE[i.type].short || TYPE[i.type].n : '')}${t.at ? ' · ' + esc(t.at) : ''}</small>
        <select data-chg="tstatus" data-id="${id}" data-w aria-label="${esc(i.n)} 的进度">${TARGET_STATUS.map(s => `<option value="${s}" ${t.status === s ? 'selected' : ''}>${STATUS_N[s]}</option>`).join('')}</select>
        <button class="btn ghost sm" data-act="untarget" data-id="${id}" data-w>移出清单</button></div>`; };
    const notes = visibleSteps().filter(s => stepNote(s.id));
    return `<div class="vhead"><div><div class="eyebrow">我的进度 · ${esc(p.name)}</div><h1>完成 ${pr.done} / ${pr.total} 步，当前在「${esc(cp.n)}」</h1>
      <p>${mode === 'db' ? '进度保存在云端，换设备打开同一链接也能看到。' : mode === 'local' ? '当前是本地模式：进度只保存在这个浏览器里。' : '正在连接数据…'}${p.custom ? ' 这是你新增的项目，' : ''}${p.custom ? '<button class="btn ghost sm" data-act="editproj" data-w>编辑或删除项目</button>' : ''}</p></div></div>
    <div class="cols">
      <section class="panel"><h3>各阶段完成度</h3><div class="phbars">${PHASES.map(ph => { const ss = STEPS.filter(s => s.ph === ph.id && stepVisible(s)); if (!ss.length) return ''; const d = ss.filter(s => stepDone(s.id)).length;
        return `<div class="phb${ph.id === cp.id ? ' now' : ''}"><span>${esc(ph.n)}</span><span class="meter" role="img" aria-label="${esc(ph.n)} 完成 ${d} / ${ss.length}"><i style="width:${(d / ss.length * 100).toFixed(1)}%"></i></span><b>${d}/${ss.length}</b></div>`; }).join('')}</div>
        <button class="btn ghost sm" data-act="tab" data-id="process" style="justify-self:start">去勾选步骤 →</button></section>
      <section class="panel"><h3>写过备注的步骤 <small>${notes.length} 条</small></h3>${notes.length ? notes.map(s => `<div class="steprow"><span></span><div><b class="t">${esc(s.t)}</b><div class="d">${esc(stepNote(s.id))}</div></div><span></span></div>`).join('') : '<p class="empty">在任意步骤展开后写备注，会汇总到这里。</p>'}</section>
    </div>
    <section class="panel"><h3>目标机构看板 <small>${Object.keys(ts).length} 家 · 从「找资方」加入</small></h3>
      <div class="board">${COLS.map(c => { const ids = Object.keys(ts).filter(id => c.s.includes(ts[id].status) && INSTS.some(i => i.id === id));
        return `<div class="col"><h4>${c.n}<b>${ids.length}</b></h4>${ids.length ? ids.map(card).join('') : '<p class="empty">—</p>'}</div>`; }).join('')}</div></section>`;
  }

  // ----- sheets -----
  function typeSheet(tid, pid) {
    const t = TYPE[tid], p = allProjects().find(x => x.id === pid) || proj();
    openSheet(`<div class="hd"><div><div class="eyebrow">资方类型</div><h2>${esc(t.n)}</h2><p>${esc(p.name)} 适配度 <b class="num">${fitOf(tid, p)}</b> / 5</p></div><button class="x" data-act="close" aria-label="关闭">${I.x}</button></div>
      <div class="sec"><h3>为什么是这个分数</h3><p>${plainRich(whyOf(tid, p))}</p></div>
      <div class="sec"><h3>要点</h3><div class="facts" style="grid-template-columns:repeat(2,minmax(0,1fr))"><div>常见额度<b>${esc(t.amt)}</b></div><div>周期<b>${esc(t.cyc)}</b></div><div>门槛<b>${plainRich(t.gate)}</b></div><div>要留意的条款<b>${plainRich(t.terms)}</b></div></div><p><b>怎么接触：</b>${plainRich(t.how)}</p></div>
      <div class="sec"><h3>机构 <small class="muted">${instsOf(tid, p).length} 家</small></h3><div class="insts">${instsOf(tid, p).map(instRow).join('') || '<p class="muted small">这一类不点名具体机构。</p>'}</div></div>
      <div class="sec"><p class="small">来源：${(t.src || []).filter(k => SRC[k]).map(k => `<a href="${esc(SRC[k].u)}" target="_blank" rel="noopener">${esc(SRC[k].t)}</a>`).join('；') || '见「找资方」页底部'}</p></div>`);
  }
  function projectForm(edit) {
    const p = edit ? proj() : { name: '', sector: 'saas', stage: 'seed', note: '' };
    openSheet(`<div class="hd"><div><div class="eyebrow">${edit ? '编辑项目' : '新增项目'}</div><h2>${edit ? esc(p.name) : '把另一个项目放进来'}</h2><p>赛道决定资方适配度；下一轮决定轮次地图上的位置。</p></div><button class="x" data-act="close" aria-label="关闭">${I.x}</button></div>
      <form class="form" data-sub="${edit ? 'saveproj' : 'addproj'}">
        <label for="pf-name">项目名称<input id="pf-name" name="name" maxlength="16" required value="${esc(p.name)}" placeholder="例如：UNO 日刊"></label>
        <label for="pf-sector">赛道<select id="pf-sector" name="sector">${Object.entries(SECTORS).map(([k, s]) => `<option value="${k}" ${p.sector === k ? 'selected' : ''}>${esc(s.n)}</option>`).join('')}</select></label>
        <label for="pf-stage">下一轮要融<select id="pf-stage" name="stage">${ROUNDS.map(r => `<option value="${r.id}" ${p.stage === r.id ? 'selected' : ''}>${esc(r.n)}</option>`).join('')}</select></label>
        <label for="pf-note">备注<textarea id="pf-note" name="note" maxlength="200" rows="3" placeholder="一句话说明项目">${esc(p.note)}</textarea></label>
        <div class="acts"><button class="btn pri" type="submit">${edit ? '保存' : '新增项目'}</button><button class="btn ghost" type="button" data-act="close">取消</button></div>
      </form>
      ${edit ? `<div class="sec"><h3>删除项目</h3><p>会同时删除这个项目的全部进度和目标清单。</p><div id="delbox"><button class="btn ghost sm" data-act="askdel">删除「${esc(p.name)}」</button></div></div>` : ''}`);
  }

  // ----- actions -----
  Object.assign(ACT, {
    tab: el => { S.tab = el.dataset.id; saveUI(); render(); $('main').scrollTop = 0; },
    open: el => { S.open[el.dataset.id] = !S.open[el.dataset.id]; render(); const t = $('note-' + el.dataset.id); if (t && S.open[el.dataset.id]) t.focus({ preventScroll: true }); },
    step: el => { if (!setStep(el.dataset.id, { done: el.checked })) el.checked = !el.checked; render(); },
    note: el => { const id = el.dataset.id, v = el.value.slice(0, 1000); clearTimeout(ACT.note[id]); ACT.note[id] = setTimeout(() => { if (v !== stepNote(id)) setStep(id, { note: v }); }, 700); },
    br: el => { S[el.dataset.id] = !S[el.dataset.id]; saveUI(); render(); },
    type: el => typeSheet(el.dataset.id, el.dataset.pid || S.pid),
    target: el => { if (setTarget(el.dataset.id, { status: 'target' })) { toast('已加入目标清单'); render(); if ($('sheet').classList.contains('on')) { const b = $('sheet').querySelector(`[data-act="target"][data-id="${el.dataset.id}"]`); if (b) b.replaceWith(Object.assign(document.createElement('span'), { className: 'tag ok', textContent: '已加入' })); } } },
    untarget: el => { if (setTarget(el.dataset.id, null)) render(); },
    tstatus: el => { if (setTarget(el.dataset.id, { status: el.value })) render(); },
    editproj: () => projectForm(true),
    addproj: el => { const f = new FormData(el), name = String(f.get('name') || '').trim(); if (!name) return; closeSheet(); addProject({ name, sector: f.get('sector'), stage: f.get('stage'), note: String(f.get('note') || '').trim() }); },
    saveproj: async el => {
      const f = new FormData(el), p = proj(), name = String(f.get('name') || '').trim(); if (!name || !canWrite()) return;
      const body = { name, sector: f.get('sector'), stage: f.get('stage'), note: String(f.get('note') || '').trim(), order: p.order };
      closeSheet();
      if (mode === 'db') { try { await DB.doc('projects/' + p.id).set(body); } catch (e) { onDbError(e); } }
      else { CUSTOM = CUSTOM.map(x => x.id === p.id ? cleanProj({ id: p.id, ...body }) : x); lsSet('custom', CUSTOM.map(({ custom, ...r }) => r)); render(); }
      toast('已保存');
    },
    askdel: () => { $('delbox').innerHTML = `<div class="confirm">确定删除？这一步不能撤销。<div class="acts" style="display:flex;gap:8px"><button class="btn sm" style="background:var(--bad);color:#fff" data-act="dodel">删除</button><button class="btn ghost sm" data-act="close">取消</button></div></div>`; },
    dodel: () => { closeSheet(); deleteProject(S.pid); }
  });

  const VIEWS = { overview: vOverview, rounds: vRounds, sources: vSources, pitch: vPitch, process: vProcess, progress: vProgress };
  function renderModule(main) {
    if (!VIEWS[S.tab]) S.tab = 'overview';
    REFS = [];
    const body = VIEWS[S.tab]();
    main.innerHTML = `<div class="subnav"><div class="seg" role="tablist" aria-label="融资能力">${TABS.map(t => `<button role="tab" aria-selected="${S.tab === t.id}" data-act="tab" data-id="${t.id}">${t.n}</button>`).join('')}</div></div>
      <section class="view" role="tabpanel">${body}${refsHTML()}</section>${foot()}`;
  }
  return { render: renderModule, projectForm };
})();
