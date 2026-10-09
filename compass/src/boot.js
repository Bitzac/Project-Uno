/* ---------- roles ---------- */
function setRole(r) {
  ST.role = r; saveUI(); renderAll();
  toast(r === 'student' ? (D.pin ? '已切换到学生视角，切回需要家长 PIN' : '已切换到学生视角。可在页脚设置家长 PIN，防止孩子切回') : '已切换到家长视角');
}

/* ---------- AI 评语 through the sample capability ---------- */
function aiPrompt(m, ins) {
  const s = m.s, strip = h => String(h).replace(/<[^>]+>/g, '');
  const L = m.life, f = m.lastFit, w = m.who5[m.who5.length - 1];
  const lines = [
    `学制：${m.sys.name}；年级：${gradeLabel(s, m.g)}（${m.sys.stage(clamp(m.g, 0, m.sys.maxG))}）；性别：${sexCN(s.sex)}；年龄：${m.age ?? '未填'} 岁；学期：${termName(s.system, m.term)}`,
    '综合素质五维（0–100，括号内为数据来源）：' + DIMS.map(k => `${DIM_CN[k]} ${m.radar.v[k] == null ? '暂无' : nf(m.radar.v[k], 0)}（${strip(m.radar.src[k])}）`).join('；'),
    m.head ? `学业概况：${m.head.label} ${m.head.value}${m.head.unit}` : '本学期没有成绩记录',
    ...m.subj.map(x => `- ${x.subject}：本学期均值 ${nf(x.mean, 1)}（百分制）${x.avg != null ? `，班级均分 ${nf(x.avg, 1)}` : ''}${x.trend != null ? `，近几次每次变化 ${x.trend > 0 ? '+' : ''}${nf(x.trend, 1)}` : ''}`),
    f ? `最近体测 ${f.date}：` + (m.sys.fit === 'gb' && f.ev ? (f.ev.total != null ? `总分 ${f.ev.total}（${gbGrade(f.ev.total)[0]}）；` : '') + f.ev.rows.filter(r => r.sc != null).map(r => `${gbItemName(r.k, s.sex)} ${r.sc} 分`).join('，') : m.sys.fit === 'fg' ? Object.entries(f.marks).map(([k, z]) => `${FIT.fg.items[k].name} ${z}`).join('，') : Object.entries(f.marks).map(([k, p]) => `${FIT.eurofit.items[k].name} 第 ${p} 百分位`).join('，')) : '没有体测记录',
    L.n ? `近 30 天：平均睡眠 ${L.sleep != null ? nf(L.sleep, 1) : '—'} 小时（建议 ${L.range[0]}–${L.range[1]}），日均运动 ${L.active != null ? nf(L.active, 0) : '—'} 分钟，平均心情 ${nf(L.mood, 1)}/5` : '近 30 天没有打卡',
    w ? `WHO-5 幸福感指数：${w.score}/100（${w.date}）` : '',
    '规则引擎已得出的结论：' + ins.map(x => strip(x.t)).join('；')
  ].filter(Boolean);
  return `你是一位经验丰富、措辞克制的班主任。根据下面这位学生的数据，给家长写一段 180–220 字的学期评语：先一句总评，再分述学业、身心、其他方面，最后给出三条具体、可执行的建议（编号列出）。
要求：只依据给出的数据，不编造事实或数字；数据缺失就说明缺失；不做医学或心理诊断，涉及心理健康时语气温和，并建议需要时找专业人员评估；用简体中文。

${lines.join('\n')}`;
}
async function runAI() {
  if (AI.busy) return;
  let sample = null;
  try { sample = window.claude && window.claude.use ? await window.claude.use('sample') : null; } catch { sample = null; }
  if (!sample) { AI.err = '这个页面没有连到 Claude（需要在 claude.ai 中打开），评语功能不可用。'; renderAll(); return; }
  AI = { text: '', busy: true, err: '', sid: CUR };
  renderAll();
  const sid = CUR;
  try {
    const r = await sample(aiPrompt(M, INS), { modelTier: 'default', onText: ({ text }) => { if (sid !== CUR) return; AI.text = text; const el = $('aiText'); if (el) { el.classList.remove('muted'); el.innerHTML = esc(text).replace(/\n/g, '<br>'); } } });
    if (sid === CUR) AI.text = r.text;
  } catch (e) {
    AI.text = (e && e.text) || '';
    AI.err = e && e.code === 'not_granted' ? '没有授权调用 Claude，评语功能不可用。' : e && e.code === 'rate_limited' ? '调用太频繁，请稍后再试。' : '生成失败，请稍后再试。';
  }
  AI.busy = false;
  if (sid === CUR) renderAll();
}

/* ---------- check-in ---------- */
function ckCapture() {
  CK = { sid: CUR, date: todayISO(), v: Object.assign({}, CK.sid === CUR && CK.date === todayISO() ? CK.v : {}) };
  if ($('ckSleep')) { CK.v.sleep = $('ckSleep').value; CK.v.active = $('ckActive').value; CK.v.note = $('ckNote').value; }
}
async function ckSubmit() {
  ckCapture();
  const mine = D.moods.find(x => x.date === todayISO());
  const mood = CK.v.mood || (mine && mine.mood);
  if (!mood) { toast('先选一个心情'); return; }
  const sleep = num(CK.v.sleep), active = num(CK.v.active);
  if (sleep != null && (sleep < 0 || sleep > 16)) { toast('睡眠时长应在 0–16 小时'); return; }
  if (active != null && (active < 0 || active > 600)) { toast('运动时长应在 0–600 分钟'); return; }
  const obj = { date: todayISO(), mood, stress: CK.v.stress || (mine ? mine.stress : null), sleep, active, note: String(CK.v.note || '').slice(0, 140), example: false };
  try {
    if (mine) await put('moods', mine.id, obj); else await add('moods', obj);
    CK = { sid: null, date: null, v: {} };
    toast(isParent() ? '已保存今天的打卡' : '记好啦，明天见');
  } catch (e) { fail(e); }
}

/* ---------- delete with a second tap to confirm ---------- */
let ARM = { k: null, t: 0 };
function armed(k) {
  if (ARM.k === k && Date.now() - ARM.t < 4000) { ARM = { k: null, t: 0 }; return true; }
  ARM = { k, t: Date.now() }; toast('再点一次确认删除'); return false;
}

/* ---------- events ---------- */
const EDIT = { scores: formScore, fitness: formFit, health: formHealthEdit, merits: formMerit, screens: formScreen, notes: formNote };
document.addEventListener('click', async e => {
  const b = e.target.closest('[data-act]');
  if (!b) { if (!e.target.closest('[data-tip]')) hideTip(); return; }
  const a = b.dataset.act;
  if (a === 'close') return closeSheet();
  if (a === 'go') { ST.view = b.dataset.v; saveUI(); renderAll(); $('main').scrollTop = 0; return; }
  if (a === 'kid') return switchStudent(b.dataset.id);
  if (a === 'term') { ST.term = b.dataset.t; return renderAll(); }
  if (a === 'subj') { ST.subj = b.dataset.s; return renderAll(); }
  if (a === 'growth') { ST.growth = b.dataset.g; return renderAll(); }
  if (a === 'copy') {
    const t = b.dataset.t;
    try { await navigator.clipboard.writeText(t); toast('已复制 ' + t); }
    catch { const el = b.parentElement.querySelector('.sel'); if (el) { const r = document.createRange(); r.selectNodeContents(el); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); } toast('号码已选中，可手动复制'); }
    return;
  }
  if (a === 'ck-mood' || a === 'ck-stress') {
    ckCapture();
    CK.v[a === 'ck-mood' ? 'mood' : 'stress'] = +b.dataset.v;
    b.parentElement.querySelectorAll('[role=radio]').forEach(x => x.setAttribute('aria-checked', String(x === b)));
    return;
  }
  if (a === 'who5') { if (canWrite()) formWho5(); return; }
  if (a === 'ai') return runAI();
  // everything below changes data
  if (a === 'load-ex') { if (!guardWrite(true)) return; b.disabled = true; try { await loadExamples(); toast('已载入 3 个示例学生'); } catch (err) { fail(err); } return; }
  if (a === 'new-student') { if (guardWrite(true)) formStudent(true); return; }
  if (!isParent() || !guardWrite()) return;
  if (a === 'clear-ex') { if (!armed('clear-ex')) return; try { const n = await clearExamples(); toast(`已清除 ${n} 个示例学生`); } catch (err) { fail(err); } return; }
  if (a === 'edit-student') return formStudent(false);
  if (a === 'del-student') {
    if (!armed('del-student')) { b.textContent = '确认删除档案'; return; }
    try { await deleteStudent(); closeSheet(); toast('档案已删除'); } catch (err) { fail(err); }
    return;
  }
  if (a === 'add-score') return formScore();
  if (a === 'add-fit') return formFit();
  if (a === 'add-growth') return formGrowth();
  if (a === 'add-vision') return formVision();
  if (a === 'add-rating') return formRating();
  if (a === 'add-merit') return formMerit();
  if (a === 'add-screen') return formScreen();
  if (a === 'add-note') return formNote();
  if (a === 'pin') return formPinSet();
  if (a === 'pin-clear') { try { await setPin(null); closeSheet(); renderFoot(); toast('已移除家长 PIN'); } catch (err) { fail(err); } return; }
  if (a.startsWith('edit-')) { const f = EDIT[a.slice(5)]; if (f) f(b.dataset.id); return; }
  if (a === 'del') {
    const c = b.dataset.c, id = b.dataset.id;
    if (!COLS.includes(c) || !armed(c + id)) return;
    try { await del(c, id); toast('已删除'); } catch (err) { fail(err); }
  }
});
$('role').addEventListener('click', e => {
  const b = e.target.closest('button[data-role]'); if (!b || b.dataset.role === ST.role) return;
  if (b.dataset.role === 'parent' && D.pin && pinSupported()) return formPinEnter();
  setRole(b.dataset.role);
});
$('nav').addEventListener('click', e => {
  const b = e.target.closest('button[data-v]'); if (!b) return;
  ST.view = b.dataset.v; saveUI(); renderAll(); $('main').scrollTop = 0;
});
document.addEventListener('submit', e => {
  e.preventDefault();
  if (e.target.id === 'sheetForm' && FORM && FORM.onSubmit) { $('ferr').textContent = ''; FORM.onSubmit(); }
  if (e.target.id === 'ckForm') { if (canWrite()) ckSubmit(); else toast('你只有查看权限'); }
});
$('scrim').addEventListener('click', closeSheet);
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && $('sheet').classList.contains('on')) closeSheet();
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[role=button][data-act]')) { e.preventDefault(); e.target.click(); }
});

/* ---------- tooltip for chart marks ---------- */
const tip = $('tip');
function showTip(el, x, y) {
  tip.textContent = el.dataset.tip; tip.classList.add('on');
  const r = tip.getBoundingClientRect();
  tip.style.left = clamp(x - r.width / 2, 8, innerWidth - r.width - 8) + 'px';
  tip.style.top = (y - r.height - 14 < 8 ? y + 18 : y - r.height - 14) + 'px';
}
function hideTip() { tip.classList.remove('on'); }
document.addEventListener('pointerover', e => { const el = e.target.closest('[data-tip]'); if (el && el.dataset.tip && e.pointerType === 'mouse') showTip(el, e.clientX, e.clientY); });
document.addEventListener('pointermove', e => { const el = e.target.closest('[data-tip]'); if (el && el.dataset.tip && e.pointerType === 'mouse') showTip(el, e.clientX, e.clientY); else if (e.pointerType === 'mouse') hideTip(); });
document.addEventListener('pointerdown', e => { const el = e.target.closest('[data-tip]'); if (el && el.dataset.tip && e.pointerType !== 'mouse') { showTip(el, e.clientX, e.clientY); clearTimeout(hideTip.t); hideTip.t = setTimeout(hideTip, 2600); } });
$('main').addEventListener('scroll', hideTip, { passive: true });

let lastW = innerWidth, resizeT = 0;
addEventListener('resize', () => { clearTimeout(resizeT); resizeT = setTimeout(() => { if (innerWidth !== lastW) { lastW = innerWidth; renderAll(); } }, 160); });

/* ---------- start ---------- */
if (ST.role === 'student' && !lsGet(LSK.ui)) ST.role = 'parent';
renderAll();
// claude.use resolves asynchronously (or null after a timeout outside claude.ai); fall back to local storage meanwhile
if (window.claude && window.claude.use) connect();
else { loadLocal(); mode = 'local'; setSync('本地模式 · 只存在此浏览器', true); renderAll(); }
