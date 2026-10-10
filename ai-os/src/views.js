// ---------- views ----------
const RETEST = '重测 AI 能力';
const copyBox = () => `<span class="copy"><code>${RETEST}</code><button class="btn" data-copy="${RETEST}">复制</button></span>`;
const lvName = n => n ? LADDER[n - 1].name : '未起步';
const fmtAt = iso => iso ? iso.slice(0, 16).replace('T', ' ') : '';
// Calendar starts at the first recorded day, at most 60 days back.
const heatFrom = snap => {
  const first = Object.keys(snap.activity).sort()[0] || snap.window.from;
  const floor = new Date(Date.parse(snap.date) - 60 * 864e5).toISOString().slice(0, 10);
  return first > floor ? first : floor;
};

function emptyState() {
  if (S.status === 'loading') return `<div class="empty glass"><h3>正在读取评估快照…</h3><p>快照来自你的会话、Artifact、定时任务和 Git 提交，存放在本页面的私有数据库里。</p></div>`;
  if (S.status === 'offline') return `<div class="empty glass"><h3>在 claude.ai 中打开才能读取评估数据</h3><p>评估快照存放在页面的私有数据库里，只有登录后的页面所有者能看到。自评问卷可以先做，保存需要在 claude.ai 中进行。</p></div>`;
  if (S.status === 'error') return `<div class="empty glass"><h3>暂时读不到评估数据</h3><p>数据库连接中断了。刷新页面重试；如果一直失败，对 Claude 说下面这句，它会重新采集。</p>${copyBox()}</div>`;
  return `<div class="empty glass"><h3>还没有评估快照</h3><p>快照由 Claude 采集你的真实使用数据后写入。对 Claude 说下面这句，生成第一份：</p>${copyBox()}</div>`;
}

// Streak, busiest day and week-over-week change from the daily activity map.
function rhythm(snap) {
  const A = snap.activity, DAY = 864e5, tot = d => A[d] ? A[d].s + A[d].c + A[d].a : 0;
  const days = Object.keys(A).sort();
  let best = 0, run = 0, prev = null;
  for (const d of days) { run = prev && Date.parse(d) - Date.parse(prev) === DAY ? run + 1 : 1; best = Math.max(best, run); prev = d; }
  const busy = days.reduce((b, d) => tot(d) > tot(b) ? d : b, days[0]);
  const sum = (a, b) => { let n = 0; for (let t = Date.parse(snap.date) - a * DAY; t > Date.parse(snap.date) - b * DAY; t -= DAY) n += tot(new Date(t).toISOString().slice(0, 10)); return n; };
  const w1 = sum(0, 7), w0 = sum(7, 14);
  return [
    ['最长连续活跃', `${best} <small>天</small>`],
    ['最忙的一天', `${esc(busy.slice(5))} <small>· ${tot(busy)} 次</small>`],
    ['近 7 天 / 前 7 天', `${w1} <small>/ ${w0} 次</small>`],
  ];
}

function renderSide(c) {
  if (!c) { $('lvCard').innerHTML = `<div class="lvname">${S.status === 'loading' ? '正在读取评估快照…' : '暂无评估快照'}</div>`; $('mobileLv').innerHTML = ''; return; }
  const { lad, combined, snap } = c, nx = lad.next;
  const pips = LADDER.map(st => {
    if (st.n <= lad.level) return '<i class="on"></i>';
    if (nx && st.n === nx.n) return `<i class="part" style="--p:${Math.round(nx.passed / (nx.need || nx.checks.length) * 100)}%"></i>`;
    return '<i></i>';
  }).join('');
  const miss = nx ? nx.checks.filter(k => k.ok === false).map(k => k.t.replace(/\s*[≥（].*$/, '')) : [];
  $('lvCard').innerHTML = `<div class="lvtop"><div><div class="lv">L${lad.level}</div><div class="lvname">${lvName(lad.level)}<small>能力阶梯 · 共 6 级</small></div></div>
    <div class="score"><b>${r0(combined)}</b><span>综合分</span></div></div>
    <div class="pips" aria-label="阶梯进度 L${lad.level} / 6">${pips}</div>
    <div class="lvnext">${nx ? `距 L${nx.n}「${nx.name}」：已满足 ${nx.passed} / ${nx.checks.length} 项，需要 ${nx.need || nx.checks.length} 项。缺：${esc(miss.slice(0, 3).join('、'))}${miss.length > 3 ? ' 等' : ''}` : '已到最高级'}</div>`;
  $('mobileLv').innerHTML = `L${lad.level}<small>${lvName(lad.level)} · ${r0(combined)} 分</small>`;
  $('navLadder').textContent = 'L' + lad.level;
  $('navEv').textContent = IND.length;
  $('sideFoot').innerHTML = `<span>快照 <b>${esc(snap.date)}</b> · 近 30 天（${esc(snap.window.from.slice(5))} 至 ${esc(snap.window.to.slice(5))}）</span><span>评估数据存放在本页面的私有数据库，不进公开仓库。</span><span>重测：对 Claude 说「${RETEST}」</span>`;
}

function vOverview(c) {
  if (!c) return `<div class="vhead"><div class="eyebrow"><b>总览</b></div><h2>AI 能力评估</h2></div>${emptyState()}`;
  const { ev, self, lad, snap, combined } = c, m = snap.metrics;
  const sorted = [...ev.dims].sort((a, b) => b.ev - a.ev);
  const top = sorted.slice(0, 2), low = sorted.slice(-2).reverse();
  const nx = lad.next;
  const bias = self ? ev.dims.filter(d => self.dims[d.id] != null && self.dims[d.id] - d.ev >= 20) : [];
  const biasLow = self ? ev.dims.filter(d => self.dims[d.id] != null && d.ev - self.dims[d.id] >= 20) : [];
  const byRatio = [...ev.ind].sort((a, b) => b.value / b.tgt - a.value / a.tgt);
  const strengths = byRatio.slice(0, 3);
  const gaps = [...ev.ind].sort((a, b) => a.score - b.score).slice(0, 3);
  const actions = ev.ind.filter(i => i.fix && i.score < 100)
    .map(i => ({ i, gain: gainOf(snap, i.id) })).sort((a, b) => b.gain - a.gain).slice(0, 4);
  const val = i => `${fmt(i.value)}${i.unit === '%' ? '%' : ' ' + i.unit}`;
  const tgt = i => `${fmt(i.tgt)}${i.unit === '%' ? '%' : ' ' + i.unit}`;
  const fact = i => `<div class="fact" tabindex="0" ${tipAttr(i.name, i.src)}><b>${i.name}</b><span class="v">${val(i)} <small>/ ${tgt(i)}</small></span><small>${esc(i.src)}</small></div>`;
  const ds = ev.ds.map(d => ({ ...d, self: self ? self.ds[d.id] : null }));

  return `<div class="vhead">
    <div class="eyebrow"><b>结论</b> · 快照 ${esc(snap.date)} · 近 30 天</div>
    <h2>你在 L${lad.level}「${lvName(lad.level)}」：${top[0].name}和${top[1].name}领先，${low[0].name}和${low[1].name}是短板</h2>
    <p>证据分 <b>${r0(ev.total)}</b>，来自 ${IND.length} 项客观指标${self ? `；自评分 <b>${r0(self.total)}</b>（${self.n} / ${QUESTIONS.length} 题）` : '；自评还没做'}。${nx ? `下一级 L${nx.n}「${nx.name}」已满足 <b>${nx.passed} / ${nx.checks.length}</b> 项，需要 ${nx.need || nx.checks.length} 项。` : ''}</p>
  </div>
  <div class="kpis glass">
    <div class="kpi lead"><b>${r0(combined)}</b><span>综合分 · ${self ? '证据 60% + 自评 40%' : '暂按证据计'}</span></div>
    <div class="kpi"><b>L${lad.level}<small>/ 6</small></b><span>能力阶梯 · ${lvName(lad.level)}</span></div>
    <div class="kpi"><b>${r0(ev.total)}</b><span>证据分 · 会话、产出、自动化</span></div>
    <div class="kpi">${self ? `<b>${r0(self.total)}</b><span>自评分 · ${self.n} / ${QUESTIONS.length} 题</span>` : `<b style="color:var(--faint)">未做</b><span><button class="btn" data-go="quiz" style="margin-top:4px">去做自评</button></span>`}</div>
    <div class="kpi"><b>${m.auto_outputs}<small>期 / 周</small></b><span>无人值守的自动产出</span></div>
  </div>
  <div class="grid2 wide">
    <div class="panel glass"><div class="ptitle"><h3>八维雷达</h3><div class="legend"><span><i style="background:var(--s1)"></i>证据</span><span><i style="background:var(--s2)"></i>自评</span></div></div>
      <div class="radarwrap">${radarSVG(ev.dims, self && self.dims)}</div>
      <p class="note">${self ? (bias.length ? `<b>自评比证据高 20 分以上：</b>${bias.map(d => d.name).join('、')}。` : '自评与证据没有超过 20 分的偏差。') + (biasLow.length ? ` <b>自评偏低：</b>${biasLow.map(d => d.name).join('、')}。` : '') : '做完自评后，橙色多边形会叠加在这里，偏差超过 20 分的维度会单独标出。'}</p></div>
    <div class="stack">
      <div class="panel glass"><div class="ptitle"><h3>4D 素养</h3><div class="legend"><span><i style="background:var(--s1)"></i>证据</span><span><i style="background:var(--s2)"></i>自评</span></div></div>
        ${dBars(ds)}
        <p class="note">4D 是 Anthropic 与 Dakan、Feller 提出的 AI 素养框架：委派、描述、判断、尽责。<button class="btn" data-go="fourd" style="padding:3px 9px;font-size:12px">看拆解</button></p></div>
      ${nx ? `<div class="panel glass"><div class="ptitle"><h3>离 L${nx.n}「${nx.name}」还差</h3><span>${nx.passed} / ${nx.checks.length} 已满足，需要 ${nx.need || nx.checks.length}</span></div>
        <ul class="checks">${nx.checks.filter(k => k.ok !== true).map(k => `<li><span class="st ${k.ok === false ? 'crit' : 'none'}">${k.ok === false ? '✕' : '?'}</span><span>${k.t}</span><em>现在 ${esc(k.v)}</em></li>`).join('')}</ul></div>` : ''}
    </div>
  </div>
  <div class="grid2">
    <div class="panel glass"><div class="ptitle"><h3>强项</h3><span>超出基准最多的 3 项</span></div><div class="facts">${strengths.map(fact).join('')}</div></div>
    <div class="panel glass"><div class="ptitle"><h3>短板</h3><span>得分最低的 3 项</span></div><div class="facts">${gaps.map(fact).join('')}</div></div>
  </div>
  <div class="panel glass"><div class="ptitle"><h3>下一步：按提分多少排序</h3><span>做到基准后证据分的变化</span></div>
    <div class="tbl"><table class="acts"><thead><tr><th>动作</th><th>指标</th><th class="r">现在 → 基准</th><th class="r">证据分</th></tr></thead><tbody>
    ${actions.map(({ i, gain }) => `<tr><td>${esc(typeof i.fix === 'function' ? i.fix(snap) : i.fix)}<small>${i.name}</small></td><td>${i.name}<small>${DIMS.find(d => d.id === i.dim)?.name || '—'} · ${FOURD.find(d => d.id === i.d).name}</small></td><td class="r num">${val(i)} → ${tgt(i)}</td><td class="r num"><b>+${gain.toFixed(1)}</b></td></tr>`).join('')}
    </tbody></table></div></div>
  <div class="panel glass"><div class="ptitle"><h3>放到人群里看</h3><span>公开调查数据，口径不同，仅作参照</span></div>
    <div class="tbl"><table class="wide"><thead><tr><th>指标</th><th class="r">人群</th><th>你</th><th>来源</th></tr></thead><tbody>
    ${BENCH.map(b => `<tr><td>${b.k}${b.popNote ? `<small>${b.popNote}</small>` : ''}</td><td class="r num"><b>${b.pop}</b></td><td>${esc(b.you(m))}</td><td><a class="link" href="${b.url}" target="_blank" rel="noopener">${b.src}</a></td></tr>`).join('')}
    </tbody></table></div></div>`;
}

function vLadder(c) {
  if (!c) return `<div class="vhead"><div class="eyebrow"><b>能力阶梯</b></div><h2>六级阶梯</h2></div>${emptyState()}`;
  const { lad } = c, nx = lad.next;
  const steps = [...lad.steps].reverse().map(st => {
    const cls = st.done ? 'done' : '';
    const cur = st.n === lad.level ? ' cur' : '';
    const need = st.need || st.checks.length;
    const pill = st.done ? '<span class="chip"><span class="st good">✓</span>已达成</span>' : nx && st.n === nx.n ? `<span class="chip"><span class="st warn">!</span>进行中 ${st.passed} / ${need}</span>` : '<span class="chip"><span class="st none">–</span>未开始</span>';
    return `<article class="step glass ${cls}${cur}">
      <div class="n">L${st.n}</div>
      <div><h3>${st.name}</h3><p>${st.desc}</p><div class="mode subs">${pill}<span class="chip">主要模式 · ${MODES[st.mode]}</span></div>
        ${nx && st.n === nx.n ? `<div class="stepbar"><i style="width:${Math.min(100, st.passed / need * 100)}%"></i></div>` : ''}</div>
      <ul class="checks">${st.checks.map(k => `<li><span class="st ${k.ok === true ? 'good' : k.ok === false ? 'crit' : 'none'}">${k.ok === true ? '✓' : k.ok === false ? '✕' : '?'}</span><span>${k.t}</span><em>${esc(k.v)}</em></li>`).join('')}</ul>
    </article>`;
  }).join('');
  return `<div class="vhead"><div class="eyebrow"><b>能力阶梯</b> · 6 级 · 门槛全部可核对</div>
    <h2>已到 L${lad.level}「${lvName(lad.level)}」${nx ? `，L${nx.n} 已满足 ${nx.passed} / ${nx.checks.length} 项` : ''}</h2>
    <p>每一级都要满足全部门槛才算达成，L6 需要满足 7 项中的 5 项。「主要模式」对应 4D 框架里的三种人机协作方式：<b>自动化</b>（AI 按指令执行）、<b>增强</b>（人和 AI 一起思考）、<b>代理</b>（人设定好，AI 之后自己运行）。</p></div>
  <div class="ladder">${steps}</div>`;
}

function vFourD(c) {
  if (!c) return `<div class="vhead"><div class="eyebrow"><b>4D 素养</b></div><h2>四项素养</h2></div>${emptyState()}`;
  const { ev, self, a, snap } = c, m = snap.metrics;
  const comb = d => self && self.ds[d.id] != null ? 0.6 * d.ev + 0.4 * self.ds[d.id] : d.ev;
  const order = [...ev.ds].sort((x, y) => comb(y) - comb(x));
  const cards = ev.ds.map(d => {
    const inds = ev.ind.filter(i => i.d === d.id);
    const qs = QUESTIONS.filter(q => q.d === d.id);
    const sv = self ? self.ds[d.id] : null;
    return `<article class="dcard glass">
      <header><h3>${d.name}<small>${d.en}</small></h3><div class="big"><div><b style="color:var(--ink)">${r0(d.ev)}</b><span>证据</span></div><div><b style="color:${sv == null ? 'var(--faint)' : 'var(--ink)'}">${r0(sv)}</b><span>自评</span></div></div></header>
      <p class="def">${d.def}</p>
      <div class="subs">${d.subs.map(s => `<span class="chip">${s}</span>`).join('')}</div>
      <div class="tbl"><table><thead><tr><th>证据指标</th><th class="r">值 / 基准</th><th>得分</th></tr></thead><tbody>
      ${inds.map(i => `<tr tabindex="0" ${tipAttr(i.name, i.src)}><td>${i.name}</td><td class="r num">${fmt(i.value)} / ${fmt(i.tgt)}</td><td><div class="minibar ${i.score < 40 ? 'low' : ''}"><i style="width:${(i.score * .7).toFixed(0)}px"></i><span>${Math.round(i.score)}</span></div></td></tr>`).join('')}
      </tbody></table></div>
      ${a ? `<div class="tbl"><table><thead><tr><th>自评题</th><th>你的回答</th></tr></thead><tbody>
        ${qs.map(q => `<tr><td>${q.t}</td><td>${a.answers[q.id] != null ? `<b>${esc(q.o[a.answers[q.id]])}</b>` : '<span class="note">未答</span>'}</td></tr>`).join('')}</tbody></table></div>`
        : `<p class="note">自评还没做：这一项有 ${qs.length} 道题。<button class="btn" data-go="quiz" style="padding:3px 9px;font-size:12px">去做自评</button></p>`}
    </article>`;
  }).join('');
  const modeRows = [
    ['自动化', 'AI 按具体指令执行任务', `${m.sessions} 个代理会话写入 ${m.commits} 次提交`],
    ['增强', '人和 AI 作为思考伙伴一起工作', `${m.artifacts} 件 Artifact，覆盖 ${m.domains} 个领域`],
    ['代理', '人设定好，AI 之后代表人独立运行', `${m.routines} 个定时任务，每周 ${m.auto_outputs} 期自动产出`],
  ];
  return `<div class="vhead"><div class="eyebrow"><b>4D 素养</b> · AI Fluency Framework</div>
    <h2>「${order[0].name}」最强，「${order.at(-1).name}」最弱</h2>
    <p>4D 框架由 Rick Dakan、Joseph Feller 与 Anthropic 提出（2025，CC BY-NC-SA 4.0），把 AI 素养拆成四项能力、十二个子项。证据分取自本系统的客观指标，自评分取自对应的问卷题，两者分开显示。<a class="link" href="https://www.anthropic.com/ai-fluency" target="_blank" rel="noopener">Anthropic AI Fluency 课程</a></p></div>
  <div class="dcards">${cards}</div>
  <div class="panel glass"><div class="ptitle"><h3>三种协作模式</h3><span>同一框架的另一条轴</span></div>
    <div class="tbl"><table><thead><tr><th>模式</th><th>含义</th><th>你的证据</th></tr></thead><tbody>${modeRows.map(r => `<tr><th>${r[0]}</th><td>${r[1]}</td><td>${esc(r[2])}</td></tr>`).join('')}</tbody></table></div></div>`;
}

function vEvidence(c) {
  if (!c) return `<div class="vhead"><div class="eyebrow"><b>使用证据</b></div><h2>使用证据</h2></div>${emptyState()}`;
  const { ev, snap } = c, m = snap.metrics, L = snap.lists;
  const groups = [...DIMS, { id: null, name: '其他（只计入 4D）' }].map(d => {
    const rows = ev.ind.filter(i => i.dim === d.id);
    return `<tr class="grp"><th colspan="5">${d.name}</th></tr>` + rows.map(i => `<tr tabindex="0" ${tipAttr(i.name, i.src)}>
      <td>${i.name}<small>${esc(i.src)}</small></td><td class="r num"><b>${fmt(i.value)}</b> ${i.unit}</td><td class="r num">${fmt(i.tgt)} ${i.unit}</td>
      <td><div class="minibar ${i.score < 40 ? 'low' : ''}"><i style="width:${(i.score * .8).toFixed(0)}px"></i><span>${Math.round(i.score)}</span></div></td><td>${FOURD.find(x => x.id === i.d).name}</td></tr>`).join('');
  }).join('');
  const count = key => Object.entries([...L.artifacts, ...L.projects].reduce((o, x) => (o[x[key]] = (o[x[key]] || 0) + 1, o), {}))
    .sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ k, v }));
  const doms = count('domain'), fmts = count('format');
  const maxTok = Math.max(...L.sessions.map(s => s.tokens), 1);
  const ORI = { desktop_app: '桌面 App', ios: 'iPhone', claude_code_cli: '命令行', claude_code_mcp_seed: '会话派生' };
  const origins = Object.entries(L.origins).map(([k, v]) => `${ORI[k] || k} ${v}`).join(' · ');
  return `<div class="vhead"><div class="eyebrow"><b>使用证据</b> · ${esc(snap.window.from)} 至 ${esc(snap.window.to)}</div>
    <h2>近 30 天：${m.active_days} 个活跃日、${m.sessions} 个会话、${m.artifacts + m.projects} 件产出</h2>
    <p>全部来自可核对的记录：Claude Code 会话列表、Artifact 列表、定时任务、仓库 ${m.branches} 个分支的 Git 历史。采集于 ${esc(fmtAt(snap.collectedAt))}（UTC）。会话入口：${esc(origins)}。</p></div>
  <div class="panel glass"><div class="ptitle"><h3>${IND.length} 项指标</h3><span>得分 = 值 ÷ 基准，封顶 100</span></div>
    <div class="tbl"><table><thead><tr><th>指标</th><th class="r">值</th><th class="r">基准</th><th>得分</th><th>4D</th></tr></thead><tbody>${groups}</tbody></table></div></div>
  <div class="grid2">
    <div class="panel glass"><div class="ptitle"><h3>每日活动</h3><span>${Object.keys(snap.activity).length} 天有记录</span></div>${heatmap(snap.activity, heatFrom(snap), snap.date)}
      <div class="facts">${rhythm(snap).map(f => `<div class="fact"><b style="font-weight:600">${f[0]}</b><span class="v">${f[1]}</span></div>`).join('')}</div></div>
    <div class="panel glass"><div class="ptitle"><h3>使用方式</h3><span>全部 ${L.sessions.length} 个会话</span></div>
      <div class="eyebrow">入口</div>${hbars(Object.entries(L.origins).sort((a, b) => b[1] - a[1]).map(([k, n]) => ({ k: ORI[k] || k, v: n })), L.sessions.length)}
      <div class="eyebrow">思考力度</div>${hbars(Object.entries(L.efforts).sort((a, b) => b[1] - a[1]).map(([k, n]) => ({ k, v: n })), L.sessions.length)}
      <p class="note">模型家族：${L.models.map(esc).join('、')}${L.models.length < 2 ? '，全部会话都在同一档模型上' : ''}。</p></div>
  </div>
  <div class="grid2">
    <div class="panel glass"><div class="ptitle"><h3>领域分布</h3><span>${doms.length} 个领域 · Artifact + 项目</span></div>${hbars(doms, doms[0].v)}</div>
    <div class="panel glass"><div class="ptitle"><h3>产出形态</h3><span>${fmts.length} 种</span></div>${hbars(fmts, fmts[0].v)}</div>
  </div>
  <div class="panel glass"><div class="ptitle"><h3>Artifact · ${L.artifacts.length} 件</h3><span>按最近更新排序；领域按标题归类</span></div>
    <div class="tbl" style="max-height:420px;overflow-y:auto"><table><thead><tr><th>标题</th><th>领域</th><th>形态</th><th class="r">最近更新</th></tr></thead><tbody>
    ${L.artifacts.map(x => `<tr><td><a class="link" href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.title)}</a></td><td>${esc(x.domain)}</td><td>${esc(x.format)}</td><td class="r num">${esc(x.updated)}</td></tr>`).join('')}
    </tbody></table></div></div>
  <div class="panel glass"><div class="ptitle"><h3>仓库项目 · ${L.projects.length} 个 · ${fmt(m.src_lines)} 行源码</h3><span>源码行不含构建产物、压缩库和数据文件</span></div>
    <div class="tbl"><table><thead><tr><th>项目</th><th>领域</th><th class="r">源码行</th><th class="r">提交</th><th>默认分支</th><th class="r">周期</th></tr></thead><tbody>
    ${L.projects.map(p => `<tr><td>${esc(p.title)}<small>${esc(p.dir)}</small></td><td>${esc(p.domain)}</td><td class="r num">${fmt(p.lines)}</td><td class="r num">${p.commits}</td><td>${p.merged ? '<span class="chip"><span class="st good">✓</span>已合入</span>' : `<span class="chip"><span class="st serious">!</span>仅在分支</span>`}</td><td class="r num">${esc(p.first.slice(5))}${p.last !== p.first ? ' → ' + esc(p.last.slice(5)) : ''}</td></tr>`).join('')}
    </tbody></table></div></div>
  <div class="grid2">
    <div class="panel glass"><div class="ptitle"><h3>定时任务与调度</h3><span>${L.routines.length} 个</span></div>
      <div class="tbl"><table><thead><tr><th>名称</th><th>类型</th><th class="r">每周</th><th>上次</th></tr></thead><tbody>
      ${L.routines.map(r => `<tr><td>${esc(r.name)}<small>${esc(r.cron.replace('CRON_TZ=America/Los_Angeles ', '美西 '))}</small></td><td>${esc(r.kind)}</td><td class="r num">${r.perWeek || '—'}</td><td>${r.last === 'SUCCEEDED' ? '<span class="chip"><span class="st good">✓</span>成功</span>' : esc(r.last || '—')}</td></tr>`).join('')}
      </tbody></table></div></div>
    <div class="panel glass"><div class="ptitle"><h3>连接器</h3><span>${m.connectors_used} / ${m.connectors_total} 有使用证据</span></div>
      <div class="tbl"><table><thead><tr><th>连接器</th><th>证据</th></tr></thead><tbody>
      ${L.connectors.map(x => `<tr><td>${x.used ? '<span class="st good" style="display:inline-grid;width:14px;height:14px;border-radius:50%;font-size:9px;color:#fff;place-items:center;margin-right:6px">✓</span>' : '<span class="st none" style="display:inline-grid;width:14px;height:14px;border-radius:50%;font-size:9px;place-items:center;margin-right:6px">–</span>'}${esc(x.name)}</td><td>${esc(x.evidence)}</td></tr>`).join('')}
      </tbody></table></div>
      <p class="note">页面运行时能力：${L.caps.map(esc).join('、') || '无'}</p></div>
  </div>
  <div class="panel glass"><div class="ptitle"><h3>会话 · ${L.sessions.length} 个</h3><span>上下文用量合计 ${fmtTok(m.tokens)} token（窗口内）</span></div>
    <div class="tbl" style="max-height:420px;overflow-y:auto"><table><thead><tr><th>日期</th><th>标题</th><th>入口</th><th>力度</th><th>上下文</th></tr></thead><tbody>
    ${[...L.sessions].reverse().map(s => `<tr><td class="num">${esc(s.d.slice(5))}</td><td>${esc(s.title)}${s.plan ? ' <span class="chip">计划模式</span>' : ''}</td><td>${esc(ORI[s.origin] || s.origin)}</td><td>${esc(s.effort || '—')}</td><td><div class="minibar"><i style="width:${(s.tokens / maxTok * 90).toFixed(0)}px"></i><span>${fmtTok(s.tokens)}</span></div></td></tr>`).join('')}
    </tbody></table></div></div>
  <div class="grid2">
    <div class="panel glass"><div class="ptitle"><h3>校验环节 · ${L.verification.length} 项</h3><span>测试文件 ${L.tests.length} 个</span></div>
      <div class="facts">${L.verification.map(v => `<div class="fact"><b>${esc(v.project)}</b><span class="chip">${esc(v.kind)}</span><small>${esc(v.item)}</small></div>`).join('')}</div></div>
    <div class="panel glass"><div class="ptitle"><h3>沉淀与尽责</h3><span>规则 / 技能文件 ${L.rules.length} 个</span></div>
      <div class="facts">${L.sop.map(v => `<div class="fact"><b style="font-weight:600">${esc(v.name)}</b><span class="chip">${esc(v.kind)}</span></div>`).join('')}
      ${L.privacy.map(v => `<div class="fact"><b style="font-weight:600">${esc(v.item)}</b><span class="chip">尽责</span></div>`).join('')}</div></div>
  </div>
  <div class="panel glass"><div class="ptitle"><h3>看不到的部分</h3><span>这些不进证据分，靠自评补</span></div>
    <div class="subs">${L.blindSpots.map(b => `<span class="chip">${esc(b)}</span>`).join('')}</div></div>`;
}

function vQuiz(c) {
  const n = QUESTIONS.filter(q => S.draft[q.id] != null).length;
  const last = S.assess.at(-1);
  const canSave = n === QUESTIONS.length && S.db && S.canWrite !== false && !S.saving;
  const why = !S.db ? '在 claude.ai 中打开才能保存' : S.canWrite === false ? '只有页面所有者能保存' : n < QUESTIONS.length ? `还差 ${QUESTIONS.length - n} 题` : '';
  const groups = FOURD.map(d => `<div class="qgroup"><h3>${d.name}<small>${d.en}</small></h3>
    ${QUESTIONS.filter(q => q.d === d.id).map(q => `<div class="q glass" id="${q.id}">
      <div class="qt"><b>${q.id.slice(1)}</b><span>${q.t}</span>${q.dim ? `<span class="chip">${DIMS.find(x => x.id === q.dim).name}</span>` : ''}</div>
      <div class="opts" role="radiogroup" aria-label="${esc(q.t)}">${q.o.map((o, i) => `<button role="radio" aria-checked="${S.draft[q.id] === i}" data-q="${q.id}" data-a="${i}"><i>${'ABCD'[i]}</i><span>${o}</span></button>`).join('')}</div>
    </div>`).join('')}</div>`).join('');
  return `<div class="vhead"><div class="eyebrow"><b>自评问卷</b> · ${QUESTIONS.length} 题 · 约 4 分钟</div>
    <h2>补上数据看不到的部分：其他工具、工作场景、核查习惯</h2>
    <p>每题 4 档，依次计 0 / 33 / 67 / 100 分。自评只占综合分的 40%，和证据分开显示；某个维度自评比证据高 20 分以上，总览会单独标出。${last ? `上次保存：<b>${esc(fmtAt(last.at))}</b>（UTC），下面已带出上次的答案。` : ''}</p></div>
  <div class="quizbar glass"><div class="prog"><div><i style="width:${n / QUESTIONS.length * 100}%"></i></div><span>已答 ${n} / ${QUESTIONS.length}${why ? ' · ' + why : ''}</span></div>
    <button class="btn" data-act="clear">清空</button><button class="btn pri" data-act="save" ${canSave ? '' : 'disabled'}>${S.saving ? '保存中…' : '保存评估'}</button></div>
  ${groups}`;
}

function vHistory(c) {
  const pts = [
    ...S.snaps.map(s => ({ t: Date.parse(s.date + 'T12:00:00Z'), ev: scoreSnap(s).total, label: `快照 ${s.date} · 阶梯 L${ladderOf(s.metrics, null).level}` })),
    ...S.assess.map(a => { const sc = scoreSelf(a.answers); return { t: Date.parse(a.at), self: sc.total, label: `自评 ${fmtAt(a.at)} · ${sc.n} 题` }; }),
  ].sort((a, b) => a.t - b.t);
  if (!pts.length) return `<div class="vhead"><div class="eyebrow"><b>历史趋势</b></div><h2>历史趋势</h2></div>${emptyState()}`;
  const evs = S.snaps.map(s => scoreSnap(s).total);
  const head = evs.length > 1 ? `证据分 ${r0(evs[0])} → ${r0(evs.at(-1))}（${evs.at(-1) - evs[0] >= 0 ? '+' : ''}${Math.round(evs.at(-1) - evs[0])}）` : `目前有 ${S.snaps.length} 份快照、${S.assess.length} 次自评，重测后这里显示变化`;
  return `<div class="vhead"><div class="eyebrow"><b>历史趋势</b> · ${S.snaps.length} 份快照 · ${S.assess.length} 次自评</div><h2>${head}</h2>
    <p>每次重测，Claude 会重新采集近 30 天的数据，写入一份新快照；自评每保存一次记一条。旧记录不会被覆盖。</p></div>
  <div class="panel glass"><div class="ptitle"><h3>分数走势</h3><div class="legend"><span><i style="background:var(--s1)"></i>证据分</span><span><i style="background:var(--s2)"></i>自评分</span></div></div>${trendSVG(pts)}</div>
  <div class="grid2">
    <div class="panel glass"><div class="ptitle"><h3>快照</h3></div><div class="tbl"><table><thead><tr><th>日期</th><th class="r">证据分</th><th>阶梯</th><th class="r">会话</th><th class="r">产出</th></tr></thead><tbody>
    ${[...S.snaps].reverse().map(s => { const e = scoreSnap(s); return `<tr><td class="num">${esc(s.date)}</td><td class="r num"><b>${r0(e.total)}</b></td><td>L${ladderOf(s.metrics, null).level}</td><td class="r num">${s.metrics.sessions}</td><td class="r num">${s.metrics.artifacts + s.metrics.projects}</td></tr>`; }).join('')}
    </tbody></table></div></div>
    <div class="panel glass"><div class="ptitle"><h3>自评</h3></div>${S.assess.length ? `<div class="tbl"><table><thead><tr><th>时间（UTC）</th><th class="r">总分</th>${FOURD.map(d => `<th class="r">${d.name}</th>`).join('')}</tr></thead><tbody>
    ${[...S.assess].reverse().map(a => { const sc = scoreSelf(a.answers); return `<tr><td class="num">${esc(fmtAt(a.at))}</td><td class="r num"><b>${r0(sc.total)}</b></td>${FOURD.map(d => `<td class="r num">${r0(sc.ds[d.id])}</td>`).join('')}</tr>`; }).join('')}
    </tbody></table></div>` : `<p class="note">还没有自评记录。<button class="btn" data-go="quiz" style="padding:3px 9px;font-size:12px">去做自评</button></p>`}</div>
  </div>
  <div class="panel glass"><div class="ptitle"><h3>重测</h3><span>建议每月一次</span></div><p class="note">对 Claude 说下面这句。它会按仓库里 <b>ai-os/RETEST.md</b> 的步骤重新采集会话、Artifact、定时任务和 Git 记录，生成新快照写进这个页面。</p>${copyBox()}</div>`;
}

function vMethod(c) {
  const first = c ? Object.keys(c.snap.activity).sort()[0] : null;
  const formula = [
    ['指标得分', 'min(值 ÷ 基准, 1) × 100', '基准是本系统给「系统级用户」30 天设定的门槛，不是行业标准'],
    ['维度证据分', '该维度下指标得分的平均', '8 个维度：频率、广度、深度、集成、自动化、编排、验证、沉淀'],
    ['4D 证据分', '归入该项的指标得分的平均', '每个指标同时归入一个维度和一项 4D'],
    ['证据分', '8 个维度证据分的平均', ''],
    ['自评分', '答案 A/B/C/D 计 0/33/67/100，取平均', '维度和 4D 的自评分只算归入它的题'],
    ['综合分', '证据分 × 60% + 自评分 × 40%', '没做自评时等于证据分'],
    ['阶梯', '逐级检查门槛，全部满足才算达成', 'L6 需满足 7 项中的 5 项；最后一项来自自评第 19 题'],
    ['偏差', '自评 − 证据，按维度', '≥ 20 标为「自评偏高」，≤ −20 标为「自评偏低」'],
  ];
  return `<div class="vhead"><div class="eyebrow"><b>方法与口径</b></div><h2>证据占六成，自评占四成；每个分数都能追到原始记录</h2>
    <p>数据由 Claude 用你授权的工具读取，计分逻辑写在页面代码里，同一份快照无论何时打开，算出的分数都一样。</p></div>
  <div class="panel glass"><div class="ptitle"><h3>计分公式</h3></div><div class="tbl"><table><thead><tr><th>项目</th><th>算法</th><th>说明</th></tr></thead><tbody>
    ${formula.map(r => `<tr><th>${r[0]}</th><td>${r[1]}</td><td class="note">${r[2]}</td></tr>`).join('')}</tbody></table></div></div>
  <div class="grid2">
    <div class="panel glass"><div class="ptitle"><h3>框架来源</h3></div><div class="facts">
      <div class="fact"><b>4D 素养</b><small>Rick Dakan、Joseph Feller 与 Anthropic，《AI Fluency Framework》，2025，CC BY-NC-SA 4.0。四项能力：委派、描述、判断、尽责；三种模式：自动化、增强、代理。</small></div>
      <div class="fact"><b>六级阶梯、八个维度</b><small>本系统自定，用来衡量使用深度；每级门槛和每个指标的基准都写在「使用证据」和「能力阶梯」里。</small></div>
      <div class="fact"><b>人群对标</b><small>Pew Research Center（2025-02-24 至 03-02，5,123 名美国成年人）；Anthropic Economic Index 2026 年 1 月报告（2025-11-13 至 11-20 抽样）。口径与本系统不同，只作参照，不参与计分。</small></div>
    </div></div>
    <div class="panel glass"><div class="ptitle"><h3>数据从哪来</h3></div><div class="facts">
      <div class="fact"><b>会话</b><small>Claude Code 会话列表：标题、创建时间、入口、模型、思考力度、是否计划模式、上下文用量。</small></div>
      <div class="fact"><b>Artifact</b><small>你名下的 Artifact 列表和最近更新日期；领域与形态由 Claude 按标题归类，可能有个别归错。</small></div>
      <div class="fact"><b>定时任务</b><small>Routine 列表：排程、启用状态、上次运行结果。</small></div>
      <div class="fact"><b>Git</b><small>Project-Uno 全部远程分支：项目、源码行、提交、是否在默认分支、测试与规则文件、页面运行时能力。</small></div>
      <div class="fact"><b>人工核对项</b><small>连接器使用证据、校验环节、隐私实践，由 Claude 读代码和 README 后列出，每一项都写明出处。</small></div>
    </div></div>
  </div>
  <div class="panel glass"><div class="ptitle"><h3>局限</h3></div><div class="facts">
    <div class="fact"><b>只看得到 Claude Code</b><small>claude.ai 普通对话、Cowork、其他 AI 工具都不在证据里，所以「频率」「广度」可能被低估。自评第 1–4 题用来补这一块。</small></div>
    <div class="fact"><b>数量不等于质量</b><small>会话数、源码行衡量投入和规模，不衡量价值。「成果被他人使用」目前只能靠自评第 19 题。</small></div>
    <div class="fact"><b>基准是判断</b><small>每个基准都是本系统设定的门槛。改基准会让历史快照一起重算，便于前后对比。</small></div>
    <div class="fact"><b>30 天窗口</b><small>${first ? `可观测的最早记录是 ${esc(first)}，` : ''}时间还短，长期是否稳定还看不出来。</small></div>
  </div></div>
  <div class="panel glass"><div class="ptitle"><h3>隐私</h3></div><p class="note">评估快照和自评答案只存在这个页面的数据库里，页面默认私有。仓库里只有框架、计分代码和采集脚本，不含你的会话标题、Artifact 列表或答案。</p></div>`;
}
