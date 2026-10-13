// ---------- product module: idea → PMF, launching in mainland China ----------
const Product = (() => {
  const TABS = [
    { id: 'overview', n: '总览' }, { id: 'route', n: '路线' }, { id: 'launch', n: '中国上线' },
    { id: 'metrics', n: '指标与 PMF' }, { id: 'audit', n: '产品体检' }
  ];
  const FOOT = '法规条文与基准都附来源和日期；留存基准来自美国从业者调查，没有中国同口径数据。PMF 判定是辅助判断，不替代对用户的直接了解。内容不构成法律意见，上线前请律师复核。';
  const ST_N = { ok: '有', part: '部分', gap: '缺' };
  const V_N = { must: '必须', maybe: '视情况', no: '不需要' };
  const WEEKS = [1, 4, 12, 24];
  const proj = () => curProj();
  const pctS = (v, d = 0) => v == null || !isFinite(v) ? '—' : (v * 100).toFixed(d) + '%';
  const n0 = v => v == null ? '—' : Number(v).toLocaleString('zh-CN');

  // ISO week id, e.g. 2026-W41
  function isoWeek(d = new Date()) {
    const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const day = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - day);
    const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
    return `${t.getUTCFullYear()}-W${String(Math.ceil(((t - y0) / 864e5 + 1) / 7)).padStart(2, '0')}`;
  }
  const weekOk = w => /^\d{4}-W(0[1-9]|[1-4]\d|5[0-3])$/.test(w);

  // ----- data derived from the per-project records -----
  const cohorts = () => recs('cohorts').sort((a, b) => a.id.localeCompare(b.id));
  const metrics = () => recs('metrics').sort((a, b) => a.id.localeCompare(b.id));
  const latestSurvey = type => recs('surveys').filter(s => s.type === type).sort((a, b) => (a.date || a.at).localeCompare(b.date || b.at)).pop();
  const category = (p = proj()) => {
    const m = PROG.meta.product, id = (m && RET_CATS.some(c => c.id === m.category)) ? m.category : (DEFAULT_CAT[p.sector] || 'consumer-saas');
    return RET_CATS.find(c => c.id === id);
  };
  // Pooled retention across cohorts that have the week recorded.
  function pooled(week, base = 'size') {
    const cs = cohorts().filter(c => c['w' + week] != null && (base === 'size' || c[base] != null));
    const den = cs.reduce((s, c) => s + (base === 'size' ? c.size : c[base]), 0);
    return den ? { v: cs.reduce((s, c) => s + c['w' + week], 0) / den, n: cs.length } : null;
  }
  function pmfEval() {
    const cs = cohorts(), w4n = cs.filter(c => c.w4 != null).length, pmf = latestSurvey('pmf'), cat = category();
    const flat = pooled(12, 'w4'), h24 = pooled(24);
    const r = {
      data: { pass: w4n >= 3 || !!(pmf && pmf.n >= 40), known: true, val: `${w4n} 个队列有第 4 周数据${pmf ? `；调研 ${pmf.n} 份` : '；还没有调研'}` },
      ellis: pmf ? { pass: pmf.very / pmf.n >= .4, known: true, val: `${pctS(pmf.very / pmf.n)}（${pmf.n} 份）` } : { pass: false, known: false, val: '还没有调研' },
      flat: flat ? { pass: flat.v >= .8, known: true, val: `第 12 周是第 4 周的 ${pctS(flat.v)}（${flat.n} 个队列）` }
        : cs.some(c => c.w4 != null && c.w12 != null) ? { pass: false, known: true, val: '第 4 周留存为 0，曲线没有可走平的部分' }
          : { pass: false, known: false, val: '还没有同时有第 4、12 周数据的队列' },
      height: h24 ? { pass: h24.v * 100 >= cat.good, known: true, val: `${pctS(h24.v)}，${cat.n}「好」线 ${cat.good}%` } : { pass: false, known: false, val: `还没有第 24 周数据（${cat.n}「好」线 ${cat.good}%）` }
    };
    const passed = PMF_RULES.filter(x => r[x.id].pass).length;
    const status = !r.data.pass ? { k: 'none', n: '数据不够判断', d: '先按周记录留存队列，或做一次不少于 40 人的「非常失望」调研。' }
      : passed === PMF_RULES.length ? { k: 'yes', n: '有 PMF 信号', d: '四条判定都通过。下一步是规模化前检查：单位经济、获客渠道、系统容量。' }
        : passed >= 3 ? { k: 'near', n: '接近 PMF', d: '还差一条，看下面没通过的那项。' }
          : { k: 'not', n: '还在验证', d: '把精力放在核心用户和留存上，先别花钱买量。' };
    return { r, passed, total: PMF_RULES.length, status, cat };
  }
  function latestMetrics() {
    const m = metrics().filter(x => ['wau', 'newUsers', 'payers', 'revenue'].some(k => x[k] != null)).pop(), w4 = pooled(4), w12 = pooled(12);
    return { m, w4, w12, conv: m && m.wau && m.payers != null ? m.payers / m.wau : null };
  }

  // ----- small pieces -----
  const chipV = v => `<span class="lv ${v}">${V_N[v]}</span>`;
  const chipS = st => `<span class="as ${st}">${ST_N[st]}</span>`;
  const ruleRow = (rule, res) => `<div class="rule-row ${res.pass ? 'pass' : res.known ? 'fail' : 'unk'}"><i aria-hidden="true">${res.pass ? '✓' : res.known ? '✕' : '–'}</i><div><b>${esc(rule.n)}</b><span>${esc(res.val)}</span><small>${esc(rule.how)}${ref(...rule.src)}</small></div></div>`;
  function pmfRing(ev) {
    const C = 2 * Math.PI * 56, off = C * (1 - ev.passed / ev.total);
    return `<div class="ring pmf-${ev.status.k}"><svg viewBox="0 0 132 132" aria-hidden="true"><circle class="tr" cx="66" cy="66" r="56" fill="none" stroke-width="7"/><circle class="fg" cx="66" cy="66" r="56" fill="none" stroke-width="7" stroke-linecap="round" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}" transform="rotate(-90 66 66)"/></svg>
      <div><b>${ev.passed}/${ev.total}</b><span>判定条件</span></div></div>`;
  }
  const targetDone = (t, ev) => t.step ? stepDone(t.step) : t.rule === 'all' ? ev.passed === ev.total : t.rule ? ev.r[t.rule].pass : t.metric ? metrics().filter(m => m[t.metric] != null).length >= 3 : null;

  // ----- charts -----
  function retentionChart() {
    const cs = cohorts().slice(-5), cat = category(), W = 760, H = 300, L = 54, R = 92, T = 20, B = 40;
    const x = w => L + w / 24 * (W - L - R), y = v => T + (1 - v) * (H - T - B);
    let g = `<g class="grid">${[0, .25, .5, .75, 1].map(v => `<line x1="${L}" x2="${W - R}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}"/>`).join('')}</g>`;
    g += [0, .25, .5, .75, 1].map(v => `<text x="${L - 8}" y="${(y(v) + 4).toFixed(1)}" text-anchor="end">${v * 100}%</text>`).join('');
    // Week 1 sits 25px from week 0, so it gets a tick but no label (its points still carry tooltips).
    g += `<g class="axis"><line x1="${x(1).toFixed(1)}" x2="${x(1).toFixed(1)}" y1="${H - B}" y2="${H - B + 5}"/></g>`;
    g += [0, 4, 12, 24].map(w => `<text x="${x(w).toFixed(1)}" y="${H - B + 18}" text-anchor="${w === 0 ? 'start' : 'middle'}">${w === 0 ? '注册周' : '第 ' + w + ' 周'}</text>`).join('');
    for (const [lv, k] of [[cat.good, '好'], [cat.great, '很好']]) g += `<line class="bench" x1="${L}" x2="${W - R}" y1="${y(lv / 100).toFixed(1)}" y2="${y(lv / 100).toFixed(1)}"/><text class="bench-t" x="${W - R + 6}" y="${(y(lv / 100) + 4).toFixed(1)}">${k} ${lv}%</text>`;
    cs.forEach((c, i) => {
      const pts = [[0, 1], ...WEEKS.filter(w => c['w' + w] != null).map(w => [w, c['w' + w] / c.size])];
      g += `<polyline class="ln s${i + 1}" points="${pts.map(([w, v]) => `${x(w).toFixed(1)},${y(Math.min(1, v)).toFixed(1)}`).join(' ')}"/>`;
      pts.slice(1).forEach(([w, v]) => { g += `<g class="h" tabindex="0" data-tip="${esc(`${pctS(v, 1)}\n${c.id} 队列 · 第 ${w} 周 · ${n0(c['w' + w])} / ${n0(c.size)} 人`)}"><circle class="hit" cx="${x(w).toFixed(1)}" cy="${y(Math.min(1, v)).toFixed(1)}" r="12"/><circle class="pt s${i + 1} mk" cx="${x(w).toFixed(1)}" cy="${y(Math.min(1, v)).toFixed(1)}" r="4.5"/></g>`; });
    });
    if (!cs.length) g += `<text class="lb" x="${(L + (W - R)) / 2}" y="${H / 2}" text-anchor="middle">录入第一个队列后，这里会画出留存曲线</text>`;
    return `<figure class="fig"><div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="各注册周队列的留存曲线，对照${esc(cat.n)}的 6 个月留存基准">${g}</svg></div>
      <div class="legend">${cs.map((c, i) => `<span><i class="s${i + 1}"></i>${esc(c.id)}（${n0(c.size)} 人）</span>`).join('')}<span><i class="bench"></i>${esc(cat.n)}第 24 周基准${ref('lenny-retention')}</span></div>
      <figcaption>横轴按真实周数排布；曲线越早变平越好。最多显示最近 5 个队列。</figcaption></figure>`;
  }
  function weeklyChart() {
    const ms = metrics().slice(-16), W = 760, H = 240, L = 54, R = 16, T = 16, B = 36;
    if (!ms.length) return '<p class="empty">录入第一周数据后，这里会画出周活和新增。</p>';
    // Four even, whole-number steps of 1, 1.5, 2, 2.5, 3 or 5 × 10ⁿ, so every tick is a round number.
    const max = Math.max(1, ...ms.flatMap(m => [m.wau || 0, m.newUsers || 0]));
    const raw = max / 4, mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const step = Math.max(1, [1, 1.5, 2, 2.5, 3, 5, 10].map(k => k * mag).filter(Number.isInteger).find(v => v >= raw));
    const top = step * 4, ticks = [0, 1, 2, 3, 4].map(k => k * step);
    const x = i => ms.length < 2 ? (L + W - R) / 2 : L + i / (ms.length - 1) * (W - L - R), y = v => T + (1 - v / top) * (H - T - B);
    let g = `<g class="grid">${ticks.map(v => `<line x1="${L}" x2="${W - R}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}"/>`).join('')}</g>`;
    g += ticks.map(v => `<text x="${L - 8}" y="${(y(v) + 4).toFixed(1)}" text-anchor="end">${v.toLocaleString('zh-CN')}</text>`).join('');
    ms.forEach((m, i) => { if (ms.length <= 8 || i % 2 === 0 || i === ms.length - 1) g += `<text x="${x(i).toFixed(1)}" y="${H - B + 18}" text-anchor="middle">${esc(m.id.slice(5))}</text>`; });
    [['wau', 's1', '周活'], ['newUsers', 's2', '新增']].forEach(([k, cls, n]) => {
      const pts = ms.map((m, i) => m[k] == null ? null : [i, m[k]]).filter(Boolean);
      if (pts.length > 1) g += `<polyline class="ln ${cls}" points="${pts.map(([i, v]) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')}"/>`;
      pts.forEach(([i, v]) => { g += `<g class="h" tabindex="0" data-tip="${esc(`${n0(v)} 人\n${ms[i].id} · ${n}`)}"><circle class="hit" cx="${x(i).toFixed(1)}" cy="${y(v).toFixed(1)}" r="12"/><circle class="pt ${cls} mk" cx="${x(i).toFixed(1)}" cy="${y(v).toFixed(1)}" r="4.5"/></g>`; });
    });
    return `<figure class="fig"><div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="每周活跃用户和新增用户">${g}</svg></div>
      <div class="legend"><span><i class="s1"></i>周活</span><span><i class="s2"></i>新增</span></div></figure>`;
  }

  // ----- views -----
  function vOverview() {
    const p = proj(), ev = pmfEval(), cp = currentPhase('product'), pr = progressOf('product');
    const todo = visibleSteps('product').filter(s => !stepDone(s.id)).slice(0, 3);
    const au = AUDIT[p.id], gaps = au ? AUDIT_DIMS.filter(d => au[d.id] && au[d.id].st === 'gap') : [];
    const blockers = LAUNCH.filter(r => r.v[S.pform] === 'must' || (r.for && r.for.includes(p.sector) && r.v[S.pform] !== 'no'));
    const stage = (ROUNDS.find(r => r.id === p.stage) || ROUNDS[0]);
    const targets = FUND_TARGETS[stage.id] || [];
    const lm = latestMetrics();
    return `<div class="vhead"><div><div class="eyebrow">产品能力 · 想法到 PMF</div><h1>${esc(p.name)} 的产品路线</h1>
      <p>完成 ${pr.done} / ${pr.total} 步，当前在「${esc(cp.n)}」。${au ? `代码体检发现 ${gaps.length} 个缺口。` : ''}</p></div></div>
    <section class="panel"><div class="hero">${pmfRing(ev)}
      <div class="where"><h2>PMF 判定：<em class="pmf-t ${ev.status.k}">${esc(ev.status.n)}</em></h2>
        <p class="lead">${esc(ev.status.d)}</p>
        <div class="chips"><button class="btn pri sm" data-act="ptab" data-id="metrics">录入指标</button><button class="btn ghost sm" data-act="ptab" data-id="route">打开路线</button>${au ? '<button class="btn ghost sm" data-act="ptab" data-id="audit">看产品体检</button>' : ''}</div>
      </div></div>
      <div class="rules">${PMF_RULES.map(x => ruleRow(x, ev.r[x.id])).join('')}</div></section>
    ${lm.m ? `<section class="panel"><h3>最近一周 <small>${esc(lm.m.id)}</small></h3><div class="kpis">
      <div class="kpi"><b>${n0(lm.m.wau)}</b><span>周活</span><em>新增 ${n0(lm.m.newUsers)}</em></div>
      <div class="kpi"><b>${pctS(lm.conv, 1)}</b><span>付费转化</span><em>付费 ${n0(lm.m.payers)} 人</em></div>
      <div class="kpi"><b>${lm.w4 ? pctS(lm.w4.v) : '—'}</b><span>第 4 周留存</span><em>${lm.w4 ? lm.w4.n + ' 个队列合计' : '还没有队列数据'}</em></div>
      <div class="kpi"><b>${lm.w12 ? pctS(lm.w12.v) : '—'}</b><span>第 12 周留存</span><em>${lm.w12 ? lm.w12.n + ' 个队列合计' : '—'}</em></div></div></section>` : ''}
    <div class="cols">
      <section class="panel"><h3>先做这 3 件事 <small>按路线顺序</small></h3>${todo.length ? todo.map(s => stepRow(s, { phase: true })).join('') : '<p class="empty">全部步骤都已完成。</p>'}</section>
      <section class="panel"><h3>融资需要的数据 <small>下一轮：${esc(stage.n)}</small></h3>
        <div class="tgt">${targets.map(t => { const d = targetDone(t, ev); return `<div class="${d ? 'ok' : d === false ? 'no' : ''}"><i aria-hidden="true">${d ? '✓' : d === false ? '○' : '·'}</i><span>${esc(t.t)}</span>${t.step ? `<button class="linkbtn" data-act="gostep" data-id="${t.step}">去做</button>` : ''}</div>`; }).join('')}</div>
        <p class="small muted">由融资模块「${esc(stage.n)}」的门槛整理成产品目标；完成后，融资模块的路演页会引用这里的数据。</p>
        <button class="btn ghost sm" data-act="gomod" data-id="fund" style="justify-self:start">去融资模块 →</button></section>
    </div>
    <section class="panel"><h3>上线前必须处理 <small>按「${esc(LAUNCH_FORMS.find(f => f.id === S.pform).n)}」形态，可在「中国上线」页切换</small></h3>
      <div class="block-list">${blockers.map(r => `<div><b>${esc(r.n)}</b>${chipV(r.v[S.pform])}${r.step && visibleSteps('product').some(s => s.id === r.step) ? (stepDone(r.step) ? '<span class="tag ok"><i></i>已完成</span>' : `<button class="linkbtn" data-act="gostep" data-id="${r.step}">去做</button>`) : ''}<span>${rich(r.why)}</span></div>`).join('')}</div></section>`;
  }

  function vRoute() {
    const cp = currentPhase('product');
    return `<div class="vhead"><div><div class="eyebrow">路线</div><h1>从想法到 PMF 的 ${PD_PHASES.length} 段路</h1>
      <p>每一步都可以勾选、写备注；带项目名的提示来自对仓库代码的体检。</p></div></div>
    <section class="panel"><div class="phbars">${PD_PHASES.map(ph => { const ss = visibleSteps('product').filter(s => s.ph === ph.id); const d = ss.filter(s => stepDone(s.id)).length;
      return `<div class="phb${ph.id === cp.id ? ' now' : ''}"><span>${esc(ph.n)}</span><span class="meter" role="img" aria-label="${esc(ph.n)} 完成 ${d} / ${ss.length}"><i style="width:${ss.length ? (d / ss.length * 100).toFixed(1) : 0}%"></i></span><b>${d}/${ss.length}</b></div>`; }).join('')}</div></section>
    ${PD_PHASES.map(ph => { const ss = visibleSteps('product').filter(s => s.ph === ph.id); if (!ss.length) return ''; const d = ss.filter(s => stepDone(s.id)).length;
      return `<section class="panel phase${ph.id === cp.id ? ' now' : ''}" id="ph-${ph.id}"><header><h3>${esc(ph.n)} <small>${esc(ph.short)}</small></h3><span class="cnt">${d} / ${ss.length}</span></header>
        <p>${rich(ph.d)}</p>${ss.map(s => stepRow(s)).join('')}</section>`; }).join('')}`;
  }

  function vLaunch() {
    const p = proj(), web = LAUNCH.filter(r => r.v.web === 'must').map(r => r.n).join('、');
    const vis = new Set(visibleSteps('product').map(s => s.id));
    // A row links to its step only when that step is on this project's route.
    const stepCell = sid => !sid || !vis.has(sid) ? '—' : stepDone(sid) ? '<span class="tag ok"><i></i>已完成</span>' : `<button class="linkbtn" data-act="gostep" data-id="${sid}">去做</button>`;
    return `<div class="vhead"><div><div class="eyebrow">中国上线</div><h1>先做网页，必须做的只有 ${LAUNCH.filter(r => r.v.web === 'must').length} 项</h1>
      <p>网页 / H5 必须做：${esc(web)}。小程序和 App 还要多做 App 备案、遵守必要个人信息范围，安卓商店常要软著。收费、健康数据、支付、证券相关业务另有要求，标「视情况」的行对 ${esc(p.short || p.name)} 是否适用写在说明里。</p></div></div>
    <section class="panel"><h3>交付形态 × 合规要求 <small>点上方形态切换高亮列；带项目标签的行与当前项目直接相关</small></h3>
      <div class="branch"><span>我先做：</span>${LAUNCH_FORMS.map(f => `<button class="chip" aria-pressed="${S.pform === f.id}" data-act="pform" data-id="${f.id}">${esc(f.n)}</button>`).join('')}</div>
      <div class="tbl lmx"><table><thead><tr><th>要求</th>${LAUNCH_FORMS.map(f => `<th class="c${S.pform === f.id ? ' on' : ''}">${esc(f.n)}</th>`).join('')}<th>说明</th><th>步骤</th></tr></thead><tbody>
      ${LAUNCH.map(r => `<tr class="${r.for && r.for.includes(p.sector) ? 'hl' : ''}"><td><b>${esc(r.n)}</b>${r.for && r.for.includes(p.sector) ? `<br><span class="tag now">${esc(p.short || p.name)} 重点</span>` : ''}</td>
        ${LAUNCH_FORMS.map(f => `<td class="c${S.pform === f.id ? ' on' : ''}">${chipV(r.v[f.id])}</td>`).join('')}
        <td class="why">${rich(r.why)}</td><td>${stepCell(r.step)}</td></tr>`).join('')}
      </tbody></table></div>
      <div class="legend"><span>${chipV('must')} 这一形态一定要做</span><span>${chipV('maybe')} 取决于你是否收费、处理敏感信息、做支付等</span><span>${chipV('no')} 这一形态不涉及</span></div></section>`;
  }

  function vMetrics() {
    const ev = pmfEval(), cat = ev.cat, pmf = latestSurvey('pmf'), nps = latestSurvey('nps'), wk = isoWeek();
    const npsOf = x => (x.promoters - x.detractors) / (x.promoters + x.passives + x.detractors) * 100;
    const npsV = nps ? npsOf(nps) : null;
    const svList = (type, head, cell) => { const xs = recs('surveys').filter(x => x.type === type).sort((a, b) => b.date.localeCompare(a.date));
      return xs.length ? `<div class="tbl compact"><table><thead><tr><th>日期</th>${head}<th></th></tr></thead><tbody>${xs.map(x => `<tr><td class="n">${esc(x.date)}</td>${cell(x)}<td>${del('surveys', x.id)}</td></tr>`).join('')}</tbody></table></div>` : ''; };
    const del = (c, id) => `<button class="linkbtn danger" data-act="delrec" data-c="${c}" data-id="${esc(id)}" data-w>${S.armDel === c + '/' + id ? '确认删除' : '删除'}</button>`;
    return `<div class="vhead"><div><div class="eyebrow">指标与 PMF</div><h1>判定：${esc(ev.status.n)}（${ev.passed}/${ev.total}）</h1>
      <p>每周录入一次。留存按注册周算队列：「第 4 周留存」= 这周注册的人里，第 4 周还在用的人数。数据保存在${mode === 'db' ? '云端' : '这个浏览器'}。</p></div></div>
    <section class="panel"><div class="rules">${PMF_RULES.map(x => ruleRow(x, ev.r[x.id])).join('')}</div>
      <label class="inline" for="pm-cat">品类基准<select id="pm-cat" data-chg="pcat" data-w>${RET_CATS.map(c => `<option value="${c.id}" ${c.id === cat.id ? 'selected' : ''}>${esc(c.n)}（好 ${c.good}% · 很好 ${c.great}%）</option>`).join('')}</select></label></section>
    <section class="panel"><h3>留存曲线 <small>按注册周的队列</small></h3>${retentionChart()}</section>
    <div class="cols">
      <section class="panel"><h3>录入留存队列</h3>
        <form class="form grid3" data-sub="addcohort">
          <label for="ch-wk">注册周<input id="ch-wk" name="wk" type="week" value="${wk}" placeholder="${wk}" pattern="\\d{4}-W\\d{2}" required></label>
          <label for="ch-size">注册人数<input id="ch-size" name="size" type="number" min="1" required></label>
          ${WEEKS.map(w => `<label for="ch-w${w}">第 ${w} 周还在<input id="ch-w${w}" name="w${w}" type="number" min="0" placeholder="未到可空"></label>`).join('')}
          <div class="acts"><button class="btn pri sm" type="submit" data-w>保存队列</button></div>
        </form>
        ${cohorts().length ? `<div class="tbl compact"><table><thead><tr><th>队列</th><th>人数</th>${WEEKS.map(w => `<th>第 ${w} 周</th>`).join('')}<th></th></tr></thead><tbody>${cohorts().slice().reverse().map(c => `<tr><td class="n">${esc(c.id)}</td><td class="n">${n0(c.size)}</td>${WEEKS.map(w => `<td class="n">${c['w' + w] == null ? '—' : pctS(c['w' + w] / c.size)}</td>`).join('')}<td>${del('cohorts', c.id)}</td></tr>`).join('')}</tbody></table></div>` : ''}
      </section>
      <section class="panel"><h3>录入本周指标</h3>
        <form class="form grid3" data-sub="addmetric">
          <label for="mt-wk">周<input id="mt-wk" name="wk" type="week" value="${wk}" placeholder="${wk}" pattern="\\d{4}-W\\d{2}" required></label>
          <label for="mt-wau">周活<input id="mt-wau" name="wau" type="number" min="0"></label>
          <label for="mt-new">新增<input id="mt-new" name="newUsers" type="number" min="0"></label>
          <label for="mt-pay">付费人数<input id="mt-pay" name="payers" type="number" min="0"></label>
          <label for="mt-rev">收入（元）<input id="mt-rev" name="revenue" type="number" min="0"></label>
          <label for="mt-note">备注<input id="mt-note" name="note" type="text" maxlength="200"></label>
          <div class="acts"><button class="btn pri sm" type="submit" data-w>保存本周</button></div>
        </form>
      </section>
    </div>
    <section class="panel"><h3>周活与新增 <small>最近 16 周</small></h3>${weeklyChart()}
      ${metrics().length ? `<div class="tbl"><table><thead><tr><th>周</th><th>周活</th><th>新增</th><th>付费</th><th>付费转化</th><th>收入（元）</th><th>备注</th><th></th></tr></thead><tbody>${metrics().slice().reverse().map(m => `<tr><td class="n">${esc(m.id)}</td><td class="n">${n0(m.wau)}</td><td class="n">${n0(m.newUsers)}</td><td class="n">${n0(m.payers)}</td><td class="n">${m.wau && m.payers != null ? pctS(m.payers / m.wau, 1) : '—'}</td><td class="n">${n0(m.revenue)}</td><td>${esc(m.note)}</td><td>${del('metrics', m.id)}</td></tr>`).join('')}</tbody></table></div>` : ''}</section>
    <div class="cols">
      <section class="panel"><h3>「非常失望」调研${ref('superhuman-pmf')}</h3>
        ${pmf ? `<div class="kpis"><div class="kpi"><b>${pctS(pmf.very / pmf.n)}</b><span>非常失望</span><em>${n0(pmf.very)} / ${n0(pmf.n)} 份 · ${esc(pmf.date)}</em></div></div><div class="meter goal" role="img" aria-label="非常失望 ${pctS(pmf.very / pmf.n)}，目标 40%"><i style="width:${Math.min(100, pmf.very / pmf.n * 100).toFixed(1)}%"></i><b style="left:40%" data-l="目标 40%"></b></div>` : '<p class="muted small">问最近两周用过至少两次的用户：「如果不能再用这个产品，你会有多失望？」约 40 份回答可以得到方向性结论。</p>'}
        <form class="form grid3" data-sub="addpmf">
          <label for="sv-n">有效回答<input id="sv-n" name="n" type="number" min="1" required></label>
          <label for="sv-v">选「非常失望」<input id="sv-v" name="very" type="number" min="0" required></label>
          <label for="sv-d">日期<input id="sv-d" name="date" type="date" value="${today()}" required></label>
          <div class="acts"><button class="btn pri sm" type="submit" data-w>保存调研</button></div>
        </form>${svList('pmf', '<th>回答</th><th>非常失望</th>', x => `<td class="n">${n0(x.n)}</td><td class="n">${pctS(x.very / x.n)}</td>`)}</section>
      <section class="panel"><h3>NPS${ref('bain-nps')}</h3>
        ${nps ? `<div class="kpis"><div class="kpi"><b>${npsV.toFixed(0)}</b><span>NPS（−100 到 100）</span><em>推荐 ${n0(nps.promoters)} · 被动 ${n0(nps.passives)} · 贬损 ${n0(nps.detractors)} · ${esc(nps.date)}</em></div></div>` : '<p class="muted small">NPS = 打 9–10 分的推荐者占比 − 打 0–6 分的贬损者占比。只展示，不参与 PMF 判定。</p>'}
        <form class="form grid3" data-sub="addnps">
          <label for="np-p">9–10 分<input id="np-p" name="promoters" type="number" min="0" required></label>
          <label for="np-q">7–8 分<input id="np-q" name="passives" type="number" min="0" required></label>
          <label for="np-r">0–6 分<input id="np-r" name="detractors" type="number" min="0" required></label>
          <label for="np-d">日期<input id="np-d" name="date" type="date" value="${today()}" required></label>
          <div class="acts"><button class="btn pri sm" type="submit" data-w>保存 NPS</button></div>
        </form>${svList('nps', '<th>回答</th><th>NPS</th>', x => `<td class="n">${n0(x.promoters + x.passives + x.detractors)}</td><td class="n">${npsOf(x).toFixed(0)}</td>`)}</section>
    </div>`;
  }

  function vAudit() {
    const ps = BUILTIN.filter(p => AUDIT[p.id]);
    const total = p => AUDIT_DIMS.reduce((o, d) => { const c = AUDIT[p.id][d.id]; if (c) o[c.st]++; return o; }, { ok: 0, part: 0, gap: 0 });
    return `<div class="vhead"><div><div class="eyebrow">产品体检</div><h1>两个项目共 ${ps.reduce((s, p) => s + total(p).gap, 0)} 个缺口</h1>
      <p>依据仓库代码逐项检查，每一格都写了证据位置（文件:行号）。点格子看详情，「去处理」会切到对应项目的路线步骤。</p></div></div>
    <section class="panel"><div class="tbl amx"><table><thead><tr><th>维度</th>${ps.map(p => `<th>${esc(p.name)}<br><small class="muted">${['ok', 'part', 'gap'].map(k => `${ST_N[k]} ${total(p)[k]}`).join(' · ')}</small></th>`).join('')}</tr></thead><tbody>
      ${AUDIT_DIMS.map(d => `<tr><td><b>${esc(d.n)}</b></td>${ps.map(p => { const c = AUDIT[p.id][d.id]; return c ? `<td data-p="${esc(p.short || p.name)}"><button class="acell ${c.st}" data-act="audit" data-pid="${p.id}" data-id="${d.id}">${chipS(c.st)}<span>${esc(c.d)}</span><code>${esc(c.ev)}</code></button></td>` : '<td>—</td>'; }).join('')}</tr>`).join('')}
    </tbody></table></div>
    ${proj().custom ? '<p class="small muted">新增的项目没有代码可查，体检只覆盖仓库里的两个内置项目。</p>' : ''}</section>`;
  }
  function auditSheet(pid, did) {
    const p = BUILTIN.find(x => x.id === pid), d = AUDIT_DIMS.find(x => x.id === did), c = AUDIT[pid][did], st = c.step && PD_STEP_BY_ID[c.step];
    openSheet(`<div class="hd"><div><div class="eyebrow">产品体检 · ${esc(p.name)}</div><h2>${esc(d.n)}</h2><p>${chipS(c.st)}</p></div><button class="x" data-act="close" aria-label="关闭">${I.x}</button></div>
      <div class="sec"><h3>现状</h3><p>${esc(c.d)}</p><p class="small">证据：<code>${esc(c.ev)}</code></p></div>
      ${st ? `<div class="sec"><h3>对应步骤：${esc(st.t)}</h3><p>${plainRich(st.d)}</p><button class="btn pri sm" data-act="gostep" data-id="${st.id}" data-pid="${pid}" style="justify-self:start">去处理 →</button></div>` : ''}`);
  }

  // ----- actions -----
  const num = (f, k) => { const v = String(f.get(k) ?? '').trim(); return v === '' ? null : Number(v); };
  Object.assign(ACT, {
    ptab: el => { S.ptab = el.dataset.id; saveUI(); render(); $('main').scrollTop = 0; },
    gomod: el => { S.mod = el.dataset.id; saveUI(); render(); $('main').scrollTop = 0; },
    pform: el => { S.pform = el.dataset.id; lsSet('pform', S.pform); render(); },
    gostep: el => {
      closeSheet();
      if (el.dataset.pid && el.dataset.pid !== S.pid) switchProject(el.dataset.pid);
      S.mod = 'product'; S.ptab = 'route'; S.open[el.dataset.id] = true; saveUI(); render();
      const row = $('row-' + el.dataset.id);
      if (row) row.scrollIntoView({ block: 'center' }); else toast('这一步不在当前项目的路线里');
    },
    audit: el => auditSheet(el.dataset.pid, el.dataset.id),
    pcat: el => { setRec('meta', 'product', { category: el.value }); render(); },
    delrec: el => {
      const k = el.dataset.c + '/' + el.dataset.id;
      const refocus = () => { const b = [...document.querySelectorAll('[data-act="delrec"]')].find(x => x.dataset.c + '/' + x.dataset.id === k); if (b) b.focus(); };
      if (S.armDel !== k) { S.armDel = k; render(); refocus(); setTimeout(() => { if (S.armDel === k) { S.armDel = null; render(); } }, 3200); return; }
      S.armDel = null; if (setRec(el.dataset.c, el.dataset.id, null)) { toast('已删除'); render(); }
    },
    addcohort: el => {
      const f = new FormData(el), wk = String(f.get('wk') || ''), size = num(f, 'size');
      if (!weekOk(wk)) { toast('周的格式应为 2026-W41'); return; }
      const body = { size, w1: num(f, 'w1'), w4: num(f, 'w4'), w12: num(f, 'w12'), w24: num(f, 'w24') };
      if (WEEKS.some(w => body['w' + w] != null && body['w' + w] > size)) { toast('留存人数不能大于注册人数'); return; }
      if (setRec('cohorts', wk, body)) { toast('已保存队列 ' + wk); render(); }
    },
    addmetric: el => {
      const f = new FormData(el), wk = String(f.get('wk') || '');
      if (!weekOk(wk)) { toast('周的格式应为 2026-W41'); return; }
      const body = { wau: num(f, 'wau'), newUsers: num(f, 'newUsers'), payers: num(f, 'payers'), revenue: num(f, 'revenue'), note: String(f.get('note') || '').trim() };
      if (['wau', 'newUsers', 'payers', 'revenue'].every(k => body[k] == null)) { toast('至少填一项数字'); return; }
      if (setRec('metrics', wk, body)) { toast('已保存 ' + wk); render(); }
    },
    addpmf: el => {
      const f = new FormData(el), n = num(f, 'n'), very = num(f, 'very'), date = String(f.get('date') || today());
      if (very > n) { toast('「非常失望」人数不能大于回答数'); return; }
      if (setRec('surveys', 'pmf-' + date, { type: 'pmf', n, very, date })) { toast('已保存调研'); render(); }
    },
    addnps: el => {
      const f = new FormData(el), date = String(f.get('date') || today());
      if (setRec('surveys', 'nps-' + date, { type: 'nps', promoters: num(f, 'promoters'), passives: num(f, 'passives'), detractors: num(f, 'detractors'), date })) { toast('已保存 NPS'); render(); }
    }
  });

  const VIEWS = { overview: vOverview, route: vRoute, launch: vLaunch, metrics: vMetrics, audit: vAudit };
  function renderModule(main) {
    if (!VIEWS[S.ptab]) S.ptab = 'overview';
    if (!S.pform) S.pform = lsGet('pform', 'web');
    if (!LAUNCH_FORMS.some(f => f.id === S.pform)) S.pform = 'web';
    resetRefs();
    const body = VIEWS[S.ptab]();
    main.innerHTML = `<div class="subnav"><div class="seg" role="tablist" aria-label="产品能力">${TABS.map(t => `<button role="tab" aria-selected="${S.ptab === t.id}" data-act="ptab" data-id="${t.id}">${t.n}</button>`).join('')}</div></div>
      <section class="view" role="tabpanel">${body}${refsHTML(PD_ASOF)}</section>${foot(FOOT)}`;
  }
  return { render: renderModule, pmfEval, latestMetrics };
})();
MODULES.find(m => m.id === 'product').api = Product;
