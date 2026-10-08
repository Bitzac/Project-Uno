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

// 你给过的回答，按轮次记录；模型的指标和权重由它们决定
const INPUTS = [
  { r: 1, q: '职业方向', a: '创业 / 自由职业', effect: '城市要有投资人和创业生态' },
  { r: 1, q: '未来 5 年首要目标', a: '做自己的事业', effect: '投资人、全球连接权重最高' },
  { r: 1, q: '地理范围', a: '不固定，多城旅居', effect: '1 个基地 + 2 个季节站' },
  { r: 1, q: '现实牵挂', a: '单身；照顾母亲，带在身边', effect: '母亲医疗、气候进入模型' },
  { r: 2, q: '储备够几个月', a: '≥ 18 个月', effect: '成本权重降到 5%' },
  { r: 2, q: '母亲愿意离开呼市吗', a: '愿意', effect: '去掉“回呼和浩特”指标；夏天仍可回去' },
  { r: 2, q: '事业方向', a: '还没定', effect: '先做 90 天方向验证' },
  { r: 2, q: '城市偏好', a: '不常住北京；南方沿海发达城市，接近全球资源、投资人，对创业者友好', effect: '候选换成 6 座南方沿海城市，香港单独评估' },
];

// 两人（你 + 母亲）口径。rent 元/㎡/月（估）；living 两人每月除房租外开销（估）
// gser：Startup Genome 2025 全球创业生态排名（null = 未进前 40）
// gw：到最近的全球门户（上海或香港）的门到门小时；a4：到最近的复旦版 A++++ 级医院的门到门小时
const AREA = 75, MED_RESERVE = 1000, VC_MAX = 1174;
const CITIES = [
  { id: 'sh', name: '上海', ll: [121.47, 31.23], gser: 10, vc: 1174, vcQ: '实', rent: 95, living: 7500,
    gw: 0.5, gwNote: '本身是门户：两机场出入境 3,990 万人次', gwQ: '实',
    a4: 0.5, a4Note: '18 家复旦版百强医院', a4Q: '实', jan: 4.8, jul: 28.6, pm: 26, pmQ: '实' },
  { id: 'sz', name: '深圳', ll: [114.06, 22.54], gser: 17, vc: 1018, vcQ: '实', vcNote: '不含香港的投资机构', rent: 80, living: 7000,
    gw: 0.7, gwNote: '福田→香港西九龙高铁 14 分钟', gwQ: '实',
    a4: 1.2, a4Note: '本市 1 家百强；广州 A++++ 高铁约 30 分钟', a4Q: '实', jan: 15.9, jul: 28.9, pm: 17, pmQ: '实' },
  { id: 'hz', name: '杭州', ll: [120.16, 30.27], gser: 23, vc: 640, vcQ: '实', rent: 55, living: 6000,
    gw: 1.5, gwNote: '高铁到上海约 1 小时', gwQ: '估',
    a4: 0.5, a4Note: '本市有 A++++ 级医院', a4Q: '实', jan: 5, jul: 29, pm: 30, pmQ: '实', pmNote: '2024 市区' },
  { id: 'gz', name: '广州', ll: [113.26, 23.13], gser: 35, vc: 300, vcQ: '估', vcNote: '第三梯队，单城 < 362 起', rent: 55, living: 6000,
    gw: 1.2, gwNote: '广州南→香港西九龙高铁约 50 分钟', gwQ: '估',
    a4: 0.5, a4Note: '中山一院、南方医院为 A++++', a4Q: '实', jan: 13.6, jul: 28.8, pm: 21.5, pmQ: '实' },
  { id: 'xm', name: '厦门', ll: [118.09, 24.48], gser: null, vc: 80, vcQ: '估', vcNote: '单城 < 362 起', rent: 45, living: 5500,
    gw: 2.8, gwNote: '飞香港约 1h20m', gwQ: '估',
    a4: 3.5, a4Note: '最近的 A++++ 在杭州、上海或广州', a4Q: '估', jan: 13, jul: 29, pm: 19, pmQ: '估' },
  { id: 'zh', name: '珠海', ll: [113.58, 22.27], gser: null, vc: 40, vcQ: '估', vcNote: '单城 < 362 起', rent: 40, living: 5500,
    gw: 1.2, gwNote: '港珠澳大桥到香港机场约 45 分钟', gwQ: '估',
    a4: 1.5, a4Note: '广州 A++++ 高铁约 1 小时', a4Q: '估', jan: 15.5, jul: 28.9, pm: 18, pmQ: '估' },
];

// 香港：全球门户，但不能做母亲同住的基地
const HK = { ll: [114.17, 22.32], gser: 27, pax: 6100, ipo: 2857, rail: 14 };

// 季节站
const WINTER = { id: 'sz', name: '深圳', cost: 15800 }; // 冬季短租两人月支出（估，房租按长租 1.3 倍）
const HH_BURN = 25 * AREA + 4500 + MED_RESERVE, HH_OWN = 5500; // 呼市夏站两人月支出（估）

const DIMS = [
  { k: 'eco', name: '创业生态', sub: 'GSER 2025 全球排名' },
  { k: 'vc', name: '投资人', sub: '2025 投资事件' },
  { k: 'gw', name: '全球连接', sub: '到上海或香港' },
  { k: 'med', name: '母亲医疗', sub: '到 A++++ 医院' },
  { k: 'cost', name: '生活成本', sub: '两人月支出' },
  { k: 'clim', name: '气候', sub: '1 月 / 7 月均温' },
  { k: 'air', name: '空气', sub: 'PM2.5 μg/m³' },
];

const PRESETS = {
  mine: { label: '按你的回答', w: { eco: 20, vc: 25, gw: 25, med: 15, cost: 5, clim: 5, air: 5 } },
  biz: { label: '事业优先', w: { eco: 25, vc: 30, gw: 20, med: 10, cost: 5, clim: 5, air: 5 } },
  mom: { label: '母亲优先', w: { eco: 10, vc: 10, gw: 10, med: 30, cost: 10, clim: 20, air: 10 } },
  cost: { label: '成本优先', w: { eco: 10, vc: 10, gw: 15, med: 15, cost: 35, clim: 10, air: 5 } },
};

// 月均温（1991–2020 气候平均值，取一位小数，估）
const TEMP = {
  sh: [4.8, 6.6, 10.4, 15.8, 21.0, 24.6, 28.6, 28.3, 24.9, 19.9, 14.0, 7.6],
  sz: [15.9, 17.0, 19.6, 23.4, 26.6, 28.2, 28.9, 28.7, 27.8, 25.4, 21.5, 17.2],
  hh: [-11.0, -6.3, 1.0, 9.6, 16.3, 21.2, 23.2, 21.2, 15.4, 7.8, -1.6, -9.1],
};
const PLAN = ['sz', 'sz', 'sh', 'sh', 'sh', 'sh', 'hh', 'hh', 'sh', 'sh', 'sh', 'sh'];
const STATION = {
  sh: { name: '上海', role: '基地', c: 0 }, // 新地点，不占人生阶段的色槽：基地用墨色
  sz: { name: '深圳', role: '冬站', c: 8 },
  hh: { name: '呼和浩特', role: '夏站', c: 1 },
};

const SOURCES = [
  { t: 'Startup Genome《GSER 2025》：上海第 10、深圳第 17、杭州第 23、香港第 27、广州第 35', u: 'https://startupgenome.com/report/gser2025/global-startup-ecosystem-ranking-2025-top-40' },
  { t: 'IT桔子：2025 年投资事件，上海 1,174、深圳 1,018、杭州 640 起；其余城市单城占比 < 4%（< 362 起）', u: 'https://www.huxiu.com/article/4825684.html' },
  { t: '上海机场 2025 年出入境旅客 3,990 万人次，占全国空港口岸 28.9%', u: 'https://english.shanghai.gov.cn/en-Latest-WhatsNew/20260421/e4fcc18857f247e3b7ae3634e3c06cce.html' },
  { t: '上海跨国公司地区总部 1,084 家、外资研发中心 647 家（2026 年 2 月末）', u: 'https://www.news.cn/fortune/20260319/a695e739d388410280a5742ba8b3cb3d/c.html' },
  { t: '香港国际机场 2025 年客运量约 6,100 万人次，同比 +15%', u: 'https://www.thestandard.com.hk/news/article/321702/HKIA-handles-61-million-passengers-in-2025-Christmas-peak-boosts-traffic' },
  { t: '2025 年香港 IPO 募资额重回全球第一（毕马威）；Wind 统计全年约 2,857 亿港元', u: 'https://kpmg.com/cn/zh/home/media/press-releases/2025/12/hk-reclaims-top-global-ipo-spot-in-2025-says-kpmg.html' },
  { t: '广深港高铁：福田→香港西九龙最快 14 分钟', u: 'https://www.yzwb.net/news/yw/202510/t20251015_276780.html' },
  { t: '香港受养人签证：父母须年满 60 岁，且保证人为永久性居民或不受逗留期限限制的居民', u: 'https://www.immd.gov.hk/pdforms/ID%28C%29998.pdf' },
  { t: '复旦版《2023 年度中国医院综合排行榜》：上海 18 家进入百强', u: 'https://img1.xinmin.cn/xmwb/2024-11-17/41117.pdf' },
  { t: '复旦版百强：广东 11 家进入，中山一院、南方医院为 A++++', u: 'https://news.ycwb.com/2024-11/16/content_53061759.htm' },
  { t: '复旦版百强分五档，A++++ 档覆盖北京、上海、浙江、成都、广州等地', u: 'https://www.thepaper.cn/newsDetail_forward_29366149' },
  { t: '深圳 1 家医院进入复旦版综合百强', u: 'https://www.sznews.com/news/content/2024-11/18/content_31345461.htm' },
  { t: '上海 2025 年 PM2.5 26 μg/m³', u: 'https://sthj.sh.gov.cn/cmsres/17/17f73ef0f3474f2896027bb2cc33434b/ab78e00d8a18d52c971dfc2ead9d9a17.pdf' },
  { t: '深圳 2025 年生态环境状况公报：PM2.5 17 μg/m³', u: 'https://www.sznews.com/news/content/2026-07/02/content_32109152.htm' },
  { t: '广州 2025 年 PM2.5 21.5 μg/m³，优良天数比例 93.4%', u: 'https://news.ycwb.com/ikimvkjtkl/content_53895445.htm' },
  { t: '杭州 2024 年市区 PM2.5 30 μg/m³', u: 'https://www.ehangzhou.gov.cn/2025-06/06/c_293906.htm' },
  { t: '全国工商联 2022 年万家民营企业评营商环境：口碑最佳城市前五为深圳、杭州、广州、苏州、成都', u: 'https://cn.chinadaily.com.cn/a/202211/04/WS6364e8bca310ed1b2aca5987.html' },
  { t: '跨省异地长期居住人员备案长期有效；变更或取消时限原则上不超过 6 个月', u: 'https://www.chinanews.com.cn/cj/2022/07-26/9812276.shtml' },
  { t: '高血压、糖尿病等 10 种门诊慢特病已可跨省直接结算', u: 'https://www.stdaily.com/web/gdxw/2025-03/16/content_310280.html' },
  { t: '国家移民管理局：2025 年外国人免签入境 3,008 万人次，同比 +49.5%', u: 'https://www.stdaily.com/web/gdxw/2026-01/28/content_467200.html' },
  { t: '中指研究院：2026 年 5 月 50 城住宅平均租金 33.94 元/㎡/月。各城市租金为估算，用此锚定量级', u: 'https://news.10jqka.com.cn/20260609/c677305446.shtml' },
  { t: '国家卫计委《中国流动人口发展报告 2016》：流动老人近 1,800 万，其中 43% 专程照顾晚辈', u: null },
];
