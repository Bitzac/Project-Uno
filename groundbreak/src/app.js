// ---------- helpers ----------
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const n0 = n => Number(n).toLocaleString('zh-CN');
const yuan = n => n >= 1e4 ? '¥' + (n >= 1e6 ? Math.round(n / 1e4) : +(n / 1e4).toFixed(1)) + ' 万' : '¥' + n0(n);
const md = d => { const [, m, dd] = d.split('-'); return `${+m}月${+dd}日`; };
const mdShort = s => md('2026-' + s);
function lsGet(k, d) { try { const v = JSON.parse(localStorage.getItem('gb.' + k)); return v ?? d; } catch { return d; } }
function lsSet(k, v) { try { localStorage.setItem('gb.' + k, JSON.stringify(v)); } catch { } }
const byId = id => P.find(p => p.id === id);

const I = {
  up: '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8 3 14 12H2z"/></svg>',
  ok: '<svg viewBox="0 0 16 16" fill="none" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m3 8.5 3 3 7-7"/></svg>',
  warn: '<svg viewBox="0 0 16 16" fill="none" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><circle cx="8" cy="8" r="6"/><path d="M8 5v3.5M8 11h.01"/></svg>',
  x: '<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="m3 3 8 8M11 3l-8 8"/></svg>',
  shield: '<svg viewBox="0 0 16 16" fill="none" stroke-width="1.4" stroke-linejoin="round" aria-hidden="true"><path d="M8 1.5 13.5 3.5v4c0 3.2-2.3 5.8-5.5 7-3.2-1.2-5.5-3.8-5.5-7v-4z"/></svg>'
};

// ---------- state ----------
const S = {
  view: 'launch',
  role: lsGet('role', 'guest'),
  cert: lsGet('cert', false),
  votes: lsGet('votes', {}),
  watch: lsGet('watch', {}),       // id -> 'watch' | 'talk'
  notify: lsGet('notify', {}),
  lt: 'today', kind: '全部', sort: 'ending',
  f: { ind: '全部', round: '全部', min: 60, rising: false, mine: false },
  open: null, pick: null
};
if (S.role === 'investor' && !S.cert) S.role = 'guest';

const votesOf = p => p.launch.w + (S.votes[p.id] ? 1 : 0);
const rawOf = p => p.launch.raw + (S.votes[p.id] ? 1 : 0);
const pctOf = p => p.back.goal ? p.back.raised / p.back.goal : 0;
const rising = p => p.trend[p.trend.length - 1] >= p.trend[0];

function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('on');
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 2600);
}

// ---------- small renderers ----------
const logo = (p, cls = '') => `<span class="logo ${cls}" style="--h:${p.h}" aria-hidden="true">${esc(p.name[0])}</span>`;

function backTag(p) {
  const b = p.back;
  if (b.status === 'soon') return `<span class="tag inv"><i></i>${mdShort(b.start)}开始 · ${n0(b.notify)} 人预约</span>`;
  const pc = Math.round(pctOf(p) * 100);
  if (b.status === 'done') return `<span class="tag ok"><i></i>${esc(b.kind)}已达成 ${pc}%</span>`;
  return `<span class="tag ${pc >= 100 ? 'ok' : 'warn'}"><i></i>${esc(b.kind)} ${pc}%</span>`;
}

function spark(arr) {
  const w = 84, h = 28, lo = 45, hi = 90, pad = 4;
  const x = i => arr.length === 1 ? w / 2 : pad + i * (w - pad * 2) / (arr.length - 1);
  const y = v => h - pad - (Math.min(hi, Math.max(lo, v)) - lo) / (hi - lo) * (h - pad * 2);
  const c = rising({ trend: arr }) ? 'up' : 'dn';
  const line = arr.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join('');
  const area = `${line}L${x(arr.length - 1).toFixed(1)} ${h}L${x(0).toFixed(1)} ${h}Z`;
  const last = arr.length - 1;
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" role="img" aria-label="近 ${arr.length} 周信号分 ${arr.join('、')}"><path class="area ${c}" d="${area}"/><path class="${c}" d="${line}"/><circle class="${c}" cx="${x(last).toFixed(1)}" cy="${y(arr[last]).toFixed(1)}" r="4"/></svg>`;
}

function partsHTML(p, withSrc) {
  return `<div class="parts">${Object.keys(W).map(k => `
    <div class="part"><span>${PART_NAMES[k]} <small class="num">×${W[k] * 100}%</small></span>
      <div class="meter ${p.parts[k] < 50 ? 'warn' : ''}" role="img" aria-label="${PART_NAMES[k]} ${p.parts[k]} 分"><i style="width:${p.parts[k]}%"></i></div>
      <b>${p.parts[k]}</b>${withSrc ? `<small>${esc(withSrc[k] || PART_SRC[k])}</small>` : ''}</div>`).join('')}</div>`;
}

// ---------- launch board ----------
function renderLaunch() {
  const week = d => d >= '2026-09-25';
  const list = P.filter(p => S.lt === 'today' ? p.launch.date === TODAY : S.lt === 'week' ? week(p.launch.date) : !week(p.launch.date))
    .sort((a, b) => votesOf(b) - votesOf(a));
  const live = P.filter(p => p.back.status === 'live').length;
  const hit = P.filter(p => p.back.status !== 'soon' && pctOf(p) >= 1).length;
  $('#v-launch').innerHTML = `
    <div class="vhead"><div><div class="eyebrow">2026 年 10 月 1 日 · 周四</div><h1>首发榜</h1>
      <p>每天一批新产品首发，社区投票决定排名。首发页只展示产品、团队和众筹进度，不出现任何融资条款。</p></div>
      <div class="chips" role="group" aria-label="时间范围">
        ${[['today', '今日'], ['week', '本周'], ['past', '往期']].map(([k, t]) => `<button class="chip" data-lt="${k}" aria-pressed="${S.lt === k}">${t}</button>`).join('')}
      </div></div>
    <div class="cols">
      <div class="panel board" role="list">${list.map((p, i) => `
        <div class="row" role="listitem" data-open="${p.id}" tabindex="0">
          <span class="rank">${i + 1}</span>${logo(p)}
          <div><div class="nm">${esc(p.name)} <small>${esc(p.tagline)}</small></div>
            <div class="meta"><span class="tag">${esc(p.ind)}</span><span class="tag">${esc(p.city)}</span>${backTag(p)}<span class="tag">${n0(p.launch.cm)} 条讨论</span></div></div>
          <button class="vote" data-vote="${p.id}" aria-pressed="${!!S.votes[p.id]}" aria-label="为${esc(p.name)}投票，当前加权票 ${n0(votesOf(p))}">${I.up}<b>${n0(votesOf(p))}</b><small>加权票</small></button>
        </div>`).join('') || '<div class="empty">这个时间段没有首发项目</div>'}</div>
      <div style="display:grid;gap:18px">
        <div class="panel"><h3>平台概况 <small>示例数据</small></h3>
          <div class="stats" style="margin-top:12px">
            <div class="stat"><b>${P.filter(p => p.launch.date === TODAY).length}</b><span>今日首发</span></div>
            <div class="stat"><b>${live}</b><span>众筹进行中</span></div>
            <div class="stat"><b>${hit}</b><span>已达成目标</span></div>
            <div class="stat"><b>${yuan(P.reduce((s, p) => s + p.back.raised, 0))}</b><span>众筹累计支持</span></div>
          </div></div>
        <div class="panel"><h3>榜单规则</h3><div class="rules">
          <div class="rule">${I.shield}<div><b>票数按可信度加权。</b>实名且账龄满 30 天计 1 票，新账号计 0.3 票，同一设备或同一支付账户的重复票不计。</div></div>
          <div class="rule">${I.shield}<div><b>不卖榜单位置。</b>排名只看加权票，平台不出售推荐位。</div></div>
          <div class="rule">${I.shield}<div><b>融资信息不公开。</b>轮次、金额、出让比例只在投资人专区展示，访客看不到。</div></div>
        </div></div>
      </div>
    </div>`;
}

// ---------- crowdfunding ----------
function renderBack() {
  let list = P.filter(p => S.kind === '全部' || p.back.kind === S.kind);
  const st = p => p.back.status === 'done' ? 2 : p.back.status === 'soon' ? 1 : 0;
  const sorters = { ending: (a, b) => st(a) - st(b) || a.back.left - b.back.left, pct: (a, b) => pctOf(b) - pctOf(a), n: (a, b) => b.back.n - a.back.n };
  list = list.sort(sorters[S.sort]);
  $('#v-back').innerHTML = `
    <div class="vhead"><div><h1>众筹</h1>
      <p>全有或全无：截止日前达到目标才扣款，否则原路退回。回报只能是产品或服务，不承诺现金、分红或股权。</p></div>
      <div class="seg" role="group" aria-label="排序">${[['ending', '即将截止'], ['pct', '达成率'], ['n', '支持人数']].map(([k, t]) => `<button data-sort="${k}" aria-pressed="${S.sort === k}">${t}</button>`).join('')}</div></div>
    <div class="strip"><span class="tag solid">${I.ok.replace('<svg', '<svg width="13" height="13" stroke="currentColor"')}全有或全无</span><span class="tag solid">支持款由持牌支付机构存管</span><span class="tag solid">分两期放款：成功后 50%，发货确认后 50%</span></div>
    <div class="chips" role="group" aria-label="回报类型">${['全部', ...KINDS].map(k => `<button class="chip" data-kind="${k}" aria-pressed="${S.kind === k}">${k}</button>`).join('')}</div>
    <div class="cards">${list.map(p => {
      const b = p.back, pc = pctOf(p), unit = b.unit ? `${b.n} ${b.unit}企业下单` : `${n0(b.n)} 人支持`;
      const d = b.status === 'soon' ? `${mdShort(b.start)}开始` : b.status === 'done' ? '已结束' : `剩 ${b.left} 天`;
      return `<button class="card" data-open="${p.id}">
        <div class="cover" style="--h:${p.h}"><span class="k">${esc(b.kind)}</span><span class="d">${d}</span><em aria-hidden="true">${esc(p.name[0])}</em></div>
        <div class="cbody"><h4>${esc(p.name)} <span class="latin" style="font-weight:500;color:var(--faint);font-size:13px">${esc(p.en)}</span></h4><p>${esc(p.tagline)}</p>
          ${b.status === 'soon' ? `<div class="meter inv"><i style="width:0"></i></div><div class="kv"><span><b>${n0(b.notify)}</b> 人预约</span><span>目标 ${yuan(b.goal)}</span></div>`
          : `<div class="meter ${pc < 1 ? 'warn' : ''}" role="img" aria-label="达成 ${Math.round(pc * 100)}%"><i style="width:${Math.min(100, pc * 100)}%"></i></div>
             <div class="kv"><span><b>${yuan(b.raised)}</b> 已筹</span><span class="pct ${pc >= 1 ? 'ok' : 'warn'}">${Math.round(pc * 100)}%</span></div>
             <div class="kv"><span>${unit}</span><span>目标 ${yuan(b.goal)}</span></div>`}
        </div></button>`;
    }).join('') || '<div class="empty">没有这类回报的项目</div>'}</div>`;
}

// ---------- investor zone ----------
function renderInvest() {
  const el = $('#v-invest');
  const open = P.filter(p => p.deal && p.score >= 60);
  if (S.role !== 'investor') {
    el.innerHTML = `
      <div class="gate">
        <div class="panel" style="padding:24px">
          <div class="eyebrow">仅对认证合格投资者开放</div>
          <h2 style="margin-top:8px">投资人专区</h2>
          <p>项目的融资轮次、金额、出让比例和数据室只在这里展示。证券法第九条规定，非公开发行证券不得采用广告、公开劝诱和变相公开方式，向特定对象发行累计超过 200 人即为公开发行。平台用合格投资者认证来界定“特定对象”。</p>
          <p>目前有 <b class="num" style="color:var(--ink)">${open.length}</b> 个项目的信号分达到 60，开放对接。</p>
          <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:18px">
            <button class="btn inv" id="certBtn">以演示身份完成认证</button>
          </div>
          <p style="font-size:12.5px;color:var(--faint)">演示环境不收集任何真实身份或资产信息。</p>
        </div>
        <div class="panel"><h3>认证流程</h3><div class="steps">
          <div class="step"><i>1</i><div><b>实名</b><span>身份证与人脸核验</span></div></div>
          <div class="step"><i>2</i><div><b>资质证明</b><span>个人：金融资产不低于 300 万元，或近三年个人年均收入不低于 50 万元；机构：净资产不低于 1,000 万元。参照私募基金合格投资者标准。</span></div></div>
          <div class="step"><i>3</i><div><b>风险测评与签署</b><span>完成风险承受能力测评，签署《保密及风险揭示书》</span></div></div>
          <div class="step"><i>4</i><div><b>开通</b><span>专区页面带个人水印，内容不可转发</span></div></div>
        </div></div>
      </div>`;
    return;
  }
  const inds = ['全部', ...new Set(open.map(p => p.ind))];
  const rounds = ['全部', ...new Set(open.map(p => p.deal.round))];
  const f = S.f;
  const rows = open.filter(p => (f.ind === '全部' || p.ind === f.ind) && (f.round === '全部' || p.deal.round === f.round) && p.score >= f.min && (!f.rising || rising(p)) && (!f.mine || S.watch[p.id]))
    .sort((a, b) => b.score - a.score);
  const cnt = s => Object.values(S.watch).filter(v => v === s).length;
  el.innerHTML = `
    <div class="vhead"><div><h1>投资人专区</h1><p>只收录信号分不低于 60 的项目，按信号分排序。点击一行查看融资信息和数据室。</p></div>
      <div class="pipe"><span><b>${cnt('watch') + cnt('talk')}</b>关注</span><span><b>${cnt('talk')}</b>已约谈</span></div></div>
    <div class="banner">${I.shield.replace('<svg', '<svg width="16" height="16" stroke="currentColor"')}<span><b>非公开信息</b> · 页面带个人水印。平台不经手投资款，交易由双方签约，或通过区域性股权市场、持牌私募基金管理人完成。</span></div>
    <div class="filters">
      <label>行业 <select id="fInd">${inds.map(x => `<option ${x === f.ind ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select></label>
      <label>轮次 <select id="fRound">${rounds.map(x => `<option ${x === f.round ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select></label>
      <label>信号分 ≥ <input type="range" id="fMin" min="60" max="85" step="5" value="${f.min}"><b class="num" id="fMinV">${f.min}</b></label>
      <label><input type="checkbox" id="fRise" ${f.rising ? 'checked' : ''}> 只看上升</label>
      <label><input type="checkbox" id="fMine" ${f.mine ? 'checked' : ''}> 只看已关注</label>
    </div>
    <div class="tbl-wrap"><table>
      <thead><tr><th>项目</th><th>信号分 · 8 周</th><th>需求验证</th><th>经营</th><th>本轮</th><th>股东人数</th><th></th></tr></thead>
      <tbody>${rows.map(p => {
        const b = p.back, pc = Math.round(pctOf(p) * 100), w = S.watch[p.id];
        const dem = b.status === 'soon' ? `${n0(b.notify)} 人预约` : `${pc}% · ${b.unit ? b.n + ' ' + b.unit : n0(b.n) + ' 人'}`;
        return `<tr data-open="${p.id}" tabindex="0">
          <td><div class="nm">${logo(p)}<div>${esc(p.name)}<div class="sub">${esc(p.ind)} · ${esc(p.city)}</div></div></div></td>
          <td><div class="score"><b>${p.score}</b>${spark(p.trend)}</div></td>
          <td>${dem}<div class="sub">${esc(b.kind)}</div></td>
          <td>${esc(p.ops)}</td>
          <td><b>${esc(p.deal.round)}</b> ${esc(p.deal.amt)}<div class="sub">${esc(p.deal.share)}</div></td>
          <td class="num">${p.deal.holders} / ${p.deal.cap}</td>
          <td><button class="star" data-watch="${p.id}" aria-pressed="${!!w}">${w === 'talk' ? '已约谈' : w ? '已关注' : '关注'}</button></td></tr>`;
      }).join('') || '<tr><td colspan="7" class="empty">没有符合筛选条件的项目</td></tr>'}</tbody></table></div>
    <button class="btn ghost sm" id="leaveBtn" style="justify-self:start">退出投资人身份</button>`;
}

// ---------- founder ----------
function renderFound() {
  const p = byId(FOUNDER.id), b = p.back;
  const fun = (arr, cls) => {
    const max = arr[0][1];
    return `<div class="funnel">${arr.map(([k, v], i) => {
      const w = Math.max(.5, v / max * 100), conv = i ? ` <small>${(v / arr[i - 1][1] * 100).toFixed(1)}%</small>` : '';
      const pos = w > 62 ? `right:8px;color:${cls ? '#fff' : 'var(--accent-ink)'}` : `left:calc(${w}% + 8px)`;
      return `<div class="fbar ${cls}" title="${esc(k)}：${n0(v)}${i ? '，上一步转化 ' + (v / arr[i - 1][1] * 100).toFixed(1) + '%' : ''}"><span>${esc(k)}</span>
        <div class="tr"><i style="width:${w}%"></i><em style="${pos}">${n0(v)}${w > 62 ? '' : conv}</em></div></div>`;
    }).join('')}</div>`;
  };
  $('#v-found').innerHTML = `
    <div class="vhead"><div><div class="eyebrow">示例：拾光 LumiNest 的后台</div><h1>创业者后台</h1>
      <p>一个项目从首发到见投资人的全过程：首发拿曝光，众筹验证需求，信号分达到 60 后自动推送给匹配的认证投资人。</p></div>
      <button class="btn pri" data-open="lumi">查看公开页面</button></div>
    <div class="panel"><h3>进度 <small>${esc(p.name)} · ${esc(p.city)}</small></h3>
      <div class="prog">
        <div class="done"><b>建档与实名</b>9月2日完成</div>
        <div class="done"><b>首发日</b>9月10日 · 加权票 ${n0(p.launch.w)} · 当日第 1</div>
        <div class="now"><b>众筹 ${Math.round(pctOf(p) * 100)}%</b>${yuan(b.raised)} · 剩 ${b.left} 天</div>
        <div class="done"><b>投资人对接</b>信号分 ${p.score}，已解锁</div>
      </div></div>
    <div class="grid2">
      <div class="panel"><h3>信号分 <span class="num" style="font-size:30px;font-weight:800">${p.score}</span></h3>
        <p style="margin:2px 0 0;font-size:12.5px;color:var(--faint)">加权求和，每项 0–100。下面是每项的数据来源和改进建议。</p>
        ${partsHTML(p, Object.fromEntries(Object.keys(W).map(k => [k, FOUNDER.tips[k] || PART_SRC[k]])))}
      </div>
      <div class="panel"><h3>公众漏斗 <small>首发至今</small></h3>${fun(FOUNDER.pub, '')}
        <h3 style="margin-top:20px">投资人漏斗 <small>信号分达标后</small></h3>${fun(FOUNDER.inv, 'inv')}
        <p style="margin:10px 0 0;font-size:12.5px;color:var(--faint)">百分比是相对上一步的转化率。</p></div>
    </div>
    <div class="panel"><h3>合规自检 <small>${FOUNDER.checks.filter(c => c[0]).length} / ${FOUNDER.checks.length} 已通过</small></h3>
      <div class="check">${FOUNDER.checks.map(([ok, t, s]) => `<div class="${ok ? 'y' : 'n'}">${ok ? I.ok : I.warn}<div>${esc(t)}<small>${esc(s)}</small></div></div>`).join('')}</div></div>`;
}

// ---------- detail sheet ----------
function renderSheet() {
  const p = byId(S.open); if (!p) return;
  const b = p.back, pc = pctOf(p), inv = S.role === 'investor';
  let money;
  if (b.status === 'soon') money = `<div class="big3"><div><b>${n0(b.notify)}</b>人预约</div><div><b>${yuan(b.goal)}</b>目标</div><div><b>${mdShort(b.start)}</b>开始</div></div>
      <button class="btn ${S.notify[p.id] ? 'ghost' : 'pri'}" data-notify="${p.id}">${S.notify[p.id] ? '已设置开售提醒' : '开售时提醒我'}</button>`;
  else money = `<div class="big3"><div><b>${yuan(b.raised)}</b>已筹 · 目标 ${yuan(b.goal)}</div><div><b class="${pc >= 1 ? 'pct ok' : 'pct warn'}" style="font-size:22px">${Math.round(pc * 100)}%</b>达成率</div><div><b>${b.unit ? b.n + ' ' + b.unit : n0(b.n)}</b>${b.status === 'done' ? '已结束' : `支持 · 剩 ${b.left} 天`}</div></div>
      <div class="meter ${pc < 1 ? 'warn' : ''}"><i style="width:${Math.min(100, pc * 100)}%"></i></div>`;
  const tiers = b.tiers.map((t, i) => `<div class="tier"><b>${esc(t.t)}<span class="num">${yuan(t.p)}</span></b><span>${esc(t.s)}</span>
      <button class="btn sm ${b.status === 'live' && !/剩 0|已满|已结束/.test(t.s) ? 'pri' : 'ghost'}" data-pick="${i}" ${b.status === 'live' && !/剩 0|已满|已结束/.test(t.s) ? '' : 'disabled'}>${b.kind === '付费试点' ? '申请试点' : '支持'}</button></div>
      ${S.pick === i ? `<div class="confirm"><div>确认${b.kind === '付费试点' ? '申请' : '支持'}「${esc(t.t)}」${yuan(t.p)}？款项由持牌支付机构存管，${esc(p.name)}未在截止日前达成目标将原路退回。</div>
        <div class="acts"><button class="btn pri sm" data-pay="${i}">确认（演示）</button><button class="btn ghost sm" data-pick="-1">取消</button></div></div>` : ''}`).join('');
  let deal;
  if (!inv) deal = `<div class="lock"><b>融资信息仅对认证投资人可见</b><span>按证券法第九条，非公开发行不得公开劝诱，所以访客看不到项目是否在融资。完成合格投资者认证后，可以查看轮次、金额、出让比例和数据室。</span><button class="btn inv sm" data-goinv style="justify-self:start">去认证</button></div>`;
  else if (!p.deal) deal = `<p>该项目暂未开放投资人对接。</p>`;
  else {
    const d = p.deal, w = S.watch[p.id];
    deal = `<div class="deal">
      <div class="kvs"><div><b>${esc(d.round)} · ${esc(d.amt)}</b>本轮</div><div><b>${esc(d.share)}</b>出让比例</div>
        <div style="grid-column:1/-1"><b style="font-size:14px;font-weight:500">${esc(d.use)}</b>资金用途</div>
        <div><b class="num">${d.holders} / ${d.cap}</b>现有股东 / ${esc(d.form)}上限</div><div><b>${esc(p.ops)}</b>经营</div></div>
      <div class="room">${ROOM.map((r, i) => `<span class="tag ${d.room[i] ? 'ok' : 'warn'}"><i></i>${r}${d.room[i] ? '' : ' · 缺'}</span>`).join('')}</div>
      <div class="acts"><button class="btn inv sm" data-talk="${p.id}" ${w === 'talk' ? 'disabled' : ''}>${w === 'talk' ? '已发送约谈请求' : '表达意向并预约路演'}</button>
        <button class="star" data-watch="${p.id}" aria-pressed="${!!w}">${w ? '已关注' : '关注'}</button></div></div>`;
  }
  $('#sheet').innerHTML = `
    <div class="hd">${logo(p, 'lg')}<div><h2>${esc(p.name)} <span class="latin" style="font-size:15px;font-weight:500;color:var(--faint)">${esc(p.en)}</span></h2><p>${esc(p.tagline)}</p></div>
      <button class="x" id="closeSheet" aria-label="关闭">${I.x}</button></div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center"><span class="tag">${esc(p.ind)}</span><span class="tag">${esc(p.city)}</span><span class="tag">${md(p.launch.date)}首发</span>
      <span class="tag">加权票 ${n0(votesOf(p))} · 原始 ${n0(rawOf(p))}</span>
      <button class="star" data-vote="${p.id}" aria-pressed="${!!S.votes[p.id]}" style="margin-left:auto">${S.votes[p.id] ? '已投票' : '投一票'}</button></div>
    <div class="sec"><h3>产品</h3><p>${esc(p.about)}</p></div>
    <div class="sec"><h3>${esc(b.kind)} <span class="tag solid">全有或全无</span></h3>${money}${tiers}</div>
    <div class="sec"><h3>信号分 <span class="num" style="font-size:26px;font-weight:800">${p.score}</span></h3>
      ${partsHTML(p)}<p style="font-size:12.5px;color:var(--faint)">需求验证 30% + 执行交付 20% + 经营数据 20% + 社区热度 15% + 信息完整 15%</p></div>
    <div class="sec"><h3>本轮融资 <span class="tag inv"><i></i>${inv ? '你可见' : '仅投资人可见'}</span></h3>${deal}</div>
    <div class="sec"><h3>团队</h3><div class="team">${p.team.map(([n, r]) => `<div><b>${esc(n)}</b><span>${esc(r)}</span></div>`).join('')}</div></div>
    <div class="sec"><h3>动态</h3><div class="tl">${p.updates.map(([d, t]) => `<div><time>${esc(d)}</time><span>${esc(t)}</span></div>`).join('')}</div></div>`;
}

let lastFocus = null;
function openSheet(id) {
  S.open = id; S.pick = null; lastFocus = document.activeElement;
  renderSheet();
  $('#sheet').classList.add('on'); $('#sheet').setAttribute('aria-hidden', 'false'); $('#scrim').classList.add('on');
  $('#sheet').scrollTop = 0;
  setTimeout(() => $('#closeSheet')?.focus(), 50);
}
function closeSheet() {
  S.open = null;
  $('#sheet').classList.remove('on'); $('#sheet').setAttribute('aria-hidden', 'true'); $('#scrim').classList.remove('on');
  lastFocus?.focus?.();
}

// ---------- routing ----------
const VIEWS = { launch: renderLaunch, back: renderBack, invest: renderInvest, found: renderFound };
function render() {
  for (const v in VIEWS) {
    $('#v-' + v).hidden = v !== S.view;
    $('#t-' + v).setAttribute('aria-selected', v === S.view);
  }
  VIEWS[S.view]();
  $('#r-guest').setAttribute('aria-pressed', S.role === 'guest');
  $('#r-investor').setAttribute('aria-pressed', S.role === 'investor');
  $('#invDot').classList.toggle('on', S.role === 'investor');
  if (S.open) renderSheet();
}
function go(v) {
  S.view = v; render(); $('#main').scrollTop = 0;
  try { history.replaceState(null, '', '#' + v); } catch { }
}
function setRole(r) {
  if (r === 'investor' && !S.cert) { go('invest'); toast('先完成合格投资者认证'); return; }
  S.role = r; lsSet('role', r); render();
}

// ---------- events ----------
document.addEventListener('click', e => {
  const t = e.target.closest('button, [data-open]');
  if (!t) return;
  const d = t.dataset;
  if (d.v) return go(d.v);
  if (d.r) return setRole(d.r);
  if (d.vote) {
    S.votes[d.vote] = !S.votes[d.vote]; if (!S.votes[d.vote]) delete S.votes[d.vote];
    lsSet('votes', S.votes); render();
    if (S.votes[d.vote]) toast('已投票：你的账号实名且账龄满 30 天，计 1 票');
    return;
  }
  if (d.watch) {
    if (S.watch[d.watch]) delete S.watch[d.watch]; else S.watch[d.watch] = 'watch';
    lsSet('watch', S.watch); render(); return;
  }
  if (d.talk) {
    S.watch[d.talk] = 'talk'; lsSet('watch', S.watch); render();
    toast('已向创始人发送约谈请求（演示）'); return;
  }
  if (d.notify) {
    S.notify[d.notify] = !S.notify[d.notify]; lsSet('notify', S.notify); renderSheet();
    if (S.notify[d.notify]) toast('开售当天会提醒你'); return;
  }
  if (d.pick !== undefined) { S.pick = +d.pick < 0 ? null : +d.pick; renderSheet(); return; }
  if (d.pay !== undefined) { S.pick = null; renderSheet(); toast('演示环境：没有发生真实支付'); return; }
  if ('goinv' in d) { closeSheet(); go('invest'); return; }
  if (d.lt) { S.lt = d.lt; renderLaunch(); return; }
  if (d.kind) { S.kind = d.kind; renderBack(); return; }
  if (d.sort) { S.sort = d.sort; renderBack(); return; }
  if (t.id === 'certBtn') { S.cert = true; lsSet('cert', true); setRole('investor'); toast('认证完成（演示）：已进入投资人专区'); return; }
  if (t.id === 'leaveBtn') { setRole('guest'); return; }
  if (t.id === 'closeSheet') { closeSheet(); return; }
  if (d.open) openSheet(d.open);
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && S.open) closeSheet();
  if (e.key === 'Enter' && e.target.matches('[data-open]:not(button)')) openSheet(e.target.dataset.open);
});
$('#scrim').addEventListener('click', closeSheet);
document.addEventListener('change', e => {
  const id = e.target.id, f = S.f;
  if (id === 'fInd') f.ind = e.target.value;
  else if (id === 'fRound') f.round = e.target.value;
  else if (id === 'fRise') f.rising = e.target.checked;
  else if (id === 'fMine') f.mine = e.target.checked;
  else if (id === 'fMin') f.min = +e.target.value;
  else return;
  renderInvest();
  $('#' + id)?.focus();
});
document.addEventListener('input', e => {
  if (e.target.id === 'fMin') $('#fMinV').textContent = e.target.value;
});

// ---------- boot ----------
const h = (location.hash || '').slice(1);
S.view = VIEWS[h] ? h : 'launch';
render();
