# -*- coding: utf-8 -*-
"""背景修补：把人和两处水印从照片中去掉 -> build/plate.png（LaMa ONNX，CPU）
人物区域高 1800 px，远超 LaMa 的 512 输入，故按 1024×1024 窗口（缩到 512）分块修补，
重叠处羽化拼接；修补结果只写回遮罩内，遮罩外保持原图像素。"""
import os
import numpy as np, cv2, onnxruntime as ort
from PIL import Image

os.makedirs('build', exist_ok=True)
img = np.array(Image.open('input/person.webp').convert('RGB'))
H, W = img.shape[:2]
alpha = np.array(Image.open('input/matte.png').convert('L'))

hole = (alpha > 8).astype(np.uint8)
hole = cv2.dilate(hole, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (41, 41)))
# 鞋底下的投影与地面倒影
ys, xs = np.where(alpha > 128)
foot_y = ys.max()
cv2.ellipse(hole, (int(xs.mean()), int(foot_y)), (300, 70), 0, 0, 360, 1, -1)
# 水印：左上“AI生成”、右下“即梦AI”
cv2.rectangle(hole, (25, 25), (255, 120), 1, -1)
cv2.rectangle(hole, (1020, 1880), (1310, 1975), 1, -1)

sess = ort.InferenceSession('models/lama_fp32.onnx', providers=['CPUExecutionProvider'])


def lama(crop, m):
    x = cv2.resize(crop, (512, 512), interpolation=cv2.INTER_AREA).astype(np.float32) / 255
    mm = (cv2.resize(m.astype(np.float32), (512, 512), interpolation=cv2.INTER_LINEAR) > 0.3).astype(np.float32)
    out = sess.run(None, {'image': x.transpose(2, 0, 1)[None], 'mask': mm[None, None]})[0][0].transpose(1, 2, 0)
    if out.max() <= 1.5:
        out = out * 255
    return cv2.resize(np.clip(out, 0, 255).astype(np.float32), (crop.shape[1], crop.shape[0]), interpolation=cv2.INTER_CUBIC)


acc = np.zeros((H, W, 3), np.float32)
wsum = np.zeros((H, W), np.float32)
S = 1024
cx = int(np.clip(xs.mean() - S / 2, 0, W - S))
wins = [(cx, y) for y in (0, 488, H - S)] + [(0, 0), (W - S, H - S)]
for x0, y0 in wins:
    m = hole[y0:y0 + S, x0:x0 + S]
    if m.sum() == 0:
        continue
    out = lama(img[y0:y0 + S, x0:x0 + S], m)
    r = np.minimum(np.arange(S) + 1, S - np.arange(S)).astype(np.float32)
    w = np.minimum.outer(r, r) ** 2  # 中心权重大，边缘羽化
    acc[y0:y0 + S, x0:x0 + S] += out * w[..., None]
    wsum[y0:y0 + S, x0:x0 + S] += w
fill = acc / np.maximum(wsum, 1e-6)[..., None]
soft = cv2.GaussianBlur(hole.astype(np.float32), (0, 0), 6)[..., None]
plate = img * (1 - soft) + fill * soft
Image.fromarray(np.clip(plate, 0, 255).astype(np.uint8)).save('build/plate.png')
print('plate saved', plate.shape)
