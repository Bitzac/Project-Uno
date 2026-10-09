// Build src/examples.json: three fictional students, one per school system. Every record carries example:true.
// Deterministic (seeded) so the file only changes when this script does. Usage: node pipeline/make_examples.mjs
import { writeFileSync } from 'node:fs';

const END = '2026-10-08'; // last day of check-in data
let seed = 7;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const jitter = (a) => (rnd() * 2 - 1) * a;
const iso = d => d.toISOString().slice(0, 10);
const addDays = (s, n) => { const d = new Date(s + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return iso(d); };
const half = v => Math.round(v * 2) / 2;

const out = { students: [], records: {}, private: { screens: [], notes: [] } };
function student(s, rec, priv) {
  out.students.push({ ...s, example: true });
  const r = {};
  for (const [c, list] of Object.entries(rec)) r[c] = list.map((x, i) => ({ id: `ex-${s.id.slice(3)}-${c}-${i + 1}`, ...x, example: true }));
  out.records[s.id] = r;
  for (const [c, list] of Object.entries(priv)) list.forEach((x, i) => out.private[c].push({ id: `ex-${s.id.slice(3)}-${c}-${i + 1}`, sid: s.id, ...x, example: true }));
}
// scores: subjects × dates, values given as 0–100 then converted to the scale
function scores(dates, table, o) {
  const list = [];
  for (const [subject, vals, avgs, full] of table) vals.forEach((v, i) => {
    if (v == null) return;
    const [date, kind, scale] = dates[i];
    const f = scale === 'pts' ? full || 100 : null;
    const conv = x => scale === 'pts' ? half(x / 100 * f) : scale === 'pct' ? Math.round(x * 10) / 10 : x;
    list.push({ date, subject, kind, scale, value: conv(v), full: f, avg: avgs && avgs[i] != null ? conv(avgs[i]) : null, lvl: '', note: (o && o.notes && o.notes[subject + i]) || '' });
  });
  return list;
}
function moods(days, base) {
  const list = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = addDays(END, -i);
    if (rnd() < 0.12) continue; // a few missed days
    const dip = base.dip && i >= base.dip[0] && i <= base.dip[1];
    const mood = Math.max(1, Math.min(5, Math.round(base.mood + jitter(0.9) - (dip ? 1.6 : 0))));
    list.push({
      date, mood, stress: Math.max(1, Math.min(5, Math.round(base.stress + jitter(0.9) + (dip ? 1.2 : 0)))),
      sleep: half(base.sleep + jitter(0.7) - (dip ? 0.5 : 0)), active: Math.max(0, Math.round((base.active + jitter(25)) / 5) * 5),
      note: dip && mood <= 2 && base.dipNote ? base.dipNote : ''
    });
  }
  return list;
}
const vis5 = l => +Math.pow(10, l - 5).toFixed(3);

/* 林小满 · 中国 · 初二 */
const cnDates = [['2025-10-15', '月考', 'pts'], ['2025-11-12', '期中考试', 'pts'], ['2026-01-14', '期末考试', 'pts'], ['2026-03-18', '月考', 'pts'], ['2026-04-22', '期中考试', 'pts'], ['2026-07-01', '期末考试', 'pts'], ['2026-09-28', '月考', 'pts']];
student(
  { id: 'ex-cn', name: '林小满', sex: 'F', birth: '2012-12', system: 'cn', cohort: 2018, school: '星河实验中学', cls: '初二（3）班', allergy: '尘螨过敏', order: 1 },
  {
    scores: scores(cnDates, [
      ['语文', [86, 84, 88, 87, 89, 90, 88], [80, 79, 81, 80, 82, 81, 80], 120],
      ['数学', [93, 91, 90, 88, 85, 83, 79], [78, 77, 79, 78, 77, 78, 76], 120],
      ['英语', [94, 95, 96, 95, 97, 96, 97], [82, 81, 83, 82, 84, 83, 82], 120],
      ['物理', [null, null, null, null, null, null, 84], [null, null, null, null, null, null, 75], 100],
      ['生物学', [88, 90, 86, 89, 91, 92, 90], [79, 80, 78, 80, 81, 82, 80], 100],
      ['历史', [82, 85, 84, 86, 83, 87, 85], [78, 79, 80, 80, 79, 81, 80], 100],
      ['地理', [80, 78, 83, 85, 86, 88, 87], [77, 76, 78, 79, 80, 81, 80], 100],
      ['道德与法治', [88, 87, 90, 89, 91, 90, 92], [82, 82, 83, 83, 84, 84, 84], 100]
    ], { notes: { '数学6': '函数单元失分较多' } }),
    fitness: [
      { date: '2025-10-20', items: { vc: 2650, r50: 9.1, sr: 12.5, jump: 168, situp: 42, run: 238 }, marks: {}, note: '' },
      { date: '2026-09-22', items: { vc: 2800, r50: 8.9, sr: 2.5, jump: 172, situp: 44, run: 232 }, marks: {}, note: '' }
    ],
    health: [
      { date: '2025-09-05', type: 'height', value: 156.2 }, { date: '2025-09-05', type: 'weight', value: 44.0 },
      { date: '2026-03-10', type: 'height', value: 158.9 }, { date: '2026-03-10', type: 'weight', value: 46.1 },
      { date: '2026-09-08', type: 'height', value: 160.8 }, { date: '2026-09-08', type: 'weight', value: 47.8 },
      { date: '2025-09-05', type: 'vision', value: vis5(5.0), value2: vis5(4.9) },
      { date: '2026-03-10', type: 'vision', value: vis5(4.9), value2: vis5(4.8) },
      { date: '2026-09-08', type: 'vision', value: vis5(4.8), value2: vis5(4.7) }
    ],
    ratings: [
      ...[['moral', 'A'], ['arts', 'B'], ['practice', 'B']].map(([dim, mark]) => ({ term: '2025-1', dim, mark, by: '学校综评' })),
      ...[['moral', 'A'], ['arts', 'A'], ['practice', 'B']].map(([dim, mark]) => ({ term: '2025-2', dim, mark, by: '学校综评' }))
    ],
    merits: [
      { date: '2025-11-20', dim: 'academic', title: '校英语演讲比赛一等奖', level: '校级', hours: null },
      { date: '2025-12-15', dim: 'practice', title: '社区图书馆志愿服务', level: '区县级', hours: 12 },
      { date: '2026-04-18', dim: 'arts', title: '校合唱团春季音乐会领唱', level: '校级', hours: null },
      { date: '2026-05-30', dim: 'moral', title: '优秀班干部（学习委员）', level: '校级', hours: null },
      { date: '2026-07-10', dim: 'practice', title: '暑期博物馆小讲解员', level: '市级', hours: 20 },
      { date: '2026-09-20', dim: 'health', title: '校运会女子 800 米第三名', level: '校级', hours: null }
    ],
    moods: moods(35, { mood: 3.7, stress: 2.6, sleep: 7.6, active: 45, dip: [8, 13], dipNote: '月考数学没考好' }),
    who5: [{ date: '2026-03-20', items: [4, 3, 4, 3, 4] }, { date: '2026-09-25', items: [3, 3, 2, 2, 3] }]
  },
  {
    screens: [
      { date: '2025-10-10', scale: 'PHQ-A', informant: 'self', score: 4, by: '学校心理普查', label: '', note: '' },
      { date: '2026-09-15', scale: 'MHT', informant: 'self', score: 48, by: '学校心理普查', label: '', note: '学习焦虑分量表略高' }
    ],
    notes: [{ date: '2026-09-29', text: '和数学老师沟通：函数部分薄弱，建议每周两次错题整理，周末做一套综合练习。' }]
  }
);

/* Ethan Zhou · 美国 · Grade 7 */
const usDates = [['2025-10-24', 'Quarter Grade', 'pct'], ['2025-12-19', 'Semester Grade', 'pct'], ['2026-03-20', 'Quarter Grade', 'pct'], ['2026-06-05', 'Semester Grade', 'pct'], ['2026-09-25', 'Unit Test', 'pct']];
student(
  { id: 'ex-us', name: 'Ethan Zhou', sex: 'M', birth: '2013-05', system: 'us', cohort: 2019, school: 'Lakeview Middle School', cls: 'Homeroom 7B', allergy: '', order: 2 },
  {
    scores: scores(usDates, [
      ['ELA', [88, 90, 91, 92, 93], [84, 85, 84, 85, 86]],
      ['Math', [95, 96, 94, 97, 96], [82, 83, 81, 84, 83]],
      ['Science', [90, 88, 91, 93, 92], [83, 82, 84, 84, 85]],
      ['Social Studies', [84, 86, 85, 88, 87], [82, 83, 83, 84, 84]],
      ['World Language', [79, 81, 83, 82, 84], [80, 81, 82, 82, 83]],
      ['PE', [98, 97, 98, 99, 97], null],
      ['Art', [92, 93, 91, 94, null], null]
    ]),
    fitness: [{ date: '2026-03-12', items: { pacer: 38, curl: 30, push: 9, trunk: 10, sitreach: 8, body: 19.4 }, marks: { pacer: 'HFZ', curl: 'HFZ', push: 'NI', trunk: 'HFZ', sitreach: 'HFZ', body: 'HFZ' }, note: '' }],
    health: [
      { date: '2025-09-02', type: 'height', value: 152.0 }, { date: '2025-09-02', type: 'weight', value: 41.5 },
      { date: '2026-02-10', type: 'height', value: 155.3 }, { date: '2026-02-10', type: 'weight', value: 44.0 },
      { date: '2026-08-28', type: 'height', value: 159.0 }, { date: '2026-08-28', type: 'weight', value: 47.2 },
      { date: '2025-09-02', type: 'vision', value: 1, value2: 1 },
      { date: '2026-08-28', type: 'vision', value: 1, value2: 0.8 }
    ],
    ratings: [
      ...[['moral', 'A'], ['arts', 'B'], ['practice', 'B']].map(([dim, mark]) => ({ term: '2025-1', dim, mark, by: 'Homeroom teacher' })),
      ...[['moral', 'A'], ['arts', 'B'], ['practice', 'A']].map(([dim, mark]) => ({ term: '2025-2', dim, mark, by: 'Homeroom teacher' }))
    ],
    merits: [
      { date: '2025-11-08', dim: 'academic', title: 'Science Fair 2nd Place', level: 'District', hours: null },
      { date: '2026-02-14', dim: 'practice', title: 'Food bank volunteering', level: 'School', hours: 8 },
      { date: '2026-04-30', dim: 'arts', title: 'School band – trumpet, spring concert', level: 'School', hours: null },
      { date: '2026-05-20', dim: 'moral', title: 'Student Council homeroom rep', level: 'School', hours: null },
      { date: '2026-09-12', dim: 'practice', title: 'Park cleanup day', level: 'School', hours: 4 }
    ],
    moods: moods(35, { mood: 3.2, stress: 3.4, sleep: 7.2, active: 70, dip: [2, 9], dipNote: 'Too much homework' }),
    who5: [{ date: '2026-04-10', items: [3, 3, 3, 3, 4] }, { date: '2026-09-30', items: [2, 2, 3, 2, 3] }]
  },
  {
    screens: [
      { date: '2026-09-30', scale: 'GAD-7', informant: 'self', score: 11, by: 'School counselor', label: '', note: '' },
      { date: '2026-09-30', scale: 'PHQ-A', informant: 'self', score: 6, by: 'School counselor', label: '', note: '' }
    ],
    notes: [{ date: '2026-10-02', text: '学校辅导员建议每周沟通一次；晚上 9 点后减少屏幕时间，作业量大时先列计划。' }]
  }
);

/* Chloe Lin · 英国 · Year 10 */
const ukDates = [['2025-12-12', 'End of Term', 'pct'], ['2026-03-27', 'End of Term', 'pct'], ['2026-07-10', 'End of Term', 'pct'], ['2026-10-02', 'Predicted', 'gcse']];
student(
  { id: 'ex-uk', name: 'Chloe Lin', sex: 'F', birth: '2011-02', system: 'uk', cohort: 2016, school: 'Riverside Academy', cls: 'Form 10H', allergy: '', order: 3 },
  {
    scores: [
      ...scores(ukDates.slice(0, 3), [
        ['English', [78, 80, 83], [72, 73, 74]], ['Maths', [85, 84, 88], [70, 71, 72]], ['Science', [80, 83, 85], [71, 72, 73]],
        ['History', [74, 79, 81], [70, 71, 71]], ['French', [70, 72, 76], [68, 69, 70]], ['Art and Design', [88, 90, 92], null],
        ['Computing', [82, 85, 84], [73, 74, 74]], ['Music', [75, 77, 78], null]
      ]),
      ...scores(ukDates.slice(3), [
        ['English Language', [7]], ['English Literature', [7]], ['Maths', [8]], ['Biology', [7]], ['Chemistry', [6]],
        ['Physics', [7]], ['History', [6]], ['French', [5]], ['Art and Design', [8]]
      ])
    ],
    fitness: [{ date: '2026-06-15', items: { grip: 27.5, sbj: 172, situp: 22, bah: 12, shuttle: 19.8, plate: 11.2, sr: 30, flamingo: 4, srt: 6.5 }, marks: { grip: 58, sbj: 62, situp: 55, bah: 48, shuttle: 60, plate: 66, sr: 78, flamingo: 70, srt: 45 }, note: '' }],
    health: [
      { date: '2025-09-10', type: 'height', value: 160.5 }, { date: '2025-09-10', type: 'weight', value: 49.0 },
      { date: '2026-06-15', type: 'height', value: 162.4 }, { date: '2026-06-15', type: 'weight', value: 51.2 },
      { date: '2025-09-10', type: 'vision', value: 1, value2: 1 },
      { date: '2026-06-15', type: 'vision', value: 1, value2: 0.8 }
    ],
    ratings: ['2025-1', '2025-2', '2025-3'].flatMap((term, i) => [['moral', 'A'], ['arts', 'A'], ['practice', i ? 'A' : 'B']].map(([dim, mark]) => ({ term, dim, mark, by: 'Form tutor' }))),
    merits: [
      { date: '2025-10-18', dim: 'practice', title: 'Duke of Edinburgh Bronze – care home volunteering', level: 'National', hours: 24 },
      { date: '2026-02-08', dim: 'arts', title: 'ABRSM Grade 6 Piano – Merit', level: 'National', hours: null },
      { date: '2026-03-15', dim: 'academic', title: 'UKMT Junior Maths Challenge – Silver', level: 'National', hours: null },
      { date: '2026-05-22', dim: 'moral', title: 'Form prefect', level: 'School', hours: null },
      { date: '2026-07-03', dim: 'health', title: 'Sports day 1500 m – 1st', level: 'School', hours: null }
    ],
    moods: moods(35, { mood: 4.1, stress: 2.4, sleep: 8.6, active: 70 }),
    who5: [{ date: '2026-06-20', items: [4, 4, 4, 3, 4] }]
  },
  { screens: [{ date: '2026-05-12', scale: 'SDQ', informant: 'self', score: 12, by: 'School wellbeing survey', label: '', note: '' }], notes: [] }
);

writeFileSync(new URL('../src/examples.json', import.meta.url), JSON.stringify(out, null, 1) + '\n');
const n = out.students.length + Object.values(out.records).reduce((a, r) => a + Object.values(r).reduce((b, l) => b + l.length, 0), 0) + out.private.screens.length + out.private.notes.length;
console.log('src/examples.json', n, 'documents');
