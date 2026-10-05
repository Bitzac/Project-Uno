// ---------- countries ----------
// Display order groups countries by region. Only up to four are drawn on a radar at once; each compared country keeps its slot color while it stays selected.
const C = [
  { id: 'cn', name: '中国', en: 'China', region: '东亚', why: '基准' },
  { id: 'hk', name: '中国香港', en: 'Hong Kong', region: '东亚', why: '内地人才计划的热门去处，普通法体系，低税率' },
  { id: 'jp', name: '日本', en: 'Japan', region: '东亚', why: '东亚近邻，长寿、治安好，留学与工作热门' },
  { id: 'kr', name: '韩国', en: 'South Korea', region: '东亚', why: '发展路径与中国最像：高强度工作、高房价、低生育' },
  { id: 'sg', name: '新加坡', en: 'Singapore', region: '东南亚', why: '华人占多数，常见的移居与资产配置目的地' },
  { id: 'my', name: '马来西亚', en: 'Malaysia', region: '东南亚', why: '华人社区大、生活成本低，有长期居留计划' },
  { id: 'th', name: '泰国', en: 'Thailand', region: '东南亚', why: '养老与远程工作热门，生活成本低' },
  { id: 'vn', name: '越南', en: 'Vietnam', region: '东南亚', why: '承接制造业转移，增长快、成本低' },
  { id: 'au', name: '澳大利亚', en: 'Australia', region: '大洋洲', why: '传统移民国家，留学热门' },
  { id: 'nz', name: '新西兰', en: 'New Zealand', region: '大洋洲', why: '第一版对比国' },
  { id: 'us', name: '美国', en: 'United States', region: '北美', why: '第一版对比国' },
  { id: 'ca', name: '加拿大', en: 'Canada', region: '北美', why: '传统移民国家，技术移民体系成熟' },
  { id: 'gb', name: '英国', en: 'United Kingdom', region: '西欧', why: '留学热门，顶尖大学集中' },
  { id: 'ie', name: '爱尔兰', en: 'Ireland', region: '西欧', why: '英语国家，众多科技公司的欧洲总部所在地' },
  { id: 'fr', name: '法国', en: 'France', region: '西欧', why: '欧洲大国参照，公共服务覆盖广、假期长' },
  { id: 'de', name: '德国', en: 'Germany', region: '西欧', why: '第一版对比国' },
  { id: 'nl', name: '荷兰', en: 'Netherlands', region: '西欧', why: '工作时间短、英语普及，生活平衡的标杆' },
  { id: 'ch', name: '瑞士', en: 'Switzerland', region: '西欧', why: '收入、创新与治理的天花板参照' },
  { id: 'dk', name: '丹麦', en: 'Denmark', region: '北欧', why: '北欧福利国家代表，清廉与幸福度长期前列' },
  { id: 'fi', name: '芬兰', en: 'Finland', region: '北欧', why: '世界幸福报告连续 9 年第一' },
  { id: 'no', name: '挪威', en: 'Norway', region: '北欧', why: '主权财富基金支撑的高福利国家' },
  { id: 'se', name: '瑞典', en: 'Sweden', region: '北欧', why: '创新指数全球第 2，北欧创新标杆' },
  { id: 'es', name: '西班牙', en: 'Spain', region: '南欧', why: '南欧气候与生活节奏，长寿' },
  { id: 'pt', name: '葡萄牙', en: 'Portugal', region: '南欧', why: '西欧生活成本较低的国家之一，气候温和' },
  { id: 'it', name: '意大利', en: 'Italy', region: '南欧', why: '南欧大国参照，长寿与生活方式' },
  { id: 'ae', name: '阿联酋', en: 'UAE', region: '中东', why: '无个人所得税，近年中国企业出海的热门落脚点' }
];
const REGIONS = [...new Set(C.map(c => c.region))];

// ---------- sources ----------
const SRC = {
  wdi: ['世界银行 WDI', 'https://data.worldbank.org/'],
  who: ['WHO 全球卫生观察站', 'https://www.who.int/data/gho/data/indicators/indicator-details/GHO/uhc-index-of-service-coverage'],
  cov: ['各国统计与卫生部门（见备注）', 'https://www.census.gov/topics/health/health-insurance.html'],
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
  law: ['各国劳动法（汇总见维基百科）', 'https://en.wikipedia.org/wiki/List_of_minimum_annual_leave_by_country']
};

// ---------- dimensions & indicators ----------
// Each indicator is scored 0–100 against fixed goalposts w (worst) → b (best), linear or log, clamped.
// Goalposts sit near the global floor and frontier, so a score says where a country stands in the world, not only among the countries here.
// v: raw value per country (null = no data; the dimension then averages the indicators it has). yr: data year, yx: per-country exceptions.
const D = [
  {
    id: 'health', name: '医疗', en: 'Health',
    q: '活得久吗？看得上病吗？看病花自己多少钱？',
    ind: [
      { id: 'le', name: '出生时预期寿命', unit: '岁', v: { cn: 78.02, hk: 85.39, jp: 84.04, kr: 83.63, sg: 83.35, my: 76.82, th: 76.56, vn: 74.74, au: 83.05, nz: 82.01, us: 78.89, ca: 82.11, gb: 81.39, ie: 83.01, fr: 82.98, de: 80.79, nl: 81.97, ch: 84.41, dk: 82.25, fi: 82.34, no: 83.16, se: 84.06, es: 83.89, pt: 82.38, it: 83.95, ae: 83.07 }, dp: 1, w: 55, b: 85, yr: '2024', src: 'wdi', note: '阿联酋人口近九成是外籍劳工，年老或患病后多离境，预期寿命被拉高。' },
      { id: 'uhc', name: 'UHC 基本医疗服务覆盖指数', unit: '0–100', v: { cn: 85, hk: null, jp: 86, kr: 88, sg: 88, my: 80, th: 82, vn: 71, au: 89, nz: 89, us: 88, ca: 92, gb: 88, ie: 82, fr: 82, de: 87, nl: 85, ch: 87, dk: 85, fi: 86, no: 89, se: 85, es: 84, pt: 83, it: 82, ae: 84 }, dp: 0, w: 30, b: 90, yr: '2023', src: 'who', note: '14 项追踪指标（免疫、慢病、传染病、服务能力），不衡量费用和等待时间。WHO 不单独统计中国香港。' },
      { id: 'oop', name: '个人自付占医疗总支出', unit: '%', v: { cn: 32.17, hk: null, jp: 12.24, kr: 31.75, sg: 25.42, my: 37.09, th: 9.93, vn: 39.2, au: 15.85, nz: 12.6, us: 10.93, ca: 15.2, gb: 14.63, ie: 11.3, fr: 9.26, de: 11.05, nl: 12.03, ch: 22.03, dk: 13.98, fi: 14.09, no: 13.69, se: 12.96, es: 20.86, pt: 29.31, it: 23.65, ae: 9.67 }, dp: 1, w: 70, b: 5, yr: '2023', src: 'wdi', note: '美国比例低，是因为保险费不算“自付”；美国人均医疗支出 1.35 万美元，是德国的 2 倍，这部分负担没有体现在本项里。中国香港最新可得为 2015/16 年度（35%），过旧未采用。' },
      { id: 'doc', name: '每千人医生数', unit: '人', v: { cn: 3.11, hk: 2.2, jp: 2.65, kr: 2.61, sg: 2.83, my: 2.34, th: 0.54, vn: 1.11, au: 4.09, nz: 3.61, us: 3.68, ca: 2.82, gb: 3.3, ie: 3.88, fr: 3.28, de: 4.53, nl: 3.88, ch: 4.48, dk: 4.5, fi: 3.61, no: 4.97, se: 4.41, es: 4.29, pt: 5.85, it: 4.19, ae: 2.99 }, dp: 2, w: 0.2, b: 5, yr: '2022', yx: { hk: '2024', my: '2023', ca: '2023', gb: '2023', ae: '2023', no: '2023', ie: '2023', dk: '2021', fi: '2021', se: '2021', th: '2021', vn: '2021' }, src: 'wdi', note: '中国 2022 年口径含执业助理医师，较 2021 年（2.52）跳升。葡萄牙统计的是所有持证医生（含不执业者），偏高。中国香港为香港医务卫生局数据。' },
      { id: 'cov', name: '医疗保障人口覆盖率', unit: '%', v: { cn: 95, hk: 100, jp: 100, kr: 100, sg: 100, my: 100, th: 99.6, vn: 94, au: 100, nz: 100, us: 92.0, ca: 100, gb: 100, ie: 100, fr: 100, de: 99.9, nl: 99.9, ch: 100, dk: 100, fi: 100, no: 100, se: 100, es: 100, pt: 100, it: 100, ae: null }, dp: 1, w: 50, b: 100, yr: '2024', yx: { de: '2019', th: '2023' }, src: 'cov', note: '实行全民医保或全民公立医疗的国家按 100% 计。中国为基本医保参保率（国家医保局称稳定在 95% 左右）；美国 2024 年 8.0% 无任何医保；德国、荷兰强制参保，未参保约 0.1%；马来西亚、中国香港为公立医院对全体居民开放；泰国三项公费计划覆盖 99.6%；越南社会医保覆盖 94%；阿联酋 2025 年起全国强制雇主投保，但没有可靠的覆盖率统计，记为缺失。' }
    ]
  },
  {
    id: 'infra', name: '基建', en: 'Infrastructure',
    q: '路、港、网好不好用？',
    ind: [
      { id: 'lpi', name: 'LPI 交通与贸易基础设施', unit: '1–5', v: { cn: 4.0, hk: 4.0, jp: 4.2, kr: 4.1, sg: 4.6, my: 3.6, th: 3.7, vn: 3.2, au: 4.1, nz: 3.8, us: 3.9, ca: 4.3, gb: 3.7, ie: 3.5, fr: 3.8, de: 4.3, nl: 4.2, ch: 4.4, dk: 4.1, fi: 4.2, no: 3.9, se: 4.2, es: 3.8, pt: 3.6, it: 3.8, ae: 4.1 }, dp: 1, w: 1.5, b: 4.5, yr: '2023', src: 'lpi', note: '物流从业者对港口、机场、公路、铁路和信息基础设施的评分。' },
      { id: 'fbb', name: '固定宽带下载中位速率', unit: 'Mbps', v: { cn: 206.91, hk: 352.4, jp: 255.27, kr: 257.76, sg: 425.46, my: 168.07, th: 279.65, vn: 281.72, au: 154.09, nz: 201.91, us: 309.8, ca: 277.7, gb: 172.24, ie: 220.71, fr: 352.35, de: 103.72, nl: 237.66, ch: 292.56, dk: 291.6, fi: 180.47, no: 177.11, se: 213.29, es: 277.98, pt: 243.84, it: 117.11, ae: 384.51 }, dp: 0, w: 10, b: 350, log: true, yr: '2026-03', src: 'ookla', note: '用户自测中位数，样本偏向城市。' },
      { id: 'mob', name: '移动网络下载中位速率', unit: 'Mbps', v: { cn: 156.98, hk: 89.43, jp: 70.28, kr: 265.2, sg: 197.89, my: 153.2, th: 137.98, vn: 200.54, au: 116.84, nz: 122.18, us: 213.29, ca: 110.92, gb: 75.91, ie: 79.12, fr: 152.5, de: 74.58, nl: 178.0, ch: 124.08, dk: 192.16, fi: 164.0, no: 167.28, se: 161.7, es: 92.32, pt: 137.64, it: 92.81, ae: 644.66 }, dp: 0, w: 5, b: 250, log: true, yr: '2026-03', src: 'ookla' }
    ]
  },
  {
    id: 'safety', name: '治安', en: 'Safety',
    q: '会不会被害？夜里走路安不安心？',
    ind: [
      { id: 'hom', name: '故意杀人率', unit: '每 10 万人', v: { cn: 0.5, hk: 0.38, jp: 0.23, kr: 0.48, sg: 0.07, my: 0.73, th: 4.44, vn: 1.91, au: 0.85, nz: 1.46, us: 5.76, ca: 1.98, gb: 1.12, ie: 0.65, fr: 1.34, de: 0.91, nl: 0.69, ch: 0.6, dk: 0.84, fi: 0.98, no: 0.72, se: 1.15, es: 0.69, pt: 0.72, it: 0.57, ae: 0.69 }, dp: 2, w: 30, b: 0.3, log: true, yr: '2023', yx: { cn: '2020', nz: '2022', gb: '2021', ae: '2022', pt: '2022', th: '2021', vn: '2021' }, src: 'unodc', note: '各国最新可得年份不同，中国为官方口径，最新只到 2020 年。泰国、越南 UNODC 只有 2011 年数据，改用 WHO 2021 年估计值。低于 0.3 时个人风险差异已可忽略，统一记 100 分。' },
      { id: 'lo', name: 'Gallup 法律与秩序指数', unit: '0–100', v: { cn: 88, hk: 86, jp: 86, kr: 85, sg: 95, my: 87, th: 79, vn: 90, au: 81, nz: 76, us: 81, ca: 83, gb: 82, ie: 86, fr: 84, de: 86, nl: 88, ch: 91, dk: 90, fi: 91, no: 93, se: 88, es: 87, pt: 89, it: 81, ae: 90 }, dp: 0, w: 50, b: 100, yr: '2023', src: 'gallup', note: '由四题合成：夜间独行是否安全、是否信任本地警察、过去一年是否被盗、是否遭袭击或抢劫。中国样本为网络自填问卷，偏向城市在线人群。' }
    ]
  },
  {
    id: 'econ', name: '经济', en: 'Economy',
    q: '有多富？还在变富吗？好找工作吗？',
    ind: [
      { id: 'gdp', name: '人均 GDP（购买力平价）', unit: '国际元', v: { cn: 29333, hk: 80423, jp: 55422, kr: 63125, sg: 163354, my: 41498, th: 26250, vn: 18088, au: 71934, nz: 57350, us: 90027, ca: 66746, gb: 64607, ie: 155089, fr: 63975, de: 75407, nl: 87320, ch: 102513, dk: 83218, fi: 65884, no: 104044, se: 72529, es: 59868, pt: 53146, it: 62803, ae: 79344 }, dp: 0, w: 2000, b: 100000, log: true, yr: '2025', yx: { ae: '2024' }, src: 'wdi', note: '新加坡、爱尔兰、瑞士、挪威超过 10 万国际元，记 100 分。爱尔兰和新加坡的 GDP 含大量跨国公司账面利润，远高于居民实际收入（爱尔兰统计局另用修正国民总收入 GNI* 衡量）。' },
      { id: 'gro', name: '人均实际 GDP 年均增速', unit: '%', v: { cn: cagr(10356.29, 13793.21, 6), hk: cagr(44195.27, 46450.19, 6), jp: cagr(36837.26, 38619.34, 6), kr: cagr(33496.31, 37469.66, 6), sg: cagr(61106.31, 70683.68, 6), my: cagr(10902.98, 12352.37, 6), th: cagr(6434.54, 6782.75, 6), vn: cagr(3241.08, 4308.21, 6), au: cagr(59181.3, 61368.61, 6), nz: cagr(40615.73, 41336.02, 6), us: cagr(61047.96, 67945.61, 6), ca: cagr(45100.34, 45418.13, 6), gb: cagr(47866.91, 48422.07, 6), ie: cagr(76485.64, 104416.83, 6), fr: cagr(38705.21, 39918.89, 6), de: cagr(44235.27, 44146.64, 6), nl: cagr(49254.02, 51817.06, 6), ch: cagr(88932.41, 93327.59, 6), dk: cagr(57114.62, 62217.61, 6), fi: cagr(45898.57, 44941.23, 6), no: cagr(79937.51, 83812.76, 6), se: cagr(53024.41, 55014.38, 6), es: cagr(28301.44, 29762.9, 6), pt: cagr(21569.19, 22851.12, 6), it: cagr(32180.43, 34716.14, 6), ae: cagr(43468.45, 41605.41, 5) }, dp: 1, sign: true, w: -2, b: 6, yr: '2019→2025', yx: { ae: '2019→2024' }, src: 'wdi', note: '按世界银行 2015 年不变价人均 GDP 计算复合增速，覆盖疫情冲击与反弹；2025 年为估计值。阿联酋人口快速增长，人均值下降；爱尔兰的高增速同样主要来自跨国公司账面利润。' },
      { id: 'une', name: '失业率', unit: '%', v: { cn: 4.62, hk: 2.8, jp: 2.45, kr: 2.68, sg: 2.82, my: 3.76, th: 0.78, vn: 1.52, au: 4.09, nz: 5.08, us: 4.2, ca: 6.91, gb: 4.75, ie: 4.63, fr: 7.54, de: 3.71, nl: 3.87, ch: 4.87, dk: 5.53, fi: 9.46, no: 4.64, se: 8.69, es: 10.38, pt: 6.16, it: 6.39, ae: 2.17 }, dp: 1, w: 20, b: 2, yr: '2025', src: 'wdi', note: '国际劳工组织模型估计，口径统一；与各国官方公布值略有差异。泰国、越南非正规就业比例高，失业率低不代表就业质量高。' }
    ]
  },
  {
    id: 'opp', name: '机会', en: 'Opportunity',
    q: '有没有好行业？出身会不会决定命运？年轻人能不能上车？',
    ind: [
      { id: 'gii', name: '全球创新指数', unit: '0–100', v: { cn: 56.6, hk: 51.5, jp: 53.6, kr: 60.0, sg: 59.9, my: 40.6, th: 36.7, vn: 37.1, au: 48.0, nz: 45.5, us: 61.7, ca: 51.1, gb: 59.1, ie: 50.4, fr: 53.4, de: 55.5, nl: 57.0, ch: 66.0, dk: 56.9, fi: 57.7, no: 49.2, se: 62.6, es: 44.6, pt: 43.9, it: 44.9, ae: 44.2 }, dp: 1, w: 15, b: 70, yr: '2025', src: 'gii', note: '衡量国家创新体系，不等于个人机会。' },
      { id: 'smi', name: '社会流动性指数', unit: '0–100', v: { cn: 61.5, hk: null, jp: 76.1, kr: 71.4, sg: 74.6, my: 62.0, th: 55.4, vn: 57.8, au: 75.1, nz: 74.3, us: 70.4, ca: 76.1, gb: 74.4, ie: 75.0, fr: 76.7, de: 78.8, nl: 82.4, ch: 82.1, dk: 85.2, fi: 83.6, no: 83.6, se: 83.5, es: 70.0, pt: 72.0, it: 67.4, ae: null }, dp: 1, w: 30, b: 90, yr: '2020', src: 'wef', note: '迄今唯一一版（2020），之后未更新；阿联酋、中国香港未被纳入。涵盖教育、就业、薪酬公平、社会保障等 10 个支柱。' },
      { id: 'yun', name: '青年失业率（15–24 岁）', unit: '%', v: { cn: 15.79, hk: 8.96, jp: 3.9, kr: 6.7, sg: 6.78, my: 11.95, th: 4.53, vn: 6.17, au: 9.61, nz: 14.36, us: 9.34, ca: 13.8, gb: 14.65, ie: 10.49, fr: 18.89, de: 6.86, nl: 8.83, ch: 9.04, dk: 11.74, fi: 21.48, no: 13.42, se: 24.31, es: 24.75, pt: 20.22, it: 20.55, ae: 6.45 }, dp: 1, w: 40, b: 3, yr: '2025', src: 'wdi', note: '国际劳工组织模型估计。中国国家统计局口径（16–24 岁，不含在校生）更高，2025 年 8 月为 18.9%。北欧和南欧的数字里有不少边读书边找兼职的学生。' }
    ]
  },
  {
    id: 'edu', name: '教育', en: 'Education',
    q: '能读多少年书？有没有世界一流大学？',
    ind: [
      { id: 'eys', name: '预期受教育年限', unit: '年', v: { cn: 15.48, hk: 16.9, jp: 15.51, kr: 16.62, sg: 16.74, my: 12.68, th: 15.36, vn: 15.46, au: 20.65, nz: 19.3, us: 15.92, ca: 15.89, gb: 17.81, ie: 19.18, fr: 16.1, de: 17.31, nl: 18.58, ch: 16.67, dk: 18.7, fi: 19.49, no: 18.79, se: 18.99, es: 17.83, pt: 17.49, it: 16.71, ae: 15.6 }, dp: 1, w: 8, b: 20, yr: '2023', src: 'hdr', note: '澳大利亚、新西兰偏高，部分来自成年人回校读书和大量国际学生。' },
      { id: 'mys', name: '平均受教育年限（25 岁以上）', unit: '年', v: { cn: 8.04, hk: 12.35, jp: 12.68, kr: 12.72, sg: 11.99, my: 11.09, th: 9.04, vn: 8.98, au: 12.87, nz: 12.88, us: 13.91, ca: 13.87, gb: 13.49, ie: 11.72, fr: 11.77, de: 14.3, nl: 12.67, ch: 13.95, dk: 13.03, fi: 12.98, no: 13.12, se: 12.74, es: 10.76, pt: 9.7, it: 10.83, ae: 12.99 }, dp: 1, w: 3, b: 15, yr: '2023', src: 'hdr', note: '存量指标，反映所有成年人；中国年轻一代明显高于这个平均值。' },
      { id: 'uni', name: '本国最高排名大学（QS）', unit: '名', v: { cn: 13, hk: 11, jp: 39, kr: 38, sg: 10, my: 56, th: 212, vn: 504, au: 19, nz: 67, us: 1, ca: 30, gb: 2, ie: 75, fr: 34, de: 25, nl: 48, ch: 8, dk: 90, fi: 123, no: 128, se: 71, es: 165, pt: 237, it: 87, ae: 147 }, dp: 0, w: 500, b: 1, log: true, yr: '2027', src: 'qs', note: 'MIT 1、帝国理工 2、苏黎世联邦理工 8、新加坡国立 10、香港大学 11、北大 13、新南威尔士 19、慕尼黑工大 25、麦吉尔 30、巴黎文理 34、首尔大学 38、东京大学 39、代尔夫特理工 48、马来亚大学 56、奥克兰大学 67、隆德大学 71、圣三一学院 75、米兰理工 87、哥本哈根大学 90、赫尔辛基大学 123、奥斯陆大学 128、哈利法大学 147、巴塞罗那大学 165、朱拉隆功大学 212、里斯本大学 237、维新大学 504（超出 500 名记 0 分）。只看天花板不看数量。没有纳入学业测评，因为中国大陆没有全国代表性的 PISA 数据。' }
    ]
  },
  {
    id: 'env', name: '环境', en: 'Environment',
    q: '空气干不干净？生态有没有被照顾好？',
    ind: [
      { id: 'pm', name: 'PM2.5 人口加权年均浓度', unit: 'µg/m³', v: { cn: 31.3, hk: 15.8, jp: 10.5, kr: 21, sg: 12.2, my: 15.3, th: 23.3, vn: 25.6, au: 5.4, nz: 7.0, us: 7.5, ca: 7.0, gb: 8.8, ie: 7.4, fr: 8.9, de: 9.1, nl: 9.6, ch: 9.0, dk: 9.0, fi: 5.4, no: 6.7, se: 5.7, es: 10.0, pt: 10.5, it: 15.2, ae: 55.7 }, dp: 1, w: 60, b: 5, yr: '2024', src: 'pm', note: '卫星反演数据。WHO 年均指导值为 5 µg/m³，这里只有芬兰、澳大利亚、瑞典接近。阿联酋以沙尘为主。' },
      { id: 'epi', name: '环境绩效指数 EPI', unit: '0–100', v: { cn: 33.88, hk: null, jp: 63.15, kr: 52.65, sg: 46.06, my: 39.52, th: 43.74, vn: 23.82, au: 59.4, nz: 55.45, us: 58.54, ca: 57.78, gb: 71.51, ie: 62.01, fr: 69.82, de: 69.93, nl: 70.49, ch: 64.06, dk: 66.57, fi: 71.04, no: 69.24, se: 69.2, es: 66.28, pt: 62.74, it: 61.56, ae: 50.16 }, dp: 1, w: 20, b: 80, yr: '2026', src: 'epi', note: '共 177 国，中国香港未被单独评估。含气候和生物多样性指标，和个人宜居感不完全一致。' }
    ]
  },
  {
    id: 'cost', name: '可负担', en: 'Affordability',
    q: '工资够不够花？房子买不买得起？',
    ind: [
      { id: 'lpp', name: '本地购买力指数', unit: '纽约 = 100', v: { cn: 94.2, hk: 85.0, jp: 107.3, kr: 101.7, sg: 91.3, my: 76.3, th: 41.0, vn: 40.5, au: 134.8, nz: 119.4, us: 144.5, ca: 114.8, gb: 118.2, ie: 113.0, fr: 113.3, de: 130.0, nl: 124.3, ch: 165.7, dk: 141.2, fi: 119.8, no: 123.2, se: 128.6, es: 96.8, pt: 65.3, it: 85.5, ae: 113.4 }, dp: 1, w: 20, b: 150, yr: '2026 年中', src: 'numbeoC', note: '用当地平均净工资能买到的商品服务量，众包数据，样本偏向大城市。本维度按本地收入衡量；如果收入来自国外（退休金、远程工作），应直接看物价：Numbeo 生活成本+房租指数（纽约 = 100）越南 19.0、中国 21.0、马来西亚 22.4、泰国 25.8、葡萄牙 37.1、西班牙 38.1，瑞士 81.5、新加坡 80.5、中国香港 68.5 最贵。' },
      { id: 'pti', name: '房价收入比', unit: '年', v: { cn: 17.4, hk: 35.2, jp: 11.7, kr: 24.4, sg: 24.7, my: 8.4, th: 23.8, vn: 32.7, au: 8.2, nz: 7.9, us: 3.4, ca: 7.2, gb: 7.7, ie: 6.2, fr: 8.3, de: 7.8, nl: 7.7, ch: 11.4, dk: 6.7, fi: 6.6, no: 7.2, se: 7.0, es: 8.7, pt: 13.0, it: 7.8, ae: 7.8 }, dp: 1, w: 40, b: 3, log: true, yr: '2026 年中', src: 'numbeoP', note: '一套 90 m² 公寓价格相当于家庭多少年可支配收入。中国一、二线城市样本拉高了均值；新加坡约八成居民住政府组屋，组屋的房价收入比远低于这里的私宅口径。中国香港 35.2 年为全部国家最高。' }
    ]
  },
  {
    id: 'gov', name: '治理与自由', en: 'Governance',
    q: '政府办事行不行？清不清廉？法治和言论自由如何？',
    ind: [
      { id: 'ge', name: '政府效能', unit: '0–100', v: { cn: 66.8, hk: 80.5, jp: 94.7, kr: 81.0, sg: 95.5, my: 70.2, th: 56.6, vn: 49.8, au: 87.4, nz: 90.1, us: 79.0, ca: 87.9, gb: 76.9, ie: 85.3, fr: 77.0, de: 83.2, nl: 88.6, ch: 90.8, dk: 91.0, fi: 89.4, no: 90.1, se: 88.6, es: 76.2, pt: 72.3, it: 69.4, ae: 75.6 }, dp: 1, w: 0, b: 100, yr: '2024', src: 'wgi', note: '公共服务质量、政策制定与执行能力。2025 版起使用 0–100 量表。' },
      { id: 'cpi', name: '清廉指数 CPI', unit: '0–100', v: { cn: 43, hk: 76, jp: 71, kr: 63, sg: 84, my: 52, th: 33, vn: 41, au: 76, nz: 81, us: 64, ca: 75, gb: 70, ie: 76, fr: 66, de: 77, nl: 78, ch: 80, dk: 89, fi: 88, no: 81, se: 80, es: 55, pt: 56, it: 53, ae: 69 }, dp: 0, w: 10, b: 90, yr: '2025', src: 'cpi', note: '专家与企业高管对公共部门腐败的感知，不是实际案件数。' },
      { id: 'wjp', name: 'WJP 法治指数', unit: '0–1', v: { cn: 0.48, hk: 0.72, jp: 0.78, kr: 0.74, sg: 0.78, my: 0.57, th: 0.5, vn: 0.5, au: 0.8, nz: 0.83, us: 0.68, ca: 0.79, gb: 0.78, ie: 0.82, fr: 0.72, de: 0.83, nl: 0.82, ch: null, dk: 0.9, fi: 0.87, no: 0.89, se: 0.85, es: 0.71, pt: 0.67, it: 0.66, ae: 0.64 }, dp: 2, w: 0.3, b: 0.9, yr: '2025', src: 'wjp', note: '8 个因子：政府权力约束、无腐败、开放政府、基本权利、秩序与安全、监管执行、民事司法、刑事司法。瑞士不在 WJP 覆盖范围内。' },
      { id: 'fh', name: '政治权利与公民自由', unit: '0–100', v: { cn: 9, hk: 41, jp: 96, kr: 83, sg: 48, my: 53, th: 33, vn: 20, au: 94, nz: 99, us: 81, ca: 97, gb: 92, ie: 98, fr: 89, de: 95, nl: 97, ch: 96, dk: 97, fi: 100, no: 99, se: 99, es: 91, pt: 96, it: 87, ae: 18 }, dp: 0, w: 0, b: 100, yr: '2026', src: 'fh', note: '政治权利 40 分 + 公民自由 60 分。评估方是美国非营利机构，常被批评带有西方立场。中国香港按地区单独评估。新加坡、马来西亚、中国香港为“部分自由”，泰国、阿联酋、越南、中国为“不自由”。' }
    ]
  },
  {
    id: 'life', name: '工作与幸福', en: 'Work–life',
    q: '工作多累？有多少假？自己觉得过得好吗？',
    ind: [
      { id: 'whr', name: '生活评价（坎特里尔阶梯）', unit: '0–10', v: { cn: 6.074, hk: 5.569, jp: 6.13, kr: 6.04, sg: 6.585, my: 6.005, th: 6.296, vn: 6.428, au: 6.916, nz: 6.995, us: 6.816, ca: 6.741, gb: 6.694, ie: 6.928, fr: 6.586, de: 6.882, nl: 7.223, ch: 7.018, dk: 7.539, fi: 7.764, no: 7.242, se: 7.255, es: 6.54, pt: 6.029, it: 6.574, ae: 6.821 }, dp: 2, w: 2.5, b: 7.8, yr: '2023–25', src: 'whr', note: '受访者自评人生在 0–10 阶梯上的位置，三年均值。' },
      { id: 'hrs', name: '年均工作时长', unit: '小时/就业者', v: { cn: 2328, hk: 2240, jp: 1654, kr: 1910, sg: 2283, my: 2308, th: 2177, vn: 2160, au: 1611, nz: 1708, us: 1789, ca: 1731, gb: 1523, ie: 1654, fr: 1487, de: 1335, nl: 1439, ch: 1529, dk: 1380, fi: 1497, no: 1412, se: 1432, es: 1638, pt: 1735, it: 1701, ae: 2514 }, dp: 0, w: 2400, b: 1300, yr: '2023', src: 'pwt', note: '中国、中国香港、新加坡、马来西亚、泰国、越南、阿联酋为 PWT 推算值；中国可对照国家统计局企业就业人员周均工作时间，2024 年约 49 小时。' },
      { id: 'pto', name: '法定带薪年假 + 公共假日', unit: '天', v: { cn: 18, hk: 24, jp: 10, kr: 32, sg: 18, my: 19, th: 19, vn: 23, au: 30, nz: 32, us: 0, ca: 17, gb: 28, ie: 30, fr: 35, de: 30, nl: 31, ch: 27, dk: 35, fi: 36, no: 35, se: 34, es: 36, pt: 31, it: 32, ae: 44 }, dp: 0, w: 0, b: 36, yr: '2025', src: 'law', note: '只算法律下限（五天工作制、最低工龄档）。中国年假 5 天 + 法定节假日 13 天；美国联邦和各州都不强制任何带薪假；日本只强制 10 天年假，节假日不强制带薪；英国 28 天已含公共假日；加拿大按省不同，取最低 17 天；中国香港 7 天年假 + 17 天公众假期；阿联酋法定 30 天年假 + 约 14 天节假日。' }
    ]
  }
];

function cagr(a, b, n) { return (Math.pow(b / a, 1 / n) - 1) * 100; }

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

// Questionnaire: each option sets [importance, target] for some dimensions. When answers touch the same dimension, the higher importance wins.
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
