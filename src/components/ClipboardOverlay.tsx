import { useState, useEffect, useRef } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Search, Pin, FileText, Image as ImageIcon } from "lucide-react";
import { useApp, ClipboardItem } from "../context/AppContext";

export default function ClipboardOverlay() {
  const { state, copyClipboardItem, pinToNote } = useApp();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [feedback, setFeedback] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filteredItems = state.clipboardHistory.filter((item) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      item.content_text?.toLowerCase().includes(query) ||
      item.source_app.toLowerCase().includes(query)
    );
  });

  // Focus input on mount
  useEffect(() => {
    setTimeout(() => {
      inputRef.current?.focus();
      console.log("[Overlay] Focused input");
    }, 50);
    setSelectedIndex(0);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      console.log("[Overlay] Key pressed:", e.key);

      if (e.key === "Escape") {
        e.preventDefault();
        hideWindow();
        return;
      }

      if (filteredItems.length === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => {
          const next = Math.min(prev + 1, filteredItems.length - 1);
          scrollToIndex(next);
          return next;
        });
        return;
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => {
          const next = Math.max(prev - 1, 0);
          scrollToIndex(next);
          return next;
        });
        return;
      }

      if (e.key === "Enter") {
        e.preventDefault();
        console.log("[Overlay] Enter pressed, selected:", selectedIndex);
        const item = filteredItems[selectedIndex];
        if (item) {
          doCopy(item);
        }
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [filteredItems, selectedIndex]);

  const scrollToIndex = (index: number) => {
    const element = document.getElementById(`clip-item-${index}`);
    element?.scrollIntoView({ block: "nearest" });
  };

  const doCopy = async (item: ClipboardItem) => {
    console.log("[Overlay] Copying:", item.id);
    try {
      await copyClipboardItem(item.id);
      setFeedback("已复制!");
      setTimeout(() => hideWindow(), 100);
    } catch (err) {
      console.error("[Overlay] Copy failed:", err);
      setFeedback("复制失败");
    }
  };

  const doPin = async (e: React.MouseEvent, item: ClipboardItem) => {
    e.stopPropagation();
    if (item.is_pinned) return;
    console.log("[Overlay] Pinning:", item.id);
    try {
      await pinToNote(item.id);
      setFeedback("已钉住!");
    } catch (err) {
      console.error("[Overlay] Pin failed:", err);
    }
  };

  const hideWindow = async () => {
    const win = getCurrentWindow();
    await win.hide();
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "Image": return <ImageIcon className="w-4 h-4 text-purple-500" />;
      case "File": return <FileText className="w-4 h-4 text-blue-500" />;
      default: return <FileText className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <div className="h-screen flex flex-col bg-white/95 backdrop-blur">
      {/* Header */}
      <div className="p-3 border-b border-gray-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="搜索剪贴板..."
            className="w-full pl-9 pr-3 py-2 bg-gray-100 border-0 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Feedback */}
      {feedback && (
        <div className="px-3 py-1 bg-green-100 text-green-700 text-xs text-center">
          {feedback}
        </div>
      )}

      {/* List */}
      <div ref={listRef} className="flex-1 overflow-y-auto">
        {filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <p className="text-sm">暂无记录</p>
          </div>
        ) : (
          filteredItems.map((item, index) => {
            const isSelected = index === selectedIndex;
            const text = item.content_text?.slice(0, 60).replace(/\n/g, " ") || "(图片/文件)";

            return (
              <div
                key={item.id}
                id={`clip-item-${index}`}
                onClick={() => {
                  setSelectedIndex(index);
                  doCopy(item);
                }}
                className={`flex items-start gap-3 px-3 py-3 cursor-pointer border-b border-gray-100 transition-colors ${
                  isSelected ? "bg-blue-50" : "hover:bg-gray-50"
                }`}
              >
                <div className="flex-shrink-0 mt-0.5">{getIcon(item.item_type)}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-800 truncate">{text}</div>
                  <div className="text-xs text-gray-400 mt-1 flex items-center gap-2">
                    <span>{item.source_app || "Unknown"}</span>
                    <span>·</span>
                    <span>{formatTime(item.created_at)}</span>
                  </div>
                </div>
                <button
                  onClick={(e) => doPin(e, item)}
                  disabled={item.is_pinned}
                  className={`flex-shrink-0 p-1.5 rounded-md transition-colors ${
                    isSelected || item.is_pinned ? "opacity-100" : "opacity-0 hover:opacity-100"
                  } ${
                    item.is_pinned
                      ? "text-primary-600"
                      : "hover:bg-blue-100 hover:text-blue-600"
                  }`}
                  title={item.is_pinned ? "已转为便签" : "钉住到便签"}
                >
                  <Pin className={`w-4 h-4 ${item.is_pinned ? "fill-current" : ""}`} />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-2 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>
            {filteredItems.length} 条 · 选中 #{selectedIndex + 1}
          </span>
          <span>↑↓ 选择 · Enter 复制 · Esc 关闭</span>
        </div>
      </div>
    </div>
  );
}
