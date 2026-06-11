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
import { Note } from "../context/AppContext";
import { useApp } from "../context/AppContext";
import {
  Bold,
  Clock,
  Code2,
  FilePenLine,
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
  { name: "无", value: null },
  { name: "黄", value: "#fef3c7" },
  { name: "绿", value: "#d1fae5" },
  { name: "蓝", value: "#dbeafe" },
  { name: "紫", value: "#f3e8ff" },
  { name: "红", value: "#fee2e2" },
  { name: "灰", value: "#f3f4f6" },
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
      <section
        className="flex min-w-0 flex-1 items-center justify-center"
        style={{ background: "var(--md-surface)" }}
      >
        <div className="max-w-xs text-center">
          <div
            className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full"
            style={{
              background: "var(--md-primary-container)",
              color: "var(--md-on-primary-container)",
            }}
          >
            <FilePenLine className="h-9 w-9" />
          </div>
          <p className="text-lg font-semibold">选择一个便签</p>
          <p
            className="mt-2 text-sm"
            style={{ color: "var(--md-on-surface-variant)" }}
          >
            从列表中选择便签，或创建新的便签开始记录
          </p>
        </div>
      </section>
    );
  }

  return (
    <section
      className="flex min-w-0 flex-1 flex-col"
      style={{ background: "var(--md-surface)" }}
    >
      <header
        className="border-b px-6 pb-3 pt-5"
        style={{ borderColor: "var(--md-outline-variant)" }}
      >
        <div className="flex min-w-0 items-center gap-4">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="便签标题"
            className="min-w-0 flex-1 bg-transparent text-2xl font-semibold outline-none"
            style={{ color: "var(--md-on-surface)" }}
          />

          <div
            className="flex items-center gap-2 rounded-full px-2 py-1.5"
            style={{ background: "var(--md-surface-container)" }}
          >
            {PRESET_COLORS.map((c) => (
              <button
                key={c.name}
                onClick={() => setColor(c.value)}
                className="h-5 w-5 rounded-full transition-transform hover:scale-110"
                style={{
                  background: c.value || "var(--md-surface)",
                  boxShadow:
                    color === c.value
                      ? "0 0 0 2px var(--md-surface-container), 0 0 0 4px var(--md-primary)"
                      : "0 0 0 1px var(--md-outline-variant)",
                }}
                title={c.name}
              />
            ))}
          </div>

          <div
            className="flex min-w-[112px] items-center justify-end gap-1.5 text-xs"
            style={{ color: "var(--md-on-surface-variant)" }}
          >
            {isSaving ? (
              <>
                <Save className="h-4 w-4 animate-pulse" />
                <span>保存中...</span>
              </>
            ) : lastSaved ? (
              <>
                <Clock className="h-4 w-4" />
                <span>
                  {lastSaved.toLocaleTimeString("zh-CN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </>
            ) : null}
          </div>
        </div>

        <div className="mt-3 flex items-center gap-3">
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="添加标签，用逗号分隔"
            className="h-9 min-w-0 flex-1 rounded-full border bg-transparent px-4 text-sm outline-none"
            style={{
              borderColor: "var(--md-outline)",
              color: "var(--md-on-surface-variant)",
            }}
          />
          <div
            className="flex items-center gap-0.5 rounded-full p-1"
            style={{ background: "var(--md-surface-container)" }}
          >
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
      </header>

      <div
        className="grid h-10 grid-cols-2 border-b text-xs font-semibold"
        style={{
          borderColor: "var(--md-outline-variant)",
          color: "var(--md-on-surface-variant)",
        }}
      >
        <div className="flex items-center px-6">MARKDOWN</div>
        <div
          className="flex items-center border-l px-8"
          style={{ borderColor: "var(--md-outline-variant)" }}
        >
          预览
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="在此输入 Markdown...\n\n支持：\n# 标题\n- 列表\n- [ ] 任务\n```代码块```\n> 引用\n[链接](url)\n| 表格 |"
          className="markdown-input"
          spellCheck={false}
        />

        <div
          className="markdown-preview prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </section>
  );
}
