import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  Check,
  Clipboard,
  FileText,
  Image as ImageIcon,
  Moon,
  Pin,
  Search,
  Sun,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ClipboardItem, useApp } from "../context/AppContext";
import { useTheme } from "../context/ThemeContext";

export default function ClipboardOverlay() {
  const { state, copyClipboardItem, pinToNote } = useApp();
  const { resolvedMode, setMode } = useTheme();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [feedback, setFeedback] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredItems = state.clipboardHistory.filter((item) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      item.content_text?.toLowerCase().includes(query) ||
      item.source_app.toLowerCase().includes(query)
    );
  });

  useEffect(() => {
    const timer = window.setTimeout(() => inputRef.current?.focus(), 50);
    setSelectedIndex(0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        void hideWindow();
        return;
      }

      if (filteredItems.length === 0) return;

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setSelectedIndex((previous) => {
          const next = Math.min(previous + 1, filteredItems.length - 1);
          scrollToIndex(next);
          return next;
        });
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setSelectedIndex((previous) => {
          const next = Math.max(previous - 1, 0);
          scrollToIndex(next);
          return next;
        });
      } else if (event.key === "Enter") {
        event.preventDefault();
        const item = filteredItems[selectedIndex];
        if (item) void doCopy(item);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [filteredItems, selectedIndex]);

  function scrollToIndex(index: number) {
    document
      .getElementById(`clip-item-${index}`)
      ?.scrollIntoView({ block: "nearest" });
  }

  async function doCopy(item: ClipboardItem) {
    try {
      await copyClipboardItem(item.id);
      setFeedback("已复制到剪贴板");
      window.setTimeout(() => void hideWindow(), 140);
    } catch (error) {
      console.error("Copy failed:", error);
      setFeedback("复制失败");
    }
  }

  async function doPin(event: React.MouseEvent, item: ClipboardItem) {
    event.stopPropagation();
    if (item.is_pinned) return;

    try {
      await pinToNote(item.id);
      setFeedback("已转为便签");
      window.setTimeout(() => setFeedback(""), 1600);
    } catch (error) {
      console.error("Pin failed:", error);
      setFeedback("操作失败");
    }
  }

  async function hideWindow() {
    await getCurrentWindow().hide();
  }

  function formatTime(timestamp: number) {
    return new Date(timestamp * 1000).toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function getIcon(item: ClipboardItem) {
    const Icon = item.item_type === "Image" ? ImageIcon : FileText;
    return (
      <div
        className="flex h-10 w-10 flex-none items-center justify-center rounded-xl"
        style={{
          background: "var(--md-primary-container)",
          color: "var(--md-on-primary-container)",
        }}
      >
        <Icon className="h-5 w-5" />
      </div>
    );
  }

  return (
    <main
      className="flex h-screen flex-col overflow-hidden p-2"
      style={{ background: "transparent" }}
    >
      <section
        className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[20px] border"
        style={{
          background: "var(--md-surface)",
          borderColor: "var(--md-outline-variant)",
          boxShadow: "0 8px 28px var(--md-shadow)",
        }}
      >
        <header className="px-4 pb-3 pt-4">
          <div className="mb-3 flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl"
              style={{
                background: "var(--md-primary)",
                color: "var(--md-on-primary)",
              }}
            >
              <Clipboard className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-base font-semibold">剪贴板</h1>
              <p
                className="text-xs"
                style={{ color: "var(--md-on-surface-variant)" }}
              >
                {filteredItems.length} 条历史记录
              </p>
            </div>
            <button
              onClick={() => setMode(resolvedMode === "dark" ? "light" : "dark")}
              className="md-icon-button"
              title={resolvedMode === "dark" ? "切换到浅色" : "切换到深色"}
            >
              {resolvedMode === "dark" ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </button>
            <button
              onClick={() => void hideWindow()}
              className="md-icon-button"
              title="关闭"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="relative">
            <Search
              className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2"
              style={{ color: "var(--md-on-surface-variant)" }}
            />
            <input
              ref={inputRef}
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value);
                setSelectedIndex(0);
              }}
              placeholder="搜索剪贴板历史"
              className="md-search"
            />
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
          {filteredItems.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div
                className="mb-3 flex h-16 w-16 items-center justify-center rounded-full"
                style={{
                  background: "var(--md-secondary-container)",
                  color: "var(--md-on-secondary-container)",
                }}
              >
                <Clipboard className="h-7 w-7" />
              </div>
              <div className="font-semibold">暂无记录</div>
              <div
                className="mt-1 text-xs"
                style={{ color: "var(--md-on-surface-variant)" }}
              >
                复制内容后会出现在这里
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredItems.map((item, index) => {
                const selected = index === selectedIndex;
                const text =
                  item.content_text?.slice(0, 90).replace(/\n/g, " ") ||
                  (item.item_type === "Image" ? "图片" : "文件");

                return (
                  <article
                    key={item.id}
                    id={`clip-item-${index}`}
                    onMouseEnter={() => setSelectedIndex(index)}
                    onClick={() => void doCopy(item)}
                    className="group flex min-h-[72px] cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 transition-colors"
                    style={{
                      background: selected
                        ? "var(--md-secondary-container)"
                        : "transparent",
                      color: selected
                        ? "var(--md-on-secondary-container)"
                        : "var(--md-on-surface)",
                    }}
                  >
                    {getIcon(item)}
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{text}</div>
                      <div
                        className="mt-1 flex items-center gap-2 text-xs"
                        style={{ color: "var(--md-on-surface-variant)" }}
                      >
                        <span className="truncate">
                          {item.source_app || "未知应用"}
                        </span>
                        <span>·</span>
                        <span className="flex-none">
                          {formatTime(item.created_at)}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={(event) => void doPin(event, item)}
                      disabled={item.is_pinned}
                      className={`md-icon-button !h-9 !w-9 !flex-[0_0_36px] ${
                        item.is_pinned ? "active" : ""
                      }`}
                      title={item.is_pinned ? "已转为便签" : "转为便签"}
                    >
                      {item.is_pinned ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Pin className="h-4 w-4" />
                      )}
                    </button>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        <footer
          className="flex h-11 flex-none items-center justify-between border-t px-4 text-[11px]"
          style={{
            borderColor: "var(--md-outline-variant)",
            background: "var(--md-surface-container-low)",
            color: "var(--md-on-surface-variant)",
          }}
        >
          <span>↑↓ 选择</span>
          <span>Enter 复制</span>
          <span>Esc 关闭</span>
        </footer>
      </section>

      {feedback && (
        <div
          className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full px-4 py-2 text-xs font-medium"
          style={{
            background: "var(--md-inverse-surface)",
            color: "var(--md-inverse-on-surface)",
            boxShadow: "0 2px 8px var(--md-shadow)",
          }}
        >
          {feedback}
        </div>
      )}
    </main>
  );
}
