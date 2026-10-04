// 渲染管线：本地静态服务 → Chromium 逐帧 seek(t) 截图 → ffmpeg 分段编码 → 拼接 → 混入配乐。
//   node render.mjs                 完整 MP4（out/block-econ-supply-demand.mp4）
//   node render.mjs --stills 5,20   只导出这些秒数的静帧到 out/stills/
//   node render.mjs --from 57 --to 84 --workers 2   只渲染一段（预览用）
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn, execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { FPS, DURATION, CUES } from './src/timeline.js';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(ROOT, 'out');
const FONTS = path.join(ROOT, '.cache', 'fonts');
const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, all) => (v.startsWith('--') ? [...a, [v.slice(2), all[i + 1] && !all[i + 1].startsWith('--') ? all[i + 1] : true]] : a), []));

function loadPlaywright() {
  const require = createRequire(import.meta.url);
  try { return require('playwright'); } catch { return require(path.join(execSync('npm root -g').toString().trim(), 'playwright')); }
}

// 字体：Noto Sans SC 500/900、Press Start 2P 来自 Google Fonts（OFL），Unifont 来自系统
function ensureFonts() {
  fs.mkdirSync(FONTS, { recursive: true });
  const need = { 'NotoSansSC-500.ttf': ['Noto+Sans+SC:wght@500', 0], 'NotoSansSC-900.ttf': ['Noto+Sans+SC:wght@900', 0], 'PressStart2P.ttf': ['Press+Start+2P', 0] };
  for (const [file, [family]] of Object.entries(need)) {
    const dst = path.join(FONTS, file);
    if (fs.existsSync(dst)) continue;
    const css = execSync(`curl -sS -A curl/8 "https://fonts.googleapis.com/css2?family=${family}"`).toString();
    const url = css.match(/url\((https:[^)]+\.ttf)\)/)[1];
    execSync(`curl -sS -o "${dst}" "${url}"`);
  }
  const uni = path.join(FONTS, 'unifont.otf');
  if (!fs.existsSync(uni)) fs.copyFileSync('/usr/share/fonts/opentype/unifont/unifont.otf', uni);
}

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.ttf': 'font/ttf', '.otf': 'font/otf' };
function serve() {
  return new Promise(resolve => {
    const srv = http.createServer((req, res) => {
      const f = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
      if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
      res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' });
      fs.createReadStream(f).pipe(res);
    });
    srv.listen(0, '127.0.0.1', () => resolve(srv));
  });
}

async function openPage(browser, url) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  page.on('pageerror', e => { console.error('[page error]', e.message); process.exitCode = 1; });
  await page.goto(url);
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 120000 });
  return page;
}

function run(cmd, argv) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, argv, { stdio: ['ignore', 'inherit', 'inherit'] });
    p.on('close', c => (c ? reject(new Error(`${cmd} exited ${c}`)) : resolve()));
  });
}

async function renderRange(browser, url, a, b, file, tick) {
  const page = await openPage(browser, url);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-tune', 'animation', '-pix_fmt', 'yuv420p', '-r', String(FPS), file],
    { stdio: ['pipe', 'inherit', 'inherit'] });
  const closed = new Promise((res, rej) => ff.on('close', c => (c ? rej(new Error('ffmpeg ' + c)) : res())));
  for (let f = a; f < b; f++) {
    await page.evaluate(t => window.seek(t), f / FPS);
    const buf = await page.screenshot({ type: 'jpeg', quality: 95 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    tick();
  }
  ff.stdin.end();
  await closed;
  await page.close();
}

const srt = () => CUES.map((c, i) => {
  const ts = s => { const ms = Math.round(s * 1000); const p = (n, w = 2) => String(n).padStart(w, '0'); return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)},${p(ms % 1000, 3)}`; };
  return `${i + 1}\n${ts(c.t0)} --> ${ts(c.t1)}\n${c.text.replace(/<\/?[a-z]>/g, '')}\n`;
}).join('\n');

async function main() {
  ensureFonts();
  fs.mkdirSync(OUT, { recursive: true });
  const srv = await serve();
  const url = `http://127.0.0.1:${srv.address().port}/src/index.html`;
  const { chromium } = loadPlaywright();
  const browser = await chromium.launch({ args: ['--force-color-profile=srgb', '--disable-lcd-text', '--font-render-hinting=none'] });
  try {
    if (args.stills) {
      const dir = path.join(OUT, 'stills');
      fs.mkdirSync(dir, { recursive: true });
      const page = await openPage(browser, url);
      for (const t of String(args.stills).split(',').map(Number)) {
        await page.evaluate(x => window.seek(x), t);
        const f = path.join(dir, `t${String(t.toFixed(1)).padStart(5, '0')}.png`);
        await page.screenshot({ path: f });
        console.log(f);
      }
      return;
    }
    const from = Math.round((+args.from || 0) * FPS), to = Math.round((+args.to || DURATION) * FPS);
    const workers = +args.workers || 4;
    const total = to - from;
    const chunk = Math.ceil(total / workers);
    let done = 0, last = 0;
    const t0 = Date.now();
    const tick = () => {
      done++;
      if (done - last >= 90 || done === total) { last = done; console.log(`frames ${done}/${total}  ${((Date.now() - t0) / 1000).toFixed(0)}s`); }
    };
    const segs = [];
    await Promise.all(Array.from({ length: workers }, (_, w) => {
      const a = from + w * chunk, b = Math.min(to, a + chunk);
      if (a >= b) return null;
      const file = path.join(OUT, `seg${w}.mp4`);
      segs[w] = file;
      return renderRange(browser, url, a, b, file, tick);
    }));
    const list = path.join(OUT, 'segs.txt');
    fs.writeFileSync(list, segs.filter(Boolean).map(f => `file '${f}'`).join('\n'));
    const video = path.join(OUT, 'video.mp4');
    await run('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', video]);

    await run('node', [path.join(ROOT, 'audio.mjs')]);
    const final = path.join(OUT, args.from || args.to ? 'preview.mp4' : 'block-econ-supply-demand.mp4');
    await run('ffmpeg', ['-y', '-loglevel', 'error', '-i', video, '-ss', String(from / FPS), '-i', path.join(OUT, 'audio.wav'),
      '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11', '-ar', '48000', '-c:a', 'aac', '-b:a', '192k', '-ac', '2', '-shortest', '-movflags', '+faststart', final]);
    fs.writeFileSync(path.join(OUT, 'block-econ-supply-demand.srt'), srt());
    for (const f of [...segs.filter(Boolean), list, video]) fs.rmSync(f, { force: true });
    console.log('done →', final, `(${((Date.now() - t0) / 1000).toFixed(0)}s)`);
  } finally {
    await browser.close();
    srv.close();
  }
}
main().catch(e => { console.error(e); process.exit(1); });
