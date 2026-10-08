# UNO 日刊 · 出刊手册

每日定时任务按这份手册出刊。目标：美西时间 05:00 前，把当天一期发布到同一个 Artifact 链接，并把这一期的 JSON 存进仓库。

- Artifact：https://claude.ai/artifact/SbEPYSRJ631p2CDYYBM4uB
- 分支：`claude/awesome-ride-3fimll`（仓库默认分支，所有期刊都提交到这里）
- 日期：以 `TZ=America/Los_Angeles date +%F` 为准

## 流程

| 步骤 | 做什么 | 完成标准 |
|---|---|---|
| 1 准备 | `git fetch origin claude/awesome-ride-3fimll && git checkout claude/awesome-ride-3fimll && git pull origin claude/awesome-ride-3fimll`；读 `daily/issues/` 里最新一期 | 拿到上一期的 `no`、`edited`、`agenda` |
| 2 补档 | 如果今天的文件已存在，跳到第 5 步重新发布即可。如果仓库缺了前几天的期刊（推送失败过），用 Artifact `read` 读取上面的链接，从 `<script type="application/json" id="issues-data">` 里取出缺失的期刊，按日期写回 `daily/issues/` | `issues/` 连续无缺 |
| 3 检索 | 按下方「板块清单」逐个板块检索。新闻用 WebSearch（`extended`），关键数字用 WebFetch 打开原文核对 | 每条都有能打开的来源链接 |
| 4 写稿 | 新建 `daily/issues/YYYY-MM-DD.json`，结构照抄上一期；`no` = 上一期 + 1；`edited` 写实际编辑时间（如 `2026-10-03 04:50 PT`） | `node daily/build.mjs` 通过 |
| 5 发布 | Artifact `read` 上面的链接，再用 `publish`，`url` 填上面的链接，`file_path` 填 `daily/index.html` | 链接打开是今天这一期 |
| 6 存档 | `git add daily/issues daily/index.html`，提交信息 `UNO 日刊 No.NNN · YYYY-MM-DD`，`git push -u origin claude/awesome-ride-3fimll`（网络错误按 2s/4s/8s/16s 重试） | 推送成功 |

`build.mjs` 校验不过就修数据，不要绕过校验发布。发布失败时仍然完成第 6 步，并在回复里写明失败原因。

## 编辑规则

1. **结论先行。** `cover.title` 写当天影响最大、数字最硬的一件事；`cover.points` 五个板块各一句，每句至少一个数字。
2. **只写核实过的事实。** 搜索结果的摘要只当线索，数字必须在打开的原文里看到。优先一手来源（官方公告、统计局、交易所、赛事官网），其次通讯社和财经媒体。
3. **来源冲突时**取一手来源，或在正文写明口径（盘中、收盘、24 小时）。核实不了的不写。
4. **时间窗口**是上一期 `edited` 之后的新闻；周一出刊覆盖整个周末。旧闻只在有新进展时再写，并写清新进展。
5. **每条都有日期**（事件发生日 `M/D`，预告写开赛日）和至少一个 `src`。
6. **行情**：美股取前一交易日收盘，亚欧取最新收盘，加密和汇率取出刊时报价；`c` 是当日涨跌幅（百分数的数值），无法确认时写 `null` 并给 `ct`；休市写进 `note`。
7. **语言**：简体中文，短句，主动语态。人名用通行中文译名，没有通行译名的保留原文。不写投资建议，不预测涨跌；引用观点要写明是谁说的。
8. **利益相关**：涉及 Anthropic 的条目结尾加「本刊编辑 Claude 由 Anthropic 开发，此条只转述第三方报道。」
9. **日程** `agenda`：删掉已经过去的，补上未来 30–60 天新确认的。

## 板块清单

| 板块 | `id` | 每期必查 | 篇幅 |
|---|---|---|---|
| 户外运动 | `outdoor` | 越野跑与马拉松、登山与攀岩、骑行、滑雪与冬季运动、网球、高尔夫、F1、SailGP。有比赛结果的优先；当周有大赛时加一张 `table`（积分榜、成绩表） | lead + 6–11 条，覆盖至少 5 个项目 |
| AI | `ai` | 模型发布、安全与监管、融资与 IPO、研究、算力与芯片 | lead + 4–7 条 |
| 科技前沿 | `tech` | 航天、半导体、量子、机器人、能源与生物科技 | lead + 4–6 条 |
| 政治经济 | `politics` | 美国数据与美联储、国会与选举、中国、欧洲、日本、地缘冲突、能源 | lead + 4–6 条 |
| 国际市场 | `markets` | 标普 500、道指、纳指、欧洲斯托克 50、日经 225、恒生、上证；美债 10 年、美元指数、欧元/美元、美元/日元、美元/人民币；黄金、白银、布伦特、WTI；比特币、以太坊 | lead + `quotes` 全表 + 4–6 条 |

## JSON 结构

```text
date, no, edited, note
cover: { kicker, title, dek, points: [{ sec, text }] × 5，顺序 outdoor → markets }
sections: [5 个，顺序 outdoor, ai, tech, politics, markets]
  id
  lead:  { tag, date, title, dek, body: [段落], figs: [{ v, u, l }], src: [[名称, https 链接]] }
  items: [{ tag, date, title, body: 一段, figs?, src }]
  table?:  { title, cols, align, rows, src }                    （任意板块可选）
  quotes:  { scale, groups: [{ name, rows: [{ n, v, c, ct?, d, key?, note? }] }], src }   （仅 markets）
agenda: [{ d, sec, t }]
```

`key: true` 的行情会出现在封面「行情速览」，保持 8 个左右。
