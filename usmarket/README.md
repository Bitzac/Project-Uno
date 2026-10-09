# 美股晨报 OS（v2 决策台）

每个交易日美西 05:00 前给出三件事：股票仓位上限、下一个开盘的买卖指令（含止损和股数）、为什么可信（回测和模拟组合记录）。设计沿用「机会猎手 OS」的液态玻璃风格。

- 在线：https://claude.ai/artifact/DzjCRcTt3iZFr2SE8tiB7T
- 出刊流程与编辑规则：[`EDITOR.md`](EDITOR.md)

## 规则（回测后上线的部分）

| 层 | 规则 | 回测 2017-11 至 2026-10（次日开盘成交，单边 5 个基点） |
|---|---|---|
| 仓位上限 | 15% ÷ SPY 20 日年化波动，取 100/75/50/25% 中不超过它的一档 | 总闸 × SPY：年化 10.4%，最大回撤 −15.6%，夏普 0.87 |
| 核心仓 | SPY，占 min(60%, 上限) | — |
| 卫星仓 | 上限超过 60% 的部分；S3 趋势突破，止损 2×ATR，退出线 50 日线或最高收盘 − 3×ATR，每笔风险 0.5% | 3,050 笔，胜率 34%，盈亏比 2.69，每笔 +0.20R |
| 组合 | 核心 + 卫星 | 年化 13.3%，最大回撤 −18.4%，夏普 1.00；SPY 13.2%、−34.1%、0.75 |

**没有上线的：** 5 项择时信号组合（夏普 0.69）、板块轮动（0.60）、S4 趋势回调（每笔 0.05R）、S5 放量跳空（每笔 −0.34R）。

**局限：** 只有约 9 年数据，不含 2008 年；价格不含分红，现金收益按 0 计；个股规则用当前成分股，有幸存者偏差；模型是在同一段数据上选出来的。

## 文件

| 文件 | 内容 |
|---|---|
| `pipeline/lib.mjs` | 指标（与 TradingView 对账误差 < 0.001%）、买卖规则、仓位模型；回测和实盘共用 |
| `pipeline/history.mjs` | Nasdaq 日线（2016 年起）和 CBOE VIX / VIX3M，缓存在 `.cache/`（不提交） |
| `pipeline/backtest.mjs` | 全部候选规则的回测和上线门槛，写 `data/backtest.json` |
| `pipeline/fetch.mjs` | 当天快照：标普 500 成分股的价格和指标、模型用的 ETF、经济日历 |
| `pipeline/signals.mjs` | 仓位上限、指令、候选；推进模拟组合 `data/ledger.json` |
| `issues/YYYY-MM-DD.json` | 每期：`data`（脚本生成）+ `edit`（结论和催化剂） |
| `src/`、`build.mjs` | 页面与构建；构建时校验每条指令和每段文字 |

```bash
node usmarket/pipeline/fetch.mjs      # 快照；周日/休市退出码 3
node usmarket/pipeline/signals.mjs    # 决策 + 账本
node usmarket/build.mjs               # 校验并生成 index.html
# 每月一次
node usmarket/pipeline/history.mjs --stocks && node usmarket/pipeline/backtest.mjs
```

页面里的「我的持仓」只存在浏览器本地：录入代码、成本、股数，按同一套止损规则给出持有、上移止损、警戒或卖出。
