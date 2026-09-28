// Inline the sources into one self-contained page (the Artifact wraps it in <html>/<body>).
import { readFileSync, writeFileSync } from 'node:fs';
const src = f => readFileSync(new URL('./src/' + f, import.meta.url), 'utf8');
const examples = JSON.stringify(JSON.parse(src('examples.json')));
const app = ['anatomy.js', 'worker.js', 'core.js', 'forms.js', 'three3d.js', 'boot.js'].map(src).join('\n');
const html = `<title>身体健康 OS</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=Noto+Sans+SC:wght@400;500;700&family=JetBrains+Mono:wght@400;500&display=swap">
<style>${src('style.css')}</style>
${src('body.html')}
<script type="application/json" id="examples">${examples}</script>
<script type="text/js-worker" id="sdfWorker">${src('worker.js')}</script>
<script>(()=>{'use strict';
${app}
})();</script>
`;
if (/<\/script/i.test(app + examples)) throw new Error('inline script contains </script');
writeFileSync(new URL('./index.html', import.meta.url), html);
console.log('index.html', (html.length / 1024).toFixed(1) + ' KB');
