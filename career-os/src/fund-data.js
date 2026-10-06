// Fundraising module content (China mainland). Facts carry a source key into SRC; copy may cite inline by wrapping a source key in double square brackets.
// Fit scores (0–5) are this system's judgement for a seed / angel round, with the reason written next to each one.
const ASOF = '2026-10-06';

// ----- one round, phase by phase -----
// w: typical weeks [smooth, common upper bound]
const PHASES = [
  { id: 'prep', n: '准备', short: '公司、股权、材料', w: [2, 6], d: '投资人尽调时会回头查这里的每一项。融资前做好，比签了 TS 再补快得多。' },
  { id: 'find', n: '找资方', short: '名单与引荐', w: [1, 4], d: '按适配度矩阵列出目标机构，逐家核对近期同赛道、同阶段的投资案例，再找引荐人。' },
  { id: 'pitch', n: '路演', short: '见面到立项', w: [3, 10], d: '首次会面集中排在两三周内，让几家机构的节奏对齐；每次会后复盘问题清单。' },
  { id: 'ts', n: '条款', short: 'TS 谈判', w: [1, 3], src: ['yunting'], d: '投资意向书（TS）里只有保密、排他期、费用等少数条款有约束力，但估值和关键权利基本在这一步定下来。' },
  { id: 'dd', n: '尽调', short: '业务 · 财务 · 法律', w: [4, 16], src: ['yunting'], d: '律所口径：尽调一般要 1–4 个月。投资方和他们请的律所、会计所会核对你在路演里说过的每个数字。' },
  { id: 'ic', n: '投决', short: '投资决策委员会', w: [1, 3], src: ['tryw'], d: '尽调报告上投决会，通过后才进入签约。一家融资服务机构的样本经验：初审会淘汰九成上下，立项会淘汰五到七成，投决会淘汰三到五成（单一机构样本，不是行业统计）。' },
  { id: 'sign', n: '签约', short: '增资协议 · 股东协议 · 章程', w: [2, 8], src: ['yunting'], d: '律所口径：签署投资协议要两周到两个月。交易文件把 TS 的条款写成有约束力的合同。' },
  { id: 'close', n: '交割', short: '工商变更与到账', w: [1, 6], d: '先决条件满足后打款，并在规定时间内办理变更登记。' },
  { id: 'post', n: '投后', short: '报告与下一轮', w: null, d: '按协议定期报送经营数据；在现金还能撑 6 个月以上时启动下一轮。' }
];

// pre: done by default for this user (company already registered). br: 'gov' (state-owned investor) | 'usd' (offshore structure).
// only: limit to sectors. tip: per-project or per-sector note shown when expanded.
const STEPS = [
  // 准备
  { id: 'prep-company', ph: 'prep', pre: true, t: '境内有限公司已设立', d: '营业执照、公司章程、银行基本户、社保和税务登记齐全。', out: '营业执照与章程扫描件，放进数据室「公司文件」目录。' },
  { id: 'prep-capital', ph: 'prep', t: '核对注册资本和实缴期限', d: '新《公司法》要求有限公司股东认缴的出资在公司成立之日起 5 年内缴足[[company-law]]；2024 年 6 月 30 日前成立的公司，要在 2027 年 6 月 30 日前把剩余出资期限调整到 5 年内[[reg-capital-rule]]。注册资本定得过高，股东要在 5 年内按认缴额承担出资责任；融资前按实际需要确认或减资。', out: '股东出资情况表（认缴额、实缴额、期限）。', who: '创始人 + 代账会计' },
  { id: 'prep-cap-table', ph: 'prep', t: '定股权结构和控制权', d: '写清每位创始人的持股、表决权安排和成熟期（常见 4 年，满 1 年开始成熟）。联合创始人之间签合伙人协议，约定提前离开时公司按什么价格回购未成熟部分。', out: '股权结构表（cap table）、合伙人协议。', who: '创始人 + 律师', tip: { 'health-os': '如果医学顾问拿股份，用期权或限制性股权，并写明服务期。', 'groundbreak': '合规合伙人如果拿股份，同样设成熟期。' } },
  { id: 'prep-esop', ph: 'prep', t: '预留期权池和持股平台', d: '常见做法是设一个有限合伙企业作为员工持股平台，创始人担任普通合伙人保留表决权；期权池比例由创始人和投资人在 TS 里谈，经验区间多在 10%–15%。符合条件的非上市公司股权激励可申请递延纳税[[tax-101]]。', out: '持股平台工商登记、期权计划草案。', who: '创始人 + 律师 + 税务顾问' },
  { id: 'prep-ip', ph: 'prep', t: '代码、商标和域名归属公司', d: '尽调会核对核心资产是否在公司名下：代码著作权（可做软件著作权登记）、商标、域名、App 账号。创始人与公司签劳动合同和知识产权转让协议。', out: '知识产权清单、转让协议、软著与商标证书。', tip: { 'health-os': '代码目前在个人 GitHub 仓库（bitzac/project-uno）里，融资前把著作权转让给公司，并把仓库迁到公司组织账号。', 'groundbreak': '同一个仓库：先完成著作权转让；「破土」名称尽早做商标检索和申请。' } },
  { id: 'prep-finance', ph: 'prep', t: '财务规范', d: '公私账户分开，所有支出走公司账户并取得发票；委托代账，按月出财务报表。财务尽调会看银行流水和发票。', out: '最近 12 个月的财务报表和银行流水。', who: '代账会计' },
  { id: 'prep-compliance', ph: 'prep', t: '准备合规底稿', d: '把投资人一定会问的合规问题写成书面材料，尽调时直接交出。', out: '合规说明（2–4 页）+ 相关文件。', tip: { 'health-os': '隐私政策、敏感个人信息单独同意的页面截图、个人信息保护影响评估记录[[pipl]]；一页「产品不做诊断」的功能边界说明[[nmpa-sw]]。', 'groundbreak': '律师意见书：专区是否构成公开劝诱、分期放款能否由支付机构执行、订阅收费的业务定性[[sec-law]][[illegal-fund]]。' } },
  { id: 'prep-plan', ph: 'prep', t: '定融资计划：金额、用途、里程碑', d: '金额按达到下一轮门槛所需的 18 个月花费，再加约 6 个月缓冲；出让比例先定一个上限。写清这笔钱花完公司会有什么数据。', out: '一页融资计划（金额、出让上限、资金用途饼图、里程碑）。' },
  // 找资方
  { id: 'find-list', ph: 'find', t: '列出 30–50 家目标机构', d: '按「找资方」页的适配度矩阵从高到低挑。每家写清：类型、近 12 个月在同赛道同阶段的案例、负责这个方向的合伙人。', out: '目标机构表（可直接在「找资方」页加入目标清单）。' },
  { id: 'find-check', ph: 'find', t: '逐家核对近期案例', d: '用机构官网、公众号和融资新闻核对它最近还在投这个阶段。基金到了投资期末尾、或刚换了方向的机构，见了也很难出手。', out: '每家机构一行：最近一次同类投资的时间、公司、轮次。' },
  { id: 'find-intro', ph: 'find', t: '找引荐人', d: '最有效的引荐来自机构投过的创始人、合作过的律师和会计师。冷邮件也可以发：一页纸 + 一句话说清为什么找这家。', out: '每家目标机构对应的引荐人或联系渠道。' },
  { id: 'find-gov', ph: 'find', br: 'gov', t: '了解国资基金的投资流程和返投要求', d: '国资和政府引导基金参股的子基金，常要求被投企业在当地注册或落地，并且投资流程更长。先问清：是否要求迁址、决策要几轮会、是否需要资产评估。', out: '每家国资背景机构的流程和条件表。', src: ['gov-fund-2025'] },
  { id: 'find-usd', ph: 'find', br: 'usd', t: '评估是否需要境外架构', d: '只有确定要拿美元基金、未来在境外上市时才搭红筹或 VIE 架构。境内居民设立境外特殊目的公司要办外汇登记[[safe-37]]，境外上市要向证监会备案[[csrc-overseas]]；先确认业务是否在外商投资准入负面清单里[[neg-list]]。', out: '架构选择备忘录（律师出具）。' },
  // 路演
  { id: 'pitch-bp', ph: 'pitch', t: '写 BP（12 页）', d: '按「路演」页的 12 页结构写，每页回答一个问题。先写给不认识你的人看的版本，发出去的版本控制在 15 页以内。', out: 'BP（PDF），文件名带项目名和日期。' },
  { id: 'pitch-onepager', ph: 'pitch', t: '一页纸', d: '一页纸用于冷启动和引荐：一句话、问题、产品、数据、团队、本轮金额。', out: '一页纸（PDF）。' },
  { id: 'pitch-model', ph: 'pitch', t: '财务模型', d: '36 个月按月预测：收入假设、人员计划、主要成本。投资人会改你的假设看结果，所以把假设单独放一页。', out: '财务模型（表格）。' },
  { id: 'pitch-demo', ph: 'pitch', t: '产品演示', d: '准备 3 分钟能演示完的主流程，以及一个能现场打开的数据看板。', out: '演示脚本、演示账号。' },
  { id: 'pitch-dataroom', ph: 'pitch', t: '搭数据室', d: '按尽调清单提前整理：公司文件、股权、财务、合同、知识产权、合规、团队。签了 TS 再整理会拖慢尽调。', out: '数据室目录（公司 / 股权 / 财务 / 合同 / IP / 合规 / 团队）。' },
  { id: 'pitch-batch', ph: 'pitch', t: '首次会面集中排在 2–3 周内', d: '把首次会面集中排，几家机构的进度会接近，最后能在同一时间比较条款。', out: '会面日程表。' },
  { id: 'pitch-review', ph: 'pitch', t: '每次会后复盘', d: '记下被问到的问题、没答好的地方、对方下一步。同一个问题被问三次，就把答案写进 BP。', out: '问答记录（可写在本步骤的备注里）。' },
  { id: 'pitch-ic', ph: 'pitch', t: '推进到立项或合伙人会', d: '问清对方内部还要过几道会、每道会需要什么材料、谁拍板。', out: '每家机构的内部流程和时间点。', src: ['vc-process'] },
  // TS
  { id: 'ts-compare', ph: 'ts', t: '收到 TS，逐项对比', d: '把几份 TS 放进同一张表：投前估值、金额、期权池是否计入投前、优先清算倍数、反稀释方式、回购触发条件、一票否决事项、董事席位、排他期。', out: 'TS 对比表。' },
  { id: 'ts-terms', ph: 'ts', t: '谈关键条款', d: '优先清算权常见是 1 倍不参与分配；反稀释常见是广义加权平均，完全棘轮对创始人最不利。回购条款要看由谁承担：与公司对赌，履行时须先完成减资程序[[jiumin]]；要求创始人个人承担的，尽量去掉或设上限。', out: '谈判后的 TS 修订稿。', src: ['ts-terms'] },
  { id: 'ts-lawyer', ph: 'ts', t: '请律师审 TS', d: '找做过创投交易的律师，按次或按交易收费。TS 阶段改条款的成本最低。', out: '律师批注版 TS。' },
  { id: 'ts-sign', ph: 'ts', t: '签 TS', d: 'TS 的大部分条款没有法律约束力，保密、排他期和费用承担条款通常有约束力；排他期内不能再和其他机构谈。', out: '签署版 TS。', src: ['ts-binding'] },
  // 尽调
  { id: 'dd-biz', ph: 'dd', t: '业务尽调', d: '投资方会访谈用户、客户和团队，核对 BP 里的数据口径。', out: '数据口径说明、用户和客户访谈名单。' },
  { id: 'dd-fin', ph: 'dd', t: '财务尽调', d: '核对收入、成本、银行流水和税务，查有没有未披露的负债。', out: '财务报表、流水、纳税记录。' },
  { id: 'dd-legal', ph: 'dd', t: '法律尽调', d: '查股权沿革、出资、重大合同、知识产权、劳动关系、诉讼和合规资质。', out: '律师尽调问卷的回复和文件。', tip: { 'health-os': '会重点问个人信息处理和产品是否触及医疗器械。', 'groundbreak': '会重点问证券和非法集资的定性、支付和资金流。' } },
  { id: 'dd-eval', ph: 'dd', br: 'gov', t: '国资：资产评估与备案', d: '国有投资方入股时，可能要求对公司做资产评估并完成备案，多出数周时间。提前问清是否需要、由谁委托、费用谁承担。', out: '评估报告与备案文件。', src: ['eval-rule'] },
  { id: 'dd-fix', ph: 'dd', t: '整改尽调发现的问题', d: '尽调发现的问题会写进交易文件的先决条件或陈述保证，能在签约前改的先改。', out: '整改清单与完成证明。' },
  // 投决
  { id: 'ic-pass', ph: 'ic', t: '投决会通过', d: '投资方投委会表决通过。没通过时问清原因，常见是估值、团队或某个尽调问题。', out: '投资方书面通知。' },
  // 签约
  { id: 'sign-spa', ph: 'sign', t: '增资协议', d: '写明投资金额、认购的注册资本、价格、交割先决条件、陈述与保证。', out: '增资协议签署版。' },
  { id: 'sign-sha', ph: 'sign', t: '股东协议', d: '写入 TS 里谈好的股东权利：优先清算、反稀释、回购、优先认购、共售、领售、信息权、董事会席位和保护性条款。', out: '股东协议签署版。' },
  { id: 'sign-aoa', ph: 'sign', t: '修订公司章程', d: '把需要对工商登记生效的条款写进新章程。新《公司法》下，公司可以按章程发行优先分红、特别表决权等类别股[[company-law]]；有限公司要做多种权利安排时，常见做法是写进股东协议和章程。', out: '新章程。' },
  { id: 'sign-resolution', ph: 'sign', t: '股东会决议', d: '股东会同意增资。有限公司增资时，原股东有权按实缴出资比例优先认缴，除非全体股东另有约定，所以要取得原股东书面放弃优先认缴权的声明[[company-law]]。', out: '股东会决议、放弃优先认缴权声明。' },
  { id: 'sign-usd', ph: 'sign', br: 'usd', t: '美元：境外重组与外汇登记', d: '设立境外控股公司、境内外商独资企业，完成 37 号文登记[[safe-37]]；投资款进境后按外汇规定结汇。', out: '境外公司文件、外汇登记凭证。' },
  // 交割
  { id: 'close-cp', ph: 'close', t: '满足交割先决条件', d: '逐项完成增资协议里的先决条件（文件签署、决议、整改项），取得投资方确认。', out: '先决条件满足确认函。' },
  { id: 'close-pay', ph: 'close', t: '投资款到账', d: '投资方按协议打款到公司账户；公司出具出资证明书，更新股东名册。', out: '银行回单、出资证明书、股东名册。' },
  { id: 'close-reg', ph: 'close', t: '办理工商变更登记', d: '注册资本、股东和章程变更，应在作出变更决议之日起 30 日内申请变更登记[[reg-change]]。', out: '新营业执照、变更登记通知书。' },
  { id: 'close-gov', ph: 'close', br: 'gov', t: '国资：产权登记', d: '国有股东入股后办理国有资产产权登记；以后国有股权转让通常要进场交易[[sasac-32]]，影响后续轮次老股转让的安排。', out: '产权登记表。' },
  // 投后
  { id: 'post-report', ph: 'post', t: '按协议报送经营数据', d: '月报或季报：收入、用户、现金余额、重大事项。按时报送比数据好看更重要。', out: '月报模板。' },
  { id: 'post-board', ph: 'post', t: '开董事会', d: '投资方有董事席位时按章程开董事会，保护性条款事项要提前取得同意。', out: '董事会决议记录。' },
  { id: 'post-next', ph: 'post', t: '规划下一轮', d: '在现金还能撑 6 个月以上时启动下一轮；回到「找资方」，按下一轮重新看适配度。', out: '下一轮融资计划。' }
];
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

// ----- rounds -----
// amt: common single-round amount range in 万元 (experience range, see ROUNDS_LEAD); avg: a sourced mean where one exists.
// dil: common dilution range in % (experience range). who: SOURCE_TYPES ids.
const EARLY_AVG = { v: 3534, src: 'qk-26h1', grp: '种子 / 天使 / Pre-A 合计' };
const ROUNDS = [
  { id: 'seed', n: '种子轮', en: 'SEED', amt: [100, 1000], avg: EARLY_AVG, dil: [5, 15], who: ['angel', 'incubator', 'competition'], gap: '美国中位数：种子到 A 轮 2.2 年[[carta-gap]]',
    gate: '团队、可演示的原型和一个清楚的问题定义。烯牛数据统计 2025 年种子轮平均投后估值约 2,200 万元（样本 79 个种子和天使项目，偏少）[[xiniu-25]]。' },
  { id: 'angel', n: '天使轮', en: 'ANGEL', amt: [500, 3000], avg: EARLY_AVG, dil: [10, 20], who: ['angel', 'vc_rmb', 'incubator', 'local_gov'], gap: '常见 6–12 个月；近年「+ 轮」变多，同一轮分几次融[[itjz-plus]]',
    gate: '产品已上线，有第一批真实用户或付费客户。医疗健康赛道的投资人建议天使轮对外稀释最好不超过 30%[[vb-angel]]。' },
  { id: 'preA', n: 'Pre-A', en: 'PRE-A', amt: [1000, 5000], avg: EARLY_AVG, dil: [8, 15], who: ['vc_rmb', 'angel', 'cvc'], gap: '常见 6–12 个月',
    gate: '留存或收入开始出现可重复的信号；获客渠道跑通至少一条。' },
  { id: 'A', n: 'A 轮', en: 'SERIES A', amt: [3000, 15000], avg: { v: 9214, src: 'qk-26h1', grp: 'A 轮' }, dil: [10, 20], who: ['vc_rmb', 'cvc', 'gov_fund'], gap: '美国中位数：A 到 B 轮 2.5 年[[carta-gap]]',
    gate: '可复制的增长和收入，单位经济开始成立；有清楚的规模化路径。' },
  { id: 'B', n: 'B 轮', en: 'SERIES B', amt: [10000, 50000], dil: [8, 15], who: ['vc_rmb', 'cvc', 'gov_fund', 'fa'], gap: '美国中位数：B 到 C 轮 2.4 年[[carta-gap]]',
    gate: '规模化收入、行业前几名；管理团队和财务体系完整。' },
  { id: 'C', n: 'C 轮', en: 'SERIES C', amt: [30000, 100000], dil: [5, 12], who: ['vc_rmb', 'gov_fund', 'cvc', 'fa'], gap: '视上市窗口而定',
    gate: '市场领先，接近盈利或已盈利；开始对照上市标准整理财务和合规。' },
  { id: 'preIPO', n: 'Pre-IPO', en: 'PRE-IPO', amt: [50000, 300000], dil: [3, 8], who: ['gov_fund', 'cvc', 'fa', 'vc_rmb'], gap: '通常在申报前 1–2 年',
    gate: '财务指标接近或达到目标板块的上市标准，完成股份制改造，券商进场辅导。' }
];
const ROUND_IDS = ROUNDS.map(r => r.id);
const ROUNDS_LEAD = '金额和出让比例是经验区间：国内统计机构只公布按轮次的笔数和总额，不公布每轮的典型区间。图上短横是可以算出的平均值：2026 年上半年种子 / 天使 / Pre-A 共 1,475 笔、521.30 亿元，平均每笔约 3,534 万元；A 轮 1,189 笔、1,095.57 亿元，平均约 9,214 万元[[qk-26h1]]。平均值被少数大额交易拉高，大多数项目的单笔金额低于平均值。';

const LISTING = [
  { b: '科创板', pos: '硬科技：研发投入、发明专利有硬性要求', std: '五套标准之一：预计市值 ≥ 10 亿元，最近两年净利润均为正且累计 ≥ 5,000 万元；或市值 ≥ 10 亿元、最近一年净利润为正且营收 ≥ 1 亿元。第五套（市值 ≥ 40 亿元、未盈利）2025 年起扩展到人工智能、商业航天、低空经济[[csrc-star-2025]]。', src: ['sina-boards'], mean: '消费级健康软件和平台业务一般不符合「科创属性」，不是这两个项目的首选。' },
  { b: '创业板', pos: '成长型创新企业，含互联网、大数据、人工智能', std: '三套之一：最近两年净利润均为正、累计 ≥ 1 亿元且最近一年 ≥ 6,000 万元；或市值 ≥ 15 亿元、最近一年净利润为正且营收 ≥ 4 亿元；第三套（市值 ≥ 50 亿元、营收 ≥ 3 亿元）2025 年起用于未盈利的创新企业[[stcn-gem3]]。', src: ['sina-boards'], mean: '互联网和健康科技公司的常见目标；要先做到稳定盈利。' },
  { b: '北交所', pos: '创新型中小企业，先在新三板创新层挂牌满 12 个月', std: '四套之一：预计市值 ≥ 2 亿元，最近两年净利润均 ≥ 1,500 万元且加权平均净资产收益率平均 ≥ 8%。', src: ['bse-rules'], mean: '门槛最低，但要先走新三板；2026 年前三季度 A 股新股里有一半在北交所[[deloitte-26q3]]。' },
  { b: '主板', pos: '大型成熟企业', std: '三套之一：最近 3 年净利润均为正，累计 ≥ 2 亿元，最近一年 ≥ 1 亿元。', src: ['sina-boards'], mean: '规模门槛最高，早期项目不必考虑。' },
  { b: '港股 18C', pos: '特专科技：新一代信息技术、先进硬件软件、先进材料、新能源、新食品农业', std: '已商业化：上市市值 ≥ 40 亿港元、最近一年特专科技收入 ≥ 2.5 亿港元；未商业化：市值 ≥ 80 亿港元。这两个市值门槛是 2024-09-01 至 2027-08-31 的临时下调[[hkex-18c-2024]]。', src: ['hkex-18c'], mean: '适合未盈利但技术壁垒高的公司；需要有资深独立投资者的实质投资。' }
];

// ----- market data -----
const KPI = [
  { v: '1,475', u: '笔', l: '2026 上半年早期投资笔数', d: '种子 / 天使 / Pre-A，同比 +71.1%', src: 'qk-26h1' },
  { v: '11.9', u: '%', l: '早期项目拿到的金额占比', d: '笔数占 37.8%，钱只占一成多', src: 'qk-26h1' },
  { v: '97.8', u: '%', l: '2025 年新募资金里人民币基金的占比', d: '外币基金只占 2.2%，同比 −36%', src: 'qk-25-fund' }
];
const MARKET = [
  { l: '全年投资案例 / 金额', v: '10,795 起 / 9,287.16 亿元', d: '2025', src: 'qk-25-fund', mean: '同比 +28.4% / +45.6%，市场在回暖。' },
  { l: '新募基金数 / 规模', v: '5,039 只 / 1.65 万亿元', d: '2025', src: 'qk-25-fund', mean: '人民币基金占募资额 97.8%：融资主要找人民币基金。' },
  { l: '政府资金在 LP 出资里的占比', v: '62%', d: '2025', src: 'cls-lp-25', mean: '国资控股 LP 出资占比达 89%：国资是最大的出钱方，条款和流程要按国资的规矩准备。' },
  { l: '上半年投资笔数 / 金额', v: '3,899 笔 / 4,314.25 亿元', d: '2026H1', src: 'qk-26h1', mean: '同比 +37.5% / +173.4%。' },
  { l: '人工智能占投资金额', v: '44.7%', d: '2026H1', src: 'qk-26h1', mean: '846 笔、1,930.04 亿元；钱高度集中在少数热门赛道。' },
  { l: '国内数字健康融资', v: '36 次 / 约 3 亿美元', d: '2026H1', src: 'vb-26h1', mean: '同期国内医疗健康整体 451 笔、约 75 亿美元：回暖主要来自药和器械，不在数字健康。' },
  { l: '活跃投资机构数', v: '737 家', d: '2025', src: 'itjz-active', mean: '2015 年为 1,661 家，减少 55.6%：能出手的机构变少，名单要更准。' },
  { l: 'A 股 IPO', v: '116 家 / 1,317.71 亿元', d: '2025', src: 'wind-ipo-25', mean: '2026 年前三季度已有 122 家、2,123 亿元[[deloitte-26q3]]。' },
  { l: '港股 IPO', v: '119 家 / 374 亿美元', d: '2025', src: 'hkex-25', mean: '全球募资额第一；2026 年前三季度 116 家、3,879 亿港元[[deloitte-26q3]]。' }
];

// ----- pitch -----
const MEETINGS = [
  { k: 'GATE 1', n: '首次会面 · 初审', who: '投资经理 / VP', dur: '30–60 分钟', out: '淘汰九成上下' },
  { k: 'GATE 2', n: '合伙人会 · 立项会', who: '合伙人 + 投资团队', dur: '1–2 周', out: '再淘汰五到七成' },
  { k: 'WORK', n: '尽调', who: '投资团队 + 律所 + 会计所', dur: '1–4 个月', out: '尽调报告' },
  { k: 'GATE 3', n: '投决会', who: '投资决策委员会', dur: '数周', out: '再淘汰三到五成', hi: true },
  { k: 'DONE', n: '签约交割', who: '双方律师', dur: '两周到两个月', out: '投资款到账' }
];
const MEET_NOTE = '淘汰比例来自一家融资服务机构三年的样本经验：从第一次接触投资人算起，最终拿到投资的概率通常在 1%–2%（单一机构、B 轮前、长三角样本，不是行业统计）。时长是律所口径。';
const MEET_SRC = ['tryw', 'yunting'];
const FUNNEL_NOTE = '按上面的淘汰率粗算：想拿到 1 份 TS，首次会面通常要见几十家机构。所以目标清单要有 30–50 家。';
const FUNNEL_SRC = ['tryw'];
const SOURCES_LEAD = '先看矩阵里你这一列颜色最深的几类；每类下面的机构都附了一个公开的近期投资案例，点「＋ 目标清单」后可以在「我的进度」里跟踪。适配度是本系统对种子 / 天使轮的判断，理由写在每张卡片上。2026 年上半年一级市场的钱高度集中在 AI、机器人、集成电路等硬科技赛道[[qk-ni-26]]，应用类项目要更准地挑机构。';
const PITCH_LEAD = '投资机构内部要过好几道会，你见到的投资经理要拿你的材料去说服合伙人和投委会。BP 要写成「别人替你转述也不会走样」的样子。';
const PROCESS_LEAD = '从写 BP 到投资款到账，律所的口径是一般 2–6 个月[[yunting]]。下面每一段都可以勾选、写备注；打开「国资」或「美元」开关，会加入对应的支线步骤。';


// ----- capital source types -----
// amt / cyc: common ticket size and time to money; gate: what they need to see; terms: what to watch in their paper; how: how to reach them.
const SOURCE_TYPES = [
  { id: 'angel', n: '天使投资人 / 天使基金', short: '天使', amt: '几十万到数千万元', cyc: '2–8 周',
    gate: '看人为主：团队背景、原型和对问题的理解。医疗健康天使轮普遍「看人下估值」[[vb-angel]]。',
    terms: '估值和出让比例；个人天使有时要求创始人个人承担回购，尽量不接受。',
    how: '最好由他们投过的创始人引荐；天使基金一般在官网或公众号接收 BP。' },
  { id: 'incubator', n: '孵化器 / 加速器', short: '加速器', amt: '数十万到数百万元', cyc: '按批次，3 个月左右一期',
    gate: '团队和方向；多数加速器不要求已有收入。',
    terms: '用多少股份换多少钱和服务，写清是否附带后续投资的优先权。',
    how: '按批次在官网申请，有固定的截止日期和路演日。' },
  { id: 'competition', n: '创业大赛', short: '大赛', amt: '奖金通常不是重点；价值在曝光和对接', cyc: '按赛季，3–6 个月',
    gate: '一般要求已注册公司；部分地方赛要求获奖后在当地落地。',
    terms: '获奖附带的落地、注册地或返投要求。',
    how: '官网报名，按赛道提交 BP 和路演视频。' },
  { id: 'vc_rmb', n: '市场化 VC（人民币 / 双币）', short: '人民币 VC', amt: '数百万到数亿元', cyc: '2–6 个月',
    gate: '可验证的数据：留存、收入、增长速度；赛道要在基金的投资方向里。',
    terms: '优先清算、反稀释、回购、一票否决、董事席位；TS 阶段就要谈。',
    how: '引荐优先；核对这家基金近 12 个月在同赛道同阶段的案例，找到负责这个方向的合伙人。' },
  { id: 'vc_usd', n: '美元基金（境外架构）', short: '美元 VC', amt: '数百万美元起', cyc: '3–9 个月（含搭建架构）',
    gate: '要搭红筹或 VIE 架构、办外汇登记；业务不能落在外资受限领域。2025 年外币基金新募资金同比下降 36%[[qk-25-fund]]。',
    terms: '架构搭建费用高；美国对外投资规则限制美国资金投中国的半导体、量子和部分 AI 领域。',
    how: '只有确定要在境外上市、而且业务不受限时才考虑。' },
  { id: 'cvc', n: '产业资本 CVC', short: '产业资本', amt: '数百万到数亿元', cyc: '3–9 个月，常要过战略和投资两条线',
    gate: '和投资方主业有协同：渠道、数据、供应链或技术。',
    terms: '优先购买权、排他合作、竞业限制；要防止被锁死在一个产业方。',
    how: '先从业务合作谈起，再谈投资；找产业方的战略投资部。' },
  { id: 'gov_fund', n: '政府引导基金 / 国资', short: '国资', amt: '多通过子基金投，直投从数千万元起', cyc: '3–12 个月',
    gate: '属于地方重点产业；通常要求在当地注册或落地。',
    terms: '返投比例和注册地、回购条款、资产评估和备案、后续国有股权转让要进场交易。深圳天使母基金 2026 年版申报指南取消了 1.75 倍返投要求[[szangel-26]]。',
    how: '找引导基金参股的市场化子基金，比直接找母基金快。' },
  { id: 'local_gov', n: '地方招商 / 国资领投', short: '地方招商', amt: '补贴、场地，或国资平台领投', cyc: '1–6 个月',
    gate: '愿意把公司或团队落到当地。',
    terms: '迁址、纳税、就业承诺和对赌；写清承诺做不到时的后果。',
    how: '通过园区招商部门或地方国资平台对接。' },
  { id: 'bank', n: '银行科创贷 / 投贷联动', short: '银行', amt: '几十万到数千万元（债权）', cyc: '2–8 周',
    gate: '有收入、合同或知识产权可以质押；早期公司很难拿到。',
    terms: '创始人个人连带担保。',
    how: '科技支行、地方担保公司；拿到股权融资后再谈投贷联动更容易。' },
  { id: 'equity_market', n: '区域性股权市场 / 专精特新专板', short: '股权市场', amt: '挂牌后对接投资人，金额不定', cyc: '挂牌 1–3 个月',
    gate: '在本省注册；单只证券的投资者不超过 200 人。',
    terms: '挂牌费用和信息披露义务。',
    how: '联系本省的股权交易中心；26 家区域性股权市场设有专精特新专板，服务企业 1.56 万家[[ssxt-board]]。' },
  { id: 'fa', n: '财务顾问 FA', short: 'FA', amt: '不出钱，按融资额收费', cyc: '随项目',
    gate: '一般从 A 轮或数千万元规模起接。',
    terms: '成功费比例、独家期限、是否收前期费用。',
    how: '大额融资时再找；种子和天使轮自己跑更合适。' }
];

// ----- institutions: public facts only (focus + one recent public deal), each with its own link -----
// fit: 'health' (身体健康 OS), 'groundbreak' (破土), 'general' (any sector)
const INSTS = [
  // 天使
  { id: 'innoangel', n: '英诺天使基金', type: 'angel', fit: ['health', 'general'], focus: '天使轮机构，覆盖 AI 医疗和健康管理', ev: '2025-11 跟投紫荆智康近亿元天使轮（星连资本领投），产品覆盖诊前到诊后健康管理。', src: 'https://cj.sina.com.cn/articles/view/5953190035/162d67893019017egs', srcT: '新浪财经转 36氪 · 2025-11' },
  { id: 'legendstar', n: '联想之星', type: 'angel', fit: ['health', 'general'], focus: '早期投资；医疗健康分「生物医药」和「数智医疗」两块', ev: '2026-01 介绍医疗投资策略：数智医疗关注用 AI、大数据和机器人升级医疗服务。', src: 'https://news.pedaily.cn/202601/559682.shtml', srcT: '投资界 · 2026-01' },
  // 加速器
  { id: 'miracleplus', n: '奇绩创坛', type: 'incubator', fit: ['health', 'groundbreak', 'general'], focus: '早期创业加速器，按批次招募', ev: '2026-04 跟投智能戒指公司弦指科技千万元级天使轮（国香资本领投）。', src: 'https://www.36kr.com/p/3805911108328965', srcT: '36氪 · 2026-05' },
  // 人民币 / 双币 VC
  { id: 'qiming', n: '启明创投', type: 'vc_rmb', fit: ['health', 'general'], focus: '人民币和美元双币基金；国内最活跃的医疗健康投资机构之一，方向是创新药、创新器械和 AI + 医疗', ev: '动脉智库统计：2025 年国内医疗健康出手 37 次，居首。', src: 'https://news.pedaily.cn/202601/560467.shtml', srcT: '投资界转动脉智库 · 2026-01' },
  { id: 'hillhouse-ventures', n: '高瓴创投', type: 'vc_rmb', fit: ['health', 'general'], focus: '早期科技与消费健康硬件', ev: '2026 年参与睡眠健康公司今日宜休的首轮种子融资（数千万元），2026-05 第二轮继续超额追投。', src: 'https://news.pedaily.cn/202605/563740.shtml', srcT: '投资界 · 2026-05' },
  { id: 'hongshan', n: '红杉中国', type: 'vc_rmb', fit: ['health', 'general'], focus: '全阶段科技投资', ev: '2026-03 与 Monolith 分别领投 AI 健康硬件公司 Odyss 近 2 亿元融资（硬件 + 订阅模式）。', src: 'https://finance.sina.com.cn/stock/t/2026-03-26/doc-inhshnwy0370633.shtml', srcT: '新浪财经转 36氪 · 2026-03' },
  { id: 'linear', n: '线性资本', type: 'vc_rmb', fit: ['health', 'general'], focus: '早期技术驱动型投资', ev: '作为 Odyss 老股东，2026-03 在近 2 亿元新一轮中继续加注。', src: 'https://m.chinaventure.com.cn/news/80-20260327-390693.html', srcT: '投中网 · 2026-03' },
  { id: 'starlink-cap', n: '星连资本', type: 'vc_rmb', fit: ['health'], focus: '早期硬科技与 AI 医疗', ev: '2025-11 领投紫荆智康近亿元天使轮（AI 医院 Agent 系统）。', src: 'https://cj.sina.com.cn/articles/view/5953190035/162d67893019017egs', srcT: '新浪财经转 36氪 · 2025-11' },
  { id: 'puhua', n: '普华资本', type: 'vc_rmb', fit: ['health'], focus: '投资 AI 驱动的数字健康管理平台', ev: '2026-05 与晓池基金、嘉兴欣颐联合投资花生健康（旗下好孕帮 1,200 万用户）。', src: 'https://news.pedaily.cn/202605/564006.shtml', srcT: '投资界 · 2026-05' },
  { id: 'vision-plus', n: '元璟资本', type: 'vc_rmb', fit: ['health'], focus: '长期持有互联网医疗和全病程管理平台', ev: '作为微脉老股东，2025-01 跟投微脉 2 亿元 D 轮。', src: 'https://www.vbdata.cn/1519002566', srcT: '动脉网 · 2025-01' },
  { id: 'yuansheng', n: '元生创投', type: 'vc_rmb', fit: ['health'], focus: '医疗健康专业投资机构', ev: '动脉智库 2025 年度报告：医疗健康投资次数翻倍。', src: 'https://news.pedaily.cn/202601/560467.shtml', srcT: '投资界转动脉智库 · 2026-01' },
  { id: 'hongfund', n: '弘晖基金', type: 'vc_rmb', fit: ['health'], focus: '医疗健康基金，参与睡眠健康早期轮次', ev: '2026-05 以新进投资方身份参与今日宜休第二轮融资。', src: 'https://news.pedaily.cn/202605/563740.shtml', srcT: '投资界 · 2026-05' },
  // 产业资本
  { id: 'ant', n: '蚂蚁集团', type: 'cvc', fit: ['health'], focus: '支付宝医疗健康和 AI 健康应用 AQ；战略入股 C 端健康管理公司', ev: '2026-07 战略投资体重管理平台薄荷健康，持股超 28%，成为最大外部股东。', src: 'https://technode.global/2026/07/08/ant-group-takes-28-stake-in-chinas-boohee-health-as-ai-health-app-aq-surpasses-100m-users/', srcT: 'TechNode Global · 2026-07' },
  { id: 'xiaomi', n: '小米', type: 'cvc', fit: ['health'], focus: '可穿戴厂商，产业投资延伸到运动健康服务', ev: '2025-01 入股健身社交应用爱动健身，持股约 15%。', src: 'https://m.jiemian.com/article/12199159.html', srcT: '界面新闻 · 2025-01' },
  { id: 'sensetime-gx', n: '国香资本（商汤系）', type: 'cvc', fit: ['health', 'general'], focus: 'AI 产业资本', ev: '2026-04 领投智能戒指公司弦指科技千万元级天使轮，奇绩创坛跟投。', src: 'https://www.36kr.com/p/3805911108328965', srcT: '36氪 · 2026-05' },
  // 国资
  { id: 'sz-angel', n: '深圳市天使投资引导基金', type: 'gov_fund', fit: ['health', 'general'], focus: '天使母基金，通过子基金投天使阶段', ev: '2026-03 发布新版申报指南：存续期延至 15 年，取消 1.75 倍返投；累计出资 98 支子基金。', src: 'https://www.36kr.com/p/3740976625139716', srcT: '36氪 · 2026-03' },
  { id: 'bj-health-fund', n: '北京市医药健康产业投资基金', type: 'gov_fund', fit: ['health'], focus: '北京市级国资医药健康产业基金，直投创新医疗企业', ev: '2026-04 领投安宇艾心数千万元融资；连续两年进入动脉网国内最活跃医疗投资机构前五。', src: 'https://news.pedaily.cn/202604/562504.shtml', srcT: '投资界 · 2026-04' },
  { id: 'sh-bio-fund', n: '上海生物医药先导产业母基金', type: 'gov_fund', fit: ['health'], focus: '投向创新药、高端医疗器械、生物技术，强调投早投小', ev: '2024-07 签约设立，规模 215.01 亿元，期限 15 年。', src: 'https://www.jiemian.com/article/11476091.html', srcT: '界面新闻 · 2024-07' },
  // 大赛
  { id: 'hicool', n: 'HICOOL 全球创业大赛', type: 'competition', fit: ['health', 'general'], focus: '北京主办的综合性创业大赛，医药健康是落地区重点产业之一', ev: '2025 届收到 10,055 个项目，往届获奖项目赛后融资超 446 亿元。', src: 'https://www.news.cn/science/20250509/15e98df5aaee4995a3e7b5c3bb37aacb/c.html', srcT: '新华网 · 2025-05' },
  { id: 'ai-med-contest', n: '新质生产力 AI + 医疗创新应用大赛', type: 'competition', fit: ['health'], focus: '美年健康、阿里云等主办；方向含智能健康管理和远程医疗监护', ev: '2025-11 在上海举办，300 余个项目报名，设美年创新需求对接专场（产品采购、数据合作）。', src: 'https://finance.eastmoney.com/a/202511033553695621.html', srcT: '东方财富 · 2025-11' },
  // FA
  { id: 'cdh-yikai', n: '易凯资本', type: 'fa', fit: ['health'], focus: '医疗健康产业财务顾问（融资、并购）', ev: '2026-08 担任蓝帆医疗出售武汉必凯尔 100% 股权的独家财务顾问。', src: 'https://news.pedaily.cn/202608/567769.shtml', srcT: '投资界 · 2026-08' }
];

// ----- sources -----
// t: title · u: https link · d: publication or effective date
const SRC = {
  'company-law': { t: '中华人民共和国公司法（2023 年修订，第 42、47、144、227 条；新华网全文）', u: 'https://www.news.cn/politics/20231230/e6964c1620e04f3a94989df81581389f/c.html', d: '2024-07-01' },
  'reg-capital-rule': { t: '国务院关于实施公司法注册资本登记管理制度的规定（中国政府网）', u: 'https://www.gov.cn/zhengce/202407/content_6960502.htm', d: '2024-07-01' },
  'reg-change': { t: '中华人民共和国市场主体登记管理条例（第 24 条）', u: 'https://www.gov.cn/zhengce/zhengceku/2021-08/24/content_5632964.htm', d: '2022-03-01' },
  'qk-26h1': { t: '2026 创投半年报（新浪财经；数据来自清科、中基协、天眼查等）', u: 'https://finance.sina.com.cn/stock/vcpe/yc/2026-07-08/doc-inihaicz1450225.shtml', d: '2026-07-08' },
  'qk-25-fund': { t: '清科研究中心：2025 年中国股权投资市场募资与投资（投资界）', u: 'https://research.pedaily.cn/202602/560947.shtml', d: '2026-02-10' },
  'cls-lp-25': { t: '财联社创投通：2025 年一级市场 LP 出资数据', u: 'https://www.cls.cn/detail/2246723', d: '2026-01-04' },
  'vb-26h1': { t: '动脉网：2026 年上半年全球医疗健康投融资，国内同比大涨 214%', u: 'https://www.vbdata.cn/1519086238', d: '2026-07-19' },
  'itjz-active': { t: 'IT桔子：中国活跃投资机构十年变化（虎嗅转载）', u: 'https://www.huxiu.com/article/4862282.html', d: '2026-05-28' },
  'hkex-25': { t: 'HKEX Insight: ECM performance in 2025', u: 'https://www.hkexgroup.com/Media-Centre/Insight/Insight/2026/HKEX-Insight/ECM-performance-in-2025?sc_lang=en', d: '2026-01' },
  'deloitte-26q3': { t: '德勤：2026 年前三季度 A 股与港股 IPO 市场（东方财富）', u: 'https://finance.eastmoney.com/a/202609243883913360.html', d: '2026-09-24' },
  'carta-gap': { t: 'VC Cafe 引 Carta 数据：美国创业公司轮次间隔中位数（2024 年底）', u: 'https://vccafe.com/2025/04/25/founders-need-to-adjust-to-longer-cycles-between-rounds', d: '2025-04-25' },
  'xiniu-25': { t: '烯牛数据《2025 年中国私募股权市场深度解析报告》（新浪财经）', u: 'https://finance.sina.com.cn/roll/2026-02-05/doc-inhkuimi2909295.shtml', d: '2026-02-05' },
  'itjz-plus': { t: '证券时报：2025 年「+ 轮」融资激增 78.2%（IT桔子数据）', u: 'https://www.stcn.com/article/detail/3607557.html', d: '2026-01-23' },
  'vb-angel': { t: '动脉网：医疗健康天使轮专题', u: 'https://www.vbdata.cn/1518932505', d: '2023-10-17' },
  'csrc-star-2025': { t: '证监会：科创板设置科创成长层、扩大第五套标准适用范围（中国政府网）', u: 'https://www.gov.cn/zhengce/202506/content_7028578.htm', d: '2025-06-18' },
  'sina-boards': { t: '沪深北交易所现行上市标准汇总（新浪财经）', u: 'https://finance.sina.com.cn/roll/2024-12-24/doc-ineapfhx1939552.shtml', d: '2024-12-24' },
  'stcn-gem3': { t: '证券时报：创业板第三套上市标准启用', u: 'https://www.stcn.com/article/detail/2125826.html', d: '2025-06-19' },
  'bse-rules': { t: '北京证券交易所股票上市规则（北证公告〔2025〕20 号）', u: 'https://www.bse.cn/cxjg_list/200025638.html', d: '2025-04-25' },
  'hkex-18c-2024': { t: 'HKEX / SFC：特专科技公司市值门槛临时下调', u: 'https://www.hkex.com.hk/News/Regulatory-Announcements/2024/240823news?sc_lang=en', d: '2024-08-23' },
  'hkex-18c': { t: 'HKEX Insight: Chapter 18C explained', u: 'https://www.hkexgroup.com/Media-Centre/Insight/Insight/2026/HKEX-Insight/18C-Explained?sc_lang=en', d: '2026-05-04' },
  'tryw': { t: '投融湾：融资成功率与机构三道会的淘汰比例（东方财富财富号）', u: 'https://caifuhao.eastmoney.com/news/20261005122327462211580', d: '2026-10-05' },
  'yunting': { t: '云亭律师事务所：一轮投融资的关键环节与时间（36氪）', u: 'https://www.36kr.com/p/1123375006977286', d: '2021-03-04' },
  'qk-ni-26': { t: '21 世纪经济报道：倪正东称一级市场 90% 资金集中在硬科技赛道', u: 'https://www.21jingji.com/article/20260616/herald/a7e108d961da3a1120bf7c7d8c956824.html', d: '2026-06-16' },
  'smes': { t: '工信部：全国登记在册中小企业数量超 6,000 万家（中新网）', u: 'https://www.chinanews.com.cn/cj/2025/09-09/10479004.shtml', d: '2025-09-09' },
  'jd-crowd': { t: '京东众筹暂停运营（澎湃新闻）', u: 'https://www.thepaper.cn/newsDetail_forward_20239061', d: '2022-10' },
  'gb-proposal': { t: '破土 Groundbreak 产品方案 v0.1', u: 'https://claude.ai/artifact/TJkLUgu1zkES464h8pRSVK', d: '2026-10-01' },
  'illegal-fund': { t: '防范和处置非法集资条例（国务院令第 737 号）', u: 'https://www.gov.cn/gongbao/content/2021/content_5588815.htm', d: '2021-05-01' },
  'pipl': { t: '中华人民共和国个人信息保护法（第 28–31、55 条）', u: 'https://www.cac.gov.cn/2021-08/20/c_1631050028355286.htm', d: '2021-11-01' },
  'nmpa-sw': { t: '移动医疗器械注册技术审查指导原则（原 CFDA 2017 年第 222 号通告）', u: 'https://www.nmpa.gov.cn/directory/web/nmpa/images/MjAxN8TqtdoyMjK6xc2ouOa4vbz+LmRvYw==.doc', d: '2017' },
  'szangel-26': { t: '36氪：深圳天使母基金发布 2026 年版申报指南', u: 'https://www.36kr.com/p/3740976625139716', d: '2026-03-26' },
  'ssxt-board': { t: '「专精特新」专板三年汇聚 1.56 万家企业（新浪财经）', u: 'https://finance.sina.com.cn/jjxw/2025-11-18/doc-infxumzq3001341.shtml', d: '2025-11-18' },
  'nmpa-ai': { t: '国家药监局：人工智能医用软件产品分类界定指导原则（2021 年第 47 号）', u: 'https://www.nmpa.gov.cn/ylqx/ylqxggtg/20210708111147171.html', d: '2021-07-08' }
};
