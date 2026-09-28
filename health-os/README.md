# 身体健康 OS · Body Health OS

单文件网页应用：右侧是可旋转的 3D 透明玻璃男性人体，分为 **头部 / 内脏 / 躯干四肢** 三个可点击分区，有问题的部位按严重程度着色（留意 → 轻度 → 中度 → 严重）。旁边的资料面板显示年龄、身高、体重、BMI、血型、静息心率、血压和睡眠；左侧栏有 **问题 / 体征 / 体检 / 计划** 四个模块。设计沿用「地球探索 OS」的液态玻璃风格。

## 目录

| 文件 | 内容 |
|---|---|
| `src/anatomy.js` | 29 个部位定义、骨架关节位置、玻璃外壳和器官的 SDF 图元 |
| `src/worker.js` | SDF → surface nets 网格生成（在 Web Worker 里运行，失败时回退到主线程） |
| `src/three3d.js` | three.js 渲染、着色器、拾取、标注引线、身高标尺 |
| `src/core.js` | 数据层（云端 db / localStorage）、参考标准、侧栏与卡片渲染 |
| `src/forms.js` | 问题、体征、体检指标、计划、个人资料表单 |
| `src/boot.js` | 启动页（心电图）、事件绑定 |
| `src/examples.json` | 示例数据（全部带 `example: true`，可一键清除） |
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
- 化验参考范围为常见成人男性区间，以个人化验单为准
