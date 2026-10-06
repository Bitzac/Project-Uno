// Fundraising module content (China mainland). Facts carry a source key into SRC; copy may cite inline as [[key]].
// Fit scores (0–5) are this system's judgement for a seed / angel round, with the reason written next to each one.
const ASOF = '2026-10-06';

// ----- one round, phase by phase -----
// w: typical weeks [smooth, common upper bound]
const PHASES = [
  { id: 'prep', n: '准备', short: '公司、股权、材料', w: [2, 6], d: '投资人尽调时会回头查这里的每一项。融资前做好，比签了 TS 再补快得多。' },
  { id: 'find', n: '找资方', short: '名单与引荐', w: [2, 4], d: '按适配度矩阵列出目标机构，逐家核对近期同赛道、同阶段的投资案例，再找引荐人。' },
  { id: 'pitch', n: '路演', short: '见面到立项', w: [4, 10], d: '首次会面集中排在两三周内，让几家机构的节奏对齐；每次会后复盘问题清单。' },
  { id: 'ts', n: '条款', short: 'TS 谈判', w: [1, 3], d: '投资意向书（TS）里只有保密、排他期、费用等少数条款有约束力，但估值和关键权利基本在这一步定下来。' },
  { id: 'dd', n: '尽调', short: '业务 · 财务 · 法律', w: [3, 8], d: '投资方和他们请的律所、会计所会核对你在路演里说过的每个数字。' },
  { id: 'ic', n: '投决', short: '投资决策委员会', w: [1, 2], d: '尽调报告上投决会，通过后才进入签约。' },
  { id: 'sign', n: '签约', short: '增资协议 · 股东协议 · 章程', w: [2, 4], d: '交易文件把 TS 的条款写成有约束力的合同。' },
  { id: 'close', n: '交割', short: '工商变更与到账', w: [1, 4], d: '先决条件满足后打款，并在规定时间内办理变更登记。' },
  { id: 'post', n: '投后', short: '报告与下一轮', w: null, d: '按协议定期报送经营数据；在现金还能撑 6 个月以上时启动下一轮。' }
];

// pre: done by default for this user (company already registered). br: 'gov' (state-owned investor) | 'usd' (offshore structure).
// only: limit to sectors. tip: per-project or per-sector note shown when expanded.
const STEPS = [];
const STEP_BY_ID = Object.fromEntries(STEPS.map(s => [s.id, s]));

// ----- pitch -----
const BP = [
  { id: 'cover', t: '封面与一句话', q: '你们是谁，做什么？一句话说清。' },
  { id: 'problem', t: '痛点', q: '谁、在什么场景下痛？现在怎么凑合解决？' },
  { id: 'solution', t: '产品', q: '怎么解决？最好直接演示。' },
  { id: 'whynow', t: '为什么是现在', q: '为什么以前做不成，现在能做成？' },
  { id: 'market', t: '市场规模', q: '能做多大？自下而上算给我看。' },
  { id: 'model', t: '商业模式', q: '谁付钱、付多少、多久付一次？' },
  { id: 'traction', t: '数据与进展', q: '有什么证据说明有人要？' },
  { id: 'competition', t: '竞争', q: '别人为什么做不了或做不好？' },
  { id: 'team', t: '团队', q: '为什么是你们？缺谁？' },
  { id: 'risk', t: '合规与风险', q: '在中国做这件事有什么监管风险，怎么处理？' },
  { id: 'finance', t: '财务预测', q: '钱怎么花，花完公司在哪？' },
  { id: 'ask', t: '融资计划', q: '要多少、让多少、用在哪、到什么里程碑？' }
];

const QA = [
  { q: '估值是怎么来的？', a: '早期估值主要由「要融多少钱」和「愿意让出多少」反推：融资额 ÷ 出让比例 = 投后估值。准备好同赛道、同阶段近一年的公开融资案例做参照，说清楚这笔钱能把公司带到哪个里程碑。' },
  { q: '为什么要这么多钱？花完到哪？', a: '按月列出 18 个月的花费（人员、服务器、获客、合规），标出下一轮融资要达到的数据门槛。投资人看的是「这笔钱够不够你走到能融下一轮的位置」。' },
  { q: '创始团队的股权怎么分的？有没有代持？', a: '给出股权结构表、合伙人协议（含退出回购和成熟期）、期权池。代持在尽调中一定会被要求还原，融资前就清理掉。' },
  { q: '还在和哪些机构谈？进展到哪一步？', a: '可以说进度（几家在立项、几家在尽调），一般不报具体机构名单。如果已有领投方，说出来会加快跟投方决策。' },
  { q: '如果大厂也做，你怎么办？', a: '回答你的差异在哪里、大厂为什么短期内不会投入：细分人群、合规门槛、渠道或数据积累。别回答「大厂不会做」。' },
  { q: '下一轮什么时候融、靠什么数据？', a: '给出时间点和数据门槛，例如「12 个月后，月活 X、留存 Y、收入 Z」，并说明这些数字和本轮资金用途的关系。' }
];

// ----- sectors: fit of each source type for a seed / angel round -----
// key: which institution tag (INSTS.fit) this sector matches besides 'general'.
const SECTORS = {
  health: { n: '数字健康 / 健康管理软件', key: 'health',
    fit: { angel: 4, incubator: 4, competition: 3, vc_rmb: 4, vc_usd: 1, cvc: 3, gov_fund: 2, local_gov: 2, bank: 1, equity_market: 1, fa: 1 },
    why: {
      angel: '种子轮最常见的第一张支票。优先找投过数字健康的天使，他们能帮你补医学顾问和第一批机构合作。',
      incubator: '加速器给小额种子资金和固定节奏的路演日，适合还没有用户数据的阶段。',
      competition: '大赛的价值是曝光和投资人对接，奖金不是重点；选有「医疗健康」或「互联网」赛道的。',
      vc_rmb: '医疗健康一直是人民币 VC 的主要赛道之一，但多数早期基金更偏好药、械和 AI 医疗；找有消费级健康或健康管理案例的基金。',
      vc_usd: '美元基金在中国的新投资明显收缩，健康数据出境也受限制；种子轮不建议走境外架构。',
      cvc: '保险、体检、可穿戴厂商对健康数据有战略兴趣，但通常在有留存后才投。',
      gov_fund: '产业基金偏药、械和医疗服务；消费级健康软件多通过天使母基金参股的子基金间接获得。',
      local_gov: '软件企业的落地补贴和房租减免金额通常不大，可以作为补充，不要为此换注册地。',
      bank: '没有收入和抵押物，银行贷款很难拿到；有了合同和收入后再看科创贷。',
      equity_market: '挂牌区域性股权市场对种子轮的融资帮助有限。',
      fa: '种子轮金额小，主流 FA 一般不接；A 轮以后再考虑。'
    } },
  platform: { n: '平台 · 创投服务 · 金融科技相邻', key: 'groundbreak',
    fit: { angel: 4, incubator: 4, competition: 3, vc_rmb: 3, vc_usd: 0, cvc: 3, gov_fund: 1, local_gov: 2, bank: 1, equity_market: 2, fa: 1 },
    why: {
      angel: '投资人本身就是平台的用户。找创投圈里愿意早期下注、又能帮你拉第一批项目和投资人的天使。',
      incubator: '加速器自带项目源和投资人网络，正好是平台冷启动需要的两边。',
      competition: '大赛主办方和孵化器都是潜在的项目来源和合作伙伴，参赛同时谈合作。',
      vc_rmb: '平台模式要先过监管定性这一关，机构会要求律师意见；找投过企业服务和交易平台的早期基金。',
      vc_usd: '涉及证券和众筹的平台业务、加上美元基金在华收缩，基本不适配。',
      cvc: '创投媒体、数据服务商、券商和区域性股权市场运营方有战略协同，可能以合作或小额战投进入。',
      gov_fund: '监管定性未明的平台业务，国资基金容忍度低。',
      local_gov: '部分地方政府把投融资对接当作营商环境服务，可以谈合作和场地，资金支持有限。',
      bank: '没有收入和抵押物，银行贷款很难拿到。',
      equity_market: '更适合作为合作渠道：合规的股权交易通道和项目来源，而不是资金来源。',
      fa: 'FA 是潜在竞争者也是合作方，不是种子轮的资金来源。'
    } },
  ai: { n: 'AI 应用', key: null,
    fit: { angel: 4, incubator: 5, competition: 4, vc_rmb: 5, vc_usd: 1, cvc: 4, gov_fund: 4, local_gov: 4, bank: 2, equity_market: 2, fa: 2 },
    why: {
      angel: '活跃天使最多的赛道之一，竞争也激烈；靠产品演示和早期数据说话。',
      incubator: 'AI 是加速器近年的主要方向，种子资金和算力资源都有。',
      competition: 'AI 赛道的大赛多、政府关注度高，适合拿曝光和地方资源。',
      vc_rmb: 'AI 占早期投资笔数和金额的比例都最高，是人民币 VC 的主赛道。',
      vc_usd: '美国对外投资规则限制美国资金投中国的部分 AI 领域，种子轮不建议走美元架构。',
      cvc: '大模型和云厂商有生态投资，适合有明确场景的应用。',
      gov_fund: 'AI 是各地引导基金的重点方向之一。',
      local_gov: '多地有算力券、场地和落地奖励，适合愿意在当地组建团队的公司。',
      bank: '有合同和收入后可以看科创贷。',
      equity_market: '对早期融资帮助有限。',
      fa: 'A 轮以后再考虑。'
    } },
  hardtech: { n: '硬科技 / 先进制造', key: null,
    fit: { angel: 3, incubator: 3, competition: 4, vc_rmb: 5, vc_usd: 1, cvc: 4, gov_fund: 5, local_gov: 5, bank: 3, equity_market: 3, fa: 2 },
    why: {
      angel: '硬科技天使更看重技术来源和团队背景，科研院所背景的天使基金更合适。',
      incubator: '高校和科研院所的孵化器更对口。',
      competition: '大赛是硬科技项目接触地方政府和国资的主要渠道之一。',
      vc_rmb: '人民币 VC 的主赛道，国产替代和先进制造案例多。',
      vc_usd: '半导体、量子等领域受美国对外投资规则限制。',
      cvc: '产业链上下游的大企业常作为战略投资方。',
      gov_fund: '引导基金和国资直投的重点方向，常要求在当地落地。',
      local_gov: '「国资领投 + 项目落地」模式最常见于硬科技和制造业。',
      bank: '有订单、设备和知识产权后，科创贷、知识产权质押更可行。',
      equity_market: '专精特新专板对制造业中小企业更有用。',
      fa: '中后期大额融资时用。'
    } },
  saas: { n: '企业服务 / SaaS', key: null,
    fit: { angel: 4, incubator: 4, competition: 3, vc_rmb: 4, vc_usd: 1, cvc: 3, gov_fund: 2, local_gov: 3, bank: 2, equity_market: 2, fa: 2 },
    why: {
      angel: '有行业经验的天使能直接带来第一批客户。',
      incubator: '加速器的企业客户资源适合早期验证。',
      competition: '可以对接地方产业园和企业客户。',
      vc_rmb: '看付费客户数、续费率和客单价。',
      vc_usd: '美元基金在华收缩，种子轮不建议。',
      cvc: '大厂生态投资看与其平台的协同。',
      gov_fund: '一般通过子基金间接获得。',
      local_gov: '产业园区常给场地和补贴。',
      bank: '有稳定合同后可看科创贷。',
      equity_market: '对早期融资帮助有限。',
      fa: 'A 轮以后再考虑。'
    } },
  consumer: { n: '消费品牌', key: null,
    fit: { angel: 4, incubator: 2, competition: 2, vc_rmb: 3, vc_usd: 1, cvc: 3, gov_fund: 1, local_gov: 2, bank: 2, equity_market: 2, fa: 2 },
    why: {
      angel: '消费天使看复购和渠道数据。',
      incubator: '多数加速器偏科技项目。',
      competition: '大赛对消费品牌帮助有限。',
      vc_rmb: '消费投资较前几年明显降温，看复购和毛利。',
      vc_usd: '美元基金在华收缩。',
      cvc: '渠道和供应链企业可能战略投资。',
      gov_fund: '引导基金较少投消费品牌。',
      local_gov: '部分地方有电商、品牌补贴。',
      bank: '有流水后可看经营贷。',
      equity_market: '对早期融资帮助有限。',
      fa: '有规模后再考虑。'
    } },
  content: { n: '内容 / 媒体 / 文创', key: null,
    fit: { angel: 3, incubator: 2, competition: 2, vc_rmb: 1, vc_usd: 0, cvc: 3, gov_fund: 1, local_gov: 2, bank: 1, equity_market: 1, fa: 0 },
    why: {
      angel: '个人天使和内容圈的投资人更愿意早期支持。',
      incubator: '多数加速器偏科技项目。',
      competition: '文创类大赛和平台扶持计划更对口。',
      vc_rmb: '内容公司很少拿到机构 VC，规模化路径要讲清。',
      vc_usd: '内容领域外资准入受限。',
      cvc: '平台型公司（视频、音频、出版）有内容投资和扶持计划。',
      gov_fund: '宣传文化类专项资金比股权投资更现实。',
      local_gov: '部分地方有文创园区补贴。',
      bank: '很难获得。',
      equity_market: '帮助有限。',
      fa: '不适用。'
    } }
};
