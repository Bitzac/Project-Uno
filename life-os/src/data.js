// 人生路径与城市数据。q = 数据可信度：'实' 有一手来源（见 SOURCES），'估' 估算（量级可信，具体值待核）。
const NOW_AGE = 28, NOW_YEAR = 2026, BIRTH_YEAR = NOW_YEAR - NOW_AGE;

// c = 分类色槽位，按人生顺序固定，不随筛选变化
const STAGES = [
  { id: 'hh', name: '呼和浩特', kind: '成长', a0: 0, a1: 14, c: 1, ll: [111.75, 40.84], asset: '母亲与家；北方生活习惯；内蒙古的根' },
  { id: 'us', name: '美国', kind: '求学', a0: 15, a1: 21, c: 2, ll: null, asset: '英语与跨文化能力；独立生活' },
  { id: 'bj', name: '北京', kind: '工作', a0: 22, a1: 24, c: 3, ll: [116.40, 39.90], asset: '3 年工作人脉；首都资源' },
  { id: 'hz', name: '杭州', kind: '工作', a0: 25, a1: 25, c: 4, ll: [120.16, 30.27], asset: '长三角民营与数字经济的一手经验' },
  { id: 'trip', name: '环游中国', kind: '游历', a0: 26, a1: 27, c: 5, ll: null, asset: '两年走过的城市样本' },
];

// 两人（你 + 母亲）口径。rent 元/㎡/月（估）；living 两人每月除房租外开销（估）
const AREA = 75, MED_RESERVE = 1000, VC_MAX = 1221;
const CITIES = [
  { id: 'bj', name: '北京', ll: [116.40, 39.90], vc: 1221, vcQ: '实', rent: 90, living: 7000,
    a4: 0.5, a4Note: '本市有 A++++ 级医院', a4Q: '实', jan: -3, jul: 27, heat: true,
    pm: 27.0, pmQ: '实', pmNote: '2025', home: 2.7, homeNote: '高铁最快 2h09m', homeQ: '实', years: 3 },
  { id: 'hz', name: '杭州', ll: [120.16, 30.27], vc: 640, vcQ: '实', rent: 55, living: 6000,
    a4: 0.5, a4Note: '本市有 A++++ 级医院', a4Q: '实', jan: 5, jul: 29, heat: false,
    pm: 30, pmQ: '实', pmNote: '2024 市区', home: 4.3, homeNote: '直飞约 2h45m', homeQ: '估', years: 1 },
  { id: 'cd', name: '成都', ll: [104.07, 30.67], vc: 250, vcQ: '估', vcNote: '第三梯队，单城 < 362 起', rent: 35, living: 5000,
    a4: 0.5, a4Note: '华西医院 A++++', a4Q: '实', jan: 6, jul: 25, heat: false,
    pm: 33, pmQ: '实', pmNote: '2025', home: 4.0, homeNote: '直飞约 2h30m', homeQ: '估', years: 0 },
  { id: 'sz', name: '深圳', ll: [114.06, 22.54], vc: 1018, vcQ: '实', rent: 80, living: 7000,
    a4: 1.2, a4Note: '本市 1 家百强；广州 A++++ 高铁约 30 分钟', a4Q: '实', jan: 16, jul: 29, heat: false,
    pm: 17, pmQ: '实', pmNote: '2025', home: 5.2, homeNote: '直飞约 3h40m', homeQ: '估', years: 0 },
  { id: 'xm', name: '厦门', ll: [118.09, 24.48], vc: 80, vcQ: '估', vcNote: '单城 < 362 起', rent: 45, living: 5500,
    a4: 3.5, a4Note: '最近的 A++++ 在杭州、上海或广州', a4Q: '估', jan: 13, jul: 29, heat: false,
    pm: 19, pmQ: '估', home: 4.8, homeNote: '直飞约 3h20m', homeQ: '估', years: 0 },
  { id: 'km', name: '昆明', ll: [102.83, 24.88], vc: 30, vcQ: '估', vcNote: '单城 < 362 起', rent: 28, living: 4500,
    a4: 3.0, a4Note: '最近的 A++++ 是成都华西', a4Q: '估', jan: 9, jul: 20, heat: false,
    pm: 22, pmQ: '估', home: 4.7, homeNote: '直飞约 3h10m', homeQ: '估', years: 0 },
  { id: 'hh', name: '呼和浩特', ll: [111.75, 40.84], vc: 10, vcQ: '估', vcNote: '单城 < 362 起', rent: 25, living: 4500,
    a4: 2.7, a4Note: '最近的 A++++ 在北京，高铁 2h09m', a4Q: '实', jan: -11, jul: 23, heat: true,
    pm: 27, pmQ: '估', home: 0, homeNote: '就是家', homeQ: '实', years: 15 },
];

// 季节站
const SANYA = { id: 'sy', name: '三亚', ll: [109.51, 18.25], cost: 14500 }; // 冬季短租两人月支出（估）
const HH_OWN = 5500; // 呼市有自住房时两人月支出（估）

const DIMS = [
  { k: 'vc', name: '创业生态', sub: '2025 投资事件' },
  { k: 'cost', name: '生活成本', sub: '两人月支出' },
  { k: 'med', name: '母亲医疗', sub: '到 A++++ 医院' },
  { k: 'clim', name: '气候', sub: '1 月 / 7 月均温' },
  { k: 'air', name: '空气', sub: 'PM2.5 μg/m³' },
  { k: 'home', name: '回呼和浩特', sub: '门到门' },
  { k: 'root', name: '已有根基', sub: '住过年数' },
];

const PRESETS = {
  mine: { label: '按你的回答', w: { vc: 25, cost: 20, med: 20, clim: 10, air: 10, home: 10, root: 5 } },
  biz: { label: '事业优先', w: { vc: 40, cost: 15, med: 15, clim: 5, air: 5, home: 10, root: 10 } },
  mom: { label: '母亲优先', w: { vc: 10, cost: 15, med: 30, clim: 15, air: 10, home: 15, root: 5 } },
  cost: { label: '成本优先', w: { vc: 15, cost: 40, med: 15, clim: 10, air: 10, home: 5, root: 5 } },
};

// 月均温（1991–2020 气候平均值，取一位小数，估）
const TEMP = {
  bj: [-3.1, 0.3, 6.7, 14.8, 20.8, 24.9, 27.1, 25.8, 20.9, 13.7, 5.2, -1.1],
  hh: [-11.0, -6.3, 1.0, 9.6, 16.3, 21.2, 23.2, 21.2, 15.4, 7.8, -1.6, -9.1],
  sy: [21.6, 22.8, 24.8, 27.1, 28.6, 28.9, 28.6, 28.2, 27.6, 26.4, 24.4, 22.2],
};
const PLAN = ['sy', 'sy', 'bj', 'bj', 'bj', 'bj', 'hh', 'hh', 'bj', 'bj', 'bj', 'bj'];
const STATION = {
  bj: { name: '北京', role: '基地', c: 3 },
  hh: { name: '呼和浩特', role: '夏站', c: 1 },
  sy: { name: '三亚', role: '冬站', c: 0 }, // 新地点，不占人生阶段的色槽，用中性色
};

const SOURCES = [
  { t: 'IT桔子：2025 年投资事件，北京 1,221、上海 1,174、深圳 1,018、苏州 713、杭州 640 起；其余城市单城占比 < 4%（< 362 起）', u: 'https://www.huxiu.com/article/4825684.html' },
  { t: '北京 2025 年 PM2.5 年均 27.0 μg/m³，优良天比率 85.2%', u: 'https://www.bjnews.com.cn/detail/1767494399129673.html' },
  { t: '深圳 2025 年生态环境状况公报：PM2.5 17 μg/m³', u: 'https://www.sznews.com/news/content/2026-07/02/content_32109152.htm' },
  { t: '成都 2025 年 PM2.5 33 μg/m³，优良 311 天（媒体报道）', u: 'https://www.sina.cn/news/article/niktcuw9246611.html' },
  { t: '杭州 2024 年市区 PM2.5 30 μg/m³', u: 'https://www.ehangzhou.gov.cn/2025-06/06/c_293906.htm' },
  { t: '全国 2025 年 PM2.5 平均 28 μg/m³', u: 'https://english.www.gov.cn/news/202601/16/content_WS69698acec6d00ca5f9a08993.html' },
  { t: '京张 + 张呼高铁：北京—呼和浩特最快 2 小时 9 分', u: 'https://www.ithome.com/0/465/578.htm' },
  { t: '复旦版《2023 年度中国医院综合排行榜》：百强分五档，A++++ 档覆盖北京、上海、浙江、成都、广州等地', u: 'https://www.thepaper.cn/newsDetail_forward_29366149' },
  { t: '深圳 1 家医院进入复旦版综合百强', u: 'https://www.sznews.com/news/content/2024-11/18/content_31345461.htm' },
  { t: '跨省异地长期居住人员备案长期有效；变更或取消时限原则上不超过 6 个月', u: 'https://www.chinanews.com.cn/cj/2022/07-26/9812276.shtml' },
  { t: '高血压、糖尿病等 10 种门诊慢特病已可跨省直接结算', u: 'https://www.stdaily.com/web/gdxw/2025-03/16/content_310280.html' },
  { t: '国家移民管理局：2025 年外国人免签入境 3,008 万人次，同比 +49.5%', u: 'https://www.stdaily.com/web/gdxw/2026-01/28/content_467200.html' },
  { t: '中指研究院：2026 年 5 月 50 城住宅平均租金 33.94 元/㎡/月。各城市租金为估算，用此锚定量级', u: 'https://news.10jqka.com.cn/20260609/c677305446.shtml' },
  { t: '国家卫计委《中国流动人口发展报告 2016》：流动老人近 1,800 万，其中 43% 专程照顾晚辈', u: null },
];
