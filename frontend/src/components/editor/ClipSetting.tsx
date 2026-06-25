import { useEffect, useState, type FormEvent } from "react";
import type { Item } from "../../utils/listUtils";

type ClipSettingProps = {
  item: Item;
  onUpdateItemTitle: (slotId: string, newTitle: string) => void;
};

function ClipSetting({ item, onUpdateItemTitle }: ClipSettingProps) {
  const [draftTitle, setDraftTitle] = useState(item.title);

  useEffect(() => {
    setDraftTitle(item.title);
  }, [item.title]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const cleanedTitle = draftTitle.trim();

    if (!cleanedTitle) {
      return;
    }

    onUpdateItemTitle(item.slotId, cleanedTitle);
  }

  return (
    <div>
      {/* <div className="bg-amber-600"> */}

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          type="text"
          value={draftTitle}
          onChange={(event) => setDraftTitle(event.target.value)}
          data-swapy-no-drag
          placeholder="Untitled clip"
          className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-lg text-white outline-none placeholder:text-slate-500 focus:border-violet-400"
        />
        <button
          type="submit"
          data-swapy-no-drag
          className="w-fit rounded-lg bg-violet-600 px-4 py-2 font-medium text-white transition-colors hover:bg-violet-500"
        >
          Apply Title
        </button>
      </form>

      {/* <div className="">
        <button type="submit">
          <p className="font-bold bg-slate-500 rounded-2xl">font</p>
        </button>
        <button type="submit">
          <p className="font-bold bg-slate-500 rounded-2xl">emote</p>
        </button>
        <button type="submit">
          <p className="font-bold bg-slate-500 rounded-2xl">align</p>
        </button>
        <button type="submit">
          <p className="font-bold bg-slate-500 rounded-2xl">size</p>
        </button>
      </div> */}
    </div>
  );
}
export default ClipSetting;
