# -*- coding: utf-8 -*-
"""他者之眼 · Through Foreign Eyes — 脚本数据。

规则：只采用非中华文化圈（不含中国、日本、朝鲜半岛、越南）的原始记录。
quote 字段：有把握的用原文；否则用标注译者的英译；仅转述的标注「大意」。
运行：python3 script.py  ->  build/script.json
"""
import json, os

# 地点：[经度, 纬度, 外文标签, 中文标签]
P = {
    'ROMA': [12.5, 41.9, 'ROMA', '罗马'],
    'ALEXANDRIA': [29.9, 31.2, 'ALEXANDRIA', '亚历山大'],
    'CONSTANTINOPLE': [28.98, 41.01, 'CONSTANTINOPOLIS', '君士坦丁堡'],
    'BACTRA': [66.9, 36.76, 'BACTRA', '巴克特拉'],
    'BARYGAZA': [72.98, 21.7, 'BARYGAZA', '巴里加扎'],
    'STONE': [75.23, 37.77, 'LITHINOS PYRGOS', '石塔 ?'],
    'SERA': [112.45, 34.62, 'SERA METROPOLIS ?', '赛拉'],
    'THINAE': [108.9, 34.3, 'THINAE ?', '秦奈'],
    'SERICA': [106, 36, 'SERES', '赛里斯'],
    'ARABIA': [44.2, 15.4, 'ARABIA FELIX', '阿拉伯半岛'],
    'SARAGH': [112.45, 34.62, 'SARAGH', '洛阳'],
    'NGAPA': [114.6, 36.3, 'NGAPA', '邺城'],
    'DUNHUANG': [94.66, 40.14, 'T.XII.a', '敦煌以西烽燧'],
    'SAMARKAND': [66.96, 39.65, 'SAMARKAND', '撒马尔罕'],
    'SERINDA': [79.9, 37.1, 'SERINDA ?', '赛林达'],
    'TZINISTA': [114, 28, 'TZINISTA', '秦尼斯达'],
    'TAUGAST': [111, 37.5, 'TAUGAST', '陶加斯'],
    'BLACK': [116.5, 35.6, 'MELANES', '黑衣者'],
    'RED': [117.5, 29.0, 'ERYTHROI', '红衣者'],
    'TALAS': [71.37, 42.9, 'TALAS', '怛罗斯'],
    'BAGHDAD': [44.4, 33.3, 'BAGHDAD', '巴格达'],
    'CAIRO': [31.24, 30.04, 'AL-QAHIRA', '开罗'],
    'SIRAF': [52.3, 27.67, 'SIRAF', '尸罗夫'],
    'KHANFU': [113.26, 23.13, 'KHANFU', '广府（广州）'],
    'KARAKORUM': [102.8, 47.2, 'CARACARON', '哈拉和林'],
    'VENEZIA': [12.33, 45.44, 'VENEZIA', '威尼斯'],
    'GENOVA': [8.93, 44.4, 'GENOVA', '热那亚'],
    'KHANBALIQ': [116.4, 39.9, 'CAMBALUC', '汗八里（北京）'],
    'QUINSAI': [120.17, 30.25, 'QUINSAI', '行在（杭州）'],
    'ZAYTUN': [118.6, 24.9, 'ZAYTUN', '刺桐（泉州）'],
    'TANJA': [-5.8, 35.77, 'TANJA', '丹吉尔'],
    'HERAT': [62.2, 34.35, 'HERAT', '赫拉特'],
    'PEKING': [116.4, 39.9, 'KHANBALIQ', '北京'],
    'ADEN': [45.03, 12.8, 'ADEN', '亚丁'],
    'JEDDAH': [39.2, 21.5, 'JIDDA', '吉达'],
    'CALICUT': [75.78, 11.25, 'CALICUT', '古里'],
    'MACAU': [113.55, 22.2, 'MACAU', '澳门'],
    'LISBOA': [-9.14, 38.72, 'LISBOA', '里斯本'],
    'AGRA': [78.0, 27.18, 'AGRA', '阿格拉'],
    'KASHGAR': [75.99, 39.47, 'CASCAR', '喀什噶尔'],
    'SUCHEU': [98.49, 39.73, 'SOCIEU', '肃州'],
    'HANGZHOU': [120.17, 30.25, 'HANGCHEU', '杭州'],
    'ANTWERPEN': [4.4, 51.22, 'ANTVERPIA', '安特卫普'],
    'HANNOVER': [9.73, 52.37, 'HANNOVER', '汉诺威'],
    'GENEVE': [6.14, 46.2, 'GENÈVE', '日内瓦'],
    'PARIS': [2.35, 48.86, 'PARIS', '巴黎'],
    'LONDON': [-0.13, 51.5, 'LONDON', '伦敦'],
    'JEHOL': [117.94, 40.97, 'JEHOL', '热河'],
    'CANTON': [113.26, 23.13, 'CANTON', '广州'],
    'CALCUTTA': [88.36, 22.57, 'CALCUTTA', '加尔各答'],
    'BOMBAY': [72.88, 19.08, 'BOMBAY', '孟买'],
    'GUERNSEY': [-2.54, 49.45, 'GUERNSEY', '根西岛'],
    'YUANMINGYUAN': [116.3, 40.0, 'YUANMINGYUAN', '圆明园'],
    'YANGSHAO': [111.8, 34.8, 'YANGSHAO', '仰韶村'],
    'YANAN': [109.5, 36.6, "YAN'AN", '延安'],
    'BEIJING': [116.4, 39.9, 'BEIJING', '北京'],
}

# 路线（经纬度航点）
R = {
    'silk_land': [[12.5, 41.9], [36.2, 36.2], [44.4, 33.3], [59.6, 36.3], [66.9, 36.76], [75.23, 37.77], [76, 39.5], [87.6, 41.8], [94.66, 40.14], [103.8, 36.1], [112.45, 34.62]],
    'rome_india': [[12.5, 41.9], [29.9, 31.2], [32.6, 25.0], [35.5, 23.9], [43.2, 12.6], [55, 14], [72.98, 21.7]],
    'rome_arabia': [[12.5, 41.9], [29.9, 31.2], [35.0, 28.0], [39.5, 21.0], [44.2, 15.4]],
    'periplus': [[108.9, 34.3], [103.8, 36.1], [94.66, 40.14], [87.6, 41.8], [76, 39.5], [66.9, 36.76], [69.2, 34.5], [71.5, 30.0], [72.98, 21.7]],
    'ptolemy': [[66.9, 36.76], [75.23, 37.77], [76, 39.5], [87.6, 41.8], [94.66, 40.14], [103.8, 36.1], [112.45, 34.62]],
    'sogdian': [[94.66, 40.14], [87.6, 41.8], [76, 39.5], [71.4, 40.3], [66.96, 39.65]],
    'serinda': [[79.9, 37.1], [75.99, 39.47], [66.96, 39.65], [59.6, 41.5], [51.5, 44.5], [42, 43], [36, 41.5], [28.98, 41.01]],
    'cosmas': [[29.9, 31.2], [32.6, 25.0], [35.5, 23.9], [43.2, 12.6], [55, 12], [72, 9], [80.0, 6.0], [92, 7], [98.5, 5.5], [104, 1.3], [107, 9], [110, 17], [114, 22.5]],
    'theophylact': [[28.98, 41.01], [36, 41.5], [42, 43], [51.5, 44.5], [59.6, 44.0], [71.37, 42.9], [87.6, 43.8], [100, 41.5], [111, 37.5]],
    'paper': [[71.37, 42.9], [66.96, 39.65], [59.6, 36.3], [51.4, 35.7], [44.4, 33.3], [36.3, 33.5], [31.24, 30.04]],
    'sea_arab': [[52.3, 27.67], [56.5, 25.5], [60, 22], [70, 16], [76.2, 9.0], [80.0, 6.0], [92, 7], [98.5, 5.5], [104, 1.3], [107, 9], [110, 17], [113.26, 23.13]],
    'rubruck': [[28.98, 41.01], [34, 45], [39.7, 47.2], [46, 48], [52, 47.5], [62, 46], [71, 44.5], [80, 45.5], [90, 47], [102.8, 47.2]],
    'polo': [[12.33, 45.44], [28.98, 41.01], [38.5, 39.5], [46.3, 38.1], [56, 27.2], [57.1, 30.3], [62.2, 34.35], [66.9, 36.76], [75.99, 39.47], [79.9, 37.1], [94.66, 40.14], [103.8, 36.1], [111, 40.5], [116.4, 39.9], [117.2, 34.0], [120.17, 30.25]],
    'battuta': [[-5.8, 35.77], [10, 36.8], [31.24, 30.04], [39.8, 21.4], [44.4, 33.3], [57, 28], [67, 34.5], [77.2, 28.6], [75.78, 11.25], [73.5, 4.2], [80.0, 6.0], [92, 7], [98.5, 5.5], [104, 1.3], [107, 9], [110, 17], [118.6, 24.9]],
    'naqqash': [[62.2, 34.35], [66.9, 36.76], [66.96, 39.65], [71.4, 40.3], [76, 39.5], [79.9, 37.1], [87.6, 41.8], [94.66, 40.14], [98.49, 39.73], [103.8, 36.1], [112, 38], [116.4, 39.9]],
    'zhenghe': [[118.8, 32.06], [121.5, 28.5], [119.3, 26.0], [114, 21.5], [110, 17], [107, 9], [104, 1.3], [98.5, 5.5], [92, 7], [80.0, 6.0], [75.78, 11.25], [62, 14], [45.03, 12.8], [43.2, 13.6], [39.2, 21.5]],
    'cape': [[-9.14, 38.72], [-17.5, 14.7], [-12, 0], [10, -20], [18.5, -35.5], [35, -30], [41, -13], [52, 2], [73.8, 15.5], [80.0, 6.0], [92, 7], [98.5, 5.5], [104, 1.3], [107, 9], [113.55, 22.2]],
    'ricci': [[113.55, 22.2], [113.26, 23.13], [114.3, 25.5], [115.9, 28.7], [118.8, 32.06], [117.2, 39.1], [116.4, 39.9]],
    'gois': [[78.0, 27.18], [74.3, 31.5], [69.2, 34.5], [70.0, 37.0], [72.5, 37.3], [75.99, 39.47], [80.3, 41.2], [86.1, 41.8], [93.5, 42.8], [98.49, 39.73]],
    'jesuit_letters': [[116.4, 39.9], [113.55, 22.2], [104, 1.3], [80.0, 6.0], [73.8, 15.5], [52, 2], [41, -13], [35, -30], [18.5, -35.5], [10, -20], [-12, 0], [-17.5, 14.7], [-9.14, 38.72], [2.35, 48.86], [9.73, 52.37]],
    'macartney': [[-0.13, 51.5], [-6, 48.5], [-17.5, 14.7], [-30, -10], [-10, -32], [18.5, -36.5], [60, -30], [96, -8], [105.5, -6.0], [107.5, 2], [110, 12], [119, 22.5], [123, 31], [122, 37.5], [117.7, 39.0], [117.94, 40.97]],
    'opium': [[88.36, 22.57], [90, 18], [92, 10], [95.5, 6.5], [98.5, 5.5], [104, 1.3], [107, 9], [110, 17], [113.26, 23.13]],
    'hugo': [[-2.54, 49.45], [116.3, 40.0]],
}

C = lambda *ks: [P[k] for k in ks]

# 场景。lines: [显示字幕]；tts 为可选的朗读文本覆盖。
SCENES = [
 dict(id='title', type='title', lines=[
   '这是一部只用外人的记录写成的中国史。',
   '规则只有一条：不采用中国、日本、朝鲜半岛和越南的任何文献，只采信希腊、罗马、拜占庭、印度、粟特、阿拉伯、波斯，以及近代欧洲留下的原始记录。'],
   pre=3.0),
 dict(id='thesis', type='thesis', lines=[
   '先说结论。两千多年来，外部世界对中国的记录，经历了三个阶段。',
   '第一阶段是传说：罗马人只见丝绸，不见中国人。',
   '第二阶段是惊叹：从阿拉伯商人、马可·波罗，到莱布尼茨，中国被视为财富与秩序的标杆。',
   '第三阶段是审判与重估：从亚当·斯密笔下的“停滞”，到炮舰与鸦片，再到二十世纪末的重新崛起。']),
 dict(id='silence', type='silence', pins=C('YANGSHAO'), pin_at=3, lines=[
   '但有一个事实必须先承认：外国文献开始得很晚。',
   '可能提及中国的最早外国文献，不早于公元前四世纪，而且年代仍有争议；确凿可靠的记载，要到公元前一世纪才出现。',
   '这意味着，商、周与孔子的时代，在外人的史料中是一片空白。',
   '西方第一次“看见”中国的史前，要等到1921年：瑞典地质学家安特生在河南仰韶村发掘出彩陶，证明这里早在新石器时代就存在成熟的农业社会。'],
   card=dict(kicker='SVENSKA · 1921', title='安特生《中华远古之文化》', sub='J. G. Andersson, An Early Chinese Culture (1923)',
             zh='仰韶村出土的彩陶，让西方学界第一次以考古证据认识中国的新石器时代。', ref='Bulletin of the Geological Survey of China, No. 5')),
 dict(id='names', type='names', lines=[
   '就连“China”这个名字本身，也是一条外国记录。',
   '它可以追溯到梵语里的“支那”，经波斯语传入欧洲；许多学者认为，它可能源自秦朝的“秦”。',
   '希腊人称之为“赛里斯”，意为丝之民；拜占庭人称之为“秦尼斯达”和“陶加斯”；中世纪的欧洲人则称之为“契丹”。',
   '每一个名字，都记录着一个时代、一条道路，和一种误解。'],
   tts={1: '就连China这个名字本身，也是一条外国记录。'}),

 dict(id='ch1', type='chapter', num='I', title='丝国传说', latin='SERES · THE SILK PEOPLE', years='公元前1世纪 — 公元4世纪', lines=['第一章，丝国传说。']),
 dict(id='virgil', type='source', pins=C('ROMA', 'SERICA'), routes=['silk_land'], lines=[
   '公元前29年前后，罗马诗人维吉尔在《农事诗》中写道：赛里斯人从树叶上梳下纤细的羊毛。',
   '罗马人穿上了丝绸，却以为它长在树上。'],
   card=dict(kicker='LATINA · C. 29 BC', title='维吉尔《农事诗》', sub='P. Vergilius Maro, Georgica II.121',
             orig='velleraque ut foliis depectant tenuia Seres', zh='赛里斯人如何从树叶上梳下纤细的羊毛', ref='GEORGICA · LIBER II · 121')),
 dict(id='pliny', type='source', pins=C('ROMA', 'ARABIA', 'BARYGAZA', 'SERICA'), routes=['silk_land', 'rome_india', 'rome_arabia'], lines=[
   '约公元77年，老普林尼在《自然史》中算了一笔账：',
   '印度、赛里斯与阿拉伯半岛，每年从罗马帝国拿走至少一亿塞斯特斯。“这就是奢侈品和女人让我们付出的代价。”'],
   card=dict(kicker='LATINA · C. AD 77', title='老普林尼《自然史》', sub='C. Plinius Secundus, Naturalis Historia XII.84',
             orig='minimaque computatione miliens centena milia sestertium annis omnibus India et Seres et paeninsula illa imperio nostro adimunt: tanti nobis deliciae et feminae constant.',
             zh='最保守地估算，印度、赛里斯与那个半岛每年从我们的帝国拿走一亿塞斯特斯：这就是奢侈品和女人让我们付出的代价。', ref='NAT. HIST. XII.84',
             stat=dict(n='100,000,000', unit='HS / 年', cap='罗马每年流向东方的白银（普林尼的估算）'), stat_at=1)),
 dict(id='periplus', type='source', pins=C('THINAE', 'BACTRA', 'BARYGAZA'), routes=['periplus'], lines=[
   '公元一世纪，一位佚名希腊商人在《厄立特里亚海航行记》中写道：',
   '在世界的尽头，有一座名为“秦奈”的内陆大城，生丝与丝绸从那里经巴克特里亚，运往印度的巴里加扎港。',
   '他补充说：去那里并不容易，从那里来的人也很少。'],
   card=dict(kicker='ΕΛΛΗΝΙΚΑ · 1ST C. AD', title='《厄立特里亚海航行记》', sub='Periplus Maris Erythraei §64',
             orig='“…a very great inland city called Thinae, from which raw silk and silk yarn and silk cloth are brought on foot through Bactria to Barygaza… But the land of This is not easy of access; few men come from there, and seldom.”',
             orig_note='英译 · W. H. Schoff, 1912', zh='有一座名为秦奈的内陆大城，生丝、丝线与丝绸经巴克特里亚运往巴里加扎……去那里并不容易，从那里来的人很少。', ref='PERIPLUS · §64')),
 dict(id='ptolemy', type='source', pins=C('BACTRA', 'STONE', 'SERA'), routes=['ptolemy'], graticule=True, lines=[
   '公元二世纪，托勒密在《地理学》中，把丝国画进了经纬网格。',
   '他转引了一份商路记录：马其顿商人梅斯·提提亚努斯派出代理人，经过一座“石塔”，前往丝国都城“赛拉”。'],
   card=dict(kicker='ΕΛΛΗΝΙΚΑ · C. AD 150', title='托勒密《地理学》', sub='Klaudios Ptolemaios, Geographike Hyphegesis I.11',
             orig='Σῆρα μητρόπολις  ·  Λίθινος Πύργος', zh='丝国都城“赛拉” · 石塔', ref='GEOGRAPHIA · I.11–12 · VI.16')),
 dict(id='excluded', type='excluded', pins=C('ROMA', 'SARAGH'), lines=[
   '你也许听说过，公元166年，罗马使者抵达了东汉王朝。',
   '但这条著名的记载只见于中国史书，罗马方面没有任何对应记录。按照本片的规则，它被排除。']),
 dict(id='ammianus', type='source', pins=C('ROMA', 'SERICA'), lines=[
   '四世纪末，罗马史家阿米阿努斯·马塞利努斯写道：赛里斯人生活安宁，从不知兵器与战争。',
   '事实恰恰相反。而证据，同样来自一位外国人。'],
   card=dict(kicker='LATINA · C. AD 390', title='阿米阿努斯《罗马史》', sub='Ammianus Marcellinus, Res Gestae XXIII.6.67',
             orig='Agitant autem quietius Seres, armorum semper et proeliorum ignari…', zh='赛里斯人生活安宁，从不知兵器与战争……', ref='RES GESTAE · XXIII.6.67')),

 dict(id='ch2', type='chapter', num='II', title='崩塌与重生', latin='FALL AND REUNION', years='公元4世纪 — 7世纪', lines=['第二章，崩塌与重生。']),
 dict(id='sogdian', type='source', pins=C('DUNHUANG', 'SARAGH', 'NGAPA', 'SAMARKAND'), routes=['sogdian'], fire=['SARAGH', 'NGAPA'], lines=[
   '1907年，英国探险家斯坦因在敦煌以西的一座烽燧遗址中，发现了一包从未寄出的粟特文书信。',
   '其中一封写于公元313年前后。一位粟特商人向撒马尔罕的同伴报告：',
   '皇帝因饥荒逃离了洛阳，宫殿和城池被付之一炬。洛阳已不复存在，邺城也不复存在！',
   '这是用非汉语记录中原王朝崩溃的最早文献之一。值得注意的是，这些信，是写在纸上的。'],
   card=dict(kicker='SOGDIAN · C. AD 313', title='粟特文古信札 · 第二号', sub='Sogdian Ancient Letter II · British Library Or.8212/98',
             orig='“…the last emperor, so they say, fled from Saragh because of the famine, and his palace and walled city were set on fire… So Saragh is no more, Ngapa is no more!”',
             orig_note='英译 · N. Sims-Williams', zh='皇帝因饥荒逃离洛阳，宫殿与城池被焚……洛阳已不复存在，邺城也不复存在！', ref='ANCIENT LETTER II · PAPER', reveal=2)),
 dict(id='procopius', type='source', pins=C('SERINDA', 'CONSTANTINOPLE'), routes=['serinda'], lines=[
   '六世纪中叶，拜占庭史家普罗柯比记载：几位僧侣向查士丁尼皇帝承诺，可以把蚕种带回罗马，让帝国不必再从波斯人手中购买丝绸。',
   '他们做到了。丝绸的秘密，从此在欧洲落地。'],
   card=dict(kicker='ΕΛΛΗΝΙΚΑ · C. AD 552', title='普罗柯比《战争史》', sub='Prokopios, Hyper ton Polemon VIII.17',
             zh='大意：几位僧侣曾在“赛林达”久居，向查士丁尼承诺带回蚕卵，使罗马人不再向波斯人购买丝绸。', ref='DE BELLIS · VIII.17 · 大意')),
 dict(id='cosmas', type='source', pins=C('ALEXANDRIA', 'TZINISTA'), routes=['cosmas'], lines=[
   '同一时代，曾经航海经商的修士科斯马斯写道：秦尼斯达，是丝绸之国，位于最遥远的东方；越过它，既无航路，也无人烟。'],
   card=dict(kicker='ΕΛΛΗΝΙΚΑ · C. AD 550', title='科斯马斯《基督教地形学》', sub='Kosmas Indikopleustes, Christian Topography II',
             orig='“…the country of silk… is the remotest of all the Indies… beyond Tzinista there is neither navigation nor inhabited country.”',
             orig_note='英译大意 · J. W. McCrindle, 1897', zh='丝绸之国位于诸印度的最远端……越过秦尼斯达，既无航路，也无人烟。', ref='TOPOGRAPHIA CHRISTIANA · II')),
 dict(id='theophylact', type='source', pins=C('CONSTANTINOPLE', 'TAUGAST', 'BLACK', 'RED'), routes=['theophylact'], river='Yangtze', focus=['TAUGAST', 'BLACK', 'RED'], lines=[
   '七世纪初，拜占庭史家席摩卡塔记下了一个名叫“陶加斯”的东方大国。',
   '它的君主被称为“天子”。一条大河将国土分为两半，两岸曾是交战的两国，一方身穿黑衣，一方身穿红衣。',
   '后来，黑衣者渡过大河，统一了全境。',
   '学者普遍认为，这记录的正是589年隋灭陈、南北重归一统。'],
   card=dict(kicker='ΕΛΛΗΝΙΚΑ · C. AD 630', title='席摩卡塔《历史》', sub='Theophylaktos Simokattes, Historiae VII.9',
             orig='Taugast · Taisan = “Son of God”', zh='大意：大河分国为二，黑衣之国渡河击败红衣之国，遂统一全境。', ref='HISTORIAE · VII.7–9 · 大意', reveal=1)),

 dict(id='ch3', type='chapter', num='III', title='海上的商人', latin='MERCHANTS OF THE SEA', years='8世纪 — 10世纪', lines=['第三章，海上的商人。']),
 dict(id='talas', type='source', pins=C('TALAS', 'SAMARKAND', 'BAGHDAD', 'CAIRO'), routes=['paper'], lines=[
   '751年，阿拔斯王朝军队与唐军在怛罗斯交战。',
   '十一世纪的作家萨阿利比记载：撒马尔罕的纸，是由这一战中被俘的中国人传入的。',
   '不过，正如那批粟特书信所证明的，纸张西传其实早得多。传说未必准确，但方向确凿无疑。'],
   card=dict(kicker='العربية · 11TH C.', title='萨阿利比《珍闻录》', sub="al-Tha'alibi, Lata'if al-Ma'arif",
             orig='“…paper was introduced from China into Samarqand by prisoners of war.”', orig_note='英译大意 · C. E. Bosworth, 1968',
             zh='撒马尔罕的纸，由战俘自中国传入。', ref="LATA'IF AL-MA'ARIF")),
 dict(id='akhbar', type='source', pins=C('SIRAF', 'KHANFU'), routes=['sea_arab'], lines=[
   '851年，一部阿拉伯文的《中国印度见闻录》描述了广州。阿拉伯人称之为“广府”。',
   '作者惊叹于一种器物：他们用一种精细的陶土制碗，薄如玻璃，隔着碗壁，能看见里面的水光。',
   '他还记录了一种用热水冲泡的草叶，君主对它和盐一样课税。那就是茶。'],
   card=dict(kicker='العربية · AD 851', title='《中国印度见闻录》', sub="Akhbar al-Sin wa'l-Hind",
             orig='“They have an excellent clay from which they make cups as fine as glass; the sparkle of water can be seen through them.”',
             orig_note='英译大意', zh='他们有一种上好的陶土，制成的碗薄如玻璃，隔着碗能看见水光。', ref="AKHBAR AL-SIN WA'L-HIND")),
 dict(id='abuzayd', type='source', pins=C('SIRAF', 'KHANFU'), routes=['sea_arab'], fire=['KHANFU'], lines=[
   '然而繁荣并不长久。十世纪初，阿拉伯作家阿布·扎伊德续写了一段可怕的记录：',
   '一个名叫“班舒”的叛军首领攻陷广府，据称屠杀了十二万名穆斯林、犹太人、基督徒和祆教徒。',
   '此后，中国陷入混乱，海上贸易几近断绝。在阿拉伯人的记录里，唐朝的崩溃，首先是一场贸易灾难。'],
   card=dict(kicker='العربية · C. AD 916', title='阿布·扎伊德《见闻录》续篇', sub='Abu Zayd al-Sirafi',
             zh='黄巢（班舒）攻陷广府，据称死者包括穆斯林、犹太人、基督徒与祆教徒。', ref='ACCOUNTS OF CHINA AND INDIA · BOOK II',
             stat=dict(n='120,000', unit='人', cap='据称遇难的外国商人（阿布·扎伊德所记）'), stat_at=1)),

 dict(id='ch4', type='chapter', num='IV', title='契丹', latin='CATHAY', years='13世纪 — 14世纪', lines=['第四章，契丹。']),
 dict(id='rubruck', type='source', pins=C('CONSTANTINOPLE', 'KARAKORUM'), routes=['rubruck'], lines=[
   '1254年，方济各会修士鲁布鲁克抵达蒙古都城哈拉和林。',
   '他是最早描述汉字的欧洲人之一：他们用画家用的那种刷子写字，一个字符就能表示一个完整的词。',
   '他还提出一个推测：所谓“大契丹”，就是古人所说的赛里斯。'],
   card=dict(kicker='LATINA · AD 1254', title='鲁布鲁克《东行纪》', sub='Willelmus de Rubruquis, Itinerarium',
             orig='“They write with a brush such as painters paint with, and they make in one figure the several letters containing a whole word.”',
             orig_note='英译 · W. W. Rockhill, 1900', zh='他们用画家用的刷子写字，一个字符包含构成整个词的若干字母。', ref='ITINERARIUM · XXIX')),
 dict(id='polo', type='source', pins=C('GENOVA', 'KHANBALIQ', 'QUINSAI'), routes=['polo'], lines=[
   '1298年前后，马可·波罗在热那亚的监狱里口述了他的东方见闻。',
   '最令他惊叹的是纸币：大汗用桑树皮制纸，当作金银使用。“你可以说，他完全掌握了炼金术的秘密。”',
   '他称杭州为“世界上最美丽、最华贵的城市”。',
   '马可·波罗是否真到过中国，西方学界争论至今；2013年，德国学者福格尔通过比对书中有关货币与盐业的细节，认为他确实去过。'],
   card=dict(kicker='FRANCO-ITALIANO · C. 1298', title='马可·波罗《寰宇记》', sub='Marco Polo, Le Divisament dou Monde',
             orig='“…you might say he hath the Secret of Alchemy in perfection, and you would be right.”', orig_note='英译 · H. Yule, 1871',
             zh='你可以说，他完全掌握了炼金术的秘密——而且你说得没错。', ref='II.24 · II.76', reveal=1)),
 dict(id='battuta', type='source', pins=C('TANJA', 'ZAYTUN'), routes=['battuta'], lines=[
   '1345年前后，摩洛哥旅行家伊本·白图泰在泉州登岸。',
   '他写道：对旅行者而言，中国是世界上最安全、最有秩序的国家；中国人，是世界上手艺最精巧的民族。'],
   card=dict(kicker='العربية · C. 1345', title='伊本·白图泰《游记》', sub='Ibn Battuta, al-Rihla',
             orig='“China is the safest and best country for the traveller.” · “The Chinese are of all peoples the most skilful in the arts.”',
             orig_note='英译 · H. A. R. Gibb', zh='对旅行者而言，中国是最安全、最好的国家。中国人是各民族中技艺最精巧的。', ref='RIHLA')),

 dict(id='ch5', type='chapter', num='V', title='城墙之内', latin='WITHIN THE WALLS', years='15世纪 — 17世纪', lines=['第五章，城墙之内。']),
 dict(id='naqqash', type='source', pins=C('HERAT', 'PEKING'), routes=['naqqash'], lines=[
   '1420年，帖木儿帝国的使团抵达北京，紫禁城刚刚落成。',
   '随行画师盖耶速丁详细记录了宫殿的规模、宴会的礼仪与皇帝的赏赐。这是伊斯兰世界对明代宫廷最重要的目击记录之一。'],
   card=dict(kicker='فارسی · AD 1420', title='盖耶速丁《沙哈鲁遣使中国记》', sub='Ghiyath al-Din Naqqash · in Hafiz-i Abru, Zubdat al-Tawarikh',
             zh='大意：使团于1420年12月抵达北京，记述宫城、朝会、宴饮与赏赐。', ref='ZUBDAT AL-TAWARIKH · 大意')),
 dict(id='taghri', type='source', pins=C('ADEN', 'JEDDAH', 'CAIRO'), routes=['zhenghe'], lines=[
   '埃及史家伊本·塔格里比尔迪记载：1432年，几艘中国大船驶抵印度诸港，其中两艘停靠亚丁，随后获准驶入麦加的港口吉达。',
   '学界通常认为，这与郑和第七次远航有关。'],
   card=dict(kicker='العربية · AH 835 / AD 1432', title='伊本·塔格里比尔迪《埃及与开罗诸王中的耀星》', sub='Ibn Taghribirdi, al-Nujum al-Zahira',
             zh='大意：中国的若干艘戎克船抵达印度诸港，其中两艘泊于亚丁，后经苏丹巴尔斯拜准许驶入吉达。', ref='AL-NUJUM AL-ZAHIRA · 大意')),
 dict(id='mendoza', type='source', pins=C('ROMA', 'MACAU'), routes=['cape'], lines=[
   '1585年，西班牙修士门多萨出版《中华大帝国史》，十几年间以七种语言印行数十版，成为欧洲第一部关于中国的畅销书。'],
   card=dict(kicker='ESPAÑOL · ROMA 1585', title='门多萨《中华大帝国史》', sub='Juan González de Mendoza',
             orig='Historia de las cosas más notables, ritos y costumbres del gran reyno de la China', zh='《中华大帝国最著名之事、礼仪与风俗史》', ref='ROMA · 1585')),
 dict(id='ricci', type='source', pins=C('MACAU', 'PEKING'), routes=['ricci'], lines=[
   '1601年，意大利耶稣会士利玛窦获准进入北京。',
   '他告诉欧洲：整个国家由“学者阶层”治理，官职通过考试获得。'],
   card=dict(kicker='LATINA · 1615', title='利玛窦、金尼阁《基督教远征中国史》', sub='M. Ricci & N. Trigault, De Christiana expeditione apud Sinas',
             orig='“…the entire kingdom is administered by the Order of the Learned, commonly known as the Philosophers.”', orig_note='英译 · L. J. Gallagher, 1953',
             zh='整个王国由“学者阶层”——通常称为哲学家——治理。', ref='DE CHRISTIANA EXPEDITIONE · I.6')),
 dict(id='gois', type='source', pins=C('AGRA', 'SUCHEU'), routes=['gois'], lines=[
   '1605年，葡萄牙修士鄂本笃从印度出发，穿越中亚抵达肃州，终于证实：马可·波罗的契丹，就是中国。',
   '后人为他写下墓志：寻找契丹，却找到了天堂。'],
   card=dict(kicker='LATINA · 1605–1607', title='鄂本笃之旅', sub='Bento de Góis · in Trigault (1615)',
             orig='Quaerens Cathaium invenit caelum', zh='寻找契丹，却找到了天堂', ref='DE CHRISTIANA EXPEDITIONE · V.13', reveal=1)),
 dict(id='martini', type='source', pins=C('HANGZHOU', 'ANTWERPEN'), lines=[
   '1644年，明朝灭亡。亲历战乱的意大利传教士卫匡国，于1654年出版《鞑靼战纪》，欧洲第一次读到这场王朝更替的亲历者记述。',
   '四年后，他的《中国上古史》引发了一场神学争论：按中国纪年，伏羲的时代早于《圣经》所载的大洪水。'],
   card=dict(kicker='LATINA · 1654 / 1658', title='卫匡国《鞑靼战纪》《中国上古史》', sub='Martino Martini, De Bello Tartarico Historia · Sinicae Historiae Decas Prima',
             orig='De Bello Tartarico Historia  ·  Sinicae Historiae Decas Prima', zh='一部写王朝之亡，一部动摇了欧洲的圣经纪年', ref='ANTVERPIAE 1654 · MONACHII 1658')),

 dict(id='ch6', type='chapter', num='VI', title='启蒙之镜', latin='MIRROR OF THE ENLIGHTENMENT', years='17世纪末 — 18世纪', lines=['第六章，启蒙之镜。']),
 dict(id='leibniz', type='source', pins=C('HANNOVER', 'PEKING'), routes=['jesuit_letters'], lines=[
   '1697年，莱布尼茨写道：我几乎认为有必要请中国派传教士来，教我们自然神学的目的与实践。'],
   card=dict(kicker='LATINA · 1697', title='莱布尼茨《中国近事》', sub='G. W. Leibniz, Novissima Sinica · Praefatio',
             orig='…ut propemodum necessarium videatur missionarios Sinensium ad nos mitti, qui finem usumque theologiae naturalis nos doceant.',
             zh='……几乎有必要请中国派传教士来，教我们自然神学的目的与运用。', ref='NOVISSIMA SINICA · PRAEFATIO')),
 dict(id='voltaire', type='source', pins=C('GENEVE', 'PARIS'), lines=[
   '1756年，伏尔泰的《风俗论》把世界史的第一章献给了中国；1767年，魁奈把中国视为依自然法治理的典范。'],
   card=dict(kicker='FRANÇAIS · 1756 / 1767', title='伏尔泰《风俗论》 · 魁奈《中国专制制度》', sub="Voltaire, Essai sur les mœurs · F. Quesnay, Le Despotisme de la Chine",
             orig='Essai sur les mœurs et l’esprit des nations — Chapitre premier : De la Chine', zh='《风俗论》第一章：论中国', ref='GENÈVE 1756 · PARIS 1767')),
 dict(id='smith', type='source', pins=C('LONDON',), lines=[
   '然而，1776年，亚当·斯密在《国富论》中写下了另一种判断：',
   '中国长期以来是世界上最富裕的国家之一……然而，它似乎早已陷入停滞。'],
   card=dict(kicker='ENGLISH · 1776', title='亚当·斯密《国富论》', sub='Adam Smith, The Wealth of Nations I.8',
             orig='“China has been long one of the richest… countries in the world. It seems, however, to have been long stationary.”',
             zh='中国长期以来是世界上最富裕的国家之一……然而，它似乎早已停滞。', ref='WEALTH OF NATIONS · I.VIII', reveal=1)),
 dict(id='macartney', type='source', pins=C('LONDON', 'JEHOL'), routes=['macartney'], lines=[
   '1793年，英国马戛尔尼使团在热河觐见乾隆皇帝，请求扩大通商，无功而返。',
   '马戛尔尼在日记中写道：中华帝国是一艘陈旧而怪诞的一等战舰，一百五十年来，靠着一批能干而警觉的军官，才得以漂浮，并仅凭庞大的体积震慑邻国。',
   '但一旦无能之辈掌舵，它也许不会立刻沉没，却会像残骸一样漂流，最终在岸边撞得粉碎。'],
   card=dict(kicker='ENGLISH · 1794', title='马戛尔尼《出使中国日记》', sub='Lord Macartney, Journal of the Embassy to China',
             orig='“The Empire of China is an old, crazy, first-rate man-of-war… she may drift some time as a wreck, and will then be dashed to pieces on the shore.”',
             zh='中华帝国是一艘陈旧而怪诞的一等战舰……它会像残骸一样漂流，最终在岸边撞得粉碎。', ref='JOURNAL · 1794', reveal=1)),

 dict(id='ch7', type='chapter', num='VII', title='炮舰与审判', latin='GUNBOATS AND JUDGMENT', years='1839 — 1950', lines=['第七章，炮舰与审判。']),
 dict(id='opium', type='source', pins=C('CALCUTTA', 'CANTON'), routes=['opium'], lines=[
   '预言很快开始应验。1839年，英国驻华商务监督义律被迫交出两万零二百八十三箱鸦片，随后被全部销毁。',
   '第二年，英国议会辩论对华战争。'],
   card=dict(kicker='ENGLISH · 1839', title='英国议会文件 · 对华通信', sub='Correspondence Relating to China, House of Commons, 1840',
             zh='商务监督义律下令英商交出鸦片，统一缴付中国当局。', ref='PARLIAMENTARY PAPERS · 1840',
             stat=dict(n='20,283', unit='箱', cap='英商交出并被销毁的鸦片'), stat_at=0)),
 dict(id='gladstone', type='source', pins=C('LONDON',), lines=[
   '三十岁的议员格莱斯顿说：就其起因而言，我从未见过、也从未读到过一场比这更不正义、更足以让这个国家蒙受永久耻辱的战争。',
   '谴责动议最终以二百六十二票对二百七十一票被否决。战争照常进行。'],
   card=dict(kicker='ENGLISH · 8 APRIL 1840', title='格莱斯顿 · 下议院演说', sub='W. E. Gladstone, Hansard, House of Commons',
             orig='“A war more unjust in its origin, a war more calculated in its progress to cover this country with permanent disgrace, I do not know, and I have not read of.”',
             zh='就其起因而言更不正义、就其进程而言更足以使这个国家蒙受永久耻辱的战争，我从未见过，也从未读到过。', ref='HANSARD · VOL. 53',
             stat=dict(n='262 : 271', unit='', cap='谴责动议 赞成 : 反对 —— 被否决'), stat_at=1)),
 dict(id='hugo', type='source', pins=C('GUERNSEY', 'YUANMINGYUAN'), routes=['hugo'], fire=['YUANMINGYUAN'], lines=[
   '1860年，英法联军焚毁圆明园。第二年，雨果在回信中写道：',
   '有一天，两个强盗闯进了圆明园，一个洗劫，一个放火……我们欧洲人是文明人，中国人在我们眼中是野蛮人。这就是文明对野蛮的所作所为。'],
   card=dict(kicker='FRANÇAIS · 25 NOV 1861', title='雨果《致巴特勒上尉的信》', sub='Victor Hugo, Lettre au capitaine Butler',
             orig='« Un jour, deux bandits sont entrés dans le Palais d’été. L’un a pillé, l’autre a incendié… Voilà ce que la civilisation a fait à la barbarie. »',
             zh='有一天，两个强盗闯进了圆明园，一个洗劫，一个放火……这就是文明对野蛮的所作所为。', ref='HAUTEVILLE HOUSE · GUERNESEY')),
 dict(id='maddison', type='chart', lines=[
   '英国经济史学家麦迪森的估算，把这段衰落量化了：',
   '1820年，中国约占世界经济总量的百分之三十二点九；到1950年，只剩百分之四点五，不到原来的七分之一。'],
   chart=dict(title='中国占世界GDP的比重', sub='Angus Maddison, The World Economy: A Millennial Perspective (OECD, 2001) · 1990 国际元 · 估算值',
              data=[[1000, 22.7], [1500, 25.0], [1600, 29.2], [1700, 22.3], [1820, 32.9], [1870, 17.2], [1913, 8.9], [1950, 4.5], [1973, 4.6], [1998, 11.5]],
              upto=1950), speed={1: 1.0}),

 dict(id='ch8', type='chapter', num='VIII', title='重新认识', latin='SEEING AGAIN', years='1937 — 今', lines=['第八章，重新认识。']),
 dict(id='snow', type='source', pins=C('YANAN', 'BEIJING'), lines=[
   '1937年，美国记者斯诺出版《红星照耀中国》；1972年，尼克松访华，称那是“改变世界的一周”。'],
   card=dict(kicker='ENGLISH · 1937 / 1972', title='斯诺《红星照耀中国》 · 尼克松', sub='Edgar Snow, Red Star Over China · Richard Nixon, Shanghai toast',
             orig='“This was the week that changed the world.”', zh='这是改变世界的一周。', ref='LONDON 1937 · SHANGHAI 1972')),
 dict(id='pye', type='source', pins=C('BEIJING',), lines=[
   '1990年，美国政治学家白鲁恂写道：中国是一个伪装成国家的文明。'],
   card=dict(kicker='ENGLISH · 1990', title='白鲁恂《中国：反常的国家，受挫的社会》', sub='Lucian W. Pye, Foreign Affairs 69(4)',
             orig='“China is a civilization pretending to be a state.”', zh='中国是一个伪装成国家的文明。', ref='FOREIGN AFFAIRS · FALL 1990')),
 dict(id='data', type='chart', lines=[
   '数据记录了此后的变化：按麦迪森的估算，1998年，中国占世界经济的比重回升到了百分之十一点五。',
   '世界银行2022年的报告指出，按国际极端贫困线计算，四十年间中国贫困人口减少了近八亿，约占同期全球减贫人数的四分之三。'],
   chart=dict(title='中国占世界GDP的比重', sub='Angus Maddison (OECD, 2001) · 1990 国际元 · 估算值',
              data=[[1000, 22.7], [1500, 25.0], [1600, 29.2], [1700, 22.3], [1820, 32.9], [1870, 17.2], [1913, 8.9], [1950, 4.5], [1973, 4.6], [1998, 11.5]],
              upto=1998, from_upto=1950,
              stat=dict(n='~800,000,000', unit='人', cap='四十年间减少的极端贫困人口（$1.90/日）', src='World Bank & DRC, Four Decades of Poverty Reduction in China, 2022'), stat_at=1)),

 dict(id='epilogue', type='epilogue', lines=[
   '回看这两千多年的外部记录，可以得出三点结论。',
   '第一，外人认识中国，始于物：丝绸、纸、瓷器、茶，与纸币。',
   '第二，外人的判断不断摇摆：罗马人看到奢侈，阿拉伯人看到市场，启蒙哲人看到理性，工业时代的英国看到停滞。每一种形象，都映照出观看者自己的需要。',
   '第三，这些记录有巨大的盲区：它们开始得晚，常有错误，而且直到十六世纪末，欧洲作者几乎都无法直接阅读汉文。',
   '他者之眼，无法替代中国自己的记载；但它让我们看见，世界在每一个时代，是如何看见中国的。']),
 dict(id='method', type='method', lines=[
   '本片排除了一切仅见于中文史料的事件，也排除了没有原始出处的伪托名言，例如流传甚广的拿破仑“睡狮论”。']),
 dict(id='credits', type='credits', lines=[], post=16.0),
]

# 每个场景在顶部时间轴上的年份（负数为公元前）
YEARS = dict(silence=-300, virgil=-29, pliny=77, periplus=60, ptolemy=150, excluded=166, ammianus=390, sogdian=313,
             procopius=552, cosmas=550, theophylact=630, talas=751, akhbar=851, abuzayd=916, rubruck=1254, polo=1298,
             battuta=1345, naqqash=1420, taghri=1432, mendoza=1585, ricci=1601, gois=1605, martini=1654, leibniz=1697,
             voltaire=1756, smith=1776, macartney=1793, opium=1839, gladstone=1840, hugo=1861, maddison=1950, snow=1937,
             pye=1990, data=2022)
for _s in SCENES:
    if _s['id'] in YEARS:
        _s['year'] = YEARS[_s['id']]

# 朗读替换：多音字/外文 -> TTS 友好写法（只影响语音，不影响字幕）
TTS_FIX = [
    ('马可·波罗', '马可波罗'), ('·', ''), ('“', ''), ('”', ''), ('《', ''), ('》', ''), ('……', '，'),
    ('长在树上', '掌在树上'), ('重归一统', '崇归一统'), ('重估', '崇估'), ('大汗', '大韩'), ('十一点五', '实衣点五'),
]

if __name__ == '__main__':
    os.makedirs('build', exist_ok=True)
    out = dict(places=P, routes=R, scenes=SCENES, tts_fix=TTS_FIX)
    json.dump(out, open('build/script.json', 'w'), ensure_ascii=False, indent=1)
    n = sum(len(l) for s in SCENES for l in s['lines'])
    print(f'{len(SCENES)} scenes, {sum(len(s["lines"]) for s in SCENES)} lines, {n} chars, est {n/4.18/60:.1f} min speech')
