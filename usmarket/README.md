# 美股晨报 OS

每个交易日美西 05:00 前出刊的美股晨报，设计沿用「机会猎手 OS」：整屏标普 500 热力图 + 液态玻璃侧栏。周六出周报，周日和休市日不出刊。

- 在线阅读：https://claude.ai/artifact/DzjCRcTt3iZFr2SE8tiB7T
- 出刊流程与编辑规则：[`EDITOR.md`](EDITOR.md)

| 文件 | 内容 |
|---|---|
| `pipeline/fetch.mjs` | 抓取行情、盘前、板块、宏观、财报、经济日历，写入 `issues/<日期>.json` 的 `data`，并生成待写的 `edit` 骨架 |
| `pipeline/peek.mjs` | 打印编辑要用的全部数字 |
| `issues/YYYY-MM-DD.json` | 每期内容：`data`（脚本生成）+ `edit`（结论、板块点评、异动原因、要闻） |
| `data/sp500.json` | 标普 500 成分股与 GICS 分类缓存，Wikipedia 抓取失败时使用 |
| `src/` | 页面：`app.js` 渲染、`style.css` 液态玻璃样式、`body.html` 骨架 |
| `build.mjs` | 校验所有期刊（有 `TODO`、异动缺原因或来源就报错），把最新 30 期内联进 `index.html` |
| `index.html` | 构建产物，直接发布为 Artifact |

## 构建

```bash
node usmarket/pipeline/fetch.mjs    # 抓数；周日/休市退出码 3
node usmarket/pipeline/peek.mjs     # 看数
node usmarket/build.mjs             # 校验并生成 index.html（--draft 跳过校验，仅本地预览）
```

## 数据来源与口径

| 模块 | 来源 | 口径 |
|---|---|---|
| 个股、ETF、指数、期货、利率、汇率、商品、加密 | TradingView 行情筛选器 | 延迟约 15 分钟；股票取最近一个交易时段收盘，盘前另列 |
| 成分股与板块分类 | Wikipedia 标普 500 成分股表 | GICS 11 个板块、子行业 |
| 交易日 | Nasdaq 市场状态 | 上一 / 下一交易日、是否休市 |
| 财报 | Nasdaq 财报日历 | 标普 500 或市值 ≥ 200 亿美元 |
| 经济数据 | TradingView 经济日历 | 美国，中高重要性 |
| 异动原因、要闻 | 编辑检索新闻 | 每条附来源；查不到写「无明确消息」 |

## 版面

| 区块 | 内容 |
|---|---|
| 热力图 | 面积 = 市值，颜色 = 涨跌；可切换前收 / 盘前 / 近一周 / 近一月 / 年初至今；点板块展开到子行业 |
| 总览 | 今日结论、主要指数、股指期货、宏观看板、要闻 |
| 板块 | 11 个 GICS 板块（SPDR ETF）+ 14 个主题 ETF，附点评 |
| 异动 | 盘前异动、涨幅榜、跌幅榜（每只附原因和来源）、放量 |
| 日历 | 已公布财报、未来一周财报、美国经济数据 |
| 宽度 | 涨跌家数、等权 vs 市值加权、站上 50/200 日均线比例、52 周新高新低 |

右上角可切换往期和「红涨绿跌 / 绿涨红跌」（只存在本机浏览器）。
