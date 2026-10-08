# -*- coding: utf-8 -*-
"""配乐合成 + 旁白混音 -> build/mix.wav
史诗风格：D 小调弦乐铺底、低音持续音、章节战鼓、章节前的上升音浪；旁白期间自动压低配乐。"""
import json
import numpy as np, soundfile as sf
from scipy.signal import butter, sosfilt, fftconvolve, resample_poly

SR = 48000
rng = np.random.default_rng(7)
tl = json.load(open('build/timeline.json'))
D = tl['duration']
N = int(D * SR) + SR


def midi(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def lp(x, f, o=2):
    return sosfilt(butter(o, f, 'low', fs=SR, output='sos'), x)


def hp(x, f, o=2):
    return sosfilt(butter(o, f, 'high', fs=SR, output='sos'), x)


def ir(sec=4.2, pre=0.02):
    n = int(sec * SR)
    t = np.arange(n) / SR
    tail = rng.standard_normal((2, n)) * np.exp(-t / (sec / 6.5))
    tail = np.stack([lp(c, 5200) for c in tail])
    tail[:, :int(pre * SR)] = 0
    return tail / np.sqrt((tail ** 2).sum(axis=1, keepdims=True))


IR = ir()

# ---------- 弦乐铺底 ----------
_note_cache = {}


def string_note(m, dur):
    key = (m, round(dur, 2))
    if key in _note_cache:
        return _note_cache[key]
    n = int(dur * SR)
    t = np.arange(n) / SR
    f0 = midi(m)
    y = np.zeros(n)
    for det in (-0.07, 0.0, 0.065):  # 三声部微失谐 → 合奏感
        f = f0 * 2 ** (det / 12)
        vib = 0.0025 * np.sin(2 * np.pi * (4.6 + det * 8) * t + rng.uniform(0, 6))
        ph = 2 * np.pi * f * (t + np.cumsum(vib) / SR * 0)
        ph = 2 * np.pi * np.cumsum(f * (1 + vib)) / SR
        for h in range(1, 9):
            if f * h > 5000:
                break
            y += np.sin(h * ph + rng.uniform(0, 6)) / h ** 1.15
    y = lp(y, min(2600, f0 * 7))
    y /= np.abs(y).max() + 1e-9
    _note_cache[key] = y
    return y


# D 小调：i – VI – III – VII – i – iv – VI – V
PROG = [
    [38, 50, 57, 62, 65, 69],  # Dm
    [34, 46, 53, 58, 62, 65],  # Bb
    [41, 53, 57, 60, 65, 69],  # F
    [36, 48, 55, 60, 64, 67],  # C
    [38, 50, 57, 62, 65, 69],  # Dm
    [43, 55, 58, 62, 67, 70],  # Gm
    [34, 46, 53, 58, 62, 65],  # Bb
    [33, 45, 52, 57, 61, 64],  # A
]
CH = 11.0     # 每个和弦时长
XF = 4.0      # 交叉淡化
pad = np.zeros(N)
k = 0
start = 0.0
while start < D + CH:
    chord = PROG[k % len(PROG)]
    seglen = CH + XF
    n = int(seglen * SR)
    t = np.arange(n) / SR
    env = np.minimum(1, t / XF) * np.minimum(1, (seglen - t) / XF)
    env = np.sin(env * np.pi / 2) ** 2
    seg = np.zeros(n)
    for j, m in enumerate(chord):
        g = 0.55 if j == 0 else (0.75 if j == 1 else 0.5)
        seg += g * string_note(m, seglen)
    i0 = int(start * SR)
    if i0 >= N:
        break
    i1 = min(N, i0 + n)
    pad[i0:i1] += (seg * env)[: i1 - i0]
    start += CH
    k += 1
# 缓慢呼吸的音量起伏
tt = np.arange(N) / SR
pad *= 0.75 + 0.25 * np.sin(2 * np.pi * tt / 23.0) ** 2
pad /= np.abs(pad).max()

# 低音持续音（D1 + D2）
drone = 0.6 * np.sin(2 * np.pi * midi(26) * tt) + 0.35 * np.sin(2 * np.pi * midi(38) * tt + 1.0)
drone *= 0.8 + 0.2 * np.sin(2 * np.pi * tt / 17.0)

# ---------- 战鼓与音浪 ----------
hits = np.zeros(N)
swell = np.zeros(N)


def taiko(at, gain=1.0):
    n = int(2.4 * SR)
    t = np.arange(n) / SR
    f = 48 + 70 * np.exp(-t / 0.05)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.55)
    skin = lp(rng.standard_normal(n), 900) * np.exp(-t / 0.035) * 0.8
    y = (body + skin) * gain
    i0 = int(at * SR)
    i1 = min(N, i0 + n)
    if i0 < N:
        hits[i0:i1] += y[: i1 - i0]


def riser(end, sec=3.2, gain=1.0):
    n = int(sec * SR)
    t = np.arange(n) / SR
    nz = rng.standard_normal(n)
    # 逐渐打开的带通噪声
    a = hp(lp(nz, 1800), 300) * (t / sec) ** 2.2
    tone = np.sin(2 * np.pi * np.cumsum(midi(62) * (1 + 0.5 * (t / sec) ** 2)) / SR) * (t / sec) ** 3 * 0.25
    y = (a * 0.6 + tone) * gain
    i1 = int(end * SR)
    i0 = max(0, i1 - n)
    swell[i0:i1] += y[n - (i1 - i0):]


for s in tl['scenes']:
    if s['type'] == 'chapter':
        h = s['start'] + 0.15
        riser(h, 3.0, 0.9)
        taiko(h, 1.0); taiko(h + 0.42, 0.55); taiko(h + 1.1, 0.8)
    if s['type'] == 'title':
        taiko(1.0, 0.8); taiko(3.0, 1.0); taiko(3.42, 0.5)
    if s['type'] == 'epilogue':
        riser(s['start'] + 0.2, 4.0, 0.8); taiko(s['start'] + 0.2, 0.9)
    if s['type'] == 'excluded':
        taiko(s['lines'][1]['t0'] + 3.0, 0.45)
    if s['type'] == 'credits':
        taiko(s['start'] + 0.1, 0.7)
hits /= np.abs(hits).max()
swell /= np.abs(swell).max()

music = 0.55 * pad + 0.32 * drone + 0.55 * hits + 0.30 * swell
wet = np.stack([fftconvolve(music, IR[c])[:N] for c in range(2)])
music = np.stack([music, music]) * 0.55 + wet * 0.9
music = hp(music, 28)

# ---------- 旁白 ----------
voice = np.zeros(N)
speech_mask = np.zeros(N)
for s in tl['scenes']:
    for l in s['lines']:
        y, sr = sf.read(f"build/vo/{l['key']}.wav")
        y = resample_poly(y, 2, 1)
        y = hp(y, 75)
        i0 = int(l['t0'] * SR)
        i1 = min(N, i0 + len(y))
        voice[i0:i1] += y[: i1 - i0]
        speech_mask[i0:i1] = 1
# 简单压缩：按 50ms RMS 平滑增益
win = int(0.05 * SR)
rms = np.sqrt(np.convolve(voice ** 2, np.ones(win) / win, 'same') + 1e-9)
target = 0.12
gain = np.clip(target / rms, 0.6, 2.2)
gain[rms < 0.004] = 1.0
gain = np.convolve(gain, np.ones(win) / win, 'same')
voice *= gain
voice /= np.abs(voice).max()
vwet = np.stack([fftconvolve(voice, IR[c][: int(1.6 * SR)])[:N] for c in range(2)])
voice2 = np.stack([voice, voice]) + vwet * 0.06

# ---------- 闪避（ducking）----------
att = int(0.35 * SR)
duck = np.convolve(speech_mask, np.ones(att) / att, 'same')
duck = np.convolve(duck, np.ones(int(0.8 * SR)) / int(0.8 * SR), 'same')
mlevel = 10 ** ((-9.5 * np.clip(duck, 0, 1)) / 20)
music *= mlevel
music /= np.abs(music).max()

mix = voice2 * 0.95 + music * 0.42
# 片头片尾淡入淡出
fade = np.ones(N)
fi = int(1.5 * SR); fade[:fi] = np.linspace(0, 1, fi)
fo = int(4.0 * SR); end = int(D * SR); fade[end - fo:end] = np.linspace(1, 0, fo); fade[end:] = 0
mix *= fade
mix = mix[:, : int(D * SR)]
mix /= np.abs(mix).max() / 0.89
sf.write('build/mix.wav', mix.T.astype(np.float32), SR, subtype='FLOAT')
print('mix written', mix.shape[1] / SR, 's')
