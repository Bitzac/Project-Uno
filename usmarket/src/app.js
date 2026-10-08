// Renders one issue of the decision desk from the embedded archive (newest first), the backtest and the rule constants.
// Account size, risk per trade and "my holdings" live only in this browser (localStorage).
const ISSUES = JSON.parse(document.getElementById('issues-data').textContent);
const BT = JSON.parse(document.getElementById('bt-data').textContent);
const CFG = JSON.parse(document.getElementById('cfg-data').textContent);
const $ = s => document.querySelector(s);
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const href = u => (/^https:\/\//.test(u) ? u : '#');
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* storage blocked */ } },
};

const WEEK = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
const num = v => typeof v === 'number' && Number.isFinite(v);
const sgn = (v, d = 1) => (num(v) ? (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v * 100).toFixed(d) + '%' : '—');
const pc0 = v => (num(v) ? Math.round(v * 100) + '%' : '—');
const pc1 = v => (num(v) ? (v * 100).toFixed(1) + '%' : '—');
const cls = v => (num(v) ? (v > 0 ? 'up' : v < 0 ? 'dn' : 'flat') : 'flat');
const sp = (v, d) => `<span class="${cls(v)}">${sgn(v, d)}</span>`;
const usd = (v, d = 2) => (num(v) ? '$' + v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }) : '—');
const md = d => (d ? `${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))}` : '');
const wd = d => WEEK[new Date(d + 'T12:00:00Z').getUTCDay()];
const ptTime = iso => new Date(iso).toLocaleTimeString('en-GB', { timeZone: 'America/Los_Angeles', hour: '2-digit', minute: '2-digit' });
const ptDate = iso => new Date(iso).toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
const sources = src => (src && src.length ? `<div class="src">${src.map(([n, u]) => `<a href="${esc(href(u))}" target="_blank" rel="noopener">${esc(n)}</a>`).join('')}</div>` : '');
const isTodo = x => x == null || (typeof x === 'string' && /TODO/.test(x));

const CN = {
  NVDA: '英伟达', AAPL: '苹果', MSFT: '微软', GOOGL: '谷歌 A', GOOG: '谷歌 C', AMZN: '亚马逊', META: 'Meta', AVGO: '博通', TSLA: '特斯拉',
  'BRK.B': '伯克希尔', LLY: '礼来', JPM: '摩根大通', V: 'Visa', MA: '万事达', WMT: '沃尔玛', ORCL: '甲骨文', XOM: '埃克森美孚', NFLX: '奈飞',
  COST: '好市多', JNJ: '强生', HD: '家得宝', PG: '宝洁', BAC: '美国银行', ABBV: '艾伯维', UNH: '联合健康', KO: '可口可乐', CSCO: '思科',
  AMD: 'AMD', CVX: '雪佛龙', CRM: '赛富时', IBM: 'IBM', WFC: '富国银行', MRK: '默沙东', MCD: '麦当劳', PEP: '百事', QCOM: '高通',
  INTC: '英特尔', BA: '波音', CAT: '卡特彼勒', GS: '高盛', MS: '摩根士丹利', DIS: '迪士尼', MU: '美光', AMAT: '应用材料', LRCX: '泛林',
  KLAC: '科磊', TXN: '德州仪器', ADBE: 'Adobe', INTU: '财捷', ISRG: '直觉外科', PFE: '辉瑞', AMGN: '安进', GILD: '吉利德', NKE: '耐克',
  SBUX: '星巴克', UBER: '优步', PLTR: 'Palantir', SMCI: '超微电脑', DELL: '戴尔', HPQ: '惠普', HPE: '慧与', GE: '通用电气航空',
  GEV: 'GE Vernova', HON: '霍尼韦尔', LMT: '洛克希德·马丁', RTX: '雷神', GM: '通用汽车', F: '福特', AXP: '美国运通', BLK: '贝莱德',
  BX: '黑石', SCHW: '嘉信理财', C: '花旗', COP: '康菲石油', NEE: '新纪元能源', CEG: '星座能源', VST: 'Vistra', MPC: '马拉松原油',
  VLO: '瓦莱罗', PSX: 'Phillips 66', SWKS: '思佳讯', MRNA: '莫德纳', RVTY: '瑞孚迪', IQV: '艾昆纬', ELV: 'Elevance', CF: 'CF 工业',
  PFG: '信安金融', APA: 'APA', CRWD: 'CrowdStrike', FTNT: '飞塔', ANET: 'Arista', TMO: '赛默飞', ILMN: 'Illumina', FFIV: 'F5', VRSN: 'Verisign',
  TWLO: 'Twilio', NTAP: '美国网存', LITE: 'Lumentum', COHR: 'Coherent', CMG: 'Chipotle', LULU: 'Lululemon', ABNB: '爱彼迎',
  SPY: '标普 500 ETF', QQQ: '纳指 100 ETF', IWM: '罗素 2000 ETF', DIA: '道指 ETF', VOO: '标普 500 ETF（先锋）', VTI: '全市场 ETF', TLT: '20 年以上美债 ETF',
  GLD: '黄金 ETF', SMH: '半导体 ETF', RSP: '标普 500 等权 ETF', HYG: '高收益债 ETF', IEF: '7–10 年美债 ETF', SGOV: '0–3 个月美债 ETF',
  XLK: '信息技术 ETF', XLC: '通信服务 ETF', XLY: '可选消费 ETF', XLP: '必需消费 ETF', XLV: '医疗保健 ETF', XLF: '金融 ETF', XLI: '工业 ETF',
  XLE: '能源 ETF', XLB: '原材料 ETF', XLU: '公用事业 ETF', XLRE: '房地产 ETF',
};
const ECON = [
  [/^Fed Interest Rate Decision/, '美联储利率决议'], [/^FOMC Minutes/, 'FOMC 会议纪要'], [/^FOMC Press Conference/, '美联储新闻发布会'],
  [/^Non Farm Payrolls/, '非农就业'], [/^Unemployment Rate/, '失业率'], [/^Core Inflation Rate (MoM|YoY)/, '核心 CPI $1'], [/^Inflation Rate (MoM|YoY)/, 'CPI $1'],
  [/^Core PCE Price Index (MoM|YoY)/, '核心 PCE $1'], [/^PCE Price Index (MoM|YoY)/, 'PCE $1'], [/^Core PPI (MoM|YoY)/, '核心 PPI $1'], [/^PPI (MoM|YoY)/, 'PPI $1'],
  [/^Retail Sales (MoM|YoY)/, '零售销售 $1'], [/^Retail Sales Ex Autos/, '零售销售（除汽车）'], [/^GDP Growth Rate/, 'GDP 增速'], [/^ISM Manufacturing PMI/, 'ISM 制造业 PMI'],
  [/^ISM Services PMI/, 'ISM 服务业 PMI'], [/^Michigan Consumer Sentiment/, '密歇根消费者信心'], [/^Initial Jobless Claims/, '首次申领失业救济'],
  [/^Existing Home Sales/, '成屋销售'], [/^New Home Sales/, '新屋销售'], [/^Housing Starts/, '新屋开工'], [/^Building Permits/, '营建许可'],
  [/^Durable Goods Orders/, '耐用品订单'], [/^JOLTs Job Openings/, 'JOLTS 职位空缺'], [/^ADP Employment Change/, 'ADP 就业'], [/^CB Consumer Confidence/, '世企研消费者信心'],
  [/^Industrial Production/, '工业产出'], [/^Fed (.+?) Speech$/, '美联储 $1 讲话'],
];
const econName = n => { for (const [re, zh] of ECON) if (re.test(n)) return n.replace(re, zh); return n; };

// ---------- state ----------
let I = 0, issue, D, E, COL, BY;
const settings = {
  eq: Number(store.get('usmb-eq')) || 100000,
  risk: Number(store.get('usmb-risk')) || CFG.risk,
};
let holdings = (() => { try { return JSON.parse(store.get('usmb-holdings') || '[]'); } catch { return []; } })();
const nameOf = s => CN[s] || (BY[s] ? BY[s][COL.n] : s);
const KEYNAME = { core: '核心仓', s3: 'S3 趋势突破', s4: 'S4 趋势回调', s5: 'S5 放量跳空' };
const CAPNAME = c => (c >= 1 ? '满仓上限' : c >= 0.75 ? '七成五' : c >= 0.5 ? '半仓' : c > 0 ? '两成五' : '空仓');

function load(i) {
  I = i; issue = ISSUES[i]; D = issue.data; E = issue.edit;
  COL = Object.fromEntries(D.cols.map((c, j) => [c, j]));
  BY = Object.fromEntries(D.stocks.map(r => [r[COL.s], r]));
}
function quote(sym) {
  const r = BY[sym];
  if (r) return { c: r[COL.c], atr: r[COL.atr], s50: r[COL.s50], s200: r[COL.s200], h1m: r[COL.h1m], en: r[COL.en], chg: r[COL.chg] / 100, kind: 'stock' };
  const e = D.decision.etfs[sym];
  if (e && num(e.c)) return { c: e.c, atr: e.atr, s50: e.s50, s200: e.s200, h1m: e.h1m, en: null, chg: num(e.chg) ? e.chg / 100 : null, kind: 'etf' };
  return null;
}

// ---------- line chart ----------
function lineChart(el, { x, series, shadeTo, fmt }) {
  const W = 640, H = 220, L = 46, R = 70, T = 12, B = 26;
  const all = series.flatMap(s => s.v).filter(num);
  let lo = Math.min(...all), hi = Math.max(...all);
  const pad = (hi - lo) * 0.08 || 1; lo -= pad; hi += pad;
  const sx = i => L + (i / Math.max(x.length - 1, 1)) * (W - L - R);
  const sy = v => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
  const ticks = Array.from({ length: 4 }, (_, k) => lo + ((k + 0.5) * (hi - lo)) / 4);
  const xt = [0, Math.floor((x.length - 1) / 2), x.length - 1];
  const path = v => v.map((y, i) => (num(y) ? `${i && num(v[i - 1]) ? 'L' : 'M'}${sx(i).toFixed(1)},${sy(y).toFixed(1)}` : '')).join('');
  const ends = series.map(s => ({ s, y: sy(s.v[s.v.length - 1]) })).sort((a, b) => a.y - b.y);
  for (let k = 1; k < ends.length; k++) if (ends[k].y - ends[k - 1].y < 13) ends[k].y = ends[k - 1].y + 13;
  el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(series.map(s => s.n).join('、'))}">
    ${shadeTo > 0 ? `<rect class="replay" x="${L}" y="${T}" width="${(sx(shadeTo) - L).toFixed(1)}" height="${H - T - B}"></rect><text class="replay-l" x="${L + 6}" y="${T + 14}">规则回放</text>` : ''}
    <g class="grid">${ticks.map(t => `<line x1="${L}" x2="${W - R}" y1="${sy(t)}" y2="${sy(t)}"></line>`).join('')}</g>
    <g class="axis">${ticks.map(t => `<text x="${L - 6}" y="${sy(t) + 3.5}" text-anchor="end">${esc(fmt(t))}</text>`).join('')}
      ${xt.map((i, k) => `<text x="${sx(i)}" y="${H - 8}" text-anchor="${k === 0 ? 'start' : k === 2 ? 'end' : 'middle'}">${esc(x[i])}</text>`).join('')}</g>
    <line class="base" x1="${L}" x2="${W - R}" y1="${H - B}" y2="${H - B}"></line>
    ${series.map(s => `<path d="${path(s.v)}" fill="none" stroke="${s.color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"${s.dash ? ' stroke-dasharray="5 4"' : ''}></path>`).join('')}
    ${series.map(s => `<circle cx="${sx(s.v.length - 1)}" cy="${sy(s.v[s.v.length - 1])}" r="3.5" fill="${s.color}" stroke="var(--bg)" stroke-width="2"></circle>`).join('')}
    ${ends.map(({ s, y }) => `<text class="end" x="${W - R + 8}" y="${y + 4}">${esc(fmt(s.v[s.v.length - 1]))}</text>`).join('')}
    <line class="xh" y1="${T}" y2="${H - B}" x1="0" x2="0" visibility="hidden"></line>
    <rect class="hit" x="${L}" y="${T}" width="${W - L - R}" height="${H - T - B}"></rect></svg>
    <div class="tip glass" hidden></div>`;
  const svg = el.querySelector('svg'), tip = el.querySelector('.tip'), xh = el.querySelector('.xh');
  svg.querySelector('.hit').addEventListener('pointermove', ev => {
    const b = svg.getBoundingClientRect(), px = ((ev.clientX - b.left) / b.width) * W;
    const i = Math.max(0, Math.min(x.length - 1, Math.round(((px - L) / (W - L - R)) * (x.length - 1))));
    xh.setAttribute('x1', sx(i)); xh.setAttribute('x2', sx(i)); xh.setAttribute('visibility', 'visible');
    tip.innerHTML = `<b>${esc(x[i])}</b>${series.map(s => `<div class="r"><span>${esc(s.n)}</span><span>${esc(fmt(s.v[i]))}</span></div>`).join('')}`;
    tip.hidden = false;
    const left = (sx(i) / W) * b.width;
    tip.style.left = Math.min(Math.max(0, left + 12), b.width - tip.offsetWidth) + 'px';
  });
  svg.querySelector('.hit').addEventListener('pointerleave', () => { tip.hidden = true; xh.setAttribute('visibility', 'hidden'); });
}
const css = k => getComputedStyle(document.body).getPropertyValue(k).trim();

// ---------- cards ----------
function renderGate() {
  const dec = D.decision, r = dec.regime, cover = E.cover || {};
  const steps = CFG.volSteps, tgt = CFG.volTarget;
  // vol zones: the scaler is the largest step s with target / vol >= s
  const bounds = steps.map(s => tgt / s);
  const zones = steps.map((s, k) => ({ s, from: k ? bounds[k - 1] : 0, to: k < steps.length - 1 ? bounds[k] : 0.4 }));
  const W = 600, X = v => 10 + (Math.min(v, 0.4) / 0.4) * (W - 20);
  const ch = r.prevCap === r.cap ? '与上一交易日相同' : `上一交易日 ${pc0(r.prevCap)}`;
  $('#gate').innerHTML = `
    <div class="ch"><span class="eyebrow">今日结论 · ${esc(md(dec.session))} ${wd(dec.session)} 收盘后</span></div>
    <div><h1 style="font-size:21px;font-weight:900;line-height:1.4">${esc(cover.title)}</h1><p class="note" style="font-size:13.5px;margin-top:6px">${esc(cover.dek)}</p></div>
    <div class="ch"><h2 id="gate-h">仓位总闸</h2><span class="sub">${esc(BT.regime.model.n)} · ${esc(ch)}</span></div>
    <div class="cap"><div class="big num">${Math.round(r.cap * 100)}<small>%</small></div>
      <div class="lbl"><b>${CAPNAME(r.cap)}：股票仓位最多 ${pc0(r.cap)}</b>
        <div class="split" aria-hidden="true"><i class="core" style="flex:${r.coreW}"></i><i class="sat" style="flex:${r.satCap}"></i><i class="cash" style="flex:${Math.max(0, 1 - r.cap)}"></i></div>
        <div class="legend"><span><i style="background:var(--accent)"></i>核心仓 SPY ${pc0(r.coreW)}</span><span><i style="background:var(--accent-2)"></i>卫星仓 个股 ${pc0(r.satCap)}</span><span><i style="border:1px solid var(--line)"></i>现金 ${pc0(Math.max(0, 1 - r.cap))}</span></div></div></div>
    <div class="gauge"><svg viewBox="0 0 ${W} 58" role="img" aria-label="SPY 20 日年化波动 ${pc1(r.vol20)}，对应仓位 ${pc0(r.cap)}">
      ${zones.map(z => `<rect class="zone${z.s === r.volMult ? ' on' : ''}" x="${X(z.from)}" y="16" width="${Math.max(X(z.to) - X(z.from) - 2, 0)}" height="16" rx="4"></rect>
        <text class="zl${z.s === r.volMult ? ' on' : ''}" x="${(X(z.from) + X(z.to)) / 2}" y="28" text-anchor="middle">${Math.round(z.s * 100)}%</text>`).join('')}
      ${bounds.slice(0, -1).map(b => `<text class="tick" x="${X(b)}" y="46" text-anchor="middle">${Math.round(b * 100)}%</text>`).join('')}
      <text class="tick" x="${X(0)}" y="46">0</text><text class="tick" x="${X(0.4)}" y="46" text-anchor="end">40%+</text>
      <path class="mk" d="M${X(r.vol20) - 6},4 L${X(r.vol20) + 6},4 L${X(r.vol20)},14 Z"></path>
      <text class="mkl" x="${Math.min(Math.max(X(r.vol20), 60), W - 60)}" y="${56}" text-anchor="middle">SPY 20 日波动 ${pc1(r.vol20)}</text></svg>
      <p class="note">SPY 过去 20 个交易日的年化波动是 <b>${pc1(r.vol20)}</b>，${r.vol20 <= tgt ? `低于 ${pc0(tgt)} 的目标，仓位系数 1` : `高于 ${pc0(tgt)} 的目标，仓位系数降到 ${r.volMult}`}。波动越高，仓位越低：${zones.map(z => `${z.to >= 0.4 ? Math.round(z.from * 100) + '% 以上' : (z.from ? Math.round(z.from * 100) : 0) + '–' + Math.round(z.to * 100) + '%'} 对应 ${Math.round(z.s * 100)}%`).join('，')}。核心仓买 SPY，占 min(60%, 上限)；超出 60% 的部分给卫星仓个股。</p></div>
    ${(cover.points || []).length ? `<ul class="rules">${cover.points.map(p => `<li>${esc(p)}</li>`).join('')}</ul>` : ''}`;
}

function scaledOrder(o) {
  const mult = o.act === 'buy' ? settings.risk / CFG.risk : 1;
  let value = o.w * settings.eq * mult;
  if (o.act === 'buy') value = Math.min(value, CFG.maxPos * settings.eq);
  return { value, sh: o.act === 'sell' ? null : Math.floor(value / o.px) };
}
function renderOrders() {
  const dec = D.decision, r = dec.regime;
  const nextLbl = `${md(dec.next)} ${wd(dec.next)} 开盘`;
  const sat = dec.positions.filter(p => p.key !== 'core');
  const body = dec.orders.length ? `<div class="orders">${dec.orders.map(o => {
    const sc = scaledOrder(o), note = (E.notes || {})[o.s];
    const chip = o.act === 'buy' ? '<span class="pill buy">买入</span>' : o.act === 'sell' ? '<span class="pill sell">卖出</span>' : '<span class="pill adj">调整</span>';
    const qty = o.act === 'sell' ? '全部卖出<small>模拟组合 ' + o.sh + ' 股</small>' : o.act === 'adjust' ? `${sc.sh} 股<small>目标占净值 ${pc0(o.w)}</small>` : `${sc.sh} 股<small>约 ${usd(sc.value, 0)} · 占 ${pc1(sc.value / settings.eq)}</small>`;
    const pm = BY[o.s] && num(BY[o.s][COL.pm]) ? `<span>盘前 ${sp(BY[o.s][COL.pm] / 100, 1)}</span>` : '';
    return `<div class="order">${chip}<div class="tk">${esc(o.s)}<small>${esc(nameOf(o.s))}</small></div><div class="qty">${qty}</div>
      <div class="det"><span>参考价 <b>${usd(o.px)}</b></span>${o.stop ? `<span>止损 <b>${usd(o.stop)}</b>（成交价 − 2×ATR）</span><span>风险 <b>${pc1(settings.risk)}</b> 净值</span>` : ''}${o.act === 'adjust' ? `<span>现在 <b>${pc0(o.from)}</b> → 目标 <b>${pc0(o.w)}</b></span>` : ''}<span>${esc(KEYNAME[o.key] || o.key)}</span>${pm}</div>
      <p class="why">${esc(o.why)}${o.exit ? `。卖出条件：${esc(o.exit)}` : ''}</p>
      ${note && !isTodo(note.why) ? `<p class="why" style="color:var(--muted)">${esc(note.why)}</p>${sources(note.src)}` : ''}</div>`;
  }).join('')}</div>` : `<div class="empty"><b>今日无操作。</b><ul class="checks">
      <li>仓位上限 ${pc0(r.cap)}，核心仓 SPY 已在 ${pc0(r.coreW)} 的目标上</li>
      <li>${dec.candidates.filter(c => c.status === 'order').length ? '' : dec.candidates.length ? `${dec.candidates.length} 只股票满足条件，但都因名额、财报或预算跳过` : '没有股票同时满足趋势突破的 5 个条件'}</li>
      <li>${sat.length ? `${sat.length} 只卫星股都在止损和退出线之上` : '卫星仓没有持仓'}</li></ul></div>`;
  $('#orders').innerHTML = `<div class="ch"><h2 id="orders-h">今日指令</h2><span class="sub">对应 ${esc(nextLbl)} · 股数按你的净值 ${usd(settings.eq, 0)}、每笔风险 ${pc1(settings.risk)} 换算</span></div>${body}`;
}

function renderBook() {
  const dec = D.decision, L = dec.ledger;
  const rows = dec.positions.map(p => `<tr><td class="code">${esc(p.s)}<small>${esc(nameOf(p.s))}</small></td><td>${esc(KEYNAME[p.key] || p.key)}</td>
    <td class="n">${num(p.sh) ? (p.sh % 1 ? p.sh.toFixed(2) : p.sh) : '—'}</td><td class="n">${usd(p.fill)}</td><td class="n">${usd(p.c)}</td><td class="n">${sp(p.pnl)}</td>
    <td class="n">${pc1(p.w)}</td><td class="n">${p.stop ? usd(p.stop) : '—'}</td><td class="n">${p.trail ? usd(p.trail) : '—'}</td><td class="n">${p.bars ?? '—'}</td></tr>`).join('');
  $('#book').innerHTML = `<div class="ch"><h2 id="book-h">模拟组合持仓</h2><span class="sub">${usd(L.equity0, 0)} 起步 · ${esc(md(L.start))} 开始${L.liveFrom ? ` · ${esc(md(L.liveFrom))} 起实盘记录` : ' · 目前全部是规则回放'}</span></div>
    <div class="tbl"><table><thead><tr><th>代码</th><th>策略</th><th class="n">股数</th><th class="n">成本</th><th class="n">现价</th><th class="n">盈亏</th><th class="n">仓位</th><th class="n">止损</th><th class="n">退出线</th><th class="n">天数</th></tr></thead>
    <tbody>${rows}<tr class="foot"><td class="code">现金</td><td></td><td></td><td></td><td></td><td></td><td class="n">${pc1(L.cash / L.eq)}</td><td></td><td></td><td></td></tr></tbody></table></div>
    <p class="note">止损：盘中触及即卖出。退出线（S3）：最高收盘价 − 3×ATR，收盘跌破或跌破 50 日线就在下一个开盘卖出。</p>`;
}

function renderMine() {
  $('#acct-eq').value = settings.eq;
  $('#acct-risk').value = String(settings.risk);
  const r = D.decision.regime;
  if (!holdings.length) {
    $('#h-table').innerHTML = '<div class="empty">还没有录入持仓。添加后，这里会按同一套规则给出每只的止损价和建议：<b>持有、上移止损、减仓或卖出</b>。覆盖标普 500 成分股和常见指数 ETF（SPY、QQQ、IWM、VOO、TLT、GLD 等）。</div>';
    $('#h-bulk').value = '';
    return;
  }
  let total = 0;
  const rows = holdings.map((h, k) => {
    const q = quote(h.s);
    if (!q) return { h, k, html: `<tr><td class="code">${esc(h.s)}</td><td class="n">${h.sh}</td><td class="n">${usd(h.cost)}</td><td colspan="5" class="act"><span class="pill">不在覆盖范围</span></td><td><button class="x" type="button" data-del="${k}" aria-label="删除 ${esc(h.s)}">×</button></td></tr>` };
    const value = q.c * h.sh; total += value;
    const hardStop = h.cost - 2 * q.atr, trail = num(q.h1m) ? q.h1m - 3 * q.atr : null;
    const stop = Math.max(hardStop, trail ?? -Infinity);
    const pnl = q.c / h.cost - 1;
    let act, chip;
    if (q.c <= stop) { chip = 'sell'; act = `卖出：收盘 ${usd(q.c)} 已低于止损 ${usd(stop)}`; }
    else if (num(q.s200) && q.c < q.s200) { chip = 'sell'; act = `卖出：跌破 200 日线 ${usd(q.s200)}`; }
    else if (num(q.s50) && q.c < q.s50) { chip = 'warn'; act = `警戒：跌破 50 日线 ${usd(q.s50)}，止损 ${usd(stop)}`; }
    else if (trail != null && trail > hardStop && trail > h.cost) { chip = 'adj'; act = `持有，止损上移到 ${usd(stop)}（锁定盈利）`; }
    else { chip = 'live'; act = `持有，止损 ${usd(stop)}`; }
    const label = { sell: '卖出', warn: '警戒', adj: '上移止损', live: '持有' }[chip];
    const er = q.en && q.en >= D.decision.session && (new Date(q.en) - new Date(D.decision.session)) / 864e5 <= 7 ? ` · <span class="pill warn">${md(q.en)} 财报</span>` : '';
    return { h, k, value, html: `<tr><td class="code">${esc(h.s)}<small>${esc(nameOf(h.s))}</small></td><td class="n">${h.sh}</td><td class="n">${usd(h.cost)}</td><td class="n">${usd(q.c)}</td><td class="n">${sp(pnl)}</td>
      <td class="n" data-w="${k}"></td><td class="n">${usd(stop)}</td><td class="act"><span class="pill ${chip === 'live' ? 'live' : chip}">${label}</span> ${esc(act.replace(/^(卖出|警戒|持有)[：，]?/, ''))}${er}</td><td><button class="x" type="button" data-del="${k}" aria-label="删除 ${esc(h.s)}">×</button></td></tr>` };
  });
  const capVal = r.cap * settings.eq, over = total - capVal;
  $('#h-table').innerHTML = `<div class="tbl"><table><thead><tr><th>代码</th><th class="n">股数</th><th class="n">成本</th><th class="n">现价</th><th class="n">盈亏</th><th class="n">占净值</th><th class="n">止损</th><th>建议</th><th></th></tr></thead>
    <tbody>${rows.map(x => x.html).join('')}</tbody></table></div>
    <p class="note">止损 = max(成本 − 2×ATR, 1 个月最高价 − 3×ATR)。股票合计 <b>${usd(total, 0)}</b>，占净值 <b>${pc1(total / settings.eq)}</b>；仓位上限 ${pc0(r.cap)}，${over > settings.eq * 0.01 ? `<b>超出 ${usd(over, 0)}，先减「卖出」「警戒」和浮亏最大的仓位</b>` : '在上限之内'}。</p>`;
  for (const x of rows) { const td = document.querySelector(`[data-w="${x.k}"]`); if (td && x.value) td.textContent = pc1(x.value / settings.eq); }
  $('#h-bulk').value = holdings.map(h => `${h.s},${h.cost},${h.sh}`).join('\n');
}
function saveHoldings() { store.set('usmb-holdings', JSON.stringify(holdings)); renderMine(); }
$('#h-form').addEventListener('submit', e => {
  e.preventDefault();
  const s = $('#h-sym').value.trim().toUpperCase().replace('/', '.'), cost = Number($('#h-cost').value), sh = Number($('#h-sh').value);
  if (!s || !(cost > 0) || !(sh > 0)) { $('#h-msg').textContent = '请填写代码、成本价和股数，成本和股数要大于 0。'; return; }
  holdings = holdings.filter(h => h.s !== s).concat({ s, cost, sh });
  $('#h-msg').textContent = quote(s) ? `已添加 ${s}。` : `已添加 ${s}，但它不在覆盖范围内，无法计算止损。`;
  e.target.reset();
  saveHoldings();
});
$('#h-table').addEventListener('click', e => { const b = e.target.closest('[data-del]'); if (!b) return; holdings.splice(Number(b.dataset.del), 1); $('#h-msg').textContent = '已删除。'; saveHoldings(); });
$('#h-import').addEventListener('click', () => {
  const rows = $('#h-bulk').value.split('\n').map(l => l.trim()).filter(Boolean).map(l => l.split(/[,\s，]+/));
  const ok = rows.filter(r => r.length >= 3 && Number(r[1]) > 0 && Number(r[2]) > 0).map(r => ({ s: r[0].toUpperCase(), cost: Number(r[1]), sh: Number(r[2]) }));
  if (!ok.length) { $('#h-msg').textContent = '没有识别到有效的行。格式：代码,成本价,股数'; return; }
  holdings = ok;
  $('#h-msg').textContent = `已导入 ${ok.length} 只${rows.length > ok.length ? `，跳过 ${rows.length - ok.length} 行格式不对的` : ''}。`;
  saveHoldings();
});
$('#h-copy').addEventListener('click', () => {
  const t = $('#h-bulk');
  navigator.clipboard?.writeText(t.value).then(() => { $('#h-msg').textContent = '已复制。'; }, () => { t.select(); $('#h-msg').textContent = '已选中文本，请手动复制。'; }) ?? (t.select());
});
$('#acct-eq').addEventListener('change', e => { const v = Number(e.target.value); if (v >= 1000) { settings.eq = v; store.set('usmb-eq', v); renderOrders(); renderMine(); } });
$('#acct-risk').addEventListener('change', e => { settings.risk = Number(e.target.value); store.set('usmb-risk', settings.risk); renderOrders(); });

function renderPerf() {
  const dec = D.decision, L = dec.ledger, cv = dec.curve;
  const liveIdx = cv.findIndex(x => !x[3]);
  const shade = liveIdx < 0 ? cv.length - 1 : liveIdx;
  $('#perf').innerHTML = `<div class="ch"><h2 id="perf-h">模拟组合</h2><span class="sub">${esc(md(L.start))} 起 · 和 SPY 买入持有同期对比</span></div>
    <div class="tiles">
      <div class="tile"><span class="k">组合收益</span><span class="v ${cls(L.ret)}">${sgn(L.ret)}</span><span class="d">净值 ${usd(L.eq, 0)}</span></div>
      <div class="tile"><span class="k">SPY 同期</span><span class="v ${cls(L.spyRet)}">${sgn(L.spyRet)}</span><span class="d">差 ${sgn(L.ret - L.spyRet)}</span></div>
      <div class="tile"><span class="k">距净值高点</span><span class="v ${cls(L.dd)}">${sgn(L.dd)}</span><span class="d">回撤 8% 时风险减半</span></div>
      <div class="tile"><span class="k">已平仓</span><span class="v">${L.trades}<small style="font-size:12px;color:var(--muted)"> 笔</small></span><span class="d">胜率 ${L.win == null ? '—' : pc0(L.win)}</span></div></div>
    <div class="chart" id="perf-chart"></div>
    <div class="legend"><span><i class="ln" style="border-color:var(--accent)"></i>模拟组合</span><span><i class="dash" style="border-color:var(--bench)"></i>SPY 买入持有</span>${shade > 0 ? '<span><i style="background:var(--line-soft)"></i>规则回放（非实盘）</span>' : ''}</div>
    ${L.recent.length ? `<div><span class="eyebrow">最近平仓</span><div class="trades" style="margin-top:6px">${L.recent.map(t => `<div><span class="num" style="font-weight:800">${esc(t.s)}</span><span class="why">${esc(md(t.fillDate))} → ${esc(md(t.exitDate))} · ${esc(t.why)}</span><span class="num ${cls(t.r)}">${sgn(t.r)}${num(t.R) ? ` · ${t.R > 0 ? '+' : ''}${t.R}R` : ''}</span></div>`).join('')}</div></div>` : ''}`;
  lineChart($('#perf-chart'), { x: cv.map(c => md(c[0])), shadeTo: shade, fmt: v => usd(v, 0),
    series: [{ n: 'SPY 买入持有', v: cv.map(c => c[2]), color: css('--bench'), dash: true }, { n: '模拟组合', v: cv.map(c => c[1]), color: css('--accent') }] });
}

function renderCands() {
  const dec = D.decision;
  const live = dec.candidates;
  const st = c => (c.status === 'order' ? '<span class="pill buy">下单</span>' : c.status === 'held' ? '<span class="pill live">已持有</span>' : `<span class="pill">跳过</span>`);
  const ev = (dec.events || []).slice(0, 8);
  $('#cands').innerHTML = `<div class="ch"><h2 id="cands-h">候选池</h2><span class="sub">S3 趋势突破 · 标普 500 · ${esc(md(dec.session))} 收盘</span></div>
    ${live.length ? `<div class="cands">${live.map(c => { const n = (E.notes || {})[c.s]; return `<article><div class="tk">${esc(c.s)}<small>${esc(nameOf(c.s))}</small></div><div>${st(c)}</div>
      <div class="meta"><span>收盘 ${usd(c.c)}</span><span>6 个月 ${sp(c.m6 / 100, 0)}</span><span>相对量 ${num(c.rv) ? c.rv.toFixed(1) + '×' : '—'}</span><span>估算止损 ${usd(c.stop)}</span>${c.reason ? `<span>${esc(c.reason)}</span>` : ''}${c.flags.map(f => `<span class="pill warn">${esc(f)}</span>`).join('')}</div>
      ${n && !isTodo(n.why) ? `<p class="why">${esc(n.why)}</p>${sources(n.src)}` : ''}</article>`; }).join('')}</div>`
    : `<div class="empty"><b>没有股票同时满足 5 个条件：</b><ul class="checks"><li>收盘 &gt; 50 日线 &gt; 200 日线</li><li>当天创 1 个月新高</li><li>收盘距 52 周高点不超过 5%</li><li>6 个月涨幅排在标普 500 前 20%</li><li>成交量 ≥ 10 日均量的 1.5 倍</li></ul></div>`}
    <div><span class="eyebrow">未来 7 天的高风险事件</span><div class="events" style="margin-top:6px">${ev.length ? ev.map(e => `<div><span class="num" style="color:var(--muted)">${md(ptDate(e.t))} ${ptTime(e.t)} PT</span><span>${esc(econName(e.n))}${num(e.f) ? `<span style="color:var(--faint)"> · 预期 ${esc(e.f)}${esc(e.u)}</span>` : ''}</span></div>`).join('') : '<div><span>—</span><span>没有高重要性的美国经济数据</span></div>'}</div>
    <p class="note" style="margin-top:6px">这些日子波动通常更大；规则不因此改变，只提醒你下单时留意。</p></div>`;
}

function renderScore() {
  const b = BT, s3 = b.strat.s3, model = b.regime.models.find(m => m.id === b.regime.model.id);
  const row = (n, st, status, sub = '') => `<tr${status === 'live' ? ' class="hi"' : ''}><td class="wrap">${n}${sub ? `<small style="display:block;color:var(--faint);font-size:11px">${sub}</small>` : ''}</td>
    <td class="n">${pc1(st.cagr)}</td><td class="n">${pc1(st.mdd)}</td><td class="n">${st.sharpe.toFixed(2)}</td>
    <td>${status === 'live' ? '<span class="pill live">上线</span>' : status === 'bench' ? '<span class="pill">基准</span>' : '<span class="pill">观察</span>'}</td></tr>`;
  const st = k => b.strat[k];
  $('#score').innerHTML = `<div class="ch"><h2 id="score-h">策略成绩单</h2><span class="sub">回测 ${esc(b.window[0])} → ${esc(b.window[1])} · 次日开盘成交 · 单边成本 ${(b.cost * 1e4).toFixed(0)} 个基点</span></div>
    <div class="tbl"><table><thead><tr><th>策略</th><th class="n">年化</th><th class="n">最大回撤</th><th class="n">夏普</th><th>状态</th></tr></thead><tbody>
      ${row('SPY 买入持有', b.bench.SPY, 'bench')}
      ${row('组合：核心 SPY + 卫星 S3', b.total, 'live', '实际执行的组合，两仓按 60/40 每日再平衡近似')}
      ${row('仓位总闸 × SPY', b.regime.final, 'live', `${esc(model.n)}，平均仓位 ${pc0(b.regime.timeIn)}`)}
      ${row('S3 趋势突破（卫星仓单独）', s3.sleeve, 'live', `${s3.filtered.n} 笔 · 胜率 ${pc0(s3.filtered.win)} · 盈亏比 ${s3.filtered.payoff.toFixed(2)} · 每笔 ${sgn(s3.filtered.exp)}（${s3.filtered.expR.toFixed(2)}R）· 平均持有 ${s3.filtered.hold.toFixed(0)} 天`)}
      ${row('S4 趋势回调', st('s4').sleeve, st('s4').live ? 'live' : 'obs', `每笔 ${st('s4').filtered.expR.toFixed(2)}R，扣成本后几乎没有优势`)}
      ${row('S5 放量跳空', st('s5').sleeve, st('s5').live ? 'live' : 'obs', `每笔 ${st('s5').filtered.expR.toFixed(2)}R，期望为负`)}
      ${row('板块轮动（前 3 名）', b.rotation, b.rotation.live ? 'live' : 'obs', `换成 SPY 后夏普从 ${b.rotation.core.sharpe.toFixed(2)} 升到 ${b.core.sharpe.toFixed(2)}`)}
      ${row('个股等权', b.bench.EW_UNIV, 'bench', '当前成分股，有幸存者偏差；S3 的对照基准')}
    </tbody></table></div>
    <div class="chart" id="bt-chart"></div>
    <div class="legend"><span><i class="ln" style="border-color:var(--accent)"></i>组合</span><span><i class="ln" style="border-color:var(--accent-2)"></i>仓位总闸 × SPY</span><span><i class="dash" style="border-color:var(--bench)"></i>SPY 买入持有</span></div>
    <details><summary>为什么只用波动率？4 个择时模型的前后半段对比</summary>
      <div class="tbl"><table><thead><tr><th>模型</th><th class="n">夏普 前半</th><th class="n">后半</th><th class="n">最大回撤</th><th class="n">年化</th></tr></thead><tbody>
      ${b.regime.models.map(m => `<tr${m.id === b.regime.model.id ? ' class="hi"' : ''}><td class="wrap">${esc(m.n)}</td><td class="n">${m.halves[0].sharpe.toFixed(2)}</td><td class="n">${m.halves[1].sharpe.toFixed(2)}</td><td class="n">${pc1(m.stats.mdd)}</td><td class="n">${pc1(m.stats.cagr)}</td></tr>`).join('')}
      <tr class="foot"><td>SPY 买入持有</td><td class="n">${b.regime.spyHalves[0].sharpe.toFixed(2)}</td><td class="n">${b.regime.spyHalves[1].sharpe.toFixed(2)}</td><td class="n">${pc1(b.bench.SPY.mdd)}</td><td class="n">${pc1(b.bench.SPY.cagr)}</td></tr></tbody></table></div>
      <p class="note">分段点 ${esc(b.regime.split)}。选模型的规则：取前后两段中较差那段的夏普，最高者上线，打平时选输入更少的。趋势、宽度、波动结构、信用、动能 5 项信号单独或组合使用，都没有超过只按波动率调仓。</p></details>`;
  const c = b.curves;
  lineChart($('#bt-chart'), { x: c.d, fmt: v => v.toFixed(2) + '×',
    series: [{ n: 'SPY 买入持有', v: c.spy, color: css('--bench'), dash: true }, { n: '仓位总闸 × SPY', v: c.regime, color: css('--accent-2') }, { n: '组合', v: c.total, color: css('--accent') }] });
}

function renderHow() {
  const s = D.src;
  $('#how').innerHTML = `<div class="ch"><h2 id="how-h">规则与局限</h2></div>
    <ul class="rules">
      <li><b>仓位上限</b>：${pc0(CFG.volTarget)} ÷ SPY 20 日年化波动，取 100% / 75% / 50% / 25% 中不超过它的最大一档。</li>
      <li><b>核心仓</b>：SPY，占 min(60%, 上限)。上限变化时在下一个开盘调整。</li>
      <li><b>卫星仓</b>：上限超过 60% 的部分。S3 趋势突破：收盘 &gt; 50 日线 &gt; 200 日线、创 1 个月新高、距 52 周高点 ≤ 5%、6 个月涨幅前 20%、成交量 ≥ 1.5 倍 10 日均量。</li>
      <li><b>买卖</b>：信号出现后的下一个开盘买入；止损 = 成交价 − 2×ATR，盘中触及即卖；收盘跌破 50 日线或最高收盘 − 3×ATR，下一个开盘卖出。</li>
      <li><b>仓位大小</b>：每笔亏到止损只损失净值的 0.5%；单只不超过 10%；最多 8 只，同一板块最多 2 只；5 个交易日内发财报的不开新仓。</li>
      <li><b>局限</b>：回测只有 2017-11 至今约 9 年，不含 2008 年；价格不含分红，现金收益按 0 计；个股规则用的是当前成分股，有幸存者偏差，收益偏乐观；模型是在同一段数据上挑出来的。这些是公开的系统化规则，不是个人投资建议。</li>
    </ul>
    <div class="src" style="flex-direction:column;gap:5px">${Object.values(s).map(([n, u]) => `<a href="${esc(href(u))}" target="_blank" rel="noopener">${esc(n)}</a>`).join('')}</div>
    <p class="note">本期编辑于 <span class="num">${esc(E.edited)}</span>；行情抓取于 <span class="num">${esc(new Date(D.fetched).toLocaleString('zh-CN', { timeZone: 'America/Los_Angeles', hour12: false }))}</span> PT${D.decision.asof ? '；本期收盘数据由历史行情重建' : ''}。${D.warn && D.warn.length ? ' 数据提示：' + esc(D.warn.join('；')) : ''}</p>`;
}

function render(i) {
  load(i);
  $('#brand-sub').textContent = `Decision Desk · ${issue.date.replace(/-/g, '.')} · No.${String(E.no).padStart(3, '0')}`;
  renderGate(); renderOrders(); renderBook(); renderMine(); renderPerf(); renderCands(); renderScore(); renderHow();
}

const pick = $('#issue-pick');
pick.innerHTML = ISSUES.map((it, i) => `<option value="${i}">${esc(md(it.date))} ${wd(it.date)} · No.${String(it.edit.no).padStart(3, '0')}</option>`).join('');
pick.addEventListener('change', () => render(Number(pick.value)));

function setUpDown(m) {
  document.body.dataset.updown = m;
  $('#ud-cn').setAttribute('aria-pressed', String(m === 'cn'));
  $('#ud-us').setAttribute('aria-pressed', String(m === 'us'));
  store.set('usmb-updown', m);
}
$('#ud-cn').addEventListener('click', () => setUpDown('cn'));
$('#ud-us').addEventListener('click', () => setUpDown('us'));
setUpDown(store.get('usmb-updown') === 'us' ? 'us' : 'cn');
render(0);
const rerender = () => { renderPerf(); renderScore(); };
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', rerender);
new MutationObserver(rerender).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
