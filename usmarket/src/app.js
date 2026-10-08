// Renders one issue of 美股晨报 from the embedded archive (newest first). The only external load is d3 for the heat map.
const ISSUES = JSON.parse(document.getElementById('issues-data').textContent);
const $ = s => document.querySelector(s);
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const href = u => (/^https:\/\//.test(u) ? u : '#');
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* storage blocked */ } },
};

const WEEK = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
const STATUS = { pre: '盘前', open: '盘中', post: '盘后', closed: '休市' };
const SCALE = { c: 3, pm: 3, w: 6, m: 10, ytd: 40 };
const MODE_NAME = { pm: '盘前涨跌', w: '近一周涨跌', m: '近一月涨跌', ytd: '年初至今涨跌' };

// Chinese names for the names readers know best; everything else shows the English name.
const CN = {
  NVDA: '英伟达', AAPL: '苹果', MSFT: '微软', GOOGL: '谷歌 A', GOOG: '谷歌 C', AMZN: '亚马逊', META: 'Meta', AVGO: '博通', TSLA: '特斯拉',
  'BRK.B': '伯克希尔', LLY: '礼来', JPM: '摩根大通', V: 'Visa', MA: '万事达', WMT: '沃尔玛', ORCL: '甲骨文', XOM: '埃克森美孚',
  NFLX: '奈飞', COST: '好市多', JNJ: '强生', HD: '家得宝', PG: '宝洁', BAC: '美国银行', ABBV: '艾伯维', UNH: '联合健康', KO: '可口可乐',
  CSCO: '思科', AMD: 'AMD', CVX: '雪佛龙', CRM: '赛富时', IBM: 'IBM', WFC: '富国银行', MRK: '默沙东', MCD: '麦当劳', PEP: '百事',
  QCOM: '高通', INTC: '英特尔', BA: '波音', CAT: '卡特彼勒', GS: '高盛', MS: '摩根士丹利', DIS: '迪士尼', MU: '美光', AMAT: '应用材料',
  LRCX: '泛林', KLAC: '科磊', TXN: '德州仪器', ADBE: 'Adobe', INTU: '财捷', ISRG: '直觉外科', PFE: '辉瑞', AMGN: '安进', GILD: '吉利德',
  NKE: '耐克', SBUX: '星巴克', UBER: '优步', PLTR: 'Palantir', SMCI: '超微电脑', DELL: '戴尔', HPQ: '惠普', HPE: '慧与', GE: '通用电气航空',
  GEV: 'GE Vernova', HON: '霍尼韦尔', LMT: '洛克希德·马丁', RTX: '雷神', NOC: '诺斯罗普', GD: '通用动力', GM: '通用汽车', F: '福特',
  UPS: 'UPS', FDX: '联邦快递', AXP: '美国运通', BLK: '贝莱德', BX: '黑石', SCHW: '嘉信理财', C: '花旗', COP: '康菲石油', NEE: '新纪元能源',
  CEG: '星座能源', VST: 'Vistra', OXY: '西方石油', SLB: '斯伦贝谢', CMG: 'Chipotle', TGT: '塔吉特', LOW: '劳氏', ABNB: '爱彼迎',
  BKNG: 'Booking', PYPL: 'PayPal', ANET: 'Arista', MRVL: '迈威尔', ADI: '亚德诺', NOW: 'ServiceNow', PANW: '派拓网络', CRWD: 'CrowdStrike',
  SNPS: '新思科技', CDNS: '楷登电子', TMO: '赛默飞', ABT: '雅培', DHR: '丹纳赫', BMY: '百时美施贵宝', CVS: 'CVS 健康', CI: '信诺',
  HUM: 'Humana', ELV: 'Elevance', VRTX: '福泰制药', REGN: '再生元', MDT: '美敦力', SYK: '史赛克', T: 'AT&T', VZ: '威瑞森', TMUS: 'T-Mobile',
  CMCSA: '康卡斯特', CHTR: '特许通讯', WBD: '华纳兄弟探索', EA: '艺电', TTWO: 'Take-Two', MO: '奥驰亚', PM: '菲利普莫里斯', MDLZ: '亿滋',
  CL: '高露洁', KHC: '卡夫亨氏', KMB: '金佰利', DE: '迪尔', MMM: '3M', UNP: '联合太平洋', LIN: '林德', SHW: '宣伟', FCX: '自由港',
  NEM: '纽蒙特', DOW: '陶氏', DD: '杜邦', DUK: '杜克能源', SO: '南方电力', AMT: '美国铁塔', PLD: '安博', EQIX: 'Equinix', SPG: '西蒙地产',
  O: 'Realty Income', MPC: '马拉松原油', VLO: '瓦莱罗', PSX: 'Phillips 66', EOG: 'EOG 资源', APA: 'APA', HAL: '哈里伯顿', COIN: 'Coinbase',
  HOOD: 'Robinhood', MSTR: 'Strategy', APP: 'AppLovin', DDOG: 'Datadog', WDAY: 'Workday', ADSK: '欧特克', FTNT: '飞塔', ON: '安森美',
  NXPI: '恩智浦', MCHP: '微芯', SWKS: '思佳讯', WDC: '西部数据', STX: '希捷', COHR: 'Coherent', GLW: '康宁', JBL: '捷普', TER: '泰瑞达',
  LULU: 'Lululemon', ROST: 'Ross', TJX: 'TJX', ORLY: "O'Reilly", AZO: 'AutoZone', YUM: '百胜', DPZ: '达美乐', MAR: '万豪', HLT: '希尔顿',
  CCL: '嘉年华', RCL: '皇家加勒比', DAL: '达美航空', UAL: '美联航', LUV: '西南航空', LVS: '金沙', WYNN: '永利', MGM: '美高梅',
};

const pct = v => (typeof v === 'number' ? (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(2) + '%' : '—');
const cls = v => (typeof v === 'number' ? (v > 0 ? 'up' : v < 0 ? 'dn' : 'flat') : 'flat');
const pc = v => `<span class="${cls(v)}">${pct(v)}</span>`;
const bp = v => (typeof v === 'number' ? `<span class="${cls(v)}">${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(1)}bp</span>` : '—');
const px = v => (typeof v !== 'number' ? '—' : Math.abs(v) >= 1000 ? v.toLocaleString('en-US', { maximumFractionDigits: 2 }) : Math.abs(v) < 20 ? String(v) : v.toFixed(2));
const capUsd = v => (typeof v !== 'number' ? '—' : v >= 1000 ? `$${(v / 1000).toFixed(2)}T` : `$${v.toFixed(v >= 100 ? 0 : 1)}B`);
const md = d => `${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))}`;
const wd = d => WEEK[new Date(d + 'T12:00:00Z').getUTCDay()];
const ptTime = iso => new Date(iso).toLocaleTimeString('en-GB', { timeZone: 'America/Los_Angeles', hour: '2-digit', minute: '2-digit' });
const etDate = iso => new Date(iso).toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
const sources = src => (src && src.length ? `<div class="src">${src.map(([n, u]) => `<a href="${esc(href(u))}" target="_blank" rel="noopener">${esc(n)}</a>`).join('')}</div>` : '');

const ECON = [
  [/^Fed (.+?) Speech$/, '美联储 $1 讲话'], [/^Fed (.+?) Testimony$/, '美联储 $1 国会证词'], [/^FOMC Minutes/, 'FOMC 会议纪要'],
  [/^Fed Interest Rate Decision/, '美联储利率决议'], [/^FOMC Press Conference/, '美联储新闻发布会'], [/^FOMC Economic Projections/, 'FOMC 经济预测'],
  [/^Initial Jobless Claims/, '首次申领失业救济'], [/^Continuing Jobless Claims/, '持续申领失业救济'], [/^Jobless Claims 4-week Average/, '首申四周均值'],
  [/^Non Farm Payrolls/, '非农就业'], [/^Unemployment Rate/, '失业率'], [/^Average Hourly Earnings (MoM|YoY)/, '平均时薪 $1'],
  [/^ADP Employment Change/, 'ADP 就业'], [/^JOLTs Job Openings/, 'JOLTS 职位空缺'], [/^Challenger Job Cuts/, '挑战者裁员'],
  [/^Core Inflation Rate (MoM|YoY)/, '核心 CPI $1'], [/^Inflation Rate (MoM|YoY)/, 'CPI $1'], [/^CPI$/, 'CPI 指数'],
  [/^Core PCE Price Index (MoM|YoY)/, '核心 PCE $1'], [/^PCE Price Index (MoM|YoY)/, 'PCE $1'], [/^Core PPI (MoM|YoY)/, '核心 PPI $1'], [/^PPI (MoM|YoY)/, 'PPI $1'],
  [/^Retail Sales Ex Autos (MoM)/, '零售销售（除汽车）$1'], [/^Retail Sales (MoM|YoY)/, '零售销售 $1'], [/^GDP Growth Rate QoQ/, 'GDP 季环比年化'],
  [/^GDP Price Index/, 'GDP 价格指数'], [/^ISM Manufacturing PMI/, 'ISM 制造业 PMI'], [/^ISM Services PMI/, 'ISM 服务业 PMI'],
  [/^S&P Global Manufacturing PMI/, '标普全球制造业 PMI'], [/^S&P Global Services PMI/, '标普全球服务业 PMI'], [/^S&P Global Composite PMI/, '标普全球综合 PMI'],
  [/^Michigan Consumer Sentiment/, '密歇根消费者信心'], [/^Michigan (\d+)-Year Inflation Expectations/, '密歇根 $1 年通胀预期'],
  [/^CB Consumer Confidence/, '世企研消费者信心'], [/^EIA Crude Oil Stocks Change/, 'EIA 原油库存'], [/^EIA Gasoline Stocks Change/, 'EIA 汽油库存'],
  [/^EIA Natural Gas Stocks Change/, 'EIA 天然气库存'], [/^EIA Distillate Stocks Change/, 'EIA 馏分油库存'], [/^EIA Refinery Crude Runs Change/, 'EIA 炼厂开工'],
  [/^EIA Crude Oil Imports Change/, 'EIA 原油进口'], [/^EIA Cushing Crude Oil Stocks Change/, 'EIA 库欣原油库存'], [/^EIA Heating Oil Stocks Change/, 'EIA 取暖油库存'],
  [/^EIA Gasoline Production Change/, 'EIA 汽油产量'], [/^EIA Distillate Fuel Production Change/, 'EIA 馏分油产量'],
  [/^API Crude Oil Stock Change/, 'API 原油库存'], [/^(\d+)-Year Note Auction/, '$1 年期国债拍卖'], [/^(\d+)-Year Bond Auction/, '$1 年期国债拍卖'],
  [/^(\d+)-Year TIPS Auction/, '$1 年期 TIPS 拍卖'], [/^(\d+)-Week Bill Auction/, '$1 周国库券拍卖'], [/^(\d+)-Month Bill Auction/, '$1 个月国库券拍卖'],
  [/^MBA 30-Year Mortgage Rate/, 'MBA 30 年房贷利率'], [/^MBA Mortgage Applications/, 'MBA 房贷申请'], [/^MBA Purchase Index/, 'MBA 购房指数'],
  [/^MBA Mortgage Refinance Index/, 'MBA 再融资指数'], [/^MBA Mortgage Market Index/, 'MBA 房贷市场指数'],
  [/^Wholesale Inventories/, '批发库存'], [/^Consumer Credit/, '消费信贷'], [/^Building Permits/, '营建许可'], [/^Housing Starts/, '新屋开工'],
  [/^Existing Home Sales/, '成屋销售'], [/^New Home Sales/, '新屋销售'], [/^Pending Home Sales/, '成屋签约'], [/^Durable Goods Orders/, '耐用品订单'],
  [/^Industrial Production/, '工业产出'], [/^Balance of Trade/, '贸易差额'], [/^Baker Hughes (Oil |Total )?Rig Count/, '贝克休斯钻井数'],
  [/^Monthly Budget Statement/, '月度财政预算'], [/^Fed Balance Sheet/, '美联储资产负债表'], [/^NY Empire State Manufacturing/, '纽约州制造业指数'],
  [/^Philadelphia Fed Manufacturing/, '费城联储制造业指数'], [/^Import Prices/, '进口价格'], [/^Export Prices/, '出口价格'], [/^Factory Orders/, '工厂订单'],
  [/^Business Inventories/, '企业库存'], [/^Personal Income/, '个人收入'], [/^Personal Spending/, '个人支出'], [/^NFIB Business Optimism/, 'NFIB 小企业信心'],
  [/^Total Vehicle Sales/, '汽车销量'], [/^Retail Inventories Ex Autos/, '零售库存（除汽车）'], [/^Goods Trade Balance/, '商品贸易差额'],
  [/^Chicago PMI/, '芝加哥 PMI'], [/^Dallas Fed/, '达拉斯联储制造业指数'], [/^Richmond Fed/, '里士满联储制造业指数'], [/^Kansas Fed/, '堪萨斯联储制造业指数'],
  [/^Fed (.+)$/, '美联储 $1'],
];
const econName = n => { for (const [re, zh] of ECON) if (re.test(n)) return n.replace(re, zh); return null; };

// ---------- state ----------
let issue = ISSUES[0];
let D, E, COL, BY;
let mode = 'c';
let sector = null;
let selected = null;
let tab = 'sum';

function load(i) {
  issue = ISSUES[i];
  D = issue.data;
  E = issue.edit;
  COL = Object.fromEntries(D.cols.map((c, j) => [c, j]));
  BY = {};
  for (const r of D.stocks) BY[r[COL.s]] = r;
  if (mode === 'pm' && D.status !== 'pre') mode = 'c';
  if (D.kind === 'weekly' && mode === 'c') mode = 'w';
  sector = null;
  selected = null;
}
const v = (row, k) => row[COL[k]];
const cMetric = () => (D.kind === 'weekly' ? 'w' : 'c');
const closeLabel = () => (D.session === issue.date ? (D.status === 'open' ? '盘中' : '今日收盘') : `前收 ${md(D.session)}`);
const modeName = m => (m === 'c' ? (D.session === issue.date && D.status === 'open' ? '盘中涨跌' : `${md(D.session)} 收盘涨跌`) : MODE_NAME[m]);
const nameOf = s => CN[s] || (BY[s] ? v(BY[s], 'n') : s);
const enName = s => (BY[s] ? v(BY[s], 'n') : '');

// ---------- heat map ----------
let cssVars = {};
function readVars() {
  const cs = getComputedStyle(document.body);
  for (const k of ['--tile-mid', '--pos-1', '--pos-2', '--pos-3', '--neg-1', '--neg-2', '--neg-3', '--ink', '--bg']) cssVars[k] = cs.getPropertyValue(k).trim();
}
function colorScale(m) {
  const s = SCALE[m];
  return d3.scaleLinear()
    .domain([-s, -s * 0.5, -s * 0.12, 0, s * 0.12, s * 0.5, s])
    .range([cssVars['--neg-3'], cssVars['--neg-2'], cssVars['--neg-1'], cssVars['--tile-mid'], cssVars['--pos-1'], cssVars['--pos-2'], cssVars['--pos-3']])
    .interpolate(d3.interpolateLab).clamp(true);
}

function drawMap() {
  const host = $('#map');
  const W = host.clientWidth, H = host.clientHeight;
  if (!W || !H || typeof d3 === 'undefined') return;
  const color = colorScale(mode);
  const zoom = sector !== null;
  const groups = zoom
    ? d3.groups(D.stocks.filter(r => v(r, 'g') === sector), r => D.inds[v(r, 'i')])
    : D.sectors.map((s, gi) => [gi, D.stocks.filter(r => v(r, 'g') === gi)]);
  const root = d3.hierarchy({ children: groups.map(([key, rows]) => ({ key, children: rows.map(r => ({ r })) })) })
    .sum(d => (d.r ? Math.max(v(d.r, 'mc') || 0, 0.5) : 0))
    .sort((a, b) => b.value - a.value);
  d3.treemap().size([W, H]).tile(d3.treemapSquarify.ratio(1.2)).paddingOuter(2).paddingTop(d => (d.depth === 1 ? 17 : 0)).paddingInner(1).round(true)(root);

  const svg = d3.create('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('width', W).attr('height', H);
  for (const g of root.children || []) {
    const gw = g.x1 - g.x0;
    svg.append('rect').attr('class', 'sec-box').attr('x', g.x0 + 0.5).attr('y', g.y0 + 0.5).attr('width', Math.max(gw - 1, 0)).attr('height', Math.max(g.y1 - g.y0 - 1, 0)).attr('rx', 4);
    if (gw > 46) {
      const label = zoom ? g.data.key : D.sectors[g.data.key].n;
      const sv = zoom ? null : D.sectors[g.data.key][mode === 'c' ? 'c' : mode];
      const t = svg.append('text').attr('class', 'sec-h').attr('x', g.x0 + 5).attr('y', g.y0 + 12.5);
      const maxChars = Math.floor((gw - 10) / 11.5);
      t.append('tspan').text(label.length > maxChars ? label.slice(0, Math.max(maxChars - 1, 1)) + '…' : label);
      if (sv != null && gw > 110) t.append('tspan').attr('class', `v`).attr('dx', 6).attr('fill', 'currentColor').text(pct(sv));
    }
  }
  const leaves = root.leaves();
  for (const lf of leaves) {
    const r = lf.data.r;
    const val = v(r, mode);
    const w = lf.x1 - lf.x0, h = lf.y1 - lf.y0;
    const fill = typeof val === 'number' ? color(val) : cssVars['--tile-mid'];
    svg.append('rect').attr('class', 'cell' + (selected === v(r, 's') ? ' sel' : '')).attr('data-s', v(r, 's'))
      .attr('x', lf.x0).attr('y', lf.y0).attr('width', Math.max(w, 0)).attr('height', Math.max(h, 0)).attr('fill', fill);
    if (w < 20 || h < 13) continue;
    const s = v(r, 's');
    const fs = Math.min(w / (s.length * 0.66 + 0.5), h * 0.4, 26);
    if (fs < 7.5) continue;
    const ink = d3.lab(fill).l < 58 ? '#FFFFFF' : '#0B1520';
    const showPct = h > fs * 2.25 && fs >= 9 && typeof val === 'number';
    const cy = lf.y0 + h / 2 + (showPct ? -fs * 0.18 : fs * 0.35);
    svg.append('text').attr('class', 'tk').attr('x', lf.x0 + w / 2).attr('y', cy).attr('font-size', fs.toFixed(1)).attr('fill', ink).text(s);
    if (showPct) {
      const label = pct(val);
      const pfs = Math.min(fs * 0.62, (w - 4) / (label.length * 0.6));
      if (pfs >= 7.5) svg.append('text').attr('class', 'pc').attr('x', lf.x0 + w / 2).attr('y', cy + fs * 0.95).attr('font-size', pfs.toFixed(1)).attr('fill', ink).text(label);
    }
  }
  host.replaceChildren(svg.node());
  drawLegend();
}

function drawLegend() {
  const s = SCALE[mode];
  const color = colorScale(mode);
  const steps = d3.range(-s, s + 0.001, s / 5);
  const n = D.stocks.filter(r => typeof v(r, mode) === 'number').length;
  const legend = $('#legend');
  legend.title = `面积为市值，${n} 只标普 500 成分股，${sector !== null ? '按 GICS 子行业分组' : '按 GICS 板块分组'}`;
  legend.innerHTML = `<b>${esc(modeName(mode))}${sector !== null ? ` · ${esc(D.sectors[sector].n)}` : ''}<small>面积 = 市值</small></b>
    <div class="ramp">${steps.map(x => `<i style="background:${color(x)}"></i>`).join('')}</div>
    <div class="lab num"><span>≤ −${s}%</span><span>0</span><span>≥ +${s}%</span></div>`;
}

function drawChips() {
  const k = mode === 'c' ? 'c' : mode;
  const chips = [`<span class="lbl">板块</span><button class="chip" type="button" data-g="" aria-pressed="${sector === null}">全部</button>`]
    .concat(D.sectors.map((s, gi) => `<button class="chip" type="button" data-g="${gi}" aria-pressed="${sector === gi}">${esc(s.n)}<b class="${cls(s[k])}">${pct(s[k])}</b></button>`));
  $('#secs').innerHTML = chips.join('');
}

// tooltip
const tip = $('#tip');
function tipHtml(s) {
  const r = BY[s];
  if (!r) return '';
  const mv = E.movers && E.movers[s];
  const row = (k, val) => `<div class="r"><span>${k}</span>${val}</div>`;
  return `<div class="h"><b>${esc(s)}</b><span>$${px(v(r, 'p'))}</span></div>
    <div class="nm">${esc(nameOf(s))}${CN[s] ? ' · ' + esc(enName(s)) : ''} · ${esc(D.inds[v(r, 'i')])}</div>
    ${row(D.kind === 'weekly' ? `${md(D.session)} 收盘` : closeLabel(), pc(v(r, 'c')))}
    ${D.status === 'pre' ? row('盘前', pc(v(r, 'pm'))) : ''}
    ${row('近一周', pc(v(r, 'w')))}${row('近一月', pc(v(r, 'm')))}${row('年初至今', pc(v(r, 'ytd')))}
    ${row('相对成交量', `<span>${typeof v(r, 'rv') === 'number' ? v(r, 'rv').toFixed(2) + '×' : '—'}</span>`)}
    ${row('市值', `<span>${capUsd(v(r, 'mc'))}</span>`)}
    ${mv && mv.why && mv.why !== 'TODO' ? `<div class="why">${esc(mv.why)}</div>` : ''}`;
}
function placeTip(x, y) {
  const st = $('#stage').getBoundingClientRect();
  const tw = tip.offsetWidth, th = tip.offsetHeight;
  let left = x - st.left + 14, top = y - st.top + 14;
  if (left + tw > st.width - 8) left = x - st.left - tw - 14;
  if (top + th > st.height - 8) top = Math.max(8, st.height - th - 8);
  tip.style.left = Math.max(8, left) + 'px';
  tip.style.top = Math.max(8, top) + 'px';
}
$('#map').addEventListener('pointermove', e => {
  const el = e.target.closest('rect.cell');
  if (!el) { if (!selected) tip.hidden = true; return; }
  tip.innerHTML = tipHtml(el.dataset.s);
  tip.hidden = false;
  placeTip(e.clientX, e.clientY);
});
$('#map').addEventListener('pointerleave', () => { if (!selected) tip.hidden = true; });
$('#map').addEventListener('click', e => {
  const el = e.target.closest('rect.cell');
  if (!el) { selected = null; tip.hidden = true; drawMap(); return; }
  focusStock(el.dataset.s, false);
});

function focusStock(s, fromPanel) {
  if (!BY[s]) return;
  selected = s;
  if (fromPanel && sector !== null && sector !== v(BY[s], 'g')) sector = null;
  drawMap();
  drawChips();
  const el = document.querySelector(`#map rect.cell[data-s="${CSS.escape(s)}"]`);
  if (!el) return;
  const b = el.getBoundingClientRect();
  tip.innerHTML = tipHtml(s);
  tip.hidden = false;
  placeTip(b.left + b.width / 2, b.top + b.height / 2);
  if (fromPanel && window.matchMedia('(max-width:1080px)').matches) $('#stage').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ---------- panel ----------
const sec = (title, small, body) => `<section class="sec"><h3>${esc(title)}${small ? `<small>${small}</small>` : ''}</h3>${body}</section>`;
const isTodo = x => x == null || x === 'TODO' || (typeof x === 'string' && /TODO/.test(x));

function renderSum() {
  const idx = k => D.macro.find(m => m.k === k) || {};
  const tiles = ['SPX', 'NDX', 'DJI', 'RUT'].map(k => {
    const m = idx(k);
    return `<div class="tile"><span class="k"><span>${esc(m.n)}</span><span>${esc(D.kind === 'weekly' ? '本周' : closeLabel())}</span></span>
      <span class="v">${px(m.v)}</span><span class="d"><span class="${cls(D.kind === 'weekly' ? m.w : m.c)}">${pct(D.kind === 'weekly' ? m.w : m.c)}</span><em>${D.kind === 'weekly' ? `当日 ${pct(m.c)}` : `近一周 ${pct(m.w)}`}</em></span></div>`;
  }).join('');
  const fut = D.macro.filter(m => m.grp === 'fut');
  const macroRows = D.macro.filter(m => ['rate', 'vol', 'fx', 'cmd', 'crypto'].includes(m.grp));
  const futStamp = `${ptTime(D.fetched)} PT`;
  const cover = E.cover || {};
  $('#p-sum').innerHTML = `
    <div class="stamp"><span class="eyebrow">${issue.date.replace(/-/g, '.')} ${wd(issue.date)}</span>
      <span class="pill solid">${D.kind === 'weekly' ? '周报' : STATUS[D.status] + '版'}</span>
      <span>No.${String(E.no).padStart(3, '0')} · 数据截至 <span class="num">${ptTime(D.fetched)}</span> PT</span></div>
    <div class="thesis"><span class="eyebrow" style="color:var(--accent)">今日结论</span><h2>${esc(cover.title)}</h2><p>${esc(cover.dek)}</p></div>
    ${(cover.points || []).length ? `<ul class="points">${cover.points.map(p => `<li>${esc(p)}</li>`).join('')}</ul>` : ''}
    ${sec('主要指数', esc(D.kind === 'weekly' ? `截至 ${md(D.session)} 收盘` : closeLabel()), `<div class="tiles">${tiles}</div>`)}
    ${fut.length && D.kind !== 'weekly' ? sec('股指期货', `相对前结算 · ${esc(futStamp)}`, `<div class="kv">${fut.map(m => `<div><span>${esc(m.n)}</span><b class="${cls(m.c)}">${pct(m.c)}</b></div>`).join('')}</div>`) : ''}
    ${sec('宏观看板', `利率涨跌以基点计 · ${esc(futStamp)}`, `<div class="tbl"><table>
      <thead><tr><th>品种</th><th class="n">最新</th><th class="n">${D.kind === 'weekly' ? '当日' : '涨跌'}</th><th class="n">近一周</th><th class="n">年初至今</th></tr></thead>
      <tbody>${macroRows.map(m => `<tr><td class="nm">${esc(m.n)}<small>${esc(m.k)}</small></td><td class="n">${px(m.v)}${m.grp === 'rate' ? '%' : ''}</td>
        <td class="n">${m.grp === 'rate' ? bp(m.bp) : pc(m.c)}</td><td class="n">${pc(m.w)}</td><td class="n">${pc(m.ytd)}</td></tr>`).join('')}</tbody></table></div>`)}
    ${(E.news || []).length ? sec('要闻', `${E.news.length} 条 · 每条附来源`, `<div class="news">${E.news.map(n => `<article>
      <div class="tg"><span class="pill a">${esc(n.tag)}</span><span class="num">${esc(n.date)}</span></div>
      <h4>${esc(n.title)}</h4><p>${esc(n.body)}</p>${sources(n.src)}</article>`).join('')}</div>`) : ''}`;
}

function renderSec() {
  const k = cMetric();
  const pre = D.status === 'pre';
  const rows = D.sectors.map((s, gi) => ({ ...s, gi })).sort((a, b) => (b[k] ?? -99) - (a[k] ?? -99));
  const stack = s => {
    const t = s.adv + s.dec || 1;
    return `<div class="stack" title="上涨 ${s.adv} · 下跌 ${s.dec}"><i class="p" style="flex:${s.adv / t}"></i><i class="q" style="flex:${s.dec / t}"></i></div>`;
  };
  const cm = s => (E.sectors && E.sectors[s.k] && !isTodo(E.sectors[s.k].t) ? E.sectors[s.k] : null);
  const head = `<tr><th>板块</th><th class="n">${D.kind === 'weekly' ? '近一周' : esc(closeLabel())}</th>${pre ? '<th class="n">盘前</th>' : ''}${D.kind === 'weekly' ? '' : '<th class="n">近一周</th>'}<th class="n">近一月</th><th class="n">年初至今</th><th>涨 / 跌</th></tr>`;
  const body = rows.map(s => {
    const c = cm(s);
    const cols = 4 + (pre ? 1 : 0) + (D.kind === 'weekly' ? 0 : 1) + 1;
    return `<tr class="click${c ? ' has-cm' : ''}" tabindex="0" data-g="${s.gi}"><td class="nm">${esc(s.n)}<small>${esc(s.k)} · ${s.cnt} 只</small></td>
      <td class="n">${pc(s[k])}</td>${pre ? `<td class="n">${pc(s.pm)}</td>` : ''}${D.kind === 'weekly' ? '' : `<td class="n">${pc(s.w)}</td>`}<td class="n">${pc(s.m)}</td><td class="n">${pc(s.ytd)}</td>
      <td style="min-width:80px">${stack(s)}<small class="num" style="color:var(--faint);font-size:10.5px">${s.adv} / ${s.dec}</small></td></tr>
      ${c ? `<tr class="cm"><td colspan="${cols}">${esc(c.t)}${sources(c.src)}</td></tr>` : ''}`;
  }).join('');
  const th = D.themes.filter(t => t.c != null).sort((a, b) => (b[k] ?? -99) - (a[k] ?? -99));
  $('#p-sec').innerHTML = `
    ${sec('GICS 11 个板块', `SPDR 板块 ETF · 按${D.kind === 'weekly' ? '近一周' : '当日'}涨跌排序 · 点击在热力图展开`, `<div class="tbl"><table><thead>${head}</thead><tbody>${body}</tbody></table></div>`)}
    ${sec('主题 ETF', '细分赛道', `<div class="tbl"><table><thead><tr><th>主题</th><th class="n">${D.kind === 'weekly' ? '近一周' : '当日'}</th>${pre ? '<th class="n">盘前</th>' : ''}<th class="n">近一月</th><th class="n">年初至今</th></tr></thead>
      <tbody>${th.map(t => `<tr><td class="nm">${esc(t.n)}<small>${esc(t.k)} · $${px(t.px)}</small></td><td class="n">${pc(t[k])}</td>${pre ? `<td class="n">${pc(t.pm)}</td>` : ''}<td class="n">${pc(t.m)}</td><td class="n">${pc(t.ytd)}</td></tr>`).join('')}</tbody></table></div>`)}
    <p class="note">板块涨跌取 SPDR 板块 ETF；「涨 / 跌」是该板块标普 500 成分股中上涨与下跌的家数。</p>`;
}

function moverList(list, key) {
  if (!list.length) return '<p class="empty">没有符合条件的股票</p>';
  return `<div class="mv">${list.map(s => {
    const r = BY[s];
    if (!r) return '';
    const e = (E.movers || {})[s] || {};
    return `<article tabindex="0" data-s="${esc(s)}"><div class="t"><b>${esc(s)}</b><span>${esc(nameOf(s))}</span></div><div class="c ${cls(v(r, key))}">${pct(v(r, key))}</div>
      <div class="meta"><span>$${px(v(r, 'p'))}</span>${key !== 'c' && D.kind !== 'weekly' ? `<span>当日 ${pct(v(r, 'c'))}</span>` : ''}<span>相对量 ${typeof v(r, 'rv') === 'number' ? v(r, 'rv').toFixed(1) + '×' : '—'}</span><span>${capUsd(v(r, 'mc'))}</span><span>${esc(D.inds[v(r, 'i')])}</span>${v(r, 'er') ? `<span>财报 ${md(v(r, 'er'))}</span>` : ''}</div>
      ${!isTodo(e.why) ? `<p class="why">${esc(e.why)}</p>` : ''}${sources(e.src)}</article>`;
  }).join('')}</div>`;
}
function renderMov() {
  const k = cMetric();
  const lab = D.kind === 'weekly' ? '近一周' : closeLabel();
  const pre = D.movers.pmUp.length || D.movers.pmDown.length;
  $('#p-mov').innerHTML = `
    ${pre ? sec('盘前异动', `盘前成交 ≥ 1 万股且涨跌 ≥ 1% · ${esc(ptTime(D.fetched))} PT`, `<div class="duo"><div>${moverList(D.movers.pmUp, 'pm')}</div><div>${moverList(D.movers.pmDown, 'pm')}</div></div>`) : ''}
    ${sec('涨幅榜', `标普 500 · ${esc(lab)}`, moverList(D.movers.up, k))}
    ${sec('跌幅榜', `标普 500 · ${esc(lab)}`, moverList(D.movers.down, k))}
    ${sec('放量', '相对 10 日均量', `<div class="tbl"><table><thead><tr><th>代码</th><th>名称</th><th class="n">相对量</th><th class="n">成交量</th><th class="n">当日</th></tr></thead>
      <tbody>${D.movers.vol.map(s => { const r = BY[s]; return `<tr class="click" tabindex="0" data-s="${esc(s)}"><td class="code">${esc(s)}</td><td>${esc(nameOf(s))}</td><td class="n">${v(r, 'rv').toFixed(2)}×</td><td class="n">${v(r, 'v').toFixed(1)}M</td><td class="n">${pc(v(r, 'c'))}</td></tr>`; }).join('')}</tbody></table></div>`)}
    <p class="note">点击任意一行可在热力图上定位。异动原因由编辑检索新闻后撰写，查不到明确消息的会写明。</p>`;
}

function renderCal() {
  const today = issue.date;
  const byDay = d3.groups(D.econ, e => etDate(e.t));
  const dayTag = d => (d === today ? ' · 今天' : d < today ? ' · 已公布' : '');
  const unit = (x, u) => (x == null ? '—' : x + (u || ''));
  const econHtml = byDay.length ? byDay.map(([d, evs]) => `<div class="day"><h4>${md(d)} ${wd(d)}<small>${dayTag(d)}</small></h4>
    ${evs.map(e => {
      const zh = econName(e.n);
      return `<div class="ev${e.a != null ? ' done' : ''}"><span class="tm">${ptTime(e.t)}</span>
        <span class="ti"><span class="imp" title="重要性">${[0, 1, 2].map(i => `<i class="${i <= e.imp + 1 ? 'on' : ''}"></i>`).join('')}</span>${esc(zh || e.n)}${zh ? `<small>${esc(e.n)}</small>` : ''}${e.per ? `<small>${esc(e.per)}</small>` : ''}</span><span></span>
        <span class="vals"><span>实际 <b>${esc(unit(e.a, e.u))}</b></span><span>预期 ${esc(unit(e.f, e.u))}</span><span>前值 ${esc(unit(e.p, e.u))}</span></span></div>`;
    }).join('')}</div>`).join('') : '<p class="empty">经济日历暂无数据</p>';

  const res = D.earnings.results;
  const up = d3.groups(D.earnings.upcoming, e => e.d);
  const tm = t => (t === 'bmo' ? '盘前' : t === 'amc' ? '盘后' : '—');
  const eps = x => (x == null ? '—' : (x < 0 ? '−$' : '$') + Math.abs(x).toFixed(2));
  $('#p-cal').innerHTML = `
    ${res.length ? sec('财报 · 已公布', '标普 500 或市值 ≥ 200 亿美元', `<div class="tbl"><table><thead><tr><th>代码</th><th>名称</th><th class="n">EPS 实际</th><th class="n">预期</th><th class="n">超预期</th></tr></thead>
      <tbody>${res.map(e => `<tr class="click" tabindex="0" data-s="${esc(e.s)}"><td class="code">${esc(e.s)}</td><td>${esc(CN[e.s] || e.n)}</td><td class="n">${eps(e.eA)}</td><td class="n">${eps(e.eF)}</td><td class="n">${pc(e.sp)}</td></tr>`).join('')}</tbody></table></div>`) : ''}
    ${sec('财报 · 未来一周', 'EPS 为市场一致预期 · 标普 500 或市值 ≥ 200 亿美元', up.length ? up.map(([d, rows]) => `<div class="day"><h4>${md(d)} ${wd(d)}<small>${d === today ? ' · 今天' : ''} · ${rows.length} 家</small></h4>
      <div class="tbl"><table><tbody>${rows.sort((a, b) => (b.mc || 0) - (a.mc || 0)).map(e => `<tr><td class="code">${esc(e.s)}</td><td>${esc(CN[e.s] || e.n)}</td><td>${tm(e.t)}</td><td class="n">EPS ${eps(e.eF)}</td><td class="n">${capUsd(e.mc)}</td></tr>`).join('')}</tbody></table></div></div>`).join('') : '<p class="empty">未来一周没有大型公司发布财报</p>')}
    ${sec('经济数据', '美国 · 时间为美西 PT · 圆点为重要性', econHtml)}`;
}

function renderBr() {
  const b = D.breadth;
  const k = cMetric();
  const rsp = D.macro.find(m => m.k === 'RSP') || {}, spx = D.macro.find(m => m.k === 'SPX') || {};
  const gap = typeof rsp[k] === 'number' && typeof spx[k] === 'number' ? rsp[k] - spx[k] : null;
  const t = b.adv + b.dec + b.unch || 1;
  const bar = (x, cls2 = '') => `<div class="bar"><i class="${cls2}" style="width:${Math.max(0, Math.min(100, x))}%"></i></div>`;
  $('#p-br').innerHTML = `
    ${sec('标普 500 宽度', esc(D.kind === 'weekly' ? '近一周' : closeLabel()), `<div class="tiles">
      <div class="tile"><span class="k">上涨 / 下跌</span><span class="v"><span class="up">${b.adv}</span><small>/</small><span class="dn">${b.dec}</span></span>
        <div class="stack" style="margin-top:5px"><i class="p" style="flex:${b.adv / t}"></i><i class="z" style="flex:${b.unch / t}"></i><i class="q" style="flex:${b.dec / t}"></i></div></div>
      <div class="tile"><span class="k">等权 − 市值加权</span><span class="v ${cls(gap)}">${gap == null ? '—' : (gap > 0 ? '+' : gap < 0 ? '−' : '') + Math.abs(gap).toFixed(2)}<small>个百分点</small></span><span class="d" style="color:var(--faint);font-weight:500">RSP ${pct(rsp[k])} · 标普 ${pct(spx[k])}</span></div>
      <div class="tile"><span class="k">站上 50 日均线</span><span class="v">${b.a50}<small>%</small></span>${bar(b.a50)}</div>
      <div class="tile"><span class="k">站上 200 日均线</span><span class="v">${b.a200}<small>%</small></span>${bar(b.a200)}</div>
      <div class="tile"><span class="k">52 周新高</span><span class="v">${b.hi}<small>只</small></span><span class="d" style="color:var(--faint);font-weight:500">当日最高价触及 52 周高点</span></div>
      <div class="tile"><span class="k">52 周新低</span><span class="v">${b.lo}<small>只</small></span><span class="d" style="color:var(--faint);font-weight:500">当日最低价触及 52 周低点</span></div>
      ${b.pmAdv != null ? `<div class="tile" style="grid-column:1/-1"><span class="k">盘前上涨 / 下跌（有盘前成交的成分股）</span><span class="v"><span class="up">${b.pmAdv}</span><small>/</small><span class="dn">${b.pmDec}</span></span></div>` : ''}
    </div>`)}
    ${sec('各板块站上均线比例', '实心 50 日 · 空心 200 日', `<div class="tbl"><table><thead><tr><th>板块</th><th class="n">50 日</th><th style="width:40%"></th><th class="n">200 日</th></tr></thead>
      <tbody>${D.sectors.slice().sort((a, b2) => b2.a50 - a.a50).map(s => `<tr><td class="nm">${esc(s.n)}</td><td class="n">${s.a50}%</td>
        <td style="vertical-align:middle"><div style="display:flex;flex-direction:column;gap:3px">${bar(s.a50)}${bar(s.a200, 'b2')}</div></td><td class="n">${s.a200}%</td></tr>`).join('')}</tbody></table></div>`)}
    <p class="note">宽度只统计标普 500 成分股。站上均线用最新收盘价对比 50 日、200 日简单均线；等权减市值加权为正，说明多数股票跑赢了权重股。</p>`;
}

function renderHow() {
  const s = D.src;
  $('#p-how').innerHTML = `
    ${sec('这份晨报怎么做', '', `<p class="note">每个交易日美西 05:00 前出刊（美东 08:00，盘前时段），周六出一期周报，周日和美股休市日不出刊。数据由脚本抓取后，编辑（Claude）检索新闻写结论、板块点评和每只异动股的原因，每条附来源。本期编辑于 <b class="num">${esc(E.edited)}</b>。</p>`)}
    ${sec('口径', '', `<ul class="points">
      <li><b>${esc(closeLabel())}</b>：本期收盘数据属于 ${md(D.session)} ${wd(D.session)} 的交易时段${D.session === issue.date && D.status === 'open' ? '（抓取时市场仍在交易，为盘中数据）' : ''}。</li>
      <li><b>盘前</b>：美东 04:00–09:30 的成交价相对前收；只在盘前时段出刊时显示。</li>
      <li><b>期货、利率、汇率、商品、加密</b>：抓取时的最新报价，期货相对前结算价。</li>
      <li><b>板块</b>：SPDR 板块 ETF 的涨跌；成分股按 Wikipedia 上的 GICS 分类归入 11 个板块。</li>
      <li><b>异动</b>：标普 500 成分股按涨跌幅排序；盘前榜要求盘前成交 ≥ 1 万股且涨跌 ≥ 1%。</li>
      <li><b>相对量</b>：当日成交量 ÷ 过去 10 日平均成交量。</li>
      <li>行情延迟约 15 分钟。本页不构成投资建议。</li></ul>`)}
    ${sec('数据来源', '', `<div class="src" style="flex-direction:column;gap:6px">${Object.values(s).map(([n, u]) => `<a href="${esc(href(u))}" target="_blank" rel="noopener">${esc(n)}</a>`).join('')}</div>`)}
    ${D.warn && D.warn.length ? sec('本期数据提示', '', `<ul class="points">${D.warn.map(w => `<li>${esc(w)}</li>`).join('')}</ul>`) : ''}
    <p class="note">数据抓取于 <span class="num">${esc(new Date(D.fetched).toLocaleString('zh-CN', { timeZone: 'America/Los_Angeles', hour12: false }))}</span> PT。</p>`;
}

function renderPanel() {
  renderSum(); renderSec(); renderMov(); renderCal(); renderBr(); renderHow();
}

function setTab(t) {
  tab = t;
  document.querySelectorAll('.tabs button').forEach(b => b.setAttribute('aria-selected', String(b.dataset.t === t)));
  document.querySelectorAll('.pane').forEach(p => { p.hidden = p.id !== 'p-' + t; });
}
document.querySelector('.tabs').addEventListener('click', e => { const b = e.target.closest('button[data-t]'); if (b) setTab(b.dataset.t); });

$('#panel').addEventListener('click', e => {
  const st = e.target.closest('[data-s]');
  if (st && !e.target.closest('a')) { focusStock(st.dataset.s, true); return; }
  const sg = e.target.closest('tr[data-g]');
  if (sg) { sector = Number(sg.dataset.g); selected = null; tip.hidden = true; drawMap(); drawChips(); if (window.matchMedia('(max-width:1080px)').matches) $('#stage').scrollIntoView({ behavior: 'smooth', block: 'start' }); }
});
$('#panel').addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-s],tr[data-g]')) { e.preventDefault(); e.target.click(); } });

$('#secs').addEventListener('click', e => {
  const b = e.target.closest('button[data-g]');
  if (!b) return;
  sector = b.dataset.g === '' ? null : Number(b.dataset.g);
  selected = null; tip.hidden = true;
  drawMap(); drawChips();
});

function setMode(m) {
  mode = m;
  document.querySelectorAll('#mode button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.m === m)));
  drawMap(); drawChips();
  if (selected) focusStock(selected, false);
}
$('#mode').addEventListener('click', e => { const b = e.target.closest('button[data-m]'); if (b && !b.disabled) setMode(b.dataset.m); });

function setUpDown(m) {
  document.body.dataset.updown = m;
  $('#ud-cn').setAttribute('aria-pressed', String(m === 'cn'));
  $('#ud-us').setAttribute('aria-pressed', String(m === 'us'));
  store.set('usmb-updown', m);
  readVars();
  drawMap();
}
$('#ud-cn').addEventListener('click', () => setUpDown('cn'));
$('#ud-us').addEventListener('click', () => setUpDown('us'));

function show(i) {
  load(i);
  $('#brand-sub').textContent = `US Market Brief · ${issue.date.replace(/-/g, '.')} · No.${String(E.no).padStart(3, '0')}`;
  const pmBtn = document.querySelector('#mode button[data-m="pm"]');
  pmBtn.disabled = D.status !== 'pre';
  pmBtn.title = D.status !== 'pre' ? '本期不在盘前时段出刊，没有盘前数据' : '';
  document.querySelector('#mode button[data-m="c"]').textContent = D.session === issue.date && D.status === 'open' ? '盘中' : '前收';
  document.querySelectorAll('#mode button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.m === mode)));
  tip.hidden = true;
  renderPanel();
  drawChips();
  drawMap();
}

const pick = $('#issue-pick');
pick.innerHTML = ISSUES.map((it, i) => `<option value="${i}">${esc(md(it.date))} ${wd(it.date)} · No.${String(it.edit.no).padStart(3, '0')}${it.data.kind === 'weekly' ? ' 周报' : ''}</option>`).join('');
pick.addEventListener('change', () => show(Number(pick.value)));

document.body.dataset.updown = store.get('usmb-updown') === 'us' ? 'us' : 'cn';
$('#ud-cn').setAttribute('aria-pressed', String(document.body.dataset.updown === 'cn'));
$('#ud-us').setAttribute('aria-pressed', String(document.body.dataset.updown === 'us'));
readVars();
const tabFromHash = location.hash.slice(1);
if (['sum', 'sec', 'mov', 'cal', 'br', 'how'].includes(tabFromHash)) setTab(tabFromHash);
show(0);
new ResizeObserver(() => drawMap()).observe($('#map'));
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { readVars(); drawMap(); });
new MutationObserver(() => { readVars(); drawMap(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
