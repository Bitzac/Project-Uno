// Inline the sources into one self-contained page (the Artifact wraps it in <html>/<body>).
// Province and US-state boundaries are shared with popflow, so they are read from there.
import { readFileSync, writeFileSync } from 'node:fs';
const read = f => readFileSync(new URL(f, import.meta.url), 'utf8');
const app = [read('./src/data.js'), read('../popflow/src/geo.js'), read('./src/app.js')].join('\n');
const html = `<title>人生路径 OS</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=Noto+Sans+SC:wght@400;500;700;900&display=swap">
<style>${read('./src/style.css')}</style>
${read('./src/body.html')}
<script src="https://cdnjs.cloudflare.com/ajax/libs/d3/7.9.0/d3.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/topojson/3.0.2/topojson.min.js"></script>
<script>(()=>{'use strict';
${app}
})();</script>
`;
if (/<\/script/i.test(app)) throw new Error('inline script contains </script');
writeFileSync(new URL('./index.html', import.meta.url), html);
console.log('index.html', (html.length / 1024).toFixed(1) + ' KB');
