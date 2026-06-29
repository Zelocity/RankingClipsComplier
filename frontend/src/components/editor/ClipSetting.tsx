import { useEffect, useRef, useState } from "react";

import type { Item } from "../../utils/listUtils";

const emojiOptions = [
  "😂",
  "🤣",
  "😭",
  "💀",
  "😳",
  "😮",
  "🤯",
  "😅",
  "😤",
  "😎",
  "🔥",
  "✨",
  "👀",
  "🤨",
  "🙃",
  "🐶",
  "🐱",
  "🐭",
  "🦊",
  "❤️",
];

type ClipSettingProps = {
  item: Item;
  onUpdateItemTitle: (slotId: string, newTitle: string) => void | Promise<void>;
};

function ClipSetting({ item, onUpdateItemTitle }: ClipSettingProps) {
  const [draftTitle, setDraftTitle] = useState(item.title);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setDraftTitle(item.title);
  }, [item.slotId, item.title]);

  function insertEmoji(emoji: string) {
    const input = inputRef.current;

    const selectionStart = input?.selectionStart ?? draftTitle.length;
    const selectionEnd = input?.selectionEnd ?? draftTitle.length;

    const nextTitle =
      draftTitle.slice(0, selectionStart) +
      emoji +
      draftTitle.slice(selectionEnd);

    if (nextTitle.length > 100) {
      return;
    }

    setDraftTitle(nextTitle);

    requestAnimationFrame(() => {
      const nextCursorPosition = selectionStart + emoji.length;

      input?.focus();
      input?.setSelectionRange(nextCursorPosition, nextCursorPosition);
    });
  }

  async function handleApplyTitle() {
    const cleanedTitle = draftTitle.trim();

    if (!cleanedTitle || isSaving) {
      return;
    }

    try {
      setIsSaving(true);
      setSaveError("");

      await onUpdateItemTitle(item.slotId, cleanedTitle);
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "Could not save clip title.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  const didTitleChange = draftTitle.trim() !== item.title;

  return (
    <section
      data-swapy-no-drag
      className="mt-3 rounded-lg border border-slate-700 bg-slate-900 p-3"
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <h4 className="text-sm font-semibold text-slate-100">Clip Title</h4>

        <span className="text-xs text-slate-400">{draftTitle.length}/100</span>
      </div>

      <input
        ref={inputRef}
        type="text"
        value={draftTitle}
        maxLength={100}
        onPointerDown={(event) => event.stopPropagation()}
        onChange={(event) => setDraftTitle(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            void handleApplyTitle();
          }
        }}
        className="w-full rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30"
        placeholder="Enter clip title"
      />

      <div className="mt-3">
        <p className="mb-2 text-xs font-medium text-slate-400">Add emoji</p>

        <div className="flex flex-wrap gap-1.5">
          {emojiOptions.map((emoji) => (
            <button
              key={emoji}
              type="button"
              data-swapy-no-drag
              onPointerDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
              }}
              onClick={() => insertEmoji(emoji)}
              className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-800 text-lg transition hover:bg-violet-600 hover:scale-110"
              aria-label={`Add ${emoji} to title`}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <p className="text-xs text-slate-400">
          This title appears in the ranking list.
        </p>

        <button
          type="button"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => void handleApplyTitle()}
          disabled={!draftTitle.trim() || !didTitleChange || isSaving}
          className="rounded-md bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSaving ? "Saving..." : "Apply Changes"}
        </button>
      </div>

      {saveError && <p className="mt-2 text-xs text-red-400">{saveError}</p>}
    </section>
  );
}

export default ClipSetting;
