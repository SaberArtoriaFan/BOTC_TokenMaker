# 🎴 BloodOnTheClocktower-TokenMaker

<div align="center">

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![.NET](https://img.shields.io/badge/.NET-8.0-purple.svg)](https://dotnet.microsoft.com/)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20Linux%20%7C%20macOS-lightgrey.svg)](https://github.com)

**A Professional Token Generation Tool for Blood on the Clocktower**  
**《血染钟楼》专业 Token 制作工具**

[English](#-english) | [中文](#-中文)

</div>

---

## 🌐 Web 版（推荐）

仓库根目录现已包含一个纯浏览器版 Token 工坊。JSON 只在浏览器本地解析；角色图片由同源代理读取，以避开第三方图床的 CORS 限制。

### 功能

- 拖放或多选多个剧本 JSON，自动跳过 `_meta` 并合并去重
- 同时支持英文 `team` 与中文 `sch_team`
- 实时调整尺寸、DPI、留白、角色图缩放/位置、背景、字体、直线/弧形文字和裁切线
- 单独修改角色名称、阵营和图片
- 单张 PNG 下载或整套 ZIP 下载
- 内置两款羊皮纸背景，并支持自定义本地字体和背景图；本地文件不会上传到服务器
- 桌面端与手机端响应式界面

### 本地运行

```bash
npm install
npm run dev
```

生产构建：

```bash
npm run build
```

构建产物位于 `dist/`。本地 Vite 服务和 Cloudflare Pages 均提供 `/api/image` 图片代理；代理只接受公网 HTTP(S) 图片、校验图片类型，并限制为 12 MB。

### 部署到 Cloudflare Pages

把仓库连接到 Cloudflare Pages，选择 **GitHub 集成** 并导入本仓库，然后使用以下设置：

| 设置 | 值 |
| --- | --- |
| Production branch | `main` |
| Framework preset | `None` / `No framework`（不要选择 VitePress） |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | 留空（仓库根目录） |

本项目使用原生 Vite，但不依赖 Cloudflare 的框架预设；构建命令和输出目录手动填写即可。VitePress 是另一个文档框架，不适用于本项目。

`functions/api/image.js` 会被 Pages 自动识别为 Function，不需要额外配置 Worker。首次部署完成后，后续推送到 `main` 分支会自动触发新的生产部署。仓库中的 `wrangler.toml` 也可用于 Wrangler 部署。

---

## 🌟 English

### 📖 Overview

**BloodOnTheClocktower-TokenMaker** is a powerful automated tool designed for *Blood on the Clocktower* players and storytellers. It transforms raw character data into beautifully formatted, print-ready tokens with professional quality and extensive customization options.

#### What This Tool Does

- ✅ **Automated Workflow**: Parse JSON files → Download images → Generate tokens
- ✅ **High-Quality Output**: DPI-configurable output for professional printing
- ✅ **Fully Customizable**: Control every aspect from colors to text curves
- ✅ **Batch Processing**: Handle multiple scripts simultaneously
- ✅ **Smart Deduplication**: Automatically merge and remove duplicate tokens
- ✅ **Multi-Language**: Perfect support for Chinese, English, and custom fonts

---

### 🚀 Key Features

#### 🎨 Advanced Visual Customization

- **Flexible Backgrounds**
  - Solid color backgrounds with RGB control
  - Custom background images with auto-scaling
  - Transparent backgrounds for layering

- **Professional Text Rendering**
  - Curved text layout with adjustable arc angle
  - Straight text layout with custom spacing
  - Team-based color coding (Townsfolk/Outsider = Blue, Minion/Demon = Red)
  - Gradient text effects with customizable colors and angles
  - Text stroke (outline) with adjustable width
  - Inner shadow effects for depth

- **Precise Image Control**
  - Circular image cropping with anti-aliasing
  - Adjustable image scale ratio
  - Vertical offset control for perfect centering
  - High-quality image filtering

- **Canvas & Output**
  - Configurable canvas padding for bleed area
  - Optional cut guide lines for printing
  - Customizable DPI (300+ recommended for printing)
  - Token diameter in inches for physical production

#### 🔧 Intelligent Processing

- **Batch Mode**: Process entire folders of JSON files
- **Strict Filtering**: Option to generate only valid role tokens
- **Error Handling**: Robust retry logic and detailed error reporting
- **Smart Merging**: Automatically deduplicates across multiple scripts

---

### 📋 Quick Start

#### Prerequisites

- .NET 8.0 SDK or later
- SkiaSharp library (auto-installed via NuGet)

#### Installation

```bash
# Clone the repository
git clone https://github.com/SaberArtoriaFan/BOTC_TokenMaker.git
cd BOTC_TokenMaker

# Restore dependencies
dotnet restore

# Run the tool
dotnet run
```

#### Basic Usage

```bash
# Use default config.json
dotnet run

# Specify custom config file
dotnet run -- --config my-config.json

# Control cut guide lines
dotnet run -- --guide          # Show guides
dotnet run -- --no-guide       # Hide guides

# Adjust canvas padding
dotnet run -- --padding 5      # Add 5px padding around tokens
```

---

### ⚙️ Configuration Guide

All settings are controlled via a JSON configuration file. Below is a comprehensive breakdown:

#### 📁 File Paths

```json
{
  "json_path": "Json",           // Single file or folder path
  "output_dir": "tokens_output", // Output directory
  "font": {
    "path": "font.ttf",          // Path to font file
    "size": 120                  // Font size in pixels
  }
}
```

**Tips**:
- Set `json_path` to a folder to batch-process all JSON files
- Font must support your target language (e.g., Chinese characters)

---

#### 🖼️ Token Specifications

```json
{
  "dpi": 300,                    // Resolution (300+ for print)
  "token_diameter_inch": 1.5,    // Physical diameter in inches
  "canvas_padding": 2            // Extra pixels around token (bleed area)
}
```

**Calculation**: Final image size = `(token_diameter_inch × dpi) + (canvas_padding × 2)` pixels

**Examples**:
- `1.5"` token at `300 DPI` = `450×450` px core + padding
- `2.0"` token at `600 DPI` = `1200×1200` px core + padding

---

#### 🎨 Background Configuration

##### Option 1: Solid Color
```json
{
  "background": {
    "type": "color",
    "color": [255, 255, 255]     // RGB: white
  }
}
```

##### Option 2: Image Background
```json
{
  "background": {
    "type": "image",
    "image_path": "bg.png"       // Path to background image
  }
}
```

##### Option 3: Transparent
```json
{
  "background": {
    "type": "transparent"
  }
}
```

---

#### 🖼️ Image Positioning

```json
{
  "image": {
    "scale": 0.75,               // Image size relative to token (0.0-1.0)
    "y_offset_ratio": -0.05      // Vertical offset (-0.5 to 0.5)
  }
}
```

**Scale Examples**:
- `0.75` = Image fills 75% of token diameter
- `0.9` = Larger image, less border
- `0.5` = Smaller image, more border

**Y-Offset Examples**:
- `-0.05` = Move image 5% upward
- `0.1` = Move image 10% downward
- `0.0` = Perfect center

---

#### ✍️ Text Rendering

##### Basic Text Settings

```json
{
  "text": {
    "use_curve": true,           // Curved (true) or straight (false) text
    "use_gradient": true,        // Enable gradient effects
    "colors": {
      "blue": [66, 135, 245],    // Good team color (RGB)
      "red": [220, 53, 69],      // Evil team color (RGB)
      "neutral": [128, 128, 128] // Neutral/unknown color
    }
  }
}
```

##### Text Stroke (Outline)

```json
{
  "text": {
    "stroke": {
      "color": [0, 0, 0],        // Black outline
      "width": 8                 // Outline thickness
    }
  }
}
```

##### Inner Shadow

```json
{
  "text": {
    "inner_shadow": {
      "offset_y": 4,             // Shadow offset downward
      "alpha": 100               // Shadow opacity (0-255)
    }
  }
}
```

---

#### 🌀 Curved Text Layout

```json
{
  "text": {
    "use_curve": true,
    "single_char_y": 0.85,       // Y position for single characters
    "curve": {
      "radius_ratio": 0.38,      // Arc radius (0.0-1.0)
      "arc_angle_base": 40,      // Starting angle for 2 characters
      "arc_angle_increment": 8,  // Angle added per character
      "arc_angle_max": 120       // Maximum arc angle
    }
  }
}
```

**How Curved Text Works**:
1. Characters are arranged along an arc
2. Arc angle = `arc_angle_base + (char_count - 2) × arc_angle_increment`
3. Capped at `arc_angle_max`

**Examples**:
- 2 chars: `40°` arc
- 3 chars: `48°` arc
- 4 chars: `56°` arc
- 10 chars: `104°` arc (capped at 120° if set)

---

#### 📏 Straight Text Layout

```json
{
  "text": {
    "use_curve": false,
    "line": {
      "spacing": 5.0,            // Pixel spacing between characters
      "char_y": 0.85,            // Baseline Y position (0.0-1.0)
      "offset_y": 0.01           // Offset per extra character
    }
  }
}
```

**Offset Calculation**: 
For names with many characters, text moves up by `offset_y × max(3, char_count - 1)`

---

#### 🎨 Gradient Effects

##### Blue Team Gradient (Townsfolk/Outsider)
```json
{
  "text": {
    "gradient_blue": {
      "colors": [
        [135, 206, 250],         // Light blue (top)
        [0, 100, 200]            // Dark blue (bottom)
      ],
      "positions": [0.0, 1.0],   // Start and end positions
      "angle": 90                // Gradient angle (degrees)
    }
  }
}
```

##### Red Team Gradient (Minion/Demon)
```json
{
  "text": {
    "gradient_red": {
      "colors": [
        [255, 150, 150],         // Light red (top)
        [139, 0, 0]              // Dark red (bottom)
      ],
      "positions": [0.0, 1.0],
      "angle": 90
    }
  }
}
```

**Gradient Angles**:
- `0°` = Left to right
- `90°` = Top to bottom
- `180°` = Right to left
- `270°` = Bottom to top

---

#### ✂️ Cut Guide Lines

```json
{
  "cut_guide": {
    "color": [255, 0, 0],        // Red guide lines
    "width": 2                   // Line thickness
  },
  "show_cut_guide": true         // Enable/disable
}
```

Can be overridden via command line:
```bash
dotnet run -- --guide      # Force show
dotnet run -- --no-guide   # Force hide
```

---

#### ⚡ Processing Options

```json
{
  "timeout": 30,                 // HTTP timeout in seconds
  "strict": false                // Only process valid role tokens
}
```

**Strict Mode**:
- `true` = Only generates tokens for Townsfolk/Outsider/Minion/Demon
- `false` = Generates all tokens (including Travelers, Fabled, etc.)

---

### 📊 Complete Configuration Example

<details>
<summary>Click to expand full config.json</summary>

```json
{
  "json_path": "Json",
  "output_dir": "tokens_output",
  "dpi": 300,
  "token_diameter_inch": 1.5,
  "canvas_padding": 2,
  "timeout": 30,
  "strict": false,
  
  "font": {
    "path": "SourceHanSansCN-Bold.ttf",
    "size": 120
  },
  
  "background": {
    "type": "color",
    "color": [255, 255, 255],
    "image_path": null
  },
  
  "image": {
    "scale": 0.75,
    "y_offset_ratio": -0.05
  },
  
  "text": {
    "use_curve": true,
    "use_gradient": true,
    "single_char_y": 0.85,
    
    "colors": {
      "blue": [66, 135, 245],
      "red": [220, 53, 69],
      "neutral": [128, 128, 128]
    },
    
    "stroke": {
      "color": [0, 0, 0],
      "width": 8
    },
    
    "inner_shadow": {
      "offset_y": 4,
      "alpha": 100
    },
    
    "curve": {
      "radius_ratio": 0.38,
      "arc_angle_base": 40,
      "arc_angle_increment": 8,
      "arc_angle_max": 120
    },
    
    "line": {
      "spacing": 5.0,
      "char_y": 0.85,
      "offset_y": 0.01
    },
    
    "gradient_blue": {
      "colors": [
        [135, 206, 250],
        [0, 100, 200]
      ],
      "positions": [0.0, 1.0],
      "angle": 90
    },
    
    "gradient_red": {
      "colors": [
        [255, 150, 150],
        [139, 0, 0]
      ],
      "positions": [0.0, 1.0],
      "angle": 90
    }
  },
  
  "cut_guide": {
    "color": [255, 0, 0],
    "width": 2
  },
  
  "show_cut_guide": true
}
```

</details>

---

### 📂 Output Structure

```
tokens_output/
├── script1/
│   ├── washerwoman_token.png
│   ├── librarian_token.png
│   └── ...
├── script2/
│   ├── investigator_token.png
│   └── ...
└── _merged/                    # 自动生成的合并文件夹
    ├── washerwoman_token.png   # 去重后的 Token
    └── ...
```

**自动合并**：
- 处理多个 JSON 文件 → 生成单独文件夹
- 自动创建 `_merged/` 文件夹
- 按文件哈希和基础文件名去重
- 跳过重复 Token（如 `washerwoman_1.png` vs `washerwoman_2.png`）

---

### 🎯 高级应用场景

#### 用于实体 Token 制作

```json
{
  "dpi": 600,
  "token_diameter_inch": 1.5,
  "canvas_padding": 10,
  "show_cut_guide": true,
  "background": {
    "type": "color",
    "color": [255, 255, 255]
  }
}
```

#### 用于虚拟桌游（TTS/Foundry）

```json
{
  "dpi": 150,
  "token_diameter_inch": 2.0,
  "canvas_padding": 0,
  "show_cut_guide": false,
  "background": {
    "type": "transparent"
  }
}
```

#### 用于自定义中文剧本

```json
{
  "font": {
    "path": "SourceHanSansCN-Bold.ttf",
    "size": 140
  },
  "text": {
    "use_curve": true,
    "curve": {
      "arc_angle_increment": 10
    }
  }
}
```

---

### 🛠️ 问题排查

| 问题 | 解决方案 |
|------|----------|
| 找不到字体 | 检查 `font.path` 并确保文件存在 |
| 图片下载失败 | 增加 `timeout` 值 |
| 文字过于拥挤 | 减小 `font.size` 或调整 `arc_angle_increment` |
| 打印质量低 | 将 `dpi` 提高到 600+ |
| 裁切线不可见 | 检查 `show_cut_guide` 和 `cut_guide.color` |

---

### 🎨 使用示例图库

#### 标准配置效果
- ✅ 弧形文字布局
- ✅ 蓝色/红色渐变文字
- ✅ 黑色描边 + 内阴影
- ✅ 白色背景 + 红色裁切线

#### 高端打印配置
- ✅ 600 DPI 超高分辨率
- ✅ 10px 出血区
- ✅ 专业裁切辅助线
- ✅ 完美居中对齐

#### 虚拟桌游配置
- ✅ 透明背景
- ✅ 无裁切线
- ✅ 2.0 英寸大尺寸
- ✅ 优化的在线显示

---

### 💡 高级技巧

#### 批量处理多个剧本

1. 将所有 JSON 文件放入一个文件夹（如 `Json/`）
2. 设置 `"json_path": "Json"`
3. 运行工具
4. 自动生成独立文件夹 + 去重合并文件夹

#### 自定义字体效果

推荐字体：
- **中文**：思源黑体（Source Han Sans）、站酷高端黑
- **英文**：Trajan Pro、Cinzel
- **装饰性**：各类书法字体

#### 快速预览模式

```json
{
  "dpi": 72,
  "canvas_padding": 0,
  "show_cut_guide": false
}
```

生成低分辨率预览，快速查看效果。

#### 专业印刷模式

```json
{
  "dpi": 600,
  "canvas_padding": 15,
  "show_cut_guide": true,
  "cut_guide": {
    "color": [0, 255, 0],
    "width": 1
  }
}
```

超高分辨率 + 大出血区 + 细裁切线。

---

### 📞 支持与反馈

如有问题或建议，欢迎：
- 提交 Issue
- 发起 Pull Request
- 联系项目维护者

---

### 🙏 致谢

- Blood on the Clocktower 官方团队
- SkiaSharp 图形库
- .NET 开源社区
- 所有贡献者

---

### 📝 更新日志

#### v2.0.0
- ✨ 新增画布内边距功能（`canvas_padding`）
- ✨ 支持批量处理多个 JSON 文件
- ✨ 自动合并去重功能
- ✨ 优化文字渲染算法
- 🐛 修复单字符布局问题
- 🐛 修复背景图片加载异常

#### v1.0.0
- 🎉 首次发布
- ✅ 基础 Token 生成功能
- ✅ 弧形/直线文字布局
- ✅ 渐变文字效果
- ✅ 自定义背景

---

<div align="center">

**Made with ❤️ for Blood on the Clocktower Community**

**为《血染钟楼》社区精心打造**

[⭐ Star this repo](https://github.com/yourusername/BloodOnTheClocktower-TokenMaker) | [🐛 Report Bug](https://github.com/yourusername/BloodOnTheClocktower-TokenMaker/issues) | [💡 Request Feature](https://github.com/yourusername/BloodOnTheClocktower-TokenMaker/issues)

</div>
│   ├── investigator_token.png
│   └── ...
└── _merged/                    # Auto-generated merged folder
    ├── washerwoman_token.png   # Deduplicated tokens
    └── ...
```

**Automatic Merging**:
- Processes multiple JSON files → separate folders
- Automatically creates `_merged/` folder
- Deduplicates by file hash and base filename
- Skips duplicate tokens (e.g., `washerwoman_1.png` vs `washerwoman_2.png`)

---

### 🎯 Advanced Use Cases

#### For Physical Token Production

```json
{
  "dpi": 600,
  "token_diameter_inch": 1.5,
  "canvas_padding": 10,
  "show_cut_guide": true,
  "background": {
    "type": "color",
    "color": [255, 255, 255]
  }
}
```

#### For Virtual Tabletop (TTS/Foundry)

```json
{
  "dpi": 150,
  "token_diameter_inch": 2.0,
  "canvas_padding": 0,
  "show_cut_guide": false,
  "background": {
    "type": "transparent"
  }
}
```

#### For Custom Chinese Scripts

```json
{
  "font": {
    "path": "SourceHanSansCN-Bold.ttf",
    "size": 140
  },
  "text": {
    "use_curve": true,
    "curve": {
      "arc_angle_increment": 10
    }
  }
}
```

---

### 🛠️ Troubleshooting

| Issue | Solution |
|-------|----------|
| Font not found | Check `font.path` and ensure file exists |
| Images fail to download | Increase `timeout` value |
| Text too cramped | Reduce `font.size` or adjust `arc_angle_increment` |
| Low print quality | Increase `dpi` to 600+ |
| Cut lines not visible | Check `show_cut_guide` and `cut_guide.color` |

---

### 📜 License

This project is licensed under the MIT License.

---

## 🌟 中文

### 📖 项目简介

**BloodOnTheClocktower-TokenMaker** 是一款为《血染钟楼》玩家和说书人设计的专业自动化工具。它能将原始角色数据转换为格式精美、可直接打印的 Token，并提供丰富的自定义选项。

#### 本工具的功能

- ✅ **全自动流程**：解析 JSON → 下载图片 → 生成 Token
- ✅ **高质量输出**：可配置 DPI，满足专业印刷需求
- ✅ **完全自定义**：从颜色到文字曲线，全方位控制
- ✅ **批量处理**：同时处理多个剧本
- ✅ **智能去重**：自动合并和去除重复 Token
- ✅ **多语言支持**：完美支持中文、英文及自定义字体

---

### 🚀 核心特性

#### 🎨 高级视觉自定义

- **灵活的背景选项**
  - RGB 纯色背景
  - 自定义背景图片（自动缩放）
  - 透明背景（便于图层叠加）

- **专业文字渲染**
  - 弧形文字布局（可调节弧度）
  - 直线文字布局（可调节间距）
  - 阵营颜色编码（镇民/外来者=蓝色，爪牙/恶魔=红色）
  - 渐变文字效果（自定义颜色和角度）
  - 文字描边（轮廓线），可调节宽度
  - 内阴影效果，增加立体感

- **精确的图片控制**
  - 圆形图片裁剪（抗锯齿）
  - 可调节图片缩放比例
  - 垂直偏移控制，精准居中
  - 高质量图片滤镜

- **画布与输出**
  - 可配置画布内边距（出血区）
  - 可选裁切辅助线（用于打印）
  - 可自定义 DPI（推荐 300+ 用于打印）
  - 英寸单位的 Token 直径（用于实体制作）

#### 🔧 智能处理

- **批量模式**：处理整个文件夹的 JSON 文件
- **严格过滤**：可选仅生成有效角色 Token
- **错误处理**：健壮的重试逻辑和详细错误报告
- **智能合并**：自动跨剧本去重

---

### 📋 快速开始

#### 环境要求

- .NET 8.0 SDK 或更高版本
- SkiaSharp 库（通过 NuGet 自动安装）

#### 安装步骤

```bash
# 克隆仓库
git clone https://github.com/SaberArtoriaFan/BOTC_TokenMaker.git
cd BOTC_TokenMaker

# 恢复依赖
dotnet restore

# 运行工具
dotnet run
```

#### 基础用法

```bash
# 使用默认 config.json
dotnet run

# 指定自定义配置文件
dotnet run -- --config my-config.json

# 控制裁切辅助线
dotnet run -- --guide          # 显示辅助线
dotnet run -- --no-guide       # 隐藏辅助线

# 调整画布内边距
dotnet run -- --padding 5      # Token 周围增加 5px 内边距
```

---

### ⚙️ 配置指南

所有设置均通过 JSON 配置文件控制。以下是详细说明：

#### 📁 文件路径

```json
{
  "json_path": "Json",           // 单个文件或文件夹路径
  "output_dir": "tokens_output", // 输出目录
  "font": {
    "path": "font.ttf",          // 字体文件路径
    "size": 120                  // 字体大小（像素）
  }
}
```

**提示**:
- 将 `json_path` 设为文件夹可批量处理所有 JSON 文件
- 字体必须支持目标语言（如中文字符）

---

#### 🖼️ Token 规格

```json
{
  "dpi": 300,                    // 分辨率（打印推荐 300+）
  "token_diameter_inch": 1.5,    // 物理直径（英寸）
  "canvas_padding": 2            // Token 周围额外像素（出血区）
}
```

**计算公式**：最终图片尺寸 = `(token_diameter_inch × dpi) + (canvas_padding × 2)` 像素

**示例**：
- `1.5"` Token，`300 DPI` = `450×450` px 核心 + 内边距
- `2.0"` Token，`600 DPI` = `1200×1200` px 核心 + 内边距

---

#### 🎨 背景配置

##### 选项 1：纯色
```json
{
  "background": {
    "type": "color",
    "color": [255, 255, 255]     // RGB：白色
  }
}
```

##### 选项 2：图片背景
```json
{
  "background": {
    "type": "image",
    "image_path": "bg.png"       // 背景图片路径
  }
}
```

##### 选项 3：透明
```json
{
  "background": {
    "type": "transparent"
  }
}
```

---

#### 🖼️ 图片定位

```json
{
  "image": {
    "scale": 0.75,               // 图片相对 Token 的大小 (0.0-1.0)
    "y_offset_ratio": -0.05      // 垂直偏移 (-0.5 到 0.5)
  }
}
```

**缩放示例**：
- `0.75` = 图片填充 Token 直径的 75%
- `0.9` = 更大图片，更少边框
- `0.5` = 更小图片，更多边框

**Y-偏移示例**：
- `-0.05` = 图片向上移动 5%
- `0.1` = 图片向下移动 10%
- `0.0` = 完美居中

---

#### ✍️ 文字渲染

##### 基础文字设置

```json
{
  "text": {
    "use_curve": true,           // 弧形（true）或直线（false）文字
    "use_gradient": true,        // 启用渐变效果
    "colors": {
      "blue": [66, 135, 245],    // 好人阵营颜色（RGB）
      "red": [220, 53, 69],      // 坏人阵营颜色（RGB）
      "neutral": [128, 128, 128] // 中立/未知颜色
    }
  }
}
```

##### 文字描边（轮廓）

```json
{
  "text": {
    "stroke": {
      "color": [0, 0, 0],        // 黑色轮廓
      "width": 8                 // 轮廓粗细
    }
  }
}
```

##### 内阴影

```json
{
  "text": {
    "inner_shadow": {
      "offset_y": 4,             // 阴影向下偏移
      "alpha": 100               // 阴影不透明度 (0-255)
    }
  }
}
```

---

#### 🌀 弧形文字布局

```json
{
  "text": {
    "use_curve": true,
    "single_char_y": 0.85,       // 单字符 Y 位置
    "curve": {
      "radius_ratio": 0.38,      // 弧线半径 (0.0-1.0)
      "arc_angle_base": 40,      // 2 个字符的起始角度
      "arc_angle_increment": 8,  // 每增加一个字符增加的角度
      "arc_angle_max": 120       // 最大弧线角度
    }
  }
}
```

**弧形文字工作原理**：
1. 字符沿弧线排列
2. 弧线角度 = `arc_angle_base + (字符数 - 2) × arc_angle_increment`
3. 上限为 `arc_angle_max`

**示例**：
- 2 字符：`40°` 弧线
- 3 字符：`48°` 弧线
- 4 字符：`56°` 弧线
- 10 字符：`104°` 弧线（如果设置上限为 120°）

---

#### 📏 直线文字布局

```json
{
  "text": {
    "use_curve": false,
    "line": {
      "spacing": 5.0,            // 字符间像素间距
      "char_y": 0.85,            // 基线 Y 位置 (0.0-1.0)
      "offset_y": 0.01           // 每增加一个字符的偏移量
    }
  }
}
```

**偏移计算**：
对于字符较多的名称，文字向上移动 `offset_y × max(3, 字符数 - 1)`

---

#### 🎨 渐变效果

##### 蓝队渐变（镇民/外来者）
```json
{
  "text": {
    "gradient_blue": {
      "colors": [
        [135, 206, 250],         // 浅蓝（顶部）
        [0, 100, 200]            // 深蓝（底部）
      ],
      "positions": [0.0, 1.0],   // 起始和结束位置
      "angle": 90                // 渐变角度（度）
    }
  }
}
```

##### 红队渐变（爪牙/恶魔）
```json
{
  "text": {
    "gradient_red": {
      "colors": [
        [255, 150, 150],         // 浅红（顶部）
        [139, 0, 0]              // 深红（底部）
      ],
      "positions": [0.0, 1.0],
      "angle": 90
    }
  }
}
```

**渐变角度**：
- `0°` = 从左到右
- `90°` = 从上到下
- `180°` = 从右到左
- `270°` = 从下到上

---

#### ✂️ 裁切辅助线

```json
{
  "cut_guide": {
    "color": [255, 0, 0],        // 红色辅助线
    "width": 2                   // 线条粗细
  },
  "show_cut_guide": true         // 启用/禁用
}
```

可通过命令行覆盖：
```bash
dotnet run -- --guide      # 强制显示
dotnet run -- --no-guide   # 强制隐藏
```

---

#### ⚡ 处理选项

```json
{
  "timeout": 30,                 // HTTP 超时时间（秒）
  "strict": false                // 仅处理有效角色 Token
}
```

**严格模式**：
- `true` = 仅生成镇民/外来者/爪牙/恶魔的 Token
- `false` = 生成所有 Token（包括旅行者、传奇等）

---

### 📊 完整配置示例

<details>
<summary>点击展开完整 config.json</summary>

```json
{
  "json_path": "Json",
  "output_dir": "tokens_output",
  "dpi": 300,
  "token_diameter_inch": 1.5,
  "canvas_padding": 2,
  "timeout": 30,
  "strict": false,
  
  "font": {
    "path": "SourceHanSansCN-Bold.ttf",
    "size": 120
  },
  
  "background": {
    "type": "color",
    "color": [255, 255, 255],
    "image_path": null
  },
  
  "image": {
    "scale": 0.75,
    "y_offset_ratio": -0.05
  },
  
  "text": {
    "use_curve": true,
    "use_gradient": true,
    "single_char_y": 0.85,
    
    "colors": {
      "blue": [66, 135, 245],
      "red": [220, 53, 69],
      "neutral": [128, 128, 128]
    },
    
    "stroke": {
      "color": [0, 0, 0],
      "width": 8
    },
    
    "inner_shadow": {
      "offset_y": 4,
      "alpha": 100
    },
    
    "curve": {
      "radius_ratio": 0.38,
      "arc_angle_base": 40,
      "arc_angle_increment": 8,
      "arc_angle_max": 120
    },
    
    "line": {
      "spacing": 5.0,
      "char_y": 0.85,
      "offset_y": 0.01
    },
    
    "gradient_blue": {
      "colors": [
        [135, 206, 250],
        [0, 100, 200]
      ],
      "positions": [0.0, 1.0],
      "angle": 90
    },
    
    "gradient_red": {
      "colors": [
        [255, 150, 150],
        [139, 0, 0]
      ],
      "positions": [0.0, 1.0],
      "angle": 90
    }
  },
  
  "cut_guide": {
    "color": [255, 0, 0],
    "width": 2
  },
  
  "show_cut_guide": true
}
```

</details>

---

### 📂 输出结构

```
tokens_output/
├── script1/
│   ├── washerwoman_token.png
│   ├── librarian_token.png
│   └── ...
├── script2/
