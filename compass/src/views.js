/* ---------- shared bits ---------- */
const I = {
  plus: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 3v10M3 8h10"/></svg>',
  edit: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="m3 13 .6-2.6L10.8 3.2a1.4 1.4 0 0 1 2 2L5.6 12.4z"/></svg>',
  up: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 12.5v-9M4 7.5l4-4 4 4"/></svg>',
  down: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 3.5v9M4 8.5l4 4 4-4"/></svg>',
  warn: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 2.2 14.3 13.4H1.7z"/><path d="M8 6.6v3.2M8 11.6v.1"/></svg>',
  info: '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6"/><path d="M8 7.4v4M8 5v.1"/></svg>',
  alert: '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6"/><path d="M8 4.8v4M8 11v.1"/></svg>',
  ok: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="m3 8.5 3 3 7-7"/></svg>',
  x: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4 4 8 8M12 4l-8 8"/></svg>',
  lock: '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="3.5" y="7" width="9" height="6.5" rx="1.6"/><path d="M5.5 7V5.2a2.5 2.5 0 0 1 5 0V7"/></svg>',
  spark: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.8 9.3 6.7 14.2 8 9.3 9.3 8 14.2 6.7 9.3 1.8 8 6.7 6.7z"/></svg>',
  copy: '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="5" y="5" width="8.5" height="8.5" rx="1.6"/><path d="M3 10.5V3.6c0-.3.3-.6.6-.6h6.9"/></svg>'
};
const tag = (t, cls = '') => `<span class="tag ${cls}"><i></i>${t}</span>`;
const pTag = pair => pair ? tag(esc(pair[0]), pair[1]) : '';
function delta(d, dec = 1, unit = '') {
  if (d == null || !isFinite(d) || Math.abs(d) < Math.pow(10, -dec) / 2) return '<span class="delta">持平</span>';
  return `<span class="delta ${d > 0 ? 'up' : 'dn'}">${d > 0 ? I.up : I.down}${nf(Math.abs(d), dec)}${unit}</span>`;
}
const W = () => canWrite() && isParent();
const wbtn = (act, label, attrs = '', cls = 'ghost sm') => W() ? `<button class="btn ${cls}" data-act="${act}" ${attrs}>${I.plus}${label}</button>` : '';
const rowActs = (c, id) => W() ? `<span class="racts"><button class="ib" data-act="edit-${c}" data-id="${esc(id)}" aria-label="编辑">${I.edit}</button><button class="ib" data-act="del" data-c="${c}" data-id="${esc(id)}" aria-label="删除">${I.x}</button></span>` : '';
const subjName = (sys, x) => sys === 'cn' || !GLOSS[x] ? esc(x) : `${esc(x)}<small> ${GLOSS[x]}</small>`;
const sexCN = s => s === 'F' ? '女' : '男';
const ex = r => r && r.example ? '<span class="chip-ex">示例</span>' : '';
function termChips(list, cur, act = 'term') {
  if (list.length < 2) return '';
  return `<div class="chips" role="group" aria-label="学期">${list.map(t => `<button class="chip" data-act="${act}" data-t="${t}" aria-pressed="${t === cur}">${esc(termShort(M.s.system, t))}</button>`).join('')}</div>`;
}
const vhead = (eyebrow, title, sub, right = '') => `<div class="vhead"><div><span class="eyebrow">${eyebrow}</span><h1>${title}</h1>${sub ? `<p>${sub}</p>` : ''}</div><div class="vacts">${right}</div></div>`;
// charts are drawn at their on-screen width so SVG text keeps its CSS size
function chartW(half) {
  const v = $('view'), cs = v && getComputedStyle(v);
  const W = v ? v.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) : 900;
  const pad = innerWidth <= 640 ? 24 : 36;
  return Math.max(260, Math.round((half && innerWidth > 980 ? (W - 16) / 2 : W) - pad - 2));
}
const legend = items => `<div class="legend">${items.map(([cls, t]) => `<span><i class="${cls}"></i>${esc(t)}</span>`).join('')}</div>`;

/* ---------- top bar ---------- */
function renderTop() {
  const kids = $('kids');
  const list = !isParent() && D.st ? [D.st] : D.students;
  kids.innerHTML = list.map(s => {
    const g = gradeAt(s, new Date());
    return `<button class="kid" role="tab" data-act="kid" data-id="${esc(s.id)}" aria-selected="${s.id === CUR}"><span class="ava ${s.sex === 'F' ? 'f' : ''}" aria-hidden="true">${esc(s.name.slice(0, 1))}</span><span class="kn"><b>${esc(s.name)}</b><small>${esc(gradeLabel(s, g))}</small></span></button>`;
  }).join('') + (isParent() && W() ? `<button class="kid add" data-act="new-student" aria-label="新建学生档案">${I.plus}</button>` : '') + (!isParent() && D.students.length > 1 ? `<span class="locked">${I.lock}学生视角已锁定</span>` : '');
  const role = $('role');
  role.hidden = !CAN_EDIT || mode === 'init';
  role.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.role === ST.role)));
  document.body.classList.toggle('student', !isParent());
  $('nav').hidden = !D.st;
  $('nav').querySelectorAll('button').forEach(b => b.setAttribute('aria-selected', String(b.dataset.v === ST.view)));
}

function renderAll() {
  renderTop();
  const v = $('view');
  if (mode === 'init') { v.innerHTML = `<div class="empty"><div class="spin" aria-hidden="true"></div>正在读取档案…</div>`; return; }
  if (!D.st) { renderEmpty(); renderFoot(); return; }
  M = derive();
  INS = insights(M);
  ({ home: vHome, acad: vAcad, holi: vHoli, body: vBody, mind: vMind }[ST.view] || vHome)();
  renderFoot();
}
let INS = [];

function renderEmpty() {
  const can = canWrite();
  $('view').innerHTML = `<div class="blank">
    <span class="eyebrow">成长罗盘 · K-12</span>
    <h1>还没有学生档案</h1>
    <p>建一个档案，选好学制（中国 / 美国 / 英国）和年级，就能录入成绩、体测、视力和心情打卡，系统按该学制的标准自动生成综合素质五维图和评估。</p>
    <div class="acts">${can ? `<button class="btn pri" data-act="new-student">${I.plus}新建学生档案</button><button class="btn ghost" data-act="load-ex">载入 3 个示例学生</button>` : '<p class="muted">这份档案还没有内容，你只有查看权限。</p>'}</div>
    <div class="exs">${EX.students.map(s => `<div><b>${esc(s.name)}</b><span>${SYS[s.system].name} · ${esc(gradeLabel(s, gradeAt(s, new Date())))}</span></div>`).join('')}</div>
  </div>`;
}

function renderFoot() {
  const parts = [];
  if (hasExamples() && W()) parts.push(`含虚构示例学生 <button class="linkbtn" data-act="clear-ex">清除全部示例</button>`);
  parts.push(mode === 'db' ? (CAN_EDIT ? '数据存在这个 Artifact 的云端数据库；心理筛查和家长备忘只有编辑者可见' : '只读视图：心理筛查和家长备忘对你不可见') : '本地模式：数据只保存在此浏览器');
  if (isParent() && W() && pinSupported()) parts.push(`<button class="linkbtn" data-act="pin">${D.pin ? '修改家长 PIN' : '设置家长 PIN'}</button>`);
  parts.push('标准：国家学生体质健康标准 2014 · WHO 生长参考 2007 · AASM 2016 · WHO-5');
  $('foot').innerHTML = parts.join(' · ');
}

/* ---------- 总览 ---------- */
function profileCard(m) {
  const s = m.s;
  const pills = [`<span class="sysb">${m.sys.badge}</span>${esc(m.sys.name)}学制`, esc(m.sys.stage(clamp(m.g, 0, m.sys.maxG))), `<b>${esc(gradeLabel(s, m.g))}</b>`, s.school || s.cls ? esc([s.school, s.cls].filter(Boolean).join(' · ')) : '', m.age != null ? `${m.age} 岁` : '', sexCN(s.sex)].filter(Boolean);
  return `<div class="profile">
    <span class="ava lg ${s.sex === 'F' ? 'f' : ''}" aria-hidden="true">${esc(s.name.slice(0, 1))}</span>
    <div class="pmain"><h2>${esc(s.name)} ${ex(s)}</h2><div class="pills">${pills.map(p => `<span>${p}</span>`).join('')}</div>${s.allergy && isParent() ? `<p class="muted sm">过敏 / 健康备注：${esc(s.allergy)}</p>` : ''}</div>
    ${W() ? `<button class="btn ghost sm" data-act="edit-student">${I.edit}编辑档案</button>` : ''}
  </div>`;
}
function insList(list) {
  if (!list.length) return '<p class="muted">数据还不够，录入成绩、体测或心情打卡后这里会给出评估。</p>';
  const ic = { up: I.up, down: I.down, warn: I.warn, info: I.info, alert: I.alert };
  return `<ul class="ins">${list.map(x => `<li class="${x.k}"><span class="ii">${ic[x.k]}</span><span>${x.t}</span></li>`).join('')}</ul>`;
}
function kpis(m) {
  const h = m.head, hp = m.headPrev;
  const t1 = h ? `<b class="num">${esc(h.value)}<small>${h.unit}</small></b><span>${esc(h.label)} · ${h.n} 科</span>${hp && hp.label === h.label ? delta(h.norm - hp.norm, 1) : ''}${h.sub ? `<span class="sub">${esc(h.sub)}</span>` : ''}` : '<b class="num na">—</b><span>本学期暂无成绩</span>';
  const f = m.lastFit;
  let t2 = '<b class="num na">—</b><span>暂无体测</span>';
  if (f) {
    if (m.sys.fit === 'gb') t2 = f.ev.total != null ? `<b class="num">${nf(f.ev.total, 1)}</b><span>体测学年总分 · ${fmtD(f.date)}</span>${pTag(gbGrade(f.ev.total))}` : `<b class="num na">—</b><span>体测缺 ${f.ev.missing} 项，未计总分</span>`;
    else if (m.sys.fit === 'fg') { const z = Object.values(f.marks).filter(x => FG_ZONE[x]); t2 = `<b class="num">${z.filter(x => x === 'HFZ').length}<small>/${z.length}</small></b><span>FitnessGram 健康区项目 · ${fmtD(f.date)}</span>`; }
    else t2 = f.comp != null ? `<b class="num">P${nf(f.comp, 0)}</b><span>Eurofit 平均百分位 · ${fmtD(f.date)}</span>${pTag(pctBand(f.comp))}` : t2;
  }
  const L = m.life;
  const t3 = L.sleep != null ? `<b class="num">${nf(L.sleep, 1)}<small>小时</small></b><span>近 30 天平均睡眠 · 建议 ${L.range[0]}–${L.range[1]}</span>${tag(`${nf(L.sleepOk, 0)}% 天数达标`, L.sleep >= L.range[0] ? 'ok' : 'warn')}` : '<b class="num na">—</b><span>近 30 天没有睡眠记录</span>';
  const t4 = L.mood != null ? `<div class="kface">${moodFace(Math.round(L.mood), 34)}<b class="num">${nf(L.mood, 1)}<small>/5</small></b></div><span>近 30 天心情 · ${L.n} 次打卡</span>${L.stress != null ? `<span class="sub">压力 ${nf(L.stress, 1)}/5</span>` : ''}` : '<b class="num na">—</b><span>近 30 天没有心情打卡</span>';
  return `<div class="kpis"><div class="kpi" data-act="go" data-v="acad">${t1}</div><div class="kpi" data-act="go" data-v="body">${t2}</div><div class="kpi" data-act="go" data-v="body">${t3}</div><div class="kpi" data-act="go" data-v="mind">${t4}</div></div>`;
}
function vHome() {
  const m = M, R = m.radar, Rp = m.radarPrev;
  const vals = DIMS.map(k => R.v[k]), pvals = Rp ? DIMS.map(k => Rp.v[k]) : null;
  const avail = vals.filter(v => v != null), overall = avail.length ? mean(avail) : null;
  const pav = pvals ? pvals.filter(v => v != null) : [];
  const comp = pvals ? DIMS.filter((k, i) => vals[i] != null && pvals[i] != null && !(k === 'academic' && R.v.academicScale !== Rp.v.academicScale)) : [];
  const odelta = comp.length >= 3 ? mean(comp.map(k => R.v[k])) - mean(comp.map(k => Rp.v[k])) : null;
  const good = INS.filter(x => x.k === 'up').length, bad = INS.filter(x => ['warn', 'down', 'alert'].includes(x.k)).length;
  const P = isParent();
  const verdict = overall == null ? '本学期数据还不够生成综合分。'
    : `五维中 ${avail.length} 维有数据，平均 ${nf(overall, 0)}。${good ? `${good} 项亮点` : '暂无明显亮点'}，${bad ? `${bad} 项${P ? '需要关注' : '可以加油'}` : `没有${P ? '需要关注' : '要担心'}的项目`}。`;
  const alerts = INS.filter(x => x.k === 'alert');
  $('view').innerHTML = `
    ${profileCard(m)}
    <div class="verdict">
      <div class="vbig"><span class="eyebrow">${esc(termName(m.s.system, m.term))} · 综合</span><b class="num">${overall == null ? '—' : nf(overall, 0)}</b>${odelta != null ? delta(odelta, 0) : ''}</div>
      <p>${verdict}</p>
      ${termChips(m.terms, m.term)}
    </div>
    ${P && alerts.length ? `<div class="alertbox"><b>${I.alert}需要家长留意</b>${insList(alerts)}<p class="sm">建议先和孩子平静地聊一聊，并联系班主任或学校心理老师。若孩子提到伤害自己，请立即陪伴并拨打 ${m.sys.hot.map(h => `<b class="sel">${esc(h.num)}</b>`).join(' / ')}。</p></div>` : ''}
    <div class="cols">
      <div class="panel">
        <h3>${m.s.system === 'cn' ? '综合素质五维' : '综合素质五维 · Whole Child'}<small>${esc(termShort(m.s.system, m.term))}</small></h3>
        ${legend([['k-cur', '本学期'], ...(pvals && pav.length >= 3 ? [['k-prev', '上学期']] : [])])}
        ${radarSVG(DIMS.map(k => m.sys.dim(k)), vals, pav.length >= 3 ? pvals : null)}
      </div>
      <div class="panel">
        <h3>智能评估<small>规则引擎 · 每条都有数据依据</small></h3>
        ${insList(INS.filter(x => x.k !== 'alert'))}
        ${P && W() ? aiBlock() : ''}
      </div>
    </div>
    ${kpis(m)}`;
}

/* AI 评语 (parent only, through the sample capability; the summary sent carries no name) */
let AI = { text: '', busy: false, err: '', sid: null };
function aiBlock() {
  if (AI.sid !== CUR) AI = { text: '', busy: false, err: '', sid: CUR };
  return `<div class="ai">
    <div class="aihead"><b>${I.spark}Claude 评语</b><button class="btn ghost sm" data-act="ai" ${AI.busy ? 'disabled' : ''}>${AI.text ? '重新生成' : '生成评语'}</button></div>
    ${AI.text ? `<div class="aitext" id="aiText">${esc(AI.text).replace(/\n/g, '<br>')}</div>` : AI.busy ? '<div class="aitext muted" id="aiText">正在生成…</div>' : `<p class="muted sm" id="aiText">${AI.err || '把本学期的五维分、成绩走势、体测和作息摘要（不含姓名）发给 Claude，写一段 200 字左右的评语和三条建议。首次使用会请你授权。'}</p>`}
  </div>`;
}

/* ---------- 学业 ---------- */
function vAcad() {
  const m = M, sys = m.s.system, list = m.subj;
  const sel = list.find(x => x.subject === ST.subj) || list[0];
  const h = m.head, hp = m.headPrev;
  const terms = [...new Set([...m.scoreTerms, m.curTerm])].sort(termCmp);
  let body = '';
  if (!list.length) body = `<div class="panel empty">${esc(termName(sys, m.term))}还没有成绩记录。${W() ? '点右上角「录入成绩」添加第一条。' : ''}</div>`;
  else {
    body = `<div class="headline">
        <div><span class="eyebrow">${esc(h.label)}</span><b class="num">${esc(h.value)}<small>${h.unit}</small></b>${hp && hp.label === h.label ? delta(h.norm - hp.norm, 1) : ''}</div>
        <p>${h.n} 科 · ${list.reduce((a, x) => a + x.recs.length, 0)} 次记录${h.sub ? ' · ' + esc(h.sub) : ''}${sys === 'cn' ? ' · 等级按常见校内划分：≥85% 优秀，≥70% 良好，≥60% 合格' : sys === 'us' ? ' · 字母等级与 GPA 按 College Board 换算表' : ''}</p>
      </div>
      <div class="tbl-wrap"><table class="tbl">
        <thead><tr><th>科目</th><th>最近一次</th><th>本学期均值</th><th>等级</th><th>班级均分</th><th>走势</th></tr></thead>
        <tbody>${list.map(x => {
      const lv = levelOf(sys, x.scale, x.scale === 'pts' || x.scale === 'pct' ? x.mean : Math.round(x.valueMean), x.mean);
      const lastShow = SCALES[x.last.scale].show(x.last.value, x.last.full);
      return `<tr data-act="subj" data-s="${esc(x.subject)}" class="${sel && sel.subject === x.subject ? 'on' : ''}">
            <td><span class="sn">${subjName(sys, x.subject)}${x.lvl ? ` <span class="tag inv">${x.lvl}</span>` : ''}</span></td>
            <td class="num">${lastShow}<small class="muted"> ${esc(x.last.kind)}</small></td>
            <td class="num"><b>${nf(x.mean, 1)}</b></td>
            <td>${lv[0] ? tag(esc(lv[0]), lv[1]) : '<span class="muted">—</span>'}</td>
            <td class="num">${x.avg != null ? `${nf(x.avg, 1)} ${delta(x.mean - x.avg, 1)}` : '<span class="muted">—</span>'}</td>
            <td>${spark(x.hist.slice(-8).map(r => r.norm))}</td></tr>`;
    }).join('')}</tbody></table></div>
      <p class="muted sm">「本学期均值」「班级均分」统一换算为百分制（${sys === 'cn' ? '得分 ÷ 满分' : '按该量表在本学制内线性换算'}），只用于同一学生自身对比。</p>
      ${sel ? subjDetail(sel) : ''}`;
  }
  $('view').innerHTML = vhead('学业 · ' + esc(termName(sys, m.term)), '学业成绩', `${esc(gradeLabel(m.s, m.g))} · 点科目查看走势和每次记录`, termChips(terms, m.term) + wbtn('add-score', '录入成绩', '', 'pri sm')) + body;
}
function subjDetail(x) {
  const sys = M.s.system, recs = x.hist, others = x.all.filter(r => r.scale !== x.scale);
  const scales = new Set(recs.map(r => r.scale)), one = scales.size === 1 ? [...scales][0] : null;
  const native = one && ['gcse', 'alevel', 'ks2', 'sb4'].includes(one);
  const sc = native ? SCALES[one] : null;
  const yv = r => native ? r.value : r.norm, ya = r => native ? r.avg : r.avgNorm;
  const ys = recs.flatMap(r => [yv(r), ya(r)]).filter(v => v != null);
  let y;
  if (native) { const ticks = one === 'gcse' ? [1, 3, 5, 7, 9] : one === 'alevel' ? [1, 2, 3, 4, 5, 6] : one === 'ks2' ? [80, 90, 100, 110, 120] : [1, 2, 3, 4]; y = { min: sc.min, max: sc.max, ticks: ticks.map(v => ({ v, label: one === 'alevel' ? ALEVEL[v] : v })) }; }
  else { const lo = Math.max(0, Math.floor((Math.min(...ys) - 6) / 10) * 10); y = { min: lo, max: 100, ticks: niceTicks(lo, 100, 4).filter(v => v >= lo && v <= 100).map(v => ({ v })) }; }
  const n = recs.length, step = Math.max(1, Math.ceil(n / 7));
  const chart = lineSVG({
    aria: `${x.subject} 成绩走势`, w: chartW(false), h: 220, x: { min: 0, max: Math.max(1, n - 1), ticks: recs.map((r, i) => ({ v: i, label: fmtMD(r.date) })).filter((_, i) => i % step === 0 || i === n - 1) }, y,
    series: [
      { cls: 'ref', dash: true, r: 3, label: recs.some(r => r.avg != null) ? '班均' : '', pts: recs.map((r, i) => ({ x: i, y: ya(r), tip: r.avg != null ? `${fmtD(r.date)} 班级均分 ${SCALES[r.scale].show(r.avg, r.full).replace(/<[^>]+>/g, '')}` : '' })) },
      { cls: 's1', area: true, label: '本人', pts: recs.map((r, i) => ({ x: i, y: yv(r), tip: `${fmtD(r.date)} ${r.kind} ${SCALES[r.scale].show(r.value, r.full).replace(/<[^>]+>/g, '')}` })) }
    ]
  });
  return `<div class="panel">
    <h3><span>${subjName(sys, x.subject)} · 全部记录</span><small>${native ? esc(sc.name) : '百分制换算'}</small></h3>
    ${legend([['k-cur', '本人'], ...(recs.some(r => r.avg != null) ? [['k-ref', '班级均分']] : [])])}
    <div class="chart-wrap">${chart}</div>
    ${others.length ? `<p class="muted sm">另有 ${others.length} 条${[...new Set(others.map(r => SCALES[r.scale].name))].join('、')}记录未画入走势（计分方式不同，不直接比较）。</p>` : ''}
    <div class="rows">${x.all.slice().reverse().map(r => `<div class="rrow"><time>${fmtD(r.date)}</time><span>${esc(r.kind)} ${ex(r)}${r.note ? `<small>${esc(r.note)}</small>` : ''}</span><b class="num">${SCALES[r.scale].show(r.value, r.full)}</b><span class="muted num">${r.avg != null ? '班均 ' + SCALES[r.scale].show(r.avg, r.full).replace(/<[^>]+>/g, '') : ''}</span>${rowActs('scores', r.id)}</div>`).join('')}</div>
  </div>`;
}

/* ---------- 综合素质 ---------- */
function vHoli() {
  const m = M, sys = m.s.system, R = m.radar, Rp = m.radarPrev;
  const vals = DIMS.map(k => R.v[k]), pvals = Rp ? DIMS.map(k => Rp.v[k]) : null;
  const pOk = pvals && pvals.filter(v => v != null).length >= 3;
  const [ty] = m.term.split('-').map(Number);
  const yearMerits = D.merits.filter(x => schoolYear(sys, parseD(x.date)) === ty);
  const hours = yearMerits.filter(x => x.dim === 'practice').reduce((a, x) => a + (x.hours || 0), 0);
  $('view').innerHTML = vhead('综合素质评价 · ' + esc(termName(sys, m.term)), sys === 'cn' ? '综合素质' : '综合素质 · Whole Child', '五个维度按教育部综合素质评价框架；学业和身心健康由记录自动计算，其余三维来自学期评级', termChips(m.terms, m.term) + wbtn('add-rating', '学期评级') + wbtn('add-merit', '记录事迹', '', 'pri sm')) + `
    <div class="cols">
      <div class="panel">
        ${legend([['k-cur', termShort(sys, m.term)], ...(pOk ? [['k-prev', termShort(sys, m.prevTerm)]] : [])])}
        ${radarSVG(DIMS.map(k => m.sys.dim(k)), vals, pOk ? pvals : null, { w: 400, h: 350 })}
      </div>
      <div class="panel dims">${DIMS.map(k => {
    const v = R.v[k], pv = Rp ? Rp.v[k] : null;
    return `<div class="dim"><div class="dtop"><b>${esc(m.sys.dim(k))}${sys !== 'cn' ? `<small> ${DIM_CN[k]}</small>` : ''}</b><span class="num">${v == null ? '<span class="muted">暂无</span>' : `<b>${nf(v, 0)}</b>`}${v != null && pv != null ? delta(v - pv, 0) : ''}</span></div>
          <div class="meter"><i style="width:${v == null ? 0 : clamp(v, 0, 100)}%"></i></div><small>${R.src[k]}</small></div>`;
  }).join('')}</div>
    </div>
    <div class="panel">
      <h3>事迹与证据<small>${esc(String(ty))} 学年 · 社会实践累计 ${nf(hours, hours % 1 ? 1 : 0)} 小时</small></h3>
      ${D.merits.length ? `<div class="mgrid">${DIMS.map(k => {
    const xs = D.merits.filter(x => x.dim === k).slice().reverse();
    return `<div class="mcol"><h4>${esc(m.sys.dim(k))}<span class="num muted">${xs.length}</span></h4>${xs.length ? xs.map(x => `<div class="merit"><time>${fmtD(x.date)}</time><b>${esc(x.title)} ${ex(x)}</b><span>${x.level ? tag(esc(x.level), 'inv') : ''}${x.hours ? tag(nf(x.hours, x.hours % 1 ? 1 : 0) + ' 小时') : ''}</span>${x.note ? `<small>${esc(x.note)}</small>` : ''}${rowActs('merits', x.id)}</div>`).join('') : '<p class="muted sm">暂无</p>'}</div>`;
  }).join('')}</div>` : `<p class="muted">还没有记录。获奖、志愿服务、艺术活动、班干部经历都可以记下来，作为评级依据。</p>`}
    </div>
    <p class="muted sm">评级换算：A 优秀 = 95，B 良好 = 80，C 合格 = 65，D 待提高 = 50。${sys === 'cn' ? '来源可以是学校综合素质评价手册的等级。' : '来源可以是成绩单上的 Citizenship / Effort / Attitude to Learning 等栏目。'}</p>`;
}

/* ---------- 身体 ---------- */
function vBody() {
  const m = M;
  $('view').innerHTML = vhead('身体健康', '身体健康', `生长按 WHO 2007 生长参考（5–19 岁）；体测按${esc(FIT[m.sys.fit].name)}`, wbtn('add-growth', '身高体重') + wbtn('add-vision', '视力') + wbtn('add-fit', '体测成绩', '', 'pri sm')) +
    `<div class="cols">${growthPanel(m)}${fitPanel(m)}</div><div class="cols even">${visionPanel(m)}${lifePanel(m)}</div>`;
}
function growthPanel(m) {
  const s = m.s, h = m.heights[m.heights.length - 1], w = m.weights[m.weights.length - 1], b = m.bmis[m.bmis.length - 1];
  const stats = [
    h ? `<div><span>身高</span><b class="num">${nf(h.value, 1)}<small>cm</small></b>${h.z != null ? `<small>WHO 第 ${nf(phi(h.z) * 100, 0)} 百分位</small>` : ''}</div>` : '<div><span>身高</span><b class="num na">—</b></div>',
    w ? `<div><span>体重</span><b class="num">${nf(w.value, 1)}<small>kg</small></b><small>${fmtD(w.date)}</small></div>` : '<div><span>体重</span><b class="num na">—</b></div>',
    b ? `<div><span>BMI</span><b class="num">${nf(b.bmi, 1)}</b>${b.z != null ? pTag(bmiZTag(b.z)) : ''}${s.system === 'cn' && m.g >= 1 && m.g <= 12 ? `<small>国标：${gbBmiLabel(s.sex, clamp(gradeAt(s, parseD(b.date)), 1, 12), b.bmi)}</small>` : ''}</div>` : '<div><span>BMI</span><b class="num na">—</b></div>'
  ].join('');
  const which = ST.growth === 'h' ? 'h' : 'bmi';
  let chart = '<p class="muted sm">至少录入一次身高和体重后显示生长曲线。</p>';
  const pts = which === 'bmi' ? m.bmis.filter(x => x.mo != null).map(x => ({ x: x.mo / 12, y: x.bmi, tip: `${fmtD(x.date)} BMI ${nf(x.bmi, 1)}${x.z != null ? ` · z ${nf(x.z, 2)}` : ''}` }))
    : m.heights.filter(x => x.mo != null).map(x => ({ x: x.mo / 12, y: x.value, tip: `${fmtD(x.date)} ${nf(x.value, 1)} cm${x.z != null ? ` · 第 ${nf(phi(x.z) * 100, 0)} 百分位` : ''}` }));
  if (pts.length) {
    const a0 = Math.max(61 / 12, Math.floor(Math.min(...pts.map(p => p.x)) - 0.5)), a1 = Math.min(19, Math.ceil(Math.max(...pts.map(p => p.x)) + 0.5));
    const kind = which === 'bmi' ? 'bmi' : 'hfa';
    const zs = which === 'bmi' ? [[-2, '−2SD 消瘦'], [0, '中位数'], [1, '+1SD 超重'], [2, '+2SD 肥胖']] : [[-2, '−2SD'], [0, '中位数'], [2, '+2SD']];
    const curve = z => { const out = []; for (let mo = Math.ceil(a0 * 12); mo <= Math.min(228, Math.floor(a1 * 12)); mo += 3) { const v = whoAt(kind, s.sex, mo, z); if (v) out.push({ x: mo / 12, y: v }); } return out; };
    const refs = zs.map(([z, label]) => ({ cls: z === 0 ? 'ref mid' : 'ref', dots: false, label, pts: curve(z) }));
    const all = [...refs.flatMap(r => r.pts.map(p => p.y)), ...pts.map(p => p.y)];
    const lo = Math.floor(Math.min(...all) - 1), hi = Math.ceil(Math.max(...all) + 1);
    const xt = []; for (let a = Math.ceil(a0); a <= a1; a++) xt.push({ v: a, label: a + ' 岁' });
    chart = `<div class="chart-wrap">${lineSVG({ aria: which === 'bmi' ? 'BMI 年龄曲线' : '身高年龄曲线', w: chartW(true), h: 250, m: { r: 86 }, x: { min: a0, max: a1, ticks: xt }, y: { min: lo, max: hi, ticks: niceTicks(lo, hi, 5).filter(v => v >= lo && v <= hi).map(v => ({ v })) }, series: [...refs, { cls: 's1', pts }] })}</div>`;
  }
  return `<div class="panel">
    <h3>生长发育<span class="chips"><button class="chip" data-act="growth" data-g="bmi" aria-pressed="${which === 'bmi'}">BMI</button><button class="chip" data-act="growth" data-g="h" aria-pressed="${which === 'h'}">身高</button></span></h3>
    <div class="stats3">${stats}</div>${chart}
    ${W() && D.health.some(x => x.type !== 'vision') ? `<details class="recs"><summary>全部身高体重记录</summary>${D.health.filter(x => x.type !== 'vision').slice().reverse().map(x => `<div class="rrow"><time>${fmtD(x.date)}</time><span>${x.type === 'height' ? '身高' : '体重'} ${ex(x)}</span><b class="num">${nf(x.value, 1)} ${x.type === 'height' ? 'cm' : 'kg'}</b><span></span>${rowActs('health', x.id)}</div>`).join('')}</details>` : ''}
  </div>`;
}
function fitPanel(m) {
  const s = m.s, sys = m.sys.fit, f = m.lastFit, def = FIT[sys];
  if (!f) return `<div class="panel"><h3>体测<small>${esc(def.name)}</small></h3><p class="muted">暂无体测记录。${W() ? '学校发的体测成绩单可以直接录入。' : ''}</p></div>`;
  let table = '', foot = '';
  if (sys === 'gb') {
    table = `<table class="tbl compact"><thead><tr><th>项目</th><th>成绩</th><th>得分</th><th>权重</th><th>加分</th></tr></thead><tbody>${f.ev.rows.map(r => {
      const it = def.items[r.k], raw = f.ev.items[r.k];
      const rs = raw == null ? '<span class="muted">未测</span>' : it.time ? mmss(raw) : nf(raw, it.d ?? 0) + `<small> ${it.unit}</small>`;
      const sc = r.sc == null ? '—' : `<b class="${r.sc < 60 ? 'bad' : r.sc >= 90 ? 'good' : ''}">${r.sc}</b>`;
      return `<tr><td>${esc(gbItemName(r.k, s.sex))}${r.k === 'bmi' && raw != null ? `<small class="muted"> ${gbBmiLabel(s.sex, f.g, raw)}</small>` : ''}</td><td class="num">${rs}</td><td class="num">${sc}</td><td class="num muted">${r.w}%</td><td class="num">${r.bonus ? '+' + r.bonus : ''}</td></tr>`;
    }).join('')}</tbody></table>`;
    foot = f.ev.total != null ? `<div class="fsum"><span>标准分 <b class="num">${nf(f.ev.std, 1)}</b></span><span>加分 <b class="num">${f.ev.bonus}</b></span><span>学年总分 <b class="num big">${nf(f.ev.total, 1)}</b></span>${pTag(gbGrade(f.ev.total))}</div>` : `<p class="muted sm">还缺 ${f.ev.missing} 项，补齐后计算学年总分。</p>`;
  } else if (sys === 'fg') {
    table = `<table class="tbl compact"><thead><tr><th>项目</th><th>成绩</th><th>区间</th></tr></thead><tbody>${Object.keys(def.items).filter(k => f.items[k] != null || f.marks[k]).map(k => { const it = def.items[k], raw = f.items[k]; return `<tr><td>${esc(it.name)}</td><td class="num">${raw == null ? '—' : it.time ? mmss(raw) : nf(raw, it.d) + `<small> ${it.unit}</small>`}</td><td>${f.marks[k] ? pTag(FG_ZONE[f.marks[k]]) : ''}</td></tr>`; }).join('')}</tbody></table>`;
    const z = Object.values(f.marks).filter(x => FG_ZONE[x]);
    foot = `<div class="fsum"><span>健康区 <b class="num big">${z.filter(x => x === 'HFZ').length}/${z.length}</b></span><span class="muted sm">区间以学校 FitnessGram 报告为准</span></div>`;
  } else {
    table = `<table class="tbl compact"><thead><tr><th>项目</th><th>成绩</th><th>百分位</th><th></th></tr></thead><tbody>${Object.keys(def.items).filter(k => f.items[k] != null || f.marks[k] != null).map(k => { const it = def.items[k], raw = f.items[k], p = f.marks[k]; return `<tr><td>${esc(it.name)}</td><td class="num">${raw == null ? '—' : nf(raw, it.d) + `<small> ${it.unit}</small>`}</td><td class="num">${p == null ? '—' : 'P' + nf(p, 0)}</td><td>${p == null ? '' : pTag(pctBand(p))}</td></tr>`; }).join('')}</tbody></table>`;
    foot = f.comp != null ? `<div class="fsum"><span>平均百分位 <b class="num big">P${nf(f.comp, 0)}</b></span>${pTag(pctBand(f.comp))}<span class="muted sm">对照 9–17 岁欧洲常模</span></div>` : '';
  }
  const hist = m.fits.slice(0, -1).reverse();
  return `<div class="panel">
    <h3>体测 · ${fmtD(f.date)}<small>${esc(def.name)}${sys === 'gb' ? ' · ' + esc(SYS.cn.grades[f.g] || '') : ''}</small></h3>
    <div class="tbl-wrap flat">${table}</div>${foot}
    ${hist.length ? `<div class="rows">${hist.map(x => `<div class="rrow"><time>${fmtD(x.date)}</time><span>${sys === 'gb' ? esc(SYS.cn.grades[x.g] || '') : '历次'} ${ex(x)}</span><b class="num">${sys === 'gb' ? (x.ev.total != null ? nf(x.ev.total, 1) + ' 分' : '缺项') : x.comp != null ? (sys === 'fg' ? nf(x.comp, 0) + '% 健康区' : 'P' + nf(x.comp, 0)) : '—'}</b><span></span>${rowActs('fitness', x.id)}</div>`).join('')}</div>` : ''}
    ${W() ? `<div class="racts-line"><button class="linkbtn" data-act="edit-fitness" data-id="${esc(f.id)}">编辑这次体测</button><button class="linkbtn" data-act="del" data-c="fitness" data-id="${esc(f.id)}">删除</button></div>` : ''}
  </div>`;
}
function visionPanel(m) {
  const vs = VISION[m.sys.vision], list = m.vision;
  if (!list.length) return `<div class="panel"><h3>视力<small>${esc(vs.name)}</small></h3><p class="muted">暂无视力记录。</p></div>`;
  const last = list[list.length - 1];
  const L5 = d => 5 + Math.log10(d);
  const ys = list.flatMap(v => [v.value, v.value2]).filter(Boolean).map(L5);
  const lo = Math.min(4.5, Math.floor(Math.min(...ys) * 10) / 10 - 0.1), hi = 5.2;
  const ticks = []; for (let v = Math.ceil(lo * 10) / 10; v <= hi + 1e-9; v += 0.1) ticks.push(+v.toFixed(1));
  const tl = ticks.filter((_, i) => ticks.length <= 6 || i % 2 === 0).map(v => ({ v, label: vs.show(Math.pow(10, v - 5)) }));
  const n = list.length;
  const chart = n > 1 ? `<div class="chart-wrap">${lineSVG({
    aria: '视力走势', w: chartW(true), h: 190, m: { l: 52 }, x: { min: 0, max: n - 1, ticks: list.map((v, i) => ({ v: i, label: fmtMD(v.date) })) }, y: { min: lo, max: hi, ticks: tl },
    bands: [{ y0: lo, y1: 4.95, cls: 'lowband' }],
    series: [{ cls: 's1', label: '左', pts: list.map((v, i) => ({ x: i, y: v.value ? L5(v.value) : null, tip: `${fmtD(v.date)} 左眼 ${vs.show(v.value)}` })) }, { cls: 's2', label: '右', pts: list.map((v, i) => ({ x: i, y: v.value2 ? L5(v.value2) : null, tip: v.value2 ? `${fmtD(v.date)} 右眼 ${vs.show(v.value2)}` : '' })) }]
  })}</div>` : '';
  const eye = (lab, d) => d == null ? '' : `<div><span>${lab}</span><b class="num">${vs.show(d)}</b>${visionLow(d, m.age) ? tag('低于正常', 'warn') : tag('正常', 'ok')}</div>`;
  return `<div class="panel">
    <h3>视力 · ${fmtD(last.date)}<small>${esc(vs.name)} · 裸眼</small></h3>
    <div class="stats3 two">${eye('左眼', last.value)}${eye('右眼', last.value2)}</div>
    ${n > 1 ? legend([['k-cur', '左眼'], ['k-s2', '右眼'], ['k-band', '低于正常']]) : ''}${chart}
    <p class="muted sm">近视防控建议：每天户外活动累计 2 小时以上，每年至少 2 次视力检查。</p>
    ${W() ? `<details class="recs"><summary>全部视力记录</summary>${list.slice().reverse().map(x => `<div class="rrow"><time>${fmtD(x.date)}</time><span>左 ${vs.show(x.value)} · 右 ${x.value2 ? vs.show(x.value2) : '—'} ${ex(x)}</span><b></b><span></span>${rowActs('health', x.id)}</div>`).join('')}</details>` : ''}
  </div>`;
}
function lifePanel(m) {
  const L = m.life, days = 30, start = addDays(m.today, -(days - 1));
  const byDay = Object.fromEntries(D.moods.filter(x => x.date >= start).map(x => [x.date, x]));
  const vals = [], xt = [];
  for (let i = 0; i < days; i++) {
    const d = addDays(start, i), r = byDay[d];
    vals.push({ y: r ? r.sleep : null, ok: r && r.sleep != null && r.sleep >= L.range[0], tip: r && r.sleep != null ? `${fmtMD(d)} 睡眠 ${nf(r.sleep, 1)} 小时${r.active != null ? ` · 运动 ${r.active} 分钟` : ''}` : '' });
    if (i % 7 === 0 && days - 1 - i >= 4 || i === days - 1) xt.push({ i, label: fmtMD(d) });
  }
  return `<div class="panel">
    <h3>作息 · 近 30 天<small>来自心情打卡</small></h3>
    <div class="stats3 two">
      <div><span>平均睡眠</span><b class="num">${L.sleep != null ? nf(L.sleep, 1) : '—'}<small>小时</small></b><small>AASM 建议 ${L.range[0]}–${L.range[1]} 小时</small></div>
      <div><span>日均运动</span><b class="num">${L.active != null ? nf(L.active, 0) : '—'}<small>分钟</small></b><small>WHO 建议平均 60 分钟</small></div>
    </div>
    ${L.n ? `${legend([['k-cur', '达到建议'], ['k-low', '少于建议'], ['k-band', '建议范围']])}<div class="chart-wrap">${barsSVG({ aria: '近 30 天睡眠时长', w: chartW(true), days, max: 13, ticks: [0, 4, 8, 12], band: L.range, vals, xt })}</div>` : '<p class="muted sm">在「心理」页做每日打卡后，这里会显示睡眠和运动。</p>'}
  </div>`;
}

/* ---------- 心理 ---------- */
function vMind() {
  const m = M, P = isParent(), today = m.today;
  const mine = D.moods.find(x => x.date === today);
  const ck = Object.assign({ mood: mine ? mine.mood : 0, stress: mine ? mine.stress : 0, sleep: mine ? mine.sleep : '', active: mine ? mine.active : '', note: mine ? mine.note : '' }, CK.sid === CUR && CK.date === today ? CK.v : {});
  const can = canWrite();
  const alerts = P ? INS.filter(x => x.k === 'alert') : [];
  const w5 = m.who5, wl = w5[w5.length - 1];
  const who5ok = m.age == null || m.age >= 9;
  $('view').innerHTML = vhead('心理健康', P ? '心理健康' : '我的心情', P ? '每日打卡和 WHO-5 由孩子自己填写；筛查结果和备忘只在家长视角显示' : '每天花 30 秒记一下心情和作息，照顾好自己', '') +
    (P && alerts.length ? `<div class="alertbox"><b>${I.alert}需要家长留意</b>${insList(alerts)}<p class="sm">筛查量表只是初筛，不等于诊断。建议联系学校心理老师或精神/心理科门诊做专业评估。</p></div>` : '') + `
    <div class="cols even">
      <div class="panel">
        <h3>${mine ? '今天已打卡，可以修改' : '今天感觉怎么样？'}<small>${fmtD(today)}</small></h3>
        ${can ? `<form id="ckForm" class="ck">
          <div class="faces" role="radiogroup" aria-label="心情">${[1, 2, 3, 4, 5].map(i => `<button type="button" class="facebtn" role="radio" aria-checked="${ck.mood === i}" data-act="ck-mood" data-v="${i}">${moodFace(i, 40)}<small>${MOOD[i]}</small></button>`).join('')}</div>
          <div class="field"><span>压力</span><div class="seg sm" role="radiogroup" aria-label="压力">${[1, 2, 3, 4, 5].map(i => `<button type="button" role="radio" aria-checked="${ck.stress === i}" data-act="ck-stress" data-v="${i}">${STRESS[i]}</button>`).join('')}</div></div>
          <div class="frow"><label class="field"><span>昨晚睡了几小时</span><input id="ckSleep" type="number" min="0" max="16" step="0.5" inputmode="decimal" value="${ck.sleep ?? ''}" placeholder="如 8.5"></label>
          <label class="field"><span>今天运动几分钟</span><input id="ckActive" type="number" min="0" max="600" step="5" inputmode="numeric" value="${ck.active ?? ''}" placeholder="中高强度"></label></div>
          <label class="field"><span>想记一句话（可不填）</span><input id="ckNote" type="text" maxlength="140" value="${esc(ck.note || '')}"></label>
          <button class="btn pri" type="submit">${mine ? '更新今天的打卡' : '保存打卡'}</button>
        </form>` : '<p class="muted">只读视图不能打卡。</p>'}
      </div>
      <div class="panel">
        <h3>近 5 周心情<small>${m.life.n ? `近 30 天平均 ${nf(m.life.mood, 1)}/5` : '还没有打卡'}</small></h3>
        ${moodCalendar(m)}
      </div>
    </div>
    <div class="cols even">
      <div class="panel">
        <h3>WHO-5 幸福感指数<small>最近两周 · 0–100</small></h3>
        ${wl ? `<div class="w5"><b class="num">${wl.score}</b><div><span>${fmtD(wl.date)}</span>${P ? pTag(who5Band(wl.score)) : `<span class="muted sm">${wl.score > 50 ? '状态不错，继续保持' : '最近好像有点累，可以和信任的大人聊聊'}</span>`}</div></div>
          ${w5.length > 1 ? `<div class="chart-wrap">${lineSVG({ aria: 'WHO-5 走势', w: chartW(true), h: 170, x: { min: 0, max: w5.length - 1, ticks: w5.map((w, i) => ({ v: i, label: fmtMD(w.date) })) }, y: { min: 0, max: 100, ticks: [0, 25, 50, 75, 100].map(v => ({ v })) }, bands: P ? [{ y0: 0, y1: 50, cls: 'lowband', label: '≤50' }] : [], series: [{ cls: 's1', pts: w5.map((w, i) => ({ x: i, y: w.score, tip: `${fmtD(w.date)} ${w.score}` })) }] })}</div>` : ''}` : '<p class="muted">还没有做过。5 道题，1 分钟。</p>'}
        ${can && who5ok ? `<button class="btn ghost sm" data-act="who5">${I.plus}做一次自测</button>` : !who5ok ? '<p class="muted sm">WHO-5 适用于 9 岁及以上，低年级只用心情打卡。</p>' : ''}
        ${P && w5.length ? `<p class="muted sm">得分 = 5 题合计 × 4。≤ 50 提示幸福感偏低，≤ 28 建议做抑郁方面的专业评估（Topp 等 2015 综述）。</p>` : ''}
      </div>
      <div class="panel help">
        <h3>${P ? '求助热线' : '想找人聊聊？'}<small>${esc(m.sys.name)}</small></h3>
        ${P ? '' : '<p class="sm">难过、害怕或者压力很大的时候，可以告诉爸爸妈妈、老师，也可以打这些电话，有人会认真听你说。</p>'}
        <div class="hot">${m.sys.hot.map(h => `<div><b class="num sel">${esc(h.num)}</b><span>${esc(h.name)}<small>${esc(h.note)}</small></span><button class="ib" data-act="copy" data-t="${esc(h.num)}" aria-label="复制号码">${I.copy}</button></div>`).join('')}</div>
      </div>
    </div>
    ${P ? screenPanel(m) + notesPanel() : ''}`;
}
let CK = { sid: null, date: null, v: {} };
function moodCalendar(m) {
  const end = parseD(m.today), dow = (end.getDay() + 6) % 7; // Monday first
  const start = addDays(m.today, -(dow + 28));
  const by = Object.fromEntries(D.moods.map(x => [x.date, x]));
  let cells = '';
  for (let i = 0; i < 35; i++) {
    const d = addDays(start, i), r = by[d], future = d > m.today;
    cells += `<span class="cd${future ? ' fut' : ''}${d === m.today ? ' today' : ''}"${r ? ` data-tip="${esc(`${fmtMD(d)} ${MOOD[r.mood]}${r.stress ? ' · ' + STRESS[r.stress] : ''}${r.sleep != null ? ` · 睡 ${r.sleep} 小时` : ''}${r.note ? ' · ' + r.note : ''}`)}"` : ''}>${r ? moodFace(r.mood, 26) : `<i>${parseD(d).getDate()}</i>`}</span>`;
  }
  return `<div class="cal"><div class="cal-h">${'一二三四五六日'.split('').map(x => `<span>${x}</span>`).join('')}</div><div class="cal-g">${cells}</div></div>`;
}
function screenPanel(m) {
  const list = m.screens;
  return `<div class="panel">
    <h3>心理筛查记录<small>家长视角可见 · 来自学校或医院报告</small>${wbtn('add-screen', '录入结果')}</h3>
    ${list.length ? `<div class="tbl-wrap flat"><table class="tbl compact"><thead><tr><th>日期</th><th>量表</th><th>评定人</th><th>分数</th><th>分级</th><th>施测方</th><th></th></tr></thead><tbody>${list.map(x => {
    const sc = SCREENS[x.scale];
    return `<tr><td class="num">${fmtD(x.date)}</td><td>${esc(x.scale === 'other' ? x.label || '其他' : sc.name)} ${ex(x)}</td><td>${INFORMANT[x.informant]}</td><td class="num"><b>${x.score}</b><small class="muted">/${sc.max === 1000 ? '—' : sc.max}</small></td><td>${pTag(sc.band(x.score, x.informant))}</td><td class="muted">${esc(x.by)}</td><td>${rowActs('screens', x.id)}</td></tr>`;
  }).join('')}</tbody></table></div>` : '<p class="muted">暂无。学校心理普查（如 MHT、SDQ）或医院的 PHQ-A、GAD-7 结果可以录在这里。</p>'}
    <p class="muted sm">分级依据：PHQ-A 5/10/15/20；GAD-7 5/10/15；SDQ 困难总分按评定人四档（youthinmind 评分指南）；MHT 总焦虑倾向 ≥ 65 需特别关注。SDQ、MHT 题目受版权保护，这里只记录总分。</p>
  </div>`;
}
function notesPanel() {
  return `<div class="panel">
    <h3>家长备忘<small>只有家长视角可见</small>${wbtn('add-note', '添加')}</h3>
    ${D.notes.length ? `<div class="rows">${D.notes.slice().reverse().map(x => `<div class="rrow note"><time>${fmtD(x.date)}</time><span>${esc(x.text)} ${ex(x)}</span>${rowActs('notes', x.id)}</div>`).join('')}</div>` : '<p class="muted">记录和老师的沟通、孩子的变化、就诊情况等。</p>'}
  </div>`;
}
