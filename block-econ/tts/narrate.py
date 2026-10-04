#!/usr/bin/env python3
"""中文男声配音：Kokoro v1.1-zh（sherpa-onnx，离线 CPU 推理）。

  python3 tts/narrate.py scan              # 45 个男声各合成一段测试句：基频 + 识别回转字错率
  python3 tts/narrate.py synth --sid 64    # 按字幕逐句合成 → out/voice/*.wav、src/voice.js、out/voice/report.md

"一字不差"的校验方式：每句合成后用 Paraformer 中文识别模型转回文字，和字幕逐字比对；
同时导出 TTS 前端给每个词的读音，对多音字逐个列出，和 pypinyin 的上下文读音对照。
"""
import argparse, json, os, re, subprocess, sys, tempfile
import numpy as np
import soundfile as sf
import sherpa_onnx
from pypinyin import pinyin, lazy_pinyin, Style

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
M = os.path.join(ROOT, '.cache/tts/kokoro-multi-lang-v1_1/')
A = os.path.join(ROOT, '.cache/tts/sherpa-onnx-paraformer-zh-2024-03-09/')
FIX = os.path.join(ROOT, 'tts/lexicon-fix.txt')
OUT = os.path.join(ROOT, 'out/voice')
VOICES = json.load(open(os.path.join(ROOT, '.cache/tts/voices.json')))
DIGITS = dict(zip('0123456789', '零一二三四五六七八九'))
SR_OUT = 44100


def cue_texts():
    js = "import('./src/timeline.js').then(m => console.log(JSON.stringify(m.CUES.map(c => c.text))))"
    return json.loads(subprocess.check_output(['node', '--input-type=module', '-e', js], cwd=ROOT))


def spoken(text):
    """字幕 → 朗读文本：去掉颜色标记和空格、阿拉伯数字读作汉字、破折号读作停顿。字不增不减。"""
    t = re.sub(r'</?[a-z]>', '', text).replace(' ', '')
    t = ''.join(DIGITS.get(ch, ch) for ch in t)
    return t.replace('——', '，')


def han(text):
    return ''.join(ch for ch in text if '一' <= ch <= '鿿')


def cer(ref, hyp):
    r, h = han(ref), han(''.join(DIGITS.get(c, c) for c in hyp))
    d = list(range(len(h) + 1))
    for i in range(1, len(r) + 1):
        prev, d[0] = d[0], i
        for j in range(1, len(h) + 1):
            prev, d[j] = d[j], min(d[j] + 1, d[j - 1] + 1, prev + (r[i - 1] != h[j - 1]))
    return d[len(h)] / max(1, len(r)), r, h


def syllables(text, tones=True):
    style = Style.TONE3 if tones else Style.NORMAL
    t = han(''.join(DIGITS.get(c, c) for c in text))
    return lazy_pinyin(t, style=style, neutral_tone_with_five=True, tone_sandhi=tones)


def per(ref, hyp, tones=True):
    """拼音级错误率：同音字算对；tones=True 时声调也要对（已按三声变调、"一""不"变调规则换算）。"""
    r, h = syllables(ref, tones), syllables(hyp, tones)
    d = list(range(len(h) + 1))
    for i in range(1, len(r) + 1):
        prev, d[0] = d[0], i
        for j in range(1, len(h) + 1):
            prev, d[j] = d[j], min(d[j] + 1, d[j - 1] + 1, prev + (r[i - 1] != h[j - 1]))
    return d[len(h)] / max(1, len(r))


def make_tts(debug=False):
    lex = ','.join([FIX, M + 'lexicon-zh.txt', M + 'lexicon-us-en.txt'])
    cfg = sherpa_onnx.OfflineTtsConfig(
        model=sherpa_onnx.OfflineTtsModelConfig(
            kokoro=sherpa_onnx.OfflineTtsKokoroModelConfig(
                model=M + 'model.onnx', voices=M + 'voices.bin', tokens=M + 'tokens.txt',
                data_dir=M + 'espeak-ng-data', dict_dir=M + 'dict', lexicon=lex),
            num_threads=4, debug=debug, provider='cpu'),
        rule_fsts=','.join(M + f for f in ['date-zh.fst', 'phone-zh.fst', 'number-zh.fst']),
        max_num_sentences=1)
    return sherpa_onnx.OfflineTts(cfg)


def make_asr():
    return sherpa_onnx.OfflineRecognizer.from_paraformer(
        paraformer=A + 'model.int8.onnx', tokens=A + 'tokens.txt', num_threads=4, sample_rate=16000, feature_dim=80)


def recognize(asr, samples, sr):
    st = asr.create_stream()
    st.accept_waveform(sr, samples)
    asr.decode_stream(st)
    return st.result.text


def f0_median(x, sr):
    """自相关法估计浊音段基频中位数（Hz）。"""
    hop, win = int(sr * 0.01), int(sr * 0.04)
    lo, hi = int(sr / 400), int(sr / 60)
    rms = np.sqrt(np.mean(x ** 2) + 1e-12)
    out = []
    for s in range(0, len(x) - win, hop):
        f = x[s:s + win] - np.mean(x[s:s + win])
        if np.sqrt(np.mean(f ** 2)) < 0.5 * rms:
            continue
        ac = np.correlate(f, f, 'full')[win - 1:]
        if ac[0] <= 0:
            continue
        lag = lo + int(np.argmax(ac[lo:hi]))
        if ac[lag] / ac[0] > 0.45:
            out.append(sr / lag)
    return float(np.median(out)) if out else 0.0


def generate(tts, text, sid, speed, capture=False):
    """合成一句；capture=True 时截获 C++ 调试日志里的逐词读音。"""
    if not capture:
        a = tts.generate(text, sid=sid, speed=speed)
        return np.array(a.samples, dtype=np.float32), a.sample_rate, []
    with tempfile.TemporaryFile(mode='w+b') as tmp:
        sys.stderr.flush()
        saved = os.dup(2)
        os.dup2(tmp.fileno(), 2)
        try:
            a = tts.generate(text, sid=sid, speed=speed)
        finally:
            sys.stderr.flush()
            os.dup2(saved, 2)
            os.close(saved)
        tmp.seek(0)
        log = tmp.read().decode('utf-8', 'replace')
    words = re.findall(r'ConvertWordToIds:\d+ (\S+): ([^\n]+)', log)
    return np.array(a.samples, dtype=np.float32), a.sample_rate, [(w, p.strip()) for w, p in words]


def trim(x, sr, thr=0.01):
    idx = np.where(np.abs(x) > thr)[0]
    if not len(idx):
        return x
    a, b = max(0, idx[0] - int(0.02 * sr)), min(len(x), idx[-1] + int(0.08 * sr))
    return x[a:b]


def heteronyms(text, words):
    """列出多音字：TTS 前端给出的读音 vs pypinyin 按上下文给出的读音。"""
    ref = [p[0] for p in pinyin(text, style=Style.TONE3, neutral_tone_with_five=True)]
    chars = list(text)
    rows, pos = [], 0
    for w, ph in words:
        k = chars.index(w[0], pos) if w[0] in chars[pos:] else -1
        if k < 0:
            continue
        for j, ch in enumerate(w):
            readings = pinyin(ch, style=Style.TONE3, heteronym=True, neutral_tone_with_five=True)[0]
            if '一' <= ch <= '鿿' and len(set(readings)) > 1:
                rows.append((ch, w, ph, ref[k + j], '/'.join(readings)))
        pos = k + len(w)
    return rows


def scan(args):
    tts, asr = make_tts(), make_asr()
    test = spoken('再看<s>供给</s>：钻石藏在深层，下矿要费镐、费火把，还得躲岩浆。价格越高，需求量越少——曲线向下倾斜。')
    rows = []
    for sid, name in enumerate(VOICES):
        if not name.startswith('zm_'):
            continue
        x, sr, _ = generate(tts, test, sid, args.speed)
        x = trim(x, sr)
        hyp = recognize(asr, x, sr)
        e, _, _ = cer(test, hyp)
        rows.append({'sid': sid, 'name': name, 'f0': round(f0_median(x, sr)), 'cer': round(e, 3), 'per': round(per(test, hyp), 3),
                     'dur': round(len(x) / sr, 2), 'cps': round(len(han(test)) / (len(x) / sr), 2), 'asr': hyp})
        print(json.dumps(rows[-1], ensure_ascii=False), flush=True)
    os.makedirs(OUT, exist_ok=True)
    json.dump(rows, open(os.path.join(OUT, 'scan.json'), 'w'), ensure_ascii=False, indent=1)


def synth(args):
    tts, asr = make_tts(debug=True), make_asr()
    os.makedirs(OUT, exist_ok=True)
    texts = cue_texts()
    clips, speeds, report, het = [], [], [], []
    for i, raw in enumerate(texts):
        text = spoken(raw)
        # 有读音错误就换语速重试，取"音节错 ×2 + 声调错"最小的一版；并列时取最接近设定语速的
        best = None
        for sp in [args.speed] + [v for v in (1.1, 1.2, 1.05, 1.25) if v != args.speed]:
            x, sr, words = generate(tts, text, args.sid, sp, capture=True)
            x = trim(x, sr)
            x = x / (np.max(np.abs(x)) + 1e-9) * 0.7
            hyp = recognize(asr, x, sr)
            syl, ton = per(text, hyp, tones=False), per(text, hyp)
            score = (2 * syl + ton, abs(sp - args.speed))
            if best is None or score < best['score']:
                best = dict(score=score, x=x, sr=sr, words=words, hyp=hyp, syl=syl, ton=ton, sp=sp)
            if ton == 0:
                break
        x, sr, words, hyp = best['x'], best['sr'], best['words'], best['hyp']
        e, _, _ = cer(text, hyp)
        path = os.path.join(OUT, f'{i:02d}.wav')
        tmp = path + '.24k.wav'
        sf.write(tmp, x, sr, subtype='FLOAT')
        subprocess.check_call(['ffmpeg', '-loglevel', 'error', '-y', '-i', tmp, '-ar', str(SR_OUT), '-ac', '1', '-c:a', 'pcm_s16le', path])
        os.remove(tmp)
        dur = len(x) / sr
        clips.append(round(dur, 3))
        speeds.append(best['sp'])
        report.append((i, text, hyp, e, best['syl'], best['ton'], best['sp'], dur, len(han(text)) / dur))
        het += [(i,) + row for row in heteronyms(text, words)]
        print(f"{i:02d} {dur:5.2f}s x{best['sp']} cer={e:.3f} syl={best['syl']:.3f} tone={best['ton']:.3f} {text} | ASR: {hyp}", flush=True)
    with open(os.path.join(ROOT, 'src/voice.js'), 'w') as f:
        f.write('// 由 tts/narrate.py 生成：每句配音的时长（秒），timeline.js 据此拉伸字幕窗口。\n')
        f.write(f"export const VOICE = {json.dumps({'voice': VOICES[args.sid], 'sid': args.sid, 'speeds': speeds, 'clips': clips})};\n")
    with open(os.path.join(OUT, 'report.md'), 'w') as f:
        f.write(f'# 配音校验（{VOICES[args.sid]}，基准语速 {args.speed}）\n\n'
                '每句合成后用 Paraformer 识别回文字再比对。字错率按汉字算（同音字也算错）；'
                '音节错率按无调拼音算；声调错率按带调拼音算（已按变调规则换算）。\n\n'
                '| # | 字幕（朗读文本） | 识别回转 | 字错率 | 音节错率 | 声调错率 | 语速 | 时长 | 字/秒 |\n|---|---|---|---|---|---|---|---|---|\n')
        for i, text, hyp, e, syl, ton, sp, dur, cps in report:
            f.write(f'| {i} | {text} | {hyp} | {e:.3f} | {syl:.3f} | {ton:.3f} | {sp} | {dur:.2f} | {cps:.1f} |\n')
        f.write('\n## 多音字\n\n| # | 字 | 词 | TTS 读音 | 上下文参考 | 全部读音 |\n|---|---|---|---|---|---|\n')
        for row in het:
            f.write('| ' + ' | '.join(str(c) for c in row) + ' |\n')
    tot = sum(clips)
    print(f'total speech {tot:.1f}s | lines with syllable errors: {sum(r[4] > 0 for r in report)} | with tone errors: {sum(r[5] > 0 for r in report)} | mean tone PER {np.mean([r[5] for r in report]):.3f}')


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('cmd', choices=['scan', 'synth'])
    ap.add_argument('--sid', type=int, default=64)
    ap.add_argument('--speed', type=float, default=1.0)
    a = ap.parse_args()
    {'scan': scan, 'synth': synth}[a.cmd](a)
