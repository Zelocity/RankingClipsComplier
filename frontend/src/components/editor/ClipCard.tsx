import { Icons } from "../icons";
import type { Item } from "../../utils/listUtils";
import ClipSetting from "./ClipSetting";

type ClipCardProps = {
  item: Item;
  itemId: string;
  isExpanded: boolean;
  onToggleExpanded: (slotId: string) => void;
  onDeleteItem: (slotId: string) => void;
  onDragHandlePointerDown: () => void;
  onUpdateItemTitle: (slotId: string, newTitle: string) => void;
};

function ClipCard({
  item,
  itemId,
  isExpanded,
  onToggleExpanded,
  onDeleteItem,
  onDragHandlePointerDown,
  onUpdateItemTitle,
}: ClipCardProps) {
  return (
    <div
      data-swapy-item={itemId}
      className={`overflow-hidden rounded-lg border bg-slate-800 shadow-sm transition-colors duration-200 ${
        isExpanded
          ? "border-violet-500"
          : "border-slate-700 hover:border-violet-400"
      }`}
    >
      <div className="flex min-h-14 items-center justify-between bg-slate-900 px-4 py-3">
        <span className="flex min-w-0 items-center gap-2 truncate font-medium text-slate-100">
          <span
            data-swapy-handle
            onPointerDownCapture={onDragHandlePointerDown}
            className="cursor-grab select-none rounded p-1 text-slate-500 active:cursor-grabbing"
          >
            ⋮⋮
          </span>

          {item.title}
        </span>

        <div className="ml-4 flex shrink-0 items-center gap-2">
          <button
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              void onDeleteItem(item.slotId);
            }}
            className="rounded-md p-2 text-red-400 transition hover:bg-red-500/20 hover:text-red-300"
            aria-label={`Delete ${item.title}`}
          >
            Delete
          </button>

          <button
            type="button"
            data-swapy-no-drag
            onClick={() => onToggleExpanded(item.slotId)}
            aria-label={isExpanded ? "Collapse video" : "Expand video"}
            className="rounded-md p-2 text-slate-400 transition-colors hover:bg-slate-700 hover:text-white"
          >
            {isExpanded ? (
              <Icons.ChevronUp size={20} />
            ) : (
              <Icons.ChevronDown size={20} />
            )}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="grid grid-cols-[300px_minmax(0,1fr)] border-t border-slate-700 bg-slate-800 text-white">
          <aside className="flex items-center justify-center border-r border-dashed border-slate-600 p-4">
            {item.videoUrl ? (
              <video
                className="aspect-[9/16] w-full max-w-[280px] rounded-lg bg-black object-contain"
                src={item.videoUrl}
                controls
                data-swapy-no-drag
              />
            ) : (
              <p className="text-sm text-slate-400">No video URL yet.</p>
            )}
          </aside>

          <main className="p-5">
            <h3 className="text-lg font-semibold pb-3">Clip Settings</h3>

            <ClipSetting item={item} onUpdateItemTitle={onUpdateItemTitle} />
          </main>
        </div>
      )}
    </div>
  );
}

export default ClipCard;
