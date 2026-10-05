// 沿成片时间轴（60 fps × 30 s，含节拍时间扭曲）采样桑巴动捕骨骼 -> build/pose3d.json
// 需先在 Project-Uno 根目录起 http 服务：python3 -m http.server 8767 --bind 127.0.0.1
const { chromium } = require('playwright');
const fs = require('fs');
const BONES = ['Hips', 'Spine', 'Spine2', 'Neck', 'Head', 'HeadTop_End',
  'LeftArm', 'LeftForeArm', 'LeftHand', 'LeftHandMiddle2', 'RightArm', 'RightForeArm', 'RightHand', 'RightHandMiddle2',
  'LeftUpLeg', 'LeftLeg', 'LeftFoot', 'LeftToeBase', 'RightUpLeg', 'RightLeg', 'RightFoot', 'RightToeBase'];
const FPS = 60, DURATION = 30;
(async () => {
  fs.mkdirSync('build', { recursive: true });
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 640, height: 360 } });
  await p.goto('http://127.0.0.1:8767/samba-dance/web/index.html');
  await p.waitForFunction(() => window.READY === true, null, { timeout: 180000 });
  const frames = await p.evaluate(({ BONES, FPS, N }) => {
    const out = [];
    for (let f = 0; f < N; f++) out.push(bonesAt(f / FPS, BONES));
    return out;
  }, { BONES, FPS, N: FPS * DURATION });
  fs.writeFileSync('build/pose3d.json', JSON.stringify({ fps: FPS, bones: BONES, frames }));
  console.log('frames', frames.length);
  await b.close();
})();
