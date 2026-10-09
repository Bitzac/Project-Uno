/* ---------- sheet + field helpers ---------- */
let FORM = null;
function openSheet(title, inner, o = {}) {
  const sh = $('sheet');
  sh.innerHTML = `<form id="sheetForm" novalidate>
    <div class="hd"><div><h2>${title}</h2>${o.sub ? `<p>${o.sub}</p>` : ''}</div><button type="button" class="x" data-act="close" aria-label="关闭">${I.x}</button></div>
    <div class="fbody" id="fbody">${inner}</div>
    <p class="ferr" id="ferr" role="alert"></p>
    <div class="facts">${o.submit === false ? '' : `<button class="btn pri" type="submit">${o.submit || '保存'}</button>`}<button type="button" class="btn ghost" data-act="close">取消</button>${o.extra || ''}</div>
  </form>`;
  FORM = o;
  sh.classList.add('on'); sh.setAttribute('aria-hidden', 'false'); $('scrim').classList.add('on');
  const first = sh.querySelector('input:not([type=hidden]),select,textarea');
  if (first) setTimeout(() => first.focus({ preventScroll: true }), 60);
}
function closeSheet() {
  const sh = $('sheet'); sh.classList.remove('on'); sh.setAttribute('aria-hidden', 'true'); $('scrim').classList.remove('on');
  FORM = null;
}
const fv = id => { const el = $(id); return el ? el.value.trim() : ''; };
const fn = id => num(fv(id));
const ferr = msg => { $('ferr').textContent = msg; return false; };
const today = () => todayISO();
const F = {
  text: (id, label, v = '', o = {}) => `<label class="field${o.wide ? ' wide' : ''}"><span>${label}</span><input id="${id}" type="text" value="${esc(v ?? '')}" maxlength="${o.max || 60}"${o.ph ? ` placeholder="${esc(o.ph)}"` : ''}${o.list ? ` list="${o.list}"` : ''} autocomplete="off"></label>`,
  num: (id, label, v, o = {}) => `<label class="field"><span>${label}</span><input id="${id}" type="${o.text ? 'text' : 'number'}" inputmode="decimal" value="${v ?? ''}"${o.min != null ? ` min="${o.min}"` : ''}${o.max != null ? ` max="${o.max}"` : ''} step="${o.step || 'any'}"${o.ph ? ` placeholder="${esc(o.ph)}"` : ''}></label>`,
  date: (id, label, v) => `<label class="field"><span>${label}</span><input id="${id}" type="date" value="${v || today()}" max="${today()}"></label>`,
  month: (id, label, v) => `<label class="field"><span>${label}</span><input id="${id}" type="month" value="${v || ''}" placeholder="YYYY-MM" max="${today().slice(0, 7)}"></label>`,
  sel: (id, label, opts, v, o = {}) => `<label class="field${o.wide ? ' wide' : ''}"><span>${label}</span><select id="${id}">${opts.map(([k, t]) => `<option value="${esc(k)}"${String(k) === String(v) ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select></label>`,
  area: (id, label, v = '', max = 300) => `<label class="field wide"><span>${label}</span><textarea id="${id}" rows="3" maxlength="${max}">${esc(v || '')}</textarea></label>`,
  note: t => `<p class="fnote">${t}</p>`
};
const grid = (...xs) => `<div class="fgrid">${xs.join('')}</div>`;
const find = (c, id) => D[c].find(x => x.id === id);
async function save(fn) { try { await fn(); closeSheet(); return true; } catch (e) { fail(e); return false; } }

/* ---------- student profile ---------- */
function formStudent(isNew) {
  const s = isNew ? { name: '', sex: 'F', birth: '', system: 'cn', school: '', cls: '', allergy: '' } : D.st;
  const g = isNew ? 1 : clamp(gradeAt(s, new Date()), 0, SYS[s.system].maxG);
  openSheet(isNew ? '新建学生档案' : '编辑档案', grid(
    F.text('fName', '姓名', s.name, { max: 16 }),
    F.sel('fSex', '性别', [['F', '女'], ['M', '男']], s.sex),
    F.month('fBirth', '出生年月', s.birth),
    F.sel('fSys', '学制', Object.entries(SYS).map(([k, v]) => [k, `${v.name} · ${v.badge}`]), s.system),
    `<div id="fGradeWrap" class="field-wrap">${gradeSelect(s.system, g)}</div>`,
    F.text('fSchool', '学校', s.school, { max: 40 }),
    F.text('fCls', '班级', s.cls, { max: 24, ph: '如 初二（3）班 / 10H' }),
    F.text('fAllergy', '过敏 / 健康备注', s.allergy, { max: 60, wide: true })
  ) + F.note('年级按学年自动升级：中国、英国 9 月，美国 8 月开学。'), {
    sub: isNew ? '每个学生只在一种学制里，成绩、体测和学期都按这个学制的标准计算。' : '',
    extra: isNew ? '' : `<button type="button" class="btn danger" data-act="del-student">删除档案</button>`,
    async onSubmit() {
      const name = fv('fName'), birth = fv('fBirth'), sys = fv('fSys'), gi = fn('fGrade');
      if (!name) return ferr('请填写姓名');
      if (birth && !isMonth(birth)) return ferr('出生年月格式应为 YYYY-MM');
      const obj = { name, sex: fv('fSex'), birth, system: sys, cohort: schoolYear(sys, new Date()) - gi, school: fv('fSchool'), cls: fv('fCls'), allergy: fv('fAllergy') };
      return save(() => saveStudent(obj, isNew));
    }
  });
  $('fSys').addEventListener('change', () => { $('fGradeWrap').innerHTML = gradeSelect(fv('fSys'), clamp(fn('fGrade') ?? 1, 0, SYS[fv('fSys')].maxG)); });
}
const gradeSelect = (sys, g) => F.sel('fGrade', '当前年级', SYS[sys].grades.map((t, i) => [i, `${t} · ${SYS[sys].stage(i)}`]), g);

/* ---------- scores ---------- */
function formScore(id) {
  const r = id ? find('scores', id) : null, s = D.st, sys = SYS[s.system];
  const date = r ? r.date : today(), g = clamp(gradeAt(s, parseD(date)), 0, sys.maxG);
  const scales = [...new Set([...(r ? [r.scale] : []), ...sys.scales(g), ...(s.system === 'uk' ? ['pct'] : [])])];
  const scale = r ? r.scale : scales[0];
  const lastSame = subj => D.scores.filter(x => x.subject === subj && x.scale === 'pts').pop();
  openSheet(r ? '编辑成绩' : '录入成绩', grid(
    F.date('fDate', '日期', date),
    F.text('fSubj', '科目', r ? r.subject : (ST.subj || ''), { list: 'subjList', ph: '选择或输入' }) + `<datalist id="subjList">${sys.subjects(g).map(x => `<option value="${esc(x)}">${esc(GLOSS[x] || '')}</option>`).join('')}</datalist>`,
    F.sel('fKind', '类型', sys.kinds.map(k => [k, k]), r ? r.kind : sys.kinds[1]),
    F.sel('fScale', '计分方式', scales.map(k => [k, SCALES[k].name]), scale),
    `<div id="fValWrap" class="field-wrap wide">${valueFields(scale, r, lastSame)}</div>`,
    s.system === 'us' && g >= 9 ? F.sel('fLvl', '课程级别', [['', '常规'], ['H', 'Honors'], ['AP', 'AP']], r ? r.lvl : '') : '',
    F.text('fNote', '备注', r ? r.note : '', { max: 120, wide: true })
  ), {
    async onSubmit() {
      const date = fv('fDate'), subject = fv('fSubj'), sc = fv('fScale'), S = SCALES[sc];
      if (!isDate(date) || date > today()) return ferr('请选择不晚于今天的日期');
      if (!subject) return ferr('请填写科目');
      const value = fn('fVal'), full = sc === 'pts' ? fn('fFull') : null, avg = fn('fAvg');
      if (value == null || value < S.min || value > (sc === 'pts' ? full ?? S.max : S.max)) return ferr(sc === 'pts' ? '分数应在 0 到满分之间' : `${S.name}：请输入 ${S.min}–${S.max}`);
      if (sc === 'pts' && !(full > 0)) return ferr('请填写满分');
      if (avg != null && (avg < S.min || avg > (sc === 'pts' ? full : S.max))) return ferr('班级均分超出范围');
      const obj = { date, subject, kind: fv('fKind'), scale: sc, value, full, avg, lvl: $('fLvl') ? fv('fLvl') : '', note: fv('fNote'), example: false };
      ST.subj = subject;
      return save(() => r ? put('scores', r.id, obj) : add('scores', obj));
    }
  });
  $('fScale').addEventListener('change', () => { $('fValWrap').innerHTML = valueFields(fv('fScale'), r, lastSame); });
}
function valueFields(scale, r, lastSame) {
  const S = SCALES[scale], v = r && r.scale === scale ? r.value : '', a = r && r.scale === scale ? r.avg : '';
  if (scale === 'alevel') {
    const opts = ALEVEL.map((t, i) => [i, t]).reverse();
    return grid(F.sel('fVal', '成绩', opts, v === '' ? 5 : v), F.sel('fAvg', '班级平均（可不填）', [['', '—'], ...opts], a ?? ''));
  }
  const full = r && r.scale === 'pts' ? r.full : (lastSame && lastSame(fv('fSubj') || ST.subj || '') || {}).full || 100;
  return grid(
    F.num('fVal', scale === 'pts' ? '得分' : scale === 'gcse' ? 'GCSE 等级（U 填 0）' : '成绩', v, { min: S.min, max: S.max, step: S.step }),
    scale === 'pts' ? F.num('fFull', '满分', full, { min: 1, max: 1000, step: 1 }) : '',
    F.num('fAvg', '班级均分（可不填）', a, { min: S.min, max: S.max, step: S.step })
  );
}

/* ---------- fitness ---------- */
function formFit(id) {
  const r = id ? find('fitness', id) : null, s = D.st, sys = SYS[s.system].fit;
  const date = r ? r.date : today();
  openSheet(r ? '编辑体测' : '录入体测成绩', F.date('fDate', '测试日期', date) + `<div id="fFitWrap">${fitFields(sys, date, r)}</div>`, {
    sub: esc(FIT[sys].name) + (sys === 'gb' ? ' · 填原始成绩，系统按官方评分表算单项得分和总分' : sys === 'fg' ? ' · 区间照抄学校 FitnessGram 报告' : ' · 百分位照抄报告，或按 Tomkinson 2018 常模查'),
    async onSubmit() {
      const date = fv('fDate');
      if (!isDate(date) || date > today()) return ferr('请选择不晚于今天的日期');
      const def = FIT[sys].items, items = {}, marks = {};
      for (const k in def) {
        const el = $('fi_' + k); if (!el || !el.value.trim()) continue;
        const v = def[k].time ? parseMMSS(el.value) : num(el.value.trim());
        if (v == null || v < (k === 'sr' || k === 'sitreach' ? -50 : 0)) return ferr(`${def[k].name}：格式不对${def[k].time ? '，例如 3\'45"' : ''}`);
        items[k] = v;
      }
      for (const k in def) {
        const el = $('fm_' + k); if (!el || !el.value) continue;
        if (sys === 'fg') marks[k] = el.value;
        else { const p = num(el.value); if (p == null || p < 0 || p > 100) return ferr(`${def[k].name}：百分位应为 0–100`); marks[k] = p; }
      }
      const h = fn('fH'), w = fn('fW');
      if (h != null && (h < 60 || h > 230)) return ferr('身高应在 60–230 cm');
      if (w != null && (w < 10 || w > 200)) return ferr('体重应在 10–200 kg');
      if (h && w) items.bmi = Math.round(w / ((h / 100) ** 2) * 10) / 10;
      if (!Object.keys(items).length && !Object.keys(marks).length) return ferr('至少填写一项');
      return save(async () => {
        if (h) await add('health', { date, type: 'height', value: h, example: false });
        if (w) await add('health', { date, type: 'weight', value: w, example: false });
        const obj = { date, items, marks, note: '', example: false };
        if (r) await put('fitness', r.id, obj); else await add('fitness', obj);
      });
    }
  });
  $('fDate').addEventListener('change', () => { if (isDate(fv('fDate'))) $('fFitWrap').innerHTML = fitFields(sys, fv('fDate'), r); });
}
function fitFields(sys, date, r) {
  const s = D.st, def = FIT[sys].items, g = gradeAt(s, parseD(date));
  const val = k => r && r.items[k] != null ? (def[k].time ? mmss(r.items[k]) : r.items[k]) : '';
  if (sys === 'gb') {
    const plan = FIT.gb.plan(g, s.sex);
    if (!plan.length || g > 12) return F.note('该年级没有国家学生体质健康标准的测试项目（标准覆盖一年级至高三）。');
    const b = M && M.bmiNear(date);
    return F.note(`${esc(SYS.cn.grades[g])} · ${sexCN(s.sex)}生测试项目（括号内为权重）`) + grid(
      F.num('fH', '身高 cm（算 BMI）', '', { min: 60, max: 230, step: 0.1, ph: b ? '已有记录可不填' : '' }), F.num('fW', '体重 kg', '', { min: 10, max: 200, step: 0.1 }),
      ...plan.filter(([k]) => k !== 'bmi').map(([k, w]) => F.num('fi_' + k, `${gbItemName(k, s.sex)}（${w}%）· ${def[k].unit}`, val(k), def[k].time ? { text: true, ph: '如 3\'45"' } : { step: 'any' }))
    ) + F.note(b ? `BMI 默认取测试日期前后最近的身高体重：${nf(b, 1)}。` : 'BMI 由身高体重计算；不填则从身高体重记录里取最近的一次。');
  }
  const mk = k => sys === 'fg'
    ? F.sel('fm_' + k, '区间', [['', '—'], ['HFZ', '健康区 HFZ'], ['NI', '需改进 NI'], ['NIHR', '需改进·健康风险']], r && r.marks[k] || '')
    : F.num('fm_' + k, '百分位', r && r.marks[k] != null ? r.marks[k] : '', { min: 0, max: 100, step: 1, ph: '0–100' });
  return Object.keys(def).map(k => `<div class="fitrow"><b>${esc(def[k].name)}</b>${grid(F.num('fi_' + k, def[k].unit, val(k), def[k].time ? { text: true, ph: '如 9\'30"' } : {}), mk(k))}</div>`).join('');
}

/* ---------- growth & vision ---------- */
function formGrowth() {
  openSheet('身高体重', grid(F.date('fDate', '测量日期'), F.num('fH', '身高 cm', '', { min: 60, max: 230, step: 0.1 }), F.num('fW', '体重 kg', '', { min: 10, max: 200, step: 0.1 })), {
    async onSubmit() {
      const date = fv('fDate'), h = fn('fH'), w = fn('fW');
      if (!isDate(date) || date > today()) return ferr('请选择不晚于今天的日期');
      if (h == null && w == null) return ferr('至少填写身高或体重');
      if (h != null && (h < 60 || h > 230)) return ferr('身高应在 60–230 cm');
      if (w != null && (w < 10 || w > 200)) return ferr('体重应在 10–200 kg');
      return save(async () => { if (h != null) await add('health', { date, type: 'height', value: h, example: false }); if (w != null) await add('health', { date, type: 'weight', value: w, example: false }); });
    }
  });
}
function formHealthEdit(id) {
  const r = find('health', id); if (!r) return;
  if (r.type === 'vision') return formVision(r);
  openSheet(r.type === 'height' ? '编辑身高' : '编辑体重', grid(F.date('fDate', '日期', r.date), F.num('fV', r.type === 'height' ? '身高 cm' : '体重 kg', r.value, { step: 0.1 })), {
    async onSubmit() {
      const date = fv('fDate'), v = fn('fV');
      if (!isDate(date) || v == null || v <= 0) return ferr('请检查日期和数值');
      return save(() => put('health', r.id, { date, type: r.type, value: v, example: false }));
    }
  });
}
function formVision(r) {
  const vsKey = SYS[D.st.system].vision, vs = VISION[vsKey];
  openSheet(r ? '编辑视力' : '录入视力', grid(
    F.date('fDate', '检查日期', r && r.date),
    F.num('fL', `左眼（${vs.name}）`, r ? toInputVision(vsKey, r.value) : '', { min: vs.min, max: vs.max, step: vs.step, ph: vs.hint }),
    F.num('fR', `右眼（${vs.name}）`, r && r.value2 ? toInputVision(vsKey, r.value2) : '', { min: vs.min, max: vs.max, step: vs.step, ph: vs.hint })
  ) + F.note('填裸眼视力。'), {
    async onSubmit() {
      const date = fv('fDate'), l = fn('fL'), rr = fn('fR');
      if (!isDate(date) || date > today()) return ferr('请选择不晚于今天的日期');
      if (l == null || l < vs.min || l > vs.max) return ferr(`左眼：请输入 ${vs.min}–${vs.max}`);
      if (rr != null && (rr < vs.min || rr > vs.max)) return ferr(`右眼：请输入 ${vs.min}–${vs.max}`);
      const obj = { date, type: 'vision', value: +vs.fromInput(l).toFixed(3), value2: rr == null ? null : +vs.fromInput(rr).toFixed(3), example: false };
      return save(() => r ? put('health', r.id, obj) : add('health', obj));
    }
  });
}

/* ---------- 综合素质: term ratings and merits ---------- */
function formRating() {
  const m = M, sys = m.sys;
  openSheet('学期评级', F.sel('fTerm', '学期', m.terms.slice().reverse().map(t => [t, termName(m.s.system, t)]), m.term, { wide: true }) + `<div id="fRateWrap">${rateFields(m.term)}</div>` + F.text('fBy', '评定人', '', { ph: m.s.system === 'cn' ? '如 班主任 / 学校综评' : '如 Homeroom teacher', max: 20 }), {
    sub: m.s.system === 'cn' ? '来自学校综合素质评价手册或报告单的等级' : '来自成绩单的 Citizenship / Effort / Attitude to Learning 等栏目，自行对应到 A–D',
    async onSubmit() {
      const term = fv('fTerm'), by = fv('fBy');
      return save(async () => {
        for (const d of RATED) {
          const mark = fv('fRate_' + d), id = `${term}-${d}`, had = D.ratings.find(x => x.id === id || (x.term === term && x.dim === d));
          if (mark) await put('ratings', had ? had.id : id, { term, dim: d, mark, by, note: '', example: false });
          else if (had) await del('ratings', had.id);
        }
      });
    }
  });
  const sel = $('fTerm'); sel.addEventListener('change', () => { $('fRateWrap').innerHTML = rateFields(sel.value); });
  function rateFields(term) {
    return grid(...RATED.map(d => { const r = D.ratings.find(x => x.term === term && x.dim === d); return F.sel('fRate_' + d, esc(sys.dim(d)), [['', '—'], ...Object.keys(MARKS).map(k => [k, `${k} · ${MARK_CN[k]}`])], r ? r.mark : ''); }));
  }
}
function formMerit(id) {
  const r = id ? find('merits', id) : null, sys = SYS[D.st.system];
  openSheet(r ? '编辑事迹' : '记录事迹', grid(
    F.date('fDate', '日期', r && r.date),
    F.sel('fDim', '维度', DIMS.map(k => [k, sys.dim(k)]), r ? r.dim : 'practice'),
    F.text('fTitle', '事迹', r ? r.title : '', { wide: true, max: 60, ph: D.st.system === 'cn' ? '如 区青少年科技创新大赛二等奖' : 'e.g. Science Fair 2nd place' }),
    F.text('fLevel', '级别', r ? r.level : '', { list: 'lvList', max: 12 }) + `<datalist id="lvList">${sys.levels.map(x => `<option value="${esc(x)}">`).join('')}</datalist>`,
    F.num('fHours', '时长（小时，可不填）', r ? r.hours : '', { min: 0, max: 2000, step: 0.5 }),
    F.text('fNote', '备注', r ? r.note : '', { max: 120, wide: true })
  ), {
    async onSubmit() {
      const date = fv('fDate'), title = fv('fTitle'), hours = fn('fHours');
      if (!isDate(date) || date > today()) return ferr('请选择不晚于今天的日期');
      if (!title) return ferr('请填写事迹');
      if (hours != null && (hours < 0 || hours > 2000)) return ferr('时长应在 0–2000 小时');
      const obj = { date, dim: fv('fDim'), title, level: fv('fLevel'), hours, note: fv('fNote'), example: false };
      return save(() => r ? put('merits', r.id, obj) : add('merits', obj));
    }
  });
}

/* ---------- WHO-5 (the student fills it in) ---------- */
function formWho5() {
  openSheet('WHO-5 幸福感自测', `<p class="fnote">回想<b>最近两周</b>，每句话符合你的程度：</p>` + WHO5_Q.map((q, i) => `<fieldset class="q"><legend>${i + 1}. ${q}</legend><div class="opts">${WHO5_A.map((a, v) => `<label><input type="radio" name="w${i}" value="${v}"><span>${a}</span></label>`).join('')}</div></fieldset>`).join(''), {
    submit: '提交',
    async onSubmit() {
      const items = WHO5_Q.map((_, i) => { const c = document.querySelector(`input[name="w${i}"]:checked`); return c ? +c.value : null; });
      if (items.some(x => x == null)) return ferr('还有题目没选');
      return save(() => add('who5', { date: today(), items, example: false }));
    }
  });
}

/* ---------- parent-only: screening, notes, PIN ---------- */
function formScreen(id) {
  const r = id ? find('screens', id) : null;
  openSheet(r ? '编辑筛查结果' : '录入筛查结果', grid(
    F.date('fDate', '施测日期', r && r.date),
    F.sel('fScale', '量表', Object.entries(SCREENS).map(([k, v]) => [k, v.name]), r ? r.scale : 'PHQ-A', { wide: true }),
    F.text('fLabel', '量表名称（选「其他」时填）', r ? r.label : '', { max: 30 }),
    F.sel('fInf', '评定人', Object.entries(INFORMANT), r ? r.informant : 'self'),
    F.num('fScore', '总分', r ? r.score : '', { min: 0, step: 1 }),
    F.text('fBy', '施测方', r ? r.by : '', { ph: '如 学校心理普查 / 某医院', max: 30 }),
    F.text('fNote', '备注', r ? r.note : '', { max: 200, wide: true })
  ) + F.note('只记录报告上的总分。筛查不等于诊断，结论以专业人员评估为准。'), {
    async onSubmit() {
      const date = fv('fDate'), scale = fv('fScale'), score = fn('fScore'), S = SCREENS[scale];
      if (!isDate(date) || date > today()) return ferr('请选择不晚于今天的日期');
      if (score == null || score < 0 || score > S.max) return ferr(`总分应在 0–${S.max}`);
      if (scale === 'other' && !fv('fLabel')) return ferr('请填写量表名称');
      const obj = { date, scale, label: fv('fLabel'), informant: fv('fInf'), score, by: fv('fBy'), note: fv('fNote'), example: false };
      return save(() => r ? put('screens', r.id, obj) : add('screens', obj));
    }
  });
}
function formNote(id) {
  const r = id ? find('notes', id) : null;
  openSheet(r ? '编辑备忘' : '家长备忘', F.date('fDate', '日期', r && r.date) + F.area('fText', '内容', r ? r.text : '', 500), {
    async onSubmit() {
      const date = fv('fDate'), text = fv('fText');
      if (!isDate(date)) return ferr('请选择日期');
      if (!text) return ferr('请填写内容');
      return save(() => r ? put('notes', r.id, { date, text, example: false }) : add('notes', { date, text, example: false }));
    }
  });
}
function formPinSet() {
  openSheet(D.pin ? '修改家长 PIN' : '设置家长 PIN', grid(F.num('fPin1', '4–6 位数字', '', { text: true, ph: '••••' }), F.num('fPin2', '再输一次', '', { text: true, ph: '••••' })) +
    F.note('设置后，从「学生」视角切回「家长」视角需要输入 PIN。它防止孩子在同一台设备上误入家长视角，不是加密。'), {
    extra: D.pin ? '<button type="button" class="btn danger" data-act="pin-clear">移除 PIN</button>' : '',
    async onSubmit() {
      const a = fv('fPin1'), b = fv('fPin2');
      if (!/^\d{4,6}$/.test(a)) return ferr('PIN 应为 4–6 位数字');
      if (a !== b) return ferr('两次输入不一致');
      try { await setPin(a); closeSheet(); renderFoot(); toast('已设置家长 PIN'); } catch (e) { fail(e); }
    }
  });
  ['fPin1', 'fPin2'].forEach(id => { const el = $(id); el.type = 'password'; el.inputMode = 'numeric'; el.autocomplete = 'off'; });
}
function formPinEnter() {
  openSheet('切回家长视角', F.num('fPin', '家长 PIN', '', { text: true, ph: '••••' }), {
    submit: '确认',
    async onSubmit() {
      const ok = await checkPin(fv('fPin'));
      if (!ok) { $('fPin').value = ''; return ferr('PIN 不对'); }
      closeSheet(); setRole('parent');
    }
  });
  const el = $('fPin'); el.type = 'password'; el.inputMode = 'numeric'; el.autocomplete = 'off';
}
