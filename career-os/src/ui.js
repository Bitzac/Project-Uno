// ---------- shared view helpers (every module) ----------
// References: each rendered view numbers the sources it cites and lists them at its foot.
let REFS = [];
const resetRefs = () => { REFS = []; };
function ref(...keys) {
  return keys.filter(k => SRC[k]).map(k => {
    let i = REFS.indexOf(k); if (i < 0) { REFS.push(k); i = REFS.length - 1; }
    return `<sup class="ref"><a href="#ref-${i + 1}" title="${esc(SRC[k].t)}">[${i + 1}]</a></sup>`;
  }).join('');
}
// Inline citations inside copy: "…[[src-key]]" renders as a numbered reference.
const rich = s => String(s ?? '').replace(/\[\[([a-z0-9-]+)\]\]/g, (_, k) => ref(k));
const plain = s => String(s ?? '').replace(/\[\[[^\]]+\]\]/g, '').replace(/<[^>]+>/g, '');
const plainRich = s => String(s ?? '').replace(/\[\[[^\]]+\]\]/g, '');
const refsHTML = (asof = ASOF) => REFS.length ? `<section class="panel"><h3>来源 <small>截至 ${esc(asof)} 的公开资料；点击打开原文</small></h3><ol class="refs">${REFS.map((k, i) => `<li id="ref-${i + 1}"><span><a href="${esc(SRC[k].u)}" target="_blank" rel="noopener">${esc(SRC[k].t)}</a> · ${esc(SRC[k].d)}</span></li>`).join('')}</ol></section>` : '';
const FUND_FOOT = '本页数据来自公开报道与法规原文，口径与日期见各条来源；机构信息只列公开可查的投资案例，不代表其当前一定在投。内容不构成投资或法律意见，签约前请律师与财务顾问复核。';
const foot = text => `<p class="foot">${esc(text)}</p>`;
const phaseName = id => ([...PHASES, ...PD_PHASES].find(x => x.id === id) || {}).n || '';

function stepRow(st, opts = {}) {
  const done = stepDone(st.id), open = !!S.open[st.id], note = stepNote(st.id), p = curProj();
  const tip = st.tip && (st.tip[p.id] || st.tip[p.sector]);
  const br = st.br === 'gov' ? '<span class="tag acc">国资支线</span>' : st.br === 'usd' ? '<span class="tag acc">美元支线</span>' : '';
  const ph = opts.phase ? `<span class="tag">${esc(phaseName(st.ph))}</span>` : '';
  const rec = stepRec(st.id);
  return `<div class="steprow${done ? ' done' : ''}" id="row-${st.id}">
    <input type="checkbox" class="chk" id="chk-${st.id}" data-chg="step" data-id="${st.id}" data-w ${done ? 'checked' : ''} aria-label="${esc(st.t)}">
    <div><label class="t" for="chk-${st.id}">${esc(st.t)}${note ? '<i class="notedot" title="有备注"></i>' : ''}${br}${ph}</label>
      <div class="d">${rich(st.d)}${st.src ? ref(...st.src) : ''}</div>
      ${open ? `<div class="more">
        ${st.out ? `<div class="pn"><b>产出物</b><span>${rich(st.out)}</span></div>` : ''}
        ${st.who ? `<div class="pn"><b>谁来做</b><span>${esc(st.who)}</span></div>` : ''}
        ${tip ? `<div class="pn"><b>${esc(p.short || p.name)}</b><span>${rich(tip)}</span></div>` : ''}
        <textarea id="note-${st.id}" data-inp="note" data-id="${st.id}" data-w placeholder="备注：约了谁、卡在哪、下一步…">${esc(note)}</textarea>
        ${rec && rec.at ? `<span class="meta">最后更新 ${esc(rec.at)}</span>` : ''}
      </div>` : ''}
    </div>
    <button class="tgl" data-act="open" data-id="${st.id}" aria-expanded="${open}" aria-label="${open ? '收起' : '展开'}详情">${I.chev}</button>
  </div>`;
}
