/* ---------- web targets: landing, sign-in, consent, account ----------
 * global = email + password (verified email); cn = phone + SMS code. Consent is recorded per account in settings. */
const CFG = window.COMPASS_CONFIG || {};
const CONSENT_VERSION = '2026-10';
const LEGAL = TARGET === 'cn'
  ? [['terms', '用户协议', 'legal/terms.html'], ['privacy', '隐私政策', 'legal/privacy.html'], ['children', '儿童个人信息保护规则', 'legal/children.html']]
  : [['terms', 'Terms of Service', 'legal/terms.html'], ['privacy', 'Privacy Policy', 'legal/privacy.html'], ['children', "Children's Privacy Notice", 'legal/privacy.html#children']];
const WEB = { screen: 'boot', drawn: '', user: null, err: '', busy: false, cooldown: 0, delSent: false };
const consentOk = st => st && st.consent && st.consent.version === CONSENT_VERSION && st.consent.terms && st.consent.children && st.consent.sensitive;
const legalLink = ([, t, href]) => `<a href="${href}" target="_blank" rel="noopener">${esc(t)}</a>`;

function startWeb() {
  try { AUTH.init(onUser); }
  catch { WEB.screen = 'landing'; WEB.err = '服务暂时连不上，请稍后刷新。你可以先看演示。'; renderAll(); }
}
async function onUser(u) {
  WEB.user = u;
  if (!u) { if (WEB.screen === 'demo') return; disconnectStore(); WEB.screen = ['signup', 'login'].includes(WEB.screen) ? WEB.screen : 'landing'; return renderAll(); }
  if (WEB.screen === 'demo') disconnectStore();
  if (!u.verified) { WEB.screen = 'verify'; return renderAll(); }
  let st = {};
  try { st = await AUTH.getSettings(); } catch { st = {}; }
  if (!consentOk(st)) { WEB.screen = 'consent'; return renderAll(); }
  if (WEB.screen !== 'app') { WEB.screen = 'app'; connectStore(); }
  renderAll();
}
function enterDemo() {
  WEB.screen = 'demo'; WEB.err = '';
  loadLocal(); mode = 'local'; setSync('演示模式 · 数据只在本机', true); renderAll();
}
function leaveDemo() { mode = 'init'; for (const c of COLS) D[c] = []; D.students = []; D.st = null; CUR = null; WEB.screen = 'landing'; renderAll(); }

/* ---------- gate screens (shown in #view while signed out) ---------- */
const consentBoxes = () => `<fieldset class="consent"><legend>请阅读并逐项同意</legend>
  <label><input type="checkbox" id="cTerms"><span>我已阅读并同意 ${legalLink(LEGAL[0])} 和 ${legalLink(LEGAL[1])}</span></label>
  <label><input type="checkbox" id="cChildren"><span>我是孩子的父母或其他监护人，同意按 ${legalLink(LEGAL[2])} 处理孩子的个人信息</span></label>
  <label><input type="checkbox" id="cSensitive"><span>我单独同意处理孩子的<b>健康、体测、心理测评</b>等敏感个人信息，用于生成成长评估</span></label>
</fieldset>`;
const readConsent = () => ['cTerms', 'cChildren', 'cSensitive'].every(id => $(id) && $(id).checked);
const consentRecord = () => { const t = new Date().toISOString(); return { version: CONSENT_VERSION, terms: t, children: t, sensitive: t }; };
const gateErr = () => `<p class="ferr" role="alert">${esc(WEB.err)}</p>`;
const icpLine = () => TARGET === 'cn' && (CFG.icp || CFG.police) ? `<p class="icp">${CFG.icp ? `<a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener">${esc(CFG.icp)}</a>` : ''}${CFG.police ? `<span>${esc(CFG.police)}</span>` : ''}</p>` : '';

function renderGate() {
  const v = $('view'), s = WEB.screen, cn = TARGET === 'cn';
  // re-rendering the same screen (an error, a busy state) keeps what the parent already typed and ticked
  const keep = {};
  if (WEB.drawn === s) v.querySelectorAll('.gate input[id]').forEach(i => { keep[i.id] = i.type === 'checkbox' ? i.checked : i.value; });
  WEB.drawn = s;
  if (s === 'boot') { v.innerHTML = '<div class="empty"><div class="spin" aria-hidden="true"></div>正在连接…</div>'; return; }
  let card = '';
  if (s === 'landing') card = `<div class="gate-acts">
      ${cn ? `<button class="btn pri" data-act="web-go" data-s="login">手机号登录 / 注册</button>` : `<button class="btn pri" data-act="web-go" data-s="signup">注册</button><button class="btn ghost" data-act="web-go" data-s="login">登录</button>`}
      <button class="btn ghost" data-act="web-demo">先看演示</button></div>
      <p class="muted sm">演示里是 3 个虚构学生，数据只保存在你这台设备的浏览器里。</p>`;
  else if (s === 'signup') card = `<form id="wForm" class="gate-form" data-kind="signup" novalidate>
      <h2>注册家长账号</h2>
      <label class="field"><span>邮箱</span><input id="wEmail" type="email" autocomplete="email" required></label>
      <label class="field"><span>密码（至少 8 位）</span><input id="wPw" type="password" autocomplete="new-password" minlength="8" required></label>
      <label class="field"><span>再输一次密码</span><input id="wPw2" type="password" autocomplete="new-password" minlength="8" required></label>
      ${consentBoxes()}${gateErr()}
      <button class="btn pri" type="submit" ${WEB.busy ? 'disabled' : ''}>注册并发送验证邮件</button>
      <p class="sm">已有账号？<button type="button" class="linkbtn" data-act="web-go" data-s="login">登录</button></p></form>`;
  else if (s === 'login' && !cn) card = `<form id="wForm" class="gate-form" data-kind="login" novalidate>
      <h2>登录</h2>
      <label class="field"><span>邮箱</span><input id="wEmail" type="email" autocomplete="email" required></label>
      <label class="field"><span>密码</span><input id="wPw" type="password" autocomplete="current-password" required></label>
      ${gateErr()}
      <button class="btn pri" type="submit" ${WEB.busy ? 'disabled' : ''}>登录</button>
      <p class="sm"><button type="button" class="linkbtn" data-act="web-reset">忘记密码</button> · 还没有账号？<button type="button" class="linkbtn" data-act="web-go" data-s="signup">注册</button></p></form>`;
  else if (s === 'login') card = `<form id="wForm" class="gate-form" data-kind="otp" novalidate>
      <h2>手机号登录 / 注册</h2>
      <label class="field"><span>手机号</span><input id="wPhone" type="tel" inputmode="numeric" autocomplete="tel" maxlength="11" placeholder="11 位手机号" required></label>
      <div class="otp"><label class="field"><span>验证码</span><input id="wCode" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" required></label>
      <button type="button" class="btn ghost" data-act="web-code" ${WEB.cooldown > Date.now() ? 'disabled' : ''}>${WEB.cooldown > Date.now() ? '已发送' : '获取验证码'}</button></div>
      ${gateErr()}
      <button class="btn pri" type="submit" ${WEB.busy ? 'disabled' : ''}>登录</button>
      <p class="muted sm">未注册的手机号验证后会自动创建账号，首次登录需要阅读并同意相关协议。</p></form>`;
  else if (s === 'verify') card = `<div class="gate-form"><h2>验证你的邮箱</h2>
      <p>验证邮件已发到 <b>${esc(WEB.user ? WEB.user.label : '')}</b>。点开邮件里的链接后，回到这里继续。</p>${gateErr()}
      <div class="gate-acts"><button class="btn pri" data-act="web-verified">我已验证，继续</button><button class="btn ghost" data-act="web-resend">重新发送</button><button class="btn ghost" data-act="web-signout">换个账号</button></div></div>`;
  else if (s === 'consent') card = `<form id="wForm" class="gate-form" data-kind="consent" novalidate><h2>使用前请确认</h2>
      <p class="muted">成长罗盘会保存你录入的孩子的成绩、体测、身高体重、视力、心情打卡和心理测评结果。这些信息只有你的账号能访问，存放在${esc(AUTH.where)}。</p>
      ${consentBoxes()}${gateErr()}
      <div class="gate-acts"><button class="btn pri" type="submit" ${WEB.busy ? 'disabled' : ''}>同意并继续</button><button type="button" class="btn ghost" data-act="web-signout">不同意，退出</button></div></form>`;
  v.innerHTML = `<div class="gate">
    <div class="gate-hero">
      <span class="eyebrow">成长罗盘 · Compass · K-12</span>
      <h1>孩子的成长档案，<br>一处看清</h1>
      <p>成绩、综合素质五维图、体测与生长、视力、心情与心理测评。支持中国、美国、英国三套学制，按各自的官方标准计算。</p>
      <ul class="gate-points"><li><b>三套学制</b><span>国标体测、GPA、GCSE 按本学制计分</span></li><li><b>家长 / 学生视角</b><span>心理筛查结果只在家长视角显示</span></li><li><b>数据归你</b><span>${cn ? '存放在境内（腾讯云上海）' : '存放在伦敦（Google Cloud）'}，可随时导出或删除</span></li></ul>
    </div>
    <div class="gate-card glass">${card}${['signup', 'login'].includes(s) ? `<p class="sm"><button type="button" class="linkbtn" data-act="web-go" data-s="landing">返回</button></p>` : ''}</div>
  </div>${icpLine()}`;
  for (const [id, val] of Object.entries(keep)) { const el = $(id); if (el) { if (el.type === 'checkbox') el.checked = val; else el.value = val; } }
  const f = $('wForm');
  if (f && !Object.keys(keep).length) { const first = f.querySelector('input'); if (first) setTimeout(() => { if (!f.contains(document.activeElement)) first.focus({ preventScroll: true }); }, 40); }
}

async function gateSubmit(kind) {
  WEB.err = '';
  const val = id => ($(id) ? $(id).value.trim() : '');
  try {
    if (kind === 'signup') {
      const email = val('wEmail'), pw = $('wPw').value, pw2 = $('wPw2').value;
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('邮箱格式不对');
      if (pw.length < 8) throw new Error('密码至少 8 位');
      if (pw !== pw2) throw new Error('两次输入的密码不一致');
      if (!readConsent()) throw new Error('请逐项勾选同意后再注册');
      WEB.busy = true; renderAll();
      await AUTH.signUp(email, pw);
      await AUTH.saveConsent(consentRecord());
    } else if (kind === 'login') {
      const email = val('wEmail'), pw = $('wPw').value;
      if (!email || !pw) throw new Error('请填写邮箱和密码');
      WEB.busy = true; renderAll();
      await AUTH.signIn(email, pw);
    } else if (kind === 'otp') {
      const phone = val('wPhone'), code = val('wCode');
      if (!/^1\d{10}$/.test(phone)) throw new Error('请输入 11 位手机号');
      if (!/^\d{4,6}$/.test(code)) throw new Error('请输入短信验证码');
      WEB.busy = true; renderAll();
      await AUTH.verifyCode(code);
    } else if (kind === 'consent') {
      if (!readConsent()) throw new Error('需要逐项同意后才能使用');
      WEB.busy = true; renderAll();
      await AUTH.saveConsent(consentRecord());
      WEB.busy = false;
      return onUser(WEB.user);
    }
  } catch (e) { WEB.err = AUTH.message ? AUTH.message(e) : String(e.message || e); }
  WEB.busy = false; renderAll();
}

/* ---------- account sheet ---------- */
async function openAccount() {
  if (WEB.screen === 'demo') return leaveDemo();
  let st = {};
  try { st = await AUTH.getSettings(); } catch { }
  const c = st.consent;
  openSheet('账户', `
    <div class="acct-rows">
      <div><span>登录账号</span><b>${esc(WEB.user ? WEB.user.label : '')}</b></div>
      <div><span>数据存放</span><b>${esc(AUTH.where)}</b></div>
      <div><span>授权记录</span><b>${c ? `${esc(c.version)} 版 · ${fmtD(String(c.terms).slice(0, 10))} 同意` : '—'}</b></div>
    </div>
    <div class="acct-acts"><button type="button" class="btn ghost" data-act="web-export">导出全部数据（JSON）</button><button type="button" class="btn ghost" data-act="web-signout">退出登录</button></div>
    <p class="sm">${LEGAL.map(legalLink).join(' · ')}</p>
    <div class="danger-zone">
      <h3>删除账户</h3>
      <p class="sm muted">会永久删除这个账户和所有孩子的档案、成绩、体测、心理记录，无法恢复。撤回授权也通过删除账户完成。删除前建议先导出数据。</p>
      ${TARGET === 'cn'
      ? `<div class="otp"><label class="field"><span>短信验证码</span><input id="dCode" type="text" inputmode="numeric" maxlength="6"></label><button type="button" class="btn ghost" data-act="web-delcode">${WEB.delSent ? '已发送' : '获取验证码'}</button></div>`
      : `<label class="field"><span>输入登录密码确认</span><input id="dPw" type="password" autocomplete="current-password"></label>`}
      <label class="check"><input type="checkbox" id="dSure"><span>我了解删除后无法恢复</span></label>
      <button type="button" class="btn danger" data-act="web-delete">永久删除账户和全部数据</button>
    </div>`, { submit: false });
}
async function exportData() {
  try {
    const data = await STORE.exportAll();
    const blob = new Blob([JSON.stringify({ app: 'compass', exportedAt: new Date().toISOString(), account: WEB.user && WEB.user.label, data }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = `compass-export-${todayISO()}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    toast('已导出');
  } catch (e) { toast('导出失败：' + AUTH.message(e)); }
}
async function deleteAccount(btn) {
  const err = $('ferr');
  if (!$('dSure').checked) { err.textContent = '请先勾选「我了解删除后无法恢复」'; return; }
  const arg = TARGET === 'cn' ? { code: ($('dCode').value || '').trim() } : { password: $('dPw').value };
  if (TARGET === 'cn' ? !/^\d{4,6}$/.test(arg.code) : !arg.password) { err.textContent = TARGET === 'cn' ? '请输入短信验证码' : '请输入登录密码'; return; }
  btn.disabled = true; btn.textContent = '正在删除…';
  try {
    UNSUB_TOP.forEach(u => u()); UNSUB.forEach(u => u()); UNSUB_TOP = []; UNSUB = [];
    await AUTH.deleteAccount(arg);
    closeSheet(); disconnectStore(); WEB.screen = 'landing'; WEB.user = null; renderAll();
    toast('账户和全部数据已删除');
  } catch (e) {
    err.textContent = AUTH.message(e); btn.disabled = false; btn.textContent = '永久删除账户和全部数据';
    if (WEB.screen === 'app') connectStore();
  }
}

function renderAcct() {
  const b = $('acct'); if (!b) return;
  b.hidden = !['app', 'demo'].includes(WEB.screen);
  b.textContent = WEB.screen === 'demo' ? '退出演示' : (WEB.user ? WEB.user.label : '账户');
}

/* events for web-* actions (the main click handler in boot.js ignores them) */
document.addEventListener('click', async e => {
  const b = e.target.closest('[data-act^="web-"]'); if (!b) return;
  const a = b.dataset.act;
  if (a === 'web-go') { WEB.screen = b.dataset.s; WEB.err = ''; return renderAll(); }
  if (a === 'web-demo') return enterDemo();
  if (a === 'web-signout') { closeSheet(); try { await AUTH.signOut(); } catch { } WEB.screen = 'landing'; WEB.cooldown = 0; WEB.delSent = false; return onUser(null); }
  if (a === 'web-export') return exportData();
  if (a === 'web-delete') return deleteAccount(b);
  if (a === 'web-resend') { try { await AUTH.resend(); toast('已重新发送验证邮件'); } catch (er) { WEB.err = AUTH.message(er); renderAll(); } return; }
  if (a === 'web-verified') { try { if (await AUTH.reloadVerified()) return onUser({ ...WEB.user, verified: true }); WEB.err = '还没有验证成功，请点邮件里的链接后再试'; } catch (er) { WEB.err = AUTH.message(er); } return renderAll(); }
  if (a === 'web-reset') {
    const email = $('wEmail') ? $('wEmail').value.trim() : '';
    if (!email) { WEB.err = '先填写邮箱，再点「忘记密码」'; return renderAll(); }
    try { await AUTH.reset(email); toast('重设密码的邮件已发送'); } catch (er) { WEB.err = AUTH.message(er); renderAll(); }
    return;
  }
  if (a === 'web-code') {
    const phone = $('wPhone') ? $('wPhone').value.trim() : '';
    if (!/^1\d{10}$/.test(phone)) { WEB.err = '请输入 11 位手机号'; return renderAll(); }
    b.disabled = true;
    try { await AUTH.sendCode(phone); WEB.cooldown = Date.now() + 60000; WEB.err = ''; toast('验证码已发送'); setTimeout(() => { if (WEB.screen === 'login') renderAll(); }, 60500); }
    catch (er) { WEB.err = AUTH.message(er); }
    renderAll();
    return;
  }
  if (a === 'web-delcode') { try { await AUTH.requestDeleteCode(); WEB.delSent = true; b.textContent = '已发送'; toast('验证码已发送'); } catch (er) { $('ferr').textContent = AUTH.message(er); } }
});
document.addEventListener('submit', e => {
  if (e.target.id !== 'wForm') return;
  e.preventDefault();
  gateSubmit(e.target.dataset.kind);
});
