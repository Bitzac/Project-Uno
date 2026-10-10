// Build targets:
//   artifact → index.html          claude.ai Artifact (the platform adds <html>/<body>); claude.ai db, AI comment on
//   global   → dist/global/        overseas website on Firebase (email sign-in, Firestore europe-west2)
//   cn       → dist/cn/            China website on Tencent CloudBase (SMS sign-in, ap-shanghai), no resources from outside China
// Usage: node build.mjs [artifact|global|cn|all]   (default: all)
import { readFileSync, writeFileSync, mkdirSync, cpSync, existsSync, rmSync, readdirSync } from 'node:fs';
import { build as esbuild } from 'esbuild';

const here = p => new URL(p, import.meta.url);
const src = f => readFileSync(here('./src/' + f), 'utf8');
const arg = process.argv[2] || 'all';
const targets = arg === 'all' ? ['artifact', 'global', 'cn'] : [arg];
const examples = JSON.stringify(JSON.parse(src('examples.json')));
const STORE = { artifact: 'store/artifact.js', global: 'store/firebase.js', cn: 'store/cloudbase.js' };

function app(t) {
  const files = ['refdata.js', 'standards.js', 'core.js', STORE[t], ...(t === 'artifact' ? [] : ['account.js']), 'charts.js', 'views.js', 'forms.js', 'boot.js'];
  const js = `const TARGET = '${t}', FEATURES = { ai: ${t === 'artifact'} };\n` + files.map(src).join('\n');
  if (/<\/script/i.test(js + examples)) throw new Error('inline script contains </script');
  return js;
}
const fonts = t => t === 'cn'
  ? '<style>@font-face{font-family:"Outfit";src:url(fonts/outfit-latin.woff2) format("woff2");font-weight:100 900;font-display:swap}</style>'
  : '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=Noto+Sans+SC:wght@400;500;700;900&display=swap">';

for (const t of targets) {
  if (t === 'artifact') {
    const html = `<title>成长罗盘</title>\n${fonts(t)}\n<style>${src('style.css')}</style>\n${src('body.html')}\n<script type="application/json" id="examples">${examples}</script>\n<script>(()=>{'use strict';\n${app(t)}\n})();</script>\n`;
    writeFileSync(here('./index.html'), html);
    console.log('artifact  index.html', (html.length / 1024).toFixed(1) + ' KB');
    continue;
  }
  const out = here(`./dist/${t}/`);
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  await esbuild({
    entryPoints: [new URL(`./web/${t}/vendor-entry.js`, import.meta.url).pathname], outfile: new URL('vendor.js', out).pathname,
    bundle: true, minify: true, format: 'iife', platform: 'browser', target: 'es2019', legalComments: 'none', logLevel: 'error',
    define: { 'process.env.NODE_ENV': '"production"', global: 'globalThis' }
  });
  const html = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>成长罗盘 · K-12 成长档案</title>
<meta name="description" content="孩子的成绩、综合素质五维图、体测与生长、视力、心情与心理测评，一处看清。支持中国、美国、英国学制。">
<link rel="icon" href="favicon.svg" type="image/svg+xml">
${fonts(t)}
<style>${src('style.css')}</style>
</head>
<body>
${src('body.html')}
<script type="application/json" id="examples">${examples}</script>
<script src="config.js"></script>
<script src="vendor.js"></script>
<script>(()=>{'use strict';
${app(t)}
})();</script>
</body>
</html>
`;
  writeFileSync(new URL('index.html', out), html);
  const cfg = here(`./web/${t}/config.js`);
  cpSync(existsSync(cfg) ? cfg : here(`./web/${t}/config.example.js`), new URL('config.js', out));
  cpSync(here('./web/favicon.svg'), new URL('favicon.svg', out));
  // legal drafts: {{head lang=.. title=..}} expands to the shared page head
  const head = readFileSync(here('./web/legal/_head.html'), 'utf8');
  mkdirSync(new URL('legal/', out), { recursive: true });
  for (const f of readdirSync(here(`./web/legal/${t}/`))) {
    const page = readFileSync(here(`./web/legal/${t}/${f}`), 'utf8').replace(/\{\{head lang=(\S+) title=([^}]+)\}\}/, (_, lang, title) => head.replace('{{lang}}', lang).replace('{{title}}', title));
    writeFileSync(new URL(`legal/${f}`, out), page);
  }
  if (t === 'cn') cpSync(here('./web/cn/fonts/'), new URL('fonts/', out), { recursive: true });
  const size = f => (readFileSync(new URL(f, out)).length / 1024).toFixed(1) + ' KB';
  console.log(`${t.padEnd(9)} dist/${t}/  index.html ${size('index.html')} · vendor.js ${size('vendor.js')}${existsSync(cfg) ? '' : ' · config.js = example (fill in before deploy)'}`);
}
