import {
  Copy,
  Grid2X2,
  List,
  Search,
  StickyNote,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { Note, useApp } from "../context/AppContext";

interface NoteListProps {
  notes: Note[];
  selectedNote: Note | null;
  onSelectNote: (note: Note) => void;
  viewMode: "list" | "grid";
  onChangeViewMode: (mode: "list" | "grid") => void;
}

export default function NoteList({
  notes,
  selectedNote,
  onSelectNote,
  viewMode,
  onChangeViewMode,
}: NoteListProps) {
  const { copyToClipboard, deleteNote } = useApp();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredNotes = notes.filter((note) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      note.title.toLowerCase().includes(query) ||
      note.content_markdown.toLowerCase().includes(query) ||
      note.tags.some((tag) => tag.toLowerCase().includes(query))
    );
  });

  function formatDate(timestamp: number) {
    return new Date(timestamp * 1000).toLocaleDateString("zh-CN", {
      month: "short",
      day: "numeric",
    });
  }

  function getNotePreview(note: Note) {
    return (
      note.content_markdown
        .replace(/!\[[^\]]*\]\([^)]*\)/g, "[图片]")
        .replace(/[#>*_`-]/g, "")
        .slice(0, 120)
        .trim() || "空白便签"
    );
  }

  function noteSurface(note: Note, selected: boolean) {
    if (selected) {
      return {
        background: "var(--md-secondary-container)",
        color: "var(--md-on-secondary-container)",
      };
    }
    if (note.color) {
      return {
        background: `${note.color}55`,
      };
    }
    return { background: "var(--md-surface-container-low)" };
  }

  async function handleCopyNote(event: React.MouseEvent, note: Note) {
    event.stopPropagation();
    await copyToClipboard(note.content_markdown);
  }

  async function handleDeleteNote(event: React.MouseEvent, noteId: string) {
    event.stopPropagation();
    if (confirm("确定要删除这个便签吗？")) {
      await deleteNote(noteId);
    }
  }

  return (
    <section
      className="flex h-full w-[344px] flex-none flex-col border-l border-r"
      style={{
        background: "var(--md-surface)",
        borderColor: "var(--md-outline-variant)",
      }}
    >
      <header className="px-4 pb-3 pt-5">
        <div className="mb-4 flex h-10 items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">便签</h1>
            <p
              className="text-xs"
              style={{ color: "var(--md-on-surface-variant)" }}
            >
              {filteredNotes.length} 条记录
            </p>
          </div>
          <div
            className="flex rounded-full p-1"
            style={{ background: "var(--md-surface-container)" }}
          >
            <button
              onClick={() => onChangeViewMode("list")}
              className={`md-icon-button !h-8 !w-8 !flex-[0_0_32px] ${
                viewMode === "list" ? "active" : ""
              }`}
              title="列表视图"
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => onChangeViewMode("grid")}
              className={`md-icon-button !h-8 !w-8 !flex-[0_0_32px] ${
                viewMode === "grid" ? "active" : ""
              }`}
              title="网格视图"
            >
              <Grid2X2 className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="relative">
          <Search
            className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2"
            style={{ color: "var(--md-on-surface-variant)" }}
          />
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="搜索便签"
            className="md-search"
          />
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
        {filteredNotes.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-6 text-center">
            <div
              className="mb-4 flex h-16 w-16 items-center justify-center rounded-full"
              style={{
                background: "var(--md-secondary-container)",
                color: "var(--md-on-secondary-container)",
              }}
            >
              <StickyNote className="h-7 w-7" />
            </div>
            <div className="font-semibold">没有找到便签</div>
            <div
              className="mt-1 text-sm"
              style={{ color: "var(--md-on-surface-variant)" }}
            >
              尝试更换关键词或筛选条件
            </div>
          </div>
        ) : viewMode === "list" ? (
          <div className="space-y-2">
            {filteredNotes.map((note) => {
              const selected = selectedNote?.id === note.id;
              return (
                <article
                  key={note.id}
                  onClick={() => onSelectNote(note)}
                  className="group cursor-pointer rounded-xl p-4 transition-[filter,box-shadow] hover:brightness-[0.98]"
                  style={{
                    ...noteSurface(note, selected),
                    boxShadow: selected
                      ? "0 1px 3px var(--md-shadow)"
                      : "none",
                  }}
                >
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <h2 className="truncate text-sm font-semibold">
                        {note.title || "无标题"}
                      </h2>
                      <p
                        className="mt-1.5 line-clamp-2 text-xs leading-5"
                        style={{ color: "var(--md-on-surface-variant)" }}
                      >
                        {getNotePreview(note)}
                      </p>
                    </div>
                    <div className="flex opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        onClick={(event) => handleCopyNote(event, note)}
                        className="md-icon-button !h-8 !w-8 !flex-[0_0_32px]"
                        title="复制全文"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(event) => handleDeleteNote(event, note.id)}
                        className="md-icon-button danger !h-8 !w-8 !flex-[0_0_32px]"
                        title="删除便签"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 flex min-w-0 items-center gap-2">
                    {note.tags.slice(0, 2).map((tag) => (
                      <span key={tag} className="md-chip !min-h-6 !px-2">
                        #{tag}
                      </span>
                    ))}
                    <span
                      className="ml-auto flex-none text-xs"
                      style={{ color: "var(--md-on-surface-variant)" }}
                    >
                      {formatDate(note.updated_at)}
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {filteredNotes.map((note) => {
              const selected = selectedNote?.id === note.id;
              return (
                <article
                  key={note.id}
                  onClick={() => onSelectNote(note)}
                  className="min-h-[156px] cursor-pointer rounded-xl p-4 transition-[filter,box-shadow] hover:brightness-[0.98]"
                  style={{
                    ...noteSurface(note, selected),
                    boxShadow: selected
                      ? "0 1px 3px var(--md-shadow)"
                      : "none",
                  }}
                >
                  <h2 className="line-clamp-1 text-sm font-semibold">
                    {note.title || "无标题"}
                  </h2>
                  <p
                    className="mt-2 line-clamp-4 text-xs leading-5"
                    style={{ color: "var(--md-on-surface-variant)" }}
                  >
                    {getNotePreview(note)}
                  </p>
                  <div
                    className="mt-3 text-xs"
                    style={{ color: "var(--md-on-surface-variant)" }}
                  >
                    {formatDate(note.updated_at)}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
