# 重测流程

用户说「重测 AI 能力」时按这里执行。目标：采集近 30 天的真实记录，生成一份新快照，写进页面数据库。页面：https://claude.ai/artifact/LwT69jcfyL2XJFsZX3zxut

原始记录含会话标题和 Artifact 列表，只放在会话的 scratchpad 目录（下文记作 `$RAW`），**不要提交到仓库**。

| 步骤 | 做什么 | 产出 |
|---|---|---|
| 1 读上一份 | `ArtifactData list`，collection `snapshots`，`out_dir` 存到 scratchpad；取日期最新的一份，后面沿用它的分类和人工核对项 | 上一份快照 |
| 2 Git | 在本仓库 `git fetch --all` | 远程分支最新 |
| 3 会话 | `list_sessions`（`mine: true`，`limit: 100`），有 `last_id` 就用 `after_id` 翻页直到空；每页原样存为 `$RAW/sessions-N.txt`（结果过长时工具会存成文件，直接复制该文件） | `sessions-*.txt` |
| 4 定时任务 | `list_triggers`（`include_completed: true`），每个写成 `{id, name, cron, enabled, run_once_at, persistent_session_id, last_status, last_fired, created, push}`，`last_status` 去掉 `ROUTINE_RUN_STATUS_` 前缀 | `$RAW/triggers.json` |
| 5 Artifact | `Artifact list`（`scope: mine`，`limit: 200`），每件写成 `{title, url, updated, domain, format}`；已在上一份快照里的沿用原分类，新的按下方清单归类 | `$RAW/artifacts.json` |
| 6 人工核对项 | 从上一份快照的 `lists` 抄出 `connectors`、`verification`、`sop`（只取非「仓库 SOP」的条目，作为 `sopExtra`）、`privacy`、`blindSpots`；`projects` 按 `{目录: [标题, 领域, 形态]}` 重建，再补新项目。读新项目的 README 和管道脚本，有回测、质检、构建校验、来源核实的追加到 `verification`；连接器有了实际产出就把 `used` 改成 `true` 并写明证据。`defaultBranch` 写仓库默认分支名 | `$RAW/manual.json` |
| 7 计算 | `node ai-os/pipeline/snapshot.mjs $RAW YYYY-MM-DD > $RAW/../snapshot.json`（日期用美西当天） | 快照 JSON |
| 8 写入 | `ArtifactData set`，collection `snapshots`，doc_id 为日期，`file_path` 指向快照；当天已有快照时先读出 `version`，带 `if_version` 覆盖 | 页面自动刷新 |

**领域**（12 个）：健康、金融投资、创业商业、职业人生、世界地缘、历史文化、教育学习、媒体内容、科技 AI、个人品牌、生活消费、创意娱乐

**形态**：交互应用、研究报告、数据可视化、定期刊物、视频、文档、个人主页、提示文档、计算工具、知识图谱

## 规则

- 只写能核对的事实。人工核对项每条都要写清出处（文件路径或 Artifact 名），找不到证据就不加。
- 不改 `src/framework.js` 的基准，除非用户要求；改基准会让历史快照一起重算。
- 不替用户做自评；自评只能在页面上由用户本人保存。

## 汇报

用三行回复：证据分（上次 → 本次）与阶梯等级；变化最大的两项指标；页面链接。
