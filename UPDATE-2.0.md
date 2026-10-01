# 西语动词变位练习器 2.0 · Update Notes

> **一句话**：全面换装 Lucide 矢量图标，预设系统改名重排，自定义槽体验对齐预设，文案与描述去伪存真。
>
> **One-liner**: A Lucide icon makeover across the whole UI, renamed & retuned presets, custom slots that behave like presets, and cleaner copy.

---

## 🎨 界面图标全面换装（Lucide Icons）

1.0 的按钮和难度档用的是 emoji（🌱🌿🚀🏆、⚙️、✏️、🛠️🧩）。emoji 在不同系统上长得五花八门，风格不统一。2.0 全面换成 [Lucide Icons](https://lucide.dev)（ISC License）矢量图标：

| 位置 | 1.0 | 2.0 |
|---|---|---|
| 辨认模式 | （纯文字） | 👁 `eye` |
| 复现模式 | （纯文字） | ✏ `pencil` |
| 转换模式 | （纯文字） | 🔄 `repeat` |
| 平移模式 | （纯文字） | ⇄ `transfer` |
| 设置按钮 | ⚙️ emoji | ⚙ `settings` |
| 自定义槽「编辑」 | ✏️ emoji | `sliders-horizontal` |
| 零基础 · A1 | 🌱 | `sprout` |
| 入门 · A2 | 🌿 | `tree-deciduous` |
| 进阶 · B1 | 🚀 | `rocket` |
| 考试冲刺 · B2 | 🏆 | `trophy` |
| 自定义 1 | 🛠️ | `wrench` |
| 自定义 2 | 🧩 | `puzzle` |

所有图标统一 24×24 网格、2px 线宽、圆角端点、`currentColor` 继承文字色，风格高度一致；以 SVG 内联进 HTML，**单文件离线特性不变**。SVG 源文件保存在 `icon/` 目录，选型理由与备选方案见 `icon/README.md`。

**影响**：纯视觉改动，功能零变化；图标跟随按钮状态自动变色（选中白字、禁用灰字）。

---

## 🗂 预设系统改名与文案校正

### 「打基础」→「入门」

原名「打基础 · A2 三时态」改为「**入门 · A2 三时态**」（英文名不变，仍为 *Building · A2 three tenses*）。与「零基础 / 进阶 / 考试冲刺」的递进关系更清晰。

### 「考试冲刺」描述去掉「严格重音」

1.0 的考试冲刺预设描述写着「全部 15 个时态 · **严格重音**」，但严格重音其实是**齿轮设置里的全局开关**，不是这套预设的属性——预设只管词库 / 时态 / 标签 / 答题方式。2.0 把这四个字去掉，改为与其它预设一致的「手写」：

```
1.0：A1–B2 词库 · 全部 15 个时态 · 严格重音
2.0：A1–B2 词库 · 全部 15 个时态 · 手写
```

想开严格重音，去右上角齿轮设置里开即可，它对所有预设和自定义槽一视同仁。

---

## 🛠 自定义槽体验对齐预设

1.0 点自定义槽时，下方面板不展开，只提示「已切到「自定义 1」，改动会自动保存」，用户看不到这套设置到底包含什么。2.0 让自定义槽**和预设一样**：

- **点击自定义槽** → 下方展开**只读摘要面板**，与预设同款格式，逐条列出：
  - `1 · 词库`：等级组合 + 动词数
  - `2 · 时态`：已选时态列表
  - `3 · 其它`：答题方式（手写 / 选择题）
- **点右侧「编辑」按钮**（现在配 `sliders-horizontal` 图标）→ 弹出模态窗口，里面有完整的三个小节（词库 / 时态 / 其它）可编辑，改动实时保存。
- 自定义槽仍保留虚线边框，一眼区分「这一档是你自己的」。

**影响**：纯交互改动，不改任何设置逻辑；存储格式与 1.0 完全兼容，老记录自动迁移。

---

## 📄 文档更新

- `README.md` 全面重写，同步 2.0 的预设名称、图标体系、自定义槽行为；新增「矢量图标」小节；
- 新增 `工程介绍.md`：开发者向的工程文档（架构、数据流水线、核心模块、构建与测试）；
- 新增 `icon/README.md`：图标选型说明、Lucide 使用方法、备选图标库对比；
- 本文件 `UPDATE-2.0.md`：2.0 更新说明。

---

## 🔧 技术细节（开发者向）

改动集中在 `data/app_template.html`（唯一手改源码）：

| 区域 | 改动 |
|---|---|
| `MODES` 数组 | 每个模式新增 `icon` 字段（内联 SVG） |
| `renderMenu()` | 模式按钮用 `innerHTML = m.icon + ' ' + name` 渲染 |
| `applyStatic()` | `#m-set` 按钮用 `settings` SVG 替换 ⚙️ emoji |
| `renderPresets()` | `PRESETS[].pic` / `CUSTOM_PICS` 从 emoji 字符串改为 SVG 常量（`ICO_SPROUT` 等 6 个）；自定义槽「编辑」按钮从 ✏️ 改为 `sliders-horizontal` SVG |
| `renderPickPanel()` | 自定义槽未开模态时，改为渲染只读摘要（与预设同款 `line()` 格式），不再清空面板 |
| `selectKey()` | 面板展开条件从 `!!p`（仅预设）放宽为 `!!k`（任意键） |
| `.chip` CSS | 改为 `inline-flex` + `gap:5px`，让 SVG 与文字垂直居中；`.key .pic` 保持不变（SVG 自适应） |

数据文件（`verbs_data.json` / `jehle_parsed.json` / `curate.txt`）**零改动**，1.0 的学习记录与统计完全兼容。

---

## ✅ 兼容性

- ✅ 1.0 的 localStorage 记录（设置 / 统计 / 错题本）直接沿用，无需迁移
- ✅ 单文件离线特性不变（图标内联，成品约 963 KB）
- ✅ 中英双语界面全部同步更新
- ✅ 窄屏 / 手机布局不受影响
- ✅ 构建流程不变（`build_final.py` → `build_app.py`）

---

## 🙏 致谢

图标来自 [Lucide Icons](https://lucide.dev)（ISC License），一个非常干净、克制的开源图标库，感谢其维护者。

---

*¡Ánimo y a conjugar!* 🇪🇸
