# AI 能力 OS

页面：https://claude.ai/artifact/LwT69jcfyL2XJFsZX3zxut（私有）

单文件网页应用，评估并可视化「我用 AI 用到了什么程度」。左侧边栏是等级卡和导航，右侧七个视图都先给结论再给明细。视觉沿用 health-os / compass 的液态玻璃风格。

评估分两部分，分开显示：

- **证据分**（占综合分 60%）：Claude 读取真实使用记录算出的 20 项客观指标，来源是 Claude Code 会话列表、Artifact 列表、定时任务（Routine）和本仓库全部分支的 Git 历史。
- **自评分**（占 40%）：24 道四选一题，补上记录里看不到的部分（其他 AI 工具、工作场景、核查习惯）。某个维度自评比证据高 20 分以上会单独标出。

## 界面

| 视图 | 内容 |
|---|---|
| 总览 | 一句话结论 → 综合分、阶梯、证据分、自评分、每周自动产出 → 八维雷达（证据 vs 自评）→ 4D 条形图 → 离下一级还差什么 → 强项 / 短板 → 按提分多少排序的下一步 → 人群对标 |
| 能力阶梯 | L1 问答检索 → L6 系统编排，每级门槛和当前值 |
| 4D 素养 | 委派、描述、判断、尽责四张卡：定义、子项、证据指标、对应的自评答案；三种协作模式 |
| 使用证据 | 20 项指标表、每日活动日历、使用方式、领域与形态分布、Artifact / 项目 / 定时任务 / 连接器 / 会话明细、校验环节、看不到的部分 |
| 自评问卷 | 24 题，按 4D 分组，保存到页面数据库 |
| 历史趋势 | 证据分和自评分走势，每份快照和每次自评 |
| 方法与口径 | 计分公式、框架来源、数据来源、局限、隐私 |

## 目录

| 文件 | 内容 |
|---|---|
| `src/framework.js` | 八个维度、4D、20 项指标（基准、归属、改进动作）、六级阶梯门槛、24 道自评题、人群对标数据 |
| `src/core.js` | 状态、计分、阶梯判定、云端 db 读写 |
| `src/charts.js` | 手写 SVG：雷达、4D 条形、活动日历、横条、趋势线 |
| `src/views.js` | 侧栏和七个视图 |
| `src/boot.js` | 导航、问卷交互、提示框、启动 |
| `pipeline/snapshot.mjs` | 把 Claude 采集的原始记录和 Git 历史算成一份快照 |
| `RETEST.md` | 重测流程（给 Claude 看） |
| `index.html` | 构建产物 |

## 构建

```bash
node build.mjs   # 生成 index.html
```

`index.html` 不含 `<html>/<head>/<body>`，发布为 claude.ai Artifact 时由平台补齐。发布时声明 `db`（`rules: [{path: "", read: "view", write: "owner"}]`）和 `user` 两个能力。

## 计分

| 项目 | 算法 |
|---|---|
| 指标得分 | min(值 ÷ 基准, 1) × 100；基准是本系统给「系统级用户」30 天设定的门槛，不是行业标准 |
| 维度 / 4D 证据分 | 归入该维度或该项的指标得分的平均 |
| 证据分 | 8 个维度证据分的平均 |
| 自评分 | A/B/C/D 计 0/33/67/100，取平均；维度和 4D 只算归入它的题 |
| 综合分 | 证据分 × 60% + 自评分 × 40%；没做自评时等于证据分 |
| 阶梯 | 逐级检查，全部门槛满足才算达成；L6 需满足 7 项中的 5 项 |

计分逻辑在页面代码里，快照只存原始值；改了基准，历史快照会一起按新口径重算。

## 框架与数据来源

- 4D：Rick Dakan、Joseph Feller 与 Anthropic，*AI Fluency Framework*，2025，CC BY-NC-SA 4.0（委派 Delegation、描述 Description、判断 Discernment、尽责 Diligence；自动化、增强、代理三种模式）
- 六级阶梯、八个维度：本系统自定
- 人群对标：Pew Research Center，2025-02-24 至 03-02 调查 5,123 名美国成年人（34% 用过 ChatGPT，在职者 28% 用于工作）；Anthropic Economic Index 2026 年 1 月报告，2025-11-13 至 11-20 抽样（Claude.ai 对话 45% 自动化、52% 增强；API 约四分之三为自动化）

## 数据结构（云端）

```
snapshots/{YYYY-MM-DD}   快照：date, window{from,to}, collectedAt, metrics{…20 项指标的原始值和背景数字}, lists{sessions, artifacts, projects, routines, connectors, verification, sop, rules, tests, caps, privacy, blindSpots, origins, efforts, models}, activity{日期: {s 会话, c 提交, a Artifact 更新}}
assessments/{ISO 时间}    自评：at, answers{q01…q24: 0–3}, v
```

真实的会话标题、Artifact 列表和自评答案只存放在私有 Artifact 的数据库里，不提交到本仓库。
