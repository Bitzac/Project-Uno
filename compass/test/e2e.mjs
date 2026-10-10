// End-to-end tests in headless Chromium.
//   node test/e2e.mjs artifact   Artifact build in local mode (no backend)
//   node test/e2e.mjs cn         China build against the CloudBase test double (test/fake-cloudbase.js)
//   node test/e2e.mjs global     overseas build against the Firebase Auth + Firestore emulators
//   npm run test:e2e             all three, with the emulators started by firebase emulators:exec
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { serve } from './serve.mjs';

const ROOT = new URL('..', import.meta.url).pathname;
const TMP = ROOT + 'test/.tmp/';
const parts = process.argv[2] && process.argv[2] !== 'all' ? [process.argv[2]] : ['artifact', 'cn', 'global'];
const SHOTS = process.env.SHOTS ? TMP + 'shots/' : null;
let failed = 0;
const step = async (name, fn) => {
  try { await fn(); console.log('ok  ', name); }
  catch (e) { failed++; console.log('FAIL', name, '—', String(e.message).split('\n')[0], process.env.DEBUG ? (String(e.stack).match(/e2e\.mjs:\d+/g) || []).join(' ') : ''); }
};
const expect = (cond, msg) => { if (!cond) throw new Error(msg); };
const build = t => execFileSync('node', [ROOT + 'build.mjs', t], { stdio: 'pipe' });
const browser = await chromium.launch();
if (SHOTS) mkdirSync(SHOTS, { recursive: true });

async function open(url, errs, { local = true, viewport = { width: 1280, height: 900 } } = {}) {
  const ctx = await browser.newContext({ viewport, acceptDownloads: true });
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_FAILED/.test(m.text())) errs.push(m.text()); });
  // hermetic: only the local server, file:// and the emulators
  await p.route('**/*', r => { const u = r.request().url(); return u.startsWith('file:') || /^https?:\/\/(127\.0\.0\.1|localhost)[:/]/.test(u) ? r.continue() : r.abort(); });
  await p.goto(url);
  return p;
}
const shot = async (p, name) => { if (SHOTS) await p.screenshot({ path: SHOTS + name + '.png', fullPage: true }); };
const text = p => p.textContent('#view');
const waitText = (p, t, timeout = 15000) => p.waitForFunction(t => document.getElementById('view').textContent.includes(t), t, { timeout });

/* ---------- Artifact build, local mode ---------- */
async function artifact() {
  console.log('\n# artifact (local mode)');
  build('artifact');
  mkdirSync(TMP + 'artifact', { recursive: true });
  writeFileSync(TMP + 'artifact/index.html', `<!doctype html><html><head><meta charset=utf8><meta name=viewport content="width=device-width,initial-scale=1"></head><body>${readFileSync(ROOT + 'index.html', 'utf8')}</body></html>`);
  const errs = [], p = await open('file://' + TMP + 'artifact/index.html', errs);
  const ls = k => p.evaluate(k => JSON.parse(localStorage.getItem(k) || 'null'), k);
  const n0 = (await ls('k12-s-ex-cn-scores')).length;
  await step('add a score', async () => {
    await p.click('#nav [data-v="acad"]'); await p.click('[data-act="add-score"]');
    await p.fill('#fSubj', '数学'); await p.selectOption('#fKind', '单元测验'); await p.fill('#fVal', '108'); await p.fill('#fFull', '120'); await p.fill('#fAvg', '96');
    await p.click('#sheetForm button[type=submit]'); await p.waitForTimeout(150);
    expect((await ls('k12-s-ex-cn-scores')).length === n0 + 1, 'score not saved');
  });
  await step('score validation', async () => {
    await p.click('[data-act="add-score"]'); await p.fill('#fSubj', '数学'); await p.fill('#fVal', '130'); await p.fill('#fFull', '120');
    await p.click('#sheetForm button[type=submit]');
    expect((await p.textContent('#ferr')).includes('0 到满分'), 'no validation error'); await p.click('#sheet [data-act="close"]');
  });
  await step('delete needs a second tap', async () => {
    const id = (await ls('k12-s-ex-cn-scores')).at(-1).id;
    await p.click(`[data-act="del"][data-id="${id}"]`); expect((await ls('k12-s-ex-cn-scores')).length === n0 + 1, 'deleted on first tap');
    await p.click(`[data-act="del"][data-id="${id}"]`); await p.waitForTimeout(150);
    expect((await ls('k12-s-ex-cn-scores')).length === n0, 'not deleted');
  });
  await step('fitness test scored with the national tables', async () => {
    await p.click('#nav [data-v="body"]'); await p.click('[data-act="add-fit"]');
    await p.fill('#fi_vc', '2900'); await p.fill('#fi_r50', '8.5'); await p.fill('#fi_sr', '15'); await p.fill('#fi_jump', '180'); await p.fill('#fi_situp', '47'); await p.fill('#fi_run', "3'40\"");
    await p.click('#sheetForm button[type=submit]');
    const t = await p.textContent('.fsum', { timeout: 3000 });
    expect(t.includes('89.8') && t.includes('良好'), t);
  });
  await step('vision, rating, merit forms', async () => {
    await p.click('[data-act="add-vision"]'); await p.fill('#fL', '4.6'); await p.fill('#fR', '4.7'); await p.click('#sheetForm button[type=submit]'); await p.waitForTimeout(100);
    expect((await text(p)).includes('4.6'), 'vision');
    await p.click('#nav [data-v="holi"]'); await p.click('[data-act="add-rating"]'); await p.selectOption('#fTerm', '2026-1');
    await p.selectOption('#fRate_moral', 'A'); await p.selectOption('#fRate_arts', 'B'); await p.selectOption('#fRate_practice', 'C');
    await p.click('#sheetForm button[type=submit]'); await p.waitForTimeout(100);
    expect((await ls('k12-s-ex-cn-ratings')).filter(x => x.term === '2026-1').length === 3, 'ratings');
    await p.click('[data-act="add-merit"]'); await p.fill('#fTitle', '测试事迹'); await p.fill('#fHours', '3'); await p.click('#sheetForm button[type=submit]'); await p.waitForTimeout(100);
    expect((await text(p)).includes('测试事迹'), 'merit');
  });
  await step('check-in and WHO-5', async () => {
    await p.click('#nav [data-v="mind"]'); await p.click('[data-act="ck-mood"][data-v="4"]'); await p.click('[data-act="ck-stress"][data-v="2"]');
    await p.fill('#ckSleep', '8.5'); await p.fill('#ckActive', '60'); await p.click('#ckForm button[type=submit]'); await p.waitForTimeout(100);
    const today = await p.evaluate(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; });
    const m = (await ls('k12-s-ex-cn-moods')).find(x => x.date === today); expect(m && m.mood === 4 && m.sleep === 8.5, 'check-in');
    const w0 = (await ls('k12-s-ex-cn-who5')).length;
    await p.click('[data-act="who5"]'); for (let i = 0; i < 5; i++) await p.click(`input[name="w${i}"][value="4"] + span`);
    await p.click('#sheetForm button[type=submit]'); await p.waitForTimeout(100);
    expect((await ls('k12-s-ex-cn-who5')).length === w0 + 1, 'who5');
  });
  await step('screening shows a parent alert', async () => {
    await p.click('[data-act="add-screen"]'); await p.selectOption('#fScale', 'GAD-7'); await p.fill('#fScore', '12'); await p.click('#sheetForm button[type=submit]'); await p.waitForTimeout(100);
    expect((await p.textContent('.alertbox')).includes('GAD-7'), 'no alert');
  });
  await step('PIN locks the student view; private data hidden there', async () => {
    await p.click('[data-act="pin"]'); await p.fill('#fPin1', '2468'); await p.fill('#fPin2', '2468'); await p.click('#sheetForm button[type=submit]'); await p.waitForTimeout(250);
    await p.click('#role [data-role="student"]'); await p.waitForTimeout(100);
    const t = await text(p); expect(!t.includes('筛查') && !t.includes('GAD-7') && !t.includes('备忘'), 'private data visible');
    expect((await p.$$('.kid[data-id]')).length === 1, 'other children visible');
    await p.click('#role [data-role="parent"]'); await p.fill('#fPin', '1111'); await p.click('#sheetForm button[type=submit]'); await p.waitForTimeout(250);
    expect((await p.textContent('#ferr')).includes('不对'), 'wrong PIN accepted');
    await p.fill('#fPin', '2468'); await p.click('#sheetForm button[type=submit]'); await p.waitForTimeout(250);
    expect((await text(p)).includes('筛查'), 'parent view not restored');
  });
  await step('new US student: AP course counts in weighted GPA', async () => {
    await p.click('[data-act="new-student"]'); await p.fill('#fName', '测试生'); await p.selectOption('#fSys', 'us'); await p.selectOption('#fGrade', '10');
    await p.fill('#fBirth', '2010-03'); await p.click('#sheetForm button[type=submit]'); await p.waitForTimeout(150);
    await p.click('#nav [data-v="acad"]'); await p.click('[data-act="add-score"]'); await p.fill('#fSubj', 'Chemistry'); await p.fill('#fVal', '91'); await p.selectOption('#fLvl', 'AP');
    await p.click('#sheetForm button[type=submit]'); await p.waitForTimeout(150);
    const h = await p.textContent('.headline'); expect(h.includes('3.70') && h.includes('加权 4.70'), h);
    await p.click('#nav [data-v="home"]'); await p.click('[data-act="edit-student"]'); await p.click('[data-act="del-student"]'); await p.click('[data-act="del-student"]'); await p.waitForTimeout(150);
    expect(!(await ls('k12-students')).some(s => s.name === '测试生'), 'student not deleted');
  });
  await step('clear and reload examples', async () => {
    await p.click('[data-act="clear-ex"]'); await p.click('[data-act="clear-ex"]'); await p.waitForTimeout(150);
    expect((await text(p)).includes('还没有学生档案'), 'not empty');
    await p.click('[data-act="load-ex"]'); await p.waitForTimeout(150);
    expect((await ls('k12-students')).length === 3, 'examples not reloaded');
  });
  await step('no page errors', async () => expect(!errs.length, errs.join(' | ')));
}

/* ---------- China build, CloudBase test double ---------- */
async function cn() {
  console.log('\n# cn (CloudBase test double)');
  build('cn');
  rmSync(TMP + 'cn', { recursive: true, force: true });
  cpSync(ROOT + 'dist/cn', TMP + 'cn', { recursive: true });
  cpSync(ROOT + 'test/fake-cloudbase.js', TMP + 'cn/vendor.js');
  writeFileSync(TMP + 'cn/config.js', "window.COMPASS_CONFIG = { cloudbase: { env: 'test-env' }, icp: '沪ICP备00000000号-1', police: '沪公网安备 00000000000000 号' };");
  const server = await serve(TMP + 'cn', 5174);
  const errs = [], p = await open('http://127.0.0.1:5174/', errs);
  const db = () => p.evaluate(() => JSON.parse(localStorage.getItem('fake-cloudbase')));
  const login = async (phone, newUser) => {
    await p.click('[data-act="web-go"][data-s="login"]');
    await p.fill('#wPhone', phone); await p.click('[data-act="web-code"]');
    await p.fill('#wCode', '123456'); await p.click('#wForm button[type=submit]');
    if (newUser) await waitText(p, '使用前请确认');
  };
  const signOut = async () => { await p.click('#acct'); await p.click('#sheet [data-act="web-signout"]'); await waitText(p, '手机号登录'); };

  await step('landing shows SMS sign-in, demo and the ICP number', async () => {
    await waitText(p, '手机号登录 / 注册'); await shot(p, 'cn-landing');
    expect((await p.textContent('body')).includes('沪ICP备00000000号-1'), 'no ICP line');
    expect(!(await p.content()).includes('fonts.googleapis'), 'loads Google Fonts');
  });
  await step('first sign-in asks for three separate consents', async () => {
    await login('13800000000', true);
    await p.click('#wForm button[type=submit]'); await p.waitForTimeout(100);
    expect((await text(p)).includes('需要逐项同意'), 'submitted without consent');
    await p.check('#cTerms'); await p.check('#cChildren'); await p.check('#cSensitive');
    await p.click('#wForm button[type=submit]'); await waitText(p, '还没有学生档案');
    const st = (await db()).db.settings['u13800000000'];
    expect(st && st.consent && st.consent.version === '2026-10' && st.owner === 'u13800000000', 'consent not stored');
  });
  await step('load examples, add a score, reload: data persists', async () => {
    await p.click('[data-act="load-ex"]'); await p.waitForSelector('.kid[data-id]', { timeout: 10000 });
    expect((await p.$$('.kid[data-id]')).length === 3, 'not 3 students');
    const before = Object.keys((await db()).db.scores || {}).length;
    await p.click('#nav [data-v="acad"]'); await p.click('[data-act="add-score"]');
    await p.fill('#fSubj', '数学'); await p.fill('#fVal', '100'); await p.fill('#fFull', '120'); await p.click('#sheetForm button[type=submit]');
    await p.waitForTimeout(200);
    expect(Object.keys((await db()).db.scores).length === before + 1, 'score not written');
    await p.reload(); await p.waitForSelector('.kid[data-id]', { timeout: 10000 });
    expect((await p.$$('.kid[data-id]')).length === 3, 'data lost after reload');
  });
  await step('every stored document carries owner and sid', async () => {
    const all = (await db()).db, bad = [];
    for (const [c, docs] of Object.entries(all)) for (const [id, d] of Object.entries(docs)) if (d.owner !== 'u13800000000' || (c !== 'settings' && !d.sid)) bad.push(c + '/' + id);
    expect(!bad.length, bad.slice(0, 3).join(', '));
  });
  await step('a second account sees nothing of the first', async () => {
    await signOut(); await login('13900000000', true);
    await p.check('#cTerms'); await p.check('#cChildren'); await p.check('#cSensitive'); await p.click('#wForm button[type=submit]');
    await waitText(p, '还没有学生档案');
    await signOut(); await login('13800000000', false);
    await p.waitForSelector('.kid[data-id]', { timeout: 10000 });
  });
  await step('export downloads all data as JSON', async () => {
    await p.click('#acct');
    const [dl] = await Promise.all([p.waitForEvent('download'), p.click('[data-act="web-export"]')]);
    const j = JSON.parse(readFileSync(await dl.path(), 'utf8'));
    expect(j.data.students.length === 3 && j.data.scores.length > 100 && j.data.settings.consent, 'export incomplete');
    expect(!JSON.stringify(j).includes('"owner"'), 'export leaks internal owner field');
  });
  await step('delete account needs an SMS code and removes everything', async () => {
    await p.check('#dSure'); await p.click('[data-act="web-delete"]');
    expect((await p.textContent('#ferr')).includes('验证码'), 'deleted without code');
    await p.click('[data-act="web-delcode"]'); await p.fill('#dCode', '123456'); await p.click('[data-act="web-delete"]');
    await waitText(p, '手机号登录');
    const s = await db(), left = Object.values(s.db).flatMap(c => Object.values(c)).filter(d => d.owner === 'u13800000000');
    expect(!left.length && !s.users['13800000000'], `${left.length} documents left`);
    expect(Object.values(s.db.settings).some(d => d.owner === 'u13900000000'), 'other account was touched');
  });
  await step('demo mode works without an account', async () => {
    await p.click('[data-act="web-demo"]'); await p.waitForSelector('.kid[data-id]');
    expect((await p.textContent('#foot')).includes('演示模式'), 'no demo notice');
    await p.click('#acct'); await waitText(p, '手机号登录');
  });
  await step('no page errors', async () => expect(!errs.length, errs.join(' | ')));
  if (SHOTS) { const m = await open('http://127.0.0.1:5174/', [], { viewport: { width: 390, height: 844 } }); await m.waitForTimeout(400); await shot(m, 'cn-landing-phone'); }
  server.close();
}

/* ---------- overseas build, Firebase emulators ---------- */
const AUTH_EMU = 'http://127.0.0.1:9099', FS_EMU = 'http://127.0.0.1:8080', PROJECT = 'demo-compass';
async function verifyEmail(email) {
  const r = await (await fetch(`${AUTH_EMU}/emulator/v1/projects/${PROJECT}/oobCodes`)).json();
  const code = (r.oobCodes || []).filter(c => c.email === email && c.requestType === 'VERIFY_EMAIL').pop();
  expect(code, 'no verification email for ' + email);
  await fetch(code.oobLink);
}
async function allDocs() {
  const out = {};
  for (const c of ['students', 'scores', 'fitness', 'health', 'ratings', 'merits', 'moods', 'who5', 'screens', 'notes', 'settings']) {
    out[c] = [];
    for (let token = ''; ;) {
      const r = await (await fetch(`${FS_EMU}/v1/projects/${PROJECT}/databases/(default)/documents/${c}?pageSize=300${token ? '&pageToken=' + token : ''}`, { headers: { Authorization: 'Bearer owner' } })).json();
      out[c].push(...(r.documents || []).map(d => ({ owner: d.fields.owner && d.fields.owner.stringValue, sid: d.fields.sid && d.fields.sid.stringValue })));
      if (!(token = r.nextPageToken)) break;
    }
  }
  return out;
}
async function global() {
  console.log('\n# global (Firebase emulators)');
  try { await fetch(AUTH_EMU); await fetch(FS_EMU); } catch { failed++; console.log('FAIL emulators not running — use npm run test:e2e'); return; }
  await fetch(`${FS_EMU}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, { method: 'DELETE' });
  await fetch(`${AUTH_EMU}/emulator/v1/projects/${PROJECT}/accounts`, { method: 'DELETE' });
  build('global');
  rmSync(TMP + 'global', { recursive: true, force: true });
  cpSync(ROOT + 'dist/global', TMP + 'global', { recursive: true });
  writeFileSync(TMP + 'global/config.js', `window.COMPASS_CONFIG = { firebase: { apiKey: 'demo-key', authDomain: '${PROJECT}.firebaseapp.com', projectId: '${PROJECT}', appId: '1:1:web:1' }, emulator: true };`);
  const server = await serve(TMP + 'global', 5175);
  const errs = [], p = await open('http://127.0.0.1:5175/', errs);
  const signUp = async email => {
    await p.click('[data-act="web-go"][data-s="signup"]');
    await p.fill('#wEmail', email); await p.fill('#wPw', 'parent-pass-1'); await p.fill('#wPw2', 'parent-pass-1');
    await p.check('#cTerms'); await p.check('#cChildren'); await p.check('#cSensitive');
    await p.click('#wForm button[type=submit]'); await waitText(p, '验证你的邮箱');
    await verifyEmail(email); await p.click('[data-act="web-verified"]'); await waitText(p, '还没有学生档案');
  };
  const signOut = async () => { await p.click('#acct'); await p.click('#sheet [data-act="web-signout"]'); await waitText(p, '注册'); };
  await step('landing offers sign-up, sign-in and demo', async () => { await waitText(p, '先看演示'); await shot(p, 'global-landing'); });
  await step('sign-up checks consent and password before creating the account', async () => {
    await p.click('[data-act="web-go"][data-s="signup"]');
    await p.fill('#wEmail', 'a@example.com'); await p.fill('#wPw', 'parent-pass-1'); await p.fill('#wPw2', 'parent-pass-1');
    await p.click('#wForm button[type=submit]'); await p.waitForTimeout(100);
    expect((await text(p)).includes('逐项勾选'), 'no consent error');
    await p.fill('#wPw2', 'other-pass-2'); await p.check('#cTerms'); await p.check('#cChildren'); await p.check('#cSensitive');
    await p.click('#wForm button[type=submit]'); await p.waitForTimeout(100);
    expect((await text(p)).includes('不一致'), 'no mismatch error');
    await p.click('[data-act="web-go"][data-s="landing"]');
  });
  await step('unverified email cannot continue; verified can', async () => {
    await p.click('[data-act="web-go"][data-s="signup"]');
    await p.fill('#wEmail', 'a@example.com'); await p.fill('#wPw', 'parent-pass-1'); await p.fill('#wPw2', 'parent-pass-1');
    await p.check('#cTerms'); await p.check('#cChildren'); await p.check('#cSensitive');
    await p.click('#wForm button[type=submit]'); await waitText(p, '验证你的邮箱'); await shot(p, 'global-verify');
    await p.click('[data-act="web-verified"]'); await waitText(p, '还没有验证成功');
    await verifyEmail('a@example.com'); await p.click('[data-act="web-verified"]'); await waitText(p, '还没有学生档案');
  });
  await step('load examples, add a score, reload: data persists in Firestore', async () => {
    await p.click('[data-act="load-ex"]'); await p.waitForSelector('.kid[data-id]', { timeout: 15000 });
    await p.waitForFunction(() => document.querySelectorAll('.kid[data-id]').length === 3, null, { timeout: 15000 });
    await p.waitForFunction(() => document.getElementById('toast').textContent.includes('已载入'), null, { timeout: 15000 }); // batch committed
    const before = (await allDocs()).scores.length;
    expect(before === 117, `examples not fully written (${before} scores)`);
    await p.click('#nav [data-v="acad"]'); await p.click('[data-act="add-score"]');
    await p.fill('#fSubj', '数学'); await p.fill('#fVal', '100'); await p.fill('#fFull', '120'); await p.click('#sheetForm button[type=submit]');
    await p.waitForTimeout(800);
    const after = (await allDocs()).scores.length;
    expect(after === before + 1, `score not in Firestore (${before} → ${after}; ferr "${await p.textContent('#ferr').catch(() => '')}", toast "${await p.textContent('#toast')}")`);
    await p.reload(); await p.waitForFunction(() => document.querySelectorAll('.kid[data-id]').length === 3, null, { timeout: 15000 });
    await shot(p, 'global-app');
  });
  await step('parent PIN is stored in the settings document', async () => {
    await p.click('[data-act="pin"]'); await p.fill('#fPin1', '2468'); await p.fill('#fPin2', '2468'); await p.click('#sheetForm button[type=submit]');
    await p.waitForFunction(() => document.getElementById('toast').textContent.includes('PIN'), null, { timeout: 8000 });
  });
  await step('export downloads all data as JSON', async () => {
    await p.click('#acct');
    const [dl] = await Promise.all([p.waitForEvent('download'), p.click('[data-act="web-export"]')]);
    const j = JSON.parse(readFileSync(await dl.path(), 'utf8'));
    expect(j.data.students.length === 3 && j.data.scores.length > 100 && j.data.settings.consent, 'export incomplete');
    expect(!JSON.stringify(j.data.settings).includes('hash'), 'export contains the PIN hash');
    await p.click('#sheet [data-act="close"]');
  });
  await step('a second account sees nothing of the first', async () => {
    await signOut(); await signUp('b@example.com');
    expect((await p.$$('.kid[data-id]')).length === 0, 'sees other students');
  });
  await step('wrong password is rejected; right one restores the data', async () => {
    await signOut();
    await p.click('[data-act="web-go"][data-s="login"]'); await p.fill('#wEmail', 'a@example.com'); await p.fill('#wPw', 'wrong-pass');
    await p.click('#wForm button[type=submit]'); await waitText(p, '邮箱或密码不对');
    await p.fill('#wPw', 'parent-pass-1'); await p.click('#wForm button[type=submit]');
    await p.waitForFunction(() => document.querySelectorAll('.kid[data-id]').length === 3, null, { timeout: 15000 });
  });
  await step('delete account needs the password and removes every document', async () => {
    await p.click('#acct'); await p.check('#dSure'); await p.fill('#dPw', 'wrong-pass'); await p.click('[data-act="web-delete"]');
    await p.waitForFunction(() => document.getElementById('ferr').textContent.includes('不对'), null, { timeout: 8000 });
    await p.fill('#dPw', 'parent-pass-1'); await p.click('[data-act="web-delete"]');
    await waitText(p, '先看演示', 20000);
    const docs = await allDocs(), owners = new Set(Object.values(docs).flat().map(d => d.owner));
    expect(owners.size === 1 && docs.settings.length === 1 && Object.entries(docs).every(([c, l]) => c === 'settings' || !l.length), JSON.stringify([...owners]));
    await p.click('[data-act="web-go"][data-s="login"]'); await p.fill('#wEmail', 'a@example.com'); await p.fill('#wPw', 'parent-pass-1');
    await p.click('#wForm button[type=submit]'); await waitText(p, '邮箱或密码不对');
  });
  await step('no page errors', async () => expect(!errs.length, errs.join(' | ')));
  server.close();
}

for (const t of parts) await ({ artifact, cn, global })[t]();
await browser.close();
console.log(failed ? `\n${failed} failed` : '\nall passed');
process.exit(failed ? 1 : 0);
