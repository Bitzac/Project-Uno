// ---------- framework: dimensions, 4D, indicators, ladder, questions, benchmarks ----------
const DIMS = [
  { id: 'freq', name: '频率', desc: '多常用 AI 做实际任务' },
  { id: 'breadth', name: '广度', desc: '覆盖多少领域和产出形态' },
  { id: 'depth', name: '深度', desc: '单个任务的复杂度与规模' },
  { id: 'integ', name: '集成', desc: 'AI 接入了多少工具和数据' },
  { id: 'auto', name: '自动化', desc: '不需要你在场的产出' },
  { id: 'orch', name: '编排', desc: '多会话、多模型的调度' },
  { id: 'verify', name: '验证', desc: '对产出的核查与测试' },
  { id: 'reuse', name: '沉淀', desc: '把做法固化成可复用资产' },
];

// Anthropic AI Fluency Framework (Dakan, Feller & Anthropic, 2025, CC BY-NC-SA 4.0)
const FOURD = [
  { id: 'delegation', name: '委派', en: 'Delegation', def: '设定目标，决定是否、何时、怎样让 AI 参与。', subs: ['问题认知', '平台认知', '任务分工'] },
  { id: 'description', name: '描述', en: 'Description', def: '把目标讲清楚，引出有用的 AI 行为和产出。', subs: ['产出描述', '过程描述', '表现描述'] },
  { id: 'discernment', name: '判断', en: 'Discernment', def: '准确评估 AI 的产出和行为是否有用。', subs: ['产出判断', '过程判断', '表现判断'] },
  { id: 'diligence', name: '尽责', en: 'Diligence', def: '为用 AI 做的事、以及做事的方式负责。', subs: ['创作尽责', '透明尽责', '部署尽责'] },
];

// Evidence indicators. score = min(1, value / target) × 100. Targets are this system's
// bar for a "system-level" user over 30 days, not an industry standard.
const IND = [
  { id: 'active_days', name: '活跃天数', unit: '天', target: 20, dim: 'freq', d: 'delegation', src: '会话创建、Git 提交、Artifact 更新的日期去重', fix: '每周固定 5 天用 AI 推进一件实际任务' },
  { id: 'sessions', name: '代理会话', unit: '个', target: 30, dim: 'freq', d: 'delegation', src: 'Claude Code 会话（窗口内创建）', fix: '零散的小任务也开会话交给代理，不再手动处理' },
  { id: 'domains', name: '领域覆盖', unit: '个', target: 10, dim: 'breadth', d: 'delegation', src: 'Artifact 与仓库项目按标题归入 12 个领域' },
  { id: 'formats', name: '产出形态', unit: '种', target: 8, dim: 'breadth', d: 'delegation', src: '应用、报告、可视化、刊物、视频、文档等' },
  { id: 'big_projects', name: '千行级项目', unit: '个', target: 6, dim: 'depth', d: 'description', src: '源码 ≥ 1,500 行的仓库项目（不含构建产物和数据文件）' },
  { id: 'long_sessions', name: '长程会话', unit: '个', target: 10, dim: 'depth', d: 'description', src: '上下文用量 ≥ 40 万 token 的会话' },
  { id: 'plan_share', name: '先计划后执行', unit: '%', target: 30, dim: 'depth', d: 'description', src: '以计划模式启动的会话占比', fix: '复杂任务用计划模式启动：先审方案，再让它动手' },
  { id: 'connectors_used', name: '连接器使用', unit: '个', target: 'connectors_total', dim: 'integ', d: 'delegation', src: '已连接的连接器中有产出证据的个数', fix: s => `让 ${s.lists.connectors.filter(c => !c.used).map(c => c.name).join('、')} 进入工作流，例如日刊同步写入 Notion、每周复盘排进日历` },
  { id: 'runtime_caps', name: '页面运行时能力', unit: '种', target: 4, dim: 'integ', d: 'delegation', src: '仓库代码里 claude.use() 调用的能力', fix: '给常用 OS 加 mcp 能力，页面直接读日历、Notion 的实时数据' },
  { id: 'routines', name: '定时任务', unit: '个', target: 3, dim: 'auto', d: 'delegation', src: '运行中的周期性 Routine', fix: '再加一个周期任务，例如每月自动重测本系统' },
  { id: 'auto_outputs', name: '每周自动产出', unit: '期', target: 7, dim: 'auto', d: 'delegation', src: '定时任务按排程每周运行的次数' },
  { id: 'parallel_days', name: '并行日', unit: '天', target: 8, dim: 'orch', d: 'delegation', src: '同一天里有两个以上会话时间重叠', fix: '大任务拆给 2–3 个并行会话，各走各的分支' },
  { id: 'cross_session', name: '跨会话调度', unit: '次', target: 3, dim: 'orch', d: 'diligence', src: '检查或唤醒其他会话的提醒，以及由会话派生的会话' },
  { id: 'model_tiers', name: '模型档位', unit: '档', target: 3, dim: 'orch', d: 'delegation', src: '会话用过的模型家族（Fable、Opus、Sonnet、Haiku）', fix: '检索、批处理和子代理改用 Sonnet 或 Haiku，最难的推理交给 Fable' },
  { id: 'verification', name: '校验环节', unit: '项', target: 12, dim: 'verify', d: 'discernment', src: '回测、质检脚本、构建校验、来源核实', fix: '给每个新项目的数据管道加一道构建期校验' },
  { id: 'tests', name: '自动化测试', unit: '个', target: 5, dim: 'verify', d: 'discernment', src: '仓库里的测试文件', fix: '给美股晨报 signals.mjs 和成长罗盘的计分各写一组回归测试' },
  { id: 'sop_assets', name: 'SOP 与提示资产', unit: '份', target: 6, dim: 'reuse', d: 'description', src: 'EDITOR.md 等流程文档、提示文档、长期指令', fix: '把「液态玻璃 OS」的建站流程写成一份 SOP' },
  { id: 'rules_files', name: '规则与技能文件', unit: '个', target: 3, dim: 'reuse', d: 'description', src: 'CLAUDE.md、.claude/skills、agents、hooks', fix: '在仓库根目录写 CLAUDE.md，并把 OS 建站套路做成一个技能' },
  { id: 'merged_ratio', name: '项目合入主干', unit: '%', target: 80, dim: 'reuse', d: 'diligence', src: '在默认分支上的项目占比', fix: s => `把只在功能分支上的 ${s.lists.projects.filter(p => !p.merged).length} 个项目合入默认分支` },
  { id: 'privacy', name: '隐私与透明实践', unit: '项', target: 3, dim: null, d: 'diligence', src: '真实数据不进公开仓库、示例标注、提交注明 AI 参与' },
];

const MODES = { auto: '自动化', aug: '增强', agency: '代理' };
const LADDER = [
  { n: 1, name: '问答检索', mode: 'auto', desc: '向 AI 提问、查资料、解释概念。', checks: [
    { t: '有 AI 使用记录', f: m => m.sessions + m.artifacts > 0, v: m => `${m.sessions} 个会话` }] },
  { n: 2, name: '协作创作', mode: 'aug', desc: '和 AI 多轮来回，一起写文字、改代码。', checks: [
    { t: '有 AI 参与的成品', f: m => m.artifacts >= 1, v: m => `${m.artifacts} 件 Artifact` }] },
  { n: 3, name: '成品交付', mode: 'aug', desc: '一次交付可以直接使用的应用、报告或视频。', checks: [
    { t: '产出 ≥ 10 件', f: m => m.artifacts + m.projects >= 10, v: m => `${m.artifacts + m.projects} 件` },
    { t: '产出形态 ≥ 3 种', f: m => m.formats >= 3, v: m => `${m.formats} 种` }] },
  { n: 4, name: '代理执行', mode: 'auto', desc: '把多步骤任务交给带工具的代理：读代码、写代码、跑脚本、提交。', checks: [
    { t: '代理会话 ≥ 5 个', f: m => m.sessions >= 5, v: m => `${m.sessions} 个` },
    { t: '代理写入仓库的提交 ≥ 10 次', f: m => m.commits >= 10, v: m => `${m.commits} 次` }] },
  { n: 5, name: '无人值守', mode: 'agency', desc: 'AI 按时自动运行、自动发布，不需要你在场。', checks: [
    { t: '运行中的定时任务 ≥ 1 个', f: m => m.routines >= 1, v: m => `${m.routines} 个` },
    { t: '每周自动产出 ≥ 5 期', f: m => m.auto_outputs >= 5, v: m => `${m.auto_outputs} 期` }] },
  { n: 6, name: '系统编排', mode: 'agency', need: 5, desc: 'AI 是一套被管理的系统：多会话调度、规则沉淀、自动测试，成果被别人使用。', checks: [
    { t: '跨会话调度 ≥ 2 次', f: m => m.cross_session >= 2, v: m => `${m.cross_session} 次` },
    { t: 'SOP 与提示资产 ≥ 3 份', f: m => m.sop_assets >= 3, v: m => `${m.sop_assets} 份` },
    { t: '规则或技能文件 ≥ 1 个', f: m => m.rules_files >= 1, v: m => `${m.rules_files} 个` },
    { t: '自动化测试 ≥ 1 个', f: m => m.tests >= 1, v: m => `${m.tests} 个` },
    { t: '项目合入主干 ≥ 60%', f: m => m.merged_ratio >= 60, v: m => `${m.merged_ratio}%` },
    { t: '用过 ≥ 2 档模型', f: m => m.model_tiers >= 2, v: m => `${m.model_tiers} 档` },
    { t: '成果每月被他人使用（自评）', f: (m, a) => a && a.q19 != null ? a.q19 >= 2 : null, v: (m, a) => a && a.q19 != null ? Q_BY.q19.o[a.q19] : '待自评' }] },
];

// Self-assessment. Each option scores 0 / 33 / 67 / 100.
const QUESTIONS = [
  { id: 'q01', d: 'delegation', dim: 'freq', t: '一周里有几天用 AI 完成实际任务（不只是闲聊）？', o: ['0–1 天', '2–3 天', '4–5 天', '6–7 天'] },
  { id: 'q02', d: 'delegation', dim: 'breadth', t: '你的工作和学习任务中，多大比例会交给 AI 做至少一部分？', o: ['不到 10%', '10%–30%', '30%–60%', '60% 以上'] },
  { id: 'q03', d: 'delegation', dim: 'breadth', t: '除了 Claude，你经常用几类 AI 工具（对话、编程、图像、视频、语音、搜索）？', o: ['没有', '1–2 类', '3–4 类', '5 类以上'] },
  { id: 'q04', d: 'delegation', dim: 'integ', t: 'AI 接入了你多少个数据源或工作工具（邮箱、日历、笔记、代码库、网盘）？', o: ['没有', '1 个', '2–3 个，偶尔用', '4 个以上，常用'] },
  { id: 'q05', d: 'delegation', dim: 'auto', t: '你有几个不用你在场、按时自动运行的 AI 任务？', o: ['0 个', '试过 1 个', '1–2 个稳定运行', '3 个以上'] },
  { id: 'q06', d: 'delegation', dim: 'orch', t: '你会同时开多个 AI 会话或代理，各自分工干活吗？', o: ['从不', '偶尔', '每周几次', '几乎每天'] },
  { id: 'q07', d: 'delegation', dim: 'orch', t: '你会按任务难度切换模型或思考力度吗？', o: ['从不，用默认', '知道但很少切换', '有时会', '有明确的选择规则'] },
  { id: 'q08', d: 'description', dim: 'depth', t: '下指令时通常写清几项：目标、背景、约束、输出格式、示例？', o: ['只写目标', '2 项', '3–4 项', '5 项都写'] },
  { id: 'q09', d: 'description', dim: 'depth', t: '复杂任务会先让 AI 出计划、你确认后再执行吗？', o: ['从不', '偶尔', '多数时候', '固定流程'] },
  { id: 'q10', d: 'description', dim: 'verify', t: '你会写明验收标准（什么算好、必须满足哪些条件）吗？', o: ['从不', '偶尔', '重要任务会', '每次都写'] },
  { id: 'q11', d: 'description', dim: 'reuse', t: '你有长期生效的个人偏好或项目规则（自定义指令、CLAUDE.md 等）吗？', o: ['没有', '有，很少更新', '有，定期更新', '有，并按项目分别维护'] },
  { id: 'q12', d: 'description', dim: 'reuse', t: '常用流程写成可复用的 SOP、提示模板或技能了吗？', o: ['没有', '1–2 个', '3–5 个', '5 个以上，反复在用'] },
  { id: 'q13', d: 'description', dim: 'reuse', t: '结果不对时你通常怎么做？', o: ['整个重来', '补一句让它改', '先找出偏差原因再改指令', '改好后把经验写进模板或规则'] },
  { id: 'q14', d: 'discernment', dim: 'verify', t: 'AI 给出的事实和数字，你核对原始来源的比例？', o: ['几乎不核对', '偶尔核对', '关键数字都核对', '要求附来源并抽查'] },
  { id: 'q15', d: 'discernment', dim: 'verify', t: 'AI 写的代码、表格或公式，交付前你怎么验证？', o: ['不验证', '看一眼', '实际运行检查', '有测试或自动校验'] },
  { id: 'q16', d: 'discernment', dim: 'verify', t: '你能说出 AI 在你的领域常犯的错误吗？', o: ['说不出', '1–2 种', '3–4 种', '能举例，并有对策'] },
  { id: 'q17', d: 'discernment', dim: 'verify', t: '过去一个月，你推翻或大改过几次 AI 的结论？', o: ['0 次', '1–2 次', '3–5 次', '6 次以上'] },
  { id: 'q18', d: 'discernment', dim: 'verify', t: '重要问题你会要求 AI 给出反方观点或不确定性吗？', o: ['从不', '偶尔', '重要问题会', '经常，并据此调整'] },
  { id: 'q19', d: 'discernment', dim: 'depth', t: '你用 AI 做的成果，被别人实际使用（同事、客户、读者）的频率？', o: ['从未', '偶尔', '每月都有', '每周都有'] },
  { id: 'q20', d: 'diligence', dim: null, t: '涉及身份证号、病历、财务、公司机密时你怎么处理？', o: ['直接输入', '偶尔注意', '先脱敏再输入', '有成文规则，只放私有空间'] },
  { id: 'q21', d: 'diligence', dim: null, t: '对外发布 AI 参与的成果时，你会说明 AI 的参与吗？', o: ['从不', '被问才说', '通常会', '始终标注'] },
  { id: 'q22', d: 'diligence', dim: 'auto', t: '自动运行的 AI 任务出错时，你多久能发现？', o: ['没有自动任务或不知道', '几天后', '当天', '有自动检查和通知'] },
  { id: 'q23', d: 'diligence', dim: 'verify', t: '以你的名义交付前，你会逐条审 AI 的产出吗？', o: ['不审', '抽看', '重点部分审', '逐条审'] },
  { id: 'q24', d: 'diligence', dim: null, t: '你了解所用 AI 服务的数据使用和保留政策吗？', o: ['不了解', '听说过', '读过主要条款', '读过，并据此调整了设置'] },
];
const Q_BY = Object.fromEntries(QUESTIONS.map(q => [q.id, q]));

const BENCH = [
  { k: '用过 ChatGPT 的美国成年人', pop: '34%', src: 'Pew Research Center，2025-02-24 至 03-02，5,123 人', url: 'https://www.pewresearch.org/short-reads/2025/06/25/34-of-us-adults-have-used-chatgpt-about-double-the-share-in-2023/', you: m => `近 30 天 ${m.active_days} 个活跃日` },
  { k: '在工作中用 ChatGPT 的美国在职成年人', pop: '28%', src: '同上', url: 'https://www.pewresearch.org/short-reads/2025/06/25/34-of-us-adults-have-used-chatgpt-about-double-the-share-in-2023/', you: m => `${m.sessions} 个代理会话，${m.commits} 次代码提交` },
  { k: 'Claude.ai 对话中「自动化」型占比', pop: '45%', popNote: '增强型 52%，其中直接下令型 32%', src: 'Anthropic Economic Index，2025-11-13 至 11-20，100 万条对话', url: 'https://www.anthropic.com/research/anthropic-economic-index-january-2026-report', you: m => `${m.routines} 个定时任务每周自动产出 ${m.auto_outputs} 期，属于第三种「代理」模式` },
  { k: 'API 调用中「自动化」型占比', pop: '约 3/4', popNote: '直接下令型 64%', src: '同上，100 万条 API 记录', url: 'https://www.anthropic.com/research/anthropic-economic-index-january-2026-report', you: m => `${m.cross_session} 次跨会话调度，${m.verification} 个校验环节` },
];
