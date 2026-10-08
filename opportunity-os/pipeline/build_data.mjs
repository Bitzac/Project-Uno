// Assemble src/data.js: IMF WEO (April 2026) macro series, World Bank structure and governance, WITS export mix,
// and the hand-written industry profiles in pipeline/profiles.mjs. Input: opportunity-os/.cache (see fetch.sh).
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { THEMES, PROFILES, ASSET_CLASSES, SOURCES, GLOBAL, TILES } from './profiles.mjs';
const require = createRequire(import.meta.url);
const iso = require('i18n-iso-countries');
iso.registerLocale(require('i18n-iso-countries/langs/zh.json'));

const cache = f => new URL('../.cache/' + f, import.meta.url);
const json = f => JSON.parse(readFileSync(cache(f), 'utf8'));
const r1 = x => x == null || !isFinite(x) ? null : Math.round(x * 10) / 10;
const r2 = x => x == null || !isFinite(x) ? null : Math.round(x * 100) / 100;

// ---------------------------------------------------------------- IMF WEO
const Y0 = 2015, Y1 = 2031, NOW = 2026, YEARS = Array.from({ length: Y1 - Y0 + 1 }, (_, i) => Y0 + i);
const IMF_ALIAS = { UVK: 'XKX', KOS: 'XKX', WBG: 'PSE' };
const imfC = json('imf_countries.json').countries;
const imf = {};
for (const ind of ['NGDP_RPCH', 'NGDPD', 'NGDPDPC', 'PPPPC', 'PPPSH', 'PCPIPCH', 'LP', 'BCA_NGDPD', 'LUR', 'GGXWDG_NGDP']) {
  const vals = json(`imf_${ind}.json`).values[ind];
  for (const [code, series] of Object.entries(vals)) {
    if (!imfC[code] || code.length !== 3) continue;  // skip groups and regions
    const k = IMF_ALIAS[code] || code;
    (imf[k] ??= {})[ind] = series;
  }
}
const at = (k, ind, y) => { const v = imf[k]?.[ind]?.[String(y)]; return v == null || v === '' ? null : +v; };
// latest non-empty value at or before `y` (IMF withholds USD projections for some programme countries, e.g. Pakistan)
const upTo = (k, ind, y) => { for (let t = y; t >= y - 3; t--) { const v = at(k, ind, t); if (v != null) return [v, t]; } return [null, null]; };
const mean = a => { const v = a.filter(x => x != null); return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null; };

// IMF July 2026 WEO Update (growth only, published for the largest economies)
const JULY = { USA: 2.3, CHN: 4.6, IND: 6.4, JPN: 0.6, DEU: 0.7, FRA: 0.6, GBR: 1.0, RUS: 1.1, BRA: 2.4, SAU: 1.7, NGA: 4.1 };

// ---------------------------------------------------------------- World Bank
const wbMeta = Object.fromEntries(json('wb_countries.json')[1].map(c => [c.id, c]));
const REGION = {
  'North America': '北美', 'Latin America & Caribbean': '拉美', 'Europe & Central Asia': '欧洲与中亚',
  'Middle East, North Africa, Afghanistan & Pakistan': '中东与北非', 'Sub-Saharan Africa': '撒哈拉以南非洲',
  'South Asia': '南亚', 'East Asia & Pacific': '东亚与太平洋',
};
const regionOf = k => {
  if (k === 'TWN') return '东亚与太平洋';
  if (k === 'PAK' || k === 'AFG') return '南亚';  // the World Bank moved these two into its MENA group in 2025
  const r = wbMeta[k]?.region?.value?.trim();
  return REGION[r] || null;
};
const INCOME = { HIC: 4, UMC: 3, LMC: 2, LIC: 1 };
const incomeOf = k => k === 'TWN' ? 4 : INCOME[wbMeta[k]?.incomeLevel?.id] ?? null;
const WB_IND = { agr: 'NV.AGR.TOTL.ZS', ind: 'NV.IND.TOTL.ZS', mfg: 'NV.IND.MANF.ZS', srv: 'NV.SRV.TOTL.ZS', tech: 'TX.VAL.TECH.MF.ZS',
  fdi: 'BX.KLT.DINV.WD.GD.ZS', exp: 'NE.EXP.GNFS.ZS', wap: 'SP.POP.1564.TO.ZS', urb: 'SP.URB.TOTL.IN.ZS', net: 'IT.NET.USER.ZS', rl: 'GOV_WGI_RL.EST' };
const wb = {};
for (const [key, ind] of Object.entries(WB_IND)) {
  for (const row of json(`wb_${ind}.json`)[1] || []) {
    if (row.value == null || !row.countryiso3code) continue;
    (wb[row.countryiso3code] ??= {})[key] = [key === 'rl' ? r2(row.value) : r1(row.value), +row.date];
  }
}

// ---------------------------------------------------------------- WITS exports by HS section
const HS = {
  '01-05_Animal': '动物产品', '06-15_Vegetable': '植物产品', '16-24_FoodProd': '食品饮料烟草', '25-26_Minerals': '矿石矿砂',
  '27-27_Fuels': '能源燃料', '28-38_Chemicals': '化工医药', '39-40_PlastiRub': '塑料橡胶', '41-43_HidesSkin': '皮革皮具',
  '44-49_Wood': '木材纸品', '50-63_TextCloth': '纺织服装', '64-67_Footwear': '鞋帽', '68-71_StoneGlas': '石材玻璃·贵金属珠宝',
  '72-83_Metals': '金属及制品', '84-85_MachElec': '机械电子', '86-89_Transport': '运输设备', '90-99_Miscellan': '仪器及杂项',
};
const WITS_ALIAS = { ROM: 'ROU', SER: 'SRB', ZAR: 'COD', TMP: 'TLS', MNT: 'MNE' };
const trade = {};  // iso -> year -> {code: value}
for (const y of [2021, 2022, 2023]) {
  const x = readFileSync(cache(`wits_${y}.xml`), 'utf8');
  for (const m of x.matchAll(/<Series ([^>]*)>(.*?)<\/Series>/gs)) {
    const a = Object.fromEntries([...m[1].matchAll(/(\w+)="([^"]*)"/g)].map(r => [r[1], r[2]]));
    if (!HS[a.PRODUCTCODE] && a.PRODUCTCODE !== 'Total') continue;
    const v = +(/OBS_VALUE="([^"]*)"/.exec(m[2])?.[1]);
    if (!isFinite(v)) continue;
    const k = WITS_ALIAS[a.REPORTER] || a.REPORTER;
    ((trade[k] ??= {})[y] ??= {})[a.PRODUCTCODE] = v;
  }
}
function exportMix(k) {
  const years = Object.keys(trade[k] || {}).map(Number).filter(y => trade[k][y].Total > 0 && Object.keys(trade[k][y]).length > 10).sort();
  const y = years.at(-1);
  if (!y) return null;
  const c = trade[k][y], w = trade.WLD[y], tot = c.Total;
  const secs = Object.keys(HS).map(code => {
    const share = (c[code] || 0) / tot, wshare = (w[code] || 0) / w.Total;
    return [code, r1(share * 100), wshare > 0 ? r2(share / wshare) : null];
  }).sort((a, b) => b[1] - a[1]);
  return { y, tot: Math.round(tot / 1e6), sec: secs };  // tot in USD bn (WITS values are USD thousands)
}

// ---------------------------------------------------------------- names
const ZH_FIX = {
  TWN: '中国台湾', HKG: '中国香港', MAC: '中国澳门', ARE: '阿联酋', KOR: '韩国', PRK: '朝鲜', RUS: '俄罗斯', GBR: '英国', USA: '美国',
  COD: '刚果（金）', COG: '刚果（布）', XKX: '科索沃', PSE: '巴勒斯坦', SYR: '叙利亚', LAO: '老挝', CZE: '捷克', TUR: '土耳其',
  IRN: '伊朗', VEN: '委内瑞拉', BOL: '玻利维亚', TZA: '坦桑尼亚', MDA: '摩尔多瓦', FSM: '密克罗尼西亚', VNM: '越南', BRN: '文莱',
  SWZ: '斯威士兰', CPV: '佛得角', KNA: '圣基茨和尼维斯', VCT: '圣文森特和格林纳丁斯', STP: '圣多美和普林西比', NLD: '荷兰', MKD: '北马其顿',
};
const EN_FIX = { TWN: 'Taiwan, China', HKG: 'Hong Kong, China', MAC: 'Macao, China', XKX: 'Kosovo', KOR: 'South Korea', RUS: 'Russia', TUR: 'Türkiye' };
const zhName = k => ZH_FIX[k] || iso.getName(k, 'zh') || k;
const enName = k => EN_FIX[k] || iso.getName(k, 'en') || imfC[k]?.label || k;

// ---------------------------------------------------------------- assemble
const countries = [];
for (const k of Object.keys(imf).sort()) {
  const [gdp, gdpY] = upTo(k, 'NGDPD', NOW);
  if (gdp == null) continue;
  const lp0 = at(k, 'LP', NOW), lp1 = at(k, 'LP', NOW + 5);
  const w = wb[k] || {};
  countries.push({
    k, zh: zhName(k), en: enName(k), reg: regionOf(k), inc: incomeOf(k),
    g: YEARS.map(y => r1(at(k, 'NGDP_RPCH', y))),
    gJul: JULY[k] ?? null,
    gdp: r1(gdp), gdpY: gdpY === NOW ? undefined : gdpY, pc: Math.round(upTo(k, 'NGDPDPC', NOW)[0] ?? NaN) || null, ppc: Math.round(at(k, 'PPPPC', NOW) ?? NaN) || null,
    pppsh: r2(at(k, 'PPPSH', NOW)), pop: r1(lp0), infl: r1(at(k, 'PCPIPCH', NOW)), debt: r1(at(k, 'GGXWDG_NGDP', NOW)),
    ca: r1(at(k, 'BCA_NGDPD', NOW)), ur: r1(at(k, 'LUR', NOW)),
    g5: r2(mean([NOW, NOW + 1, NOW + 2, NOW + 3, NOW + 4].map(y => at(k, 'NGDP_RPCH', y)))),
    popg: lp0 && lp1 ? r2((Math.pow(lp1 / lp0, 1 / 5) - 1) * 100) : null,
    gdp31: r1(at(k, 'NGDPD', Y1)),
    wb: Object.keys(w).length ? w : null,
    tr: exportMix(k),
    p: PROFILES[k] || null,
  });
}
const missing = Object.keys(PROFILES).filter(k => !countries.some(c => c.k === k));
if (missing.length) throw new Error('profiles without IMF data: ' + missing.join(', '));

// sanity checks on the hand-written profiles
const themeKeys = new Set(Object.keys(THEMES)), classKeys = new Set(Object.keys(ASSET_CLASSES));
for (const [k, p] of Object.entries(PROFILES)) {
  for (const sec of ['hot', 'mature', 'growth']) {
    if (!Array.isArray(p[sec]) || p[sec].length < 2) throw new Error(`${k}.${sec} needs at least two rows`);
    for (const row of p[sec]) if (row.length !== 3 || !themeKeys.has(row[1])) throw new Error(`${k}.${sec}: bad row ${JSON.stringify(row)}`);
  }
  for (const a of p.assets) if (a.length !== 4 || !classKeys.has(a[0])) throw new Error(`${k}.assets: bad row ${JSON.stringify(a)}`);
  if (p.gl && (p.gl.length !== 2 || !isFinite(p.gl[0]))) throw new Error(`${k}.gl must be [percent, source]`);
  if (!p.thesis || !p.risks?.length || !p.watch) throw new Error(`${k}: thesis, risks and watch are required`);
  for (const s of p.src || []) if (!SOURCES[s]) throw new Error(`${k}: unknown source ${s}`);
}

const wg = json('imf_NGDP_RPCH.json').values.NGDP_RPCH.WEOWORLD;
for (const g of GLOBAL) for (const s of g[3]) if (!SOURCES[s]) throw new Error(`GLOBAL: unknown source ${s}`);
const world = { gdp: r1(countries.reduce((s, c) => s + c.gdp, 0)), g: YEARS.map(y => r1(+wg[y])), gJul: 3.0 };
const DATA = {
  meta: { weo: 'IMF《世界经济展望》2026 年 4 月', jul: 'IMF《世界经济展望》2026 年 7 月更新', built: new Date().toISOString().slice(0, 10),
    years: YEARS, now: NOW, profileAsOf: '2026-10-08', hs: HS },
  world, themes: THEMES, classes: ASSET_CLASSES, sources: SOURCES, global: GLOBAL, tiles: TILES, countries,
};
const out = '// Generated by pipeline/build_data.mjs. GDP in USD bn, population in millions, rates in %.\nconst DATA = ' + JSON.stringify(DATA) + ';\n';
writeFileSync(new URL('../src/data.js', import.meta.url), out);
const prof = countries.filter(c => c.p);
console.log('data.js', (out.length / 1024).toFixed(0) + ' KB,', countries.length, 'economies,', prof.length, 'profiles covering',
  (prof.reduce((s, c) => s + c.gdp, 0) / world.gdp * 100).toFixed(1) + '% of world GDP; no export data:',
  prof.filter(c => !c.tr).map(c => c.k).join(' ') || 'none', '; no WB data:', prof.filter(c => !c.wb).map(c => c.k).join(' ') || 'none');
