# 方块经济学 · 第 1 课：供给与需求

方块像素风的科普短片，约 2 分 28 秒，1080p / 30fps，中文男声配音（逐字对应字幕）+ 字幕 + 8-bit 配乐。用村民买钻石、矿工挖钻石讲需求、供给、均衡和曲线移动。画面、纹理、角色和音乐都由代码生成，不使用任何游戏素材；配音用开源 TTS 模型离线合成。

## 内容

| 时间 | 场景 | 讲什么 | 画面 |
|---|---|---|---|
| 0:00 | 片头 | 先给结论：价格由想买的人和愿卖的人共同决定 | 标题卡 |
| 0:10 | 01 需求 | 价格 7→1，排队村民 1→7，描出向下的需求曲线 | 地面集市 |
| 0:35 | 02 供给 | 价格 3→9，下矿矿工 1→7，描出向上的供给曲线 | 镜头下移到深层矿洞 |
| 1:01 | 03 均衡 | 定价 7 过剩 4，定价 3 短缺 4，停在 P=5、Q=3 | 成交动画、卖不掉 / 空手标签 |
| 1:34 | 04 需求增加 | 版本更新，需求曲线右移：P 5→6，Q 3→4 | 提示卡 + 曲线平移 |
| 1:54 | 05 供给增加 | 效率附魔镐，供给曲线右移：P 5→4，Q 3→4 | 提示卡 + 曲线平移 |
| 2:12 | 06 总结 | 四种曲线移动对价格和成交量的影响表 | 压暗背景 + 总结表 |

模型：需求 `Qd = 8 − P`，供给 `Qs = P − 2`，价格单位是绿宝石/颗，数量单位是颗/天。需求或供给增加时截距各 +2。

## 文件

| 文件 | 内容 |
|---|---|
| `src/timeline.js` | 唯一数据源：场景时长、字幕、价格与曲线移动关键帧、成交、提示卡 |
| `src/state.js` | 纯函数 `stateAt(t)`：任意时刻的完整状态，画面和音效共用 |
| `src/world.js` | 480×270 像素世界：程序化纹理、地图、村民、矿工、摊位、成交动画 |
| `src/main.js` | 每帧入口 `window.seek(t)`：画布、图表 SVG、表格、字幕、标签 |
| `src/style.css` | 液态玻璃面板、极细线条、粗体字 |
| `src/voice.js` | 每句配音时长（由 `tts/narrate.py` 生成）；timeline.js 据此拉伸字幕窗口 |
| `tts/narrate.py` | 配音：Kokoro v1.1-zh 男声 zm_045 逐句合成，Paraformer 识别回转逐字校验 |
| `tts/lexicon-fix.txt` | 读音修正：还得（hái děi）、一颗（yì kē）、一位（yí wèi） |
| `audio.mjs` | 合成背景乐（C–Am–F–G，96 BPM）和音效，混入人声并在人声期间压低背景乐，输出 `out/audio.wav` |
| `render.mjs` | Chromium 逐帧截图 → ffmpeg 分段编码 → 拼接 → 混音 → 响度标准化 |

## 配音

字幕即台本，配音逐字朗读字幕（阿拉伯数字读作汉字，破折号读作停顿）。

| 步骤 | 做法 |
|---|---|
| 选音色 | 45 个男声各读同一段测试句，按基频（确认男声）和识别回转的拼音错率排序，选 zm_045（基频 154 Hz） |
| 合成 | 基准 1.15 倍速；某句识别回转有读音错误，就换 1.05–1.25 倍速重试，取错误最少的一版 |
| 校验 | Paraformer 识别回文字，按带调拼音比对（同音字算对，按变调规则换算）；多音字逐个列出 TTS 读音对照 |
| 对齐 | 配音比字幕窗口长的句子，timeline.js 把这一段窗口拉长，窗口内的动画按比例跟着移动 |

校验结果写在 `out/voice/report.md`。最近一次：27 句中 26 句音节和声调全对；第 24 句"价跌"被识别成"下跌"，但该句"价"的 TTS 输入读音（jià）与第 21 句"价涨"相同，后者识别正确，判断为识别模型偏向常用词。

```bash
pip install sherpa-onnx numpy soundfile pypinyin
# 模型放到 .cache/tts/：kokoro-multi-lang-v1_1、sherpa-onnx-paraformer-zh-2024-03-09（k2-fsa/sherpa-onnx releases）
python3 tts/narrate.py scan                        # 男声测评 → out/voice/scan.json
python3 tts/narrate.py synth --sid 76 --speed 1.15 # 逐句合成 + 校验 → out/voice/、src/voice.js
```

## 渲染

需要 Node 22、ffmpeg、Playwright + Chromium。字体首次运行时自动下载到 `.cache/fonts/`（Noto Sans SC、Press Start 2P，均为 OFL；Unifont 取自系统）。

```bash
node render.mjs                         # 完整视频 → out/block-econ-supply-demand.mp4 + .srt
node render.mjs --stills 23.5,65,99     # 导出指定秒数的静帧 → out/stills/
node render.mjs --from 61 --to 94       # 只渲染一段 → out/preview.mp4
node audio.mjs                          # 只重做音频
```

每一帧只由 `t` 决定，所以可以多进程分段渲染后无缝拼接。改剧本只改 `src/timeline.js`（改了字幕要重跑 `tts/narrate.py synth`），字幕、配音、画面和音效会一起跟着变。
