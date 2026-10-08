# 他者之眼 · Through Foreign Eyes

一部只用**非中华文化圈**原始记录讲述中华文明的史诗风格短片（1080p · 30fps · 约 15 分钟 · 中文男声旁白 · 中文字幕）。

## 取材规则

| 规则 | 说明 |
|---|---|
| 采信 | 希腊、罗马、拜占庭、印度、粟特、阿拉伯、波斯、近代欧洲与现代国际机构的原始记录 |
| 排除 | 中国、日本、朝鲜半岛、越南文献；仅见于这些文献的事件（如 166 年“大秦”使者） |
| 排除 | 无原始出处的伪托名言（如拿破仑“睡狮论”） |
| 标注 | 原文无法核对处，卡片上标注英译者或“大意” |

## 流水线

| 步骤 | 文件 | 产物 |
|---|---|---|
| 1. 脚本数据 | `script.py` | `build/script.json`（48 场景 · 100 句旁白 · 地点与路线） |
| 2. 旁白合成 | `tts.py` | `build/vo/*.wav`（Kokoro-82M-v1.1-zh，声线 `zm_014`，离线） |
| 3. 旁白质检 | `qa_asr.py` | `build/qa_asr.json`（Whisper-small 转写，按带声调拼音逐音节比对） |
| 4. 时间线 | `timeline.py` | `build/timeline.json` |
| 5. 配乐与混音 | `audio.py` | `build/mix.wav`（程序合成 D 小调弦乐、战鼓、音浪；旁白自动闪避） |
| 6. 画面 | `web/`（`index.html` · `app.js` · `style.css`） | `renderAt(t)` 纯函数逐帧绘制 |
| 7. 逐帧渲染 | `capture.js` | `build/seg_*.mp4`（Playwright 并行截帧） |
| 8. 合成 | `ffmpeg` | `foreign-eyes.mp4` |

```bash
python3 script.py && python3 tts.py && python3 qa_asr.py && python3 timeline.py && python3 audio.py
python3 -m http.server 8765 --bind 127.0.0.1 &      # 画面需经 http 加载
NODE_PATH=/opt/node22/lib/node_modules node capture.js 4
```

依赖：`pip install torch kokoro misaki[zh] soundfile scipy cn2an pypinyin transformers`；Playwright Chromium；ffmpeg。
地图数据：Natural Earth（公有领域）；字体：Cinzel、Noto Serif SC、Cormorant Garamond、Noto Serif / Naskh Arabic / Serif Devanagari（SIL OFL）。
