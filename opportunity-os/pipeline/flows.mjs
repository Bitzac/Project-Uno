// Capital flows in 2026, as of 2026-10-08. Amounts in USD bn; negative = net outflow.
// LINKS are bilateral channels drawn as arcs; NODES are net flows into one market (foreign investors) drawn as circles.
// `amt` sizes the mark and is the realised or identified amount, not a pledge; pledges go in the text.

export const FLOW_TYPES = {
  state: '国家与主权资本',
  port: '证券投资',
  fdi: '直接投资与工程',
};

export const FLOW_SOURCES = {
  unctad: ['UNCTAD：2025 年全球 FDI 增长 6% 至 1.6 万亿美元', 'https://unctad.org/news/global-investment-rises-6-16-trillion-development-gains-remain-uneven'],
  unctaddc: ['UNCTAD：数据中心正在重塑全球投资格局', 'https://unctad.org/news/data-centres-are-reshaping-global-investment-landscape'],
  iif: ['IIF 资本流动追踪（2026-09，覆盖 8 月）', 'https://www.iif.com/Products/Capital-Flows-Tracker'],
  tic: ['美国财政部 TIC 数据：2026 年 7 月', 'https://home.treasury.gov/news/press-releases/sb0631'],
  ticapr: ['美国财政部 TIC 数据：2026 年 4 月', 'https://home.treasury.gov/news/press-releases/sb0536'],
  ssga: ['道富环球：美国上市 ETF 资金流（2026-09）', 'https://www.ssga.com/library-content/pdfs/etf/us/monthly-flash-flows.pdf'],
  bofa: ['美银 Follow the Flow（2026-10-02，转载）', 'https://finvaulta.com/research/bank-of-america/follow-the-flow-uncertainty-persists-2026-10-02'],
  fundseu: ['Funds Europe：欧洲 ETF 上半年流入 2,190 亿欧元创纪录', 'https://funds-europe.com/european-etf-inflows-hit-record-e219bn-in-h1/'],
  wgcetf: ['世界黄金协会：2026 年 7 月黄金 ETF 资金流', 'https://www.gold.org/goldhub/research/gold-etfs-holdings-and-flows/2026/08'],
  wgccb: ['IndexBox / 世界黄金协会：二季度央行购金 289 吨', 'https://www.indexbox.io/blog/central-banks-bought-record-289-tonnes-of-gold-in-q2-2026-led-by-poland-and-china/'],
  jpflow: ['日经亚洲：外资上半年净买入日股 600 亿美元创纪录', 'https://asia.nikkei.com/business/markets/equities/foreign-investors-scoop-up-half-year-record-60bn-in-japan-stocks'],
  krflow: ['首尔经济日报：外资今年首次月度净买入韩股', 'https://en.sedaily.com/finance/2026/09/18/foreign-investors-turn-net-buyers-of-korean-stocks-for'],
  krh1: ['韩国先驱报：外资年内首个净买入月', 'https://www.koreaherald.com/article/10878552'],
  twflow: ['BigGo 财经：外资上半年卖超台股逾 8,000 亿新台币', 'https://finance.biggo.com/news/8742bd24-8a7e-4c40-9cc6-81dcd5a458b7'],
  infpi: ['Kotak Neo：2026 年 FPI 流出接近 300 亿美元', 'https://www.kotakneo.com/news/market-news/fpi-outflow-2026-nears-30-billion-record-foreign-selling/'],
  brflow: ['彭博：巴西股市单日吸引创纪录 20 亿美元外资', 'https://www.bloomberg.com/news/articles/2026-10-07/brazil-stocks-lure-record-2-billion-inflow-on-election-surprise'],
  jpus: ['日本时报：日美 5,500 亿美元投资协议取得进展', 'https://www.japantimes.co.jp/business/2026/09/05/japan-progress-us-investment-pact/'],
  korus: ['日本时报：韩国确认 3,500 亿美元对美投资首个项目', 'https://www.japantimes.co.jp/business/2026/09/22/south-korea-350-billion-us-investment/'],
  korus2: ['韩国时报：韩国开始对美投资但贸易压力持续', 'https://www.koreatimes.co.kr/amp/business/companies/20261005/korea-begins-us-investment-but-trade-pressure-persists'],
  gccswf: ['AGBI：伊朗战争或把海湾资本拉离全球市场', 'https://www.agbi.com/analysis/finance/2026/09/iran-war-could-pull-gulf-capital-out-of-global-markets/'],
  mgx: ['CNBC：阿布扎比 MGX 首支 AI 基金 490 亿美元收官', 'https://www.cnbc.com/2026/07/01/mgx-ai-fund-uae-49-billion.html'],
  southbound: ['南华早报：南向通资金创 1,520 亿美元纪录', 'https://www.scmp.com/business/banking-finance/article/3358201/southbound-stock-connect-flows-surge-record-us152b-driven-hong-kongs-ipo-revival'],
  cnfdi: ['新华社：1–8 月高技术产业实际使用外资增长 35.1%', 'https://english.news.cn/20260919/92f64ca3e96b4cb089c0e4a47dbce6ac/c.html'],
  cnodi: ['安永：2026 年上半年中国对外投资概览', 'https://www.ey.com/en_cn/newsroom/2026/08/ey-releases-the-overview-of-china-outbound-investment-of-h1-2026'],
  bri: ['绿色金融与发展中心：2026 上半年一带一路投资报告', 'https://greenfdc.org/chinas-investment-and-construction-engagement-in-the-belt-and-road-initiative-bri-2026-h1/'],
  briaf: ['Ecofin：一带一路对非洲投资上半年增长 254%', 'https://www.ecofinagency.com/news/2907-57813-chinese-belt-and-road-investment-in-africa-jumps-254-in-h1-2026-report'],
};

// [from, to, amt, type, text, period, sources]
export const FLOW_LINKS = [
  ['CHN', 'HKG', 152, 'port', '南向通净买入港股，创纪录；2026 年以来增速放缓', '截至 2026 年 3 月的 12 个月', ['southbound']],
  ['JPN', 'USA', 36, 'state', '5,500 亿美元对美投资框架：首批约 360 亿美元项目已定（海上钻井、天然气、人造金刚石），第二批约 730 亿美元候选（核电、燃气电厂）', '2026 年分批落地', ['jpus']],
  ['ARE', 'USA', 25, 'state', '海湾主权基金上半年交易创纪录 540 亿美元，近半投向美国，以 AI 为主（MGX 参与 Stargate、Anthropic、xAI）', '2026 年上半年', ['gccswf', 'mgx']],
  ['CHN', 'ETH', 18.9, 'fdi', '一带一路对埃塞俄比亚投资与工程', '2026 年上半年', ['briaf']],
  ['CHN', 'EGY', 9.7, 'fdi', '一带一路对埃及投资与工程', '2026 年上半年', ['briaf']],
  ['KOR', 'USA', 2.4, 'state', '3,500 亿美元承诺中的首笔注资，用于德州燃气电厂（项目总额 223 亿美元，为 AI 数据中心供电）', '2026 年 10 月', ['korus', 'korus2']],
];

// [market, amt, text, period, sources]: foreign investors' net purchases (+) or sales (−)
export const FLOW_NODES = [
  ['USA', 686, '外国投资者净买入美国证券与银行头寸（TIC），仅 1 月为净流出', '2026 年 1–7 月', ['tic', 'ticapr']],
  ['JPN', 60, '外资净买入日股 9.7 万亿日元，半年度纪录（2013 年为 8.3 万亿）', '2026 年上半年', ['jpflow']],
  ['BRA', 2, '首轮选举后单日外资净流入 100.6 亿雷亚尔，创纪录', '2026-10-05', ['brflow']],
  ['IDN', -3.7, '外资净卖出印尼股票约 37–39 亿美元，MSCI 降级风险', '2026 年以来', ['idfx']],
  ['TWN', -26.1, '外资净卖超台股 8,356 亿新台币，同期加权指数上涨逾 60%；但外资净汇入 768 亿美元', '2026 年上半年', ['twflow']],
  ['IND', -29, '外资（FPI）净卖出印度股票接近 300 亿美元，超过 2025 年全年的约 180 亿美元纪录', '2026 年 1 月至 10 月初', ['infpi']],
  ['KOR', -96.7, '外资净卖出韩股 148.3 万亿韩元，半年度纪录；8 月首次净买入，9 月又转为卖出', '2026 年上半年', ['krh1', 'krflow']],
];

// [asset or channel, direction, size and period, sources]
export const FLOW_ASSETS = [
  ['美国上市 ETF', '流入', '1–9 月约 1.54 万亿美元，超过 2025 年全年 1.52 万亿美元的纪录', ['ssga']],
  ['债券 ETF', '流入', '1–9 月 4,690 亿美元创纪录，其中短期国债 ETF 990 亿美元；9 月连续第 5 个月超过 500 亿', ['ssga']],
  ['非美股票', '流入', '9 月美国 ETF 的股票资金约三分之一流向非美市场，而非美资产只占约六分之一', ['ssga']],
  ['货币市场基金', '流出', '9 月中旬起连续三周流出，单周约 600 亿美元', ['bofa']],
  ['欧洲 ETF / ETC', '流入', '上半年 2,190 亿欧元创纪录；6 月资金转向美国大盘，欧元区大盘 ETF 净流出 14 亿欧元', ['fundseu']],
  ['新兴市场证券', '回流', 'IIF：5、6 月共流出约 430 亿美元，7、8 月流入约 362 亿美元（8 月 113 亿）', ['iif']],
  ['黄金 ETF', '流入放缓', '1–7 月净流入约 110 亿美元；3 月单月流出 120 亿美元为历史最大', ['wgcetf']],
  ['各国央行黄金', '买入', '上半年约 346 吨（一季度下修至 57 吨、二季度 289 吨）；波兰 +51 吨、中国 +33 吨，俄罗斯 −22 吨', ['wgccb']],
  ['全球 FDI', '流入', '2025 年 1.6 万亿美元（+6%），仍比 2015 年峰值低三分之一以上；数据中心绿地投资超 2,700 亿美元，占项目额五分之一以上', ['unctad', 'unctaddc']],
  ['流入中国的外资', '减少', '1–8 月实际使用外资 4,800 亿元（−5.3%），其中高技术产业 2,003 亿元（+35.1%）', ['cnfdi']],
  ['中国对外投资', '增加', '上半年 865 亿美元（+8.1%）；一带一路上半年投资 498 亿美元、工程合同 765 亿美元，对非洲 335 亿美元（+254%）', ['cnodi', 'bri', 'briaf']],
];

export const FLOW_TILES = [
  ['全球 FDI 2025', '1.6', '万亿美元', '+6% · UNCTAD 2026 年 7 月'],
  ['美国上市 ETF 1–9 月', '1.54', '万亿美元', '全年纪录已被超过'],
  ['外资净买入日股 上半年', '600', '亿美元', '半年度纪录'],
  ['外资净卖出印度股 年内', '≈300', '亿美元', '全年纪录'],
];

// The overview sentence for the capital-flow pane (kept with the data it summarises)
export const FLOW_LEAD = '2026 年的钱主要往四个方向走：<b>美国</b>（1–7 月外资净流入约 6,860 亿美元，美国上市 ETF 前 9 个月流入 1.54 万亿创纪录）；'
  + '<b>AI 实物资产</b>（四大云厂商资本开支约 6,500 亿美元，2025 年全球数据中心绿地投资超 2,700 亿美元）；<b>日本</b>（外资上半年净买入 600 亿美元创纪录）；'
  + '以及<b>国家资本</b>（日本、韩国对美投资框架开始落地，海湾主权基金上半年交易 540 亿美元、近半投向美国）。'
  + '流出最多的是<b>韩国、印度、台湾</b>的股市：外资在 AI 硬件涨幅最大的地方获利了结，本地资金接盘。';
