# 西语动词变位练习器 · 工程介绍

> 本文档面向开发者，帮助快速理解项目架构、技术栈、构建流程与核心模块。

---

## 一、项目概览

| 维度 | 说明 |
|------|------|
| **产品形态** | 单文件离线 Web 应用（一个 HTML 文件，双击即用） |
| **目标用户** | 西班牙语学习者（A1–C2 六个等级） |
| **核心功能** | 487 个动词 × 15 个时态 × 4 种练习模式，含变位表查询、语法讲解、错题本与统计 |
| **数据规模** | 487 动词 / 637 源动词 / 15 时态 / 6 人称 = 约 43,830 条变位形式 |
| **产物大小** | ~1 MB（HTML + CSS + JS + 数据全部内联） |
| **依赖** | 零外部依赖（无 npm/CDN/框架；界面图标为内联 Lucide SVG） |

---

## 二、技术栈

| 层级 | 技术 | 备注 |
|------|------|------|
| **前端** | 原生 HTML/CSS/JS（ES6+） | 无框架，单文件内联 |
| **数据处理** | Python 3 | 数据清洗、分类、构建 |
| **测试** | Python + Node.js + Puppeteer | 三层回归：数据层 / 冒烟 / 无头浏览器交互 |
| **数据源** | [Jehle 西语动词数据库](https://github.com/ghidinelli/free-jehle-spanish-verbs) (CC BY-NC-SA 3.0) | 637 动词原始数据 |

---

## 三、目录结构

```
动词变位/
├── 西语动词变位练习器.html      ← 成品（用户直接打开，无需构建）
├── curate.txt                   ← 动词白名单（原形|等级|中文释义），487 行
├── icon/                        ← Lucide 矢量图标（SVG 源文件 + 选型说明）
│   ├── README.md                ← 图标选型、使用方法、备选图标库对比
│   ├── recognition.svg / production.svg / repeat.svg / transfer.svg  ← 4 个练习模式
│   ├── settings.svg / sliders-horizontal.svg                          ← 设置 / 编辑按钮
│   └── sprout.svg / tree-deciduous.svg / rocket.svg / trophy.svg      ← 4 个难度档
│       wrench.svg / puzzle.svg                                        ← 2 个自定义槽
├── data/
│   ├── jehle.csv                ← Jehle 原始 CSV（源数据）
│   ├── jehle_parsed.json        ← 解析后的结构化 JSON（637 动词）
│   ├── verbs_data.json          ← 最终注入 HTML 的数据（487 动词）
│   ├── build_verbs.py           ← 步骤1：CSV → jehle_parsed.json + 词频排序
│   ├── build_final.py           ← 步骤2：白名单筛选 + 等级标注 → verbs_data.json
│   ├── build_app.py             ← 步骤3：数据注入模板 → 最终 HTML
│   ├── app_template.html        ← 应用模板（**唯一手改的源码**，约 4080 行）
│   ├── classify.py              ← 变位不规则类型判定（规则/正字法/词干/不规则）
│   ├── regular.py               ← 规则变位生成器 + 与数据库交叉校验
│   ├── test_build.py            ← 数据层自检（105 项）
│   ├── run_tests.py             ← 一键回归入口（重建 + 冒烟 + 交互）
│   ├── smoke_test.js            ← Node 冒烟测试（79 项）
│   ├── test_tense.js            ← 时态相关测试
│   ├── run_headless.js          ← 无头浏览器交互测试（692 项）
│   ├── probe_table.py           ← 变位表抽屉尺寸探针
│   └── shoot.py                 ← 截图工具
├── _t/                          ← 测试输出目录（截图、临时文件）
│   └── shots/                   ← UI 截图（约 60 张）
├── 工程介绍.md                   ← 本文档（开发者向工程文档）
├── UPDATE-2.0.md                ← 2.0 版本更新说明
├── 改进建议.md                   ← 功能与美观改进建议书
├── 改动说明.md                   ← 三轮改动记录
├── 视频演示剧本.md               ← 3 分钟演示视频分镜
├── 视频简介.md                   ← 视频平台简介文案
└── README.md                    ← 用户文档（中英双语）
```

---

## 四、数据流水线

```
jehle.csv (637 verbs, CC BY-NC-SA 3.0)
       │
       ▼ build_verbs.py
jehle_parsed.json (结构化 + 词频排序)
       │
       ▼ 人工标注等级 (curate.txt)
       │
       ▼ build_final.py + classify.py + regular.py
verbs_data.json (487 verbs, 15 tenses, 6 persons, 着色码)
       │
       ▼ build_app.py
西语动词变位练习器.html (单文件成品)
```

### 4.1 数据格式 (verbs_data.json)

```json
{
  "v": [
    {
      "i": "ser",           // 原形
      "z": "是（本质、身份）", // 中文释义
      "e": "to be",         // 英文释义
      "l": "A1",            // 等级
      "r": 1,               // 词频排名
      "g": ["不规则","强过去式","高频"],  // 标签
      "t": {                // 变位表
        "p": "soy|eres|es|somos|sois|son",  // 陈述式现在时（6 人称，| 分隔）
        "pr": "fui|fuiste|fue|...",
        // ... 共 15 个时态
      },
      "c": {                // 着色码
        "p": "iiiiii",      // i=不规则, s=词干变化, o=正字法, .=规则
        // ...
      },
      "h": {                // 高亮区间 [start, end)
        "p": [[2,3],[0,2],...],
        // ...
      }
    }
  ]
}
```

### 4.2 着色系统 (classify.py)

| 编码 | 类型 | 颜色 | 示例 |
|------|------|------|------|
| `.` | 规则 | 不染色 | hablar → hablo |
| `o` | 正字法变化 | 青色 (#0b7a7a) | tocar → toqué (c→qu) |
| `s` | 词干变化 | 橙色 (#b26a00) | pensar → pienso (e→ie) |
| `i` | 其他不规则 | 红色 (#c0392b) | ser → soy |

---

## 五、核心模块 (app_template.html)

### 5.1 代码规模

| 区域 | 行数 | 说明 |
|------|------|------|
| CSS | 1–643 | 响应式布局、主题色、动效 |
| HTML | 644–900 | 主页/练习/统计/讲解页骨架 |
| JS | 901–4080 | 核心逻辑（约 3100 行） |

### 5.2 功能模块

| 模块 | 关键函数 | 说明 |
|------|----------|------|
| **数据层** | `loadDB()`, `saveDB()` | localStorage 读写（设置/统计/错题） |
| **词库筛选** | `buildPool()` | 按等级/标签/时态筛选可用动词 |
| **出题引擎** | `nextQ()` | 4 种模式的出题逻辑 |
| **判分系统** | `check()`, `judge()` | 重音宽容、多重读法判对 |
| **着色渲染** | `colorForm()`, `hlHTML()` | 只染变化字母，三色对应三类不规则 |
| **变位表抽屉** | `openTable()`, `renderTable()` | 右栏浮层，可搜索、定位当前时态 |
| **语法讲解** | `GUIDE` 数组, `expandGuide()` | 8 页讲解，含 RAE 外链 |
| **统计/错题** | `renderStats()` | 按动词/时态/模式统计，错题本（300 条） |
| **国际化** | `tr()`, `lang()` | 中英双语切换 |
| **预设系统** | `presetOf()` | 4 个固定预设（带 Lucide 图标）+ 2 个自定义槽（`wrench`/`puzzle`），选中即展开只读摘要 |

### 5.3 练习模式

| 模式 | 键值 | 玩法 |
|------|------|------|
| 辨认 Recognition | `rec` | 看变位形式 → 选人称（选择题） |
| 复现 Production | `prod` | 给人称+时态 → 写变位（手写） |
| 转换 Tense shift | `shift` | 同动词同人称 → 换时态 |
| 平移 Verb transfer | `transfer` | 同人称同时态 → 换动词 |

---

## 六、构建与测试

### 6.1 构建流程

```bash
# 完整重建（一般不需要，成品已预构建）
python data/build_final.py    # 生成 verbs_data.json
python data/build_app.py      # 注入模板 → 最终 HTML

# 或一键重建 + 全量回归
python data/run_tests.py
```

### 6.2 测试体系

| 层级 | 工具 | 用例数 | 覆盖范围 |
|------|------|--------|----------|
| 数据层 | Python (`test_build.py`) | 105 | 等级合法性、自复动词、着色码 |
| 冒烟测试 | Node.js (`smoke_test.js`) | 79 | 核心函数、数据不变量 |
| 交互测试 | Puppeteer (`run_headless.js`) | 692 | 四种模式端到端、UI 稳定性 |

### 6.3 运行测试

```bash
# 需要 Node.js 和 Edge/Chrome
python data/run_tests.py              # 完整回归
python data/run_tests.py --skip-build # 跳过重建，只跑测试
```

---

## 七、关键设计决策

### 7.1 单文件架构

- **优势**：零依赖、离线可用、U 盘/微信传输方便、隐私友好
- **代价**：所有代码/数据/样式内联，文件较大（~1MB）、无法按需加载
- **构建方式**：模板 (`app_template.html`) + 数据 (`verbs_data.json`) → 拼接

### 7.2 着色只染变化字母

- 不是整个词染色，而是精确标记"真正变了的那几个字母"
- 三色对应三类不规则，帮助学习者理解变化规律
- 实现：`h` 字段记录每个形式的变化区间 `[start, end)`

### 7.3 重音宽容判分

- 缺少重音符不直接判错，提示"重音有误"让用户确认
- 支持虚拟式 -ra/-se 互换判对
- 可开启严格模式模拟考试

### 7.4 响应式设计

- 已适配窄屏（手机/平板）
- 关键断点：780px（时态网格单列）、560px（进一步简化）
- 变位表抽屉：浮层设计，不影响正文布局

---

## 八、扩展指南

### 8.1 增删动词

1. 编辑 `curate.txt`（格式：`原形|等级|中文释义`）
2. 运行 `python data/build_final.py` 重新生成 `verbs_data.json`
3. 运行 `python data/build_app.py` 重新生成 HTML
4. 运行 `python data/run_tests.py` 验证

### 8.2 添加新时态

1. 在 `build_final.py` 的 `TENSES` 列表中添加新时态键
2. 在 `app_template.html` 的 `TENSES` 数组中同步添加
3. 更新 `classify.py` 的判定逻辑（如有新规则）
4. 重新构建并测试

### 8.3 添加新练习模式

1. 在 `app_template.html` 的 `MODES` 数组中添加新模式定义
2. 实现出题函数（类似 `nextQ()` 的分支）
3. 实现判分逻辑
4. 更新 UI（模式选择、答题界面、反馈面板）

---

## 九、已知限制

- 无人称动词（llover / nevar 等）因缺少完整人称形式，未收录
- 不覆盖方言变体（如 voseo）
- `vosotros` 可在设置中关闭（拉美学习者常用）
- 单文件架构不适合大规模数据扩展（建议 < 1000 动词）

---

## 十、相关文档

| 文档 | 说明 |
|------|------|
| `README.md` | 用户文档（中英双语） |
| `改进建议.md` | 功能与美观改进建议书（P0/P1/P2 分级） |
| `改动说明.md` | 三轮改动记录（预设/菜单/设置） |
| `UPDATE-2.0.md` | 2.0 版本更新说明（Lucide 图标 / 预设改名 / 自定义槽体验） |
| `icon/README.md` | Lucide 图标选型、使用方法、备选图标库对比 |
| `视频演示剧本.md` | 3 分钟演示视频分镜 |
| `视频简介.md` | 视频平台简介文案 |

---

*最后更新：2026 年 9 月*