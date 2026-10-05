# 桑巴之夜 · Samba Night

30 秒拉丁舞短片：**固定机位、固定背景、同一角色**，角色跳桑巴，配乐与舞步逐拍对齐。成片 `samba-dance.mp4`（1280×720 · 60 fps · H.264 + AAC）。

## 成片规格

| 项目 | 内容 |
|---|---|
| 角色 | Michelle（three.js 官方示例模型，Mixamo 角色），自带 `SambaDance` 真人动作捕捉，18.23 s 无缝循环 |
| 背景 | 夜晚舞厅：拼花木地板（实时光泽倒影）、酒红丝绒幕布、两排暖色灯泡串（失焦光斑）、追光光柱 |
| 机位 | 固定：高 1.18 m、距舞者 5.7 m、垂直视角 28°，全程不动 |
| 灯光 | 主追光（投影）+ 粉 / 琥珀双色逆光 + 幕布三盏扇形光 |
| 配乐 | 原创程序合成桑巴，105.30 BPM，2/4 拍，27 小节；第 52 拍收尾 |
| 响度 | -14 LUFS / -1.5 dBTP（两遍 loudnorm） |

## 节拍同步

| 步骤 | 做法 | 结果 |
|---|---|---|
| 找锚点 | 桑巴律动在髋部：每拍身体下沉一次。取髋部高度谷底（前后 0.25 s 内下沉 ≥ 4.5 cm） | 每个循环 30 个锚点 |
| 定拍数 | 循环长度必须是整数拍，否则循环后拍点错位。逐个候选 N 检查锚点间隔取整后能否闭合 | 只有 N = 32 可行（16 小节），105.30 BPM |
| 时间扭曲 | 以“每拍对应的动画时间”为未知数做平滑最小二乘，播放速度在拍间平滑变化 | 锚点残差 ≤ 11 ms，播放速度 0.86–1.18× |
| 成片核验 | 在 30 s 视频时间轴上重新检测髋部下沉，与拍点比对 | 49 次下沉，偏差中位 4 ms、最大 20 ms |

## 配乐编配

| 乐器 | 合成方式 | 节奏 |
|---|---|---|
| 苏尔多大鼓 | 正弦 + 音高包络 + 鼓槌噪声 | 第二声部在第 1 拍，第一声部在第 2 拍（桑巴重拍） |
| 卡沙小军鼓 | 带通噪声 + 205 Hz 鼓腔 | 十六分音符，带重音型 |
| 塔姆博林 | 760 / 1180 Hz 短促音 | “teleco-teco” 两小节型 |
| 阿哥哥双铃 | 非谐波分音 | 高低铃交替 |
| 甘扎沙锤 | 高频带通噪声 | 十六分音符，每拍第四格重音 |
| 卡瓦基尼奥 | Karplus-Strong 拨弦 | 下扫 / 上扫交替；C6–A7–Dm7–G7–Em7–A7–Dm7–G7 |
| 贝斯 | 正弦叠加谐波 + 软饱和 | 第 1 拍根音、第 2 拍五度 |
| 阿皮托哨子 | 2.95 kHz + 滚珠颤音 | 开场、第 17 小节停顿（paradinha）、收尾 |

各分轨按目标响度配比（例：苏尔多 -19、贝斯 -21、卡瓦基尼奥 -22、阿哥哥 -28 LUFS），十六分音符带桑巴式微摇摆，±3 ms 人手误差。

## 流水线

| 步骤 | 文件 | 产物 |
|---|---|---|
| 1. 下载依赖 | `fetch_assets.sh` | `web/vendor/`（three.js r186、Michelle.glb，不入库） |
| 2. 动作采样 | `analyze.js` | `build/motion.json`（120 Hz 关键骨骼世界坐标） |
| 3. 节拍与时间扭曲 | `beats.py` | `build/sync.json` |
| 4. 配乐 | `audio.py` | `build/music.wav` |
| 5. 画面 | `web/`（`index.html` · `app.js`） | `renderAt(t)` 纯函数逐帧渲染 |
| 6. 逐帧渲染 | `capture.js` | `build/seg_*.mp4`（Playwright 并行截帧，1800 帧） |
| 7. 合成 | `finalize.sh` | `samba-dance.mp4` |

```bash
./fetch_assets.sh
python3 -m http.server 8766 --bind 127.0.0.1 &      # 画面需经 http 加载
export NODE_PATH=/opt/node22/lib/node_modules
node analyze.js && python3 beats.py && python3 audio.py
node shot.js 0,10,20 && node capture.js 4 && ./finalize.sh
```

依赖：`pip install numpy scipy soundfile pyloudnorm`；Playwright Chromium（无 GPU 时走 SwiftShader 软件渲染，约 1 s/帧）；ffmpeg。
素材：three.js（MIT）；Michelle.glb 取自 three.js 官方示例仓库，渲染时下载、不随本仓库分发。配乐全部程序合成，无采样。
