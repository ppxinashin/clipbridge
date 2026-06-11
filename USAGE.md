# ClipBridge 使用说明

## 安装发布版

请只从 [ClipBridge GitHub Releases](https://github.com/ppxinashin/clipbridge/releases) 下载安装包。

### macOS Apple 芯片

下载 `ClipBridge_*_aarch64.dmg`，打开后将 `ClipBridge.app` 拖入“应用程序”文件夹。

macOS 版本使用免费的 Ad-hoc 签名，但尚未进行 Apple Developer ID 签名和公证。首次打开若提示无法验证开发者，请进入“系统设置 → 隐私与安全性”，找到 ClipBridge 提示并点击“仍要打开”。

确认文件来自上述官方 Release，但系统仍提示“ClipBridge 已损坏，无法打开”时，在终端执行：

```bash
xattr -dr com.apple.quarantine "/Applications/ClipBridge.app"
open "/Applications/ClipBridge.app"
```

这只解除 ClipBridge 的下载隔离，不会禁用系统的 Gatekeeper。Ad-hoc 签名无法替代 Apple 公证；完成 Developer ID 签名和公证后才可彻底省略首次授权。

### Windows x64

下载 Release 中的 `.msi` 或 `.exe` 文件并按安装向导操作。若 SmartScreen 提示未知发布者，请先确认文件来自本项目的 GitHub Releases，再选择“更多信息”与“仍要运行”。

## 启动桌面程序

在项目根目录安装依赖并启动开发版：

```bash
npm install
npm run tauri:dev
```

首次运行需要编译 Rust 依赖，等待时间会比后续启动更长。

构建正式安装包：

```bash
npm run tauri:build
```

构建产物位于：

```text
target/release/bundle/
```

## 剪贴板浮窗

默认使用 `Alt+V` 调出剪贴板浮窗。在 macOS 上，`Alt` 对应 `Option`，因此快捷键为 `Option+V`。

| 操作 | 功能 |
| --- | --- |
| `Alt+V` / `Option+V` | 调出剪贴板浮窗 |
| `↑` / `↓` | 选择上一条或下一条记录 |
| `Enter` | 复制当前选中的文本或图片，并关闭浮窗 |
| 鼠标点击记录 | 复制该记录，并关闭浮窗 |
| 点击图钉 | 将记录转为便签 |
| `Esc` | 关闭浮窗 |
| 点击其他窗口 | 浮窗失去焦点后自动关闭 |

文本记录会复制原文本，图片记录会复制原图。已经转为便签的记录会显示实心图钉。

## 修改全局快捷键

1. 打开主窗口左下角的“设置”。
2. 点击快捷键输入框。
3. 直接按下需要使用的组合键。
4. 点击“应用快捷键”。

快捷键会立即生效并保存，重新启动程序后仍然有效。若自定义快捷键无法注册，程序会回退到 `Alt+V`。

## Markdown 便签

点击左侧“新建便签”即可创建便签。编辑器左侧输入 Markdown，右侧实时预览，修改后自动保存。

当前支持：

- 标题、段落、粗体和斜体
- 有序列表、无序列表和任务列表
- 链接、引用和分隔线
- 表格
- 行内代码和代码块
- 常用语言代码高亮
- Markdown 图片

编辑器工具栏提供粗体、斜体、链接、行内代码、列表和插入图片按钮。

### 插入图片

点击编辑器工具栏中的图片按钮并选择本地图片。图片会以内嵌数据形式写入 Markdown，因此移动或删除原图片后，便签中的图片仍然可以显示。

剪贴板中的图片也可以点击图钉直接转为带图片的便签。

## 退出程序

应用会常驻 macOS 菜单栏或 Windows 通知区域。点击托盘图标可恢复主窗口，右键可选择「打开 ClipBridge」「打开剪贴板」或「退出」。

关闭主窗口只会隐藏到托盘；要完全退出，请使用托盘菜单中的「退出」。开发模式下也可以在运行 `npm run tauri:dev` 的终端按 `Ctrl+C` 停止程序。
