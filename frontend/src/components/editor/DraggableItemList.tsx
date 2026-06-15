import { useEffect, useMemo, useRef, useState } from "react";
import { createSwapy, utils } from "swapy";
import type { SlotItemMapArray, Swapy } from "swapy";

export type Item = {
  id: string;
  title: string;
};

type DraggableItemListProps = {
  items: Item[];
  onDeleteItem: (itemId: string) => void;
};

function DraggableItemList({ items, onDeleteItem }: DraggableItemListProps) {
  const [slotItemMap, setSlotItemMap] = useState<SlotItemMapArray>(
    utils.initSlotItemMap(items, "id"),
  );

  const slottedItems = useMemo(() => {
    return utils.toSlottedItems(items, "id", slotItemMap);
  }, [items, slotItemMap]);

  const swapyRef = useRef<Swapy | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    utils.dynamicSwapy(
      swapyRef.current,
      items,
      "id",
      slotItemMap,
      setSlotItemMap,
    );
  }, [items]);

  useEffect(() => {
    if (!containerRef.current) return;

    swapyRef.current = createSwapy(containerRef.current, {
      manualSwap: true,
      animation: "dynamic",
    });

    swapyRef.current.onSwap((event) => {
      setSlotItemMap(event.newSlotItemMap.asArray);
      console.log("New slot item map:", event.newSlotItemMap.asArray);
    });

    return () => {
      swapyRef.current?.destroy();
      swapyRef.current = null;
    };
  }, []);

  return (
    <div className="items" ref={containerRef}>
      {slottedItems.map(({ slotId, itemId, item }) => (
        <div className="slot" key={slotId} data-swapy-slot={slotId}>
          {item && (
            <div className="item" key={itemId} data-swapy-item={itemId}>
              <span>{item.title}</span>

              <button
                className="delete"
                data-swapy-no-drag
                onClick={() => onDeleteItem(item.id)}
              >
                Delete
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default DraggableItemList;
