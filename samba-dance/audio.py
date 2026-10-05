# -*- coding: utf-8 -*-
"""原创桑巴配乐（程序合成，无采样）-> build/music.wav
拍点取自 build/sync.json，与舞者髋部下沉逐拍对齐。2/4 拍，第 k 拍在 t = k·beat。
乐器：苏尔多大鼓（第一/第二声部）、卡沙小军鼓、塔姆博林、阿哥哥双铃、甘扎沙锤、
卡瓦基尼奥（Karplus-Strong 拨弦）、贝斯、阿皮托哨子。"""
import json
import numpy as np, soundfile as sf, pyloudnorm as pyln
from scipy.signal import butter, sosfilt, fftconvolve

SR = 48000
DUR = 30.0
sync = json.load(open('build/sync.json'))
BEAT = sync['beat']
S16 = [0.0, 0.26, 0.5, 0.755]  # 桑巴十六分音符的微小摇摆（第 2、4 个略晚 / 略早）
rng = np.random.default_rng(105)
N = int(DUR * SR)
# 分轨：干声 + 混响发送，最后按目标响度配比
STEMS = {}
NBARS = int(DUR / BEAT) // 2 + 1
END_BEAT = int(DUR / BEAT - 0.45)  # 收尾重音落在最后一个能留出余响的拍上
END_BAR = END_BEAT // 2


def bp(x, lo, hi, o=2):
    return sosfilt(butter(o, [lo, hi], 'band', fs=SR, output='sos'), x)


def lp(x, f, o=2):
    return sosfilt(butter(o, f, 'low', fs=SR, output='sos'), x)


def hp(x, f, o=2):
    return sosfilt(butter(o, f, 'high', fs=SR, output='sos'), x)


def midi(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def place(sig, t, gain, pan, send, stem):
    """把单声道音头放到分轨 stem 的时间 t（秒），等功率声像，附带混响发送。"""
    if stem not in STEMS:
        STEMS[stem] = (np.zeros((2, N + SR * 2)), np.zeros((2, N + SR * 2)))
    dry, wet = STEMS[stem]
    i = int(round((t + rng.normal(0, 0.003)) * SR))  # ±3 ms 人手误差
    if i < 0 or i >= N:
        return
    n = min(len(sig), dry.shape[1] - i)
    l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    for ch, g in ((0, l), (1, r)):
        dry[ch, i:i + n] += sig[:n] * gain * g
        wet[ch, i:i + n] += sig[:n] * gain * g * send


def tt(sec):
    return np.arange(int(sec * SR)) / SR


# ---------- 打击乐音色 ----------
def surdo(f0, open_=True):
    t = tt(1.4 if open_ else 0.35)
    f = f0 * (1 + 0.55 * np.exp(-t / 0.018))
    ph = 2 * np.pi * np.cumsum(f) / SR
    env = np.exp(-t / (0.42 if open_ else 0.06))
    y = np.sin(ph) * env + 0.25 * np.sin(1.59 * ph) * env ** 2.2
    y += lp(rng.standard_normal(len(t)), 900) * np.exp(-t / 0.008) * 0.35  # 鼓槌
    return y * (1 - np.exp(-t / 0.002))


def caixa():
    t = tt(0.22)
    y = hp(bp(rng.standard_normal(len(t)), 1800, 9000), 1200) * np.exp(-t / 0.045)
    y += np.sin(2 * np.pi * 205 * t) * np.exp(-t / 0.025) * 0.5
    return y * 0.55


def tamborim():
    t = tt(0.12)
    y = np.sin(2 * np.pi * 760 * t) * np.exp(-t / 0.035) + 0.4 * np.sin(2 * np.pi * 1180 * t) * np.exp(-t / 0.02)
    y += bp(rng.standard_normal(len(t)), 2000, 8000) * np.exp(-t / 0.006) * 0.6
    return y * 0.5


def agogo(f0):
    t = tt(0.6)
    y = np.zeros(len(t))
    for ratio, amp, dec in ((1, 1, 0.32), (2.76, 0.5, 0.14), (5.4, 0.28, 0.07), (8.9, 0.12, 0.04)):
        y += amp * np.sin(2 * np.pi * f0 * ratio * t) * np.exp(-t / dec)
    return y * (1 - np.exp(-t / 0.001)) * 0.32


def ganza(acc):
    t = tt(0.09)
    env = (1 - np.exp(-t / (0.012 if acc else 0.006))) * np.exp(-t / 0.03)
    return bp(rng.standard_normal(len(t)), 4500, 12000) * env * (0.5 if acc else 0.28)


def apito(notes):
    """哨子：短-短-长，带滚珠颤音。notes = [(起始秒, 时长)]"""
    out = []
    for t0, d in notes:
        t = tt(d)
        f = 2950 * (1 + 0.012 * np.sin(2 * np.pi * 6 * t))
        trill = 0.65 + 0.35 * np.sin(2 * np.pi * 38 * t)
        env = np.minimum(1, t / 0.012) * np.minimum(1, (d - t) / 0.03)
        y = np.sin(2 * np.pi * np.cumsum(f) / SR) * trill * env
        y += bp(rng.standard_normal(len(t)), 2500, 4000) * env * 0.12
        out.append((t0, y * 0.22))
    return out


# ---------- 旋律乐器音色 ----------
def pluck(m, dur=0.9, bright=0.55):
    """Karplus-Strong 拨弦（卡瓦基尼奥钢弦）"""
    f = midi(m)
    L = int(SR / f)
    n = int(dur * SR)
    buf = lp(rng.uniform(-1, 1, L), 2000 + 7000 * bright, 1)
    y = np.zeros(n)
    y[:L] = buf
    for i in range(L, n):
        y[i] = 0.4985 * (y[i - L] + y[i - L + 1])
    t = tt(dur)
    return y * np.minimum(1, (dur - t) / 0.02)


_pl = {}


def pluck_c(m, dur):
    k = (m, round(dur, 3))
    if k not in _pl:
        _pl[k] = pluck(m, dur)
    return _pl[k]


def bass(m, dur):
    t = tt(dur)
    f = midi(m)
    y = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(4 * np.pi * f * t) + 0.12 * np.sin(6 * np.pi * f * t)
    env = np.minimum(1, t / 0.006) * np.exp(-t / 0.55) * np.minimum(1, (dur - t) / 0.03)
    return np.tanh(1.6 * y * env) * 0.55


# ---------- 编曲 ----------
# 8 小节和声循环：C6 | A7 | Dm7 | G7 | Em7 | A7 | Dm7 | G7
CHORDS = [
    ('C6', 36, [60, 64, 67, 69]), ('A7', 33, [57, 61, 64, 67]), ('Dm7', 38, [62, 65, 69, 72]), ('G7', 31, [59, 62, 65, 67]),
    ('Em7', 40, [64, 67, 71, 74]), ('A7', 33, [61, 64, 67, 70]), ('Dm7', 38, [62, 65, 69, 72]), ('G7', 31, [59, 62, 65, 71]),
]
TELECO = [1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 0]       # 塔姆博林“teleco-teco”，两小节 16 格
AGOGO = ['H', 0, 'L', 0, 'H', 'H', 0, 'L', 0, 'L', 'H', 0, 'L', 0, 'L', 0]
CAVACO = [1, 0, 1, 1, 0, 1, 1, 0]                              # 一小节 8 格的扫弦
CAIXA_ACC = [1, 0, 0, 1, 1, 0, 1, 0]


def t16(bar, i):  # 第 bar 小节第 i 个十六分音符（0..7）
    beat = bar * 2 + i // 4
    return (beat + S16[i % 4]) * BEAT


BREAK_BAR = 17  # “paradinha”：全体停一小节，只留塔姆博林和哨子
SOFT = {0, 1}   # 前奏两小节只有打击乐

for bar in range(NBARS):
    if bar > END_BAR:
        break
    end = bar == END_BAR
    b0 = bar * 2 * BEAT
    if end:  # 收尾：全体重音 + 主和弦余响
        place(surdo(52), b0, 1.2, 0, 0.25, 'surdo')
        place(surdo(66), b0, 0.9, 0.2, 0.25, 'surdo')
        for j, m in enumerate([48, 60, 64, 67, 69, 74]):
            place(pluck_c(m, 2.4), b0 + j * 0.011, 0.28, -0.25, 0.4, 'cavaco')
        place(bass(36, 1.6), b0, 0.9, 0, 0.1, 'bass')
        place(caixa(), b0, 1.2, 0.1, 0.3, 'caixa')
        for t0, y in apito([(b0, 0.5)]):
            place(y, t0, 1.0, 0.35, 0.35, 'apito')
        continue
    brk = bar == BREAK_BAR
    if not brk:
        # 苏尔多：第二声部在第 1 拍（高、短），第一声部在第 2 拍（低、开放，桑巴的重拍）
        place(surdo(68, open_=bar % 2 == 1), b0, 0.75, 0.25, 0.12, 'surdo')
        place(surdo(52), b0 + BEAT, 1.15, -0.15, 0.12, 'surdo')
        if bar % 4 == 3:  # 第三声部的切分填充
            place(surdo(60, False), t16(bar, 3), 0.55, 0.45, 0.1, 'surdo')
            place(surdo(60, False), t16(bar, 7), 0.65, 0.45, 0.1, 'surdo')
        for i in range(8):
            place(caixa(), t16(bar, i), (0.55 if CAIXA_ACC[i] else 0.28) * (1.2 if bar >= 2 else 0.8), 0.15, 0.12, 'caixa')
            place(ganza(i % 4 == 3), t16(bar, i), 1.0, -0.55, 0.08, 'ganza')
    for i in range(8):
        if TELECO[(bar % 2) * 8 + i] and bar >= 1:
            place(tamborim(), t16(bar, i), 0.9 if not brk else 1.1, 0.5, 0.18, 'tamborim')
        a = AGOGO[(bar % 2) * 8 + i]
        if a and bar >= 2 and not brk:
            place(agogo(930 if a == 'L' else 1240), t16(bar, i), 0.8, -0.4, 0.25, 'agogo')
    if bar in SOFT or brk:
        if bar == 0:
            for t0, y in apito([(0.0, 0.11), (BEAT * 0.5, 0.11), (BEAT, 0.45)]):
                place(y, t0, 1.0, 0.35, 0.35, 'apito')
        if brk:
            for t0, y in apito([(b0 + BEAT * 1.5, 0.12), (b0 + BEAT * 1.75, 0.2)]):
                place(y, t0, 1.0, 0.35, 0.35, 'apito')
        continue
    name, root, voicing = CHORDS[(bar - 2) % 8]
    # 贝斯：第 1 拍根音，第 1 拍的“a”弱拍五度引入，第 2 拍五度重音
    fifth = root + 7 if root + 7 <= 45 else root - 5
    place(bass(root, BEAT * 0.9), b0, 0.9, 0, 0.05, 'bass')
    place(bass(fifth, BEAT * 0.22), t16(bar, 3), 0.5, 0, 0.05, 'bass')
    place(bass(fifth, BEAT * 0.8), b0 + BEAT, 1.0, 0, 0.05, 'bass')
    # 卡瓦基尼奥：下扫 / 上扫交替，上扫更轻、逆序
    for i, on in enumerate(CAVACO):
        if not on:
            continue
        down = i % 2 == 0
        order = voicing if down else voicing[::-1]
        g = 0.12 if down else 0.075
        for j, m in enumerate(order):
            place(pluck_c(m + 12, BEAT * 0.55), t16(bar, i) + j * 0.007, g, -0.3, 0.2, 'cavaco')

# ---------- 混响 / 母带 ----------
def room_ir(sec=1.1):
    t = tt(sec)
    ir = rng.standard_normal((2, len(t))) * np.exp(-t / 0.28)
    ir = np.stack([lp(c, 6500) for c in ir])
    ir[:, :int(0.012 * SR)] = 0
    return ir / np.sqrt((ir ** 2).sum(axis=1, keepdims=True))


# 分轨目标响度（LUFS，相对配比；整体响度最后由 ffmpeg loudnorm 统一到 -14 LUFS）
TARGET = {'surdo': -19, 'bass': -21, 'cavaco': -22, 'caixa': -25, 'tamborim': -25,
          'agogo': -28, 'ganza': -29, 'apito': -23}
meter = pyln.Meter(SR)
IR = room_ir()
mix = np.zeros((2, N))
for name, (dry, wet) in STEMS.items():
    rev = np.stack([fftconvolve(wet[c], IR[c])[:dry.shape[1]] for c in range(2)])
    st = (dry + rev * 0.9)[:, :N]
    active = st[:, np.abs(st).max(0) > 1e-4]  # 只在发声段测响度（哨子只响几次）
    lufs = meter.integrated_loudness(active.T) if active.shape[1] > SR * 0.5 else -70
    g = 10 ** ((TARGET[name] - lufs) / 20)
    print(f'  {name:9s} {lufs:6.1f} LUFS -> {TARGET[name]} LUFS（增益 {20 * np.log10(g):+5.1f} dB）')
    mix += st * g
mix = hp(mix, 32)
fade_out = int(0.35 * SR)
mix[:, -fade_out:] *= np.linspace(1, 0, fade_out) ** 2
mix /= np.abs(mix).max() + 1e-9
mix = np.tanh(1.35 * mix) / np.tanh(1.35)  # 轻度软限幅
sf.write('build/music.wav', (mix.T * 0.89).astype(np.float32), SR, subtype='FLOAT')
print(f'music.wav {DUR}s  BPM={60 / BEAT:.2f}  小节={END_BAR + 1}（第 {END_BEAT} 拍收尾，t={END_BEAT * BEAT:.2f}s）')
