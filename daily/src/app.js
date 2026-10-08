// Renders one issue from the embedded JSON archive (newest first). No network calls.
const SECS = [
  { id: 'outdoor', n: '户外运动', s: '户外', en: 'Outdoor' },
  { id: 'ai', n: 'AI', s: 'AI', en: 'Artificial Intelligence' },
  { id: 'tech', n: '科技前沿', s: '科技', en: 'Frontier Tech' },
  { id: 'politics', n: '政治经济', s: '政经', en: 'Politics & Economy' },
  { id: 'markets', n: '国际市场', s: '市场', en: 'Global Markets' },
];
const SEC = Object.fromEntries(SECS.map(s => [s.id, s]));
const WEEK = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
const ISSUES = JSON.parse(document.getElementById('issues-data').textContent);

const $ = s => document.querySelector(s);
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const href = u => (/^https:\/\//.test(u) ? u : '#');
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* storage blocked */ } },
};

const pct = c => (c > 0 ? '+' : c < 0 ? '−' : '') + Math.abs(c).toFixed(2) + '%';
function change(r) {
  if (typeof r.c !== 'number') return { cls: 'flat', text: r.ct || '—', arrow: '' };
  return { cls: r.c > 0 ? 'up' : r.c < 0 ? 'dn' : 'flat', text: pct(r.c), arrow: r.c > 0 ? '▲ ' : r.c < 0 ? '▼ ' : '' };
}

const sources = src => (src && src.length
  ? `<div class="src">${src.map(([n, u]) => `<a href="${esc(href(u))}" target="_blank" rel="noopener">${esc(n)}</a>`).join('')}</div>`
  : '');
const figs = list => (list && list.length
  ? `<div class="figs">${list.map(f => `<div class="fig"><b>${esc(f.v)}${f.u ? `<small>${esc(f.u)}</small>` : ''}</b><span>${esc(f.l)}</span></div>`).join('')}</div>`
  : '');
const tagline = x => `<div class="tagline"><span class="tag">${esc(x.tag)}</span><span class="num">${esc(x.date)}</span></div>`;

function lead(l) {
  return `<article class="lead glass">${tagline(l)}<h3>${esc(l.title)}</h3>
    ${l.dek ? `<p class="dek">${esc(l.dek)}</p>` : ''}
    <div class="body">${[].concat(l.body).map(p => `<p>${esc(p)}</p>`).join('')}</div>
    ${figs(l.figs)}${sources(l.src)}</article>`;
}

function brief(b) {
  return `<article class="brief">${tagline(b)}<h4>${esc(b.title)}</h4><p>${esc(b.body)}</p>${figs(b.figs)}${sources(b.src)}</article>`;
}

function table(t) {
  const al = i => (t.align && t.align[i] === 'num' ? ' class="r"' : '');
  return `<div class="side"><h4>${esc(t.title)}</h4><div class="tbl"><table>
    <thead><tr>${t.cols.map((c, i) => `<th scope="col"${al(i)}>${esc(c)}</th>`).join('')}</tr></thead>
    <tbody>${t.rows.map(r => `<tr>${r.map((c, i) => `<td${al(i)}>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody>
  </table></div>${sources(t.src)}</div>`;
}

function quote(r, s) {
  const c = change(r);
  let bar = '';
  if (typeof r.c === 'number' && r.c !== 0) {
    const w = Math.min(Math.abs(r.c) / s, 1) * 50;
    bar = `<i class="${r.c > 0 ? 'pos' : 'neg'}${Math.abs(r.c) > s ? ' clip' : ''}" style="width:${w.toFixed(2)}%"></i>`;
  }
  const meta = esc(r.d) + (r.note ? ' · ' + esc(r.note) : '');
  return `<div class="q" title="${esc(r.n)} ${esc(r.v)} ${esc(c.text)} · ${meta}">
    <div class="n"><span>${esc(r.n)}</span><em class="num">${meta}</em></div>
    <div class="v">${esc(r.v)}</div><div class="c ${c.cls}">${esc(c.text)}</div>
    <div class="bar-c" aria-hidden="true">${bar}</div></div>`;
}

function board(q) {
  const s = q.scale || 3;
  const scale = `<small class="scale" aria-hidden="true"><span>−${s}%</span><span>0</span><span>+${s}%</span></small>`;
  return `<div class="board">${q.groups.map(g => `<div class="grp"><h4>${esc(g.name)}${scale}</h4>${g.rows.map(r => quote(r, s)).join('')}</div>`).join('')}</div>
    <p class="board-note">条形为当日涨跌幅，所有行同一比例尺（±${s}%），超出部分截断。利率以基点计，不画条形。每行下方是该数据的收盘或报价日期。</p>${sources(q.src)}`;
}

function section(sec) {
  const meta = SEC[sec.id];
  let items = sec.items || [];
  let side = '';
  if (sec.table) side = table(sec.table);
  else if (!sec.quotes && items.length > 3) {
    side = `<div class="side">${items.slice(0, 2).map(brief).join('')}</div>`;
    items = items.slice(2);
  }
  const count = 1 + (sec.items || []).length;
  return `<section class="sec" id="${sec.id}" aria-labelledby="h-${sec.id}">
    <header class="sec-head"><h2 id="h-${sec.id}">${esc(meta.n)}</h2><span class="en">${esc(meta.en)}</span><span class="cnt num">${count} 条</span></header>
    <div class="sec-top${side ? '' : ' solo'}">${lead(sec.lead)}${side}</div>
    ${sec.quotes ? board(sec.quotes) : ''}
    ${items.length ? `<div class="briefs">${items.map(brief).join('')}</div>` : ''}
  </section>`;
}

function render(issue) {
  const [y, m, d] = issue.date.split('-').map(Number);
  const wd = WEEK[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  const no = String(issue.no).padStart(3, '0');
  const total = issue.sections.reduce((n, s) => n + 1 + (s.items || []).length, 0);
  const quotes = (issue.sections.find(s => s.quotes) || {}).quotes;
  const keys = quotes ? quotes.groups.flatMap(g => g.rows).filter(r => r.key) : [];
  const ticker = keys.map(r => {
    const c = change(r);
    return `<div class="tk"><span class="n">${esc(r.n)}</span><span class="v">${esc(r.v)}</span><span class="c ${c.cls}">${c.arrow}${esc(c.text)}</span></div>`;
  }).join('');

  $('#issue').innerHTML = `
  <section class="mast" id="top">
    <div class="mast-meta"><span>Vol.<b>${y - 2025}</b> · No.<b>${no}</b></span><span><b>${y}.${String(m).padStart(2, '0')}.${String(d).padStart(2, '0')}</b> ${wd}</span><span>美西 05:00 版</span></div>
    <h1 class="mast-title"><span class="m-latin">UNO</span><span class="m-cn" aria-label="日刊"><span>日</span><span>刊</span></span>
      <span class="m-side"><strong class="num">${total} 条</strong>五个板块，每条附来源</span></h1>
    <nav class="mast-secs" aria-label="本期板块">${SECS.map(s => `<a href="#${s.id}">${esc(s.n)}<i>${esc(s.en)}</i></a>`).join('')}</nav>
  </section>
  <section class="cover" aria-labelledby="cover-h">
    <div class="story">
      <div class="eyebrow"><b>${esc(issue.cover.kicker)}</b> · Cover Story</div>
      <h2 id="cover-h">${esc(issue.cover.title)}</h2>
      <p class="dek">${esc(issue.cover.dek)}</p>
      <ol class="five">${issue.cover.points.map(p => `<li><a href="#${esc(p.sec)}">${esc(SEC[p.sec].n)}<i>${esc(SEC[p.sec].en)}</i></a><p>${esc(p.text)}</p></li>`).join('')}</ol>
    </div>
    ${keys.length ? `<aside class="ticker glass" aria-label="行情速览"><h3>行情速览<small>最新收盘 / 报价</small></h3>${ticker}
      <p class="foot">${esc(issue.note || '')}</p></aside>` : ''}
  </section>
  ${issue.sections.map(section).join('')}
  ${issue.agenda && issue.agenda.length ? `<section class="sec" id="agenda" aria-labelledby="h-agenda">
    <header class="sec-head"><h2 id="h-agenda">日程</h2><span class="en">Calendar</span><span class="cnt num">${issue.agenda.length} 项</span></header>
    <div class="agenda">${issue.agenda.map(a => `<div class="ag"><span class="d">${esc(a.d)}</span><div class="t"><i>${esc(SEC[a.sec].n)}</i>${esc(a.t)}</div></div>`).join('')}</div>
  </section>` : ''}
  <footer class="colophon">
    <div><p><b>UNO 日刊</b> · 第 ${no} 期 · 编辑于 <span class="num">${esc(issue.edited)}</span></p><p>${esc(issue.note || '')}</p></div>
    <div><p>每天美西 05:00 由 Claude 检索公开报道编辑出刊，每条注明来源和日期。数字取出刊时能查到的最新值；不同来源有出入时取一手来源或标注口径。本刊不构成投资建议。</p></div>
  </footer>`;
  watchSections();
}

// top-bar nav, highlighted for the section in view
function buildNav() {
  const links = [{ id: 'top', s: '要点' }, ...SECS, { id: 'agenda', s: '日程' }];
  $('#nav').innerHTML = links.map(l => `<a href="#${l.id}" data-id="${l.id}">${esc(l.s)}</a>`).join('');
}
let observer;
function watchSections() {
  if (observer) observer.disconnect();
  if (!('IntersectionObserver' in window)) return;
  const set = id => document.querySelectorAll('#nav a').forEach(a => a.setAttribute('aria-current', a.dataset.id === id ? 'true' : 'false'));
  observer = new IntersectionObserver(entries => {
    const hit = entries.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
    if (hit) set(hit.target.id);
  }, { rootMargin: '-80px 0px -65% 0px' });
  document.querySelectorAll('#top, .sec').forEach(el => observer.observe(el));
  set('top');
}

// archive picker
function buildPicker() {
  const sel = $('#issue-pick');
  sel.innerHTML = ISSUES.map((it, i) => `<option value="${i}">No.${String(it.no).padStart(3, '0')} · ${esc(it.date.slice(5).replace('-', '/'))}</option>`).join('');
  sel.addEventListener('change', () => {
    render(ISSUES[Number(sel.value)]);
    window.scrollTo({ top: 0 });
  });
}

// 红涨绿跌 (default) or 绿涨红跌
function setUpDown(mode) {
  document.body.dataset.updown = mode;
  $('#ud-cn').setAttribute('aria-pressed', String(mode === 'cn'));
  $('#ud-us').setAttribute('aria-pressed', String(mode === 'us'));
  store.set('uno-updown', mode);
}
$('#ud-cn').addEventListener('click', () => setUpDown('cn'));
$('#ud-us').addEventListener('click', () => setUpDown('us'));

buildNav();
buildPicker();
setUpDown(store.get('uno-updown') === 'us' ? 'us' : 'cn');
render(ISSUES[0]);
if (location.hash.length > 1) {
  const el = document.getElementById(location.hash.slice(1));
  if (el) el.scrollIntoView();
}
