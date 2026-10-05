# 工厂桑巴 · Factory Samba

照片里的人在照片里的工厂跳 30 秒桑巴。成片 `factory-samba.mp4`（720×1280 竖屏 · 60 fps · H.264 + AAC）。
动作、节拍对齐与配乐沿用 `../samba-dance`（同一段桑巴动捕、105.30 BPM、同一首配乐）。

| 步骤 | 文件 | 做法 |
|---|---|---|
| 1. 抠像 | `input/matte.png` | BiRefNet（rembg，CPU） |
| 2. 关节 | `input/keypoints_mp.json` | MediaPipe Pose（heavy），按衣服接缝微调 |
| 3. 背景 | `inpaint.py` → `build/plate.png` | LaMa 分块修补，去掉人和两处水印 |
| 4. 拆部件 | `rig.py` → `build/pieces/` | 头、上身、胯、大臂×2、小臂×2、大腿×2、小腿×2、鞋×2；被手挡住的面料用 LaMa 补全 |
| 5. 动作 | `sample_pose.js` → `build/pose3d.json` | 沿成片时间轴采样动捕骨骼（含节拍时间扭曲） |
| 6. 渲染 | `puppet.py` | 去掉整体朝向、按画面方向角驱动部件、透视缩短、贴地、深度排序、接触阴影与地面倒影 |
| 7. 合成 | `finalize.sh` | 淡入淡出 + 配乐两遍响度标准化 -14 LUFS |

```bash
# 模型：models/pose_landmarker_heavy.task、models/lama_fp32.onnx（Carve/LaMa-ONNX）；rembg 首次运行自动下载
python3 inpaint.py && python3 rig.py
python3 -m http.server 8767 --bind 127.0.0.1 &   # 在 Project-Uno 根目录
NODE_PATH=/opt/node22/lib/node_modules node sample_pose.js
for k in 0 1 2 3; do python3 puppet.py $k 4 & done; wait
./finalize.sh
```

局限：照片只有正面，转身动作被转回正面；部件是平面贴图，衣服不会随动作起褶。
