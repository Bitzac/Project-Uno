# 美股晨报 · 出刊手册

每日定时任务按这份手册出刊。目标：美西时间 05:00 前，把当天一期发布到同一个 Artifact 链接，并把这一期的 JSON 存进仓库。

- Artifact：https://claude.ai/artifact/DzjCRcTt3iZFr2SE8tiB7T
- 分支：`claude/ecstatic-keller-vh23uz`
- 日期：以 `TZ=America/Los_Angeles date +%F` 为准
- 出刊日：周一至周五出日报，周六出周报，周日和美股休市日不出刊（`fetch.mjs` 会自动判断）

## 流程

| 步骤 | 做什么 | 完成标准 |
|---|---|---|
| 1 准备 | `git fetch origin claude/ecstatic-keller-vh23uz && git checkout claude/ecstatic-keller-vh23uz && git pull origin claude/ecstatic-keller-vh23uz` | 拿到最新的 `usmarket/issues/` |
| 2 抓数 | `node usmarket/pipeline/fetch.mjs`。退出码 3 表示周日或休市：汇报「今日休市不出刊」后结束，不提交。其他报错等 2 分钟重试一次，仍失败就汇报原因并结束，不发布旧数据 | 打印出涨跌榜和「待写 edit.movers」清单 |
| 3 补档 | 如果仓库缺了前几天的期刊（推送失败过），用 Artifact `read` 读取上面的链接，从 `<script type="application/json" id="issues-data">` 里取出缺失的期刊，按日期写回 `usmarket/issues/` | `issues/` 与线上一致 |
| 4 看数 | `node usmarket/pipeline/peek.mjs` 看全部数字；`node usmarket/pipeline/peek.mjs NVDA LLY` 看个股 | 文中每个行情数字都从这里复制 |
| 5 检索 | 新闻用 WebSearch（`extended`，同一轮并行发出多个查询），关键说法用 WebFetch 打开原文核对日期和数字。顺序：大盘综述 → 盘前异动 → 收盘涨跌榜 → 板块 → 要闻 | 每条原因都有能打开、日期对得上的来源 |
| 6 写稿 | 编辑 `usmarket/issues/YYYY-MM-DD.json` 里的 `edit`，把所有 `TODO` 替换掉：`no` = 上一期 + 1；`edited` 写实际编辑时间（如 `2026-10-09 04:45 PT`） | `node usmarket/build.mjs` 通过 |
| 7 发布 | Artifact `read` 上面的链接，再 `publish`，`url` 填上面的链接，`file_path` 填 `usmarket/index.html` | 链接打开是今天这一期 |
| 8 存档 | `git add usmarket`，提交信息 `美股晨报 No.NNN · YYYY-MM-DD`，`git push -u origin claude/ecstatic-keller-vh23uz`（网络错误按 2s/4s/8s/16s 重试） | 推送成功 |

- `build.mjs` 校验不过就修数据，不要绕过校验发布。`--draft` 只用于本地预览。
- **05:00 是硬截止。** 04:52 时还有异动原因没查完，就把剩下的写成「无明确消息。」先完成第 6–8 步；再继续补查，查到后改写、重新构建、重新发布并追加一次提交。
- 发布失败时仍然完成第 8 步，并在汇报里写明失败原因。

## 编辑规则

1. **结论先行。** `cover.title` 写当天对美股影响最大、数字最硬的一件事；`cover.dek` 两三句交代原因和大盘位置；`cover.points` 3–5 条，每条至少一个数字，依次覆盖：板块、盘前或期货、异动、宽度、日历。
2. **行情数字只从 `data` 复制。** 涨跌幅、价格、相对量、家数都用 `peek.mjs` 的输出，保留到小数点后一位或两位，不要自己换算。新闻里的数字（财报、经济数据、评级、目标价）必须在打开的原文里看到。
3. **口径要说清。** 盘前版写「前收」「盘前」；周报写「近一周」。不同来源的数字有出入时，以 `data` 为准，并在正文写明来源口径。
4. **异动原因**（`edit.movers`）：`fetch.mjs` 列出的每只都要写，一两句话。优先找公司公告、财报、评级变动、并购、监管、行业消息；看 `data.earnings.results` 判断是不是财报行情。只能找到旧闻或推测时，写「无明确消息。」开头，后面可以补 `data` 里的事实（如板块同日涨跌、近一周累计），这种情况 `src` 可以为空。不要把「板块整体下跌」写成原因，除非有来源说明。
5. **板块点评**（`edit.sectors`）：11 个板块各一句，写涨跌、上涨下跌家数、带动最大的两三只股票；有新闻驱动的附来源。
6. **要闻**（`edit.news`）：3–8 条，覆盖原油与利率、美联储与经济数据、大公司财报、并购与评级。每条 `tag`、`date`（`M/D`）、`title`、`body`、`src` 齐全。
7. **时间窗口**：上一期 `edited` 之后的消息；周一覆盖整个周末；周报覆盖周一至周五。
8. **语言**：简体中文，短句，主动语态。公司名用通行中文名，没有的保留英文。不写投资建议，不预测涨跌；引用观点要写明是谁说的。
9. **利益相关**：涉及 Anthropic 的条目结尾加「本刊编辑 Claude 由 Anthropic 开发，此条只转述第三方报道。」

## edit 结构

```text
no, edited
cover:   { title, dek, points: [3–5 条] }
sectors: { XLK, XLC, XLY, XLP, XLV, XLF, XLI, XLE, XLB, XLU, XLRE: { t, src } }
movers:  { 代码: { why, src: [[名称, https 链接]] } }     ← fetch.mjs 列出的每只
news:    [{ tag, date, title, body, src }] × 3–8
```

`data` 由 `fetch.mjs` 生成，不要手改；重新运行 `fetch.mjs` 会刷新 `data`，保留已写好的 `edit`，并为新上榜的股票补上 `TODO`。
