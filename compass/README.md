# 成长罗盘 · Compass（K-12 学生能力评估）

给学生和家长看同一份成长档案的网页应用：基本信息、年级学段、各科成绩、综合素质五维蛛网图、身体健康、心理健康。支持 **中国 / 美国 / 英国** 三套学制，每个学生档案选一套，成绩、学期、体测、视力记法都按该学制的标准计算，不做跨体系换算。视觉沿用 health-os / groundbreak 的液态玻璃风格。

## 界面

| 视图 | 内容 |
|---|---|
| 总览 | 档案卡 → 本学期综合分和一句话结论 → 家长预警（仅家长视角）→ 五维蛛网图（本学期 vs 上学期）+ 智能评估（Artifact 版另有 Claude 评语）→ 学业 / 体测 / 睡眠 / 心情四个指标 |
| 学业 | 学期切换；科目表（最近一次、学期均值、等级、班级均分、走势）；单科全部记录和走势图 |
| 综合素质 | 五维图和每一维的数据来源；获奖、志愿时长、艺术活动等事迹；学期评级 |
| 身体 | WHO 2007 生长曲线（BMI / 身高）、体测成绩单、视力走势、近 30 天睡眠和运动 |
| 心理 | 每日心情打卡、5 周心情日历、WHO-5 自测、求助热线；家长视角另有筛查记录和家长备忘 |

## 三个版本

同一套代码构建出三个版本，差别只在数据后端、登录方式和少量开关：

| | Artifact 版 | 海外版 | 国内版 |
|---|---|---|---|
| 地址 | claude.ai Artifact | Firebase Hosting | 腾讯云开发静态托管 |
| 数据 | Artifact 的 db 能力 | Cloud Firestore，`europe-west2`（伦敦） | 云开发数据库，`ap-shanghai` |
| 登录 | claude.ai 账号 | 邮箱和密码，须验证邮箱 | 手机号和短信验证码 |
| 权限 | Artifact 分享级别 + `data/private` 规则 | `web/global/firestore.rules`：只能读写 `owner` 是自己的文档 | `web/cn/db-rules.json`：同左 |
| AI 评语 | 有（`sample` 能力） | 无 | 无 |
| 外部资源 | Google Fonts | Google Fonts | 不加载任何境外资源（自托管 Outfit 字体） |
| 构建产物 | `index.html` | `dist/global/` | `dist/cn/` |

网站版首页有三个入口：先看演示（3 个虚构学生，数据只在本机）、注册、登录。首次使用须逐项勾选三项同意：协议和隐私政策、儿童个人信息规则、健康和心理等敏感信息的单独同意。同意记录存在账号的 `settings` 文档里。「账户」里可以导出全部数据（JSON），或删除账户和全部数据：海外版删除时要再输一次密码，国内版要短信验证码。

## 目录

| 文件 | 内容 |
|---|---|
| `src/refdata.js` | 生成文件：WHO 2007 生长参考 LMS 表、《国家学生体质健康标准（2014 修订）》全部单项评分表 |
| `src/standards.js` | 三套学制（年级、学段、学期、科目、计分方式、热线）、成绩量表、体测计分、生长 z 分、视力换算、心理量表分级 |
| `src/core.js` | 本地模式、通过 `STORE` 接口读写云端数据、派生指标、五维计分、规则评估 |
| `src/store/artifact.js` · `firebase.js` · `cloudbase.js` | 三个数据后端，接口相同（`watchStudents / watchRecords / add / put / del / setPin / deleteStudent / writeExamples`；网站版另有 `exportAll / deleteAll` 和登录接口 `AUTH`） |
| `src/account.js` | 网站版的首页、注册登录、同意、账户（导出、删除） |
| `src/charts.js` | 手写 SVG：蛛网图、折线、柱状、迷你走势、心情表情 |
| `src/views.js` | 顶栏和五个视图 |
| `src/forms.js` | 档案、成绩、体测、身高体重、视力、评级、事迹、WHO-5、筛查、备忘、PIN 表单 |
| `src/boot.js` | 事件、角色切换、Claude 评语、启动 |
| `src/examples.json` | 生成文件：3 个虚构示例学生（全部 `example: true`，可一键清除） |
| `web/global/` | Firebase 配置、`firestore.rules`、SDK 打包入口、`config.example.js` |
| `web/cn/` | 云开发配置、数据库安全规则和写入脚本、SDK 打包入口、自托管字体、`config.example.js` |
| `web/legal/` | 隐私政策等法律文本草稿（国内中文版、海外英文版），上线前须律师审核 |
| `pipeline/fetch.sh` · `build_refdata.py` | 下载官方表格并生成 `refdata.js`（校验每张评分表单调） |
| `pipeline/make_examples.mjs` | 生成示例数据 |
| `test/` | 计分单测、Firestore 安全规则测试、三个版本的端到端测试、云开发 SDK 的测试替身 |
| `index.html` | Artifact 版构建产物 |

## 构建与测试

```bash
npm install
sh pipeline/fetch.sh && python3 pipeline/build_refdata.py   # 仅在更新参考表时需要
node pipeline/make_examples.mjs                             # 仅在修改示例时需要
node build.mjs                                              # 构建三个版本；也可 node build.mjs artifact|global|cn
npm test                                                    # 计分单测 + 安全规则 + 三个版本端到端（需要 Java 21，会启动 Firebase 模拟器）
npm run emulators                                           # 本机跑海外版：模拟器 + http://127.0.0.1:5002
```

`index.html` 不含 `<html>/<head>/<body>`，发布为 claude.ai Artifact 时由平台补齐。发布时声明 `db`（规则见下）、`user`、`sample` 三个能力。网站版的 `config.js` 不提交：本地按 `web/*/config.example.js` 复制一份，线上由部署流程生成。

## 上线

`.github/workflows/compass.yml`：每次改动先跑 `npm test`；推送到 main 后，哪边配好了密钥就部署哪边。

| 一次性准备 | 海外版 | 国内版 |
|---|---|---|
| 账号和环境 | 新建 Firebase 项目；Firestore 选 `europe-west2`（建好后不能改）；Authentication 开启「电子邮件/密码」 | 腾讯云企业实名；开通云开发环境，地域选上海（短信登录只支持上海）；登录方式里开启短信验证码，申请短信签名和模板 |
| GitHub Secrets | `FIREBASE_SERVICE_ACCOUNT`：服务账号的 JSON 密钥（需要 Firebase Hosting Admin 和 Firebase Rules Admin 权限） | `TCB_SECRET_ID`、`TCB_SECRET_KEY`：只授权云开发的子账号密钥 |
| GitHub Variables | `FIREBASE_PROJECT_ID`；`FIREBASE_WEB_CONFIG`：控制台「项目设置 → 你的应用」里的 web 配置 JSON | `TCB_ENV_ID`；`TCB_PUBLISHABLE_KEY`（可选）；`ICP_NUMBER`、`POLICE_NUMBER`（备案号，显示在页脚） |
| 域名 | 在 Hosting 里绑定自有域名 | 域名须用公司主体完成 ICP 备案后才能绑定；上线后 30 日内办理公安联网备案 |
| 部署内容 | 网站 + `firestore.rules` | 网站 + 11 个集合的安全规则（`web/cn/apply-rules.mjs`） |

国内版和海外版的数据完全分开，不互相同步，也不出境。

## 三套学制

| | 中国 | 美国 | 英国 |
|---|---|---|---|
| 年级 | 学前、一至六年级、初一至初三、高一至高三 | Kindergarten、Grade 1–12 | Reception、Year 1–13 |
| 学段 | 小学 / 初中 / 高中 | Elementary / Middle / High | EYFS / KS1–KS4 / Sixth Form |
| 学年起点 | 9 月 | 8 月 | 9 月 |
| 学期 | 上学期（9–1 月）、下学期（2–8 月） | Fall、Spring | Autumn、Spring、Summer |
| 成绩 | 分数 / 满分 → 得分率 | 百分比 → 字母等级 + GPA（K–5 可用 1–4 标准等级）；Honors +0.5、AP +1 计加权 GPA | 百分比；KS2 标准分 80–120；GCSE 9–1；A-level A*–E |
| 体测 | 国标 2014：录原始成绩，自动查表算单项得分、加分、学年总分和等级 | FitnessGram：录成绩和报告上的区间（HFZ / NI） | 无全国统一测试，用 Eurofit 项目，录报告上的百分位 |
| 视力 | 5 分记录 | Snellen 20/x | Snellen 6/x |
| 求助热线 | 12356 | 988 | Childline 0800 1111、Samaritans 116 123 |

年级由「入学年份」推算，每年自动升级。

## 评估规则

**五维蛛网图**（教育部 2014 年综合素质评价的五个方面；美英学生显示 Character / Academics / Well-being / Arts / Service）：

| 维度 | 计算 |
|---|---|
| 学业水平 | 本学期各科均值（换算为百分制） |
| 身心健康 | 体测综合（国标标准分 / FitnessGram 健康区比例 / Eurofit 平均百分位）、WHO-5、睡眠达标率、心情均值，有几项算几项取平均 |
| 思想品德、艺术素养、社会实践 | 学期评级 A / B / C / D = 95 / 80 / 65 / 50 |

缺数据的维度显示「暂无」，不补数，蛛网图在该轴留空。默认显示最近一个至少有三维数据的学期。

**智能评估**是规则引擎，每条结论都写明数据：最强 / 最弱维度、与上学期相比变化 ≥ 5、单科近 5 次成绩斜率 ≥ ±3 分 / 次、与班级均分差 ≥ 10（高）或 ≥ 5（低）、体测不及格 / 未进健康区 / 低于第 20 百分位、睡眠低于年龄建议、日均运动不足 60 分钟、视力低于正常或下降一行以上、WHO 2007 BMI z 分越界。家长视角另有：WHO-5 ≤ 50、近 14 天 ≥ 3 天心情低落、PHQ-A / GAD-7 ≥ 10、SDQ 高或很高、MHT ≥ 65。学生视角不出现这些风险提示。

**Claude 评语**（Artifact 版，仅家长视角）：通过 `sample` 能力把本学期五维分、各科均值和走势、体测、作息、WHO-5 和规则结论发给 Claude，不含姓名，生成约 200 字评语和三条建议。首次使用会请求授权。

不同计分方式不直接比较：英国学生 Year 9 的百分比和 Year 10 的 GCSE 等级不画在同一条走势里，学业维度的「比上学期」变化也会跳过。

## 参考标准

- 体测：《国家学生体质健康标准（2014 年修订）》，单项指标与权重、全部评分表、加分规则（小学 1 分钟跳绳最多 +20；初高中男引体向上、女仰卧起坐、耐力跑各最多 +10）、等级（≥ 90 优秀，80–89.9 良好，60–79.9 及格）
- 生长：WHO Growth Reference 2007（5–19 岁）BMI-for-age、height-for-age LMS；> +1 SD 超重，> +2 SD 肥胖，< −2 SD 消瘦
- 美国字母等级和 GPA：College Board 换算表（各学区可能不同）
- FitnessGram：Cooper Institute Healthy Fitness Zone
- Eurofit 常模：Tomkinson 等，*Br J Sports Med* 2018;52:1445–56（9–17 岁）
- 睡眠：AASM 2016 儿科共识（6–12 岁 9–12 小时，13–18 岁 8–10 小时）
- 运动：WHO 2020（5–17 岁每天平均 60 分钟中高强度）
- 视力：6 岁以上裸眼视力 < 5.0 为视力低下（国家卫健委儿童青少年近视筛查）
- WHO-5：原始分 × 4；≤ 50 幸福感偏低，≤ 28 建议抑郁方面的专业评估（Topp 等 2015）；适用 9 岁以上
- PHQ-A：5 / 10 / 15 / 20 分档；GAD-7：5 / 10 / 15 分档
- SDQ 困难总分四档：家长评 0–13 / 14–16 / 17–19 / 20–40，老师评 0–11 / 12–15 / 16–18 / 19–40，自评 0–14 / 15–17 / 18–19 / 20–40（youthinmind 评分指南）
- MHT 总焦虑倾向 ≥ 65 需特别关注（周步成《心理健康诊断测验手册》）
- 中国学科等级（≥ 85% 优秀、≥ 70% 良好、≥ 60% 合格）是常见的校内划分，没有全国统一规定；英国百分比成绩不划等级

SDQ、MHT 的题目受版权保护，只记录总分；应用内唯一内置的问卷是免费使用、不含自伤条目的 WHO-5。

## 角色与隐私

| 角色 | 怎么进入 | 看到 | 能改 |
|---|---|---|---|
| 家长 | Artifact 的所有者或编辑者 | 全部 | 全部 |
| 学生 | 家长在同一设备切换；切回需家长 PIN；锁定当前孩子 | 成绩、综合素质、身体、自己的心情和 WHO-5（鼓励式措辞） | 心情打卡、WHO-5 |
| 只读 | 以「查看者」分享（老师、祖辈） | `data/private` 以外的内容 | 无 |

学生没有自己的账号（claude.ai 和两个网站版都只允许成年监护人注册），学生视角是家长设备上的一个模式。家长 PIN 防止孩子误切回家长视角，不是加密。Artifact 版里心理筛查和家长备忘存在 `data/private` 下，db 规则 `read: "admin"`，查看者在服务器端就读不到；网站版每个账号只能读写自己的数据，没有查看者角色。

## 数据结构（Artifact 版）

```
students/{sid}                 name, sex(M|F), birth(YYYY-MM), system(cn|us|uk), cohort, school, cls, allergy, order
students/{sid}/scores/{id}     date, subject, kind, scale(pts|pct|sb4|ks2|gcse|alevel), value, full, avg, lvl(''|H|AP), note
students/{sid}/fitness/{id}    date, items{项目: 原始成绩}, marks{项目: HFZ|NI|NIHR 或百分位}
students/{sid}/health/{id}     date, type(height|weight|vision), value, value2（视力右眼，小数视力）
students/{sid}/ratings/{id}    term(YYYY-n), dim(moral|arts|practice), mark(A–D), by
students/{sid}/merits/{id}     date, dim, title, level, hours
students/{sid}/moods/{id}      date, mood(1–5), stress(1–5), sleep, active, note
students/{sid}/who5/{id}       date, items[5]
data/private/screens/{id}      sid, date, scale(PHQ-A|GAD-7|SDQ|MHT|other), informant(self|parent|teacher), score, by, label, note
data/private/notes/{id}        sid, date, text
data/private/config/pin        hash, salt
```

db 规则：`[{ path: "", read: "view", write: "admin" }, { path: "data/private", read: "admin", write: "admin" }]`。

网站版用扁平集合，每个文档都带 `owner`（账号 uid）和 `sid`（学生 id）：`students, scores, fitness, health, ratings, merits, moods, who5, screens, notes`；另外每个账号有一份 `settings/{uid}`（`consent`、`pin`）。

真实学生数据只存放在 Artifact、Firebase 或云开发的数据库里，不提交到本仓库。示例学生的打卡数据截止 2026-10-08。
