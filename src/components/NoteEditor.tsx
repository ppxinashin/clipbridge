import { useState, useEffect, useCallback, useRef } from "react";
import { marked } from "marked";
import hljs from "highlight.js/lib/core";
import bash from "highlight.js/lib/languages/bash";
import css from "highlight.js/lib/languages/css";
import javascript from "highlight.js/lib/languages/javascript";
import json from "highlight.js/lib/languages/json";
import markdown from "highlight.js/lib/languages/markdown";
import python from "highlight.js/lib/languages/python";
import rust from "highlight.js/lib/languages/rust";
import typescript from "highlight.js/lib/languages/typescript";
import xml from "highlight.js/lib/languages/xml";
import "highlight.js/styles/github.css";
import { Note } from "../context/AppContext";
import { useApp } from "../context/AppContext";
import {
  Bold,
  Clock,
  Code2,
  ImagePlus,
  Italic,
  Link,
  List,
  Save,
} from "lucide-react";

interface NoteEditorProps {
  note: Note | null;
}

hljs.registerLanguage("bash", bash);
hljs.registerLanguage("css", css);
hljs.registerLanguage("html", xml);
hljs.registerLanguage("javascript", javascript);
hljs.registerLanguage("js", javascript);
hljs.registerLanguage("json", json);
hljs.registerLanguage("markdown", markdown);
hljs.registerLanguage("md", markdown);
hljs.registerLanguage("python", python);
hljs.registerLanguage("py", python);
hljs.registerLanguage("rust", rust);
hljs.registerLanguage("typescript", typescript);
hljs.registerLanguage("ts", typescript);
hljs.registerLanguage("xml", xml);

const renderer = new marked.Renderer();
renderer.code = (code, languageInfo) => {
  const language = languageInfo?.trim().match(/^[\w-]+/)?.[0];
  const highlighted =
    language && hljs.getLanguage(language)
      ? hljs.highlight(code, { language }).value
      : hljs.highlightAuto(code).value;
  const languageClass = language ? ` class="language-${language}"` : "";
  return `<pre><code${languageClass}>${highlighted}</code></pre>`;
};

marked.setOptions({
  gfm: true,
  breaks: true,
  renderer,
});

const PRESET_COLORS = [
  { name: "无", value: null, class: "bg-white" },
  { name: "黄", value: "#fef3c7", class: "bg-yellow-100" },
  { name: "绿", value: "#d1fae5", class: "bg-green-100" },
  { name: "蓝", value: "#dbeafe", class: "bg-blue-100" },
  { name: "紫", value: "#f3e8ff", class: "bg-purple-100" },
  { name: "红", value: "#fee2e2", class: "bg-red-100" },
  { name: "灰", value: "#f3f4f6", class: "bg-gray-100" },
];

export default function NoteEditor({ note }: NoteEditorProps) {
  const { saveNote } = useApp();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [color, setColor] = useState<string | null>(null);
  const [tags, setTags] = useState<string>("");
  const [html, setHtml] = useState("");
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Load note data when selection changes
  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setContent(note.content_markdown);
      setColor(note.color);
      setTags(note.tags.join(", "));
      setLastSaved(new Date(note.updated_at * 1000));
    } else {
      setTitle("");
      setContent("");
      setColor(null);
      setTags("");
      setLastSaved(null);
    }
  }, [note?.id]);

  // Render markdown preview
  useEffect(() => {
    const renderMarkdown = async () => {
      try {
        const rendered = await marked.parse(content);
        setHtml(rendered);
      } catch (error) {
        console.error("Markdown render error:", error);
      }
    };
    renderMarkdown();
  }, [content]);

  // Auto-save with debounce
  useEffect(() => {
    if (!note) return;

    const timeout = setTimeout(() => {
      handleSave();
    }, 1000);

    return () => clearTimeout(timeout);
  }, [title, content, color, tags]);

  const handleSave = useCallback(async () => {
    if (!note) return;

    setIsSaving(true);
    try {
      const tagList = tags
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      const updatedNote: Note = {
        ...note,
        title: title || "Untitled",
        content_markdown: content,
        content_html: html,
        tags: tagList,
        color,
        updated_at: Math.floor(Date.now() / 1000),
      };

      await saveNote(updatedNote);
      setLastSaved(new Date());
    } catch (error) {
      console.error("Save error:", error);
    } finally {
      setIsSaving(false);
    }
  }, [note, title, content, color, tags, html, saveNote]);

  const insertMarkdown = useCallback(
    (before: string, after = "", fallback = "") => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = content.slice(start, end) || fallback;
      const insertedText = `${before}${selectedText}${after}`;
      setContent(`${content.slice(0, start)}${insertedText}${content.slice(end)}`);

      requestAnimationFrame(() => {
        textarea.focus();
        const selectionStart = start + before.length;
        textarea.setSelectionRange(selectionStart, selectionStart + selectedText.length);
      });
    },
    [content]
  );

  const insertRawMarkdown = useCallback(
    (markdownText: string) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      setContent(`${content.slice(0, start)}${markdownText}${content.slice(end)}`);

      requestAnimationFrame(() => {
        textarea.focus();
        const cursor = start + markdownText.length;
        textarea.setSelectionRange(cursor, cursor);
      });
    },
    [content]
  );

  const handleImageSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      if (!file.type.startsWith("image/")) {
        alert("请选择图片文件");
        event.target.value = "";
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result !== "string") return;
        const alt = file.name.replace(/\.[^.]+$/, "") || "图片";
        insertRawMarkdown(`![${alt}](${reader.result})`);
        event.target.value = "";
      };
      reader.onerror = () => {
        alert("读取图片失败");
        event.target.value = "";
      };
      reader.readAsDataURL(file);
    },
    [insertRawMarkdown]
  );

  if (!note) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center text-gray-400">
          <p>选择一个便签开始编辑</p>
          <p className="text-sm mt-1">或点击左侧「新建便签」</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* Toolbar */}
      <div className="px-6 py-3 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-4">
          {/* Title input */}
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="便签标题"
            className="flex-1 text-lg font-semibold outline-none placeholder-gray-300"
          />

          {/* Color selector */}
          <div className="flex items-center gap-1">
            {PRESET_COLORS.map((c) => (
              <button
                key={c.name}
                onClick={() => setColor(c.value)}
                className={`w-5 h-5 rounded-full ${c.class} border-2 ${
                  color === c.value ? "border-gray-800" : "border-transparent"
                }`}
                title={c.name}
              />
            ))}
          </div>

          {/* Save status */}
          <div className="flex items-center gap-1 text-xs text-gray-400">
            {isSaving ? (
              <>
                <Save className="w-3.5 h-3.5 animate-pulse" />
                <span>保存中...</span>
              </>
            ) : lastSaved ? (
              <>
                <Clock className="w-3.5 h-3.5" />
                <span>
                  已保存 {lastSaved.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </>
            ) : null}
          </div>
        </div>

        {/* Tags input */}
        <div className="mt-2">
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="标签，用逗号分隔 (例如: 工作, 灵感, 重要)"
            className="w-full text-sm text-gray-600 outline-none placeholder-gray-300"
          />
        </div>

        <div className="mt-3 flex items-center gap-1 border-t border-gray-100 pt-2">
          <button
            onClick={() => insertMarkdown("**", "**", "粗体")}
            className="btn-icon"
            title="粗体"
          >
            <Bold className="h-4 w-4" />
          </button>
          <button
            onClick={() => insertMarkdown("*", "*", "斜体")}
            className="btn-icon"
            title="斜体"
          >
            <Italic className="h-4 w-4" />
          </button>
          <button
            onClick={() => insertMarkdown("[", "](https://)", "链接文字")}
            className="btn-icon"
            title="链接"
          >
            <Link className="h-4 w-4" />
          </button>
          <button
            onClick={() => insertMarkdown("`", "`", "代码")}
            className="btn-icon"
            title="行内代码"
          >
            <Code2 className="h-4 w-4" />
          </button>
          <button
            onClick={() => insertMarkdown("- ", "", "列表项")}
            className="btn-icon"
            title="无序列表"
          >
            <List className="h-4 w-4" />
          </button>
          <button
            onClick={() => imageInputRef.current?.click()}
            className="btn-icon"
            title="插入图片"
          >
            <ImagePlus className="h-4 w-4" />
          </button>
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
          />
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 flex min-h-0">
        {/* Markdown input */}
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="在此输入 Markdown...\n\n支持：\n# 标题\n- 列表\n- [ ] 任务\n```代码块```\n> 引用\n[链接](url)\n| 表格 |"
          className="markdown-input"
          spellCheck={false}
        />

        {/* Preview */}
        <div
          className="markdown-preview prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </div>
  );
}
