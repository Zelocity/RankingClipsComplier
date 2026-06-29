import { useEffect } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import { Color, TextStyle } from "@tiptap/extension-text-style";

import type { TitleDocument } from "../../utils/titleDocument";

type VideoTitleEditorProps = {
  content: TitleDocument;
  onChange: (nextDocument: TitleDocument) => void;
};

type Alignment = "left" | "center" | "right";

const colorOptions = [
  "#ffffff",
  "#ff0000",
  "#ffff00",
  "#60a5fa",
  "#4ade80",
  "#fb7185",
  "#fb923c",
];

function VideoTitleEditor({ content, onChange }: VideoTitleEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
      }),
      TextStyle,
      Color,
      TextAlign.configure({
        types: ["paragraph"],
        alignments: ["left", "center", "right"],
        defaultAlignment: "center",
      }),
    ],
    content,
    editorProps: {
      attributes: {
        class:
          "min-h-28 rounded-lg border border-slate-600 bg-slate-900 px-3 py-3 text-center text-lg font-black uppercase leading-tight text-white outline-none",
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      onChange(currentEditor.getJSON());
    },
  });

  useEffect(() => {
    if (!editor) {
      return;
    }

    const editorContent = JSON.stringify(editor.getJSON());
    const nextContent = JSON.stringify(content);

    if (editorContent !== nextContent) {
      editor.commands.setContent(content, {
        emitUpdate: false,
      });
    }
  }, [content, editor]);

  if (!editor) {
    return null;
  }

  function applyColor(color: string) {
    editor.chain().focus().setColor(color).run();
  }

  function applyAlignment(alignment: Alignment) {
    editor.chain().focus().setTextAlign(alignment).run();
  }

  function toolbarButtonClass(isActive = false) {
    return `rounded-md px-2 py-1 text-sm font-bold transition-colors ${
      isActive
        ? "bg-violet-600 text-white"
        : "bg-slate-700 text-slate-200 hover:bg-slate-600"
    }`;
  }

  return (
    <section className="mb-6 border-b border-slate-700 pb-5">
      <h2 className="text-lg font-bold text-white">Video Title</h2>

      <p className="mt-1 text-sm text-slate-400">
        Highlight text to change its color. Press Enter to create another
        centered title line.
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2 rounded-t-lg border border-b-0 border-slate-700 bg-slate-800 p-2">
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => applyAlignment("left")}
          className={toolbarButtonClass(editor.isActive({ textAlign: "left" }))}
        >
          Left
        </button>

        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => applyAlignment("center")}
          className={toolbarButtonClass(
            editor.isActive({ textAlign: "center" }),
          )}
        >
          Center
        </button>

        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => applyAlignment("right")}
          className={toolbarButtonClass(
            editor.isActive({ textAlign: "right" }),
          )}
        >
          Right
        </button>

        <div className="mx-1 h-7 w-px bg-slate-600" />

        {colorOptions.map((color) => (
          <button
            key={color}
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => applyColor(color)}
            aria-label={`Use ${color} text`}
            className="h-7 w-7 rounded-full border-2 border-slate-500 transition-transform hover:scale-110"
            style={{ backgroundColor: color }}
          />
        ))}

        <input
          type="color"
          defaultValue="#ffffff"
          onChange={(event) => applyColor(event.target.value)}
          title="Choose a custom text color"
          className="h-8 w-10 cursor-pointer rounded border border-slate-600 bg-slate-900 p-1"
        />

        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => editor.chain().focus().unsetColor().run()}
          className={toolbarButtonClass()}
        >
          Clear Color
        </button>
      </div>

      <EditorContent editor={editor} />
    </section>
  );
}

export default VideoTitleEditor;
