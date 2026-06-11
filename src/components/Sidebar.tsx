import {
  Check,
  Hash,
  Keyboard,
  Monitor,
  Moon,
  Palette,
  Plus,
  Settings,
  StickyNote,
  Sun,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useApp } from "../context/AppContext";
import { ThemeMode, useTheme } from "../context/ThemeContext";

const NOTE_COLORS = [
  { name: "黄色", value: "#fef3c7" },
  { name: "绿色", value: "#d1fae5" },
  { name: "蓝色", value: "#dbeafe" },
  { name: "紫色", value: "#f3e8ff" },
  { name: "红色", value: "#fee2e2" },
  { name: "灰色", value: "#f3f4f6" },
];

const PRIMARY_PRESETS = [
  "#006c4c",
  "#006a6a",
  "#3f5f90",
  "#6750a4",
  "#8c4a60",
  "#8a5100",
];

const THEME_MODES: Array<{
  mode: ThemeMode;
  label: string;
  icon: typeof Sun;
}> = [
  { mode: "light", label: "浅色", icon: Sun },
  { mode: "dark", label: "深色", icon: Moon },
  { mode: "system", label: "系统", icon: Monitor },
];

interface SidebarProps {
  selectedTag: string | null;
  onSelectTag: (tag: string | null) => void;
  selectedColor: string | null;
  onSelectColor: (color: string | null) => void;
}

export default function Sidebar({
  selectedTag,
  onSelectTag,
  selectedColor,
  onSelectColor,
}: SidebarProps) {
  const { state, saveNote, getGlobalShortcut, setGlobalShortcut } = useApp();
  const { mode, primaryColor, setMode, setPrimaryColor } = useTheme();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [shortcut, setShortcut] = useState("Alt+V");
  const [shortcutStatus, setShortcutStatus] = useState("");

  useEffect(() => {
    if (!settingsOpen) return;
    getGlobalShortcut()
      .then(setShortcut)
      .catch((error) => setShortcutStatus(String(error)));
  }, [settingsOpen]);

  const allTags = Array.from(
    new Set(state.notes.flatMap((note) => note.tags))
  ).sort();

  async function handleNewNote() {
    const now = Math.floor(Date.now() / 1000);
    try {
      await saveNote({
        id: "",
        title: "新便签",
        content_markdown: "",
        content_html: null,
        tags: [],
        color: null,
        created_at: now,
        updated_at: now,
      });
    } catch (error) {
      alert("创建便签失败: " + String(error));
    }
  }

  function captureShortcut(event: React.KeyboardEvent<HTMLInputElement>) {
    event.preventDefault();
    const key = event.key;
    if (["Control", "Shift", "Alt", "Meta"].includes(key)) return;

    const parts: string[] = [];
    if (event.metaKey) parts.push("Cmd");
    if (event.ctrlKey) parts.push("Ctrl");
    if (event.altKey) parts.push("Alt");
    if (event.shiftKey) parts.push("Shift");

    const normalizedKey = event.code.startsWith("Key")
      ? event.code.slice(3)
      : event.code.startsWith("Digit")
        ? event.code.slice(5)
        : key === " "
          ? "Space"
          : key;
    parts.push(normalizedKey);
    setShortcut(parts.join("+"));
    setShortcutStatus("");
  }

  async function applyShortcut() {
    setShortcutStatus("正在应用...");
    try {
      const savedShortcut = await setGlobalShortcut(shortcut);
      setShortcut(savedShortcut);
      setShortcutStatus("已应用");
    } catch (error) {
      setShortcutStatus(`设置失败：${String(error)}`);
    }
  }

  return (
    <aside
      className="flex h-full w-[252px] flex-none flex-col px-3 py-4"
      style={{ background: "var(--md-surface-container-low)" }}
    >
      <div className="flex h-12 items-center gap-3 px-3">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl"
          style={{
            background: "var(--md-primary-container)",
            color: "var(--md-on-primary-container)",
          }}
        >
          <StickyNote className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="text-base font-semibold">ClipBridge</div>
          <div
            className="text-xs"
            style={{ color: "var(--md-on-surface-variant)" }}
          >
            便签工作区
          </div>
        </div>
      </div>

      <button onClick={handleNewNote} className="md-filled-button mx-2 mt-4">
        <Plus className="h-5 w-5" />
        <span>新建便签</span>
      </button>

      <nav className="mt-5 min-h-0 flex-1 overflow-y-auto px-1">
        <div
          className="mb-2 px-4 text-xs font-semibold"
          style={{ color: "var(--md-on-surface-variant)" }}
        >
          便签
        </div>
        <button
          onClick={() => onSelectTag(null)}
          className={`md-nav-item ${selectedTag === null ? "active" : ""}`}
        >
          <StickyNote className="h-5 w-5" />
          <span className="flex-1 text-left">全部便签</span>
          <span className="text-xs">{state.notes.length}</span>
        </button>

        <div
          className="mb-2 mt-5 flex items-center gap-2 px-4 text-xs font-semibold"
          style={{ color: "var(--md-on-surface-variant)" }}
        >
          <Hash className="h-4 w-4" />
          <span>标签</span>
        </div>
        {allTags.length === 0 ? (
          <div
            className="px-4 py-2 text-xs"
            style={{ color: "var(--md-on-surface-variant)" }}
          >
            暂无标签
          </div>
        ) : (
          allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => onSelectTag(tag === selectedTag ? null : tag)}
              className={`md-nav-item ${tag === selectedTag ? "active" : ""}`}
            >
              <Hash className="h-4 w-4" />
              <span className="truncate">{tag}</span>
            </button>
          ))
        )}

        <div
          className="mb-3 mt-5 flex items-center gap-2 px-4 text-xs font-semibold"
          style={{ color: "var(--md-on-surface-variant)" }}
        >
          <Palette className="h-4 w-4" />
          <span>便签颜色</span>
        </div>
        <div className="flex flex-wrap gap-2 px-4">
          {NOTE_COLORS.map((color) => (
            <button
              key={color.value}
              onClick={() =>
                onSelectColor(
                  color.value === selectedColor ? null : color.value
                )
              }
              className="h-7 w-7 rounded-full transition-transform hover:scale-110"
              style={{
                background: color.value,
                boxShadow:
                  color.value === selectedColor
                    ? "0 0 0 2px var(--md-surface-container-low), 0 0 0 4px var(--md-primary)"
                    : "0 0 0 1px var(--md-outline-variant)",
              }}
              title={color.name}
            />
          ))}
        </div>
      </nav>

      {settingsOpen && (
        <section
          className="mx-1 mb-2 max-h-[430px] overflow-y-auto rounded-xl p-3"
          style={{ background: "var(--md-surface-container)" }}
        >
          <div className="mb-3 flex items-center justify-between">
            <span className="font-semibold">外观与快捷键</span>
            <button
              onClick={() => setSettingsOpen(false)}
              className="md-icon-button !h-8 !w-8 !flex-[0_0_32px]"
              title="关闭设置"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div
            className="mb-2 text-xs font-semibold"
            style={{ color: "var(--md-on-surface-variant)" }}
          >
            显示模式
          </div>
          <div
            className="grid grid-cols-3 rounded-full p-1"
            style={{ background: "var(--md-surface-container-highest)" }}
          >
            {THEME_MODES.map(({ mode: itemMode, label, icon: Icon }) => (
              <button
                key={itemMode}
                onClick={() => setMode(itemMode)}
                className="flex h-9 items-center justify-center gap-1 rounded-full text-xs font-medium"
                style={
                  mode === itemMode
                    ? {
                        background: "var(--md-secondary-container)",
                        color: "var(--md-on-secondary-container)",
                      }
                    : { color: "var(--md-on-surface-variant)" }
                }
                title={label}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </button>
            ))}
          </div>

          <div
            className="mb-2 mt-4 text-xs font-semibold"
            style={{ color: "var(--md-on-surface-variant)" }}
          >
            主色
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {PRIMARY_PRESETS.map((color) => (
              <button
                key={color}
                onClick={() => setPrimaryColor(color)}
                className="h-7 w-7 rounded-full"
                style={{
                  background: color,
                  boxShadow:
                    primaryColor.toLowerCase() === color
                      ? "0 0 0 2px var(--md-surface-container), 0 0 0 4px var(--md-on-surface)"
                      : "none",
                }}
                title={color}
              />
            ))}
            <label
              className="relative flex h-8 w-8 cursor-pointer items-center justify-center rounded-full"
              style={{ background: "var(--md-surface-container-highest)" }}
              title="自定义主色"
            >
              <Palette className="h-4 w-4" />
              <input
                type="color"
                value={primaryColor}
                onChange={(event) => setPrimaryColor(event.target.value)}
                className="absolute inset-0 cursor-pointer opacity-0"
              />
            </label>
          </div>

          <div
            className="mb-2 mt-4 text-xs font-semibold"
            style={{ color: "var(--md-on-surface-variant)" }}
          >
            全局快捷键
          </div>
          <div className="relative">
            <Keyboard
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
              style={{ color: "var(--md-on-surface-variant)" }}
            />
            <input
              value={shortcut}
              onKeyDown={captureShortcut}
              readOnly
              aria-label="全局快捷键"
              className="md-field !pl-10"
            />
          </div>
          <button onClick={applyShortcut} className="md-tonal-button mt-3 w-full">
            <Check className="h-4 w-4" />
            <span>应用快捷键</span>
          </button>
          {shortcutStatus && (
            <p
              className="mt-2 break-words text-xs"
              style={{ color: "var(--md-on-surface-variant)" }}
            >
              {shortcutStatus}
            </p>
          )}
        </section>
      )}

      <button
        onClick={() => setSettingsOpen((open) => !open)}
        className={`md-nav-item ${settingsOpen ? "active" : ""}`}
      >
        <Settings className="h-5 w-5" />
        <span>设置</span>
      </button>
    </aside>
  );
}
