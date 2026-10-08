// 并行逐帧渲染：node capture.js <workers>  -> build/seg_<k>.mp4
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const W = +process.argv[2] || 4, FPS = 30;
const tl = JSON.parse(fs.readFileSync('build/timeline.json'));
const total = Math.ceil(tl.duration * FPS);
async function worker(k) {
  const f0 = Math.floor(total * k / W), f1 = Math.floor(total * (k + 1) / W);
  const out = `build/seg_${k}.mp4`;
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '14', '-pix_fmt', 'yuv420p', '-r', String(FPS), out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const b = await chromium.launch({ args: ['--force-device-scale-factor=1'] });
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  p.on('pageerror', e => console.error('pageerror', k, String(e)));
  await p.goto('http://127.0.0.1:8765/web/index.html');
  await p.waitForFunction(() => window.READY === true, null, { timeout: 180000 });
  const cdp = await p.context().newCDPSession(p);
  const t0 = Date.now();
  for (let f = f0; f < f1; f++) {
    await p.evaluate(t => renderAt(t), f / FPS);
    const { data } = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 93, optimizeForSpeed: true });
    const buf = Buffer.from(data, 'base64');
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if ((f - f0) % 300 === 0) fs.writeFileSync(`build/progress_${k}.txt`, `${f - f0}/${f1 - f0} ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  fs.writeFileSync(`build/progress_${k}.txt`, `done ${f1 - f0}/${f1 - f0} ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  await b.close();
}
(async () => { await Promise.all([...Array(W)].map((_, k) => worker(k))); console.log('ALL DONE', total, 'frames'); })();
