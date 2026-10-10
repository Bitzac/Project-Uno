// Turn the raw evidence Claude collected into one snapshot document for the page's db.
// Usage: node ai-os/pipeline/snapshot.mjs <rawDir> [YYYY-MM-DD] > snapshot.json
// rawDir holds sessions-*.txt (list_sessions results), triggers.json, artifacts.json, manual.json.
// Git facts come from this repository's remote branches (run `git fetch --all` first).
import { readFileSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const [rawDir, dateArg] = process.argv.slice(2);
if (!rawDir) { console.error('usage: node snapshot.mjs <rawDir> [YYYY-MM-DD]'); process.exit(1); }
const read = f => JSON.parse(readFileSync(join(rawDir, f), 'utf8'));
const git = (...a) => execFileSync('git', a, { encoding: 'utf8', maxBuffer: 64 << 20 });

const today = dateArg || new Date().toISOString().slice(0, 10);
const DAY = 864e5;
const from = new Date(Date.parse(today) - 29 * DAY).toISOString().slice(0, 10);
const inWin = d => d >= from && d <= today;

// ---------- sessions ----------
// A list_sessions result is either plain JSON or JSON wrapped in an <other-session> envelope.
function parseSessions(text) {
  const i = text.indexOf('{"ccr"');
  const j = text.lastIndexOf('}');
  const obj = JSON.parse(i >= 0 ? text.slice(i, j + 1) : text);
  return (obj.ccr ? obj.ccr.data : obj.data || obj) || [];
}
const seen = new Set();
const sessions = readdirSync(rawDir).filter(f => /^sessions.*\.(txt|json)$/.test(f))
  .flatMap(f => parseSessions(readFileSync(join(rawDir, f), 'utf8')))
  .filter(s => s && s.id && !seen.has(s.id) && seen.add(s.id))
  .map(s => {
    const c = s.session_context || {};
    return {
      title: s.title || '',
      created: s.created_at, updated: s.updated_at,
      d: s.created_at.slice(0, 10),
      origin: s.origin || '',
      model: c.model || '',
      effort: c.effort_level || '',
      plan: c.permission_mode === 'plan',
      tokens: s.external_metadata?.context_usage?.used_tokens || 0,
      repo: (c.sources || []).some(x => x.git_repository),
    };
  })
  .sort((a, b) => a.created < b.created ? -1 : 1);
const winSessions = sessions.filter(s => inWin(s.d));

// Sessions whose [created, updated] spans overlap on the day both started.
const parallelDays = new Set();
for (const a of winSessions) for (const b of winSessions)
  if (a !== b && a.d === b.d && a.created < b.created && a.updated > b.created) parallelDays.add(a.d);

const family = m => (m.match(/fable|opus|sonnet|haiku/) || ['other'])[0];
const tiers = new Set(sessions.filter(s => s.model).map(s => family(s.model)));

// ---------- routines ----------
const triggers = read('triggers.json');
const perWeek = cron => {
  const f = cron.replace(/^CRON_TZ=\S+\s+/, '').trim().split(/\s+/);
  if (f.length < 5) return 0;
  const dow = f[4];
  if (dow === '*') return 7;
  return dow.split(',').reduce((n, p) => {
    const [a, b] = p.split('-').map(Number);
    return n + (Number.isFinite(b) ? b - a + 1 : 1);
  }, 0);
};
const routines = triggers.map(t => ({
  name: t.name,
  kind: t.cron ? '定时' : (t.persistent_session_id ? '跨会话检查' : '一次性'),
  cron: t.cron || '', perWeek: t.cron && t.enabled ? perWeek(t.cron) : 0,
  enabled: !!t.enabled, last: t.last_status || '', lastFired: (t.last_fired || '').slice(0, 16),
  created: (t.created || '').slice(0, 10), push: !!t.push,
}));
const activeRoutines = routines.filter(r => r.kind === '定时' && r.enabled);
const crossSession = triggers.filter(t => t.persistent_session_id).length + sessions.filter(s => s.origin === 'claude_code_mcp_seed').length;

// ---------- git ----------
const manual = read('manual.json');
const branches = git('branch', '-r', '--format=%(refname:short)').split('\n').filter(b => b && !b.endsWith('/HEAD'));
const def = 'origin/' + manual.defaultBranch;
const SRC = /\.(js|mjs|css|html|py|sh|md)$/;
const SKIP = /(^[^/]+\/index\.html$)|\.min\.js$|\/data\/|refdata|examples\.json/;
const projects = {};
for (const b of branches) {
  for (const dir of git('ls-tree', '-d', '--name-only', b).split('\n').filter(Boolean)) {
    if (dir.startsWith('.')) continue;
    const log = git('log', b, '--format=%h %ad', '--date=short', '--', dir).trim().split('\n').filter(Boolean);
    const last = log[0]?.split(' ')[1] || '';
    const p = projects[dir];
    // keep the branch where the project was touched most recently (ties: the default branch)
    if (p && (p.last > last || (p.last === last && p.branch === def))) continue;
    projects[dir] = { dir, branch: b, last, first: log.at(-1)?.split(' ')[1] || '', commits: log.length };
  }
}
const sizeOf = (b, f) => Number(git('cat-file', '-s', `${b}:${f}`).trim());
for (const p of Object.values(projects)) {
  const files = git('ls-tree', '-r', '--name-only', p.branch, p.dir).split('\n').filter(Boolean);
  p.files = files.length;
  p.lines = files.filter(f => SRC.test(f) && !SKIP.test(f) && sizeOf(p.branch, f) < 150e3)
    .reduce((n, f) => n + git('show', `${p.branch}:${f}`).split('\n').length, 0);
  p.merged = git('ls-tree', '-d', '--name-only', def, p.dir).trim() === p.dir;
  const [title, domain, format] = manual.projects[p.dir] || [p.dir, '未分类', '未分类'];
  Object.assign(p, { title, domain, format, branch: p.branch.replace(/^origin\//, '') });
}
const projList = Object.values(projects).sort((a, b) => b.lines - a.lines);
const allFiles = [...new Set(branches.flatMap(b => git('ls-tree', '-r', '--name-only', b).split('\n').filter(Boolean)))];
const tests = allFiles.filter(f => /(^|\/)(tests?|__tests__)\/|[._-](test|spec)\.(js|mjs|ts|py)$|(^|\/)test_[^/]+\.py$/.test(f));
const rulesFiles = allFiles.filter(f => /(^|\/)CLAUDE\.md$|^\.claude\/(skills|agents|commands|hooks)\/|^\.claude\/settings\.json$/.test(f));
const sopFiles = allFiles.filter(f => /(^|\/)(EDITOR|RETEST|PROMPT|SOP)[^/]*\.md$/.test(f));
const caps = new Set(branches.flatMap(b => {
  try { return git('grep', '-h', '-o', '-E', `claude\\.use\\(['"][a-z]+['"]\\)`, b).split('\n'); } catch { return []; }
}).map(s => (s.match(/['"]([a-z]+)['"]/) || [])[1]).filter(Boolean));
const commits = git('log', '--all', '--no-merges', '--format=%h %ad', '--date=short').trim().split('\n').filter(Boolean)
  .map(l => l.split(' ')[1]);
const attributed = git('log', '--all', '--no-merges', '--format=%B%x00').split('\0').filter(m => m.trim())
  .filter(m => /Co-Authored-By: Claude/i.test(m)).length;

// ---------- artifacts ----------
const artifacts = read('artifacts.json').sort((a, b) => a.updated < b.updated ? 1 : -1);

// ---------- activity by day ----------
const activity = {};
const bump = (d, k) => { (activity[d] ||= { s: 0, c: 0, a: 0 })[k]++; };
sessions.forEach(s => bump(s.d, 's'));
commits.forEach(d => bump(d, 'c'));
artifacts.forEach(a => bump(a.updated, 'a'));
const activeDays = Object.keys(activity).filter(inWin).length;

const outputs = [...artifacts, ...projList];
const domains = new Set(outputs.map(o => o.domain));
const formats = new Set(outputs.map(o => o.format));

const metrics = {
  active_days: activeDays,
  sessions: winSessions.length,
  domains: domains.size,
  formats: formats.size,
  big_projects: projList.filter(p => p.lines >= 1500).length,
  long_sessions: winSessions.filter(s => s.tokens >= 400e3).length,
  plan_share: Math.round(100 * winSessions.filter(s => s.plan).length / Math.max(1, winSessions.length)),
  connectors_used: manual.connectors.filter(c => c.used).length,
  connectors_total: manual.connectors.length,
  runtime_caps: caps.size,
  routines: activeRoutines.length,
  auto_outputs: activeRoutines.reduce((n, r) => n + r.perWeek, 0),
  parallel_days: parallelDays.size,
  cross_session: crossSession,
  model_tiers: tiers.size,
  verification: manual.verification.length,
  tests: tests.length,
  sop_assets: sopFiles.length + manual.sopExtra.length,
  rules_files: rulesFiles.length,
  merged_ratio: Math.round(100 * projList.filter(p => p.merged).length / Math.max(1, projList.length)),
  privacy: manual.privacy.length,
  // context, not scored
  commits: commits.filter(inWin).length,
  commits_total: commits.length,
  attributed, artifacts: artifacts.length, projects: projList.length,
  src_lines: projList.reduce((n, p) => n + p.lines, 0),
  tokens: winSessions.reduce((n, s) => n + s.tokens, 0),
  branches: branches.length,
};

const snapshot = {
  date: today, window: { from, to: today }, collectedAt: new Date().toISOString(), v: 1,
  metrics,
  lists: {
    sessions: sessions.map(({ title, d, origin, model, effort, plan, tokens }) => ({ title, d, origin, model, effort, plan, tokens })),
    artifacts,
    projects: projList.map(({ dir, title, domain, format, branch, merged, lines, files, commits, first, last }) =>
      ({ dir, title, domain, format, branch, merged, lines, files, commits, first, last })),
    routines,
    connectors: manual.connectors,
    verification: manual.verification,
    sop: [...sopFiles.map(f => ({ name: f, kind: '仓库 SOP' })), ...manual.sopExtra],
    rules: rulesFiles, tests,
    caps: [...caps].sort(),
    privacy: manual.privacy,
    blindSpots: manual.blindSpots,
    origins: sessions.reduce((o, s) => (o[s.origin] = (o[s.origin] || 0) + 1, o), {}),
    efforts: sessions.reduce((o, s) => (o[s.effort || '未记录'] = (o[s.effort || '未记录'] || 0) + 1, o), {}),
    models: [...tiers],
  },
  activity,
};
process.stdout.write(JSON.stringify(snapshot, null, 1) + '\n');
