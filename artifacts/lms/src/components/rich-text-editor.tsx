import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import { useEffect, useCallback } from "react";
import { Bold, List, Link2, Link2Off } from "lucide-react";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
}

export function RichTextEditor({ value, onChange, placeholder = "Write something…", minHeight = "120px" }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: false, codeBlock: false, code: false, horizontalRule: false, blockquote: false }),
      Link.configure({ openOnClick: false, HTMLAttributes: { class: "text-primary underline cursor-pointer", target: "_blank", rel: "noopener noreferrer" } }),
    ],
    content: value || "",
    onUpdate: ({ editor }) => {
      const html = editor.isEmpty ? "" : editor.getHTML();
      onChange(html);
    },
    editorProps: {
      attributes: {
        class: "outline-none w-full",
        style: `min-height: ${minHeight}; padding: 0.625rem 0.75rem;`,
      },
    },
  });

  // Sync external value changes (e.g. form reset)
  useEffect(() => {
    if (!editor) return;
    const current = editor.isEmpty ? "" : editor.getHTML();
    if (current !== value) {
      editor.commands.setContent(value || "", false);
    }
  }, [value, editor]);

  const insertLink = useCallback(() => {
    if (!editor) return;
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Enter URL:", prev ?? "https://");
    if (url === null) return;
    if (url.trim() === "") {
      editor.chain().focus().unsetLink().run();
    } else {
      editor.chain().focus().setLink({ href: url.trim() }).run();
    }
  }, [editor]);

  if (!editor) return null;

  const btn = (active: boolean) =>
    `p-1.5 rounded text-sm transition-colors ${active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`;

  return (
    <div className="border border-input rounded-md overflow-hidden bg-background focus-within:ring-1 focus-within:ring-ring">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-input bg-muted/40">
        <button
          type="button"
          title="Bold"
          className={btn(editor.isActive("bold"))}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          title="Bullet list"
          className={btn(editor.isActive("bulletList"))}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          title="Insert / edit link"
          className={btn(editor.isActive("link"))}
          onClick={insertLink}
        >
          <Link2 className="w-3.5 h-3.5" />
        </button>
        {editor.isActive("link") && (
          <button
            type="button"
            title="Remove link"
            className={btn(false)}
            onClick={() => editor.chain().focus().unsetLink().run()}
          >
            <Link2Off className="w-3.5 h-3.5" />
          </button>
        )}
        <span className="ml-auto text-[10px] text-muted-foreground/50 select-none pr-1">
          Enter = new line · Shift+Enter = line break
        </span>
      </div>

      {/* Editor area */}
      <div
        className="text-sm text-foreground leading-relaxed relative"
        onClick={() => editor.commands.focus()}
      >
        {editor.isEmpty && (
          <span className="absolute top-[10px] left-3 text-muted-foreground/50 text-sm pointer-events-none select-none">
            {placeholder}
          </span>
        )}
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
