/* ---------- forms ---------- */
let FORM = null;
const fld = (id, label, inner, cls) => `<div class="${cls || ''}" id="row-${id}"><label for="f-${id}">${label}</label>${inner}</div>`;
const inp = (id, v, attrs) => `<input id="f-${id}" value="${esc(v ?? '')}" ${attrs || ''}>`;
const selHtml = (id, opts, v) => `<select id="f-${id}">${opts.map(([k, t]) => `<option value="${esc(k)}"${String(k) === String(v ?? '') ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select>`;
const partSel = (id, v, none) => `<select id="f-${id}">${none ? `<option value=""${!v ? ' selected' : ''}>${none}</option>` : ''}${Object.entries(ZONES).map(([z, info]) => `<optgroup label="${info.name}">${curParts().filter(p => p.zone === z).map(p => `<option value="${p.id}"${p.id === v ? ' selected' : ''}>${p.name}</option>`).join('')}</optgroup>`).join('')}</select>`;
const val = id => { const e = $('f-' + id); return e ? e.value.trim() : ''; };
const nowMonth = () => todayISO().slice(0, 7);

const FORMS = {
  issue: {
    title: o => o.id ? '编辑问题' : '记录一个问题',
    hint: '选部位和严重程度，身体模型会按颜色标出来。已解决的问题保留在档案里，但不再标色。',
    html: o => {
      const i = o.id ? D.issues.find(x => x.id === o.id) : null;
      FORM.sev = i ? i.sev : 1;
      const part = i ? i.part : (o.part || 'stomach');
      return fld('part', '部位', partSel('part', part)) + fld('side', '哪一侧', selHtml('side', [['', '双侧 / 不区分'], ['L', '左侧'], ['R', '右侧']], i ? i.side : (o.side || '')))
        + fld('title', '问题名称', inp('title', i?.title, 'maxlength="40" placeholder="例如：慢性胃炎、右膝疼痛"'), 'full')
        + `<div class="full"><label>严重程度</label><div class="sevpick" id="sevpick">${[1, 2, 3, 4].map(s => `<button type="button" data-sev="${s}" aria-pressed="${s === FORM.sev}"><i style="background:${SEVC[s]}"></i>${SEVN[s]}</button>`).join('')}</div></div>`
        + fld('status', '状态', selHtml('status', Object.entries(STATUS), i ? i.status : 'active'))
        + fld('since', '开始时间', inp('since', i ? i.since : nowMonth(), 'type="month"'))
        + fld('source', '来源', selHtml('source', SOURCES.map(s => [s, s]), i ? i.source : '体检'))
        + fld('note', '备注（可选）', `<textarea id="f-note" rows="2" maxlength="200">${esc(i?.note)}</textarea>`, 'full');
    },
    init: () => {
      const sync = () => { $('row-side').hidden = !PART[val('part')].pair; };
      $('f-part').addEventListener('change', sync); sync();
      $('sevpick').addEventListener('click', e => { const b = e.target.closest('[data-sev]'); if (!b) return; FORM.sev = +b.dataset.sev; $('sevpick').querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b))); });
    },
    save: async o => {
      const part = val('part'), title = val('title'), since = val('since');
      if (!title) throw '请填写问题名称，例如「慢性胃炎」';
      if (since && !isMonth(since)) throw '开始时间格式应为 年-月，例如 2026-08';
      const obj = { part, side: PART[part].pair ? val('side') : '', title: title.slice(0, 40), sev: FORM.sev, status: val('status'), since, source: val('source'), note: val('note').slice(0, 200), example: false };
      let id = o.id;
      if (id) await put('issues', id, obj); else id = await add('issues', obj);
      toast(`已记录：${PART[part].name} · ${obj.title}`);
      closeForm(); ST.mod = 'issue'; saveUI(); selectPart(part, obj.side, { issue: id });
    },
    del: async o => { await del('issues', o.id); toast('已删除这个问题'); }
  },
  vital: {
    title: () => '记录体征',
    hint: '血压填收缩压和舒张压；睡眠和步数可以填一段时间的日均值。',
    html: o => fld('type', '类型', selHtml('type', VT_ORDER.map(t => [t, VT[t].name]), o.type || 'weight')) + fld('date', '日期', inp('date', todayISO(), 'type="date"'))
      + fld('value', '数值', inp('value', '', 'inputmode="decimal"')) + fld('value2', '舒张压 mmHg', inp('value2', '', 'inputmode="decimal"'))
      + fld('note', '备注（可选）', inp('note', '', 'maxlength="60"'), 'full'),
    init: () => {
      const sync = () => { const t = val('type'); $('row-value2').hidden = t !== 'bp'; $('row-value').querySelector('label').textContent = t === 'bp' ? '收缩压 mmHg' : `${VT[t].name}（${VT[t].unit}）`; };
      $('f-type').addEventListener('change', sync); sync();
    },
    save: async () => {
      const t = val('type'), cur = VT[t], v = num(val('value')), v2 = num(val('value2')), date = val('date');
      if (!isDate(date)) throw '请选择日期';
      if (v === null || v < cur.min || v > cur.max) throw `${cur.name}请填 ${cur.min}–${cur.max} 之间的数字`;
      if (t === 'bp' && (v2 === null || v2 < 30 || v2 > 160)) throw '舒张压请填 30–160 之间的数字';
      if (t === 'bp' && v2 >= v) throw '舒张压应小于收缩压，请检查是否填反';
      const obj = { type: t, date, value: v, note: val('note'), example: false };
      if (t === 'bp') obj.value2 = v2;
      await add('vitals', obj);
      toast(`已记录${cur.name} ${t === 'bp' ? v + '/' + v2 : v} ${cur.unit}`);
      closeForm(); ST.mod = 'vital'; ST.vt = t; saveUI(); renderAll();
    }
  },
  lab: {
    title: () => '录入体检指标',
    hint: '选常用指标会自动填好单位、参考范围和关联部位；参考范围以你的化验单为准。',
    html: o => {
      const base = o.key ? labGroups().find(g => g.latest.key === o.key)?.latest : null;
      const pre = base || presets()[0];
      return fld('preset', '常用指标', `<select id="f-preset"><option value="">自定义…</option>${LAB_CATS.map(c => { const a = presets().filter(p => p.cat === c); return a.length ? `<optgroup label="${c}">${a.map(p => `<option value="${esc(p.key)}"${p.key === pre.key ? ' selected' : ''}>${esc(p.name)}（${esc(p.key)}）</option>`).join('')}</optgroup>` : ''; }).join('')}</select>`, 'full')
        + fld('name', '指标名称', inp('name', pre.name, 'maxlength="30"')) + fld('key', '简称', inp('key', pre.key, 'maxlength="16"'))
        + fld('value', '结果', inp('value', '', 'inputmode="decimal"')) + fld('unit', '单位', inp('unit', pre.unit, 'maxlength="16"'))
        + fld('low', '参考下限（可空）', inp('low', pre.low, 'inputmode="decimal"')) + fld('high', '参考上限（可空）', inp('high', pre.high, 'inputmode="decimal"'))
        + fld('date', '检查日期', inp('date', lastReport() || todayISO(), 'type="date"')) + fld('cat', '分类', selHtml('cat', LAB_CATS.map(c => [c, c]), pre.cat))
        + fld('part', '关联部位', partSel('part', pre.part, '全身 / 不关联'), 'full');
    },
    init: () => {
      $('f-preset').addEventListener('change', () => {
        const p = presets().find(x => x.key === val('preset')); if (!p) return;
        for (const k of ['name', 'key', 'unit', 'low', 'high']) $('f-' + k).value = p[k] ?? '';
        $('f-cat').value = p.cat; $('f-part').value = p.part;
      });
    },
    save: async () => {
      const name = val('name'), v = num(val('value')), lo = num(val('low')), hi = num(val('high')), date = val('date');
      if (!name) throw '请填写指标名称';
      if (v === null) throw '结果请填数字，例如 5.8';
      if (val('low') && lo === null || val('high') && hi === null) throw '参考范围请填数字，不需要的一侧留空';
      if (lo !== null && hi !== null && lo >= hi) throw '参考下限应小于上限';
      if (!isDate(date)) throw '请选择检查日期';
      const obj = { key: val('key') || name, name, value: v, unit: val('unit'), low: lo, high: hi, cat: val('cat'), part: val('part'), date, example: false };
      await add('labs', obj);
      const st = labStatus(obj);
      toast(`已录入 ${name} ${v}${obj.unit ? ' ' + obj.unit : ''}${st.dir ? '，' + st.t : ''}`);
      closeForm(); ST.mod = 'lab'; saveUI(); selectLab(obj.key);
    }
  },
  plan: {
    title: o => o.id ? '编辑计划' : '新建计划',
    hint: '重复的计划打卡后会自动顺延到下一次。',
    html: o => {
      const p = o.id ? D.plans.find(x => x.id === o.id) : null;
      return fld('title', '要做什么', inp('title', p?.title, 'maxlength="40" placeholder="例如：复查甲状腺超声"'), 'full')
        + fld('kind', '类型', selHtml('kind', Object.entries(PLAN_KINDS), p ? p.kind : 'recheck')) + fld('due', p?.repeat ? '下次日期' : '日期', inp('due', p ? p.due : addDays(todayISO(), 7), 'type="date"'))
        + fld('repeat', '重复', selHtml('repeat', Object.entries(REPEATS), p ? p.repeat : '')) + fld('part', '关联部位', partSel('part', p ? p.part : (o.part || ''), '全身 / 不关联'))
        + fld('note', '备注（可选）', inp('note', p?.note, 'maxlength="80"'), 'full');
    },
    save: async o => {
      const title = val('title'), due = val('due');
      if (!title) throw '请写下要做什么，例如「复查甲状腺超声」';
      if (!isDate(due)) throw '请选择日期';
      const old = o.id ? D.plans.find(x => x.id === o.id) : null;
      const obj = { title, kind: val('kind'), due, repeat: val('repeat'), part: val('part'), done: old ? old.done : false, note: val('note'), example: false };
      if (o.id) await put('plans', o.id, obj); else await add('plans', obj);
      toast(`${o.id ? '已保存' : '已添加'}：${title}，${fmtMD(due)}`);
      closeForm(); if (!ST.sel) { ST.mod = 'plan'; saveUI(); } renderAll();
    },
    del: async o => { await del('plans', o.id); toast('已删除这个计划'); }
  },
  profile: {
    title: o => o.isNew ? '新建档案' : '编辑档案资料',
    hint: '每个档案的问题、体征、体检和计划分开保存。性别决定使用男性还是女性人体模型；身高用来缩放模型和计算 BMI。',
    delLabel: '删除这个档案',
    html: o => {
      const p = o.isNew ? {} : (D.profile || {});
      return fld('name', '称呼或代号', inp('name', p.name, 'maxlength="12" placeholder="例如：S、妈妈"')) + fld('sex', '性别', selHtml('sex', [['男', '男'], ['女', '女']], p.sex || '男'))
        + fld('birth', '出生年月', inp('birth', p.birth, 'type="month"')) + fld('height', '身高 cm', inp('height', p.height, 'inputmode="decimal"'))
        + fld('weight', '体重 kg（没有体征记录时使用）', inp('weight', p.weight, 'inputmode="decimal"')) + fld('rhr', '静息心率 bpm（没有体征记录时使用）', inp('rhr', p.rhr, 'inputmode="numeric"'))
        + fld('blood', '血型', selHtml('blood', [['', '未知'], ['A', 'A 型'], ['B', 'B 型'], ['AB', 'AB 型'], ['O', 'O 型']], p.blood)) + fld('rh', 'Rh', selHtml('rh', [['', '未知'], ['+', 'Rh 阳性（+）'], ['-', 'Rh 阴性（−）']], p.rh || ''))
        + fld('allergy', '过敏史（可选）', inp('allergy', p.allergy, 'maxlength="60" placeholder="例如：青霉素"'), 'full');
    },
    save: async o => {
      const name = val('name'), birth = val('birth'), h = num(val('height')), w = num(val('weight')), r = num(val('rhr'));
      if (!name) throw '请填写称呼或代号，例如「S」';
      if (!o.isNew && D.people.some(p => p.id !== CUR && p.name === name) || o.isNew && D.people.some(p => p.name === name)) throw `已经有叫「${name}」的档案了，换个称呼`;
      if (birth && !isMonth(birth)) throw '出生年月格式应为 年-月，例如 1990-03';
      if (h !== null && (h < 100 || h > 230)) throw '身高请填 100–230 cm';
      if (w !== null && (w < 20 || w > 300)) throw '体重请填 20–300 kg';
      if (r !== null && (r < 25 || r > 220)) throw '静息心率请填 25–220';
      const body = { name, sex: val('sex'), birth, height: h, weight: w, blood: val('blood'), rh: val('rh'), rhr: r, allergy: val('allergy'), example: o.isNew ? false : !!(D.profile && D.profile.example) };
      if (o.isNew) { await createPerson(body); toast(`已新建档案：${name}`); }
      else { await putProfile(body); toast('已保存档案资料'); }
      closeForm();
    },
    del: async o => { const n = D.profile ? D.profile.name : ''; await deletePerson(); toast(`已删除档案：${n}`); }
  }
};

function openForm(kind, o) {
  o = o || {};
  if (!guardWrite(kind === 'profile' && o.isNew)) return;
  FORM = { kind, o };
  const f = FORMS[kind];
  $('sheetTitle').textContent = f.title(o);
  $('sheetHint').textContent = f.hint || '';
  $('fgrid').innerHTML = f.html(o);
  $('err').textContent = '';
  const d = $('fdel'); d.hidden = !((o.id || (kind === 'profile' && !o.isNew && D.profile)) && f.del); d.textContent = f.delLabel || '删除'; d.dataset.armed = '';
  $('overlay').hidden = false;
  if (f.init) f.init(o);
  setTimeout(() => { const e = $('fgrid').querySelector('input:not([type=hidden]),select,textarea'); if (e) e.focus(); }, 30);
}
function closeForm() { $('overlay').hidden = true; FORM = null; }
$('form').addEventListener('submit', async e => {
  e.preventDefault(); if (!FORM) return;
  const btn = $('save'); btn.disabled = true;
  try { await FORMS[FORM.kind].save(FORM.o); }
  catch (err) { if (typeof err === 'string') $('err').textContent = err; else fail(err); }
  finally { btn.disabled = false; }
});
$('cancel').onclick = closeForm;
$('form').addEventListener('input', () => { $('err').textContent = ''; });
$('fdel').onclick = async () => {
  const d = $('fdel');
  if (!d.dataset.armed) { d.dataset.armed = '1'; d.textContent = '确认删除？'; return; }
  try { const f = FORMS[FORM.kind], o = FORM.o; closeForm(); await f.del(o); if (ST.sel && ST.sel.issue === o.id) ST.sel.issue = null; renderAll(); } catch (err) { fail(err); }
};
$('overlay').addEventListener('pointerdown', e => { if (e.target === $('overlay')) closeForm(); });
