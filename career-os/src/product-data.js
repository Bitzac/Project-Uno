// Product module content: idea → PMF, plus launching in mainland China.
// Facts carry source keys into SRC (merged at the bottom); copy may cite inline by wrapping a source key in double square brackets.
// Step ids start with "pd-" and must not collide with fundraising step ids (build.mjs checks it).

const PD_PHASES = [
  { id: 'pd-problem', n: '问题验证', short: '这个问题值得解决吗', d: '先证明有一群人反复遇到这个问题、现在的办法让他们不满意。访谈问过去发生过的事，不问「你会不会用」。' },
  { id: 'pd-solution', n: '方案验证', short: '他们愿意为这个方案付出什么', d: '在写大量代码之前，用落地页、原型或预售看用户是否愿意留下联系方式、花时间或付钱。' },
  { id: 'pd-mvp', n: 'MVP', short: '一条能走通的核心路径', d: '只做让用户完成一次核心价值的最短路径，同时把合规和埋点一起做进去，事后补的成本更高。' },
  { id: 'pd-launch', n: '中国上线', short: '备案、许可与平台审核', d: '在中国大陆对公众提供服务，先完成备案；收费、处理健康数据、做支付各有额外要求。见「中国上线」页的矩阵。' },
  { id: 'pd-retain', n: '早期留存', short: '用户会不会回来', d: '定义「激活」和「留存」到底指哪个行为，按注册周看队列，而不是只看总用户数。' },
  { id: 'pd-pmf', n: 'PMF 判定', short: '有没有一群离不开你的用户', d: '用留存曲线和「非常失望」比例两类证据一起判断，单看一个数字容易自欺。见「指标与 PMF」页。' },
  { id: 'pd-scale', n: '规模化前检查', short: '能不能放大', d: '有了 PMF 之后才值得花钱获客：先确认单位经济、一条可重复的获客渠道和系统容量。' }
];

// only: limit to sectors (health = 身体健康 OS 一类, platform = 破土 一类). links: related fundraising step ids.
const PD_STEPS = [
  // 问题验证
  { id: 'pd-segment', ph: 'pd-problem', t: '写下最早的一批目标用户', d: '具体到能找到人的程度：他们是谁、在哪里、现在怎么解决这个问题。', out: '一段用户画像 + 去哪里找到 20 个这样的人。', tip: { 'health-os': '例如：家里有长辈慢病、自己每年体检、手上戴着智能手表的人。', 'groundbreak': '两边都要写：想被看见的早期创业者，以及在找项目的天使投资人。' } },
  { id: 'pd-interview-guide', ph: 'pd-problem', t: '准备访谈提纲', d: '只问过去和现在的行为：上一次遇到这个问题是什么时候、怎么解决的、花了多少时间或钱。不要介绍你的产品，也不要问「你会不会用」。', out: '一页访谈提纲。' },
  { id: 'pd-interviews', ph: 'pd-problem', t: '完成 10–20 个用户访谈', d: '每次访谈后当天写下原话。同一个痛点在不同人身上反复出现，才算信号。', out: '访谈记录表（人、日期、原话、痛点）。' },
  { id: 'pd-problem-rank', ph: 'pd-problem', t: '给问题排序', d: '按出现频率和痛的程度排序，只留第一名。第二名以后先放进待办。', out: '问题排序表。' },
  // 方案验证
  { id: 'pd-landing', ph: 'pd-solution', t: '做一个落地页或假门测试', d: '用一句话讲清价值，放一个「申请试用」按钮，看访问的人里有多少留下联系方式。', out: '落地页 + 访问量和留资率。' },
  { id: 'pd-prototype-test', ph: 'pd-solution', t: '拿原型给 5 个目标用户试', d: '让他们自己完成核心任务，你只看不教。记下卡住的地方。', out: '可用性问题清单。', tip: { 'health-os': '仓库里的原型已经能用：请用户录入一次体检单、添加一位家人，看是否卡住。', 'groundbreak': '原型能跑：请创业者走一遍「首发 → 众筹」，请投资人走一遍「认证 → 看项目」。' } },
  { id: 'pd-commit', ph: 'pd-solution', t: '拿到付出代价的承诺', d: '预付款、试点合同、意向书或至少一次排期，比「我会用」可靠得多。', out: '承诺清单（谁、承诺了什么）。', tip: { 'groundbreak': '破土的众筹本身就是这一步：一个项目的达成率就是需求证据。' } },
  // MVP
  { id: 'pd-scope', ph: 'pd-mvp', t: '只保留一条核心路径', d: '写下用户从打开到获得一次价值的步骤，每一步都问「去掉它还能用吗」。', out: 'MVP 范围清单（做 / 不做）。' },
  { id: 'pd-account', ph: 'pd-mvp', t: '账号与登录', d: '面向中国大陆用户，通常用手机号或微信登录。基本功能不依赖的个人信息不要强制收集：运动健身类、女性健康类 App 按规定无须个人信息即可使用基本功能[[nec-pi-scope]]。', out: '登录方案 + 字段清单（必要 / 可选）。', tip: { 'health-os': '现在依赖 claude.ai 账号和云端数据库，离开 claude.ai 就没有账号体系（health-os/src/core.js:140）。保留「不登录也能在本机使用」的模式。', 'groundbreak': '现在身份是演示切换（groundbreak/src/app.js:23）。创业者、支持者、投资人要三套权限。' } },
  { id: 'pd-privacy', ph: 'pd-mvp', t: '隐私政策和首次运行提示', d: '处理个人信息前要以显著方式告知处理者、目的、方式、种类和保存期限[[pipl]]。App 首次运行要用弹窗等明显方式提示阅读隐私政策，进入主界面后 4 次点击以内要能找到，同意前不能开始收集或开权限[[app-pi-rules]]。', out: '隐私政策 + 首次运行弹窗 + 设置页入口。' },
  { id: 'pd-sensitive', ph: 'pd-mvp', only: ['health'], t: '健康数据单独同意与家人授权', d: '医疗健康信息是敏感个人信息，要单独同意并告知必要性和影响；处理不满 14 周岁未成年人的信息要取得监护人同意[[pipl]]。家人档案是别人的信息，要设计授权方式。', out: '单独同意页面、家人授权流程、未成年人监护人同意流程。', tip: { 'health-os': '新建档案（health-os/src/core.js:195）直接写入，没有任何授权流程。' } },
  { id: 'pd-instrument', ph: 'pd-mvp', t: '埋点：注册、激活、核心行为、回访', d: '至少记录四个事件，才能算出第 1 / 4 / 12 / 24 周留存。埋点本身也收集个人信息，要写进隐私政策。', out: '事件表（事件名、触发时机、字段）。' },
  { id: 'pd-export', ph: 'pd-mvp', t: '数据导出与注销', d: '用户能把自己的数据带走、能删除账号。健康和交易数据尤其会被投资人和用户问到。', out: '导出功能 + 注销流程。', tip: { 'health-os': '已能删除档案（health-os/src/core.js:203），还不能导出。', 'groundbreak': '数据只存在本机浏览器（groundbreak/src/app.js:8），换设备就没了。' } },
  { id: 'pd-boundary', ph: 'pd-mvp', only: ['health'], t: '写清「不是诊断」的产品边界', d: '面向健康人群、记录统计健康信息的软件一般不属于医疗器械；用于疾病管理、分析医疗数据的属于[[nmpa-sw]]。把这条边界写进界面文案和功能清单。', out: '一页功能边界说明 + 界面文案修改。', tip: { 'health-os': '按严重程度着色和参考区间标签（health-os/src/core.js:251）要明确写「参考，不是诊断」。' } },
  { id: 'pd-qualify', ph: 'pd-mvp', only: ['platform'], t: '合格投资者认证流程', d: '投资人专区只对认证用户开放，认证要真实核验资产或收入，并保留记录。私募基金不得向合格投资者以外的人募集或宣传推介[[pf-reg]]。', out: '认证流程设计 + 律师意见。', tip: { 'groundbreak': '现在是一键演示认证（groundbreak/src/app.js:341）。' } },
  // 中国上线
  { id: 'pd-form', ph: 'pd-launch', t: '选交付形态', d: '网页、小程序、iOS、安卓的合规要求不同。网页只需要网站备案，是成本最低的起点；做 App 或小程序还要做 App 备案[[miit-app-filing]]。', out: '交付形态决定 + 时间表。', tip: { 'health-os': '现在是网页应用，先做网页 / H5 版最省事。', 'groundbreak': '同样先做网页；小程序适合后期做传播。' } },
  { id: 'pd-icp', ph: 'pd-launch', t: 'ICP 备案', d: '非经营性互联网信息服务实行备案，未备案不得从事互联网信息服务[[icp-measures]]。通常通过服务器所在的云服务商提交。', out: 'ICP 备案号（放在网站底部）。' },
  { id: 'pd-icp-license', ph: 'pd-launch', t: '收费前办 ICP 经营许可证', d: '通过互联网有偿提供信息服务属于经营性，实行许可制度[[icp-measures]]。会员订阅、付费功能上线前要办好。', out: '增值电信业务经营许可证（ICP 证）。', tip: { 'health-os': 'C 端订阅属于有偿服务。', 'groundbreak': '投资人订阅、创业者增值服务都属于有偿服务。' } },
  { id: 'pd-app-filing', ph: 'pd-launch', t: 'App / 小程序备案', d: '在境内从事互联网信息服务的 App 要备案，未备案不得从事 App 互联网信息服务，新 App 先备案后开展业务；已有网站备案的只需补充 App 信息[[miit-app-filing]]。iOS 上架时 ICP 备案号要和工信部的备案信息一致[[apple-icp]]。', out: 'App 备案号。' },
  { id: 'pd-copyright', ph: 'pd-launch', t: '软件著作权登记', d: '国内安卓商店上架常要求软著，具体以各商店审核指南为准[[soft-copyright]]。软著也是融资尽调里的知识产权材料。', out: '软著证书。', links: ['prep-ip'] },
  { id: 'pd-mlps', ph: 'pd-launch', t: '网络安全等级保护', d: '国家实行网络安全等级保护制度，网络运营者要按等级履行安全保护义务[[csl-2025]]。先定级；第二级及以上要在定级后 30 日内到公安机关备案[[mlps-filing]]。处理健康、交易数据的系统要尽早定级。', out: '定级报告与整改计划。' },
  { id: 'pd-payment', ph: 'pd-launch', only: ['platform'], t: '接入持牌支付机构', d: '未经依法批准，任何单位和个人不得从事或者变相从事支付业务[[payment-reg]]。众筹支持款只走持牌支付机构的存管和分账，平台账户不过钱。', out: '支付机构签约 + 资金流程图。', tip: { 'groundbreak': '现在支付是演示（groundbreak/src/app.js:336）。' } },
  { id: 'pd-store', ph: 'pd-launch', t: '平台审核与上架', d: '按所选形态准备商店或微信平台的审核材料，预留被打回修改的时间。', out: '上架记录。' },
  // 早期留存
  { id: 'pd-activation', ph: 'pd-retain', t: '定义「激活」', d: '找到预示用户会留下来的那个行为，例如完成第一次记录或第一次投票。之后所有转化都以它为准。', out: '激活定义 + 当前激活率。', tip: { 'health-os': '候选：添加第一位家人并录入一条体征。', 'groundbreak': '候选：创业者完成首发；投资人第一次关注项目。' } },
  { id: 'pd-cohorts', ph: 'pd-retain', t: '按注册周记录留存队列', d: '每周把新注册用户当作一个队列，记下第 1、4、12、24 周还活跃的人数。在「指标与 PMF」页录入。', out: '队列表（已在本系统录入）。' },
  { id: 'pd-habit', ph: 'pd-retain', t: '设计回访理由', d: '给用户一个自然的回来时机：提醒、周报、新内容。提醒要用户主动开启，并能随时关闭。', out: '回访机制设计。', tip: { 'health-os': '已有计划模块，但没有提醒。', 'groundbreak': '每日首发榜本身是回访理由；开售提醒目前只存本机（groundbreak/src/app.js:331）。' } },
  { id: 'pd-feedback', ph: 'pd-retain', t: '建反馈渠道', d: '在产品里放一个随手反馈入口，每周读一遍，按频率归类。', out: '反馈汇总表。' },
  // PMF 判定
  { id: 'pd-ellis', ph: 'pd-pmf', t: '做「非常失望」调研', d: '只问最近两周用过至少两次的用户：「如果不能再用这个产品，你会有多失望？」选项是非常失望、有点失望、不失望。约 40 份回答可以得到方向性结论[[superhuman-pmf]]。', out: '调研结果（在「指标与 PMF」页录入）。' },
  { id: 'pd-segment-love', ph: 'pd-pmf', t: '找出最爱用的那群人', d: '把回答「非常失望」的人单独分组，看他们有什么共同点。Superhuman 只靠分群就把这个比例从 22% 提到 33%[[superhuman-pmf]]。', out: '核心用户画像 v2。' },
  { id: 'pd-roadmap-love', ph: 'pd-pmf', t: '按调研结果排路线图', d: '一半做核心用户最喜欢的部分，一半解决「有点失望」用户提到的障碍，每季度重测一次[[superhuman-pmf]]。', out: '下季度路线图。' },
  { id: 'pd-nps', ph: 'pd-pmf', t: '测一次 NPS', d: 'NPS = 打 9–10 分的推荐者占比 − 打 0–6 分的贬损者占比[[bain-nps]]。和「非常失望」调研一起看。', out: 'NPS 结果（在「指标与 PMF」页录入）。' },
  // 规模化前检查
  { id: 'pd-unit', ph: 'pd-scale', t: '算单位经济', d: '一个用户带来的收入和获取他的成本，按队列算，不按平均。', out: '单位经济表。' },
  { id: 'pd-channel', ph: 'pd-scale', t: '跑通一条可重复的获客渠道', d: '同样的投入，连续几周带来稳定的新用户和相近的留存。', out: '渠道实验记录。' },
  { id: 'pd-capacity', ph: 'pd-scale', t: '检查系统容量和稳定性', d: '用户量翻十倍时，哪里先坏：服务器、数据库、客服还是审核。', out: '容量与故障预案。' },
  { id: 'pd-to-bp', ph: 'pd-scale', t: '把数据写进 BP', d: '把留存曲线、调研结果和单位经济放进 BP 的「数据与进展」页，融资模块的路演页会显示你在这里录入的最新数据。', out: 'BP 数据页更新。', links: ['pitch-bp'] }
];
const PD_STEP_BY_ID = Object.fromEntries(PD_STEPS.map(s => [s.id, s]));

// Product sources were last opened and checked on this date (the fundraising module keeps its own ASOF).
const PD_ASOF = '2026-10-12';

// ----- China launch: delivery form × requirement -----
// v: 'must' | 'maybe' | 'no' per form; why: the condition in plain words; for: highlight for these sectors.
const LAUNCH_FORMS = [
  { id: 'web', n: '网页 / H5' }, { id: 'mp', n: '微信小程序' }, { id: 'ios', n: 'iOS App' }, { id: 'android', n: '安卓 App' }
];
const LAUNCH = [
  { id: 'icp', n: 'ICP 备案', v: { web: 'must', mp: 'must', ios: 'must', android: 'must' }, why: '非经营性互联网信息服务实行备案，未备案不得提供服务[[icp-measures]]；App 和小程序另有 App 备案，已做网站备案的只需补充 App 信息[[miit-app-filing]]。', src: ['icp-measures', 'miit-app-filing'], step: 'pd-icp' },
  { id: 'icp-license', n: 'ICP 经营许可证', v: { web: 'maybe', mp: 'maybe', ios: 'maybe', android: 'maybe' }, why: '有偿提供信息服务（会员、订阅、付费功能）属于经营性，要取得许可[[icp-measures]]。', src: ['icp-measures'], step: 'pd-icp-license', for: ['health', 'platform'] },
  { id: 'app-filing', n: 'App / 小程序备案', v: { web: 'no', mp: 'must', ios: 'must', android: 'must' }, why: '未履行备案手续的，不得从事 App 互联网信息服务；分发平台含小程序、快应用[[miit-app-filing]]。iOS 的 ICP 备案号要与工信部信息一致[[apple-icp]]；微信要求小程序先备案后上架[[wechat-mp]]。', src: ['miit-app-filing', 'apple-icp', 'wechat-mp'], step: 'pd-app-filing' },
  { id: 'privacy', n: '隐私政策与首次提示', v: { web: 'must', mp: 'must', ios: 'must', android: 'must' }, why: '处理个人信息前要显著告知[[pipl]]；App 没有隐私政策、首次运行未提示、同意前就收集，都可认定违规[[app-pi-rules]]。', src: ['pipl', 'app-pi-rules'], step: 'pd-privacy' },
  { id: 'necessary', n: '必要个人信息范围', v: { web: 'no', mp: 'must', ios: 'must', android: 'must' }, why: 'App（含小程序）不得因用户不同意提供非必要个人信息而拒绝基本功能[[nec-pi-scope]]。', src: ['nec-pi-scope'], step: 'pd-account' },
  { id: 'sensitive', n: '敏感信息单独同意', v: { web: 'maybe', mp: 'maybe', ios: 'maybe', android: 'maybe' }, why: '处理医疗健康、未成年人等敏感个人信息时，要单独同意并告知必要性和影响[[pipl]]。', src: ['pipl'], step: 'pd-sensitive', for: ['health'] },
  { id: 'mlps', n: '网络安全等级保护', v: { web: 'must', mp: 'must', ios: 'must', android: 'must' }, why: '国家实行网络安全等级保护制度，网络运营者按等级履行安全保护义务[[csl-2025]]；先定级，第二级及以上在定级后 30 日内到公安机关备案[[mlps-filing]]。', src: ['csl-2025', 'mlps-filing'], step: 'pd-mlps' },
  { id: 'copyright', n: '软件著作权', v: { web: 'no', mp: 'no', ios: 'no', android: 'maybe' }, why: '国内安卓商店上架常要求软著，以各商店审核指南为准[[soft-copyright]]；其余形态不强制，但融资尽调有用。', src: ['soft-copyright'], step: 'pd-copyright' },
  { id: 'genai', n: '生成式 AI 备案', v: { web: 'maybe', mp: 'maybe', ios: 'maybe', android: 'maybe' }, why: '只在向境内公众提供生成文本、图片等内容的服务时适用；具有舆论属性或社会动员能力的，要做安全评估和算法备案[[genai-measures]]。', src: ['genai-measures'] },
  { id: 'payment', n: '支付牌照', v: { web: 'maybe', mp: 'maybe', ios: 'maybe', android: 'maybe' }, why: '自己代收代付属于支付业务，未经批准不得从事；接入持牌支付机构就不需要自己持牌[[payment-reg]]。', src: ['payment-reg'], step: 'pd-payment', for: ['platform'] },
  { id: 'device', n: '医疗器械边界', v: { web: 'maybe', mp: 'maybe', ios: 'maybe', android: 'maybe' }, why: '只做健康人群的记录统计一般不属于医疗器械；做疾病管理、分析医疗数据的要按医疗器械注册[[nmpa-sw]]。', src: ['nmpa-sw'], step: 'pd-boundary', for: ['health'] },
  { id: 'securities', n: '证券与集资边界', v: { web: 'maybe', mp: 'maybe', ios: 'maybe', android: 'maybe' }, why: '向不特定对象或累计超过 200 人发行属于公开发行[[sec-law]]；承诺回报向不特定对象吸收资金属于非法集资[[illegal-fund]]。', src: ['sec-law', 'illegal-fund'], step: 'pd-qualify', for: ['platform'] }
];

// ----- PMF benchmarks -----
const RET_CATS = [
  { id: 'consumer-social', n: '消费社交', good: 25, great: 45 },
  { id: 'consumer-tx', n: '消费交易', good: 30, great: 50 },
  { id: 'consumer-saas', n: '消费订阅 / 工具', good: 40, great: 70 },
  { id: 'smb-saas', n: '中小企业 SaaS', good: 60, great: 80 },
  { id: 'ent-saas', n: '企业 SaaS', good: 70, great: 90 }
];
// Default retention benchmark per sector (every key of SECTORS; build.mjs checks it). The viewer can override it per project.
const DEFAULT_CAT = { health: 'consumer-saas', platform: 'consumer-tx', ai: 'consumer-saas', hardtech: 'ent-saas', saas: 'smb-saas', consumer: 'consumer-tx', content: 'consumer-social' };
const PMF_RULES = [
  { id: 'data', n: '数据够判断', how: '至少 3 个有第 4 周数据的队列，或一份不少于 40 人的「非常失望」调研。', src: ['superhuman-pmf'] },
  { id: 'ellis', n: '「非常失望」≥ 40%', how: 'Sean Ellis 对比近百家初创公司，40% 是分界线：低于它的公司几乎都难以增长。', src: ['superhuman-pmf'] },
  { id: 'flat', n: '留存曲线走平', how: '第 12 周留存不低于第 4 周的 80%。「走平」的说法来自公开资料，80% 这个阈值是本系统的规则。', src: ['lenny-retention'] },
  { id: 'height', n: '第 24 周留存达到品类基准', how: '对照所选品类 6 个月留存的「好」线（美国从业者调查口径，没有中国同口径数据）。', src: ['lenny-retention'] }
];

// Next-round data targets, translated from the fundraising module's round gates.
const FUND_TARGETS = {
  seed: [{ t: '完成 10–20 个用户访谈', step: 'pd-interviews' }, { t: '一个能演示的原型，至少 5 个目标用户试过', step: 'pd-prototype-test' }, { t: '至少一条付出代价的承诺（预付款、试点、意向书）', step: 'pd-commit' }],
  angel: [{ t: '产品已上线并完成 ICP 备案', step: 'pd-icp' }, { t: '有激活定义', step: 'pd-activation' }, { t: '至少 3 个有第 4 周数据的队列', rule: 'data' }],
  preA: [{ t: '留存曲线开始走平', rule: 'flat' }, { t: '「非常失望」≥ 40%', rule: 'ellis' }, { t: '有连续的付费转化数据', metric: 'payers' }],
  A: [{ t: '达到 PMF 判定的全部条件', rule: 'all' }, { t: '单位经济成立', step: 'pd-unit' }, { t: '一条可重复的获客渠道', step: 'pd-channel' }],
  B: [{ t: '单位经济在放大后仍成立', step: 'pd-unit' }], C: [{ t: '系统容量能撑住下一个量级', step: 'pd-capacity' }], preIPO: [{ t: '对照目标板块的财务标准（见融资模块轮次地图）' }]
};

// ----- code audit of the built-in projects -----
// st: 'ok' | 'part' | 'gap'; ev: repo path[:line] (build.mjs checks the file exists); step: the pd- step that closes the gap.
const AUDIT_DIMS = [
  { id: 'core', n: '核心价值' }, { id: 'account', n: '账号与身份' }, { id: 'privacy', n: '隐私政策与同意' },
  { id: 'sensitive', n: '敏感信息与授权' }, { id: 'export', n: '数据导出与持久化' }, { id: 'metrics', n: '埋点与指标' },
  { id: 'retain', n: '留存机制' }, { id: 'money', n: '支付与收费' }, { id: 'resilience', n: '错误降级' },
  { id: 'boundary', n: '合规边界' }, { id: 'launch', n: '中国上线形态' }
];
const AUDIT = {
  'health-os': {
    core: { st: 'ok', d: '3D 人体 35 个部位定义（男 32 / 女 35），问题、体征、体检、计划四个模块，多人档案。', ev: 'health-os/src/anatomy.js:10' },
    account: { st: 'part', d: '靠 claude.ai 账号和 Artifact 云端数据库，连不上时退回本机存储；离开 claude.ai 没有自己的账号体系。', ev: 'health-os/src/core.js:140', step: 'pd-account' },
    privacy: { st: 'gap', d: '代码里没有隐私政策、首次运行提示或同意流程。', ev: 'health-os/src/body.html', step: 'pd-privacy' },
    sensitive: { st: 'gap', d: '多人档案（含家人）没有任何授权流程，也没有未成年人的监护人同意。', ev: 'health-os/src/core.js:195', step: 'pd-sensitive' },
    export: { st: 'part', d: '能删除档案和记录，不能导出。', ev: 'health-os/src/core.js:203', step: 'pd-export' },
    metrics: { st: 'gap', d: '没有埋点，算不出激活率和留存。', ev: 'health-os/src/boot.js', step: 'pd-instrument' },
    retain: { st: 'part', d: '有计划模块（带到期和重复），只在打开页面后显示逾期，不会主动提醒。', ev: 'health-os/README.md:45', step: 'pd-habit' },
    money: { st: 'gap', d: '还没有收费设计；上线订阅前要先办 ICP 经营许可证。', ev: 'health-os/README.md', step: 'pd-icp-license' },
    resilience: { st: 'ok', d: '3D 引擎或 WebGL 加载失败时有兜底提示，左侧数据照常可用；Worker 失败退回主线程。', ev: 'health-os/src/three3d.js:298' },
    boundary: { st: 'part', d: '参考标准写在页面上；按严重程度着色和「偏瘦 / 超重」等标签要写清是参考，不是诊断。', ev: 'health-os/src/core.js:251', step: 'pd-boundary' },
    launch: { st: 'gap', d: '目前只发布为 claude.ai Artifact（离开后退回本机模式），依赖 Google Fonts 和 cdnjs；没有面向中国大陆公众的部署和备案。', ev: 'health-os/README.md:24', step: 'pd-form' }
  },
  groundbreak: {
    core: { st: 'ok', d: '首发榜、众筹、投资人专区、创业者后台四个视图可交互，用 14 个虚构项目演示。', ev: 'groundbreak/README.md:9' },
    account: { st: 'gap', d: '身份是访客 / 认证投资人的演示切换，没有账号。', ev: 'groundbreak/src/app.js:23', step: 'pd-account' },
    privacy: { st: 'gap', d: '代码里没有隐私政策或同意流程。', ev: 'groundbreak/src/body.html', step: 'pd-privacy' },
    sensitive: { st: 'gap', d: '合格投资者认证是一键演示，没有真实核验资产或收入。', ev: 'groundbreak/src/app.js:341', step: 'pd-qualify' },
    export: { st: 'part', d: '投票、关注、身份只存在本机浏览器，换设备就没了。', ev: 'groundbreak/src/app.js:8', step: 'pd-export' },
    metrics: { st: 'gap', d: '没有埋点。', ev: 'groundbreak/src/app.js', step: 'pd-instrument' },
    retain: { st: 'part', d: '每日首发榜是天然的回访理由；开售提醒只存本机，不会真正提醒。', ev: 'groundbreak/src/app.js:331', step: 'pd-habit' },
    money: { st: 'gap', d: '支持款支付是演示，没有接入持牌支付机构。', ev: 'groundbreak/src/app.js:336', step: 'pd-payment' },
    resilience: { st: 'part', d: '本机存储读写有异常保护；没有服务端，也就没有服务端的故障处理。', ev: 'groundbreak/src/app.js:8' },
    boundary: { st: 'ok', d: '融资信息只对认证投资人可见，公开页不出现轮次和金额。', ev: 'groundbreak/src/app.js:247' },
    launch: { st: 'gap', d: '纯静态页面，目前只发布为 claude.ai Artifact，依赖 Google Fonts；没有面向中国大陆公众的部署和备案。', ev: 'groundbreak/README.md:20', step: 'pd-form' }
  }
};

// ----- sources added by this module -----
Object.assign(SRC, {
  'icp-measures': { t: '互联网信息服务管理办法（2011 年修订，第 3、4 条）', u: 'https://www.gov.cn/gongbao/content/2011/content_1860864.htm', d: '2011-01-08' },
  'miit-app-filing': { t: '工业和信息化部关于开展移动互联网应用程序备案工作的通知（工信部信管〔2023〕105 号）', u: 'https://www.gov.cn/zhengce/zhengceku/202308/content_6897341.htm', d: '2023-07-21' },
  'apple-icp': { t: 'Apple App Store Connect Help: App information（ICP Filing Number）', u: 'https://developer.apple.com/help/app-store-connect/reference/app-information/', d: '2026-10' },
  'wechat-mp': { t: '安全内参转载：微信小程序备案通知（平台规则）', u: 'https://www.secrss.com/articles/57609', d: '2023-08' },
  'csl-2025': { t: '中华人民共和国网络安全法（2025 年修正，第 23 条；中国网信网）', u: 'https://www.cac.gov.cn/2025-12/29/c_1768735112911946.htm', d: '2025-10-28' },
  'genai-measures': { t: '生成式人工智能服务管理暂行办法（第 2、17 条；中国网信网）', u: 'https://www.cac.gov.cn/2023-07/13/c_1690898327029107.htm', d: '2023-08-15' },
  'nec-pi-scope': { t: '常见类型移动互联网应用程序必要个人信息范围规定（IT之家全文转载）', u: 'https://www.ithome.com/0/541/410.htm', d: '2021-05-01' },
  'app-pi-rules': { t: 'App 违法违规收集使用个人信息行为认定方法（国信办秘字〔2019〕191 号）', u: 'https://www.elawcn.com/rule/2019/1230/531.html', d: '2019-11-28' },
  'payment-reg': { t: '非银行支付机构监督管理条例（国务院令第 768 号，第 6 条；人民日报全文）', u: 'https://paper.people.com.cn/rmrb/html/2023-12/18/nw.D110000renmrb_20231218_1-17.htm', d: '2024-05-01' },
  'soft-copyright': { t: '阿里云开发者社区：App 上架需要准备什么（第三方经验，非商店官方规则）', u: 'https://developer.aliyun.com/article/1220761', d: '2023' },
  'mlps-filing': { t: '信息安全等级保护备案实施细则（第 2、6、16 条；中国政府网刊载）', u: 'https://www.gov.cn/fuwu/2020-11/23/5563534/files/8d9365b6d0f54397bd341fefdfd572cf.docx', d: '2020-11-23' },
  'superhuman-pmf': { t: 'First Round Review: How Superhuman built an engine to find product/market fit', u: 'https://review.firstround.com/how-superhuman-built-an-engine-to-find-product-market-fit', d: '2018-11-13' },
  'lenny-retention': { t: "Lenny's Newsletter: What is good retention?（与 Casey Winters 的从业者调查）", u: 'https://www.lennysnewsletter.com/p/what-is-good-retention-issue-29', d: '2020-06-09' },
  'bain-nps': { t: 'Bain & Company: Measuring your Net Promoter Score', u: 'https://nps.bain.com/about/measuring-your-net-promoter-score/', d: '2026-10' }
});
SRC['pipl'] = { t: '中华人民共和国个人信息保护法（第 17、28–31、55 条）', u: 'https://www.cac.gov.cn/2021-08/20/c_1631050028355286.htm', d: '2021-11-01' };
