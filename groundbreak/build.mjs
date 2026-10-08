// Inline the sources into one self-contained page (the Artifact wraps it in <html>/<body>).
import { readFileSync, writeFileSync } from 'node:fs';
const src = f => readFileSync(new URL('./src/' + f, import.meta.url), 'utf8');
const app = ['data.js', 'app.js'].map(src).join('\n');
const html = `<title>破土 Groundbreak</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=Noto+Sans+SC:wght@400;500;700;900&display=swap">
<style>${src('style.css')}</style>
${src('body.html')}
<script>(()=>{'use strict';
${app}
})();</script>
`;
if (/<\/script/i.test(app)) throw new Error('inline script contains </script');
writeFileSync(new URL('./index.html', import.meta.url), html);
console.log('index.html', (html.length / 1024).toFixed(1) + ' KB');
