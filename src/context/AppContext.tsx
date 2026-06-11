import { createContext, useContext, useReducer, ReactNode, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

export interface ClipboardItem {
  id: string;
  item_type: "Text" | "RichText" | "Image" | "File";
  content_text: string | null;
  content_html: string | null;
  image_path: string | null;
  file_path: string | null;
  source_app: string;
  created_at: number;
  is_pinned: boolean;
}

export interface Note {
  id: string;
  title: string;
  content_markdown: string;
  content_html: string | null;
  tags: string[];
  color: string | null;
  created_at: number;
  updated_at: number;
}

interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}

interface AppState {
  clipboardHistory: ClipboardItem[];
  notes: Note[];
  selectedNote: Note | null;
  searchQuery: string;
  isLoading: boolean;
  error: string | null;
}

type AppAction =
  | { type: "SET_CLIPBOARD_HISTORY"; payload: ClipboardItem[] }
  | { type: "ADD_CLIPBOARD_ITEM"; payload: ClipboardItem }
  | { type: "PIN_CLIPBOARD_ITEM"; payload: string }
  | { type: "SET_NOTES"; payload: Note[] }
  | { type: "ADD_NOTE"; payload: Note }
  | { type: "UPDATE_NOTE"; payload: Note }
  | { type: "DELETE_NOTE"; payload: string }
  | { type: "SELECT_NOTE"; payload: Note | null }
  | { type: "SET_SEARCH_QUERY"; payload: string }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null };

const initialState: AppState = {
  clipboardHistory: [],
  notes: [],
  selectedNote: null,
  searchQuery: "",
  isLoading: false,
  error: null,
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "SET_CLIPBOARD_HISTORY":
      return { ...state, clipboardHistory: action.payload };
    case "ADD_CLIPBOARD_ITEM":
      return {
        ...state,
        clipboardHistory: [action.payload, ...state.clipboardHistory.slice(0, 99)],
      };
    case "PIN_CLIPBOARD_ITEM":
      return {
        ...state,
        clipboardHistory: state.clipboardHistory.map((item) =>
          item.id === action.payload ? { ...item, is_pinned: true } : item
        ),
      };
    case "SET_NOTES":
      return { ...state, notes: action.payload };
    case "ADD_NOTE":
      return { ...state, notes: [action.payload, ...state.notes] };
    case "UPDATE_NOTE":
      return {
        ...state,
        notes: state.notes.map((n) =>
          n.id === action.payload.id ? action.payload : n
        ),
        selectedNote:
          state.selectedNote?.id === action.payload.id
            ? action.payload
            : state.selectedNote,
      };
    case "DELETE_NOTE":
      return {
        ...state,
        notes: state.notes.filter((n) => n.id !== action.payload),
        selectedNote:
          state.selectedNote?.id === action.payload ? null : state.selectedNote,
      };
    case "SELECT_NOTE":
      return { ...state, selectedNote: action.payload };
    case "SET_SEARCH_QUERY":
      return { ...state, searchQuery: action.payload };
    case "SET_LOADING":
      return { ...state, isLoading: action.payload };
    case "SET_ERROR":
      return { ...state, error: action.payload };
    default:
      return state;
  }
}

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  refreshClipboardHistory: () => Promise<void>;
  refreshNotes: () => Promise<void>;
  copyToClipboard: (content: string) => Promise<void>;
  copyClipboardItem: (itemId: string) => Promise<void>;
  pinToNote: (itemId: string) => Promise<string>;
  saveNote: (note: Note) => Promise<string>;
  deleteNote: (noteId: string) => Promise<void>;
  getGlobalShortcut: () => Promise<string>;
  setGlobalShortcut: (shortcut: string) => Promise<string>;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Listen for new clipboard items from backend
  useEffect(() => {
    const unlisten = listen<ClipboardItem>("clipboard:new-item", (event) => {
      dispatch({ type: "ADD_CLIPBOARD_ITEM", payload: event.payload });
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  // Initial data load
  useEffect(() => {
    refreshClipboardHistory();
    refreshNotes();
  }, []);

  async function refreshClipboardHistory() {
    dispatch({ type: "SET_LOADING", payload: true });
    try {
      const response = await invoke<ApiResponse<ClipboardItem[]>>(
        "get_clipboard_history",
        { limit: 100 }
      );
      if (response.success && response.data) {
        dispatch({ type: "SET_CLIPBOARD_HISTORY", payload: response.data });
      }
    } catch (error) {
      dispatch({ type: "SET_ERROR", payload: String(error) });
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  }

  async function refreshNotes() {
    try {
      const response = await invoke<ApiResponse<Note[]>>("get_notes", {
        tag: null,
        color: null,
      });
      if (response.success && response.data) {
        dispatch({ type: "SET_NOTES", payload: response.data });
      }
    } catch (error) {
      dispatch({ type: "SET_ERROR", payload: String(error) });
    }
  }

  async function copyToClipboard(content: string) {
    try {
      const response = await invoke<ApiResponse<null>>("copy_to_clipboard", {
        content,
      });
      if (!response.success) {
        throw new Error(response.error || "Failed to copy to clipboard");
      }
    } catch (error) {
      dispatch({ type: "SET_ERROR", payload: String(error) });
      throw error;
    }
  }

  async function copyClipboardItem(itemId: string) {
    const response = await invoke<ApiResponse<null>>("copy_clipboard_item", {
      itemId,
    });
    if (!response.success) {
      throw new Error(response.error || "Failed to copy clipboard item");
    }
  }

  async function pinToNote(itemId: string): Promise<string> {
    try {
      const response = await invoke<ApiResponse<string>>("pin_to_note", {
        itemId,
      });
      if (response.success && response.data) {
        dispatch({ type: "PIN_CLIPBOARD_ITEM", payload: itemId });
        await refreshNotes();
        return response.data;
      }
      throw new Error(response.error || "Failed to pin to note");
    } catch (error) {
      dispatch({ type: "SET_ERROR", payload: String(error) });
      throw error;
    }
  }

  async function saveNote(note: Note): Promise<string> {
    console.log("[AppContext] saveNote called:", note);
    try {
      const response = await invoke<ApiResponse<string>>("save_note", {
        note,
      });
      console.log("[AppContext] save_note response:", response);
      if (response.success && response.data) {
        if (note.id) {
          dispatch({ type: "UPDATE_NOTE", payload: { ...note, id: response.data } });
        } else {
          dispatch({
            type: "ADD_NOTE",
            payload: { ...note, id: response.data },
          });
        }
        await refreshNotes();
        return response.data;
      }
      throw new Error(response.error || "Failed to save note");
    } catch (error) {
      dispatch({ type: "SET_ERROR", payload: String(error) });
      throw error;
    }
  }

  async function deleteNote(noteId: string) {
    try {
      const response = await invoke<ApiResponse<null>>("delete_note", {
        noteId,
      });
      if (response.success) {
        dispatch({ type: "DELETE_NOTE", payload: noteId });
      } else {
        throw new Error(response.error || "Failed to delete note");
      }
    } catch (error) {
      dispatch({ type: "SET_ERROR", payload: String(error) });
      throw error;
    }
  }

  async function getGlobalShortcut(): Promise<string> {
    const response = await invoke<ApiResponse<string>>("get_global_shortcut");
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.error || "Failed to get global shortcut");
  }

  async function setGlobalShortcut(shortcut: string): Promise<string> {
    const response = await invoke<ApiResponse<string>>("set_global_shortcut", {
      shortcutValue: shortcut,
    });
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.error || "Failed to set global shortcut");
  }

  return (
    <AppContext.Provider
      value={{
        state,
        dispatch,
        refreshClipboardHistory,
        refreshNotes,
        copyToClipboard,
        copyClipboardItem,
        pinToNote,
        saveNote,
        deleteNote,
        getGlobalShortcut,
        setGlobalShortcut,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within AppProvider");
  }
  return context;
}
