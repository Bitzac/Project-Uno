// Hand-written industry profiles for 50 economies (about 90% of world GDP), as of 2026-10-08.
// Every row is [industry, theme key, evidence]. Assets are [class key, name, code, rationale].
// `gl` is the newest 2026 growth forecast found after the IMF April WEO: [percent, source].
// Figures carry their source and period; `src` lists keys into SOURCES. Not investment advice.

export const THEMES = {
  ai: 'AI 算力', semi: '半导体', power: '电力与新能源', energy: '油气与 LNG', mining: '矿产金属', ev: '电动车与电池',
  defense: '国防航天', mfg: '制造业转移', ship: '造船航运', fin: '金融', health: '医药医疗', consumer: '消费',
  digital: '数字经济', tourism: '旅游服务', agri: '农业食品', infra: '基建地产',
};

export const ASSET_CLASSES = {
  idx: '指数 ETF', sec: '行业 ETF', qdii: 'A 股 QDII', stk: '龙头股', bond: '债券', reit: 'REITs', na: '不可投资',
};

export const SOURCES = {
  imf4: ['IMF《世界经济展望》2026 年 4 月', 'https://www.imf.org/en/publications/weo'],
  imf7: ['IMF《世界经济展望》2026 年 7 月更新', 'https://www.imf.org/en/publications/weo/issues/2026/07/08/world-economic-outlook-update-july-2026'],
  wb: ['世界银行 WDI / WGI 数据库', 'https://data.worldbank.org/'],
  wits: ['世界银行 WITS 贸易统计', 'https://wits.worldbank.org/'],
  usgs: ['USGS《矿产品摘要》2025', 'https://www.usgs.gov/centers/national-minerals-information-center/mineral-commodity-summaries'],
  hormuz: ['半岛电视台：特朗普拒绝伊朗重开霍尔木兹方案，油价上涨（2026-09-28）', 'https://www.aljazeera.com/economy/2026/9/28/oil-prices-surge-after-trump-rejects-irans-plan-to-reopen-strait-of-hormuz'],
  gulf80: ['路透/渣打：海湾石油出口恢复至战前约 80%（2026-10）', 'https://www.nakedcapitalism.com/2026/10/reuters-reports-gulf-oil-exports-reached-80-of-pre-war-level-as-standard-chartered-shows-bigger-hit-to-hormuz-transits-shift-to-other-routes.html'],
  metals: ['Trading Economics：黄金、铜价（2026-10-07）', 'https://tradingeconomics.com/commodity/copper'],
  fed: ['美联储 2026-09-16 议息声明', 'https://www.federalreserve.gov/newsevents/pressreleases/monetary20260916a1.htm'],
  bls: ['CNN：9 月非农新增 2.9 万、失业率 4.2%', 'https://www.cnn.com/2026/10/02/economy/us-jobs-report-september-final'],
  s301: ['Orrick：美国 301 条款关税（2026-07）', 'https://www.orrick.com/en/Insights/2026/07/US-Imposes-Far-Reaching-Section-301-Tariffs'],
  fid: ['Fidelity：2026 年中行业回顾', 'https://institutional.fidelity.com/advisors/insights/spotlights/equity-sector-performance-outlook/equity-sector-mid-year-update'],
  capex: ['Introl：2026 年超大规模云厂商资本开支', 'https://introl.com/blog/hyperscaler-capex-600b-2026-ai-infrastructure-debt-january-2026'],
  lbnl: ['LBNL《美国数据中心能耗报告》2024', 'https://eta.lbl.gov/publications/2024-lbnl-data-center-energy-usage-report'],
  nbs: ['国家统计局：2026 年上半年国民经济', 'https://www.stats.gov.cn/english/PressRelease/202607/t20260715_1964120.html'],
  cnexp: ['Fortune：中国 8 月出口同比 +25%', 'https://fortune.com/2026/09/08/china-exports-25-ai-infrastructure/'],
  cnprop: ['路透调查：中国房价与地产投资（2026-08）', 'https://finance.yahoo.com/real-estate/articles/china-home-prices-seen-falling-062042122.html'],
  fyp15: ['新华/国家发改委：“十五五”新兴与未来产业', 'https://www.thestandard.com.hk/innovation/article/315031/China-to-foster-future-industries-create-another-hi-tech-industry-base-next-decade-NDRC'],
  hkipo: ['毕马威：2026 年三季度内地及香港 IPO 回顾', 'https://kpmg.com/cn/en/media/press-releases/2026/10/chinese-mainland-and-hk-ipo-markets-2026-q3-review-press-release.html'],
  twgdp: ['彭博：台湾将 2026 年增速预测上调至 9.64%', 'https://www.bloomberg.com/news/articles/2026-05-29/taiwan-lifts-2026-growth-outlook-to-more-than-9-on-ai-hunger'],
  boj: ['CNBC：日本央行加息至 1.25%（2026-09-18）', 'https://www.cnbc.com/2026/09/18/japan-rate-hike-stocks-rise-bond-yields-yen-fall.html'],
  hynix: ['CNBC：SK 海力士市值破 1 万亿美元', 'https://www.cnbc.com/2026/05/27/sk-hynix-shares-ai-chip-rally-1-trillion.html'],
  kospi: ['CNBC：KOSPI 暴跌与创纪录反弹（2026-07-31）', 'https://www.cnbc.com/2026/07/31/south-korea-kospi-samsung-sk-hynix-meltdown-record-rebound.html'],
  inelec: ['Business Standard：印度电子出口 4–8 月 +39.4%', 'https://www.business-standard.com/amp/industry/news/india-electronics-exports-april-august-fy27-smartphones-pcb-growth-126092500728_1.html'],
  nifty: ['TradingView：Nifty 9 月下跌 6.3%', 'https://www.tradingview.com/news/moodys:adbfb30bac0ce:0-nifty-50-falls-6-3-in-september-worst-monthly-series-in-25-years-what-triggered-the-sell-off/'],
  adb: ['亚行《亚洲发展展望》2026 年 9 月：东南亚', 'https://www.adb.org/sites/default/files/publication/1174871/developing-southeast-asia-ado-september-2026.pdf'],
  seadc: ['The Diplomat：东南亚数据中心热潮（2026-09）', 'https://thediplomat.com/2026/09/the-global-data-center-boom-has-arrived-in-southeast-asia/'],
  vnfdi: ['越通社：前 9 月 FDI 到位五年新高', 'https://en.vietnamplus.vn/fdi-disbursement-hits-five-year-high-in-nine-months-post353030.vnp'],
  vnftse: ['Vietnam Briefing：富时升级越南为次级新兴市场', 'https://www.vietnam-briefing.com/news/vietnam-secures-ftse-emerging-market-status-upgrade.html'],
  idmsci: ['CNBC：MSCI 推迟印尼市场分类决定', 'https://www.cnbc.com/2026/06/24/msci-south-korea-emerging-market-indonesia-review-extended.html'],
  idfx: ['Jakarta Globe：综指创年内新低、印尼盾跌破 17,900', 'https://jakartaglobe.id/business/jci-hits-2026-low-as-rupiah-slides-past-17900-moodys-flags-danantara-unit'],
  phl: ['南华早报：菲律宾增长落后', 'https://www.scmp.com/week-asia/economics/article/3368024/upgraded-underperforming-philippines-growth-lags-behind'],
  sti: ['TheFinance.sg：海峡时报指数创新高（2026-09）', 'https://thefinance.sg/2026/09/14/the-sti-is-at-a-record-high-here-are-3-singapore-stocks-i-would-still-buy/'],
  aulng: ['彭博：澳大利亚启动天然气税审查', 'https://www.bloomberg.com/news/articles/2026-03-30/australia-launches-gas-tax-review-as-war-fuels-lng-windfall'],
  bgd: ['每日星报：BNP 政府执政 6 个月经济', 'https://www.thedailystar.net/business/economy/news/economy-shows-fragile-gains-4251186'],
  kap: ['世界核新闻：主要铀生产商年中更新', 'https://www.world-nuclear-news.org/articles/mid-year-updates-from-major-uranium-producers'],
  mena: ['AGBI：IMF 预测伊朗战争重创中东增长', 'https://www.agbi.com/economy/2026/04/imf-forecasts-severe-hit-to-middle-east-growth-from-iran-war/'],
  saimf: ['IMF：2026 年沙特第四条款磋商', 'https://www.imf.org/en/news/articles/2026/07/29/pr26267-saudi-arabia-imf-concludes-2026-aiv'],
  humain: ['DCD：Humain 目标 2034 年 6.6 GW', 'https://www.datacenterdynamics.com/en/news/saudi-arabias-ai-co-humain-looking-for-us-data-center-equity-partner-targets-66gw-by-2034-with-subsidized-electricity/'],
  stargate: ['The National：Stargate UAE 成本超 300 亿美元', 'https://www.thenationalnews.com/future/technology/2026/01/26/stargate-uae-data-centre-to-cost-more-than-30bn-ai-minister-says/'],
  rasl: ['The National：拉斯拉凡 LNG 恢复需数月', 'https://www.thenationalnews.com/business/energy/2026/04/09/months-expected-until-qatars-ras-laffan-lng-site-resumes-full-operations/'],
  isr: ['以色列贸易处：1–9 月科技融资 110 亿美元', 'https://israeltrade.org.au/2026/09/25/israeli-tech-ecosystem-shows-remarkable-resilience-with-11-billion-raised-in-2026/'],
  tur: ['Trading Economics：土耳其通胀', 'https://tradingeconomics.com/turkey/inflation-cpi'],
  afoil: ['半岛电视台：伊朗战争下非洲的赢家与输家', 'https://www.aljazeera.com/news/2026/5/7/africa-sees-winners-and-losers-as-iran-war-pushes-up-oil-prices'],
  afstk: ['allAfrica：2026 年非洲股市回报', 'https://allafrica.com/stories/202609040136.html'],
  egy: ['African Business：埃及处于伊朗战争冲击前线', 'https://african.business/2026/04/trade-investment/egypt-on-frontline-of-iran-wars-economic-disruption'],
  ken: ['卡内基：伊朗战争引发肯尼亚国内危机', 'https://carnegieendowment.org/emissary/2026/08/kenya-iran-war-fuel-prices-fertilizer-domestic-crisis'],
  zaf: ['TimesLIVE：南非汽油价格突破 30 兰特', 'https://www.timeslive.co.za/news/2026-10-05-petrol-price-tops-r30-as-iran-war-disrupts-oil-supply/'],
  bra: ['法新社：首轮选举后巴西股市创纪录', 'https://www.france24.com/en/live-news/20261005-brazilian-stocks-surge-to-record-after-bolsonaro-election-lead'],
  usmca: ['AS/COA：美墨 USMCA 审查谈判追踪', 'https://www.as-coa.org/articles/tracking-us-mexico-talks-usmca-review'],
  mex: ['Rio Times：墨西哥 2026 年增长预期 1.4%', 'https://www.riotimesonline.com/mexico-analysts-raise-gdp-forecast-2026/'],
  arg: ['彭博：米莱经济复苏放缓', 'https://www.bloomberg.com/news/articles/2026-08-26/argentina-economy-milei-magic-fades-on-slowing-recovery'],
  chl: ['Mining.com：智利新政府加速铜扩产', 'https://www.mining.com/web/chiles-new-government-looks-to-speed-up-copper-expansion-amid-tight-supply/'],
  col: ['AS/COA：哥伦比亚 2026 年总统决选结果', 'https://www.as-coa.org/articles/what-know-about-colombias-2026-presidential-runoff-results'],
  per: ['Mining.com：秘鲁重新批准 Tía María', 'https://www.mining.com/peru-reauthorizes-southern-coppers-1-8b-project-amid-election-chaos/'],
  guy: ['OilNOW：圭亚那接近日产 100 万桶', 'https://oilnow.gy/featured/guyana-closes-in-on-one-million-barrels-per-day-as-uaru-start-up-approaches/'],
  hun: ['半岛电视台：马扎尔赢得匈牙利大选', 'https://www.aljazeera.com/news/2026/4/12/hungary-election-early-results-show-magyars-tisza-ahead-of-orbans-fidesz'],
  eda: ['欧洲防务局：2026 年欧盟防务支出 4,540 亿欧元', 'https://eda.europa.eu/news-and-events/news/2026/07/16/eu-defence-spending---418-billion-in-2025--projected-to--454-billion-in-2026'],
  defund: ['彭博：德国 5,000 亿基建基金拨付缓慢', 'https://www.bloomberg.com/news/articles/2026-06-01/germany-s-500-billion-infrastructure-fund-has-sluggish-start'],
  eugas: ['Modern Diplomacy：欧洲 2026 冬季能源账', 'https://moderndiplomacy.eu/2026/09/28/europe-winter-energy-crisis-2026-diesel-not-2022/'],
  pol: ['CEO.com.pl：波兰二季度 GDP +3.9%', 'https://ceo.com.pl/en/poland-gdp-growth-q2-2026-investment-consumption-48330/'],
  dnk: ['Fortune：诺和诺德带动丹麦增长预测翻倍', 'https://fortune.com/2026/09/23/novo-nordisk-weight-loss-denmark-economy-growth/'],
  novo: ['诺和诺德回购公告（2026-10-05）', 'https://www.globenewswire.com/news-release/2026/10/05/3374555/0/en/novo-nordisk-a-s-share-repurchase-programme.html'],
  ftse: ['IG：富时 100 创新高', 'https://www.ig.com/en/news-and-trade-ideas/ftse-100-reaches-fresh-record-as-uk-gdp-disappoints-260212'],
  che: ['Fierce Pharma：美瑞协议药品关税上限 15%', 'https://www.fiercepharma.com/pharma/trump-relents-swiss-tariffs-knocking-rate-pharmaceuticals-and-other-goods-down-15'],
  etfx: ['WealthManagement：Global X 清盘多只国家 ETF', 'https://www.wealthmanagement.com/etfs/global-x-closures-show-the-flipside-of-the-etf-boom'],
};

// Global backdrop for the overview pane: [variable, current state, what it means for opportunities, source keys]
export const GLOBAL = [
  ['霍尔木兹与油价', '2 月 28 日美以对伊朗开战后海峡通行严重受阻，至今未达成复航协议；10 月 7 日布伦特约 101 美元，9 月底一度超过 107 美元',
    '能源进口国（日、韩、印、欧洲、东南亚、东非）承压；海峡外产油国（挪威、巴西、加拿大、圭亚那、哈萨克斯坦）受益', ['hormuz', 'gulf80']],
  ['海湾产能', '9 月海湾（除伊朗）石油出口恢复至战前约 80%，但只有约 6 成经海峡，其余靠管道与绕行；卡塔尔 LNG 产能约 17% 损毁数年',
    'LNG 价格中枢上移，美、澳、加 LNG 出口商议价力增强', ['gulf80', 'rasl']],
  ['美联储', '9 月 16 日加息 25 bp 至 3.75–4.00%，为 2023 年以来首次加息；点阵图预示年内再加一次',
    '美元走强、新兴市场融资成本上升；高估值成长股承压', ['fed']],
  ['美国关税', 'IEEPA 关税 2 月被最高法院判违法；122 条款 7 月 24 日到期后，改为对 60 个经济体征收 10–12.5% 的 301 条款关税',
    '税率低于 2025 年峰值，但法律路径仍不稳定；对美出口依赖度高的经济体波动最大', ['s301']],
  ['AI 资本开支', '四大云厂商 2026 年资本开支指引约 6,350–6,650 亿美元，较 2025 年约 +70%；上半年 IT 板块 +27%',
    '台湾、韩国、日本、荷兰的芯片与设备链，及中国光模块、东南亚数据中心最受益', ['capex', 'fid', 'hynix']],
  ['金属', '铜价约 6.6 美元/磅，接近纪录、同比 +32%；金价约 4,110 美元，较 1 月 5,608 美元高点回落约 27%',
    '智利、秘鲁、澳大利亚铜矿受益；金矿利润仍处高位', ['metals']],
  ['全球增长', 'IMF 4 月预测 2026 年全球增速 3.1%，7 月下调至 3.0%；AI 投资部分抵消战争拖累',
    '增长分化加大：台湾、越南、印度、海峡外产油国领先，海湾受损国与欧洲落后', ['imf4', 'imf7']],
];

// Headline tiles for the overview pane: [label, value, unit, note]
export const TILES = [
  ['布伦特原油', '101', '美元/桶', '2026-10-07'],
  ['联邦基金利率', '3.75–4.00', '%', '2026-09-16 加息'],
];

const P = {};

// ---------------------------------------------------------------- 北美
P.USA = {
  thesis: 'AI 资本开支仍是全球最大的单一增长引擎，但美联储 9 月重新加息、就业转弱、关税法律路径不稳，估值与集中度风险同步上升。',
  hot: [
    ['AI 数据中心', 'ai', '四大云厂商 2026 年资本开支指引约 6,350–6,650 亿美元，较 2025 年的 3,810 亿美元增长约 70%'],
    ['半导体与存储', 'semi', '上半年 MSCI IMI 信息技术指数 +27%，同期标普 500 +10%（Fidelity）'],
    ['发电与电网', 'power', '数据中心用电占比从 2023 年 4.4% 升至 2028 年 6.7–12%（LBNL）'],
  ],
  mature: [
    ['云计算与软件', 'digital', 'AWS、Azure、Google Cloud 合计约占全球云基础设施 6 成（Synergy 2024）'],
    ['资本市场', 'fin', '美股约占 MSCI 全球指数市值 6 成以上'],
    ['创新药', 'health', 'GLP-1 减重药使礼来成为全球市值最高的药企'],
    ['页岩油气与 LNG', 'energy', '2023 年起为全球最大 LNG 出口国，卡塔尔停产后份额继续上升'],
  ],
  growth: [
    ['电网设备与储能', 'power', '变压器、燃气轮机交付周期拉长到数年，订单可见度高'],
    ['LNG 出口扩产', 'energy', 'Plaquemines、Corpus Christi 三期等新产能陆续爬坡'],
    ['国防与弹药补库', 'defense', '对伊朗作战消耗导弹与防空弹药，补库需求持续数年'],
  ],
  assets: [
    ['idx', '先锋标普 500 ETF', 'VOO', '核心底仓；科技权重约三分之一'],
    ['sec', 'VanEck 半导体 ETF', 'SMH', '集中持有英伟达、台积电 ADR、博通等 AI 芯片链'],
    ['sec', '公用事业精选 ETF', 'XLU', '数据中心用电受益者；利率上行时承压'],
    ['bond', 'iShares 0–3 月国债 ETF', 'SGOV', '联邦基金利率 3.75–4.00%，现金类收益接近 4%'],
    ['qdii', '博时标普 500 ETF', '513500', '人民币通道；注意场内溢价'],
    ['stk', '英伟达', 'NVDA', 'AI 加速器龙头'],
    ['stk', 'Vistra', 'VST', '燃气 + 核电发电商，直接受益电价'],
    ['stk', '礼来', 'LLY', 'GLP-1 全球份额领先'],
  ],
  risks: [
    '美联储 9 月 16 日加息至 3.75–4.00%，点阵图预示年内再加一次',
    '9 月非农仅新增 2.9 万、失业率 4.2%，通胀高于工资增速已 5 个月',
    'IEEPA 关税 2 月被最高法院判违法，122 条款 7 月到期后改用 301 条款（对 60 个经济体 10–12.5%），仍有诉讼',
    'AI 资本开支占收入 45–57%，一旦放缓，高度集中的指数首当其冲',
  ],
  watch: '11 月 3 日中期选举；10 月下旬科技巨头三季报的资本开支指引；12 月 FOMC',
  src: ['fed', 'bls', 's301', 'fid', 'capex', 'lbnl', 'imf7'],
};

P.CAN = {
  thesis: '战时的“安全资源国”：油砂经 TMX 管道直达太平洋、LNG Canada 投产爬坡，另有铀、钾肥与关键矿产；短板是约四分之三出口依赖美国。',
  hot: [
    ['LNG 出口', 'energy', 'LNG Canada 2025 年投产，卡塔尔停产后亚洲买家加速转向北美气源'],
    ['铀', 'mining', '阿萨巴斯卡盆地是全球品位最高的铀矿区，Cameco 为西方最大铀企'],
  ],
  mature: [
    ['油砂与原油', 'energy', '全球第四大产油国；TMX 管道 2024 年投运后可直接出口亚洲'],
    ['银行', 'fin', '五大行寡头格局，长期 ROE 稳定'],
    ['钾肥', 'agri', '全球最大钾肥生产国（USGS）'],
  ],
  growth: [
    ['关键矿产', 'mining', '镍、锂、石墨与稀土项目获联邦与省级补贴'],
    ['AI 与软件', 'ai', 'Cohere、Shopify 等；多伦多与蒙特利尔是 AI 研究重镇'],
  ],
  assets: [
    ['idx', 'iShares MSCI Canada ETF', 'EWC', '银行 + 能源 + 矿业'],
    ['stk', '加拿大自然资源', 'CNQ', '油砂龙头，长寿命低递减资产'],
    ['stk', 'Cameco', 'CCJ', '铀矿与燃料服务'],
    ['stk', 'Nutrien', 'NTR', '钾肥与农资零售'],
    ['stk', '加拿大皇家银行', 'RY', '最大银行'],
    ['stk', 'Shopify', 'SHOP', '电商 SaaS'],
  ],
  risks: ['约四分之三商品出口去美国，USMCA 审查结果直接影响汽车与能源', '房价与家庭负债率高', '油价回落时财政与汇率同向承压'],
  watch: 'USMCA 年度审查进展；加拿大央行 10 月下旬议息',
  src: ['usmca', 'usgs', 'imf4'],
};

P.MEX = {
  gl: [1.4, 'Banxico 10 月调查'],
  thesis: '近岸外包降温：USMCA 7 月 1 日联合审查未获美方续约、转入年度审查，2026 年增速预期仅约 1.4%；AI 服务器组装和旅游是少数亮点。',
  hot: [
    ['AI 服务器组装', 'ai', '鸿海在瓜达拉哈拉建设英伟达 GB 系列服务器工厂'],
    ['旅游与机场', 'tourism', '坎昆、洛斯卡沃斯客流稳定，机场运营商现金流强'],
  ],
  mature: [
    ['汽车与零部件', 'mfg', '美国最大汽车零部件来源国；原产地规则是 USMCA 谈判焦点'],
    ['白银与铜', 'mining', '全球最大白银生产国（USGS）'],
    ['侨汇', 'fin', '侨汇是仅次于汽车的外汇来源'],
  ],
  growth: [
    ['工业地产', 'infra', '北部边境州工业园空置率低，FIBRA 租金上涨'],
    ['电子与电气设备', 'semi', '服务器、电源与线束随北美数据中心建设扩产'],
  ],
  assets: [
    ['idx', 'iShares MSCI Mexico ETF', 'EWW', '必需消费 + 银行 + 矿业'],
    ['stk', '墨西哥集团', 'GMEXICOB', '南方铜业母公司，兼营铁路'],
    ['stk', '沃尔玛墨西哥', 'WALMEX', '零售龙头'],
    ['stk', 'Banorte', 'GFNORTEO', '本土最大银行之一'],
    ['stk', '东南机场集团', 'ASR', '坎昆机场运营商'],
    ['reit', 'Fibra Uno', 'FUNO11', '最大 FIBRA，工业与商业物业'],
  ],
  risks: ['USMCA 审查可能拖入 2027 年，汽车原产地与钢铝是焦点', '比索约 18.2，市场预期年底 17.5', '司法改革与治安影响外资信心'],
  watch: '美墨 USMCA 双边谈判；墨西哥央行 11 月议息（当前 6.50%）',
  src: ['usmca', 'mex', 'usgs'],
};

// ---------------------------------------------------------------- 拉美
P.BRA = {
  thesis: '大选行情：10 月 4 日首轮弗拉维奥·博索纳罗领先，Ibovespa 次日 +7.7% 收于 206,912 点新高、外资单日净流入创纪录；10 月 25 日决选前后是波动最大的窗口。',
  hot: [
    ['大选与财政重定价', 'fin', '市场押注更紧的财政，长端利率单日最多下行 133 bp，雷亚尔升至约 5.00'],
    ['盐下层原油', 'energy', '巴西原油不经霍尔木兹，油价 100 美元附近直接受益'],
  ],
  mature: [
    ['农业综合企业', 'agri', '大豆、咖啡、牛肉、橙汁、蔗糖出口均为全球第一'],
    ['铁矿石', 'mining', '淡水河谷为全球前两大铁矿石生产商'],
    ['支线客机', 'defense', '巴航工业为全球最大 150 座以下客机制造商'],
  ],
  growth: [
    ['金融科技', 'digital', 'Pix 即时支付普及，Nubank 为拉美最大数字银行'],
    ['生物燃料', 'energy', '乙醇与生物柴油掺混比例持续提高'],
  ],
  assets: [
    ['idx', 'iShares MSCI Brazil ETF', 'EWZ', '银行 + 资源，选举弹性最大'],
    ['qdii', '易方达巴西 ETF', '520870', '人民币通道，跟踪 Ibovespa'],
    ['bond', '巴西通胀挂钩国债 NTN-B', '—', 'Selic 13.75%，实际利率处全球高位'],
    ['stk', '巴西石油', 'PBR', '盐下层油田'],
    ['stk', '淡水河谷', 'VALE', '铁矿石与镍铜'],
    ['stk', '伊塔乌联合银行', 'ITUB', '最大私营银行'],
    ['stk', '巴航工业', 'EMBJ', '2025 年 11 月起代码由 ERJ 改为 EMBJ'],
  ],
  risks: ['决选不确定：预测市场给弗拉维奥约 83–85%，但首轮差距仅约 1.9 个百分点', '财政纪律能否兑现', '雷亚尔与利率对政治新闻高度敏感'],
  watch: '10 月 25 日总统决选；11 月 4 日 Copom（市场预期再降 25 bp）',
  src: ['bra', 'imf7'],
};

P.ARG = {
  gl: [2.7, '8 月市场共识'],
  thesis: '米莱改革进入慢增长阶段：2026 年增速预期从 3.5% 下调至 1.5–2.7%，通胀同比仍 33.5%；Vaca Muerta 页岩油和 RIGI 矿业项目是确定性最高的方向。',
  hot: [
    ['Vaca Muerta 页岩油', 'energy', '原油产量与出口创新高，油价高位放大收益'],
    ['锂与铜', 'mining', '大型投资激励制度（RIGI）锁定 30 年税收与外汇条件'],
  ],
  mature: [
    ['大豆压榨', 'agri', '豆粕、豆油出口全球第一'],
    ['牛肉与谷物', 'agri', '玉米、小麦、牛肉出口位居全球前列'],
  ],
  growth: [
    ['油气出口基建', 'energy', '输油管道与 LNG 出口项目推进'],
    ['电商与金融科技', 'digital', '美客多发源地，数字支付渗透率高'],
  ],
  assets: [
    ['idx', 'Global X MSCI Argentina ETF', 'ARGT', '含美客多等海外上市阿企'],
    ['stk', 'YPF', 'YPF', '国家石油，Vaca Muerta 最大作业者'],
    ['stk', 'Vista Energy', 'VIST', '纯页岩油标的'],
    ['stk', 'Galicia 金融集团', 'GGAL', '最大私营银行'],
    ['stk', '美客多', 'MELI', '拉美电商与支付'],
    ['bond', '阿根廷美元主权债', '—', '国家风险约 586 bp，高收益高波动'],
  ],
  risks: ['经济放缓、美国再援助传闻反映外汇压力', '月通胀 1.7%、同比 33.5%', '2027 年大选前政策连续性'],
  watch: '国家风险能否回落到 500 bp 以下；IMF 项目审查',
  src: ['arg', 'imf4'],
};

P.CHL = {
  gl: [2.0, '央行区间 1.5–2.5% 中值'],
  thesis: '铜价接近历史高位 + 卡斯特政府亲矿业改革：铜出口收入 433 亿美元（+19.3%），目标 4–5 年内产量达 600 万吨/年；国内需求弱、失业率 5 年高位。',
  hot: [
    ['铜', 'mining', '约占全球铜供应 23.8%（S&P 2024）；铜价约 6.6 美元/磅，同比 +32%'],
    ['锂', 'mining', '约占全球锂产量 18.9%（S&P 2024），国家锂战略推动 Codelco 入股'],
  ],
  mature: [
    ['铜矿开采', 'mining', 'Codelco、Escondida 为全球最大铜矿与铜企之一'],
    ['三文鱼与水果', 'agri', '全球第二大三文鱼生产国、最大车厘子出口国'],
  ],
  growth: [
    ['太阳能与绿氢', 'power', '阿塔卡马沙漠光照资源全球最好'],
    ['数据中心', 'ai', '圣地亚哥为拉美主要云区域之一'],
  ],
  assets: [
    ['idx', 'iShares MSCI Chile ETF', 'ECH', '铜 + 银行 + 公用事业'],
    ['sec', 'Global X 铜矿 ETF', 'COPX', '全球铜矿股组合'],
    ['stk', 'SQM', 'SQM', '锂与特种化肥'],
    ['stk', '安托法加斯塔', 'ANTO', '伦交所上市智利铜矿'],
    ['stk', '智利银行', 'BCH', '高 ROE 银行'],
  ],
  risks: ['铜价回落（10 月较近月高点回落约 2%）', 'Codelco 产量审计：可能存在重复计算', 'Centinela 等矿山劳资纠纷'],
  watch: '矿业许可简化立法；2027 年预算支出增速 1.5%',
  src: ['chl', 'metals', 'usgs'],
};

P.COL = {
  thesis: '政权右转：亲投资的德拉埃斯普列拉 8 月 7 日就任；油气与煤炭仍占出口大头但储量在降，勘探许可松绑与铜矿开发是新变量。',
  hot: [
    ['油气勘探许可', 'energy', '新政府承诺放松前任冻结的新勘探合同'],
    ['铜矿开发', 'mining', '安蒂奥基亚等地铜金项目等待许可'],
  ],
  mature: [
    ['原油与煤炭', 'energy', '能源燃料是最大出口门类'],
    ['咖啡与鲜花', 'agri', '全球第二大鲜切花出口国，阿拉比卡咖啡主要产地'],
  ],
  growth: [
    ['旅游', 'tourism', '国际游客数连年创新高'],
    ['风电与太阳能', 'power', '瓜希拉省风电项目'],
  ],
  assets: [
    ['idx', 'Global X MSCI Colombia ETF', 'COLO', '2025 年 6 月起代码由 GXG 改为 COLO'],
    ['stk', '哥伦比亚国家石油', 'EC', '国有油企，高股息'],
    ['stk', 'Grupo Cibest（原 Bancolombia）', 'CIB', '最大银行集团'],
  ],
  risks: ['油气储采比下降', '治安与武装团体', '财政赤字高'],
  watch: '新政府首份油气与矿业政策',
  src: ['col', 'etfx'],
};

P.PER = {
  thesis: '全球第三大铜生产国（约占 11.8%）：藤森庆子 7 月 28 日就任、政策亲矿业；Tía María 铜矿重获许可，2027 年起年产约 12 万吨。',
  hot: [
    ['铜', 'mining', '约占全球铜产量 11.8%（S&P 2024）'],
    ['黄金', 'mining', '金价仍在 4,100 美元/盎司上方，中小金矿现金流充裕'],
  ],
  mature: [
    ['铜金银锌采矿', 'mining', '矿产品约占出口 6 成'],
    ['高价值农产品', 'agri', '全球最大蓝莓出口国，牛油果、葡萄出口居前'],
  ],
  growth: [
    ['港口物流', 'infra', '中远海运钱凯港 2024 年 11 月开港，直连亚洲'],
    ['新矿山项目', 'mining', 'Tía María 等项目重启'],
  ],
  assets: [
    ['idx', 'iShares MSCI Peru and Global Exposure ETF', 'EPU', '矿业 + 银行'],
    ['stk', '秘鲁信贷银行', 'BAP', '最大金融集团'],
    ['stk', '南方铜业', 'SCCO', '低成本铜矿'],
    ['stk', 'Buenaventura', 'BVN', '金银矿'],
  ],
  risks: ['政局更迭频繁', '非法采矿与社区冲突', '10 月地方选举后的项目许可'],
  watch: '新政府矿业许可节奏；Tía María 建设进度',
  src: ['per', 'usgs'],
};

P.GUY = {
  thesis: '全球增长最快的石油新贵：上半年日均产油约 90.2 万桶（2025 年 71.6 万），年底 Uaru 投产后将突破 100 万桶；本地资本市场极浅，需借道油公司参与。',
  hot: [
    ['原油', 'energy', 'Stabroek 区块 4 艘 FPSO 在产，Uaru（25 万桶/日）年内投产'],
    ['基建', 'infra', '石油收入投向公路、桥梁、港口与医院'],
  ],
  mature: [
    ['黄金与铝土矿', 'mining', '石油之前的主要出口'],
    ['大米与蔗糖', 'agri', '加勒比地区主要粮食出口国'],
  ],
  growth: [
    ['天然气发电', 'power', 'Gas-to-Energy 项目把伴生气引上岸发电'],
    ['油服与物流', 'energy', '岸基补给、港口与人员服务需求快速增长'],
  ],
  assets: [
    ['stk', '埃克森美孚', 'XOM', 'Stabroek 作业者，持股 45%'],
    ['stk', '雪佛龙', 'CVX', '2025 年并购赫斯获得 30%'],
    ['stk', '中国海油', '0883.HK / 600938', '持股 25%'],
    ['idx', '（无本地可投资指数）', '—', '只能通过上述油公司间接参与'],
  ],
  risks: ['与委内瑞拉的埃塞奎博领土争端', '单一商品依赖与治理风险', '人口少、通胀与工资压力'],
  watch: 'Uaru 投产时间（年内）',
  src: ['guy', 'imf4'],
};

// ---------------------------------------------------------------- 欧洲
P.DEU = {
  thesis: '财政大转向但落地慢：5,000 亿欧元基建基金 2026 年预算到 4 月仅拨付 28%，国防预算 1,172 亿欧元（2029 年 1,620 亿）；高气价与汽车业拖累，IMF 7 月预测增速仅 0.7%。',
  hot: [
    ['国防', 'defense', '欧盟 2026 年防务支出预计 4,540 亿欧元；但莱茵金属一年跌约 52%，订单兑现慢于预期'],
    ['燃气轮机与电网', 'power', '西门子能源燃气轮机订单受全球 AI 数据中心拉动'],
  ],
  mature: [
    ['汽车', 'ev', '中国竞争与美国关税双重挤压'],
    ['机械与工业软件', 'mfg', '西门子、SAP 为全球工业数字化龙头'],
    ['化工', 'energy', '巴斯夫等受高气价削弱竞争力'],
  ],
  growth: [
    ['基建与建材', 'infra', '12 年期 5,000 亿欧元专项基金，铁路投资创纪录'],
    ['工业 AI', 'ai', '工业软件与自动化 AI 化'],
  ],
  assets: [
    ['idx', 'iShares MSCI Germany ETF', 'EWG', 'DAX 大盘'],
    ['qdii', '华安德国 DAX ETF', '513030', '人民币通道；近一年约 −7%'],
    ['stk', 'SAP', 'SAP', '企业软件'],
    ['stk', '西门子能源', 'ENR', '燃气轮机与电网'],
    ['stk', '西门子', 'SIE', '工业自动化'],
    ['stk', '莱茵金属', 'RHM', '弹药与装甲，波动大'],
  ],
  risks: ['TTF 气价约 72 欧元/MWh，寒潮或升至 100', '基建基金拨付缓慢：107 个 2026 年里程碑到 5 月仅完成 26 个', '汽车业裁员与对华竞争'],
  watch: '冬季气价；11 月 5 日莱茵金属三季报',
  src: ['defund', 'eda', 'eugas', 'imf7'],
};

P.GBR = {
  thesis: '富时 100 年内多次创新高（约 8 成收入来自海外），能源、国防、医药、银行占比高的“旧经济”指数在战时反而受益；英国本土增长疲弱（IMF 7 月 1.0%）。',
  hot: [
    ['油气巨头', 'energy', '壳牌、BP 受益于 100 美元附近油价'],
    ['国防与航空发动机', 'defense', 'BAE 系统、罗尔斯·罗伊斯订单饱满'],
  ],
  mature: [
    ['金融服务', 'fin', '伦敦约占全球外汇交易 38%（BIS 2022）'],
    ['医药', 'health', '阿斯利康为欧洲市值最大的公司之一'],
    ['矿业', 'mining', '力拓、嘉能可在伦敦上市'],
  ],
  growth: [
    ['小型核电', 'power', '罗尔斯·罗伊斯 SMR 2025 年中标英国首个项目'],
    ['金融科技', 'digital', 'Revolut、Wise 等'],
  ],
  assets: [
    ['idx', 'iShares MSCI United Kingdom ETF', 'EWU', '高股息、低估值'],
    ['stk', '阿斯利康', 'AZN', '肿瘤与罕见病'],
    ['stk', '壳牌', 'SHEL', 'LNG 交易龙头'],
    ['stk', 'BAE 系统', 'BA.', '欧洲最大防务公司'],
    ['stk', '罗尔斯·罗伊斯', 'RR.', '宽体发动机 + SMR'],
    ['bond', '英国国债', 'Gilts', '英国央行 2 月维持 3.75%'],
  ],
  risks: ['本土增长弱、财政空间小', '能源价格推高通胀', '指数行业结构偏旧，缺少科技权重'],
  watch: '11 月秋季预算',
  src: ['ftse', 'imf7'],
};

P.FRA = {
  thesis: '航空航天与核电是战时优势：约三分之二电力来自核电，抵御气价冲击能力强于德国；财政赤字与政治不稳定压制估值，IMF 7 月预测增速 0.6%。',
  hot: [
    ['航空航天', 'defense', '空客、赛峰订单积压创纪录'],
    ['数据中心电力设备', 'power', '施耐德电气受益于全球数据中心配电与冷却需求'],
  ],
  mature: [
    ['奢侈品', 'consumer', 'LVMH、爱马仕、开云；中国需求疲软'],
    ['核电', 'power', '57 座反应堆，约三分之二发电量'],
    ['油气', 'energy', '道达尔能源 LNG 组合全球第三'],
  ],
  growth: [
    ['国防电子与战机', 'defense', '泰雷兹、达索（阵风战机出口）'],
    ['生成式 AI', 'ai', 'Mistral AI 为欧洲估值最高的大模型公司'],
  ],
  assets: [
    ['idx', 'iShares MSCI France ETF', 'EWQ', '奢侈品 + 工业 + 能源'],
    ['qdii', '华安法国 CAC40 ETF', '513080', '人民币通道'],
    ['stk', '空客', 'AIR', '民机双寡头之一'],
    ['stk', '赛峰', 'SAF', 'LEAP 发动机'],
    ['stk', '施耐德电气', 'SU', '数据中心电力'],
    ['stk', '泰雷兹', 'HO', '防务电子'],
  ],
  risks: ['财政赤字与评级下调', '政府更迭频繁，2027 年总统大选', '奢侈品对中国消费依赖'],
  watch: '2027 年预算表决',
  src: ['imf7', 'eda'],
};

P.ITA = {
  thesis: '银行与国防双引擎：意大利银行业高利润与并购整合，莱昂纳多受益欧洲重整军备；但 IMF 预测 2026 年增速仅约 0.5%，公共债务居欧元区第二。',
  hot: [
    ['银行并购', 'fin', '裕信、联合圣保罗利润处历史高位，行业整合进行中'],
    ['国防', 'defense', '莱昂纳多直升机、防务电子与航天'],
  ],
  mature: [
    ['奢侈品与时尚', 'consumer', 'Prada、Moncler、法拉利'],
    ['旅游', 'tourism', '欧洲前三大旅游目的地'],
    ['机械', 'mfg', '包装与工业机械出口强'],
  ],
  growth: [
    ['航天与卫星', 'defense', '欧洲航天计划主要参与方'],
    ['可再生能源与电网', 'power', '国家电力公司 Enel 全球化布局'],
  ],
  assets: [
    ['idx', 'iShares MSCI Italy ETF', 'EWI', '银行权重高'],
    ['stk', '法拉利', 'RACE', '定价权最强的奢侈品牌之一'],
    ['stk', '裕信银行', 'UCG', '资本回报高'],
    ['stk', '莱昂纳多', 'LDO', '防务龙头'],
    ['stk', '埃尼', 'ENI', '油气与 LNG'],
  ],
  risks: ['公共债务高，利率上行抬升付息', '能源进口依赖', '人口老龄化与低增长'],
  watch: '欧洲央行利率路径；意大利国债利差',
  src: ['imf4', 'eda'],
};

P.ESP = {
  thesis: '欧元区大国中增长最快（IMF 2026 年 2.1%）：旅游创纪录、可再生电力占比高、银行盈利强，对中东能源依赖相对较低。',
  hot: [
    ['旅游', 'tourism', '2024 年国际游客 9,380 万人次创纪录'],
    ['银行', 'fin', '桑坦德、BBVA 利润创新高'],
  ],
  mature: [
    ['服装零售', 'consumer', 'Inditex（Zara）为全球最大服装零售商'],
    ['基建与工程', 'infra', 'ACS、Ferrovial 全球承包与特许经营'],
    ['橄榄油与农业', 'agri', '全球约 4 成以上橄榄油产量'],
  ],
  growth: [
    ['可再生能源', 'power', '风光发电占比过半，电价在欧洲偏低'],
    ['数据中心', 'ai', '马德里、阿拉贡吸引超大规模云厂商投资'],
  ],
  assets: [
    ['idx', 'iShares MSCI Spain ETF', 'EWP', '银行 + 公用事业'],
    ['stk', '伊维尔德罗拉', 'IBE', '全球最大可再生能源公用事业之一'],
    ['stk', '桑坦德银行', 'SAN', '欧美拉美布局'],
    ['stk', 'Inditex', 'ITX', 'Zara 母公司'],
    ['stk', 'ACS', 'ACS', '旗下 Turner 承建美国数据中心'],
    ['stk', 'Aena', 'AENA', '机场运营'],
  ],
  risks: ['住房短缺与政治碎片化', '旅游过度与地方限制', '电网约束（2025 年 4 月大停电）'],
  watch: '旅游旺季数据；2027 年预算',
  src: ['imf4'],
};

P.NLD = {
  thesis: 'AI 半导体设备链的欧洲支点：ASML 是全球唯一 EUV 光刻机供应商，ASM International、BESI 分别卡位原子层沉积和混合键合。',
  hot: [
    ['半导体设备', 'semi', 'ASML 垄断 EUV；先进制程扩产直接拉动订单'],
    ['先进封装', 'semi', 'BESI 混合键合设备用于 HBM 与芯粒'],
  ],
  mature: [
    ['港口物流', 'infra', '鹿特丹为欧洲最大港口'],
    ['农业食品', 'agri', '全球第二大农产品出口国（按金额）'],
    ['支付与银行', 'fin', 'Adyen、ING'],
  ],
  growth: [
    ['海上风电', 'power', '北海风电规划装机持续上调'],
    ['原子层沉积', 'semi', 'ASM International 受益于 GAA 晶体管'],
  ],
  assets: [
    ['idx', 'iShares MSCI Netherlands ETF', 'EWN', 'ASML 权重高'],
    ['stk', 'ASML', 'ASML', 'EUV 光刻机'],
    ['stk', 'ASM International', 'ASM', 'ALD 设备'],
    ['stk', 'BE Semiconductor', 'BESI', '混合键合'],
    ['stk', 'ING', 'INGA', '高分红银行'],
  ],
  risks: ['对华出口管制收紧', '能源价格', '半导体设备周期'],
  watch: '10 月中旬 ASML 三季报订单',
  src: ['imf4'],
};

P.CHE = {
  thesis: '医药、财富管理与精密制造的避险组合；美国药品关税是最大不确定性（美瑞协议设 15% 上限，签 MFN 定价协议的企业可豁免），瑞郎走强压制出口。',
  hot: [
    ['医药', 'health', '药品约占对美商品出口近一半，关税谈判牵动全市场'],
    ['电气化与自动化', 'power', 'ABB 电气业务受益数据中心与电网投资'],
  ],
  mature: [
    ['财富管理', 'fin', 'UBS 为全球最大财富管理机构之一'],
    ['钟表与奢侈品', 'consumer', 'Richemont、斯沃琪'],
    ['食品', 'agri', '雀巢为全球最大食品公司'],
  ],
  growth: [
    ['医疗科技', 'health', '精密医疗器械与诊断'],
    ['避险资金流入', 'fin', '战时瑞郎与瑞士资产受青睐'],
  ],
  assets: [
    ['idx', 'iShares MSCI Switzerland ETF', 'EWL', '医药 + 食品 + 金融'],
    ['stk', '罗氏', 'ROG', '肿瘤与诊断'],
    ['stk', '诺华', 'NOVN', '创新药'],
    ['stk', 'ABB', 'ABBN', '电气化'],
    ['stk', '瑞银', 'UBSG', '财富管理'],
  ],
  risks: ['美国 301 条款对瑞士商品 12.5%，药品另有 232 条款框架', '瑞郎升值与通缩', '银行资本新规'],
  watch: '美国药品 232 关税执行细则',
  src: ['che', 's301'],
};

P.SWE = {
  thesis: '北约前线的国防工业 + 高质量工业股：萨博订单创纪录，阿特拉斯·科普柯等工业设备商全球领先。',
  hot: [
    ['国防', 'defense', '萨博鹰狮战机、卡尔·古斯塔夫与雷达订单饱满'],
    ['电网与电气设备', 'power', '北欧电网投资与工业电气化'],
  ],
  mature: [
    ['工业设备', 'mfg', '阿特拉斯·科普柯、山特维克、SKF'],
    ['卡车与工程机械', 'mfg', '沃尔沃集团'],
    ['森林工业', 'agri', '纸浆与木材'],
  ],
  growth: [
    ['音乐流媒体', 'digital', 'Spotify 全球最大音乐流媒体'],
    ['私募股权', 'fin', 'EQT、Investor AB'],
  ],
  assets: [
    ['idx', 'iShares MSCI Sweden ETF', 'EWD', '工业 + 金融'],
    ['stk', '萨博', 'SAAB B', '防务'],
    ['stk', '阿特拉斯·科普柯', 'ATCO A', '压缩机与真空设备（含半导体用）'],
    ['stk', 'Investor AB', 'INVE B', '瓦伦堡家族控股平台'],
    ['stk', 'Spotify', 'SPOT', '流媒体'],
  ],
  risks: ['克朗波动', '房地产与浮动利率房贷', '出口周期'],
  watch: '瑞典央行利率决议',
  src: ['eda'],
};

P.NOR = {
  thesis: '欧洲能源危机的受益者：挪威是欧盟最大的管道天然气来源，TTF 约 72 欧元/MWh；约 2 万亿美元的主权基金为财政托底。',
  hot: [
    ['天然气出口', 'energy', '欧盟进口天然气约 3 成来自挪威'],
    ['防空系统', 'defense', '康斯伯格 NASAMS 防空系统需求激增'],
  ],
  mature: [
    ['油气', 'energy', 'Equinor、Aker BP'],
    ['三文鱼养殖', 'agri', '全球约一半养殖大西洋三文鱼'],
    ['航运', 'ship', '油轮、LNG 船船东集中'],
  ],
  growth: [
    ['碳捕集与封存', 'power', 'Northern Lights 项目已投运'],
    ['海上风电', 'power', '浮式风电示范'],
  ],
  assets: [
    ['idx', 'iShares MSCI Norway ETF', 'ENOR', '能源 + 金融 + 海产'],
    ['stk', 'Equinor', 'EQNR', '欧洲气价直接受益'],
    ['stk', '康斯伯格', 'KOG', '防务与海事'],
    ['stk', '美威', 'MOWI', '三文鱼'],
    ['stk', 'DNB', 'DNB', '最大银行'],
  ],
  risks: ['油气价格回落', '克朗与油价同向波动', '三文鱼资源税'],
  watch: '冬季气价与库存',
  src: ['eugas'],
};

P.DNK = {
  gl: [3.0, '丹斯克银行 3 月'],
  thesis: '诺和诺德既是增长引擎也是最大风险：上半年医药业“超常增长”带动丹麦增速约 3%，但公司销售放缓，2026 年回购均价约 280 丹麦克朗，不到 2024 年高点的三成。',
  hot: [
    ['GLP-1 减重药', 'health', '对美协议扩大医保覆盖，上半年在美销售与生产大增'],
    ['航运', 'ship', '马士基受益于红海与霍尔木兹绕航推高运价'],
  ],
  mature: [
    ['医药', 'health', '诺和诺德、灵北、Genmab'],
    ['风电', 'power', '维斯塔斯为全球最大风机商之一'],
    ['物流', 'ship', 'DSV 收购 DB Schenker 后跻身全球货代前列'],
  ],
  growth: [
    ['酶与生物解决方案', 'health', 'Novonesis'],
    ['海上风电', 'power', '欧洲海上风电开发'],
  ],
  assets: [
    ['idx', 'iShares MSCI Denmark ETF', 'EDEN', '诺和诺德权重高'],
    ['stk', '诺和诺德', 'NOVO B', '估值已大幅回落'],
    ['stk', '马士基', 'MAERSK B', '集运周期股'],
    ['stk', 'DSV', 'DSV', '货代'],
    ['stk', '维斯塔斯', 'VWS', '风机'],
  ],
  risks: ['礼来竞争与美国药价压力', '指数集中于单一公司', '航运运价回落'],
  watch: '11 月诺和诺德三季报',
  src: ['dnk', 'novo'],
};

P.POL = {
  gl: [3.5, '欧盟委员会'],
  thesis: '欧盟增长最快的大国之一：二季度 GDP +3.9%、投资 +8.4%；国防支出约占 GDP 4.7%（北约最高），欧盟复苏资金 2026 年达峰。',
  hot: [
    ['国防', 'defense', '国防支出约占 GDP 4.7%，大量采购韩国 K2/K9 与美国装备'],
    ['欧盟资金基建', 'infra', 'KPO 复苏资金 2026 年进入拨付高峰'],
  ],
  mature: [
    ['银行', 'fin', 'PKO BP、PZU'],
    ['零售', 'consumer', 'Dino、Żabka、Allegro'],
    ['汽车零部件与家电', 'mfg', '德国供应链近岸基地'],
  ],
  growth: [
    ['核电与能源转型', 'power', '首座核电站规划推进'],
    ['游戏', 'digital', 'CD Projekt'],
  ],
  assets: [
    ['idx', 'iShares MSCI Poland ETF', 'EPOL', '银行权重高'],
    ['stk', 'PKO BP', 'PKO', '最大银行'],
    ['stk', 'Dino Polska', 'DNP', '县域超市'],
    ['stk', 'Allegro', 'ALE', '电商'],
    ['stk', 'CD Projekt', 'CDR', '游戏'],
  ],
  risks: ['财政赤字 6.8%，债务率升至 65.1%', '能源价格', '欧盟资金 2026 年后回落'],
  watch: '欧盟资金拨付；波兰央行降息节奏',
  src: ['pol', 'eda'],
};

P.IRL = {
  thesis: '跨国公司总部与医药生产基地：企业税收高度集中于少数美国科技与药企，美国药品关税和税改是最大风险。',
  hot: [
    ['GLP-1 与生物药生产', 'health', '礼来等在爱尔兰扩建原料药与制剂产能'],
    ['数据中心', 'ai', '约占全国用电 21%（CSO 2023），电网接入受限'],
  ],
  mature: [
    ['医药化工出口', 'health', '化工医药为最大出口门类'],
    ['飞机租赁', 'fin', '全球过半租赁飞机由爱尔兰公司管理'],
    ['科技欧洲总部', 'digital', '苹果、谷歌、Meta 欧洲总部所在地'],
  ],
  growth: [
    ['航空', 'tourism', '瑞安航空为欧洲最大航司'],
    ['建材', 'infra', 'Kingspan 保温板与数据中心围护'],
  ],
  assets: [
    ['idx', 'iShares MSCI Ireland ETF', 'EIRL', '工业 + 银行 + 航空'],
    ['stk', '瑞安航空', 'RYA', '低成本航空'],
    ['stk', 'AerCap', 'AER', '全球最大飞机租赁商'],
    ['stk', 'Kingspan', 'KRX', '建材'],
    ['stk', 'AIB 集团', 'A5G', '银行'],
  ],
  risks: ['美国药品关税与利润回流', '企业税收集中', '住房短缺'],
  watch: '美国药品 232 关税执行',
  src: ['che'],
};

P.TUR = {
  thesis: '高通胀下的军工与旅游亮点：9 月通胀 29.7%，政府将年末预期上调至 28.4%；无人机与防务电子出口持续扩张。',
  hot: [
    ['国防军工', 'defense', 'Baykar 无人机、Aselsan 电子战与防空出口'],
    ['旅游', 'tourism', '年接待游客超 6,000 万人次，居全球前列'],
  ],
  mature: [
    ['汽车与白色家电', 'mfg', '欧洲主要白电与轻型商用车生产基地'],
    ['纺织服装', 'mfg', '欧洲近岸供应'],
  ],
  growth: [
    ['电动车', 'ev', '国产品牌 Togg；比亚迪马尼萨工厂建设中'],
    ['航空中转', 'tourism', '伊斯坦布尔机场与土耳其航空'],
  ],
  assets: [
    ['idx', 'iShares MSCI Turkey ETF', 'TUR', '美元计价，波动大'],
    ['stk', 'Aselsan', 'ASELS', '防务电子'],
    ['stk', '土耳其航空', 'THYAO', '欧亚中转'],
    ['stk', 'BIM', 'BIMAS', '折扣零售'],
    ['stk', 'Koç 集团', 'KCHOL', '综合集团'],
  ],
  risks: ['官方通胀 29.7%，独立机构 ENAG 估计约 53%', '能源净进口国', '里拉持续贬值'],
  watch: '土耳其央行降息节奏',
  src: ['tur'],
};

P.RUS = {
  thesis: '制裁下对多数外国投资者不可投资；乌方无人机曾打掉约 4 成炼油产能，IMF 7 月预测 2026 年增速 1.1%。仅作宏观观察。',
  hot: [
    ['军工', 'defense', '战时经济，军工订单挤占民用'],
    ['对亚洲能源出口', 'energy', '油价高企但需折价销售'],
  ],
  mature: [
    ['油气', 'energy', '全球前三大产油国'],
    ['小麦', 'agri', '全球最大小麦出口国'],
    ['金属', 'mining', '钯、镍、铝主要供应国'],
  ],
  growth: [
    ['对华贸易结算', 'fin', '对华贸易以人民币结算为主'],
    ['本土软件替代', 'digital', '西方软件退出后的国产替代'],
  ],
  assets: [
    ['na', '—', '—', '受欧美制裁与俄方资本管制，外国投资者基本无法买卖俄罗斯资产'],
  ],
  risks: ['战事与制裁持续', '炼油设施遭袭', '财政赤字与高利率'],
  watch: '美俄乌三方会谈能否重启',
  src: ['imf7'],
};

P.HUN = {
  thesis: '政权更迭：4 月大选马扎尔领导的蒂萨党获三分之二多数，结束欧尔班 16 年执政；欧盟资金解冻预期上升，中资电池与车企项目则面临更严审查。',
  hot: [
    ['欧盟资金解冻', 'fin', '冻结的欧盟资金有望随法治改革逐步释放'],
    ['电池与电动车', 'ev', '宁德时代德布勒森模组已投产、电芯待投；比亚迪塞格德量产推迟至四季度'],
  ],
  mature: [
    ['汽车制造', 'mfg', '奥迪、奔驰、宝马（德布勒森）整车厂'],
    ['制药', 'health', 'Gedeon Richter'],
  ],
  growth: [
    ['电池材料与回收', 'ev', '中日韩电池企业聚集'],
    ['区域银行', 'fin', 'OTP 银行中东欧扩张'],
  ],
  assets: [
    ['stk', 'OTP 银行', 'OTP', '中东欧最大独立银行集团之一'],
    ['stk', 'Gedeon Richter', 'RICHTER', '妇科与中枢神经药'],
    ['stk', 'MOL', 'MOL', '油气与炼化'],
    ['idx', '（无主流单一国家 ETF）', '—', '可通过中东欧基金参与'],
  ],
  risks: ['新政府对外资大项目审查趋严', '能源依赖俄气', '通胀与福林汇率'],
  watch: '欧盟复苏基金解冻进度',
  src: ['hun'],
};

// ---------------------------------------------------------------- 东亚
P.CHN = {
  thesis: '出口与硬科技强、地产与内需弱的“双速”经济：8 月出口同比 +25%，地产投资全年预计 −20%。机会集中在国产替代和出海，回避地产链。',
  hot: [
    ['国产 AI 芯片', 'semi', '集成电路出口同比增近 130%；寒武纪 2026 年目标出货约 50 万颗加速卡，为 2025 年 3 倍以上'],
    ['光模块与 AI 硬件出口', 'ai', '8 月出口 4,014 亿美元、同比 +25%，AI 基础设施产品为主要拉动'],
    ['人形机器人', 'mfg', '官方预计 2026 年产量约 10 万台，TrendForce 预计同比 +94%'],
  ],
  mature: [
    ['新能源车', 'ev', '新能源车月度渗透率自 2024 年下半年起超过 50%，比亚迪全球销量第一'],
    ['动力电池', 'ev', '宁德时代全球动力电池装机份额约 38%（SNE Research 2024）'],
    ['光伏制造', 'power', '多晶硅到组件各环节全球产能占比超过 80%（IEA）'],
    ['造船', 'ship', '新接订单与完工量均占全球一半以上（Clarksons）'],
  ],
  growth: [
    ['创新药出海', 'health', '对外授权交易额 2025 年起连创新高；“十五五”列为新兴支柱产业'],
    ['低空经济与商业航天', 'defense', '“十五五”新兴支柱产业；卫星互联网进入组网期'],
    ['具身智能、量子与 6G', 'ai', '2026 年政府工作报告点名的未来产业'],
  ],
  assets: [
    ['idx', '华泰柏瑞沪深 300 ETF', '510300', '核心资产；9 月底较 6 月高点 5,064 点回落约 13%'],
    ['idx', '华夏科创 50 ETF', '588000', '半导体与 AI 芯片权重高，弹性大'],
    ['idx', 'iShares MSCI China ETF', 'MCHI', '美元通道，含港股与中概股'],
    ['stk', '宁德时代', '300750 / 3750.HK', '动力与储能电池龙头，A+H'],
    ['stk', '中际旭创', '300308', '800G/1.6T 光模块，绑定海外 AI 资本开支'],
    ['stk', '比亚迪', '002594 / 1211.HK', '新能源车规模与出海'],
    ['stk', '恒瑞医药', '600276 / 1276.HK', '创新药授权出海代表'],
  ],
  risks: [
    '地产开发投资上半年 −18%，8 月 70 城中仅 21 城新房价格环比持平或上涨',
    'PPI 连续三年以上为负，“反内卷”去产能效果分化',
    '对美出口受 301 条款关税与芯片管制约束',
    '原油进口约半数来自中东，霍尔木兹中断推高输入成本',
  ],
  watch: '10 月 14 日 9 月外贸数据；10 月 19 日前后三季度 GDP；“十五五”专项规划',
  src: ['nbs', 'cnexp', 'cnprop', 'fyp15', 'imf7'],
};

P.HKG = {
  thesis: 'IPO 中心地位回归：1–9 月 116 宗、募资逾 3,880 亿港元创同期纪录；但恒指较 52 周高点低约 15%，一级市场热、二级市场冷。',
  hot: [
    ['IPO 与 A+H 上市', 'fin', '毕马威预计全年募资或达 5,000 亿港元，超过历史纪录'],
    ['AI 芯片与机器人新股', 'ai', '壁仞上市后大涨近 120%；机器人相关排队企业至少 46 家'],
  ],
  mature: [
    ['金融与资管', 'fin', '亚洲主要离岸人民币与财富管理中心'],
    ['互联网平台', 'digital', '腾讯、阿里、美团等在港主要上市'],
  ],
  growth: [
    ['生物科技', 'health', '18A 章未盈利生物科技公司融资回暖'],
    ['稳定币与数字资产', 'fin', '《稳定币条例》2025 年 8 月 1 日生效，金管局发牌'],
  ],
  assets: [
    ['idx', '盈富基金', '2800.HK', '恒指被动跟踪'],
    ['idx', '南方恒生科技 ETF', '3033.HK', '中国互联网与硬科技'],
    ['stk', '港交所', '0388.HK', 'IPO 与成交额的直接受益者'],
    ['stk', '腾讯控股', '0700.HK', '游戏、广告与云，回购力度大'],
    ['stk', '友邦保险', '1299.HK', '内地访客保单与东南亚寿险'],
  ],
  risks: ['恒指 10 月 2 日收 23,972 点；7 月以来十大新股仅 2 只高于发行价', '联系汇率下本地利率跟随美联储上行', '中美科技与金融制裁'],
  watch: '年底能否刷新 2021 年融资纪录；恒指季检',
  src: ['hkipo', 'imf4'],
};

P.TWN = {
  gl: [9.64, '主计总处 5 月'],
  thesis: 'AI 服务器出口驱动 2026 年 GDP 增速近 10%（主计总处 5 月预测 9.64%，8 月报道或达 11%），远高于 IMF 4 月的 5.2%，是本轮 AI 硬件周期的核心受益者。',
  hot: [
    ['AI 服务器 ODM', 'ai', '服务器及相关产品预计占 2026 年出口约 4 成；1–8 月出口 5,743 亿美元、同比 +44%'],
    ['先进制程与封装', 'semi', '台积电 Q2 营收 402 亿美元、HPC 占 66%；全年营收增速指引略高于 40%，资本开支 600–640 亿美元'],
  ],
  mature: [
    ['晶圆代工', 'semi', '台积电全球代工份额约三分之二（TrendForce 2025）'],
    ['IC 设计', 'semi', '联发科为全球前五大 IC 设计公司'],
  ],
  growth: [
    ['散热与电源', 'power', 'GPU 功耗上升带动液冷与高功率电源，台达电、奇鋐受益'],
    ['硅光与共封装光学', 'semi', 'CPO 进入量产导入期'],
  ],
  assets: [
    ['idx', 'iShares MSCI Taiwan ETF', 'EWT', '台积电权重约两成以上'],
    ['idx', '元大台湾 50', '0050', '本地最大 ETF'],
    ['stk', '台积电', '2330 / TSM', 'AI 芯片制造核心'],
    ['stk', '鸿海', '2317', 'AI 服务器组装龙头'],
    ['stk', '台达电', '2308', '数据中心电源与散热'],
    ['stk', '广达', '2382', 'GB 系列服务器 ODM'],
  ],
  risks: ['能源 96% 依赖进口，霍尔木兹中断推高 LNG 成本', '台海地缘风险', '出口高度集中于 AI 硬件，周期反转弹性同样大'],
  watch: '10 月中旬台积电三季报；11 月主计总处修正全年 GDP',
  src: ['twgdp', 'imf4'],
};

P.JPN = {
  thesis: '公司治理改革 + 弱日元 + 半导体设备与军工三条主线支撑日股（日经 10 月初约 7 万点）；约 95% 原油来自中东、日银连续加息是两大掣肘。',
  hot: [
    ['半导体设备与材料', 'semi', '6 月创纪录行情由半导体设备、电子材料与工业机器人领涨'],
    ['国防与造船', 'defense', '高市政府将防务、造船、AI 列为战略投资领域；油价冲击日三菱重工、川崎重工逆势上涨'],
    ['资本效率改革', 'fin', '东证所要求低市净率公司改善资本效率，回购与增配股息创新高'],
  ],
  mature: [
    ['汽车', 'ev', '丰田连续多年全球销量第一'],
    ['工业机器人与自动化', 'mfg', '发那科、安川、基恩士全球领先'],
    ['综合商社', 'fin', '伯克希尔持有五大商社股份'],
  ],
  growth: [
    ['电力设备', 'power', '日立、三菱电机电网与变压器订单随 AI 用电上升'],
    ['入境旅游', 'tourism', '2024 年访日游客 3,687 万人次创纪录'],
  ],
  assets: [
    ['idx', 'iShares MSCI Japan ETF', 'EWJ', '大中盘'],
    ['idx', 'WisdomTree 日本对冲汇率 ETF', 'DXJ', '对冲日元，偏出口股'],
    ['qdii', '华夏野村日经 225 ETF', '513520', '人民币通道；近一年约 +43%，常有溢价'],
    ['stk', '东京电子', '8035', '半导体前道设备'],
    ['stk', '爱德万测试', '6857', 'AI 芯片测试机'],
    ['stk', '三菱重工', '7011', '防务、核电与燃气轮机'],
    ['stk', '三菱日联金融', '8306', '加息受益'],
  ],
  risks: ['约 95% 原油来自中东、约 7 成经霍尔木兹', '日银 9 月加息至 1.25%（31 年最高），国债收益率上行加重财政负担', '日元约 157，输入型通胀与干预风险'],
  watch: '日银 12 月或 2027 年初是否再加息；高市政府补充预算',
  src: ['boj', 'imf7'],
};

P.KOR = {
  thesis: 'HBM 存储超级周期把 KOSPI 推上 6,000 点以上，SK 海力士市值破 1 万亿美元；造船、军工、核电构成第二梯队，但单日 ±10% 以上的波动说明拥挤度极高。',
  hot: [
    ['HBM 与存储芯片', 'semi', 'SK 海力士 5 月市值破 1 万亿美元，年初以来股价涨约 250%；三星 HBM4 向英伟达供货'],
    ['造船', 'ship', '美韩造船合作推动订单；HD 现代重工、韩华海洋竞逐约 45 亿美元东南亚海军订单'],
    ['军工出口', 'defense', 'K9 自行火炮、K2 坦克主攻波兰等北约市场'],
  ],
  mature: [
    ['存储芯片', 'semi', '三星与 SK 海力士合计约占全球 DRAM 七成'],
    ['汽车', 'ev', '现代起亚集团全球销量前三'],
  ],
  growth: [
    ['核电', 'power', '韩水原 2025 年签约捷克杜科瓦尼核电；斗山 Enerbility 受益'],
    ['化妆品与内容出口', 'consumer', '2024 年化妆品出口 102 亿美元创纪录'],
  ],
  assets: [
    ['idx', 'iShares MSCI South Korea ETF', 'EWY', '三星与海力士合计权重最高'],
    ['idx', '三星 KODEX 200', '069500', '本地 KOSPI 200 ETF'],
    ['stk', 'SK 海力士', '000660', 'HBM 份额第一'],
    ['stk', '三星电子', '005930', 'HBM4 追赶者，估值低于海力士'],
    ['stk', 'HD 现代重工', '329180', 'LNG 船与海军舰艇'],
    ['stk', '韩华航空航天', '012450', '陆军装备与航空发动机'],
  ],
  risks: ['存储周期波动剧烈：6 月 23 日单日 −10%，7 月 31 日单日 +17.9%', '原油约七成来自中东', '对美出口受 301 关税影响，汽车首当其冲'],
  watch: '10 月下旬三星、SK 海力士三季报；MSCI 发达市场观察名单',
  src: ['hynix', 'kospi', 'imf4'],
};

// ---------------------------------------------------------------- 南亚与东南亚
P.IND = {
  thesis: '仍是增长最快的大型经济体（IMF 2026 财年 6.4%），电子制造与国防在升温；但 9 月 Nifty 下跌约 6%、外资持续流出，油价是最大外部变量。',
  hot: [
    ['电子制造', 'mfg', '2026 财年 4–8 月电子出口 266.6 亿美元、同比 +39.4%；智能手机已成第一大出口品'],
    ['国防', 'defense', '国产化采购清单扩大，HAL、BEL 订单饱满'],
    ['医药', 'health', '9 月 Nifty 下跌中医药板块逆势收涨'],
  ],
  mature: [
    ['IT 服务', 'digital', 'TCS、Infosys 主导全球 IT 外包；9 月 Nifty IT 指数 −11%，AI 替代担忧升温'],
    ['仿制药', 'health', '全球主要仿制药出口国'],
    ['银行', 'fin', 'HDFC 银行、ICICI 银行为指数最大权重'],
  ],
  growth: [
    ['数据中心', 'ai', '装机约 1 GW（2024），2027 年约 1.8 GW；Sterlite 获超大规模客户逾 10 亿美元订单'],
    ['可再生能源与电网', 'power', '2025 年非化石能源装机占比已超 50%'],
  ],
  assets: [
    ['idx', 'iShares MSCI India ETF', 'INDA', '大盘；9 月底 Nifty 22,620 点'],
    ['idx', 'iShares MSCI India Small-Cap ETF', 'SMIN', '内需弹性大，估值也更高'],
    ['bond', '印度政府债', '—', '2024 年起纳入摩根大通 GBI-EM 指数'],
    ['stk', '信实工业', 'RELIANCE', '炼化、电信、零售，油价敏感'],
    ['stk', 'HDFC 银行', 'HDFCBANK', '最大私营银行'],
    ['stk', 'Dixon Technologies', 'DIXON', '手机与电子代工'],
    ['stk', 'Bharat Electronics', 'BEL', '国防电子'],
  ],
  risks: ['原油约 85% 依赖进口，油价 100 美元附近压制通胀与经常账户', '外资持续卖出，卢比走弱', '美国对印关税 10%（301 条款），美印协议尚未落地'],
  watch: '美印贸易协定；印度央行 12 月议息',
  src: ['inelec', 'nifty', 's301', 'imf7'],
};

P.BGD = {
  thesis: '全球第二大服装出口国：2 月大选后 BNP 政府稳住外汇（储备 8 月回升至 322.6 亿美元），但银行不良率约 30.6%、通胀 8% 以上，属高风险前沿市场。',
  hot: [
    ['成衣出口', 'mfg', '成衣约占出口八成以上'],
    ['移动金融', 'digital', 'bKash 等移动钱包普及'],
  ],
  mature: [
    ['成衣', 'mfg', '全球第二大服装出口国（WTO）'],
    ['侨汇', 'fin', '侨汇是外储回升的主要来源'],
  ],
  growth: [
    ['制药', 'health', '本土药企满足国内约 98% 需求并出口'],
    ['电信与数字服务', 'digital', '1.7 亿人口的移动互联网渗透'],
  ],
  assets: [
    ['stk', 'Grameenphone', 'GP', '最大电信运营商，高股息'],
    ['stk', 'Square Pharmaceuticals', 'SQURPHARMA', '最大药企'],
    ['stk', 'BRAC Bank', 'BRACBANK', '治理较好的私营银行'],
    ['idx', '（无海外 ETF）', '—', '需通过达卡交易所或前沿市场基金'],
  ],
  risks: ['银行不良贷款率约 30.6%（2025 年末）', '7 月通胀 8.32%、能源短缺', '外资准入与汇兑限制'],
  watch: 'IMF 项目审查；新任央行管理层的汇率政策',
  src: ['bgd'],
};

P.PAK = {
  thesis: 'IMF 70 亿美元 EFF 下的稳定化经济：纺织与侨汇是外汇来源，2026 年油价冲击考验外储；海外 ETF（PAK）已于 2024 年清盘，投资渠道有限。',
  hot: [
    ['油气上游', 'energy', '油价上行利好国有油气公司'],
    ['IT 服务出口', 'digital', '软件与 IT 服务出口持续增长'],
  ],
  mature: [
    ['纺织服装', 'mfg', '约占商品出口六成'],
    ['水泥', 'infra', '产能过剩但出口阿富汗与中东'],
  ],
  growth: [
    ['铜金矿', 'mining', '巴里克主导的 Reko Diq 计划 2028 年底投产'],
    ['伊斯兰银行', 'fin', '伊斯兰金融份额持续上升'],
  ],
  assets: [
    ['stk', '巴基斯坦油气开发公司', 'OGDC', '国有上游油气'],
    ['stk', 'Meezan Bank', 'MEBL', '伊斯兰银行龙头'],
    ['stk', 'Lucky Cement', 'LUCK', '水泥与多元化'],
    ['stk', 'Systems Ltd', 'SYS', 'IT 服务出口'],
    ['idx', '（无海外 ETF）', '—', 'Global X PAK 已于 2024 年 2 月清盘'],
  ],
  risks: ['外储薄弱，油价冲击', '边境安全形势', 'IMF 条件约束财政'],
  watch: 'IMF 季度审查',
  src: ['etfx', 'imf4'],
};

P.IDN = {
  gl: [5.2, 'ADB 9 月'],
  thesis: '镍下游化和 5% 左右增速仍在，但治理与 MSCI 降级风险让雅加达综指年内跌约 26–29%、印尼盾创历史新低，基本面与市场严重背离。',
  hot: [
    ['主权基金 Danantara', 'fin', '被动员入市托底，穆迪给予 Baa2、展望负面'],
    ['镍与电池材料', 'mining', '镍矿产量约占全球六成（USGS 2025）'],
  ],
  mature: [
    ['煤炭', 'energy', '全球最大动力煤出口国'],
    ['棕榈油', 'agri', '约占全球产量六成'],
    ['银行', 'fin', 'BCA、BRI 长期 ROE 领先东南亚'],
  ],
  growth: [
    ['数据中心', 'ai', '巴淡岛承接新加坡外溢需求'],
    ['数字经济', 'digital', '电商与支付渗透率提升'],
  ],
  assets: [
    ['idx', 'iShares MSCI Indonesia ETF', 'EIDO', '银行权重高，年内跌幅居东盟之首'],
    ['stk', '中亚银行', 'BBCA', '资产质量最优的私营银行'],
    ['stk', '印尼人民银行', 'BBRI', '小微贷款龙头'],
    ['stk', 'Amman Mineral', 'AMMN', '铜金矿'],
    ['stk', 'Aneka Tambang', 'ANTM', '国有镍金矿'],
  ],
  risks: ['MSCI 6 月推迟决定，11 月可能启动降为前沿市场的咨询；5 月已剔除 18 只成分股', '印尼盾跌破 17,900，穆迪、惠誉展望下调为负面', '政策集中化与国企干预'],
  watch: '11 月 MSCI 市场分类结论',
  src: ['idmsci', 'idfx', 'usgs'],
};

P.VNM = {
  gl: [7.2, 'ADB 7 月'],
  thesis: '东盟增长最快（ADB 预测 2026 年 7.2%，美银 8.2%）：1–9 月注册 FDI 503.6 亿美元（+76%），9 月 21 日起正式升为富时次级新兴市场。',
  hot: [
    ['富时指数纳入', 'fin', '9 月首批纳入 10% 权重，2027 年 3、6、9 月分批完成'],
    ['电子制造 FDI', 'mfg', '1–9 月 FDI 到位 210.7 亿美元，五年新高'],
  ],
  mature: [
    ['电子组装', 'semi', '机械电子约占 2023 年出口 47%（WITS）'],
    ['纺织服装与鞋类', 'mfg', '2023 年纺织服装出口约 403 亿美元、鞋类约 216 亿美元（WITS）'],
    ['咖啡与农产品', 'agri', '全球第二大咖啡出口国'],
  ],
  growth: [
    ['半导体封测', 'semi', 'Amkor、英特尔等封测厂落地'],
    ['消费与零售', 'consumer', '1 亿人口、中产扩张'],
  ],
  assets: [
    ['idx', 'VanEck Vietnam ETF', 'VNM', '老牌越南 ETF'],
    ['idx', 'Global X MSCI Vietnam ETF', 'VNAM', '2024 年底至 10 月 2 日总回报约 56%'],
    ['stk', 'FPT 集团', 'FPT', 'IT 外包与芯片设计'],
    ['stk', '越南外贸银行', 'VCB', '最大国有商业银行'],
    ['stk', '和发集团', 'HPG', '钢铁，受益基建'],
    ['stk', '移动世界', 'MWG', '零售龙头'],
  ],
  risks: ['对美出口依赖高，面临 301 关税与转运审查', '外资持股上限与流动性', '油价推升通胀'],
  watch: '2027 年 3 月富时第二批纳入；MSCI 是否列入升级观察名单',
  src: ['adb', 'vnfdi', 'vnftse', 'wits'],
};

P.THA = {
  gl: [1.7, 'OECD 6 月'],
  thesis: '实体经济疲弱（OECD 预测 2026 年 1.7%、世行 1.3%），但 SET 指数年内涨约 26%：估值修复领先于基本面。',
  hot: [
    ['数据中心', 'ai', '在建约 859 MW，东南亚第二'],
    ['中资电动车整车', 'ev', '比亚迪罗勇等工厂使泰国成为东南亚电动车制造中心'],
  ],
  mature: [
    ['旅游', 'tourism', '2024 年旅游业约占 GDP 12%'],
    ['汽车整车与零部件', 'mfg', '东南亚最大汽车生产国'],
    ['农产品', 'agri', '大米、橡胶、木薯出口位居全球前列'],
  ],
  growth: [
    ['PCB 与电子', 'semi', '中资 PCB 厂商大规模迁入'],
    ['医疗旅游', 'health', '私立医院集团接待国际患者'],
  ],
  assets: [
    ['idx', 'iShares MSCI Thailand ETF', 'THD', '年内领涨东盟'],
    ['stk', '泰国国家石油', 'PTT', '能源一体化'],
    ['stk', 'Delta Electronics Thailand', 'DELTA', '数据中心电源'],
    ['stk', '曼谷杜斯特医疗', 'BDMS', '医疗旅游'],
    ['stk', '泰国机场', 'AOT', '旅游复苏'],
  ],
  risks: ['家庭债务高、政局不稳（世行点名）', '能源进口与旅游受中东战事拖累', '增速为东盟最低之一'],
  watch: '新政府预算执行；入境游客数据',
  src: ['adb', 'seadc'],
};

P.MYS = {
  gl: [4.6, 'ADB 9 月'],
  thesis: '东南亚数据中心中心：2021 年至 2026 年一季度获批数据中心与云项目约 960 亿美元，在建 1,039 MW；半导体封测与油气作支撑。',
  hot: [
    ['数据中心（柔佛）', 'ai', '获批约 960 亿美元，2026 上半年 240 亿；非 AI 类申请已暂停'],
    ['燃气发电', 'power', '计划到 2030 年新增最多 8 GW 燃气发电满足数据中心需求'],
  ],
  mature: [
    ['半导体封测', 'semi', '槟城约占全球封测产能 13%（MIDA）'],
    ['棕榈油', 'agri', '全球第二大生产国'],
    ['油气', 'energy', '国油 Petronas；产油国身份缓冲油价冲击'],
  ],
  growth: [
    ['电网与 EPC', 'infra', '数据中心带动输配电与工程承包'],
    ['芯片设计', 'semi', '国家半导体战略推动前端设计'],
  ],
  assets: [
    ['idx', 'iShares MSCI Malaysia ETF', 'EWM', '年内基本持平'],
    ['stk', '国家能源', 'TENAGA', '电网与发电'],
    ['stk', 'YTL Power', 'YTLPOWR', '柔佛 AI 数据中心园区'],
    ['stk', '金务大', 'GAMUDA', '数据中心 EPC'],
    ['stk', 'Inari Amertron', 'INARI', '封测'],
  ],
  risks: ['获批不等于建成，电力与水资源约束', '美国 AI 芯片出口管制与转运审查', '燃油补贴从 7 亿增至 32 亿令吉'],
  watch: '数据中心实际投产量；2027 年预算',
  src: ['seadc', 'adb'],
};

P.PHL = {
  gl: [2.5, '美银 9 月'],
  thesis: '东盟最弱：二季度 GDP 仅 2.3%、6 月通胀 6.4%，已宣布国家能源紧急状态；约 240 万菲律宾劳工在中东，侨汇受冲击。机会偏防御。',
  hot: [
    ['能源替代', 'power', '能源紧急状态下 LNG 接收与可再生能源项目加速'],
    ['港口运营', 'infra', 'ICTSI 全球码头组合，美元收入'],
  ],
  mature: [
    ['业务流程外包', 'digital', '约 180 万从业者、年收入约 380 亿美元（IBPAP 2024）'],
    ['侨汇', 'fin', '约 380 亿美元，约占 GDP 8%'],
    ['购物中心与零售', 'consumer', 'SM、Ayala 主导'],
  ],
  growth: [
    ['数字支付', 'digital', 'GCash、Maya 普及'],
    ['可再生能源', 'power', '海上风电与太阳能招标'],
  ],
  assets: [
    ['idx', 'iShares MSCI Philippines ETF', 'EPHE', '年内基本持平'],
    ['stk', 'ICTSI', 'ICT', '全球码头运营商'],
    ['stk', 'BDO 银行', 'BDO', '最大银行'],
    ['stk', 'SM Investments', 'SM', '零售 + 地产 + 银行'],
  ],
  risks: ['上半年增速 2.6%，低于政府 3.5–4.5% 目标', '6 月通胀 6.4%', '防洪工程腐败案后一季度公共建设同比 −31.5%'],
  watch: '央行是否加息；中东局势对侨汇影响',
  src: ['phl', 'adb'],
};

P.SGP = {
  thesis: '战时避险市场：海峡时报指数 9 月 4 日创 5,801.96 点新高、一年涨约 35%，银行贡献大部分涨幅。',
  hot: [
    ['银行', 'fin', '星展 Q2 净利 30.8 亿新元创纪录'],
    ['财富管理', 'fin', '避险资金与家族办公室持续流入'],
  ],
  mature: [
    ['港口与转口贸易', 'infra', '全球第二大集装箱港'],
    ['炼化', 'energy', '裕廊岛炼化中心'],
  ],
  growth: [
    ['半导体', 'semi', '美光 HBM 封装厂等扩产'],
    ['数据中心', 'ai', '按能效标准分配新增容量'],
  ],
  assets: [
    ['idx', 'iShares MSCI Singapore ETF', 'EWS', '银行权重高'],
    ['idx', 'SPDR 海峡时报指数 ETF', 'ES3', '本地 STI ETF'],
    ['stk', '星展银行', 'D05', '东南亚最大银行'],
    ['stk', '华侨银行', 'O39', '财富管理'],
    ['reit', '凯德综合商业信托', 'C38U', '核心零售 + 办公 REIT'],
  ],
  risks: ['指数高度集中于银行', '利率上行压制 REITs', '航运扰动影响转口'],
  watch: '10 月新加坡金管局货币政策声明',
  src: ['sti'],
};

P.AUS = {
  thesis: '能源与关键矿产的战时受益国：LNG 出口收入 2026/27 财年预计 650–676 亿澳元，较此前展望上调 40% 以上；同时是中国以外最大的稀土分离产地之一。',
  hot: [
    ['LNG 出口', 'energy', '卡塔尔停产后亚洲买家转向澳洲，出口收入预期上调 40% 以上'],
    ['稀土与关键矿产', 'mining', 'Lynas 为中国以外最大的分离稀土生产商'],
  ],
  mature: [
    ['铁矿石', 'mining', '约占全球铁矿石产量 37%（USGS）'],
    ['锂', 'mining', '约占全球锂矿产量三分之一以上（USGS 2024）'],
    ['银行与养老金', 'fin', '超级年金规模约 4 万亿澳元'],
  ],
  growth: [
    ['数据中心', 'ai', '悉尼、墨尔本为亚太主要数据中心集群'],
    ['铜', 'mining', '铜价接近历史高位，BHP 南澳铜矿扩产'],
  ],
  assets: [
    ['idx', 'iShares MSCI Australia ETF', 'EWA', '矿业 + 银行'],
    ['idx', 'Vanguard 澳洲股票 ETF', 'VAS', '本地宽基'],
    ['stk', '必和必拓', 'BHP', '铁矿 + 铜'],
    ['stk', 'Woodside', 'WDS', 'LNG 涨价直接受益'],
    ['stk', 'Lynas', 'LYC', '非中国稀土'],
    ['stk', '麦格理', 'MQG', '基础设施资管'],
  ],
  risks: ['六成以上民众支持 25% 天然气出口税，政府已启动审查', '铁矿石依赖中国，中国地产投资 −20%', '东海岸天然气保供 2027 年起实施'],
  watch: '天然气税审查结论；澳储行 11 月议息',
  src: ['aulng', 'usgs'],
};

P.NZL = {
  thesis: '小而稳的农业与服务经济：乳制品与旅游为支柱，可投资标的有限，偏防御。',
  hot: [
    ['数据中心', 'ai', '可再生电力占比约 85%，吸引绿色数据中心'],
    ['医疗器械', 'health', '费雪派克医疗呼吸治疗产品全球领先'],
  ],
  mature: [
    ['乳制品', 'agri', '恒天然约占全球乳制品贸易三成'],
    ['肉类与园艺', 'agri', '羊肉、牛肉、猕猴桃出口'],
  ],
  growth: [
    ['旅游与国际教育', 'tourism', '国际游客与留学生回升'],
    ['可再生电力', 'power', '水电与地热'],
  ],
  assets: [
    ['idx', 'iShares MSCI New Zealand ETF', 'ENZL', '防御型'],
    ['stk', '费雪派克医疗', 'FPH', '呼吸治疗设备'],
    ['stk', 'Infratil', 'IFT', '数据中心（CDC）与可再生能源'],
    ['stk', 'Meridian Energy', 'MEL', '水电'],
  ],
  risks: ['经济体量小、流动性低', '乳制品价格周期', '成品油全部进口'],
  watch: '新西兰联储 11 月议息',
  src: ['imf4'],
};

P.KAZ = {
  thesis: '霍尔木兹之外的能源供应商：原油经 CPC 管道出口不经海峡，铀供应全球五分之一以上；Kaspi 是罕见的可投资高 ROE 金融科技公司。',
  hot: [
    ['铀', 'mining', 'Kazatomprom 2026 年指引 2.75–2.9 万吨铀（100% 口径），上半年产量同比 +9%；长期价约 80 美元/磅'],
    ['原油', 'energy', '田吉兹扩产 2025 年投产，产量创新高'],
  ],
  mature: [
    ['油气', 'energy', '能源燃料为最大出口门类'],
    ['有色金属', 'mining', '铜、锌、铁合金'],
  ],
  growth: [
    ['金融科技', 'digital', 'Kaspi 超级 App 覆盖支付、电商、信贷'],
    ['中间走廊物流', 'infra', '中国—里海—欧洲跨里海运输'],
  ],
  assets: [
    ['stk', 'Kaspi.kz', 'KSPI', '纳斯达克上市'],
    ['stk', 'Kazatomprom', 'KAP', '伦交所 / AIX 上市'],
    ['stk', 'Halyk Bank', 'HSBK', '最大银行'],
    ['sec', 'Sprott 铀矿 ETF', 'URNM', '间接参与铀价'],
  ],
  risks: ['CPC 管道过境俄罗斯，受袭击与政治影响', '坚戈汇率', '公司治理透明度'],
  watch: 'Kaspi 10 月 21 日三季报',
  src: ['kap', 'imf4'],
};

// ---------------------------------------------------------------- 中东
P.SAU = {
  thesis: '东西管道把原油运往红海、绕开霍尔木兹，油价上涨足以抵消出口量下降（IMF 7 月）；但 2026 年 Vision 2030 首次削减开支，NEOM 等巨型项目收缩。',
  hot: [
    ['AI 数据中心', 'ai', 'PIF 旗下 Humain 目标 2034 年 6.6 GW；已采购 1.8 万颗 GB300，交付待美方许可'],
    ['国防', 'defense', '一季度国防支出同比 +26%'],
  ],
  mature: [
    ['原油', 'energy', '阿美为全球最大石油公司'],
    ['石化', 'energy', 'SABIC 等'],
    ['银行', 'fin', 'Al Rajhi、SNB'],
  ],
  growth: [
    ['矿业', 'mining', 'Maaden 磷酸盐、铝、黄金'],
    ['可再生能源与海水淡化', 'power', 'ACWA Power'],
  ],
  assets: [
    ['idx', 'iShares MSCI Saudi Arabia ETF', 'KSA', '美元通道'],
    ['qdii', '华泰柏瑞南方东英沙特 ETF', '520830', '人民币通道；近一年约 −11%'],
    ['qdii', '南方沙特 ETF', '159329', '同为富时沙特指数，深交所'],
    ['stk', '沙特阿美', '2222', '高股息，油价直接受益'],
    ['stk', 'Al Rajhi Bank', '1120', '伊斯兰银行龙头'],
    ['stk', 'ACWA Power', '2082', '电力与海水淡化'],
  ],
  risks: ['一季度财政赤字 1,257 亿里亚尔，为 2018 年来最大', '胡塞武装 9 月宣称袭击利雅得', '巨型项目缩减冲击建筑与咨询链'],
  watch: '12 月 2027 年预算；OPEC+ 产量政策',
  src: ['saimf', 'humain', 'mena', 'imf7'],
};

P.ARE = {
  thesis: '金融与 AI 枢纽直接受战事冲击（3 月迪拜指数一度跌约 16%），但 Stargate UAE 首期 200 MW 计划 2026 年三季度交付，长期定位未变。',
  hot: [
    ['AI 算力', 'ai', 'Stargate UAE 1 GW 集群总成本超 300 亿美元，首期 200 MW 计划三季度完工'],
    ['绕行出口能力', 'energy', 'ADCOP 管道可把原油送到富查伊拉，绕开霍尔木兹'],
  ],
  mature: [
    ['油气', 'energy', 'ADNOC；国内天然气设施受损较重'],
    ['航空与物流', 'tourism', '阿联酋航空、迪拜机场'],
    ['房地产', 'infra', '迪拜住宅'],
  ],
  growth: [
    ['金融科技与数字资产', 'fin', 'ADGM、迪拜 VARA 监管框架'],
    ['旅游', 'tourism', '战后恢复空间'],
  ],
  assets: [
    ['idx', 'iShares MSCI UAE ETF', 'UAE', '美元通道'],
    ['stk', 'ADNOC Gas', 'ADNOCGAS', '天然气'],
    ['stk', 'Emaar Properties', 'EMAAR', '迪拜地产龙头'],
    ['stk', '阿布扎比第一银行', 'FAB', '最大银行'],
    ['stk', 'Aldar Properties', 'ALDAR', '阿布扎比地产'],
  ],
  risks: ['战事直接波及，天然气设施需长期修复', '迪拜住宅供应高峰', '航空与旅游受空域管制影响'],
  watch: 'Stargate UAE 首期交付；霍尔木兹复航',
  src: ['stargate', 'gulf80', 'mena'],
};

P.QAT = {
  thesis: '本轮受损最重：拉斯拉凡 4、6 号线受损（约 1,280 万吨/年，占出口 17%），IMF 4 月预测 2026 年 GDP −8.6%；修复与北部气田东扩（新线据报 11 月投产）是 2027 年反弹看点。',
  hot: [
    ['LNG 修复与扩产', 'energy', '北部气田东扩首条新线据报 11 月投产'],
    ['银行', 'fin', '卡塔尔国民银行为中东非洲资产规模最大的银行'],
  ],
  mature: [
    ['LNG', 'energy', '全球三大 LNG 出口国之一'],
    ['石化与化肥', 'energy', '工业卡塔尔：尿素、石化、钢铁'],
  ],
  growth: [
    ['LNG 产能扩张', 'energy', '计划 2030 年前从 7,700 万吨/年提升至 1.42 亿吨/年'],
    ['LNG 运输', 'ship', 'Nakilat LNG 船队'],
  ],
  assets: [
    ['idx', 'iShares MSCI Qatar ETF', 'QAT', '美元通道'],
    ['stk', '卡塔尔国民银行', 'QNBK', '区域最大银行'],
    ['stk', '工业卡塔尔', 'IQCD', '石化、化肥、钢铁'],
    ['stk', 'Nakilat', 'QGTS', 'LNG 船队'],
  ],
  risks: ['南区 2 条生产线报废，产能损失持续数年，替换燃气轮机需 2–4 年', '对中、韩、意、比长约宣布不可抗力，年收入损失约 200 亿美元', '海峡通行仍受阻'],
  watch: '霍尔木兹复航；北部气田东扩新线投产',
  src: ['rasl', 'mena', 'imf4'],
};

P.ISR = {
  thesis: '战时科技融资仍高增长：1–9 月私营科技公司融资 110 亿美元（+50%），网络安全占 38%；IMF 预测 2026 年增速 3.5%，高于 G7。',
  hot: [
    ['网络安全', 'digital', '1–9 月网安融资约 43 亿美元；Wiz、CyberArk 等 2025 年宣布的并购于 2026 年获批'],
    ['国防科技', 'defense', '导弹防御、无人机与情报系统出口'],
  ],
  mature: [
    ['高科技出口', 'digital', '约 850 亿美元，占总出口 58%'],
    ['半导体', 'semi', 'Nova、Tower、英特尔以色列'],
  ],
  growth: [
    ['AI 与数据基础设施', 'ai', '大额融资集中于 AI 与安全'],
    ['医疗科技', 'health', '医疗器械与数字健康'],
  ],
  assets: [
    ['idx', 'iShares MSCI Israel ETF', 'EIS', '银行 + 科技 + 防务'],
    ['stk', '埃尔比特系统', 'ESLT', '防务电子'],
    ['stk', 'Check Point', 'CHKP', '网络安全'],
    ['stk', 'Nova', 'NVMI', '半导体量测'],
    ['stk', '梯瓦制药', 'TEVA', '仿制药'],
  ],
  risks: ['多线战事与预备役动员影响劳动力', '研发岗位十年来首降，人员外流', '财政赤字与主权评级'],
  watch: '停火执行情况；以色列央行利率路径',
  src: ['isr', 'imf4'],
};

// ---------------------------------------------------------------- 非洲
P.EGY = {
  thesis: '非洲受伊朗战事冲击最重的国家之一：苏伊士运河收入（历来约占 GDP 2%）受损、外资撤出约 20 亿美元本币国债；但 EGX 以美元计年内仍涨约 24%。',
  hot: [
    ['银行', 'fin', '高利率环境下净息差高'],
    ['滨海地产', 'infra', '阿联酋 350 亿美元拉斯赫克马开发项目'],
  ],
  mature: [
    ['苏伊士运河', 'infra', '全球约 10–12% 贸易经红海—苏伊士'],
    ['旅游', 'tourism', '金字塔与红海度假'],
    ['天然气', 'energy', 'Zohr 气田产量下滑'],
  ],
  growth: [
    ['风电与太阳能', 'power', '苏伊士湾风电与本班太阳能园'],
    ['近岸制造', 'mfg', '纺织、家电面向欧洲出口'],
  ],
  assets: [
    ['stk', '埃及商业国际银行', 'COMI', '最大私营银行'],
    ['stk', 'EFG Holding', 'HRHO', '投行与消费金融'],
    ['stk', 'Talaat Moustafa', 'TMGH', '地产'],
    ['idx', '（无海外 ETF）', '—', 'VanEck EGPT 已于 2024 年 3 月清盘'],
  ],
  risks: ['2026 年外债偿付约 270 亿美元', '埃镑 4 月创新低', '能源与粮食进口依赖'],
  watch: 'IMF 项目审查；苏伊士运河通行恢复',
  src: ['egy', 'afstk', 'etfx'],
};

P.NGA = {
  thesis: '油价受益 + 改革牛市：NGX 以美元计年内涨约 72%，已超过摩洛哥成为非洲第二大股市；但原油收益部分被成品油进口抵消。',
  hot: [
    ['银行资本重组', 'fin', '央行提高最低资本要求，银行增发与并购'],
    ['炼油', 'energy', '丹格特炼厂 65 万桶/日，减少成品油进口'],
  ],
  mature: [
    ['原油', 'energy', '原油售价一度平均约 117 美元/桶，石油公司额外收入约 40 亿美元'],
    ['电信', 'digital', 'MTN、Airtel'],
    ['水泥', 'infra', '丹格特水泥为非洲最大水泥企业'],
  ],
  growth: [
    ['金融科技', 'digital', 'Moniepoint、OPay、Flutterwave'],
    ['天然气', 'energy', '国内燃气化与 LNG'],
  ],
  assets: [
    ['stk', '丹格特水泥', 'DANGCEM', '泛非水泥'],
    ['stk', 'MTN Nigeria', 'MTNN', '最大电信'],
    ['stk', 'Airtel Africa', 'AAF', '伦交所上市'],
    ['stk', 'Seplat Energy', 'SEPL', '伦交所 / NGX 双上市油气'],
    ['idx', '（无海外 ETF）', '—', 'Global X NGE 已于 2023 年清盘'],
  ],
  risks: ['奈拉汇率与外汇流动性', '成交集中：金融股占 71% 成交量', '安全形势与产区盗油'],
  watch: '2027 年大选前的财政纪律；尼日利亚央行利率',
  src: ['afoil', 'afstk', 'etfx'],
};

P.KEN = {
  gl: [4.4, '世界银行'],
  thesis: '东非金融科技中心，NSE 以美元计年内涨约 36%；但燃油几乎全部来自海湾，柴油较战前涨近 46%，世行将 2026 年增速下调至 4.4%。',
  hot: [
    ['移动支付', 'digital', 'Safaricom 旗下 M-Pesa 覆盖绝大多数成年人'],
    ['地热电力', 'power', '地热约占发电量四成以上'],
  ],
  mature: [
    ['茶叶', 'agri', '全球最大红茶出口国之一'],
    ['鲜切花与园艺', 'agri', '欧洲主要鲜切花来源'],
  ],
  growth: [
    ['数据中心', 'ai', '微软与 G42 地热数据中心项目'],
    ['旅游', 'tourism', '野生动物旅游'],
  ],
  assets: [
    ['stk', 'Safaricom', 'SCOM', 'M-Pesa'],
    ['stk', 'Equity Group', 'EQTY', '东非区域银行'],
    ['stk', 'KCB 集团', 'KCB', '最大银行之一'],
    ['stk', '东非啤酒', 'EABL', '消费'],
  ],
  risks: ['燃油进口：近一半成品油来自阿联酋', '2027 年大选前社会不满', '红海航运受阻、茶叶积压蒙巴萨港'],
  watch: '燃油税减免 10 月到期后的调整',
  src: ['ken', 'afstk'],
};

P.MAR = {
  thesis: '非洲的制造业与磷酸盐强国：坐拥全球约七成磷酸盐储量，汽车已成最大出口行业；2030 世界杯基建是中期主线，能源与粮食进口拖累 2026 年。',
  hot: [
    ['2030 世界杯基建', 'infra', '与西班牙、葡萄牙合办，体育场、高铁与机场扩建'],
    ['电动车电池', 'ev', '国轩高科肯尼特拉电池工厂'],
  ],
  mature: [
    ['磷酸盐与化肥', 'agri', 'OCP；磷酸盐储量约占全球七成（USGS）'],
    ['汽车制造', 'mfg', '雷诺丹吉尔、Stellantis 肯尼特拉；非洲最大轿车生产国'],
  ],
  growth: [
    ['绿氢与可再生能源', 'power', '风光资源与欧洲电网互联'],
    ['旅游', 'tourism', '2024 年接待游客 1,740 万人次创纪录'],
  ],
  assets: [
    ['stk', 'Attijariwafa Bank', 'ATW', '北非最大银行，泛非布局'],
    ['stk', '摩洛哥电信', 'IAM', '电信'],
    ['stk', 'TGCC', 'TGCC', '建筑承包，世界杯受益'],
    ['stk', 'Marsa Maroc', 'MSA', '港口'],
    ['idx', '（无海外 ETF）', '—', '卡萨布兰卡交易所或前沿市场基金'],
  ],
  risks: ['能源与粮食进口依赖', '干旱影响农业', '股市流动性较低'],
  watch: '世界杯项目招标；欧洲汽车需求',
  src: ['usgs', 'afstk'],
};

P.ZAF = {
  thesis: '贵金属大国 + 结构改革：全球约七成铂金产自南非；但油价推高通胀，南非储备银行战后已两次加息，JSE 以美元计年内仅涨约 5%。',
  hot: [
    ['金矿', 'mining', '金价约 4,100 美元/盎司，较 1 月 5,608 美元高点回落但仍处高位'],
    ['铂族金属', 'mining', '约占全球铂产量七成'],
  ],
  mature: [
    ['采矿', 'mining', '铂、锰、铬产量全球第一'],
    ['银行与保险', 'fin', '非洲最深的金融市场'],
    ['电信', 'digital', 'MTN、Vodacom 泛非布局'],
  ],
  growth: [
    ['电力改革与可再生能源', 'power', '电力市场开放后私营风光项目放量'],
    ['港口铁路私营化', 'infra', 'Transnet 引入私营运营商'],
  ],
  assets: [
    ['idx', 'iShares MSCI South Africa ETF', 'EZA', '美元通道'],
    ['stk', 'Naspers', 'NPN', '持有腾讯股份'],
    ['stk', 'Valterra Platinum', 'VAL', '原英美铂业，2025 年分拆'],
    ['stk', 'Gold Fields', 'GFI', '金矿'],
    ['stk', 'Capitec', 'CPI', '零售银行'],
  ],
  risks: ['汽油首破每升 30 兰特；二季度能源占进口约四分之一，为 1994 年来最高', '兰特约 16.4', '物流与电力瓶颈'],
  watch: '11 月南非储备银行议息',
  src: ['zaf', 'afstk', 'metals'],
};

export const PROFILES = P;
