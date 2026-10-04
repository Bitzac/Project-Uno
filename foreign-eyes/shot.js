// 用法: node shot.js t1 t2 ...  -> build/shots/t_<t>.jpg
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--force-device-scale-factor=1', '--disable-gpu-vsync'] });
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  const errs = []; p.on('pageerror', e => errs.push(String(e))); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto('http://127.0.0.1:8765/web/index.html');
  await p.waitForFunction(() => window.READY === true, null, { timeout: 120000 });
  require('fs').mkdirSync('build/shots', { recursive: true });
  for (const t of process.argv.slice(2)) {
    const t0 = Date.now();
    await p.evaluate(t => renderAt(t), +t);
    await p.screenshot({ path: `build/shots/t_${t}.jpg`, type: 'jpeg', quality: 88 });
    console.log(t, Date.now() - t0, 'ms');
  }
  if (errs.length) console.log('ERRORS', errs.slice(0, 5));
  await b.close();
})();
