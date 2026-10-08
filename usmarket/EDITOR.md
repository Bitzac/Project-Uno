# 美股晨报 OS · 出刊手册（v2 决策台）

每日定时任务按这份手册出刊。目标：美西 05:00 前，把当天的决策（仓位上限、指令、候选）发布到同一个 Artifact 链接，并把这一期 JSON 和模拟组合账本存进仓库。

- Artifact：https://claude.ai/artifact/DzjCRcTt3iZFr2SE8tiB7T
- 分支：`claude/ecstatic-keller-vh23uz`
- 日期：以 `TZ=America/Los_Angeles date +%F` 为准
- 出刊日：周一至周六；周日和美股休市日不出刊（`fetch.mjs` 自动判断，退出码 3）。周六那期对应周一开盘，周一那期会重算同一交易日并带上盘前数据，账本不会重复记账。

## 流程

| 步骤 | 做什么 | 完成标准 |
|---|---|---|
| 1 准备 | `git fetch origin claude/ecstatic-keller-vh23uz && git checkout claude/ecstatic-keller-vh23uz && git pull origin claude/ecstatic-keller-vh23uz` | 拿到最新的 `usmarket/data/ledger.json` |
| 2 抓数 | `node usmarket/pipeline/fetch.mjs`。退出码 3：汇报「今日休市不出刊」后结束，不提交。其他报错等 2 分钟重试一次，仍失败就汇报原因并结束 | 打印 503 只成分股和交易日 |
| 3 信号 | `node usmarket/pipeline/signals.mjs`（约 30 秒，会拉 ETF 历史）。它按昨天的待执行指令在开盘价记账，检查止损，再生成下一个开盘的指令 | 打印仓位上限、成交、指令、候选和「待写 edit.notes」 |
| 4 月度回测 | **只在每月第一个周六**：`node usmarket/pipeline/history.mjs --stocks && node usmarket/pipeline/backtest.mjs`（约 4 分钟），再重跑第 3 步。若打印的「上线」结果变了，在封面写明 | `usmarket/data/backtest.json` 更新 |
| 5 检索 | 只为「待写 edit.notes」里的股票查催化剂：近几天的财报、评级、并购、公告。用 WebSearch（`extended`，并行发出），关键数字用 WebFetch 打开原文核对 | 每条有能打开、日期对得上的来源，或写明「无明确消息」 |
| 6 写稿 | 编辑 `usmarket/issues/YYYY-MM-DD.json` 的 `edit`：`no` = 上一期 + 1；`edited` 写实际编辑时间；`cover`；`notes` | `node usmarket/build.mjs` 通过 |
| 7 发布 | Artifact `read` 上面的链接，再 `publish`，`url` 填上面的链接，`file_path` 填 `usmarket/index.html` | 链接打开是今天这一期 |
| 8 存档 | `git add usmarket`（含 `data/ledger.json`），提交信息 `美股晨报 No.NNN · YYYY-MM-DD`，`git push -u origin claude/ecstatic-keller-vh23uz`（网络错误按 2s/4s/8s/16s 重试） | 推送成功 |

- **05:00 是硬截止。** 04:52 时还没查完的催化剂先写「无明确消息。」，完成第 6–8 步，再补查、重新构建发布、追加一次提交。
- `build.mjs` 校验不过就修数据，不要绕过校验发布；`--draft` 只用于本地预览。
- **不要手改 `data` 和 `ledger.json`。** 规则、仓位、股数全部由脚本算出；编辑只写文字。漏跑过几天也没关系：下一次运行会在最近一个开盘价补记待执行的指令。
- 发布失败时仍然完成第 8 步，并在汇报里写明原因。

## 编辑规则

1. **结论先行。** `cover.title` 写今天的决策：仓位上限多少、有几条指令（买什么、卖什么），带数字。没有指令就写「无新指令」和原因。
2. **只复述规则的结论，不加主观判断。** 不写「建议加仓」「看好」这类规则之外的话；不预测涨跌。
3. **数字从脚本输出复制。** 仓位、波动率、价格、止损、盈亏都以 `signals.mjs` 的打印和 `data.decision` 为准。新闻里的数字（财报、评级、目标价）必须在打开的原文里看到。
4. **cover.dek** 两三句：交代仓位上限的依据（SPY 20 日波动 vs 15% 目标）、指令的原因、模拟组合相对 SPY 的表现。
5. **cover.points** 3–5 条，每条至少一个数字，依次覆盖：仓位、指令或持仓、模拟组合、风险事件（CPI、FOMC 等）。
6. **notes**：每只有指令或在候选池里的股票一两句话，写它为什么突破或下跌（财报、评级、并购、行业消息）以及下次财报日；找不到就以「无明确消息。」开头，此时 `src` 可以为空。
7. **语言**：简体中文，短句，主动语态。公司名用通行中文名，没有的保留英文。
8. **利益相关**：涉及 Anthropic 的条目结尾加「本刊编辑 Claude 由 Anthropic 开发，此条只转述第三方报道。」

## edit 结构

```text
no, edited
cover: { title, dek, points: [3–5 条] }
notes: { 代码: { why, src: [[名称, https 链接]] } }   ← signals.mjs 列出的每只
```

## 规则在哪里

| 内容 | 文件 |
|---|---|
| 指标、买卖规则、仓位参数（`CFG`、`RULES`、`regime()`） | `pipeline/lib.mjs`，回测和实盘共用 |
| 选用哪个仓位模型、哪些个股规则上线 | `data/backtest.json`（`regime.model`、`liveKeys`），由 `backtest.mjs` 按上线门槛决定 |
| 模拟组合账本 | `data/ledger.json`（`before` 字段保存当天处理前的状态，用于同日重跑） |
