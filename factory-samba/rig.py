# -*- coding: utf-8 -*-
"""把照片里的人拆成可动的 2D 部件 -> build/pieces/*.png + build/rig.json
部件按衣服接缝切分：头（含脖子，藏在领子后）、上身（到腰带下沿）、胯、左右大臂、
左右小臂（含手）、左右大腿、左右小腿（到裤脚）、左右鞋。
关节先由 MediaPipe 姿态模型检测（input/keypoints_mp.json），再按衣服接缝微调。
被手臂、手挡住的衣服区域用 LaMa 补全，抬手时露出来的是补好的工装面料。
照片坐标统一换算到输出画布（720×1280）的静止姿态坐标。"""
import json, os
import numpy as np, cv2, onnxruntime as ort
from PIL import Image

os.makedirs('build/pieces', exist_ok=True)
img = np.array(Image.open('input/person.webp').convert('RGB'))
alpha = np.array(Image.open('input/matte.png').convert('L')).astype(np.float32) / 255
H, W = alpha.shape
kp = json.load(open('input/keypoints_mp.json'))

# ---------- 关节（照片像素坐标；R = 人物右侧 = 画面左侧） ----------
J = {
    'R_SH': (482, 532), 'L_SH': (882, 528), 'R_EL': kp['r_el'][:2], 'L_EL': kp['l_el'][:2],
    'R_WR': kp['r_wr'][:2], 'L_WR': kp['l_wr'][:2], 'R_HIP': kp['r_hip'][:2], 'L_HIP': kp['l_hip'][:2],
    'R_KNEE': kp['r_knee'][:2], 'L_KNEE': kp['l_knee'][:2], 'R_ANK': kp['r_ank'][:2], 'L_ANK': kp['l_ank'][:2],
    'NECK': (680, 455), 'HEAD_TOP': (672, 140), 'WAIST': (680, 955), 'ROOT': (680, 1089),
}
J = {k: np.array(v, np.float32) for k, v in J.items()}
MID = 676  # 两腿分界

yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)


def capsule(a, b, r):
    a, b = np.array(a, np.float32), np.array(b, np.float32)
    ab = b - a
    t = np.clip(((xx - a[0]) * ab[0] + (yy - a[1]) * ab[1]) / (ab @ ab), 0, 1)
    return ((xx - a[0] - t * ab[0]) ** 2 + (yy - a[1] - t * ab[1]) ** 2) <= r * r


def poly(pts):
    m = np.zeros((H, W), np.uint8)
    cv2.fillPoly(m, [np.array(pts, np.int32)], 1)
    return m.astype(bool)


def side_of(p0, p1, left=True):
    """折线 p0→p1 的左侧（画面左）或右侧"""
    (x0, y0), (x1, y1) = p0, p1
    xl = x0 + (yy - y0) * (x1 - x0) / (y1 - y0)
    return xx < xl if left else xx > xl


# 手臂与身体的分界线：肩线外端 → 腋下 → 腰侧（按袖子内侧的折痕）
def arm_side(r):
    if r:
        return (side_of((445, 440), (500, 585)) & (yy < 585)) | (side_of((500, 585), (507, 1100)) & (yy >= 585))
    return (side_of((908, 450), (855, 585), False) & (yy < 585)) | (side_of((855, 585), (848, 1100), False) & (yy >= 585))


skin = (img[..., 0].astype(int) - img[..., 2].astype(int) > 12) | (img.mean(2) > 125)
M = {}
for s, r in (('R', True), ('L', False)):
    side = arm_side(r)
    M[s + '_UPPER'] = capsule(J[s + '_SH'], J[s + '_EL'], 64) & side & (yy > 445)
    hand_c = (J[s + '_WR'] + np.array([12 if r else -30, 78])).astype(int)
    hand = np.zeros((H, W), np.uint8)
    cv2.ellipse(hand, tuple(hand_c), (58, 92), 0, 0, 360, 1, -1)
    M[s + '_ZONE'] = capsule(J[s + '_EL'], J[s + '_WR'], 66) | hand.astype(bool)  # 垂手占据的整片区域
    M[s + '_FORE'] = (capsule(J[s + '_EL'], J[s + '_WR'], 64) & side) | (hand.astype(bool) & skin)
    leg = xx < MID if r else xx >= MID
    M[s + '_THIGH'] = capsule(J[s + '_HIP'], J[s + '_KNEE'], 108) & leg & (yy > 990)
    M[s + '_SHIN'] = capsule(J[s + '_KNEE'], J[s + '_ANK'], 104) & leg & (yy > 1380) & (yy < 1813)
    M[s + '_SHOE'] = leg & (yy >= 1786)
M['HEAD'] = (yy < 350) | poly([(612, 340), (748, 340), (742, 472), (618, 472)])  # 下巴以上 + 收窄的脖子
M['CHEST'] = poly([(560, 380), (445, 440), (500, 585), (507, 962), (848, 962), (855, 585), (908, 450), (800, 380)])
M['PELVIS'] = poly([(492, 935), (862, 935), (872, 1185), (680, 1272), (486, 1185)])
# 胯和大腿上段只保留身体轮廓内的像素（垂手时手挡在裤侧，轮廓外的是手）
torso_x = ~((yy < 1300) & ((xx < 488) | (xx > 862)))
for k in ('PELVIS', 'R_THIGH', 'L_THIGH'):
    M[k] &= torso_x

# ---------- 被手臂遮挡的面料：LaMa 补全 ----------
arms = M['R_UPPER'] | M['R_FORE'] | M['L_UPPER'] | M['L_FORE'] | M.pop('R_ZONE') | M.pop('L_ZONE')
arms &= alpha > 0.05
body_zone = M['CHEST'] | M['PELVIS'] | M['R_THIGH'] | M['L_THIGH']
fill = cv2.dilate((arms & body_zone).astype(np.uint8), np.ones((13, 13), np.uint8)).astype(bool) & body_zone
sess = ort.InferenceSession('models/lama_fp32.onnx', providers=['CPUExecutionProvider'])
under = img.astype(np.float32).copy()
# LaMa 的遮罩要盖住整条手臂：否则它会照着露在外面的手，把手“续画”进面料里
lama_mask = cv2.dilate(arms.astype(np.uint8), np.ones((15, 15), np.uint8)).astype(bool) | fill
ys, xs = np.where(fill)
for y0 in range(max(0, ys.min() - 80), ys.max() + 1, 700):  # 1024 窗口分块
    x0 = int(np.clip(xs.mean() - 512, 0, W - 1024)); y0 = min(y0, H - 1024)
    crop, m = img[y0:y0 + 1024, x0:x0 + 1024], fill[y0:y0 + 1024, x0:x0 + 1024]
    lm = lama_mask[y0:y0 + 1024, x0:x0 + 1024]
    if not m.any():
        continue
    x = cv2.resize(crop, (512, 512), interpolation=cv2.INTER_AREA).astype(np.float32) / 255
    mm = (cv2.resize(lm.astype(np.float32), (512, 512)) > 0.2).astype(np.float32)
    out = sess.run(None, {'image': x.transpose(2, 0, 1)[None], 'mask': mm[None, None]})[0][0].transpose(1, 2, 0)
    out = cv2.resize(np.clip(out * (255 if out.max() <= 1.5 else 1), 0, 255), (1024, 1024), interpolation=cv2.INTER_CUBIC)
    reg = under[y0:y0 + 1024, x0:x0 + 1024]
    reg[m] = out[m]
body_alpha = np.maximum(alpha, fill.astype(np.float32))

# ---------- 换算到输出画布并导出部件 ----------
SIGMA = 0.64 * 0.8           # 照片 -> 输出：画布按 1280 高缩放 0.64，人再缩 0.8 以免抬手出画
P_ANCHOR = np.array([676, 1925], np.float32)  # 照片中两脚之间的鞋底
O_ANCHOR = np.array([360, 1088], np.float32)  # 输出画布中的落脚点


def to_out(p):
    return (np.array(p, np.float32) - P_ANCHOR) * SIGMA + O_ANCHOR


rig = {'sigma': SIGMA, 'anchor_out': O_ANCHOR.tolist(), 'joints': {k: to_out(v).tolist() for k, v in J.items()},
       'pieces': {}}
order_src = {  # 部件用哪张底图：身体部件用补好面料的底图，四肢用原图
    'HEAD': (img, alpha), 'CHEST': (under, body_alpha), 'PELVIS': (under, body_alpha),
}
for name, mask in M.items():
    src, a = order_src.get(name, (under if 'THIGH' in name else img, body_alpha if 'THIGH' in name else alpha))
    m = cv2.GaussianBlur(mask.astype(np.float32), (0, 0), 1.2)  # 切口轻微羽化
    a2 = a * m
    ys, xs = np.where(a2 > 0.01)
    x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
    rgba = np.dstack([src[y0:y1, x0:x1], a2[y0:y1, x0:x1] * 255])
    w, h = int(round((x1 - x0) * SIGMA)), int(round((y1 - y0) * SIGMA))
    small = cv2.resize(rgba.astype(np.float32), (w, h), interpolation=cv2.INTER_AREA)
    Image.fromarray(np.clip(small, 0, 255).astype(np.uint8), 'RGBA').save(f'build/pieces/{name}.png')
    rig['pieces'][name] = {'origin': to_out((x0, y0)).tolist(), 'size': [w, h]}
json.dump(rig, open('build/rig.json', 'w'), indent=1)
print('pieces', list(M), 'fill px', int(fill.sum()))
