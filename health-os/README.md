# 身体健康 OS · Body Health OS

单文件网页应用：支持多人档案（侧栏顶部切换，数据按人分开存），右侧是可旋转的 3D 透明玻璃人体（按档案性别使用男性或女性模型），分为 **头部 / 内脏 / 躯干四肢** 三个可点击分区，有问题的部位按严重程度着色（留意 → 轻度 → 中度 → 严重）。旁边的资料面板显示年龄、身高、体重、BMI、血型、静息心率、血压和睡眠；左侧栏有 **问题 / 体征 / 体检 / 计划 / 建议** 五个模块。设计沿用「地球探索 OS」的液态玻璃风格。

## 目录

| 文件 | 内容 |
|---|---|
| `src/anatomy.js` | 35 个部位定义（女性多乳腺、子宫、卵巢；男女共用颈动脉、全身骨骼、全身血管）、男女两套关节位置、玻璃外壳和器官的 SDF 图元、血管中心线（主动脉及内脏分支、四肢动静脉、颈部与头面部血管）和冠状动脉走向 |
| `src/worker.js` | SDF → surface nets 网格生成（在 Web Worker 里运行，失败时回退到主线程） |
| `src/three3d.js` | three.js 渲染、着色器、拾取、标注引线、身高标尺；血管按中心线生成渐细管道并合并为一个网格，冠状动脉贴合到心脏网格表面 |
| `src/core.js` | 数据层（云端 db / localStorage）、参考标准、侧栏与卡片渲染 |
| `src/forms.js` | 问题、体征、体检指标、计划、个人资料表单 |
| `src/boot.js` | 启动页（心电图）、事件绑定 |
| `src/examples.json` | 虚构的「示例」档案（全部带 `example: true`，可一键清除）；只在没有云端数据时使用 |
| `index.html` | 构建产物 |

## 构建

```bash
node build.mjs   # 生成 index.html
```

`index.html` 不含 `<html>/<head>/<body>`，发布为 claude.ai Artifact 时由平台补齐。three.js 0.160 从 cdnjs 动态加载。

## 参考标准

- BMI：WS/T 428-2013（< 18.5 偏瘦，24–27.9 超重，≥ 28 肥胖）
- 血压：《中国高血压防治指南（2018）》（120–139/80–89 正常高值，≥ 140/90 高血压）
- 睡眠：成人 7–9 小时（AASM）
- 静息心率：60–100 次/分
- 血氧饱和度：≥ 95% 正常，< 90% 为低氧
- 呼吸频率：成人静息 12–20 次/分（手表在睡眠中测量，通常偏低）
- 体脂率：ACE 分级（男 ≥ 25%、女 ≥ 32% 为肥胖）
- 心率变异性、心肺适能（VO₂max）：不设统一阈值，只看个人趋势
- 化验参考范围为常见成人男性区间，以个人化验单为准

## 数据结构（云端）

```
people/{pid}                  档案：name, sex(男|女), birth, height, weight, blood, rh(+|-|空=未知), rhr, allergy, order
people/{pid}/issues/{id}      问题：part, side, title, sev(1–4), status, since, source, note
people/{pid}/vitals/{id}      体征：type(weight|rhr|bp|sleep|steps|bodyfat|hrv|vo2max|spo2|resp), date, value[, value2]
people/{pid}/labs/{id}        化验：key, name, value, unit, low, high, cat, part, date
people/{pid}/plans/{id}       计划：title, kind, due, repeat, part, done
people/{pid}/advice/{id}      用药/饮食建议：kind(drug|food), tone(do 宜|avoid 忌|note 注意), title, part, note, ref
```

真实的健康数据只存放在私有 Artifact 的数据库里，不提交到本仓库。
