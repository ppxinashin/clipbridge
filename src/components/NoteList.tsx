import { List, Grid, Search, Copy, Trash2 } from "lucide-react";
import { Note } from "../context/AppContext";
import { useApp } from "../context/AppContext";
import { useState } from "react";

interface NoteListProps {
  notes: Note[];
  selectedNote: Note | null;
  onSelectNote: (note: Note) => void;
  viewMode: "list" | "grid";
  onChangeViewMode: (mode: "list" | "grid") => void;
}

const PRESET_COLORS: Record<string, string> = {
  "#fef3c7": "bg-yellow-100 border-yellow-200",
  "#d1fae5": "bg-green-100 border-green-200",
  "#dbeafe": "bg-blue-100 border-blue-200",
  "#f3e8ff": "bg-purple-100 border-purple-200",
  "#fee2e2": "bg-red-100 border-red-200",
  "#f3f4f6": "bg-gray-100 border-gray-200",
};

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

  function formatDate(timestamp: number): string {
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString("zh-CN", {
      month: "short",
      day: "numeric",
    });
  }

  function getNotePreview(note: Note): string {
    return note.content_markdown.slice(0, 100).replace(/#/g, "").trim() || "...";
  }

  function getNoteColorClass(color: string | null): string {
    if (!color) return "bg-white border-gray-200";
    return PRESET_COLORS[color] || "bg-white border-gray-200";
  }

  async function handleCopyNote(e: React.MouseEvent, note: Note) {
    e.stopPropagation();
    await copyToClipboard(note.content_markdown);
  }

  async function handleDeleteNote(e: React.MouseEvent, noteId: string) {
    e.stopPropagation();
    if (confirm("确定要删除这个便签吗？")) {
      await deleteNote(noteId);
    }
  }

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-700">
            便签 ({filteredNotes.length})
          </h2>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onChangeViewMode("list")}
              className={`p-1.5 rounded ${
                viewMode === "list" ? "bg-gray-100 text-gray-700" : "text-gray-400"
              }`}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => onChangeViewMode("grid")}
              className={`p-1.5 rounded ${
                viewMode === "grid" ? "bg-gray-100 text-gray-700" : "text-gray-400"
              }`}
            >
              <Grid className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索便签..."
            className="w-full pl-9 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>
      </div>

      {/* Note List */}
      <div className="flex-1 overflow-y-auto">
        {viewMode === "list" ? (
          <div className="divide-y divide-gray-100">
            {filteredNotes.map((note) => (
              <div
                key={note.id}
                onClick={() => onSelectNote(note)}
                className={`p-3 cursor-pointer transition-colors ${
                  selectedNote?.id === note.id ? "bg-primary-50" : "hover:bg-gray-50"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-gray-800 truncate">
                      {note.title}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                      {getNotePreview(note)}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      {note.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="text-xs text-primary-600 bg-primary-50 px-1.5 py-0.5 rounded"
                        >
                          #{tag}
                        </span>
                      ))}
                      <span className="text-xs text-gray-400">
                        {formatDate(note.updated_at)}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={(e) => handleCopyNote(e, note)}
                      className="btn-icon"
                      title="复制全文"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => handleDeleteNote(e, note.id)}
                      className="btn-icon text-red-400 hover:text-red-600 hover:bg-red-50"
                      title="删除"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 grid grid-cols-2 gap-3">
            {filteredNotes.map((note) => (
              <div
                key={note.id}
                onClick={() => onSelectNote(note)}
                className={`note-card ${getNoteColorClass(note.color)} ${
                  selectedNote?.id === note.id ? "ring-2 ring-primary-500" : ""
                }`}
              >
                <h3 className="text-sm font-medium text-gray-800 line-clamp-1">
                  {note.title}
                </h3>
                <p className="text-xs text-gray-500 mt-2 line-clamp-3">
                  {getNotePreview(note)}
                </p>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs text-gray-400">
                    {formatDate(note.updated_at)}
                  </span>
                  {note.tags.length > 0 && (
                    <span className="text-xs text-primary-600 bg-primary-50 px-1.5 py-0.5 rounded">
                      #{note.tags[0]}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {filteredNotes.length === 0 && (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400">
            <p className="text-sm">没有找到便签</p>
          </div>
        )}
      </div>
    </div>
  );
}
