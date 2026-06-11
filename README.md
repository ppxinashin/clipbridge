# ClipBridge

轻量级剪贴板历史 + Markdown 便签管理工具。

ClipBridge 是一款基于 **Tauri 2** 构建的桌面应用，集剪贴板历史记录与 Markdown 便签于一体。它常驻后台，随时记录你的剪贴板内容，并通过全局快捷键一键呼出浮层，让你快速查找、复制或固定历史剪贴项。

---

## 功能特性

- **剪贴板历史记录** — 自动追踪文本、富文本、图片和文件的剪贴板操作，保留最近 100 条记录
- **全局快捷键浮层** — 默认使用 `Alt + V`（macOS 为 `Option + V`）呼出无边框浮层，也可在设置中自定义
- **键盘导航** — 支持 `↑/↓` 选择、`Enter` 复制、`Esc` 关闭，全程无需鼠标
- **钉住到便签** — 将任意剪贴板内容一键转为 Markdown 便签，方便长期保存
- **Markdown 便签编辑** — 双栏实时预览编辑器，支持 GFM、代码高亮、任务列表、表格和本地图片插入
- **标签与颜色分类** — 为便签添加标签和颜色，快速筛选与管理
- **自动保存** — 便签内容修改后自动保存，无需手动操作
- **系统托盘** — 常驻托盘图标，后台静默运行
- **数据导入导出** — 支持便签数据的导出与导入，方便备份与迁移

---

## 技术栈

| 层级 | 技术 |
| --- | --- |
| 前端框架 | React 18 + TypeScript |
| 构建工具 | Vite |
| 样式 | Tailwind CSS |
| Markdown 渲染 | marked + highlight.js |
| 桌面框架 | Tauri 2 (Rust) |
| 剪贴板 | arboard |
| 数据库 | SQLite (rusqlite) |
| 图标 | Lucide React |

---

## 安装

### 预编译版本

> 暂未发布 Release，请通过源码构建使用。

### 从源码构建

#### 环境要求

- [Node.js](https://nodejs.org/) ≥ 18
- [Rust](https://www.rust-lang.org/) ≥ 1.70
- 系统依赖（根据平台）：
  - **macOS**: Xcode Command Line Tools
  - **Windows**: Microsoft Visual C++ Build Tools
  - **Linux**: `libgtk-3-dev`, `libwebkit2gtk-4.1-dev`, `libappindicator3-dev` 等

#### 构建步骤

```bash
# 1. 克隆仓库
git clone https://github.com/ppxinashin/clipbridge.git
cd clipbridge

# 2. 安装前端依赖
npm install

# 3. 开发模式运行
npm run tauri:dev

# 4. 构建生产包
npm run tauri:build
```

构建产物将输出到 `target/release/bundle/`。

---

## 使用指南

### 剪贴板浮层

1. 应用启动后常驻系统托盘（macOS 菜单栏 / Windows 通知区域）
2. 按下 `Option + V`（macOS）或 `Alt + V`（Windows/Linux）呼出浮层
3. 输入关键词搜索剪贴板历史
4. 使用 `↑/↓` 选择条目，`Enter` 复制，`Esc` 关闭
5. 点击条目右侧的图钉图标，可将内容固定为 Markdown 便签

点击托盘图标可恢复主窗口；右键托盘图标可打开主窗口、打开剪贴板或退出应用。关闭主窗口只会将其隐藏到托盘。

### Markdown 便签

1. 在主窗口左侧点击「新建便签」创建笔记
2. 左侧输入 Markdown，右侧实时预览
3. 支持设置标签（逗号分隔）和背景颜色
4. 内容自动保存，无需手动点击
5. 点击编辑器工具栏的图片按钮，可插入本地图片

更完整的操作说明请查看 [USAGE.md](USAGE.md)。

---

## 项目结构

```text
clipbridge/
├── src/                          # 前端源码
│   ├── components/               # React 组件
│   │   ├── MainWindow.tsx        # 主窗口布局
│   │   ├── ClipboardOverlay.tsx  # 剪贴板浮层
│   │   ├── NoteEditor.tsx        # Markdown 编辑器
│   │   ├── NoteList.tsx          # 便签列表
│   │   └── Sidebar.tsx           # 侧边栏
│   ├── context/
│   │   └── AppContext.tsx        # 全局状态管理
│   ├── styles/
│   │   └── globals.css           # 全局样式
│   ├── App.tsx                   # 根组件
│   └── main.tsx                  # 入口文件
├── src-tauri/                    # Tauri / Rust 后端
│   ├── src/
│   │   ├── main.rs               # 应用入口
│   │   ├── lib.rs                # 库入口
│   │   ├── clipboard.rs          # 剪贴板监听
│   │   ├── commands.rs           # IPC 命令
│   │   ├── db.rs                 # 数据库操作
│   │   ├── shortcut.rs           # 全局快捷键配置
│   │   └── tray.rs               # 系统托盘
│   ├── Cargo.toml
│   └── tauri.conf.json           # Tauri 配置
├── package.json
├── Cargo.toml                    # Workspace 配置
├── vite.config.ts
├── tailwind.config.js
└── tsconfig.json
```

---

## 快捷键

| 快捷键 | 功能 |
| --- | --- |
| `Alt + V` / `Option + V` | 呼出剪贴板浮层 |
| `↑ / ↓` | 在浮层中上下选择条目 |
| `Enter` | 复制选中的剪贴板内容 |
| `Esc` | 关闭剪贴板浮层 |

---

## 开发

### 前端开发

```bash
npm run dev          # 仅启动 Vite 开发服务器
```

### 完整开发（含 Rust 后端）

```bash
npm run tauri:dev    # 同时启动前端与 Tauri 后端
```

### 代码检查

```bash
npm run build        # TypeScript 类型检查 + 构建
```

---

## 贡献

欢迎提交 Issue 和 Pull Request。在提交代码前，请确保：

1. 代码通过 TypeScript 类型检查
2. Rust 代码通过 `cargo check` / `cargo clippy`
3. 遵循现有的代码风格

---

## 许可证

[MIT](LICENSE)
