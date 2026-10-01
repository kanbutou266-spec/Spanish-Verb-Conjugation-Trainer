# 图标资源说明

## 推荐图标库

本项目推荐使用 **Lucide Icons**（https://lucide.dev），原因：
- 开源免费（ISC License）
- 简约线性风格，统一设计语言
- 1500+ 图标，覆盖教育/学习场景
- 支持 SVG 直接下载

## 所需图标

### 四个练习模式图标

| 模式 | 英文名 | 推荐 Lucide 图标 | 备选 |
|------|--------|------------------|------|
| 辨认 Recognition | recognition | `eye`（眼睛） | `scan-eye`、`search` |
| 复现 Production | production | `pencil`（铅笔） | `pen-tool`、`edit-3` |
| 转换 Tense shift | tense-shift | `arrow-left-right`（左右箭头） | `repeat`、`refresh-cw` |
| 平移 Verb transfer | verb-transfer | `arrow-right-left`（右左箭头） | `move-right`、`shuffle` |

### 编辑按钮图标

| 用途 | 推荐 Lucide 图标 | 备选 |
|------|------------------|------|
| 编辑/设置 | `settings`（齿轮） | `sliders-horizontal`、`cog` |

## 下载方式

1. 访问 https://lucide.dev/icons
2. 搜索图标名称（如 `eye`）
3. 点击图标 → 点击 "Copy SVG" 或下载 SVG 文件
4. 保存到本目录，命名为 `模式名.svg`（如 `recognition.svg`）

## 图标风格建议

- **尺寸**：24x24px（Lucide 默认）
- **线条粗细**：2px（Lucide 默认）
- **颜色**：使用 currentColor 继承文字颜色，或单独设置为 #1b1d21（主色）
- **格式**：SVG（矢量，缩放不失真）

## 备选图标库

如果 Lucide 不满足需求，可考虑：

| 图标库 | 风格 | 许可证 | 网址 |
|--------|------|--------|------|
| **Heroicons** | 简约线性/实心 | MIT | https://heroicons.com |
| **Feather Icons** | 极简线性 | MIT | https://feathericons.com |
| **Phosphor Icons** | 多重风格 | MIT | https://phosphoricons.com |
| **Tabler Icons** | 线性风格 | MIT | https://tabler-icons.io |

## 使用示例

在 HTML 中内联 SVG：
```html
<button class="mode-btn">
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
  <span>辨认模式</span>
</button>
```

或作为外部文件引用：
```html
<img src="icon/eye.svg" alt="辨认模式" width="24" height="24">
```

## 本目录已下载的图标

### Lucide 风格（推荐）

| 文件名 | 用途 | 图标描述 |
|--------|------|----------|
| `recognition.svg` | 辨认模式 | 眼睛（eye） |
| `production.svg` | 复现模式 | 铅笔（pencil） |
| `shift.svg` | 转换模式 | 左右箭头（arrow-left-right） |
| `transfer.svg` | 平移模式 | 右左箭头（arrow-right-left） |
| `settings.svg` | 编辑/设置 | 齿轮（settings） |
| `sliders-horizontal.svg` | 编辑/设置备选 | 水平滑块（sliders-horizontal） |
| `pencil-line.svg` | 编辑按钮备选 | 带底线的铅笔 |
| `edit-alt.svg` | 编辑按钮备选 | 带尾巴的铅笔 |
| `shuffle.svg` | 平移模式备选 | 随机/洗牌 |
| `repeat.svg` | 转换模式备选 | 重复/循环 |
| `refresh-cw.svg` | 转换模式备选 | 刷新/同步 |
| `move-right.svg` | 平移模式备选 | 右箭头 |
| `pencil.svg` | 复现模式 | 铅笔（pencil）- Lucide 原始文件名 |
| `arrow-left-right.svg` | 转换模式 | 左右箭头 - Lucide 原始文件名 |
| `arrow-right-left.svg` | 平移模式 | 右左箭头 - Lucide 原始文件名 |
| `sprout.svg` | 零基础·A1 | 嫩芽（sprout） |
| `tree-deciduous.svg` | 打基础·A2 | 落叶树（tree-deciduous） |
| `rocket.svg` | 进阶·B1 | 火箭（rocket） |
| `trophy.svg` | 考试冲刺·B2 | 奖杯（trophy） |
| `wrench.svg` | 自定义槽1 | 扳手（wrench） |
| `puzzle.svg` | 自定义槽2 | 拼图（puzzle） |

**风格特点**：
- 24x24px 视口
- 2px 线条粗细
- 圆角端点（stroke-linecap="round"）
- 使用 `currentColor` 继承文字颜色

### 其他风格（备选）

| 文件名 | 来源 | 风格 |
|--------|------|------|
| `edit.svg` | 阿里巴巴矢量库 | 填充风格，200x200px |
| `转换.svg` | 阿里巴巴矢量库 | 填充风格，200x200px |
| `箭头_左右切换.svg` | 阿里巴巴矢量库 | 填充风格，200x200px |

---

*建议优先使用 Lucide 风格图标（recognition/production/shift/transfer/settings），风格最统一*