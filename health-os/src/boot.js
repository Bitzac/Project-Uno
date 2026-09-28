/* ---------- splash ---------- */
const SPL = { t0: performance.now(), mesh: 0, verts: 0, done: false, gone: false, lines: 0 };
const ECG = { buf: null, ts: null, head: 0, acc: 0, last: 0 };
function ecgVal(ph) {
  const g = (m, s) => Math.exp(-(((ph - m) / s) ** 2) / 2);
  return 0.12 * g(0.18, 0.025) - 0.14 * g(0.37, 0.009) + 1.0 * g(0.4, 0.011) - 0.28 * g(0.43, 0.01) + 0.3 * g(0.66, 0.042);
}
function drawECG(t) {
  const cv = $('spCanvas'); if (!cv) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1), w = cv.clientWidth, h = cv.clientHeight;
  if (!w || !h) return;
  if (cv.width !== Math.round(w * dpr) || !ECG.buf) {
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    ECG.buf = new Float32Array(Math.ceil(w)); ECG.ts = new Float32Array(Math.ceil(w)).fill(-1e9); ECG.head = 0; ECG.last = t;
  }
  const c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, w, h);
  const R = w / 2, n = ECG.buf.length, bpm = curRhr() || 66, per = 60 / bpm, speed = w / 2.6;
  c.save(); c.beginPath(); c.arc(R, h / 2, R * 0.96, 0, Math.PI * 2); c.clip();
  c.fillStyle = 'rgba(8,24,56,.55)'; c.fillRect(0, 0, w, h);
  c.strokeStyle = 'rgba(143,219,255,.08)'; c.lineWidth = 1;
  for (let x = 0; x <= w; x += w / 20) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); }
  for (let y = 0; y <= h; y += w / 20) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
  ECG.acc += (t - ECG.last) / 1000 * speed; ECG.last = t;
  let steps = Math.floor(ECG.acc); ECG.acc -= steps;
  while (steps-- > 0) { const i = ECG.head % n; ECG.buf[i] = ecgVal(((t / 1000 - steps / speed) / per) % 1); ECG.ts[i] = t; ECG.head++; }
  const base = h * 0.5, amp = h * 0.24, hi = ECG.head % n;
  c.lineWidth = 2.2; c.lineJoin = 'round'; c.lineCap = 'round'; c.shadowColor = '#4FB2FF'; c.shadowBlur = 10;
  for (let x0 = 1; x0 < n; x0 += 14) {
    const x1 = Math.min(n - 1, x0 + 14), mid = Math.min(n - 1, x0 + 7);
    if (ECG.ts[mid] < 0) continue;
    const a = Math.max(0, 1 - (t - ECG.ts[mid]) / 2400); if (a <= 0.02) continue;
    c.strokeStyle = `rgba(143,230,255,${a.toFixed(3)})`; c.beginPath();
    let started = false;
    for (let x = x0 - 1; x <= x1; x++) { if (x === hi || x === hi - 1 || ECG.ts[x] < 0) { started = false; continue; } const Y = base - ECG.buf[x] * amp; if (!started) { c.moveTo(x, Y); started = true; } else c.lineTo(x, Y); }
    c.stroke();
  }
  c.shadowBlur = 16; c.fillStyle = '#EAF4FF';
  const hx = (hi - 1 + n) % n; c.beginPath(); c.arc(hx, base - ECG.buf[hx] * amp, 3.2, 0, Math.PI * 2); c.fill();
  c.shadowBlur = 0; c.textAlign = 'center'; c.fillStyle = 'rgba(234,244,255,.92)';
  c.font = `600 ${Math.round(w * 0.11)}px Outfit, sans-serif`; c.fillText(String(bpm), R, h * 0.82);
  c.font = `500 ${Math.round(w * 0.032)}px "JetBrains Mono", monospace`; c.fillStyle = 'rgba(143,219,255,.8)'; c.fillText('BPM · 静息心率', R, h * 0.88);
  c.restore();
}
function addLog(i) {
  const act = D.issues.filter(x => x.status !== 'resolved'), parts = new Set(act.map(x => x.part)), sev = act.filter(x => x.sev >= 4).length;
  const gs = labGroups(), abn = gs.filter(g => labStatus(g.latest).dir).length;
  const ok = ' <span class="ok">ok</span>';
  const L = [
    `&gt; 初始化扫描舱 · ${renderer ? 'WebGL ' + (renderer.capabilities.isWebGL2 ? '2' : '1') + ok : '3D 不可用，使用列表模式'}`,
    `&gt; 载入档案 <b>${D.people.length}</b> 份 · 当前 ${esc(D.profile ? D.profile.name : '—')} · <b>${curParts().length}</b> 个部位${ok}`,
    `&gt; 读取体征 <b>${D.vitals.length}</b> 条 · 体检指标 <b>${gs.length}</b> 项${ok}`,
    T3.built ? `&gt; 生成玻璃人体 · <b>${nf(SPL.verts)}</b> 个顶点${ok}` : '&gt; 玻璃人体未生成，左侧档案可正常使用',
    `&gt; 需关注部位 <b>${parts.size}</b> 处 · 异常指标 <b>${abn}</b> 项${sev ? ` · <span class="warn">严重 ${sev} 项</span>` : ''}`
  ];
  const d = document.createElement('div'); d.innerHTML = L[i]; $('spLog').append(d);
}
function splashFrame(t) {
  if (SPL.gone) return;
  requestAnimationFrame(splashFrame);
  const p = Math.min(Math.min(1, (t - SPL.t0) / 2600), SPL.mesh);
  $('spBar').style.width = (p * 100).toFixed(1) + '%'; $('spPct').textContent = Math.round(p * 100) + '%';
  const TH = [0.05, 0.28, 0.52, 0.99, 1];
  while (SPL.lines < TH.length && p >= TH[SPL.lines]) addLog(SPL.lines++);
  if (p >= 1 && !SPL.done) { SPL.done = true; $('spGo').classList.add('show'); setTimeout(enterApp, 1100); }
  drawECG(t);
}
function enterApp() {
  if (SPL.gone) return;
  SPL.gone = true;
  const s = $('splash'); s.classList.add('out'); $('win').classList.add('enter');
  setTimeout(() => { s.remove(); layout(); }, 900);
}
function splashMeta() {
  const p = D.profile, b = latestV('bp');
  $('spHr').textContent = `HR ${curRhr() ?? '—'} BPM`;
  $('spBp').textContent = `BP ${b ? b.value + '/' + b.value2 : '—/—'}`;
  $('spH').textContent = `H ${p && p.height ? p.height : '—'} CM`;
  $('spMeta').textContent = `SYS ${curParts().length} · ${fmtD(todayISO())}`;
}

/* ---------- actions ---------- */
async function togglePlan(id) {
  const p = D.plans.find(x => x.id === id); if (!p) return;
  const base = strip(p);
  if (p.done) { await put('plans', id, { ...base, done: false }); toast('已恢复为待办'); return; }
  if (p.repeat) {
    const t = todayISO(), from = p.due < t ? t : p.due, next = addPeriod(from, p.repeat);
    await put('plans', id, { ...base, due: next, last: t }); toast(`已打卡，下次 ${fmtMD(next)}`);
  } else { await put('plans', id, { ...base, done: true, doneAt: todayISO() }); toast(`已完成：${p.title}`); }
}
async function clearExamples() {
  if (!guardWrite()) return;
  let n = 0;
  try {
    if (mode === 'local') {
      for (const c of COLS) { n += D[c].filter(x => x.example).length; D[c] = D[c].filter(x => !x.example); saveLocal(c); }
    } else {
      const jobs = [];
      for (const c of COLS) for (const x of D[c].filter(x => x.example)) jobs.push([c, x.id]);
      for (let i = 0; i < jobs.length; i += 8) { await Promise.all(jobs.slice(i, i + 8).map(([c, id]) => del(c, id))); n += Math.min(8, jobs.length - i); }
    }
    ST.sel = null; ST.vt = null; renderAll(); toast(`已清除 ${n} 条示例数据`);
  } catch (e) { fail(e); }
}
async function onAct(e) {
  const b = e.target.closest('[data-act]'); if (!b) return;
  const a = b.dataset.act, id = b.dataset.id;
  try {
    switch (a) {
      case 'issue': { const i = D.issues.find(x => x.id === id); if (i) selectPart(i.part, i.side, { issue: id }); break; }
      case 'vt': ST.vt = b.dataset.type; renderAll(); $('list').scrollTop = 0; break;
      case 'vback': ST.vt = null; renderAll(); break;
      case 'vadd': openForm('vital', { type: b.dataset.type }); break;
      case 'vdel':
        if (!guardWrite()) break;
        if (!armed('v' + id)) { arm('v' + id); renderAll(); break; }
        ST.armed = null; await del('vitals', id); toast('已删除这条记录'); break;
      case 'lab': selectLab(b.dataset.key); break;
      case 'ladd': openForm('lab', { key: b.dataset.key }); break;
      case 'ldel':
        if (!guardWrite()) break;
        if (!armed('l' + id)) { arm('l' + id); renderAll(); break; }
        ST.armed = null; await del('labs', id); toast('已删除这次记录'); break;
      case 'plan': { const p = D.plans.find(x => x.id === id); if (!p) break; if (p.part) selectPart(p.part, '', { plan: id }); else openForm('plan', { id }); break; }
      case 'pedit2': openForm('plan', { id }); break;
      case 'chk': if (guardWrite()) await togglePlan(id); break;
      case 'close': clearSel(); break;
      case 'zall': setZone('all'); break;
      case 'part': selectPart(id); break;
      case 'iadd': openForm('issue', { part: b.dataset.part }); break;
      case 'padd': openForm('plan', { part: b.dataset.part }); break;
      case 'iedit': openForm('issue', { id }); break;
      case 'istat': {
        if (!guardWrite()) break;
        const i = D.issues.find(x => x.id === id); if (!i) break;
        await put('issues', id, { ...strip(i), status: b.dataset.s }); toast(`${i.title}：${STATUS[b.dataset.s]}`); break;
      }
      case 'idel':
        if (!guardWrite()) break;
        if (!armed('i' + id)) { arm('i' + id); renderAll(); break; }
        ST.armed = null; await del('issues', id); toast('已删除这个问题'); break;
      case 'pedit': openForm('profile'); break;
      case 'pnew': openForm('profile', { isNew: true }); break;
    }
  } catch (err) { fail(err); }
}

/* ---------- wiring ---------- */
function wire() {
  for (const id of ['list', 'card', 'profile', 'zoneHud', 'zchip']) $(id).addEventListener('click', onAct);
  $('people').addEventListener('click', e => { const b = e.target.closest('[data-pid]'); if (b) switchPerson(b.dataset.pid); else onAct(e); });
  document.querySelectorAll('.mods button').forEach(b => b.addEventListener('click', () => {
    ST.mod = b.dataset.mod; ST.vt = null; ST.q = ''; $('q').value = ''; saveUI(); renderAll(); $('list').scrollTop = 0;
  }));
  $('q').addEventListener('input', e => { ST.q = e.target.value; renderSide(); });
  $('g-a').onclick = () => { ST.grp[ST.mod] = ST.mod === 'issue' ? 'zone' : 'cat'; saveUI(); renderSide(); };
  $('g-b').onclick = () => { ST.grp[ST.mod] = ST.mod === 'issue' ? 'sev' : 'abn'; saveUI(); renderSide(); };
  $('addBtn').onclick = () => {
    const part = ST.sel && ST.sel.id ? ST.sel.id : '';
    if (ST.mod === 'issue') openForm('issue', { part: part || undefined });
    else if (ST.mod === 'vital') openForm('vital', { type: ST.vt || 'weight' });
    else if (ST.mod === 'lab') openForm('lab', {});
    else openForm('plan', { part });
  };
  $('exClear').onclick = clearExamples;
  document.querySelectorAll('.hud-tr [data-zone]').forEach(b => b.addEventListener('click', () => setZone(b.dataset.zone)));
  $('b-spin').setAttribute('aria-pressed', String(G.spin));
  $('b-spin').onclick = () => { G.spin = !G.spin; $('b-spin').setAttribute('aria-pressed', String(G.spin)); };
  $('b-reset').onclick = () => { const c = ST.sel && ST.sel.id ? partCam(ST.sel.id, ST.sel.side) : G.zone === 'all' ? { ...OVERVIEW_CAM, yaw: 0 } : ZONES[G.zone].cam; flyTo(c); };
  $('b-in').onclick = () => { setZoom(G.zoom * 1.3); G.lastInt = performance.now(); };
  $('b-out').onclick = () => { setZoom(G.zoom / 1.3); G.lastInt = performance.now(); };
  const co = $('callouts');
  co.addEventListener('click', e => { const b = e.target.closest('.co'); if (!b) return; if (b.dataset.z) setZone(b.dataset.z); else selectPart(b.dataset.p, b.dataset.side); });
  co.addEventListener('pointerover', e => { const b = e.target.closest('.co'); if (!b || !b.dataset.p) return; G.hoverPart = b.dataset.p; refreshTargets(); });
  co.addEventListener('pointerout', e => { const b = e.target.closest('.co'); if (!b || !b.dataset.p) return; G.hoverPart = null; refreshTargets(); });

  const hit = $('hit');
  hit.addEventListener('pointerdown', e => {
    if (!T3.scene) return;
    hit.setPointerCapture(e.pointerId); PTRS.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (PTRS.size === 2) { const [a, b] = [...PTRS.values()]; DRAG = { pinch: Math.hypot(a.x - b.x, a.y - b.y), zoom: G.zoom, moved: true }; return; }
    DRAG = { x: e.clientX, y: e.clientY, yaw: G.yaw, pitch: G.pitch, moved: false };
    G.lastInt = performance.now();
  });
  hit.addEventListener('pointermove', e => {
    if (PTRS.has(e.pointerId)) PTRS.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (DRAG) {
      if (DRAG.pinch) { if (PTRS.size >= 2) { const [a, b] = [...PTRS.values()]; setZoom(DRAG.zoom * Math.hypot(a.x - b.x, a.y - b.y) / DRAG.pinch); } return; }
      const dx = e.clientX - DRAG.x, dy = e.clientY - DRAG.y;
      if (!DRAG.moved && Math.hypot(dx, dy) > 4) { DRAG.moved = true; G.anim = null; hit.classList.add('drag'); $('captip').hidden = true; }
      if (DRAG.moved) { G.yaw = DRAG.yaw + dx * 0.009; G.pitch = clamp(DRAG.pitch + dy * 0.004, -0.35, 0.6); G.lastInt = performance.now(); }
      return;
    }
    if (e.pointerType === 'mouse') G.pend = e;
  });
  const end = e => {
    PTRS.delete(e.pointerId);
    if (!DRAG) return;
    const d = DRAG;
    if (PTRS.size === 0) { DRAG = null; hit.classList.remove('drag'); if (!d.moved && e.type === 'pointerup') clickAt(e); }
  };
  hit.addEventListener('pointerup', end); hit.addEventListener('pointercancel', end);
  hit.addEventListener('pointerleave', () => { if (DRAG) return; G.pend = null; if (G.hoverZone || G.hoverPart) { G.hoverZone = 0; G.hoverPart = null; refreshTargets(); markCalloutHover(); } $('captip').hidden = true; });
  hit.addEventListener('wheel', e => { e.preventDefault(); setZoom(G.zoom * Math.exp(-e.deltaY * 0.0015)); G.lastInt = performance.now(); }, { passive: false });

  document.addEventListener('keydown', e => {
    if (!SPL.gone && (e.key === 'Enter' || e.key === 'Escape' || e.key === ' ')) { e.preventDefault(); enterApp(); return; }
    if (e.key !== 'Escape') return;
    if (!$('overlay').hidden) closeForm();
    else if (ST.sel) clearSel();
    else if (G.zone !== 'all') setZone('all');
  });
  $('splash').addEventListener('click', enterApp);
  new ResizeObserver(() => layout()).observe($('stage'));
  const hro = new ResizeObserver(() => measureHud());
  hro.observe($('zoneHud')); hro.observe(document.querySelector('.hud-tr'));
}

function boot() {
  loadLocal();
  wire();
  renderAll();
  splashMeta();
  requestAnimationFrame(splashFrame);
  connect().then(splashMeta);
  init3D((p, v) => { SPL.mesh = Math.max(SPL.mesh, p); if (v) SPL.verts = v; }).then(v => { if (!v) SPL.mesh = 1; });
}
boot();
