import { Check, Hash, Keyboard, Palette, Plus, Settings, X } from "lucide-react";
import { useApp } from "../context/AppContext";
import { useEffect, useState } from "react";

const PRESET_COLORS = [
  { name: "黄", value: "#fef3c7", class: "bg-yellow-100" },
  { name: "绿", value: "#d1fae5", class: "bg-green-100" },
  { name: "蓝", value: "#dbeafe", class: "bg-blue-100" },
  { name: "紫", value: "#f3e8ff", class: "bg-purple-100" },
  { name: "红", value: "#fee2e2", class: "bg-red-100" },
  { name: "灰", value: "#f3f4f6", class: "bg-gray-100" },
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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [shortcut, setShortcut] = useState("Alt+V");
  const [shortcutStatus, setShortcutStatus] = useState("");

  useEffect(() => {
    if (!settingsOpen) return;

    getGlobalShortcut()
      .then(setShortcut)
      .catch((error) => setShortcutStatus(String(error)));
  }, [settingsOpen]);

  // Extract unique tags from notes
  const allTags = Array.from(
    new Set(state.notes.flatMap((note) => note.tags))
  ).sort();

  async function handleNewNote() {
    console.log("[Sidebar] Creating new note...");
    const newNote = {
      id: "",
      title: "新便签",
      content_markdown: "",
      content_html: null,
      tags: [],
      color: null,
      created_at: Math.floor(Date.now() / 1000),
      updated_at: Math.floor(Date.now() / 1000),
    };
    try {
      const id = await saveNote(newNote);
      console.log("[Sidebar] Note created:", id);
    } catch (error) {
      console.error("[Sidebar] Failed to create note:", error);
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
    <div className="w-56 bg-gray-50 border-r border-gray-200 flex flex-col">
      {/* New Note Button */}
      <div className="p-4">
        <button
          onClick={handleNewNote}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>新建便签</span>
        </button>
      </div>

      {/* Tags Section */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-2">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <Hash className="w-4 h-4" />
            <span>标签</span>
          </div>
          <div className="space-y-1">
            <button
              onClick={() => onSelectTag(null)}
              className={`w-full text-left px-3 py-1.5 rounded-md text-sm transition-colors ${
                selectedTag === null
                  ? "bg-primary-100 text-primary-700"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              全部
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => onSelectTag(tag === selectedTag ? null : tag)}
                className={`w-full text-left px-3 py-1.5 rounded-md text-sm transition-colors ${
                  tag === selectedTag
                    ? "bg-primary-100 text-primary-700"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                #{tag}
              </button>
            ))}
          </div>
        </div>

        {/* Colors Section */}
        <div className="px-4 py-2 mt-4">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <Palette className="w-4 h-4" />
            <span>颜色</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {PRESET_COLORS.map((color) => (
              <button
                key={color.value}
                onClick={() =>
                  onSelectColor(
                    color.value === selectedColor ? null : color.value
                  )
                }
                className={`w-6 h-6 rounded-full ${color.class} border-2 transition-all ${
                  color.value === selectedColor
                    ? "border-gray-800 scale-110"
                    : "border-transparent hover:border-gray-400"
                }`}
                title={color.name}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        {settingsOpen && (
          <div className="mb-3 border border-gray-200 bg-white p-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Keyboard className="h-4 w-4" />
                <span>调出剪贴板</span>
              </div>
              <button
                onClick={() => setSettingsOpen(false)}
                className="btn-icon"
                title="关闭设置"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <input
              value={shortcut}
              onKeyDown={captureShortcut}
              readOnly
              aria-label="全局快捷键"
              className="w-full border border-gray-200 bg-gray-50 px-2.5 py-2 text-sm outline-none focus:border-primary-500"
            />
            <p className="mt-1.5 text-xs text-gray-400">
              点击输入框后直接按组合键
            </p>
            <button
              onClick={applyShortcut}
              className="mt-2 flex w-full items-center justify-center gap-2 bg-primary-500 px-3 py-2 text-sm text-white hover:bg-primary-600"
            >
              <Check className="h-4 w-4" />
              <span>应用快捷键</span>
            </button>
            {shortcutStatus && (
              <p className="mt-2 break-words text-xs text-gray-500">{shortcutStatus}</p>
            )}
          </div>
        )}
        <button
          onClick={() => setSettingsOpen((open) => !open)}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <Settings className="w-4 h-4" />
          <span>设置</span>
        </button>
      </div>
    </div>
  );
}
