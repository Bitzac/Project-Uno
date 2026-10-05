// 动作采样：node analyze.js -> build/motion.json（120 Hz 关键骨骼世界坐标，供 beats.py 求节拍）
const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  fs.mkdirSync('build', { recursive: true });
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  await p.goto('http://127.0.0.1:8766/web/index.html');
  await p.waitForFunction(() => window.READY === true, null, { timeout: 180000 });
  const m = await p.evaluate(() => sampleMotion(120));
  fs.writeFileSync('build/motion.json', JSON.stringify(m));
  console.log('frames', m.frames.length, 'duration', m.duration);
  await b.close();
})();
