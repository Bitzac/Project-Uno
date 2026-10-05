// ---------- countries ----------
// Fixed order. Each country keeps its color and marker shape whatever is filtered (color follows the entity, never its rank).
const C = [
  { id: 'cn', name: '中国', en: 'China', shape: 'circle' },
  { id: 'us', name: '美国', en: 'United States', shape: 'square' },
  { id: 'nz', name: '新西兰', en: 'New Zealand', shape: 'triangle' },
  { id: 'de', name: '德国', en: 'Germany', shape: 'diamond' }
];

// ---------- sources ----------
const SRC = {
  wdi: ['世界银行 WDI', 'https://data.worldbank.org/'],
  who: ['WHO 全球卫生观察站', 'https://www.who.int/data/gho/data/indicators/indicator-details/GHO/uhc-index-of-service-coverage'],
  cov: ['美国人口普查局 · 国家医保局 · Destatis · 新西兰卫生部', 'https://www.census.gov/topics/health/health-insurance.html'],
  lpi: ['世界银行 LPI 2023', 'https://lpi.worldbank.org/international/global'],
  ookla: ['Ookla Speedtest Global Index', 'https://www.speedtest.net/global-index'],
  unodc: ['UNODC（经世界银行）', 'https://data.worldbank.org/indicator/VC.IHR.PSRC.P5'],
  gallup: ['Gallup Global Safety Report 2024', 'https://www.gallup.com/analytics/356963/gallup-global-law-and-order-report.aspx'],
  gii: ['WIPO 全球创新指数 2025', 'https://www.wipo.int/web/global-innovation-index/2025/index'],
  wef: ['WEF 全球社会流动性报告 2020', 'https://www.weforum.org/publications/global-social-mobility-index-2020-why-economies-benefit-from-fixing-inequality/'],
  hdr: ['UNDP 人类发展报告 2025', 'https://hdr.undp.org/data-center/documentation-and-downloads'],
  qs: ['QS 世界大学排名 2027', 'https://www.topuniversities.com/world-university-rankings'],
  pm: ['WashU ACAG SatPM（经 Our World in Data）', 'https://ourworldindata.org/grapher/pm25-air-pollution'],
  epi: ['耶鲁 EPI 2026', 'https://epi.yale.edu/2026/results/indicator/EPI'],
  numbeoC: ['Numbeo 生活成本 2026 年中', 'https://www.numbeo.com/cost-of-living/rankings_by_country.jsp'],
  numbeoP: ['Numbeo 房产指数 2026 年中', 'https://www.numbeo.com/property-investment/rankings_by_country.jsp'],
  wgi: ['世界银行 WGI 2025 版', 'https://www.worldbank.org/en/publication/worldwide-governance-indicators'],
  cpi: ['透明国际 CPI 2025', 'https://www.transparency.org/en/cpi/2025'],
  wjp: ['WJP 法治指数 2025', 'https://worldjusticeproject.org/rule-of-law-index/'],
  fh: ['自由之家 Freedom in the World 2026', 'https://freedomhouse.org/countries/freedom-world/scores'],
  whr: ['世界幸福报告 2026', 'https://worldhappiness.report/'],
  pwt: ['Penn World Table 11（经 Our World in Data）', 'https://ourworldindata.org/grapher/annual-working-hours-per-worker'],
  law: ['各国劳动法（见备注）', 'https://www.employment.govt.nz/leave-and-holidays/']
};

// ---------- dimensions & indicators ----------
// Each indicator is scored 0–100 against fixed goalposts w (worst) → b (best), linear or log, clamped.
// Goalposts sit near the global floor and frontier, so a score says where a country stands in the world, not only among these four.
// v: raw values in C order [cn, us, nz, de]; yr: data year (string, or array per country).
const D = [
  {
    id: 'health', name: '医疗', en: 'Health',
    q: '活得久吗？看得上病吗？看病花自己多少钱？',
    ind: [
      { id: 'le', name: '出生时预期寿命', unit: '岁', v: [78.02, 78.89, 82.01, 80.79], dp: 1, w: 55, b: 85, yr: '2024', src: 'wdi' },
      { id: 'uhc', name: 'UHC 基本医疗服务覆盖指数', unit: '0–100', v: [85, 88, 89, 87], dp: 0, w: 30, b: 90, yr: '2023', src: 'who', note: '14 项追踪指标（免疫、慢病、传染病、服务能力），不衡量费用和等待时间。' },
      { id: 'oop', name: '个人自付占医疗总支出', unit: '%', v: [32.17, 10.93, 12.6, 11.05], dp: 1, w: 70, b: 5, yr: '2023', src: 'wdi', note: '美国比例低，是因为保险费不算“自付”；美国人均医疗支出 1.35 万美元，是德国的 2 倍以上，这部分负担没有体现在本项里。' },
      { id: 'doc', name: '每千人医生数', unit: '人', v: [3.11, 3.68, 3.61, 4.53], dp: 2, w: 0.2, b: 5, yr: '2022', src: 'wdi', note: '中国 2022 年口径含执业助理医师，较 2021 年（2.52）跳升。' },
      { id: 'cov', name: '医疗保障人口覆盖率', unit: '%', v: [95, 92.0, 100, 99.9], dp: 1, w: 50, b: 100, yr: ['2024', '2024', '2025', '2019'], src: 'cov', note: '各国口径不同：中国为基本医保参保率（国家医保局称稳定在 95% 左右）；美国 2024 年 8.0% 无任何医保；新西兰公立体系覆盖全部合法居民；德国强制参保，未参保约 0.1%。' }
    ]
  },
  {
    id: 'infra', name: '基建', en: 'Infrastructure',
    q: '路、港、网好不好用？',
    ind: [
      { id: 'lpi', name: 'LPI 交通与贸易基础设施', unit: '1–5', v: [4.0, 3.9, 3.8, 4.3], dp: 1, w: 1.5, b: 4.5, yr: '2023', src: 'lpi', note: '物流从业者对港口、机场、公路、铁路和信息基础设施的评分。' },
      { id: 'fbb', name: '固定宽带下载中位速率', unit: 'Mbps', v: [206.91, 309.80, 201.91, 103.72], dp: 0, w: 10, b: 350, log: true, yr: '2026-03', src: 'ookla', note: '用户自测中位数，样本偏向城市。' },
      { id: 'mob', name: '移动网络下载中位速率', unit: 'Mbps', v: [156.98, 213.29, 122.18, 74.58], dp: 0, w: 5, b: 250, log: true, yr: '2026-03', src: 'ookla' }
    ]
  },
  {
    id: 'safety', name: '治安', en: 'Safety',
    q: '会不会被害？夜里走路安不安心？',
    ind: [
      { id: 'hom', name: '故意杀人率', unit: '每 10 万人', v: [0.50, 5.76, 1.46, 0.91], dp: 2, w: 30, b: 0.3, log: true, yr: ['2020', '2023', '2022', '2023'], src: 'unodc', note: '各国最新可得年份不同。中国为官方口径，最新只到 2020 年。' },
      { id: 'lo', name: 'Gallup 法律与秩序指数', unit: '0–100', v: [88, 81, 76, 86], dp: 0, w: 50, b: 100, yr: '2023', src: 'gallup', note: '由四题合成：夜间独行是否安全、是否信任本地警察、过去一年是否被盗、是否遭袭击或抢劫。中国样本为网络自填问卷，偏向城市在线人群。' }
    ]
  },
  {
    id: 'econ', name: '经济', en: 'Economy',
    q: '有多富？还在变富吗？好找工作吗？',
    ind: [
      { id: 'gdp', name: '人均 GDP（购买力平价）', unit: '国际元', v: [29333, 90027, 57350, 75407], dp: 0, w: 2000, b: 100000, log: true, yr: '2025', src: 'wdi' },
      { id: 'gro', name: '人均实际 GDP 年均增速', unit: '%', v: [cagr(10356.29, 13793.21), cagr(61047.96, 67945.61), cagr(40615.73, 41336.02), cagr(44235.27, 44146.64)], dp: 1, sign: true, w: -2, b: 6, yr: '2019→2025', src: 'wdi', note: '按世界银行 2015 年不变价人均 GDP 计算 6 年复合增速，覆盖疫情冲击与反弹；2025 年为估计值。' },
      { id: 'une', name: '失业率', unit: '%', v: [4.62, 4.20, 5.08, 3.71], dp: 1, w: 20, b: 2, yr: '2025', src: 'wdi', note: '国际劳工组织模型估计，口径统一；与各国官方公布值略有差异。' }
    ]
  },
  {
    id: 'opp', name: '机会', en: 'Opportunity',
    q: '有没有好行业？出身会不会决定命运？年轻人能不能上车？',
    ind: [
      { id: 'gii', name: '全球创新指数', unit: '0–100', v: [56.6, 61.7, 45.5, 55.5], dp: 1, w: 15, b: 70, yr: '2025', src: 'gii', note: '排名：美国第 3、中国第 10、德国第 11、新西兰第 26（共 139 个经济体）。衡量国家创新体系，不等于个人机会。' },
      { id: 'smi', name: '社会流动性指数', unit: '0–100', v: [61.5, 70.4, 74.3, 78.8], dp: 1, w: 30, b: 90, yr: '2020', src: 'wef', note: '迄今唯一一版（2020），之后未更新；涵盖教育、就业、薪酬公平、社会保障等 10 个支柱。' },
      { id: 'yun', name: '青年失业率（15–24 岁）', unit: '%', v: [15.79, 9.34, 14.36, 6.86], dp: 1, w: 40, b: 3, yr: '2025', src: 'wdi', note: '国际劳工组织模型估计。中国国家统计局口径（16–24 岁，不含在校生）更高，2025 年 8 月为 18.9%。' }
    ]
  },
  {
    id: 'edu', name: '教育', en: 'Education',
    q: '能读多少年书？有没有世界一流大学？',
    ind: [
      { id: 'eys', name: '预期受教育年限', unit: '年', v: [15.48, 15.92, 19.30, 17.31], dp: 1, w: 8, b: 20, yr: '2023', src: 'hdr', note: '新西兰偏高，部分来自成年人回校读书（非全日制高等教育）。' },
      { id: 'mys', name: '平均受教育年限（25 岁以上）', unit: '年', v: [8.04, 13.91, 12.88, 14.30], dp: 1, w: 3, b: 15, yr: '2023', src: 'hdr', note: '存量指标，反映所有成年人；中国年轻一代明显高于这个平均值。' },
      { id: 'uni', name: '本国最高排名大学（QS）', unit: '名', v: [13, 1, 67, 25], dp: 0, w: 500, b: 1, log: true, yr: '2027', src: 'qs', note: '北京大学 13、MIT 1、奥克兰大学 67、慕尼黑工业大学 25。只看天花板不看数量：QS 2027 美国 184 所上榜，中国大陆 85 所。没有纳入学业测评，因为中国大陆没有全国代表性的 PISA 数据。' }
    ]
  },
  {
    id: 'env', name: '环境', en: 'Environment',
    q: '空气干不干净？生态有没有被照顾好？',
    ind: [
      { id: 'pm', name: 'PM2.5 人口加权年均浓度', unit: 'µg/m³', v: [31.3, 7.5, 7.0, 9.1], dp: 1, w: 60, b: 5, yr: '2024', src: 'pm', note: '卫星反演数据。WHO 年均指导值为 5 µg/m³，四国都未达到。' },
      { id: 'epi', name: '环境绩效指数 EPI', unit: '0–100', v: [33.88, 58.54, 55.45, 69.93], dp: 1, w: 20, b: 80, yr: '2026', src: 'epi', note: '排名：德国第 6、美国第 27、新西兰第 32、中国第 129（共 177 国）。含气候和生物多样性指标，和个人宜居感不完全一致。' }
    ]
  },
  {
    id: 'cost', name: '可负担', en: 'Affordability',
    q: '工资够不够花？房子买不买得起？',
    ind: [
      { id: 'lpp', name: '本地购买力指数', unit: '纽约 = 100', v: [94.2, 144.5, 119.4, 130.0], dp: 1, w: 20, b: 150, yr: '2026 年中', src: 'numbeoC', note: '用当地平均净工资能买到的商品服务量，众包数据，样本偏向大城市。' },
      { id: 'pti', name: '房价收入比', unit: '年', v: [17.4, 3.4, 7.9, 7.8], dp: 1, w: 40, b: 3, log: true, yr: '2026 年中', src: 'numbeoP', note: '一套 90 m² 公寓价格相当于家庭多少年可支配收入。中国一、二线城市样本拉高了均值。' }
    ]
  },
  {
    id: 'gov', name: '治理与自由', en: 'Governance',
    q: '政府办事行不行？清不清廉？法治和言论自由如何？',
    ind: [
      { id: 'ge', name: '政府效能', unit: '0–100', v: [66.8, 79.0, 90.1, 83.2], dp: 1, w: 0, b: 100, yr: '2024', src: 'wgi', note: '公共服务质量、政策制定与执行能力。2025 版起使用 0–100 量表。' },
      { id: 'cpi', name: '清廉指数 CPI', unit: '0–100', v: [43, 64, 81, 77], dp: 0, w: 10, b: 90, yr: '2025', src: 'cpi', note: '专家与企业高管对公共部门腐败的感知，不是实际案件数。' },
      { id: 'wjp', name: 'WJP 法治指数', unit: '0–1', v: [0.48, 0.68, 0.83, 0.83], dp: 2, w: 0.3, b: 0.9, yr: '2025', src: 'wjp', note: '8 个因子：政府权力约束、无腐败、开放政府、基本权利、秩序与安全、监管执行、民事司法、刑事司法。' },
      { id: 'fh', name: '政治权利与公民自由', unit: '0–100', v: [9, 81, 99, 95], dp: 0, w: 0, b: 100, yr: '2026', src: 'fh', note: '政治权利 40 分 + 公民自由 60 分。评估方是美国非营利机构，常被批评带有西方立场；美国 2025 年一年下降 3 分。' }
    ]
  },
  {
    id: 'life', name: '工作与幸福', en: 'Work–life',
    q: '工作多累？有多少假？自己觉得过得好吗？',
    ind: [
      { id: 'whr', name: '生活评价（坎特里尔阶梯）', unit: '0–10', v: [6.074, 6.816, 6.995, 6.882], dp: 2, w: 2.5, b: 7.8, yr: '2023–25', src: 'whr', note: '排名：新西兰第 11、德国第 17、美国第 23、中国第 65。受访者自评人生在 0–10 阶梯上的位置。' },
      { id: 'hrs', name: '年均工作时长', unit: '小时/就业者', v: [2328, 1789, 1708, 1335], dp: 0, w: 2400, b: 1300, yr: '2023', src: 'pwt', note: '中国为 PWT 推算值；可对照国家统计局企业就业人员周均工作时间，2024 年约 49 小时。' },
      { id: 'pto', name: '法定带薪年假 + 公共假日', unit: '天', v: [18, 0, 32, 29], dp: 0, w: 0, b: 36, yr: '2025', src: 'law', note: '只算法律下限。中国：工龄 1–10 年年假 5 天 + 法定节假日 13 天（2025 年起）。美国：联邦法律不强制任何带薪假，私营部门平均约 11 天年假。新西兰：4 周年假 + 12 天公共假日。德国：五天工作制下 20 天 + 全国统一 9 天，各州另加 1–4 天。' }
    ]
  }
];

function cagr(a, b) { return (Math.pow(b / a, 1 / 6) - 1) * 100; }

// ---------- ideal life ----------
// Importance: 0 不在乎 · 1 一般 · 2 重要 · 3 必须. Target: the dimension score (0–100) you would be satisfied with.
const IMP = ['不在乎', '一般', '重要', '必须'];

const PRESETS = [
  { id: 'balanced', name: '均衡', desc: '十个维度一样重要，都希望到 75 分', set: Object.fromEntries(D.map(d => [d.id, [1, 75]])) },
  { id: 'career', name: '事业冲刺', desc: '收入、机会、效率优先，能忍受累',
    set: { health: [1, 70], infra: [2, 80], safety: [1, 70], econ: [3, 85], opp: [3, 85], edu: [1, 65], env: [0, 50], cost: [1, 60], gov: [1, 65], life: [0, 40] } },
  { id: 'family', name: '成家育儿', desc: '安全、教育、医疗是底线',
    set: { health: [3, 85], infra: [1, 70], safety: [3, 85], econ: [2, 70], opp: [1, 65], edu: [3, 85], env: [2, 80], cost: [2, 70], gov: [1, 70], life: [2, 70] } },
  { id: 'slow', name: '慢生活', desc: '假期、空气、松弛感，钱够用就行',
    set: { health: [2, 80], infra: [1, 60], safety: [2, 75], econ: [1, 55], opp: [0, 50], edu: [0, 50], env: [3, 85], cost: [2, 70], gov: [2, 80], life: [3, 85] } },
  { id: 'retire', name: '退休养老', desc: '看病方便、环境好、安全、钱经花',
    set: { health: [3, 90], infra: [1, 65], safety: [3, 85], econ: [0, 50], opp: [0, 40], edu: [0, 40], env: [3, 85], cost: [2, 75], gov: [2, 75], life: [1, 70] } }
];

// Questionnaire: each option sets [importance, target] for some dimensions. Later answers win when they touch the same dimension with higher importance.
const QS = [
  { id: 'stage', q: '你现在处在哪个人生阶段？', opts: [
    { t: '读书或刚工作', set: { opp: [3, 80], edu: [2, 75], econ: [2, 70] } },
    { t: '事业上升期', set: { opp: [3, 85], econ: [3, 80], infra: [2, 80] } },
    { t: '成家育儿', set: { edu: [3, 85], safety: [3, 85], health: [2, 85] } },
    { t: '退休或半退休', set: { health: [3, 90], opp: [0, 40], edu: [0, 40], env: [2, 80] } }
  ] },
  { id: 'pace', q: '你能接受的工作强度？', opts: [
    { t: '拼一点没关系，回报要高', set: { life: [0, 40], econ: [3, 80] } },
    { t: '平衡，不加班到深夜', set: { life: [2, 70] } },
    { t: '慢下来，假期比钱重要', set: { life: [3, 85], econ: [1, 55] } }
  ] },
  { id: 'money', q: '关于钱，你更在意哪一个？', opts: [
    { t: '收入天花板', set: { econ: [3, 85], cost: [1, 60] } },
    { t: '买得起房、生活不紧巴', set: { cost: [3, 80] } },
    { t: '两个都要', set: { econ: [2, 75], cost: [2, 75] } }
  ] },
  { id: 'order', q: '社会环境里，你最不能妥协的是？', opts: [
    { t: '夜里一个人走路也安心', set: { safety: [3, 85], gov: [1, 60] } },
    { t: '法治、透明、说话自由', set: { gov: [3, 85], safety: [2, 70] } },
    { t: '两个都不能妥协', set: { safety: [3, 80], gov: [3, 80] } }
  ] },
  { id: 'nature', q: '空气和自然对你来说是？', opts: [
    { t: '刚需，每天都要呼吸', set: { env: [3, 85] } },
    { t: '有更好，没有也能过', set: { env: [1, 65] } }
  ] },
  { id: 'conv', q: '网速、交通、物流这些便利？', opts: [
    { t: '要快，慢了就难受', set: { infra: [3, 85] } },
    { t: '够用就行', set: { infra: [1, 65] } }
  ] }
];

const DEFAULT_IDEAL = { preset: 'family', imp: Object.fromEntries(D.map(d => [d.id, PRESETS[2].set[d.id][0]])), tgt: Object.fromEntries(D.map(d => [d.id, PRESETS[2].set[d.id][1]])) };
