import { useEffect, useState } from "react";

import type { Item } from "../../utils/listUtils";

type ClipSettingProps = {
  item: Item;
  onUpdateItemTitle: (slotId: string, newTitle: string) => void | Promise<void>;
};

function ClipSetting({ item, onUpdateItemTitle }: ClipSettingProps) {
  const [draftTitle, setDraftTitle] = useState(item.title);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    setDraftTitle(item.title);
  }, [item.slotId, item.title]);

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

        <span className="text-xs text-slate-400">
          {draftTitle.trim().length}/100
        </span>
      </div>

      <input
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

      <div className="mt-2 flex items-center justify-between gap-2">
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
