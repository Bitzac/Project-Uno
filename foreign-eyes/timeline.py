# -*- coding: utf-8 -*-
"""根据逐句音频时长排出全片时间线 -> build/timeline.json"""
import json

# 各类场景的节奏（秒）：开场留白、句间停顿、收尾停留
PACE = {
    'title': (3.2, 0.7, 1.6), 'thesis': (1.0, 0.55, 1.6), 'silence': (1.0, 0.55, 1.8), 'names': (1.0, 0.55, 1.8),
    'chapter': (1.5, 0.5, 2.4), 'source': (1.1, 0.5, 1.5), 'excluded': (1.0, 0.6, 2.0), 'chart': (1.0, 0.6, 2.2),
    'epilogue': (1.2, 0.8, 2.6), 'method': (0.8, 0.5, 2.0), 'credits': (0.0, 0.0, 0.0),
}


def build():
    spec = json.load(open('build/script.json'))
    vo = json.load(open('build/vo/index.json'))
    t, scenes = 0.0, []
    for sc in spec['scenes']:
        lead, gap, tail = PACE[sc['type']]
        lead = sc.get('pre', lead)
        start, cur, lines = t, t + lead, []
        for i, text in enumerate(sc['lines']):
            d = vo[f"{sc['id']}_{i}"]['dur']
            lines.append(dict(t0=round(cur, 3), t1=round(cur + d, 3), text=text, key=f"{sc['id']}_{i}"))
            cur += d + gap
        end = (cur - gap if lines else cur) + tail + sc.get('post', 0.0)
        scenes.append(dict(sc, start=round(start, 3), end=round(end, 3), lines=lines))
        t = end
    out = dict(duration=round(t, 3), fps=30, scenes=scenes, places=spec['places'], routes=spec['routes'])
    json.dump(out, open('build/timeline.json', 'w'), ensure_ascii=False, indent=1)
    print(f'duration {t/60:.2f} min ({t:.1f}s), {len(scenes)} scenes')


if __name__ == '__main__':
    build()
