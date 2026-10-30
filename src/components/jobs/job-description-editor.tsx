"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "@tiptap/markdown";
import { ListIcon, ListOrderedIcon } from "@solar-icons/react/linear";
import { Button } from "@/components/ui/button";

export function JobDescriptionEditor({
  value,
  onChange,
  onBlur,
  invalid,
}: {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  invalid?: boolean;
}) {
  const editor = useEditor({
    extensions: [StarterKit, Markdown],
    content: value,
    contentType: "markdown",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        id: "description",
        "aria-label": "Job description",
        "aria-invalid": invalid ? "true" : "false",
        class:
          "min-h-64 max-h-[45vh] overflow-y-auto px-4 py-3 text-sm leading-7 outline-none [&_h2]:mt-4 [&_h2]:text-base [&_h2]:font-semibold [&_h3]:mt-3 [&_h3]:font-semibold [&_ol]:ml-5 [&_ol]:list-decimal [&_ul]:ml-5 [&_ul]:list-disc [&_p]:min-h-5",
      },
    },
    onUpdate: ({ editor: current }) => onChange(current.getMarkdown()),
    onBlur,
  });

  if (!editor) return <div className="min-h-64" />;

  return (
    <div className="overflow-hidden rounded-md border border-border bg-white focus-within:border-primary">
      <div
        role="toolbar"
        aria-label="Job description formatting"
        className="flex flex-wrap items-center gap-1 border-b border-border bg-[#F8F8F8] p-1.5"
      >
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs"
          aria-label="Paragraph"
          aria-pressed={editor.isActive("paragraph")}
          onClick={() => editor.chain().focus().setParagraph().run()}
        >
          Text
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs"
          aria-label="Heading"
          aria-pressed={editor.isActive("heading", { level: 2 })}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
        >
          Heading
        </Button>
        <span className="mx-1 h-4 w-px bg-border" aria-hidden="true" />
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="size-7 font-bold"
          aria-label="Bold"
          aria-pressed={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          B
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="size-7 italic"
          aria-label="Italic"
          aria-pressed={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          I
        </Button>
        <span className="mx-1 h-4 w-px bg-border" aria-hidden="true" />
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="size-7"
          aria-label="Bulleted list"
          aria-pressed={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <ListIcon size={16} aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="size-7"
          aria-label="Numbered list"
          aria-pressed={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrderedIcon size={16} aria-hidden="true" />
        </Button>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
