"""Build popflow/src/data.js from the raw sources in popflow/.cache.

Units: 31 mainland Chinese provinces, 50 US states + DC, 39 European countries (modern borders).
Grid: every 10 years, 1800-2100. Past = census / reconstructions; future = UN WPP 2024 (low/medium/high).

Model
- Bloc totals: US = census sum (projections = WPP x census/WPP ratio at 2020); China = OWID (<1950) / WPP;
  Europe countries = OWID (<1950) / WPP (direct, incl. projections).
- Province/state shares: census; China pre-1953 from reconstructions (see CN_KNOTS). Future shares come from a
  damped log-share trend whose damping factor is chosen by backtest (see backtest()).
- Net migration per unit and decade:
  * US states, China provinces: residual method. M_i = dP_i - n * P_i + D_i, where n is the bloc's natural growth
    rate after removing known mortality shocks D (Taiping, northwest wars, 1877 and 1959-61 famines).
  * Europe 1950+: WPP NetMigrations per country. Europe <1950: explicit intercontinental emigration and the
    1944-50 expulsions; intra-European migration before 1950 is not modelled.
- Flows: net sources -> net sinks within each bloc by a doubly constrained gravity model (IPF);
  cross-bloc flows (Europe->US, China->US) from US immigration records by decade.
"""
import csv, gzip, io, json, math, os, re, sys
from collections import defaultdict

import pandas as pd

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = os.path.join(ROOT, '.cache')
YEARS = list(range(1800, 2101, 10))
HIST_END = 2020  # last observed grid year
VARIANTS = ['Low', 'Medium', 'High']

# ---------------------------------------------------------------- units
CN = [  # code, adcode, zh, en
    ('BJ', 110000, '北京', 'Beijing'), ('TJ', 120000, '天津', 'Tianjin'), ('HE', 130000, '河北', 'Hebei'),
    ('SX', 140000, '山西', 'Shanxi'), ('NM', 150000, '内蒙古', 'Inner Mongolia'), ('LN', 210000, '辽宁', 'Liaoning'),
    ('JL', 220000, '吉林', 'Jilin'), ('HL', 230000, '黑龙江', 'Heilongjiang'), ('SH', 310000, '上海', 'Shanghai'),
    ('JS', 320000, '江苏', 'Jiangsu'), ('ZJ', 330000, '浙江', 'Zhejiang'), ('AH', 340000, '安徽', 'Anhui'),
    ('FJ', 350000, '福建', 'Fujian'), ('JX', 360000, '江西', 'Jiangxi'), ('SD', 370000, '山东', 'Shandong'),
    ('HA', 410000, '河南', 'Henan'), ('HB', 420000, '湖北', 'Hubei'), ('HN', 430000, '湖南', 'Hunan'),
    ('GD', 440000, '广东', 'Guangdong'), ('GX', 450000, '广西', 'Guangxi'), ('HI', 460000, '海南', 'Hainan'),
    ('CQ', 500000, '重庆', 'Chongqing'), ('SC', 510000, '四川', 'Sichuan'), ('GZ', 520000, '贵州', 'Guizhou'),
    ('YN', 530000, '云南', 'Yunnan'), ('XZ', 540000, '西藏', 'Tibet'), ('SN', 610000, '陕西', 'Shaanxi'),
    ('GS', 620000, '甘肃', 'Gansu'), ('QH', 630000, '青海', 'Qinghai'), ('NX', 640000, '宁夏', 'Ningxia'),
    ('XJ', 650000, '新疆', 'Xinjiang'),
]
EU = [  # iso3, iso numeric, zh
    ('ALB', 8, '阿尔巴尼亚'), ('AUT', 40, '奥地利'), ('BLR', 112, '白俄罗斯'), ('BEL', 56, '比利时'),
    ('BIH', 70, '波黑'), ('BGR', 100, '保加利亚'), ('HRV', 191, '克罗地亚'), ('CYP', 196, '塞浦路斯'),
    ('CZE', 203, '捷克'), ('DNK', 208, '丹麦'), ('EST', 233, '爱沙尼亚'), ('FIN', 246, '芬兰'), ('FRA', 250, '法国'),
    ('DEU', 276, '德国'), ('GRC', 300, '希腊'), ('HUN', 348, '匈牙利'), ('ISL', 352, '冰岛'), ('IRL', 372, '爱尔兰'),
    ('ITA', 380, '意大利'), ('LVA', 428, '拉脱维亚'), ('LTU', 440, '立陶宛'), ('LUX', 442, '卢森堡'),
    ('MLT', 470, '马耳他'), ('MDA', 498, '摩尔多瓦'), ('MNE', 499, '黑山'), ('NLD', 528, '荷兰'),
    ('MKD', 807, '北马其顿'), ('NOR', 578, '挪威'), ('POL', 616, '波兰'), ('PRT', 620, '葡萄牙'),
    ('ROU', 642, '罗马尼亚'), ('RUS', 643, '俄罗斯'), ('SRB', 688, '塞尔维亚'), ('SVK', 703, '斯洛伐克'),
    ('SVN', 705, '斯洛文尼亚'), ('ESP', 724, '西班牙'), ('SWE', 752, '瑞典'), ('CHE', 756, '瑞士'),
    ('UKR', 804, '乌克兰'), ('GBR', 826, '英国'),
]
US_ZH = {
    'Alabama': '亚拉巴马', 'Alaska': '阿拉斯加', 'Arizona': '亚利桑那', 'Arkansas': '阿肯色', 'California': '加利福尼亚',
    'Colorado': '科罗拉多', 'Connecticut': '康涅狄格', 'Delaware': '特拉华', 'District of Columbia': '华盛顿特区',
    'Florida': '佛罗里达', 'Georgia': '佐治亚', 'Hawaii': '夏威夷', 'Idaho': '爱达荷', 'Illinois': '伊利诺伊',
    'Indiana': '印第安纳', 'Iowa': '艾奥瓦', 'Kansas': '堪萨斯', 'Kentucky': '肯塔基', 'Louisiana': '路易斯安那',
    'Maine': '缅因', 'Maryland': '马里兰', 'Massachusetts': '马萨诸塞', 'Michigan': '密歇根', 'Minnesota': '明尼苏达',
    'Mississippi': '密西西比', 'Missouri': '密苏里', 'Montana': '蒙大拿', 'Nebraska': '内布拉斯加', 'Nevada': '内华达',
    'New Hampshire': '新罕布什尔', 'New Jersey': '新泽西', 'New Mexico': '新墨西哥', 'New York': '纽约',
    'North Carolina': '北卡罗来纳', 'North Dakota': '北达科他', 'Ohio': '俄亥俄', 'Oklahoma': '俄克拉何马',
    'Oregon': '俄勒冈', 'Pennsylvania': '宾夕法尼亚', 'Rhode Island': '罗得岛', 'South Carolina': '南卡罗来纳',
    'South Dakota': '南达科他', 'Tennessee': '田纳西', 'Texas': '得克萨斯', 'Utah': '犹他', 'Vermont': '佛蒙特',
    'Virginia': '弗吉尼亚', 'Washington': '华盛顿州', 'West Virginia': '西弗吉尼亚', 'Wisconsin': '威斯康星',
    'Wyoming': '怀俄明',
}

# ---------------------------------------------------------------- China provincial reconstructions (millions)
# 1820: Liang Fangzhong's Jiaqing-25 provincial registers, split to modern provinces (Zhili -> Hebei/Beijing/Tianjin,
# Jiangsu -> Shanghai (Songjiang fu), Gansu -> Gansu/Ningxia/Qinghai, Fujian minus Taiwan, Guangdong minus Qiongzhou,
# Sichuan 27% to Chongqing); Yunnan/Guizhou/frontier raised for unregistered population.
# 1851 / 1880: after Cao Shuji, Zhongguo renkou shi vol. 5 (pre-Taiping peak; after the Taiping, Nian and northwest
# wars and the 1876-79 famine). All values are rounded reconstructions; uncertainty is roughly +-15%.
CN_KNOTS = {
    1820: dict(BJ=2.0, TJ=1.5, HE=17.2, SX=14.4, NM=2.0, LN=1.9, JL=0.6, HL=0.3, SH=2.6, JS=36.7, ZJ=27.4, AH=34.9,
               FJ=14.1, JX=22.5, SD=29.5, HA=23.6, HB=28.9, HN=18.9, GD=20.2, GX=7.4, HI=1.4, CQ=7.6, SC=20.5,
               GZ=5.4, YN=8.5, XZ=1.1, SN=12.0, GS=13.0, QH=1.2, NX=1.4, XJ=1.5),
    1851: dict(BJ=2.2, TJ=1.7, HE=19.4, SX=15.1, NM=2.4, LN=2.6, JL=0.9, HL=0.4, SH=3.0, JS=41.3, ZJ=30.3, AH=37.6,
               FJ=15.0, JX=24.5, SD=33.1, HA=24.0, HB=33.8, HN=20.6, GD=26.4, GX=7.8, HI=1.8, CQ=11.9, SC=32.3,
               GZ=5.4, YN=10.1, XZ=1.1, SN=12.1, GS=12.9, QH=1.3, NX=1.5, XJ=1.6),
    1880: dict(BJ=2.1, TJ=1.7, HE=20.0, SX=10.5, NM=2.6, LN=3.5, JL=1.0, HL=0.6, SH=3.3, JS=26.7, ZJ=15.0, AH=20.0,
               FJ=15.0, JX=15.0, SD=35.0, HA=22.0, HB=30.0, HN=21.0, GD=27.0, GX=8.5, HI=2.0, CQ=13.5, SC=36.5,
               GZ=6.0, YN=7.0, XZ=1.1, SN=7.5, GS=4.5, QH=0.8, NX=0.5, XJ=1.2),
}
# Provinces hit by mass mortality, by decade start: Taiping, Nian and northwest wars (1850s-70s), the 1876-79 North
# China famine, the 1942 Henan famine, the 1959-61 famine. In these cells a population loss beyond the national
# natural growth is booked as excess deaths, not out-migration (in-migration is still counted).
# Shares between the 1851 and 1880 knots are interpolated, so the losses are spread over all three decades.
_QING = 'JS ZJ AH JX HB GX SN GS NX QH YN XJ SX HA SD HE'
CN_SHOCKS = {
    1850: _QING, 1860: _QING, 1870: _QING,
    1940: 'HA', 1950: 'AH SC CQ GZ HA HN SD GS GX', 1960: 'AH SC CQ GZ HA HN SD GS GX',
}
CN_WIKI = {  # Wikipedia row label (prefix) -> code
    'Guangdong': 'GD', 'Shandong': 'SD', 'Henan': 'HA', 'Jiangsu': 'JS', 'Sichuan': 'SC', 'Hebei': 'HE',
    'Hunan': 'HN', 'Zhejiang': 'ZJ', 'Anhui': 'AH', 'Hubei': 'HB', 'Guangxi': 'GX', 'Yunnan': 'YN',
    'Jiangxi': 'JX', 'Liaoning': 'LN', 'Fujian': 'FJ', 'Shaanxi': 'SN', 'Guizhou': 'GZ', 'Shanxi': 'SX',
    'Chongqing': 'CQ', 'Heilongjiang': 'HL', 'Xinjiang': 'XJ', 'Gansu': 'GS', 'Shanghai': 'SH', 'Jilin': 'JL',
    'Inner Mongolia': 'NM', 'Beijing': 'BJ', 'Tianjin': 'TJ', 'Hainan': 'HI', 'Ningxia': 'NX', 'Qinghai': 'QH',
    'Tibet': 'XZ', 'Rehe': 'Rehe', 'Xikang': 'Xikang', 'Qahar': 'Qahar', 'Suiyuan': 'Suiyuan',
}

# ---------------------------------------------------------------- migration inputs (thousands)
# US persons obtaining legal permanent residence by region of last residence, by decade (DHS Yearbook table 2;
# 1800s/1810s estimated). total, Europe, China.
US_IMM = {
    1800: (80, 70, 0), 1810: (110, 100, 0), 1820: (129, 99, 0), 1830: (538, 423, 0), 1840: (1427, 1369, 0),
    1850: (2815, 2620, 36), 1860: (2081, 1878, 54), 1870: (2742, 2252, 133), 1880: (5249, 4639, 66),
    1890: (3694, 3576, 15), 1900: (8202, 7573, 20), 1910: (6347, 4985, 21), 1920: (4296, 2560, 31),
    1930: (699, 444, 6), 1940: (857, 473, 16), 1950: (2499, 1405, 9), 1960: (3214, 1133, 14),
    1970: (4248, 826, 18), 1980: (6244, 669, 171), 1990: (9775, 1349, 342), 2000: (10299, 1350, 592),
    2010: (10650, 900, 700),
}
def us_return(y):  # share of arrivals who later left (net = gross * (1 - r))
    return 0.1 if y < 1880 else 0.3 if y < 1930 else 0.2
AH_SPLIT = dict(AUT=.2, HUN=.25, CZE=.15, SVK=.12, POL=.12, HRV=.06, ROU=.05, UKR=.05)
RU_SPLIT = dict(POL=.35, RUS=.25, LTU=.12, UKR=.1, BLR=.1, LVA=.04, FIN=.04)
EU_TO_US_MIX = {  # % of European arrivals by origin; AH = Austria-Hungary, RUe = Russian Empire
    1800: dict(IRL=45, GBR=30, DEU=10, FRA=10, CHE=2, NLD=3),
    1830: dict(IRL=32, GBR=18, DEU=32, FRA=11, CHE=2, NLD=2, NOR=1, BEL=2),
    1840: dict(IRL=46, GBR=19, DEU=28, FRA=5, NLD=1, NOR=1),
    1850: dict(IRL=35, GBR=16, DEU=37, FRA=3, CHE=1.5, NOR=1.5, SWE=1, NLD=.5),
    1860: dict(DEU=37, GBR=27, IRL=23, NOR=4, SWE=4, FRA=2, CHE=1, NLD=1, DNK=1),
    1870: dict(DEU=32, GBR=25, IRL=19, SWE=5, NOR=4, AH=3, ITA=2, RUe=2, DNK=1.5, FRA=3, CHE=1.5),
    1880: dict(DEU=31, GBR=17, IRL=14, SWE=8, NOR=4, DNK=2, AH=7, ITA=6, RUe=5, CHE=2, NLD=1, FRA=1),
    1890: dict(ITA=18, AH=17, RUe=14, DEU=15, IRL=11, GBR=8, SWE=7, NOR=3, DNK=1.5, GRC=.5),
    1900: dict(ITA=26, AH=27, RUe=21, GBR=6, DEU=4, IRL=4, SWE=3, NOR=3, GRC=2, PRT=1, DNK=1),
    1910: dict(ITA=25, AH=18, RUe=22, GBR=7, GRC=4, DEU=3, IRL=3, SWE=2, NOR=2, PRT=2, ESP=1.5),
    1920: dict(ITA=18, DEU=16, GBR=14, IRL=8, POL=9, AH=6, SWE=4, NOR=3, RUe=3, GRC=2, CZE=4, PRT=1),
    1930: dict(DEU=33, ITA=20, GBR=9, AH=6, POL=4, IRL=3, CZE=3, GRC=2, SWE=1, NOR=1),
    1940: dict(DEU=47, GBR=30, ITA=13, IRL=2, FRA=3, NLD=2, POL=2, GRC=1),
}
# European emigration to destinations other than the US (Canada, Latin America, Oceania, Africa), gross.
EU_TO_ROW = {1800: 20, 1810: 50, 1820: 100, 1830: 200, 1840: 400, 1850: 800, 1860: 900, 1870: 1000, 1880: 2400,
             1890: 2700, 1900: 3800, 1910: 2700, 1920: 3000, 1930: 600, 1940: 1000}
EU_TO_ROW_MIX_EARLY = dict(GBR=55, IRL=10, DEU=15, PRT=8, ESP=7, FRA=5)
EU_TO_ROW_MIX_LATE = dict(GBR=35, ITA=28, ESP=17, PRT=8, DEU=5, POL=3, FRA=2, NLD=2)
# Explicit intra-European / inbound movements before 1950 (thousands, from, to, decade).
EU_EVENTS = [
    (1910, 'ROW', 'GRC', 1200),  # Greek-Turkish exchange 1922-23 (counted in the 1910s-20s decade boundary)
    (1910, 'RUS', 'DEU', 300), (1910, 'RUS', 'FRA', 200), (1910, 'RUS', 'SRB', 50),  # Russian emigres
    (1940, 'POL', 'DEU', 7000), (1940, 'CZE', 'DEU', 3000), (1940, 'HUN', 'DEU', 200), (1940, 'ROU', 'DEU', 250),
    (1940, 'SRB', 'DEU', 300), (1940, 'RUS', 'DEU', 400), (1940, 'LTU', 'DEU', 100),  # expulsions of Germans
    (1940, 'UKR', 'POL', 800), (1940, 'BLR', 'POL', 250), (1940, 'LTU', 'POL', 200),
]
# OWID has no Ireland before 1950 and its UK series includes Ireland in some years. Modern-border census values
# (Great Britain + Northern Ireland; the 26 counties of the Republic), millions, census year t+1 mapped to t.
EU_OVERRIDE = {
    'IRL': [4.6, 5.0, 5.4, 6.0, 6.5, 5.2, 4.4, 4.06, 3.88, 3.48, 3.23, 3.14, 3.05, 2.97, 2.96],
    'GBR': [11.7, 13.3, 15.5, 17.8, 20.1, 22.2, 24.5, 27.4, 31.0, 34.2, 38.2, 42.0, 44.0, 46.0, 47.8],
}

# China net external migration before 1950 (mostly to Southeast Asia), thousands per decade (negative = outflow).
CN_EXT = {1800: -100, 1810: -100, 1820: -150, 1830: -200, 1840: -300, 1850: -500, 1860: -600, 1870: -600,
          1880: -800, 1890: -800, 1900: -1000, 1910: -1000, 1920: -1500, 1930: -500, 1940: -300}

# Gateway coordinates for the off-map "rest of world" endpoints and port-of-entry gravity.
GATE = {
    'US_EU': (-74.0, 40.7), 'US_CN': (-122.4, 37.8), 'US_ROW': (-98.0, 29.0),
    'EU_US': (-10.0, 50.0), 'EU_ROW_OUT': (-15.0, 40.0), 'EU_ROW_IN': (25.0, 33.0),
    'CN_PORT_OLD': (114.2, 22.3), 'CN_PORT_NEW': (121.5, 31.2), 'CN_ROW': (110.0, 12.0),
}


def wl(*a):
    print(*a, file=sys.stderr)


# ---------------------------------------------------------------- loaders
def load_wpp():
    pop = defaultdict(dict)  # (iso, variant) -> {year: thousands}
    want = {'CHN', 'USA'} | {e[0] for e in EU}
    with gzip.open(os.path.join(CACHE, 'WPP2024_TotalPopulationBySex.csv.gz'), 'rt', encoding='utf-8-sig') as f:
        for r in csv.DictReader(f):
            iso = r['ISO3_code']
            if iso in want and r['Variant'] in VARIANTS:
                pop[(iso, r['Variant'])][int(r['Time'])] = float(r['PopTotal'])
    mig = defaultdict(dict)  # iso -> {year: thousands per year}
    with gzip.open(os.path.join(CACHE, 'WPP2024_Demographic_Indicators_Medium.csv.gz'), 'rt', encoding='utf-8-sig') as f:
        for r in csv.DictReader(f):
            if r['ISO3_code'] in want and r['NetMigrations']:
                mig[r['ISO3_code']][int(r['Time'])] = float(r['NetMigrations'])
    # Low/High share the medium estimates up to 2023
    for iso in want:
        for v in ('Low', 'High'):
            for y, p in pop[(iso, 'Medium')].items():
                pop[(iso, v)].setdefault(y, p)
    return pop, mig


def load_owid():
    d = defaultdict(dict)
    with open(os.path.join(CACHE, 'owid_pop.csv'), encoding='utf-8') as f:
        for r in csv.DictReader(f):
            y = int(r['year'])
            if 1790 <= y <= 1950:
                d[r['code'] or r['entity']][y] = float(r['population_historical']) / 1000
    return d


def clean_num(v):
    if v is None or (isinstance(v, float) and math.isnan(v)):
        return None
    s = re.sub(r'\[.*?\]', '', str(v)).replace(',', '').strip()
    if s in ('', '*', 'nan', '—', '–'):
        return None
    try:
        return float(s)
    except ValueError:
        return None


def load_us_states():
    ts = pd.read_html(os.path.join(CACHE, 'us_hist.html'))
    out = defaultdict(dict)  # name -> {year: persons}
    for t in (ts[0], ts[2], ts[3]):
        for _, row in t.iterrows():
            name = re.sub(r'\[.*?\]', '', str(row['Name'])).strip()
            if name not in US_ZH:
                continue
            for c in t.columns:
                m = re.match(r'^(\d{4})', str(c))
                if m and c != 'Admitted[d]':
                    v = clean_num(row[c])
                    out[name][int(m.group(1))] = (v or 0.0) / 1000
    return out


def load_cn_wiki():
    t = pd.read_html(os.path.join(CACHE, 'cn_hist.html'))[5]
    cols = {int(re.match(r'(\d{4})', str(c)).group(1)): c for c in t.columns[1:]}
    out = defaultdict(dict)
    for _, row in t.iterrows():
        label = re.sub(r'\[.*?\]', '', str(row.iloc[0])).strip()
        code = CN_WIKI.get(label)
        if not code:
            continue
        for y, c in cols.items():
            v = clean_num(row[c])
            if v is not None:
                out[code][y] = v / 1e6
    return out


# ---------------------------------------------------------------- China provincial shares at knot years
def cn_shares(w):
    codes = [c[0] for c in CN]
    knots = {y: dict(v) for y, v in CN_KNOTS.items()}

    def g(code, y, default=0.0):
        return w.get(code, {}).get(y, default)

    # 1912 (Xuantong survey as published in 1912), modern boundaries
    k = {c: g(c, 1912) for c in codes}
    k['AH'], k['GX'] = 20.5, 10.5           # obvious under-registration in the 1912 series
    k['XZ'], k['NX'], k['QH'] = 1.0, 0.6, 1.0
    rehe, qahar, suiyuan = 4.0, 1.5, 1.0
    k['HE'] += .4 * rehe + .6 * qahar; k['LN'] += .3 * rehe; k['NM'] = .3 * rehe + .4 * qahar + suiyuan + .5
    k['BJ'], k['TJ'], k['SH'] = 2.1, 2.1, 4.5
    k['HE'] -= 4.2; k['JS'] -= 4.5
    k['CQ'] = .27 * k['SC']; k['SC'] *= .73
    k['HI'] = .078 * k['GD']; k['GD'] *= .922
    knots[1912] = k
    # 1936-37
    k = {c: g(c, 1936) for c in codes}
    rehe, qahar, suiyuan, xikang = g('Rehe', 1936), g('Qahar', 1936), g('Suiyuan', 1936), g('Xikang', 1936)
    k['HE'] += .4 * rehe + .6 * qahar; k['NM'] = .3 * rehe + .4 * qahar + suiyuan + .6
    k['LN'], k['JL'], k['HL'] = 16.0 + .3 * rehe, 8.8, 8.2   # Manchukuo-era registers rescaled to ~33 M
    k['SC'] += .7 * xikang; k['XZ'] = 1.0 + .3 * xikang
    k['BJ'] += 1.2; k['TJ'] += 1.7; k['SH'] += 3.0
    k['HE'] -= 2.9; k['JS'] -= 3.0
    k['CQ'] = .27 * k['SC']; k['SC'] *= .73
    k['HI'] = .078 * k['GD']; k['GD'] *= .922
    knots[1936] = k
    # 1953 census (column "1954"), moved to modern boundaries
    k = {c: g(c, 1954) for c in codes}
    rehe, xikang = g('Rehe', 1954), g('Xikang', 1954)
    k['HE'] += .4 * rehe; k['LN'] += .3 * rehe; k['NM'] += .3 * rehe
    k['SC'] += .85 * xikang; k['XZ'] += .15 * xikang
    k['BJ'] += 1.23; k['TJ'] += 1.71; k['HE'] -= 2.94
    k['SH'] += 3.6; k['JS'] -= 3.6
    k['NX'] = 1.6; k['GS'] -= 1.6  # Ningxia was part of Gansu 1954-58
    k['CQ'] = .27 * k['SC']; k['SC'] *= .73
    k['HI'] = .078 * k['GD']; k['GD'] *= .922
    knots[1953] = k
    # 1964
    k = {c: g(c, 1964) for c in codes}
    k['TJ'] = 6.3; k['HE'] -= 6.3
    k['NX'] = 2.1  # 1964 census figure; the table leaves Ningxia blank
    k['CQ'] = .27 * k['SC']; k['SC'] *= .73
    k['HI'] = .085 * k['GD']; k['GD'] *= .915
    knots[1964] = k
    for y in (1982, 1990):
        k = {c: g(c, y) for c in codes}
        k['CQ'] = .27 * k['SC']; k['SC'] *= .73
        if y == 1982:
            k['HI'] = .0945 * k['GD']; k['GD'] *= .9055
        knots[y] = k
    for y in (2000, 2010, 2020):
        knots[y] = {c: g(c, y) for c in codes}
    out = {}
    for y, k in sorted(knots.items()):
        miss = [c for c in codes if not k.get(c)]
        if miss:
            raise SystemExit(f'China knot {y} missing {miss}')
        tot = sum(k[c] for c in codes)
        out[y] = {c: k[c] / tot for c in codes}
    return out


def interp_shares(knots, years):
    ks = sorted(knots)
    codes = list(knots[ks[0]])
    res = {}
    for y in years:
        if y <= ks[0]:
            res[y] = dict(knots[ks[0]]); continue
        if y >= ks[-1]:
            res[y] = dict(knots[ks[-1]]); continue
        a = max(k for k in ks if k <= y); b = min(k for k in ks if k >= y)
        if a == b:
            res[y] = dict(knots[a]); continue
        t = (y - a) / (b - a)
        s = {c: math.exp((1 - t) * math.log(knots[a][c]) + t * math.log(knots[b][c])) for c in codes}
        tot = sum(s.values())
        res[y] = {c: v / tot for c, v in s.items()}
    return res


# ---------------------------------------------------------------- share projection model
def project_shares(s_base, s_now, gap, phi, h):
    """Damped log-share trend: ln s(T+h) = ln s(T) + r * sum_{k=1..h} phi^k, r = annual log-share change."""
    damp = h if phi == 1 else (phi * (1 - phi ** h) / (1 - phi) if phi > 0 else 0)
    out = {}
    for c, v in s_now.items():
        b = s_base.get(c, 0)
        if v <= 0 or b <= 0:
            out[c] = v; continue
        r = (math.log(v) - math.log(b)) / gap
        out[c] = math.exp(math.log(v) + r * damp)
    tot = sum(out.values())
    return {c: v / tot for c, v in out.items()}


PHIS = [0.0, 0.8, 0.9, 0.95, 0.97, 1.0]


def ape_stats(pred, actual):
    errs = [abs(pred[c] - actual[c]) / actual[c] for c in actual if actual[c] > 0]
    errs.sort()
    wape = sum(abs(pred[c] - actual[c]) for c in actual) / sum(actual.values())
    return dict(mape=sum(errs) / len(errs), median=errs[len(errs) // 2], wape=wape)


def backtest(series, cases, label):
    """series: year -> {unit: population}. cases: (base, anchor, target, set)."""
    rows = []
    for base, anchor, target, kind in cases:
        sb, sa, st = norm(series[base]), norm(series[anchor]), norm(series[target])
        tot = 1.0
        row = dict(bloc=label, base=base, anchor=anchor, target=target, set=kind, by={})
        for phi in PHIS:
            p = project_shares(sb, sa, anchor - base, phi, target - anchor)
            row['by'][phi] = ape_stats({c: p[c] * tot for c in st}, st)
        rows.append(row)
    return rows


def pick_phi(*row_sets):
    """One damping factor for both blocs: lowest mean MAPE over the pooled calibration cases."""
    calib = [r for rows in row_sets for r in rows if r['set'] == 'calib']
    return min(PHIS, key=lambda f: sum(r['by'][f]['mape'] for r in calib) / len(calib))


def norm(d):
    t = sum(d.values())
    return {k: v / t for k, v in d.items()}


# ---------------------------------------------------------------- gravity flows
def hav(a, b):
    lon1, lat1, lon2, lat2 = map(math.radians, (a[0], a[1], b[0], b[1]))
    h = math.sin((lat2 - lat1) / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin((lon2 - lon1) / 2) ** 2
    return 6371 * 2 * math.asin(math.sqrt(h))


def gravity(sources, sinks, pos, beta=1.4):
    """sources/sinks: {node: amount>0}, equal totals. Doubly constrained gravity via IPF. Returns {(i,j): f}."""
    S = {k: v for k, v in sources.items() if v > 1e-6}
    D = {k: v for k, v in sinks.items() if v > 1e-6}
    if not S or not D:
        return {}
    ts, td = sum(S.values()), sum(D.values())
    D = {k: v * ts / td for k, v in D.items()}
    K = {(i, j): (hav(pos[i], pos[j]) + 250) ** -beta for i in S for j in D if i != j}
    a = {i: 1.0 for i in S}; b = {j: 1.0 for j in D}
    for _ in range(60):
        for i in S:
            s = sum(K[(i, j)] * b[j] * D[j] for j in D if (i, j) in K)
            a[i] = 1 / s if s else 0
        for j in D:
            s = sum(K[(i, j)] * a[i] * S[i] for i in S if (i, j) in K)
            b[j] = 1 / s if s else 0
    return {(i, j): a[i] * b[j] * S[i] * D[j] * k for (i, j), k in K.items()}


# ---------------------------------------------------------------- main
def main():
    wpp, wmig = load_wpp()
    owid = load_owid()
    us_hist = load_us_states()
    cn_w = load_cn_wiki()

    def wpp_at(iso, v, y):
        return wpp[(iso, v)][y]

    def decade_mig(iso, y):  # WPP net migration summed over [y, y+10)
        return sum(wmig[iso].get(t, 0) for t in range(y, y + 10))

    # ---- geometry centroids come from the browser; here we need rough positions for gravity
    raw = json.load(open(os.path.join(ROOT, 'pipeline', 'centroids.raw.json'), encoding='utf-8'))
    geo_pos = {}

    units = []  # dicts: id, bloc, zh, en
    for code, ad, zh, en in CN:
        units.append(dict(id='CN-' + code, bloc='CN', zh=zh, en=en, geo=str(ad)))
    us_names = sorted(US_ZH)
    for n in us_names:
        units.append(dict(id='US-' + n.replace(' ', '_'), bloc='US', zh=US_ZH[n], en=n, geo=n))
    for iso, num, zh in EU:
        units.append(dict(id='EU-' + iso, bloc='EU', zh=zh, en=iso, geo=f'{num:03d}'))
    ids = [u['id'] for u in units]
    for u in units:
        layer = {'CN': 'cn', 'US': 'us', 'EU': 'world'}[u['bloc']]
        geo_pos[u['id']] = tuple(raw[layer + ':' + u['geo']])

    # ---- populations: pop[variant][unit][year] (thousands)
    pop = {v: defaultdict(dict) for v in VARIANTS}

    cn_knots = cn_shares(cn_w)
    cn_codes = [c[0] for c in CN]

    # US
    us_ratio = sum(us_hist[n][2020] for n in us_names) / wpp_at('USA', 'Medium', 2020)
    us_share_hist = {y: norm({n: us_hist[n].get(y, 0) for n in us_names}) for y in YEARS if y <= HIST_END}
    us_series = {y: {n: us_hist[n].get(y, 0) for n in us_names} for y in range(1790, 2021, 10)}
    us_cases = [(b, a, t, 'calib' if t <= 2010 else 'holdout')
                for (b, a) in [(1940, 1960), (1950, 1970), (1960, 1980), (1970, 1990), (1980, 2000), (1990, 2010)]
                for t in (a + 10, a + 20, a + 30) if t <= 2020 and not (a >= 2000 and t <= 2010)]
    us_cases = [(b, a, t, 'holdout' if a >= 2000 else 'calib') for b, a, t, _ in us_cases]
    us_bt = backtest(us_series, us_cases, 'US')
    cn_series = {y: {c: cn_knots[y][c] for c in cn_codes} for y in (1964, 1982, 1990, 2000, 2010, 2020)}
    cn_cases = [(1964, 1982, 1990, 'calib'), (1964, 1982, 2000, 'calib'), (1982, 1990, 2000, 'calib'),
                (1990, 2000, 2010, 'holdout'), (1990, 2000, 2020, 'holdout'), (2000, 2010, 2020, 'holdout')]
    cn_bt = backtest(cn_series, cn_cases, 'CN')
    us_phi = cn_phi = pick_phi(us_bt, cn_bt)
    wl('phi', us_phi)
    us_future = {}
    for y in YEARS:
        if y > HIST_END:
            us_future[y] = project_shares(us_share_hist[2000], us_share_hist[2020], 20, us_phi, y - 2020)
    for v in VARIANTS:
        for y in YEARS:
            if y <= HIST_END:
                for n in us_names:
                    pop[v]['US-' + n.replace(' ', '_')][y] = us_hist[n].get(y, 0)
            else:
                tot = wpp_at('USA', v, y) * us_ratio
                for n in us_names:
                    pop[v]['US-' + n.replace(' ', '_')][y] = us_future[y][n] * tot

    # China
    cn_hist_sh = interp_shares(cn_knots, [y for y in YEARS if y <= HIST_END])
    cn_tot_hist = {y: (owid['CHN'][y] if y < 1950 else wpp_at('CHN', 'Medium', y)) for y in YEARS if y <= HIST_END}
    cn_future = {y: project_shares(cn_knots[2000], cn_knots[2020], 20, cn_phi, y - 2020) for y in YEARS if y > HIST_END}
    for v in VARIANTS:
        for y in YEARS:
            sh = cn_hist_sh[y] if y <= HIST_END else cn_future[y]
            tot = cn_tot_hist[y] if y <= HIST_END else wpp_at('CHN', v, y)
            for c in cn_codes:
                pop[v]['CN-' + c][y] = sh[c] * tot

    # Europe
    for iso, num, zh in EU:
        for v in VARIANTS:
            for y in YEARS:
                if y < 1950 and iso in EU_OVERRIDE:
                    val = EU_OVERRIDE[iso][(y - 1800) // 10] * 1000
                elif y < 1950:
                    val = owid.get(iso, {}).get(y)
                    if iso == 'SRB':  # WPP's Serbia includes Kosovo; OWID has Kosovo only at a few years
                        kos = owid['OWID_KOS']
                        val += kos[1820] * (kos[1950] / kos[1820]) ** ((y - 1820) / 130) if y > 1820 else kos[1800]
                    if val is None:
                        raise SystemExit(f'OWID missing {iso} {y}')
                else:
                    val = wpp_at(iso, v, y)
                pop[v]['EU-' + iso][y] = val

    # ---- net migration & flows per decade (medium variant)
    P = pop['Medium']
    pos = dict(geo_pos)
    flows = {}      # decade -> list of (from, to, value)
    netmig = defaultdict(dict)  # unit -> decade -> thousands
    external = {}
    shock_deaths = {}

    def add(fl, a, b, v):
        if v > 0:
            fl[(a, b)] = fl.get((a, b), 0) + v

    for y in YEARS[:-1]:
        y2 = y + 10
        fl = {}
        # -- cross-bloc inputs
        if y <= 2010:
            tot_imm, eu_imm, cn_imm = US_IMM[y]
        else:  # future: keep 2010s mix as a share of WPP US net migration
            t0, e0, c0 = US_IMM[2010]
            m = decade_mig('USA', y)
            tot_imm, eu_imm, cn_imm = m / .8, m / .8 * e0 / t0, m / .8 * c0 / t0
        net = 1 - us_return(y)
        eu_us, cn_us = eu_imm * net, cn_imm * net
        us_M = tot_imm * net if y < 1950 else decade_mig('USA', y) * us_ratio
        row_us = us_M - eu_us - cn_us

        # -- Europe sources for US arrivals
        eu_us_by = defaultdict(float)
        if y < 1950:
            mix = EU_TO_US_MIX[max(k for k in EU_TO_US_MIX if k <= y)]
            tw = sum(mix.values())
            for k, w in mix.items():
                split = AH_SPLIT if k == 'AH' else RU_SPLIT if k == 'RUe' else {k: 1}
                for iso, s in split.items():
                    eu_us_by['EU-' + iso] += eu_us * w / tw * s
            row_mix = EU_TO_ROW_MIX_EARLY if y < 1880 else EU_TO_ROW_MIX_LATE
            tw = sum(row_mix.values())
            for iso, w in row_mix.items():
                add(fl, 'EU-' + iso, 'X-EU-ROW', EU_TO_ROW[y] * net * w / tw)
            for d, a, b, v in EU_EVENTS:
                if d == y:
                    add(fl, 'X-EU-ROW' if a == 'ROW' else 'EU-' + a, 'EU-' + b, v)
            eu_M = {}
            for (a, b), v in fl.items():
                if a.startswith('EU-'):
                    eu_M[a] = eu_M.get(a, 0) - v
                if b.startswith('EU-'):
                    eu_M[b] = eu_M.get(b, 0) + v
            for a, v in eu_us_by.items():
                eu_M[a] = eu_M.get(a, 0) - v
        else:
            eu_M = {'EU-' + iso: decade_mig(iso, y) for iso, _, _ in EU}
            src = {k: -v for k, v in eu_M.items() if v < 0}
            snk = {k: v for k, v in eu_M.items() if v > 0}
            snk['X-EU-US'] = eu_us
            bal = sum(snk.values()) - sum(src.values())
            pos['X-EU-ROW'] = GATE['EU_ROW_IN'] if bal > 0 else GATE['EU_ROW_OUT']
            if bal > 0:
                src['X-EU-ROW'] = bal
            else:
                snk['X-EU-ROW'] = -bal
            pos['X-EU-US'] = GATE['EU_US']
            for (a, b), v in gravity(src, snk, pos).items():
                if b == 'X-EU-US':
                    eu_us_by[a] += v
                else:
                    add(fl, a, b, v)
            # rescale so country totals sum exactly to eu_us
            s = sum(eu_us_by.values())
            if s > 0:
                for k in eu_us_by:
                    eu_us_by[k] *= eu_us / s
        if y < 1950:
            pos['X-EU-ROW'] = GATE['EU_ROW_OUT']
        for k, v in eu_M.items():
            netmig[k][y] = v

        # -- China residual
        cn_ids = ['CN-' + c for c in cn_codes]
        cn_M_nat = CN_EXT[y] if y < 1950 else decade_mig('CHN', y)
        hit = {'CN-' + c for c in CN_SHOCKS.get(y, '').split()}
        Pt = sum(P[i][y] for i in cn_ids); Pt2 = sum(P[i][y2] for i in cn_ids)
        deaths = {}
        for _ in range(50):  # fixed point: deaths raise the base natural rate, which raises the deficits
            n = (Pt2 - Pt - cn_M_nat + sum(deaths.values())) / Pt
            raw = {i: P[i][y2] - P[i][y] * (1 + n) for i in cn_ids}
            deaths = {i: -raw[i] for i in hit if raw[i] < 0}
        cn_M = {i: raw[i] + deaths.get(i, 0) for i in cn_ids}
        shock_deaths[y] = round(sum(deaths.values()))
        for k, v in cn_M.items():
            netmig[k][y] = v
        src = {k: -v for k, v in cn_M.items() if v < 0}
        snk = {k: v for k, v in cn_M.items() if v > 0}
        port = GATE['CN_PORT_OLD'] if y < 1980 else GATE['CN_PORT_NEW']
        pos['X-CN-US'] = port
        pos['X-CN-ROW'] = port
        cn_row = cn_M_nat + cn_us  # remaining external net (negative = outflow to rest of world)
        snk['X-CN-US'] = cn_us
        if cn_row < 0:
            snk['X-CN-ROW'] = -cn_row
        else:
            src['X-CN-ROW'] = cn_row
        cn_us_by = defaultdict(float)
        for (a, b), v in gravity(src, snk, pos, beta=1.8).items():
            if b == 'X-CN-US':
                cn_us_by[a] += v
            else:
                add(fl, a, b, v)
        s = sum(cn_us_by.values())
        if s > 0:
            for k in cn_us_by:
                cn_us_by[k] *= cn_us / s

        # -- US residual
        us_ids = ['US-' + nm.replace(' ', '_') for nm in us_names]
        Pt = sum(P[i][y] for i in us_ids); Pt2 = sum(P[i][y2] for i in us_ids)
        n = (Pt2 - Pt - us_M) / Pt
        us_Mi = {i: P[i][y2] - P[i][y] * (1 + n) for i in us_ids}
        for k, v in us_Mi.items():
            netmig[k][y] = v
        src = {k: -v for k, v in us_Mi.items() if v < 0}
        snk = {k: v for k, v in us_Mi.items() if v > 0}
        src['X-US-EU'] = eu_us; src['X-US-CN'] = cn_us
        pos['X-US-EU'] = GATE['US_EU']; pos['X-US-CN'] = GATE['US_CN']; pos['X-US-ROW'] = GATE['US_ROW']
        if row_us > 0:
            src['X-US-ROW'] = row_us
        else:
            snk['X-US-ROW'] = -row_us
        alloc_eu, alloc_cn = defaultdict(float), defaultdict(float)
        for (a, b), v in gravity(src, snk, pos, beta=1.2).items():
            if a == 'X-US-EU':
                alloc_eu[b] += v
            elif a == 'X-US-CN':
                alloc_cn[b] += v
            elif a == 'X-US-ROW':
                add(fl, 'X-US-ROW', b, v)
            else:
                add(fl, a, b, v)
        # combine origin x destination for cross-bloc arcs
        for alloc, origin in ((alloc_eu, eu_us_by), (alloc_cn, cn_us_by)):
            ta, to = sum(alloc.values()), sum(origin.values())
            if ta <= 0 or to <= 0:
                continue
            for o, ov in origin.items():
                for d, dv in alloc.items():
                    add(fl, o, d, ov * dv / ta)
        external[y] = dict(eu_us=round(eu_us), cn_us=round(cn_us), row_us=round(row_us), us_M=round(us_M),
                           cn_M=round(cn_M_nat), cn_deaths=shock_deaths.get(y, 0), eu_M=round(sum(eu_M.values())))
        flows[y] = fl

    # ---- pack
    ext_nodes = {
        'X-EU-ROW': dict(zh='欧洲以外地区'),
        'X-CN-ROW': dict(zh='东南亚等海外'),
        'X-US-ROW': dict(zh='拉美、亚洲等'),
    }
    idx = {k: i for i, k in enumerate(ids)}
    ext_ids = list(ext_nodes)
    for k in ext_ids:
        idx[k] = len(idx)
    gate_pos = {'X-EU-ROW': {'pre': GATE['EU_ROW_OUT'], 'post': GATE['EU_ROW_IN']},
                'X-CN-ROW': {'pre': GATE['CN_ROW'], 'post': GATE['CN_ROW']},
                'X-US-ROW': {'pre': GATE['US_ROW'], 'post': GATE['US_ROW']}}

    def r3(x):
        return round(x, 1) if abs(x) < 100 else round(x)

    out_flows = {}
    for y, fl in flows.items():
        items = sorted(((a, b, v) for (a, b), v in fl.items() if v >= 5), key=lambda t: -t[2])
        keep = [t for t in items if not (t[0].startswith('X-') and t[0] not in idx)]
        out_flows[y] = [[idx[a], idx[b], round(v)] for a, b, v in keep[:90] if a in idx and b in idx]

    def bt_rows(rows):
        return [dict(base=r['base'], anchor=r['anchor'], target=r['target'], set=r['set'],
                     by={str(k): {m: round(v * 100, 2) for m, v in s.items()} for k, s in r['by'].items()})
                for r in rows]

    # unit-level 2000 -> 2020 holdout error with the chosen phi (for the error map)
    def holdout_map(series_shares, base, anchor, target, phi, prefix, tot):
        p = project_shares(series_shares[base], series_shares[anchor], anchor - base, phi, target - anchor)
        act = series_shares[target]
        return {prefix + c.replace(' ', '_'): round((p[c] - act[c]) / act[c] * 100, 1) for c in act}

    us_sh = {y: norm(us_series[y]) for y in us_series}
    hold = {}
    hold.update(holdout_map(us_sh, 1980, 2000, 2020, us_phi, 'US-', None))
    hold.update(holdout_map({y: cn_knots[y] for y in cn_knots}, 1990, 2000, 2020, cn_phi, 'CN-', None))
    hold_const = {}
    hold_const.update(holdout_map(us_sh, 1980, 2000, 2020, 0.0, 'US-', None))
    hold_const.update(holdout_map({y: cn_knots[y] for y in cn_knots}, 1990, 2000, 2020, 0.0, 'CN-', None))

    data = dict(
        years=YEARS, histEnd=HIST_END, variants=VARIANTS,
        units=[dict(id=u['id'], bloc=u['bloc'], zh=u['zh'], en=u['en'], geo=u['geo']) for u in units],
        ext=[dict(id=k, zh=ext_nodes[k]['zh'], pre=gate_pos[k]['pre'], post=gate_pos[k]['post']) for k in ext_ids],
        pop={v: [[r3(pop[v][i][y]) for y in YEARS] for i in ids] for v in VARIANTS},
        mig=[[r3(netmig[i].get(y, 0)) for y in YEARS[:-1]] for i in ids],
        flows={str(y): f for y, f in out_flows.items()},
        external={str(y): e for y, e in external.items()},
        backtest=dict(US=dict(phi=us_phi, rows=bt_rows(us_bt)), CN=dict(phi=cn_phi, rows=bt_rows(cn_bt)),
                      holdout=hold, holdoutConst=hold_const),
    )
    js = 'const DATA = ' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';\n'
    with open(os.path.join(ROOT, 'src', 'data.js'), 'w', encoding='utf-8') as f:
        f.write('// Generated by pipeline/build_data.py. Populations and flows in thousands of people.\n' + js)
    wl('data.js', len(js) // 1024, 'KB')
    # quick report
    for b in ('US', 'CN'):
        bt = data['backtest'][b]
        wl(b, 'phi', bt['phi'])
        for r in bt['rows']:
            wl(' ', r['set'], r['base'], r['anchor'], '->', r['target'],
               ' '.join(f"{k}:{v['mape']}" for k, v in r['by'].items()))
    for y in (1850, 1900, 1950, 2000, 2050, 2100):
        i = YEARS.index(y)
        for bloc in ('CN', 'US', 'EU'):
            s = sum(pop['Medium'][u['id']][y] for u in units if u['bloc'] == bloc)
            wl(y, bloc, round(s / 1000, 1), 'M')


if __name__ == '__main__':
    main()
