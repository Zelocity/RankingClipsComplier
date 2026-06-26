import { useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { createSwapy, utils } from "swapy";
import type { SlotItemMapArray, Swapy } from "swapy";

import ClipCard from "./ClipCard";
import type { Item } from "../../utils/listUtils";

type DraggableItemListProps = {
  items: Item[];
  onDeleteItem: (slotId: string) => void;
  onUpdateItemTitle: (slotId: string, newTitle: string) => void;
  onOrderChange: (orderedItems: Item[]) => void;
};

function DraggableItemList({
  items,
  onDeleteItem,
  onUpdateItemTitle,
  onOrderChange,
}: DraggableItemListProps) {
  const [slotItemMap, setSlotItemMap] = useState<SlotItemMapArray>(
    utils.initSlotItemMap(items, "slotId"),
  );

  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const containerRef = useRef<HTMLDivElement | null>(null);
  const swapyRef = useRef<Swapy | null>(null);

  const slottedItems = useMemo(() => {
    return utils.toSlottedItems(items, "slotId", slotItemMap);
  }, [items, slotItemMap]);

  useEffect(() => {
    const orderedItems = slottedItems.map(({ item }) => item);

    onOrderChange(orderedItems);
  }, [slottedItems, onOrderChange]);

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

        return (
          <div
            key={slotId}
            data-swapy-slot={slotId}
            className="rounded-xl border border-slate-700 bg-slate-900 p-1"
          >
            <ClipCard
              item={item}
              itemId={itemId}
              isExpanded={expandedItems.has(item.slotId)}
              onToggleExpanded={handleToggleExpanded}
              onDeleteItem={onDeleteItem}
              onUpdateItemTitle={onUpdateItemTitle}
              onDragHandlePointerDown={handleDragHandlePointerDown}
            />
          </div>
        );
      })}
    </div>
  );
}

export default DraggableItemList;
