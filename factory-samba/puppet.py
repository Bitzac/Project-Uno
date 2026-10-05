# -*- coding: utf-8 -*-
"""照片木偶渲染：python3 puppet.py [preview t1,t2,...]
python3 puppet.py <k> <n> 渲染第 k 段（共 n 段）并直接管道给 ffmpeg -> build/seg_<k>.mp4；
preview 模式输出 build/preview_<t>.png。

驱动方式：桑巴动捕（build/pose3d.json，已含节拍时间扭曲）
1. 去掉整体朝向（绕髋部竖轴转回正面），只保留四肢相对身体的动作 —— 照片只有正面；
2. 每段肢体取动捕在画面平面上的方向角，长度按透视缩短比例压缩（手臂伸向镜头时变短）；
3. 部件长度用照片里这个人自己的比例，正向运动学从胯部逐级推到手脚；
4. 双脚按动捕的离地高度贴地（踩地时不悬空），前后走位换算成远近缩放；
5. 手臂在身体后方时画在身体后面，两腿按远近排序。"""
import json, subprocess, sys
import numpy as np, cv2
from PIL import Image

OUT_W, OUT_H, FPS = 720, 1280, 60
rig = json.load(open('build/rig.json'))
Jr = {k: np.array(v, np.float64) for k, v in rig['joints'].items()}
pose = json.load(open('build/pose3d.json'))
B = {n: i for i, n in enumerate(pose['bones'])}
P = np.array(pose['frames'], np.float64)  # (帧, 骨骼, xyz)
NF = len(P)

# ---------- 背景底片 ----------
plate = np.array(Image.open('build/plate.png').convert('RGB')).astype(np.float32) / 255
pw = int(round(plate.shape[1] * OUT_H / plate.shape[0]))
plate = cv2.resize(plate, (pw, OUT_H), interpolation=cv2.INTER_AREA)
x0 = (pw - OUT_W) // 2
BG = plate[:, x0:x0 + OUT_W].copy()
HORIZON = 800 * OUT_H / 2000  # 照片中相机视平线约在 y≈800

# ---------- 部件（预乘 alpha） ----------
PIECES = {}
for name, info in rig['pieces'].items():
    p = np.array(Image.open(f'build/pieces/{name}.png')).astype(np.float32) / 255
    p[..., :3] *= p[..., 3:]
    PIECES[name] = (p, np.array(info['origin'], np.float64))

# ---------- 动捕预处理：去朝向 ----------
def smooth(x, sigma):
    k = np.exp(-0.5 * (np.arange(-3 * sigma, 3 * sigma + 1) / sigma) ** 2)
    k /= k.sum()
    pad = len(k) // 2
    xp = np.concatenate([x[:1].repeat(pad, 0), x, x[-1:].repeat(pad, 0)])
    return np.apply_along_axis(lambda c: np.convolve(c, k, 'valid'), 0, xp)


hips = P[:, B['Hips']]
rv = P[:, B['LeftUpLeg']] - P[:, B['RightUpLeg']]
yaw = smooth(np.unwrap(np.arctan2(rv[:, 2], rv[:, 0])), 3)
ca, sa = np.cos(yaw)[:, None], np.sin(yaw)[:, None]
rel = P - hips[:, None]
L = np.empty_like(rel)  # 去朝向后的相对坐标：x 向右、y 向上、z 朝镜头
L[..., 0] = rel[..., 0] * ca + rel[..., 2] * sa
L[..., 1] = rel[..., 1]
L[..., 2] = -rel[..., 0] * sa + rel[..., 2] * ca


def seg(a, b):
    """动捕线段在画面平面上的方向角（图像坐标，y 向下）与透视缩短比例"""
    d = L[:, B[b]] - L[:, B[a]]
    ang = smooth(np.unwrap(np.arctan2(-d[:, 1], d[:, 0])), 1.5)
    s = np.clip(np.hypot(d[:, 0], d[:, 1]) / np.linalg.norm(d, axis=1), 0.35, 1.0)
    return ang, smooth(s, 2)


A = {}
for side, m in (('R', 'Right'), ('L', 'Left')):
    A[side + '_UPPER'] = seg(m + 'Arm', m + 'ForeArm')
    A[side + '_FORE'] = seg(m + 'ForeArm', m + 'HandMiddle2')
    A[side + '_THIGH'] = seg(m + 'UpLeg', m + 'Leg')
    A[side + '_SHIN'] = seg(m + 'Leg', m + 'Foot')
A['CHEST'] = seg('Spine', 'Neck')
A['HEAD'] = seg('Neck', 'HeadTop_End')
A['PELVIS'] = seg('RightUpLeg', 'LeftUpLeg')
sh = L[:, B['LeftArm']] - L[:, B['RightArm']]
TWIST = smooth(np.clip(np.abs(sh[:, 0]) / np.linalg.norm(sh, axis=1), 0.7, 1.0), 2)

# 尺度：照片腿长（像素）/ 动捕腿长（米）
leg_m = np.median(np.linalg.norm(P[:, B['LeftUpLeg']] - P[:, B['LeftLeg']], axis=1)
                  + np.linalg.norm(P[:, B['LeftLeg']] - P[:, B['LeftFoot']], axis=1))
leg_px = np.linalg.norm(Jr['L_HIP'] - Jr['L_KNEE']) + np.linalg.norm(Jr['L_KNEE'] - Jr['L_ANK'])
K = leg_px / leg_m
# 双脚最低点离地高度（米）：脚尖或脚踝下方的鞋底
sole = np.minimum(np.minimum(P[:, B['LeftToeBase'], 1], P[:, B['LeftFoot'], 1] - 0.105),
                  np.minimum(P[:, B['RightToeBase'], 1], P[:, B['RightFoot'], 1] - 0.105))
LIFT = smooth(np.clip(sole - np.percentile(sole, 5), 0, None), 1.5)
HX = smooth(hips[:, 0] - hips[:, 0].mean(), 2)
HZ = smooth(hips[:, 2] - hips[:, 2].mean(), 2)
TRAVEL = 0.55   # 左右走位幅度（竖屏画幅窄）
CAM_DIST = 6.0  # 前后走位 -> 远近缩放


def rot(a):
    c, s = np.cos(a), np.sin(a)
    return np.array([[c, -s], [s, c]])


def ang(v):
    return np.arctan2(v[1], v[0])


def limb_affine(a0, b0, a, theta, s, w=1.0):
    """把静止姿态的线段 a0→b0 映射到当前：以 a 为起点、方向 theta、沿轴缩放 s、垂直缩放 w"""
    phi0 = ang(b0 - a0)
    M = rot(theta) @ np.diag([s, w]) @ rot(-phi0)
    return M, a - M @ a0


def pose_at(f):
    """返回 {部件: (2x2, 平移)}（静止坐标 -> 画布坐标）以及绘制顺序、脚底位置"""
    T = {}
    root0 = Jr['ROOT']
    th_p = A['PELVIS'][0][f]
    Mp = rot(th_p)
    T['PELVIS'] = (Mp, root0 - Mp @ root0)
    waist = root0 + Mp @ (Jr['WAIST'] - root0)
    th_c, s_c = A['CHEST'][0][f], np.clip(A['CHEST'][1][f], 0.8, 1)
    T['CHEST'] = limb_affine(Jr['WAIST'], Jr['NECK'], waist, th_c, s_c, TWIST[f])
    Mc, tc = T['CHEST']
    neck = Mc @ Jr['NECK'] + tc
    th_h = th_c + np.clip(A['HEAD'][0][f] - th_c, -0.17, 0.17)  # 头相对上身最多偏 ±10°，脖子不露缝
    T['HEAD'] = limb_affine(Jr['NECK'], Jr['HEAD_TOP'], neck, th_h, 1.0)
    feet = []
    for s in ('R', 'L'):
        shoulder = Mc @ Jr[s + '_SH'] + tc
        th, k = A[s + '_UPPER'][0][f], A[s + '_UPPER'][1][f]
        T[s + '_UPPER'] = limb_affine(Jr[s + '_SH'], Jr[s + '_EL'], shoulder, th, k)
        elbow = shoulder + np.array([np.cos(th), np.sin(th)]) * np.linalg.norm(Jr[s + '_EL'] - Jr[s + '_SH']) * k
        th, k = A[s + '_FORE'][0][f], A[s + '_FORE'][1][f]
        T[s + '_FORE'] = limb_affine(Jr[s + '_EL'], Jr[s + '_WR'], elbow, th, k)
        hip = root0 + Mp @ (Jr[s + '_HIP'] - root0)
        th, k = A[s + '_THIGH'][0][f], A[s + '_THIGH'][1][f]
        T[s + '_THIGH'] = limb_affine(Jr[s + '_HIP'], Jr[s + '_KNEE'], hip, th, k)
        knee = hip + np.array([np.cos(th), np.sin(th)]) * np.linalg.norm(Jr[s + '_KNEE'] - Jr[s + '_HIP']) * k
        th, k = A[s + '_SHIN'][0][f], A[s + '_SHIN'][1][f]
        T[s + '_SHIN'] = limb_affine(Jr[s + '_KNEE'], Jr[s + '_ANK'], knee, th, k)
        ankle = knee + np.array([np.cos(th), np.sin(th)]) * np.linalg.norm(Jr[s + '_ANK'] - Jr[s + '_KNEE']) * k
        # 鞋：跟随小腿的倾斜但幅度减半、限制 ±12°，鞋底保持基本水平
        tilt = np.clip(0.4 * (th - ang(Jr[s + '_ANK'] - Jr[s + '_KNEE'])), -0.21, 0.21)
        Ms = rot(tilt)
        T[s + '_SHOE'] = (Ms, ankle - Ms @ Jr[s + '_ANK'])
        sole0 = np.array([Jr[s + '_ANK'][0], rig['anchor_out'][1]])
        feet.append(Ms @ sole0 + ankle - Ms @ Jr[s + '_ANK'])
    # 全局：远近缩放 + 贴地
    fscale = 1 / (1 - HZ[f] / CAM_DIST)
    floor = rig['anchor_out'][1] + (rig['anchor_out'][1] - HORIZON) * (fscale - 1)
    lowest = max(p[1] for p in feet)
    cy = floor - K * fscale * LIFT[f] - fscale * (lowest - root0[1])
    cx = root0[0] + K * TRAVEL * HX[f]
    G = (fscale * np.eye(2), np.array([cx, cy]) - fscale * root0)
    for n in T:
        M, t = T[n]
        T[n] = (G[0] @ M, G[0] @ t + G[1])
    feet = [G[0] @ p + G[1] for p in feet]
    # 绘制顺序
    z = lambda b: L[f, B[b], 2]
    legs = sorted(('R', 'L'), key=lambda s: z(('Right' if s == 'R' else 'Left') + 'Leg'))
    order = [p for s in legs for p in (s + '_SHOE', s + '_SHIN', s + '_THIGH')]
    behind, front = [], []
    for s, m in (('R', 'Right'), ('L', 'Left')):
        arm_z = 0.5 * (z(m + 'ForeArm') + z(m + 'Hand'))
        (behind if arm_z < z('Spine2') - 0.06 else front).append((arm_z, s))
    for _, s in sorted(behind):
        order += [s + '_UPPER', s + '_FORE']
    order += ['PELVIS', 'HEAD', 'CHEST']
    for _, s in sorted(front):
        order += [s + '_UPPER', s + '_FORE']
    return T, order, feet, fscale, floor


def render(f):
    T, order, feet, fscale, floor = pose_at(f)
    layer = np.zeros((OUT_H, OUT_W, 4), np.float32)
    for n in order:
        img, origin = PIECES[n]
        M, t = T[n]
        A2 = np.hstack([M, (M @ origin + t)[:, None]])
        w = cv2.warpAffine(img, A2, (OUT_W, OUT_H), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=0)
        layer = w + layer * (1 - w[..., 3:])
    # 地面：接触阴影（脚离地越高越淡）+ 抛光水泥地的倒影
    shadow = np.zeros((OUT_H, OUT_W), np.float32)
    for p in feet:
        h = max(0.0, floor - p[1])
        a = 0.5 * np.clip(1 - h / 60, 0, 1)
        cv2.ellipse(shadow, (int(p[0]), int(floor)), (int(48 * fscale), int(9 * fscale)), 0, 0, 360, a, -1)
    cx = int(np.mean([p[0] for p in feet]))
    cv2.ellipse(shadow, (cx, int(floor)), (int(120 * fscale), int(20 * fscale)), 0, 0, 360, 0.18, -1)
    shadow = cv2.GaussianBlur(shadow, (0, 0), 7)
    out = BG * (1 - shadow[..., None])
    fy = int(floor)
    refl = np.zeros_like(layer)
    n = min(fy, OUT_H - fy)
    refl[fy:fy + n] = layer[fy - n:fy][::-1]
    refl = cv2.GaussianBlur(refl, (0, 0), 2.5)
    fade = np.zeros((OUT_H, 1), np.float32)
    fade[fy:, 0] = 0.16 * np.exp(-np.arange(OUT_H - fy) / 110)
    out = refl[..., :3] * fade[..., None] + out * (1 - refl[..., 3:] * fade[..., None])
    out = layer[..., :3] + out * (1 - layer[..., 3:])
    return (np.clip(out, 0, 1) * 255 + 0.5).astype(np.uint8)


if __name__ == '__main__':
    if len(sys.argv) > 2 and sys.argv[1] == 'preview':
        for t in sys.argv[2].split(','):
            Image.fromarray(render(min(NF - 1, int(round(float(t) * FPS))))).save(f'build/preview_{t}.png')
        sys.exit()
    k, nw = (int(sys.argv[1]), int(sys.argv[2])) if len(sys.argv) > 2 else (0, 1)  # 并行：第 k 段 / 共 nw 段
    f0, f1 = NF * k // nw, NF * (k + 1) // nw
    ff = subprocess.Popen(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24',
                           '-s', f'{OUT_W}x{OUT_H}', '-r', str(FPS), '-i', '-', '-c:v', 'libx264', '-preset', 'veryfast',
                           '-crf', '10', '-pix_fmt', 'yuv444p', f'build/seg_{k}.mp4'], stdin=subprocess.PIPE)
    for f in range(f0, f1):
        ff.stdin.write(render(f).tobytes())
    ff.stdin.close(); ff.wait()
    print('done', k, f1 - f0, flush=True)
