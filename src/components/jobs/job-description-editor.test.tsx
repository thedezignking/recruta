// @vitest-environment jsdom
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "@tiptap/markdown";
import { expect, it } from "vitest";

it("renders stored Markdown as formatted editor content", () => {
  const editor = new Editor({
    extensions: [StarterKit, Markdown],
    content: "## About the role\n\nA **strong** team.",
    contentType: "markdown",
  });

  expect(editor.getHTML()).toContain("<h2>About the role</h2>");
  expect(editor.getHTML()).toContain("<strong>strong</strong>");
  expect(editor.getMarkdown()).toContain("**strong**");
  editor.destroy();
});
