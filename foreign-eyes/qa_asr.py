# -*- coding: utf-8 -*-
"""旁白质检：Whisper-small 转写，与朗读文本按「带声调拼音」逐音节比对。
输出 build/qa_asr.json，并打印错误率高于阈值的句子。"""
import warnings; warnings.filterwarnings('ignore')
import json, re, sys
import numpy as np, soundfile as sf, torch, cn2an
from scipy.signal import resample_poly
from pypinyin import lazy_pinyin, Style
from transformers import WhisperProcessor, WhisperForConditionalGeneration

DIG = '零一二三四五六七八九'


def to_py(s):
    s = re.sub(r'(\d{3,4})(?=年)', lambda m: ''.join(DIG[int(c)] for c in m.group(1)), s)
    s = re.sub(r'(\d+(\.\d+)?)%', lambda m: '百分之' + cn2an.an2cn(m.group(1)), s)
    s = re.sub(r'\d+(\.\d+)?', lambda m: cn2an.an2cn(m.group()), s)
    s = re.sub(r'[^一-鿿]', '', s)
    return lazy_pinyin(s, style=Style.TONE3, neutral_tone_with_five=True)


def align(r, h):
    n, m = len(r), len(h)
    d = np.zeros((n + 1, m + 1), int); d[:, 0] = range(n + 1); d[0, :] = range(m + 1)
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            d[i, j] = min(d[i-1, j] + 1, d[i, j-1] + 1, d[i-1, j-1] + (r[i-1] != h[j-1]))
    i, j, ops = n, m, []
    while i or j:
        if i and j and d[i, j] == d[i-1, j-1] + (r[i-1] != h[j-1]):
            if r[i-1] != h[j-1]: ops.append((i-1, r[i-1], h[j-1]))
            i, j = i - 1, j - 1
        elif i and d[i, j] == d[i-1, j] + 1:
            ops.append((i-1, r[i-1], '∅')); i -= 1
        else:
            ops.append((i, '∅', h[j-1])); j -= 1
    return d[n, m], ops[::-1]


def main():
    idx = json.load(open('build/vo/index.json'))
    keys = sys.argv[1:] or list(idx)
    P = WhisperProcessor.from_pretrained('openai/whisper-small')
    M = WhisperForConditionalGeneration.from_pretrained('openai/whisper-small').eval()
    res = {}
    for k in keys:
        y, sr = sf.read(f'build/vo/{k}.wav')
        y = resample_poly(y, 2, 3).astype(np.float32)
        f = P(y, sampling_rate=16000, return_tensors='pt').input_features
        with torch.no_grad():
            ids = M.generate(f, language='zh', task='transcribe')
        hyp = P.batch_decode(ids, skip_special_tokens=True)[0]
        ref_s = re.sub(r'[^一-鿿]', '', idx[k]['say'])
        rp, hp = to_py(idx[k]['say']), to_py(hyp)
        dist, ops = align(rp, hp)
        per = dist / max(1, len(rp))
        # 只看声母韵母（不含声调）的错误，用来区分「读错字」和「声调偏差」
        dist_nt, _ = align([p.rstrip('12345') for p in rp], [p.rstrip('12345') for p in hp])
        res[k] = dict(per=round(per, 3), per_toneless=round(dist_nt / max(1, len(rp)), 3), hyp=hyp,
                      diffs=[(ref_s[i] if i < len(ref_s) else '', a, b) for i, a, b in ops])
        flag = ' <<' if per > 0.06 or dist_nt > 0 else ''
        print(f'{k}: PER={per:.3f} toneless={dist_nt}{flag}  {res[k]["diffs"][:8]}', flush=True)
    json.dump(res, open('build/qa_asr.json', 'w'), ensure_ascii=False, indent=1)
    pers = [v['per'] for v in res.values()]
    print(f'mean PER {np.mean(pers):.3f}  median {np.median(pers):.3f}  lines>0.06: {sum(p > 0.06 for p in pers)}/{len(pers)}')


if __name__ == '__main__':
    main()
