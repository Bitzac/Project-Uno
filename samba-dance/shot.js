// 预览截图：node shot.js <t1,t2,...> [ss] -> build/shot_<t>.png
const { chromium } = require('playwright');
const fs = require('fs');
const ts = (process.argv[2] || '0').split(',').map(Number), SS = process.argv[3] || 1;
(async () => {
  fs.mkdirSync('build', { recursive: true });
  const b = await chromium.launch({ args: ['--force-device-scale-factor=1'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  p.on('pageerror', (e) => console.error('pageerror', String(e)));
  p.on('console', (m) => { if (m.type() !== 'log') console.error('console', m.type(), m.text()); });
  await p.goto(`http://127.0.0.1:8766/web/index.html?ss=${SS}`);
  await p.waitForFunction(() => window.READY === true, null, { timeout: 180000 });
  for (const t of ts) {
    const t0 = Date.now();
    await p.evaluate((t) => renderAt(t), t);
    await p.screenshot({ path: `build/shot_${t}.png` });
    console.log('t', t, Date.now() - t0, 'ms');
  }
  await b.close();
})();
