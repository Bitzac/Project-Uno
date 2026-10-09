/* ---------- school systems, scales and reference standards ----------
 * Every threshold here has a source; see README.md § 参考标准. REF (refdata.js) holds the large official tables. */

// 综合素质评价五维（教育部 2014《关于加强和改进普通高中学生综合素质评价的意见》），order as published
const DIMS = ['moral', 'academic', 'health', 'arts', 'practice'];
const DIM_EN = { moral: 'Character', academic: 'Academics', health: 'Well-being', arts: 'Arts', practice: 'Service' };
const DIM_CN = { moral: '思想品德', academic: '学业水平', health: '身心健康', arts: '艺术素养', practice: '社会实践' };
const RATED = ['moral', 'arts', 'practice']; // rated per term; academic and health are computed from records
const MARKS = { A: 95, B: 80, C: 65, D: 50 };
const MARK_CN = { A: '优秀', B: '良好', C: '合格', D: '待提高' };

const GLOSS = {
  ELA: '英语语言艺术', Math: '数学', Maths: '数学', Science: '科学', 'Social Studies': '社会研究', PE: '体育', Art: '美术', Music: '音乐',
  'World Language': '外语', 'Computer Science': '计算机', Computing: '计算机', English: '英语', 'Algebra I': '代数 I', Geometry: '几何',
  'Algebra II': '代数 II', Precalculus: '微积分预备', Calculus: '微积分', Statistics: '统计', Biology: '生物', Chemistry: '化学', Physics: '物理',
  'World History': '世界史', 'US History': '美国史', Government: '政府', Economics: '经济', Spanish: '西班牙语', French: '法语', Chinese: '中文',
  History: '历史', Geography: '地理', 'Art and Design': '艺术与设计', Languages: '外语', RE: '宗教教育', 'Religious Studies': '宗教研究',
  'Design and Technology': '设计与技术', 'English Language': '英语语言', 'English Literature': '英语文学', 'Combined Science': '综合科学',
  'Further Maths': '进阶数学', Psychology: '心理学'
};

const SYS = {
  cn: {
    name: '中国', badge: 'CN', syMonth: 9, maxG: 12,
    grades: ['学前', '一年级', '二年级', '三年级', '四年级', '五年级', '六年级', '初一', '初二', '初三', '高一', '高二', '高三'],
    stage: g => g === 0 ? '学前' : g <= 6 ? '小学' : g <= 9 ? '初中' : '高中',
    term: (y, m) => m >= 9 ? [y, 1] : m === 1 ? [y - 1, 1] : [y - 1, 2],
    termName: (sy, n) => `${sy}–${String(sy + 1).slice(2)} ${n === 1 ? '上' : '下'}学期`,
    termShort: (sy, n) => `${String(sy).slice(2)}${n === 1 ? '上' : '下'}`,
    dim: k => DIM_CN[k],
    subjects: g => g <= 2 ? ['语文', '数学', '道德与法治', '科学', '体育与健康', '音乐', '美术', '劳动']
      : g <= 6 ? ['语文', '数学', '英语', '道德与法治', '科学', '信息科技', '体育与健康', '音乐', '美术', '劳动']
        : g <= 9 ? ['语文', '数学', '英语', '物理', '化学', '生物学', '历史', '地理', '道德与法治', '信息科技', '体育与健康', '音乐', '美术']
          : ['语文', '数学', '英语', '物理', '化学', '生物学', '思想政治', '历史', '地理', '信息技术', '通用技术', '体育与健康', '艺术'],
    scales: () => ['pts'],
    kinds: ['单元测验', '月考', '期中考试', '期末考试', '区统考'],
    levels: ['班级', '校级', '区县级', '市级', '省级', '国家级'],
    fit: 'gb', vision: 'log5',
    hot: [{ name: '全国心理援助热线', num: '12356', note: '国家卫健委统一号码，24 小时' }, { name: '急救 / 报警', num: '120 / 110', note: '有立即危险时' }]
  },
  us: {
    name: '美国', badge: 'US', syMonth: 8, maxG: 12,
    grades: ['Kindergarten', ...Array.from({ length: 12 }, (_, i) => 'Grade ' + (i + 1))],
    stage: g => g <= 5 ? 'Elementary' : g <= 8 ? 'Middle School' : 'High School',
    term: (y, m) => m >= 8 ? [y, 1] : [y - 1, 2],
    termName: (sy, n) => n === 1 ? `Fall ${sy}` : `Spring ${sy + 1}`,
    termShort: (sy, n) => n === 1 ? `F${String(sy).slice(2)}` : `S${String(sy + 1).slice(2)}`,
    dim: k => DIM_EN[k],
    subjects: g => g <= 5 ? ['ELA', 'Math', 'Science', 'Social Studies', 'PE', 'Art', 'Music']
      : g <= 8 ? ['ELA', 'Math', 'Science', 'Social Studies', 'World Language', 'Computer Science', 'PE', 'Art', 'Music']
        : ['English', 'Algebra I', 'Geometry', 'Algebra II', 'Precalculus', 'Calculus', 'Statistics', 'Biology', 'Chemistry', 'Physics', 'World History', 'US History', 'Government', 'Economics', 'Spanish', 'French', 'Chinese', 'Computer Science', 'PE', 'Art', 'Music'],
    scales: g => g <= 5 ? ['pct', 'sb4'] : ['pct'],
    kinds: ['Quiz', 'Unit Test', 'Midterm', 'Final', 'Quarter Grade', 'Semester Grade', 'Standardized'],
    levels: ['Class', 'School', 'District', 'State', 'National'],
    fit: 'fg', vision: 'snellen20',
    hot: [{ name: '988 Suicide & Crisis Lifeline', num: '988', note: '电话或短信，24 小时' }, { name: 'Emergency', num: '911', note: '有立即危险时' }]
  },
  uk: {
    name: '英国', badge: 'UK', syMonth: 9, maxG: 13,
    grades: ['Reception', ...Array.from({ length: 13 }, (_, i) => 'Year ' + (i + 1))],
    stage: g => g === 0 ? 'EYFS' : g <= 2 ? 'Key Stage 1' : g <= 6 ? 'Key Stage 2' : g <= 9 ? 'Key Stage 3' : g <= 11 ? 'Key Stage 4 · GCSE' : 'Sixth Form · A-level',
    term: (y, m) => m >= 9 ? [y, 1] : m <= 3 ? [y - 1, 2] : [y - 1, 3],
    termName: (sy, n) => `${['Autumn', 'Spring', 'Summer'][n - 1]} ${n === 1 ? sy : sy + 1}`,
    termShort: (sy, n) => `${'ASU'[n - 1]}${String(n === 1 ? sy : sy + 1).slice(2)}`,
    dim: k => DIM_EN[k],
    subjects: g => g <= 6 ? ['English', 'Maths', 'Science', 'Computing', 'History', 'Geography', 'Art and Design', 'Music', 'PE', 'Languages', 'RE']
      : g <= 9 ? ['English', 'Maths', 'Science', 'History', 'Geography', 'French', 'Spanish', 'Computing', 'Art and Design', 'Music', 'PE', 'Design and Technology', 'RE']
        : g <= 11 ? ['English Language', 'English Literature', 'Maths', 'Combined Science', 'Biology', 'Chemistry', 'Physics', 'History', 'Geography', 'French', 'Spanish', 'Computer Science', 'Art and Design', 'Music', 'Religious Studies', 'Design and Technology', 'PE']
          : ['Maths', 'Further Maths', 'Physics', 'Chemistry', 'Biology', 'Economics', 'History', 'English Literature', 'Psychology', 'Computer Science', 'Geography', 'Art'],
    scales: g => g === 6 ? ['pct', 'ks2'] : g <= 9 ? ['pct'] : g <= 11 ? ['gcse', 'pct'] : ['alevel', 'pct'],
    kinds: ['Assessment', 'End of Term', 'Mock', 'Predicted', 'KS2 SATs', 'Final'],
    levels: ['Class', 'School', 'County', 'Regional', 'National'],
    fit: 'eurofit', vision: 'snellen6',
    hot: [{ name: 'Childline', num: '0800 1111', note: '19 岁以下，免费，24 小时' }, { name: 'Samaritans', num: '116 123', note: '免费，24 小时' }, { name: 'Emergency', num: '999', note: '有立即危险时' }]
  }
};

/* ---------- school year, grade and term ---------- */
const schoolYear = (sys, d) => { const y = d.getFullYear(), m = d.getMonth() + 1; return m >= SYS[sys].syMonth ? y : y - 1; };
// cohort = the school year the student was in grade index 0 (学前 / Kindergarten / Reception)
const gradeAt = (s, d) => schoolYear(s.system, d) - s.cohort;
function gradeLabel(s, g) {
  const sy = SYS[s.system];
  if (g < 0) return '未入学';
  if (g > sy.maxG) return '已毕业';
  return sy.grades[g];
}
function termOf(sys, dateStr) { const d = parseD(dateStr); return SYS[sys].term(d.getFullYear(), d.getMonth() + 1); }
const termKey = (sys, dateStr) => termOf(sys, dateStr).join('-');
const termName = (sys, key) => { const [y, n] = key.split('-').map(Number); return SYS[sys].termName(y, n); };
const termShort = (sys, key) => { const [y, n] = key.split('-').map(Number); return SYS[sys].termShort(y, n); };
const termCmp = (a, b) => { const [ya, na] = a.split('-').map(Number), [yb, nb] = b.split('-').map(Number); return ya - yb || na - nb; };

/* ---------- score scales: each maps a native value to 0–100 inside its own system (no cross-system conversion) ---------- */
// US letter grades and 4.0 GPA points: College Board conversion table (districts vary)
const US_LETTER = [[97, 'A+', 4.0], [93, 'A', 4.0], [90, 'A-', 3.7], [87, 'B+', 3.3], [83, 'B', 3.0], [80, 'B-', 2.7], [77, 'C+', 2.3], [73, 'C', 2.0], [70, 'C-', 1.7], [67, 'D+', 1.3], [65, 'D', 1.0], [0, 'F', 0]];
const usLetter = p => US_LETTER.find(r => p >= r[0]);
const ALEVEL = ['U', 'E', 'D', 'C', 'B', 'A', 'A*'];
const SB4 = ['', 'Beginning', 'Approaching', 'Meets', 'Exceeds'];
const SCALES = {
  pts: { name: '分数 / 满分', min: 0, max: 1000, step: 0.5, norm: (v, f) => v / f * 100, show: (v, f) => `${nf(v, v % 1 ? 1 : 0)}<small>/${f}</small>` },
  pct: { name: '百分比 %', min: 0, max: 100, step: 0.1, norm: v => v, show: v => `${nf(v, v % 1 ? 1 : 0)}<small>%</small>` },
  sb4: { name: '标准等级 1–4', min: 1, max: 4, step: 1, norm: v => v / 4 * 100, show: v => `${v}<small> ${SB4[v] || ''}</small>` },
  ks2: { name: 'KS2 标准分 80–120', min: 80, max: 120, step: 1, norm: v => (v - 80) / 40 * 100, show: v => String(v) },
  gcse: { name: 'GCSE 9–1', min: 0, max: 9, step: 1, norm: v => v / 9 * 100, show: v => v === 0 ? 'U' : String(v) },
  alevel: { name: 'A-level A*–E', min: 0, max: 6, step: 1, norm: v => v / 6 * 100, show: v => ALEVEL[v] }
};
const normOf = r => clamp(SCALES[r.scale].norm(r.value, r.full), 0, 100);
// a level word for one subject result; CN uses the common 85/70/60 school split (no national rule)
function levelOf(sys, scale, value, norm) {
  if (scale === 'pts') return norm >= 85 ? ['优秀', 'ok'] : norm >= 70 ? ['良好', 'ok'] : norm >= 60 ? ['合格', ''] : ['待提高', 'warn'];
  if (scale === 'pct' && sys === 'us') { const l = usLetter(norm); return [l[1], l[2] >= 3 ? 'ok' : l[2] >= 2 ? '' : 'warn']; }
  if (scale === 'pct') return ['', '']; // no national percentage bands in England
  if (scale === 'sb4') return [SB4[Math.round(value)] || '', value >= 3 ? 'ok' : 'warn'];
  if (scale === 'ks2') return value >= 110 ? ['High score', 'ok'] : value >= 100 ? ['Expected', 'ok'] : ['Below expected', 'warn'];
  if (scale === 'gcse') return value >= 7 ? ['7–9 高分段', 'ok'] : value >= 5 ? ['Strong pass', 'ok'] : value >= 4 ? ['Standard pass', ''] : ['未达 4', 'warn'];
  if (scale === 'alevel') return [ALEVEL[value], value >= 4 ? 'ok' : value >= 2 ? '' : 'warn'];
  return ['', ''];
}

/* ---------- physical fitness ---------- */
const mmss = s => `${Math.floor(s / 60)}'${pad2(Math.round(s % 60))}"`;
const parseMMSS = t => { const m = String(t).trim().match(/^(\d+)\s*['′:分]\s*(\d{1,2})\s*["″秒]?$/); return m ? +m[1] * 60 + +m[2] : num(t); };
const FIT = {
  gb: {
    name: '国家学生体质健康标准（2014 修订）',
    items: {
      bmi: { name: '体重指数 BMI', unit: 'kg/m²', d: 1, auto: true },
      vc: { name: '肺活量', unit: 'mL', d: 0 },
      r50: { name: '50 米跑', unit: '秒', d: 1, low: true },
      sr: { name: '坐位体前屈', unit: 'cm', d: 1 },
      rope: { name: '1 分钟跳绳', unit: '次', d: 0 },
      situp: { name: '1 分钟仰卧起坐', unit: '次', d: 0 },
      shuttle: { name: '50 米×8 往返跑', unit: '分·秒', time: true, low: true },
      jump: { name: '立定跳远', unit: 'cm', d: 0 },
      pullup: { name: '引体向上', unit: '次', d: 0 },
      run: { name: '耐力跑', unit: '分·秒', time: true, low: true }
    },
    // 单项指标与权重（%）
    plan: (g, sex) => g <= 0 ? [] : g <= 2 ? [['bmi', 15], ['vc', 15], ['r50', 20], ['sr', 30], ['rope', 20]]
      : g <= 4 ? [['bmi', 15], ['vc', 15], ['r50', 20], ['sr', 20], ['rope', 20], ['situp', 10]]
        : g <= 6 ? [['bmi', 15], ['vc', 15], ['r50', 20], ['sr', 10], ['rope', 10], ['situp', 20], ['shuttle', 10]]
          : [['bmi', 15], ['vc', 15], ['r50', 20], ['sr', 10], ['jump', 10], [sex === 'M' ? 'pullup' : 'situp', 10], ['run', 20]]
  },
  fg: {
    name: 'FitnessGram（Cooper Institute）',
    items: {
      pacer: { name: 'PACER 渐进有氧跑', unit: '圈', d: 0 },
      mile: { name: '1 英里跑', unit: '分·秒', time: true },
      curl: { name: 'Curl-up 卷腹', unit: '次', d: 0 },
      push: { name: '90° Push-up 俯卧撑', unit: '次', d: 0 },
      trunk: { name: 'Trunk Lift 躯干抬起', unit: '英寸', d: 0 },
      sitreach: { name: 'Back-Saver 坐位体前屈', unit: '英寸', d: 1 },
      body: { name: 'Body Composition 身体成分', unit: 'BMI', d: 1 }
    },
    plan: () => ['pacer', 'mile', 'curl', 'push', 'trunk', 'sitreach', 'body'].map(k => [k, 0])
  },
  eurofit: {
    name: 'Eurofit · 欧洲常模（Tomkinson 2018）',
    items: {
      grip: { name: '握力', unit: 'kg', d: 1 },
      sbj: { name: '立定跳远', unit: 'cm', d: 0 },
      situp: { name: '30 秒仰卧起坐', unit: '次', d: 0 },
      bah: { name: '屈臂悬垂', unit: '秒', d: 1 },
      shuttle: { name: '10×5 米往返跑', unit: '秒', d: 1 },
      plate: { name: '敲板测试', unit: '秒', d: 1 },
      sr: { name: '坐位体前屈', unit: 'cm', d: 1 },
      flamingo: { name: '火烈鸟平衡', unit: '次失衡', d: 0 },
      srt: { name: '20 米往返跑', unit: '级', d: 1 }
    },
    plan: () => ['grip', 'sbj', 'situp', 'bah', 'shuttle', 'plate', 'sr', 'flamingo', 'srt'].map(k => [k, 0])
  }
};
const FG_ZONE = { HFZ: ['健康区 HFZ', 'ok'], NI: ['需改进 NI', 'warn'], NIHR: ['需改进·健康风险', 'bad'] };
const pctBand = p => p >= 80 ? ['很高', 'ok'] : p >= 60 ? ['较高', 'ok'] : p >= 40 ? ['中等', ''] : p >= 20 ? ['较低', 'warn'] : ['很低', 'bad'];
const gbGrade = t => t >= 90 ? ['优秀', 'ok'] : t >= 80 ? ['良好', 'ok'] : t >= 60 ? ['及格', ''] : ['不及格', 'bad'];
const gbItemName = (k, sex) => k === 'run' ? (sex === 'M' ? '1000 米跑' : '800 米跑') : FIT.gb.items[k].name;

// 单项得分：查官方评分表；高优指标取「成绩 ≥ 阈值」的最高档，低优指标取「成绩 ≤ 阈值」的最高档，低于 10 分档记 0
function gbItemScore(k, sex, g, raw) {
  if (raw == null) return null;
  if (k === 'bmi') {
    const row = REF.GB.bmi[sex][g - 1]; if (!row) return null;
    const b = Math.round(raw * 10) / 10;
    return b >= row[2] ? 60 : (b < row[0] || b > row[1]) ? 80 : 100;
  }
  const tab = REF.GB[k] && REF.GB[k][sex]; if (!tab) return null;
  const j = tab.g.indexOf(g); if (j < 0) return null;
  const low = FIT.gb.items[k].low;
  for (const r of tab.t) { const th = r[1 + j]; if (th == null) continue; if (low ? raw <= th : raw >= th) return r[0]; }
  return 0;
}
function gbBmiLabel(sex, g, bmi) {
  const row = REF.GB.bmi[sex][g - 1]; if (!row) return '';
  const b = Math.round(bmi * 10) / 10;
  return b >= row[2] ? '肥胖' : b < row[0] ? '低体重' : b > row[1] ? '超重' : '正常';
}
// 加分指标：小学 1 分钟跳绳（每多 2 次 +1，最多 20）；初高中 男引体向上、女仰卧起坐、耐力跑（各最多 10）
const BONUS_STEPS = { situpF: [2, 4, 6, 7, 8, 9, 10, 11, 12, 13], runM: [4, 8, 12, 16, 20, 23, 26, 29, 32, 35], runF: [5, 10, 15, 20, 25, 30, 35, 40, 45, 50] };
function gbBonus(k, sex, g, raw) {
  if (raw == null || !['rope', 'pullup', 'situp', 'run'].includes(k)) return 0;
  const tab = REF.GB[k][sex]; if (!tab) return 0;
  const j = tab.g.indexOf(g); if (j < 0) return 0;
  const top = tab.t[0][1 + j];
  const steps = (n, arr) => arr.filter(x => n >= x).length;
  if (k === 'rope' && g <= 6) return clamp(Math.floor((raw - top) / 2), 0, 20);
  if (k === 'pullup' && g >= 7) return clamp(Math.floor(raw - top), 0, 10);
  if (k === 'situp' && sex === 'F' && g >= 7) return steps(raw - top, BONUS_STEPS.situpF);
  if (k === 'run' && g >= 7) return steps(top - raw, sex === 'M' ? BONUS_STEPS.runM : BONUS_STEPS.runF);
  return 0;
}
// one test session → per-item scores, weighted standard score, bonus, total and grade (null total if items are missing)
function gbEvaluate(test, sex, g) {
  const plan = FIT.gb.plan(g, sex);
  let std = 0, bonus = 0, missing = 0;
  const rows = plan.map(([k, w]) => {
    const raw = num(test.items && test.items[k]);
    const sc = gbItemScore(k, sex, g, raw);
    if (sc == null) missing++;
    else { std += sc * w / 100; bonus += gbBonus(k, sex, g, raw); }
    return { k, w, raw, sc, bonus: sc == null ? 0 : gbBonus(k, sex, g, raw) };
  });
  bonus = Math.min(20, bonus);
  const ok = plan.length && !missing;
  return { rows, std: ok ? Math.round(std * 10) / 10 : null, bonus, total: ok ? Math.round((std + bonus) * 10) / 10 : null, missing };
}

/* ---------- growth: WHO Growth Reference 2007, 5–19 years ---------- */
function whoZ(kind, sex, months, x) {
  const t = REF.WHO[kind][sex], i = Math.round(months) - 61;
  if (i < 0 || i >= t[0].length || !(x > 0)) return null;
  const L = t[0][i], M = t[1][i], S = t[2][i];
  const at = z => M * Math.pow(1 + L * S * z, 1 / L);
  let z = Math.abs(L) < 1e-9 ? Math.log(x / M) / S : (Math.pow(x / M, L) - 1) / (L * S);
  if (kind === 'bmi' && z > 3) z = 3 + (x - at(3)) / (at(3) - at(2)); // WHO restricted LMS beyond ±3 SD
  if (kind === 'bmi' && z < -3) z = -3 + (x - at(-3)) / (at(-2) - at(-3));
  return z;
}
function whoAt(kind, sex, months, z) {
  const t = REF.WHO[kind][sex], i = Math.round(months) - 61;
  if (i < 0 || i >= t[0].length) return null;
  const L = t[0][i], M = t[1][i], S = t[2][i];
  return Math.abs(L) < 1e-9 ? M * Math.exp(S * z) : M * Math.pow(1 + L * S * z, 1 / L);
}
function phi(z) { // standard normal CDF (Abramowitz–Stegun 7.1.26)
  const t = 1 / (1 + 0.3275911 * Math.abs(z) / Math.SQRT2);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-z * z / 2);
  return z >= 0 ? (1 + y) / 2 : (1 - y) / 2;
}
const bmiZTag = z => z == null ? null : z > 2 ? ['肥胖', 'bad'] : z > 1 ? ['超重', 'warn'] : z < -3 ? ['重度消瘦', 'bad'] : z < -2 ? ['消瘦', 'warn'] : ['正常', 'ok'];
const hfaZTag = z => z == null ? null : z < -2 ? ['偏矮', 'warn'] : z > 2 ? ['偏高', ''] : ['正常', 'ok'];

/* ---------- vision: stored as decimal acuity (1.0 = 5.0 = 20/20 = 6/6) ---------- */
// Snellen lines step 0.1 logMAR: 6/6, 6/7.5, 6/9.5, 6/12 … and 20/20, 20/25, 20/32, 20/40 …
const snellenDen = (base, d) => { const k = Math.round(-Math.log10(d) * 10), v = base * Math.pow(10, k / 10); return v >= 100 ? Math.round(v / 10) * 10 : v >= 10 ? Math.round(v) : Math.round(v * 2) / 2; };
const VISION = {
  log5: { name: '5 分记录', fromInput: v => Math.pow(10, v - 5), show: d => nf(5 + Math.log10(d), 1), hint: '如 4.9', min: 3.5, max: 5.3, step: 0.1 },
  snellen20: { name: 'Snellen 20/x', fromInput: v => 20 / v, show: d => '20/' + snellenDen(20, d), hint: '填分母，如 25 表示 20/25', min: 10, max: 400, step: 1 },
  snellen6: { name: 'Snellen 6/x', fromInput: v => 6 / v, show: d => '6/' + snellenDen(6, d), hint: '填分母，如 9 表示 6/9', min: 3, max: 60, step: 0.1 }
};
const toInputVision = (sys, d) => sys === 'log5' ? +(5 + Math.log10(d)).toFixed(1) : sys === 'snellen20' ? Math.round(20 / d) : +(6 / d).toFixed(1);
// below normal: decimal < 1.0 from age 6 (国家卫健委近视筛查：6 岁以上裸眼视力 < 5.0 为视力低下), < 0.8 at age 5
const visionLow = (d, age) => d < (age != null && age < 6 ? 0.79 : 0.99);

/* ---------- lifestyle references ---------- */
// AASM 2016 pediatric consensus: 3–5 y 10–13 h, 6–12 y 9–12 h, 13–18 y 8–10 h
const sleepRange = age => age == null ? [9, 12] : age < 6 ? [10, 13] : age <= 12 ? [9, 12] : [8, 10];
const ACTIVE_MIN = 60; // WHO 2020: 5–17 y, average 60 min/day moderate-to-vigorous activity

/* ---------- mental health ---------- */
const MOOD = ['', '很低落', '有点低', '一般', '不错', '很好'];
const STRESS = ['', '很轻松', '轻松', '一般', '有压力', '压力很大'];
// WHO-5 Well-Being Index (WHO 1998), free to use; validated in children and adolescents from about age 9
const WHO5_Q = ['我感到快乐、心情舒畅', '我感到平静和放松', '我感到充满活力、精力充沛', '我醒来时感到神清气爽、休息充分', '我每天的生活充满了让我感兴趣的事情'];
const WHO5_A = ['从未有过', '偶尔', '不到一半时间', '超过一半时间', '大部分时间', '所有时间'];
const who5Band = s => s <= 28 ? ['建议专业评估', 'bad'] : s <= 50 ? ['需要关注', 'warn'] : ['良好', 'ok'];
// screening results are entered from school or clinic reports; SDQ and MHT items are copyrighted, only totals are stored
const SCREENS = {
  'PHQ-A': { name: 'PHQ-A 青少年抑郁筛查', max: 27, band: s => s >= 20 ? ['重度', 'bad'] : s >= 15 ? ['中重度', 'bad'] : s >= 10 ? ['中度', 'bad'] : s >= 5 ? ['轻度', 'warn'] : ['无或极轻', 'ok'], alert: s => s >= 10 },
  'GAD-7': { name: 'GAD-7 焦虑筛查', max: 21, band: s => s >= 15 ? ['重度', 'bad'] : s >= 10 ? ['中度', 'bad'] : s >= 5 ? ['轻度', 'warn'] : ['无或极轻', 'ok'], alert: s => s >= 10 },
  SDQ: {
    name: 'SDQ 困难总分', max: 40,
    // four-band categorisation, youthinmind SDQ scoring guide (4–17 y)
    cut: { parent: [13, 16, 19], teacher: [11, 15, 18], self: [14, 17, 19] },
    band(s, inf) { const c = this.cut[inf] || this.cut.self; return s > c[2] ? ['很高', 'bad'] : s > c[1] ? ['高', 'bad'] : s > c[0] ? ['略高', 'warn'] : ['接近平均', 'ok']; },
    alert(s, inf) { const c = this.cut[inf] || this.cut.self; return s > c[1]; }
  },
  MHT: { name: 'MHT 心理健康诊断测验（总焦虑倾向）', max: 100, band: s => s >= 65 ? ['需特别关注', 'bad'] : ['一般范围', 'ok'], alert: s => s >= 65 },
  other: { name: '其他量表', max: 1000, band: () => ['见报告', ''], alert: () => false }
};
const INFORMANT = { self: '学生自评', parent: '家长评', teacher: '老师评' };
