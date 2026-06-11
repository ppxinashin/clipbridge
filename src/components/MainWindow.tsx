import { useState } from "react";
import Sidebar from "./Sidebar";
import NoteList from "./NoteList";
import NoteEditor from "./NoteEditor";
import { useApp } from "../context/AppContext";

export default function MainWindow() {
  const { state, dispatch } = useApp();
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  const filteredNotes = state.notes.filter((note) => {
    if (selectedTag && !note.tags.includes(selectedTag)) return false;
    if (selectedColor && note.color !== selectedColor) return false;
    return true;
  });

  return (
    <main
      className="flex h-screen min-w-[900px] overflow-hidden"
      style={{ background: "var(--md-surface)" }}
    >
      <Sidebar
        selectedTag={selectedTag}
        onSelectTag={setSelectedTag}
        selectedColor={selectedColor}
        onSelectColor={setSelectedColor}
      />

      <NoteList
        notes={filteredNotes}
        selectedNote={state.selectedNote}
        onSelectNote={(note) => dispatch({ type: "SELECT_NOTE", payload: note })}
        viewMode={viewMode}
        onChangeViewMode={setViewMode}
      />

      <NoteEditor note={state.selectedNote} />
    </main>
  );
}
