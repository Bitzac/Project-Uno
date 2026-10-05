# -*- coding: utf-8 -*-
"""从动捕求节拍并生成时间扭曲 -> build/sync.json

桑巴的律动在髋部：每拍身体下沉一次。脚步多落在切分位置（“1-a-2”），不适合作拍点。
1. 取髋部高度的明显谷底（前后 0.25 s 内下沉 ≥ 4.5 cm）作为锚点；
2. 片段循环长度 D 必须是整数拍：对候选拍数 N，按相邻锚点间隔 / (D/N) 取整累加，
   只有恰好闭合为 N 的才可行，取播放速度偏差最小者；
3. 以“每拍对应的动画时间 g_k”为未知数做平滑最小二乘：既贴近锚点，又让播放速度平滑变化。
   于是音乐保持恒定 BPM，舞者的每次下沉都落在拍上。"""
import json
import numpy as np

m = json.load(open('build/motion.json'))
F = np.array(m['frames'])
fps, D = m['fps'], m['duration']
ix = {b: i for i, b in enumerate(m['bones'])}
t = np.arange(len(F)) / fps


def smooth(x, n):
    k = np.hanning(n + 2)[1:-1]
    return np.convolve(np.r_[x[-n:], x, x[:n]], k / k.sum(), 'same')[n:-n]


hy = smooth(F[:, ix['Hips'], 1], 9)
anchors = []
for k in range(1, len(t) - 1):
    if hy[k] < hy[k - 1] and hy[k] <= hy[k + 1]:
        depth = hy[max(0, k - 30):k + 30].max() - hy[k]
        if depth > 0.045:
            anchors.append(t[k])
a = np.array(anchors)
gaps = np.diff(np.r_[a, a[0] + D])
print(f'髋部下沉锚点 {len(a)} 个，间隔 {gaps.min():.2f}–{gaps.max():.2f}s')

best = None
for N in range(24, 44):
    P = D / N
    inc = np.maximum(1, np.round(gaps / P))
    if inc.sum() != N:
        continue
    dev = np.sqrt(np.mean((gaps / (inc * P) - 1) ** 2))
    print(f'  N={N}  BPM={60 / P:.2f}  局部速度偏差 RMS {dev:.3f}')
    if best is None or dev < best[2]:
        best = (N, inc, dev)
N, inc, _ = best
P = D / N
k_of = np.r_[0, np.cumsum(inc)[:-1]].astype(int)  # 每个锚点所在的拍序号

# 平滑最小二乘：未知 g_0..g_{N-1}（g_{k+N} = g_k + D）
LAM = 6.0
A, y = [], []
for ki, ti in zip(k_of, a):
    row = np.zeros(N); row[ki] = LAM; A.append(row); y.append(LAM * ti)
for k in range(N):  # 二阶差分 = 播放速度变化
    row = np.zeros(N); c = 0.0
    for d, w in ((-1, 1), (0, -2), (1, 1)):
        j = k + d
        row[j % N] += w
        c += w * D * (j // N)  # 跨越循环点时补上 D
    A.append(row); y.append(-c)
A[0][0] += 1e-6  # 防止奇异（平移自由度已由锚点固定）
g = np.linalg.lstsq(np.array(A), np.array(y), rcond=None)[0]
res = g[k_of] - a
speed = np.diff(np.r_[g, g[0] + D]) / P
print(f'选定 N={N} 拍/循环（{N // 2} 小节 2/4 拍），BPM={60 / P:.2f}')
print(f'锚点残差 中位 {np.median(np.abs(res)) * 1000:.0f} ms，最大 {np.abs(res).max() * 1000:.0f} ms；'
      f'播放速度 {speed.min():.3f}–{speed.max():.3f}')

json.dump({'beat': round(P, 6), 'bpm': round(60 / P, 4), 'beats_per_loop': N, 'loop': D,
           'warp': [round(float(x), 5) for x in g]}, open('build/sync.json', 'w'), indent=1)
