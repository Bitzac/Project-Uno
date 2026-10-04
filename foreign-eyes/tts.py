# -*- coding: utf-8 -*-
"""逐句合成男声旁白（Kokoro-82M-v1.1-zh, 声线 zm_014）。
输出 build/vo/<scene>_<i>.wav 与 build/vo/index.json（时长）。
python3 tts.py [scene_id ...]   # 只重做指定场景
"""
import warnings; warnings.filterwarnings('ignore')
import json, os, re, sys
import numpy as np, soundfile as sf, cn2an
from kokoro import KModel, KPipeline

VOICE, SPEED, SR = 'zm_014', 1.1, 24000
DIG = '零一二三四五六七八九'


def normalize(text, fixes):
    for a, b in fixes:
        text = text.replace(a, b)
    # 年份：3-4 位逐字读，1-2 位按数值读
    text = re.sub(r'(\d{3,4})(?=年)', lambda m: ''.join(DIG[int(c)] for c in m.group(1)), text)
    text = re.sub(r'\d+', lambda m: cn2an.an2cn(m.group()), text)
    text = text.replace('China', '柴纳')
    return text


def main():
    spec = json.load(open('build/script.json'))
    only = set(sys.argv[1:])
    os.makedirs('build/vo', exist_ok=True)
    idx_path = 'build/vo/index.json'
    index = json.load(open(idx_path)) if os.path.exists(idx_path) else {}
    REPO = 'hexgrad/Kokoro-82M-v1.1-zh'
    model = KModel(repo_id=REPO).eval()
    zh = KPipeline(lang_code='z', repo_id=REPO, model=model)
    for sc in spec['scenes']:
        if only and sc['id'] not in only:
            continue
        overrides = {int(k): v for k, v in sc.get('tts', {}).items()}
        for i, line in enumerate(sc['lines']):
            key = f"{sc['id']}_{i}"
            say = normalize(overrides.get(i + 1, line), spec['tts_fix'])
            speed = {int(k): v for k, v in sc.get('speed', {}).items()}.get(i, SPEED)
            chunks = [r.audio.numpy() for r in zh(say, voice=VOICE, speed=speed)]
            y = np.concatenate(chunks)
            # 去掉首尾静音
            thr = 0.01 * np.abs(y).max()
            nz = np.where(np.abs(y) > thr)[0]
            y = y[max(0, nz[0] - 240): nz[-1] + 1200]
            sf.write(f'build/vo/{key}.wav', y, SR)
            index[key] = dict(dur=len(y) / SR, say=say, text=line)
            print(f'{key}: {len(y)/SR:.2f}s  {say}', flush=True)
    json.dump(index, open(idx_path, 'w'), ensure_ascii=False, indent=1)
    print('total speech', round(sum(v['dur'] for v in index.values()) / 60, 2), 'min')


if __name__ == '__main__':
    main()
