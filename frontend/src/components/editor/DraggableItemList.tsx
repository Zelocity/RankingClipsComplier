import { useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { createSwapy, utils } from "swapy";
import type { SlotItemMapArray, Swapy } from "swapy";

import { Icons } from "../icons";
import type { Item } from "../../utils/listUtils";

type DraggableItemListProps = {
  items: Item[];
  onDeleteItem: (slotId: string) => void;
};

function DraggableItemList({ items, onDeleteItem }: DraggableItemListProps) {
  const [slotItemMap, setSlotItemMap] = useState<SlotItemMapArray>(
    utils.initSlotItemMap(items, "slotId"),
  );

  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const containerRef = useRef<HTMLDivElement | null>(null);
  const swapyRef = useRef<Swapy | null>(null);

  const slottedItems = useMemo(() => {
    return utils.toSlottedItems(items, "slotId", slotItemMap);
  }, [items, slotItemMap]);

  function handleToggleExpanded(slotId: string) {
    setExpandedItems((previousItems) => {
      const updatedItems = new Set(previousItems);

      if (updatedItems.has(slotId)) {
        updatedItems.delete(slotId);
      } else {
        updatedItems.add(slotId);
      }

      return updatedItems;
    });
  }

  function handleDragHandlePointerDown() {
    if (expandedItems.size === 0) {
      return;
    }

    // Forces React to collapse cards before Swapy measures slot sizes.
    flushSync(() => {
      setExpandedItems(new Set());
    });
  }

  useEffect(() => {
    if (!containerRef.current) return;

    swapyRef.current = createSwapy(containerRef.current, {
      manualSwap: true,
      swapMode: "drop",
      dragAxis: "y",
      animation: "none",
    });

    swapyRef.current.onSwap((event) => {
      setSlotItemMap(event.newSlotItemMap.asArray);
    });

    return () => {
      swapyRef.current?.destroy();
      swapyRef.current = null;
    };
  }, []);

  useEffect(() => {
    utils.dynamicSwapy(
      swapyRef.current,
      items,
      "slotId",
      slotItemMap,
      setSlotItemMap,
    );
  }, [items]);

  return (
    <div ref={containerRef} className="flex flex-col gap-3 pt-5">
      {slottedItems.map(({ slotId, itemId, item }) => {
        if (!item) {
          return (
            <div
              key={slotId}
              data-swapy-slot={slotId}
              className="min-h-16 rounded-xl border-2 border-dashed border-slate-700"
            />
          );
        }

        const isExpanded = expandedItems.has(item.slotId);

        return (
          <div
            key={slotId}
            data-swapy-slot={slotId}
            className="rounded-xl border border-slate-700 bg-slate-900 p-1"
          >
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
                    onPointerDownCapture={handleDragHandlePointerDown}
                    className="cursor-grab select-none rounded p-1 text-slate-500 active:cursor-grabbing"
                  >
                    ⋮⋮
                  </span>

                  {item.title}
                </span>

                <div className="ml-4 flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    data-swapy-no-drag
                    onClick={() => onDeleteItem(item.slotId)}
                    aria-label="Delete clip"
                    className="rounded-md border border-red-500/40 bg-red-500/10 p-2 text-red-300 transition-colors hover:bg-red-500/20 hover:text-red-100"
                  >
                    <Icons.Trash size={18} />
                  </button>

                  <button
                    type="button"
                    data-swapy-no-drag
                    onClick={() => handleToggleExpanded(item.slotId)}
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
                      <p className="text-sm text-slate-400">
                        No video URL yet.
                      </p>
                    )}
                  </aside>

                  <main className="p-5">
                    <h3 className="text-lg font-semibold">Clip Settings</h3>

                    <p className="mt-2 text-sm text-slate-400">
                      Editing controls for this clip can go here later.
                    </p>
                  </main>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default DraggableItemList;
