import { useEffect, useMemo, useRef, useState } from "react";
import { createSwapy, utils } from "swapy";
import type { SlotItemMapArray, Swapy } from "swapy";
import {
  IoChevronDownCircleSharp,
  IoChevronUpCircleSharp,
} from "react-icons/io5";

import type { Item } from "../../utils/listUtils";
import "./DraggableItemList.css";

type DraggableItemListProps = {
  items: Item[];
  onDeleteItem: (slotId: string) => void;
};

function DraggableItemList({ items, onDeleteItem }: DraggableItemListProps) {
  const [slotItemMap, setSlotItemMap] = useState<SlotItemMapArray>(
    utils.initSlotItemMap(items, "slotId"),
  );

  const swapyRef = useRef<Swapy | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const slottedItems = useMemo(() => {
    return utils.toSlottedItems(items, "slotId", slotItemMap);
  }, [items, slotItemMap]);

  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  function toggleCollapsedItem(slotId: string) {
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
    const currentOrder = slottedItems.map(
      ({ slotId, itemId, item }, index) => ({
        rank: index + 1,
        slotId,
        itemId,
        title: item?.title,
      }),
    );

    console.table(currentOrder);
  }, [slottedItems]);

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
    <div className="items" ref={containerRef}>
      {slottedItems.map(({ slotId, itemId, item }) => {
        if (!item) {
          return <div className="slot" key={slotId} data-swapy-slot={slotId} />;
        }

        const isCollapsed = !expandedItems.has(item.slotId);

        return (
          <div className="slot" key={slotId} data-swapy-slot={slotId}>
            <div
              className={`item ${isCollapsed ? "item-collapsed" : ""}`}
              data-swapy-item={itemId}
            >
              <div className="item-header">
                <span className="item-title">⋮⋮ {item.title}</span>

                <button
                  type="button"
                  className="collapse-button"
                  data-swapy-no-drag
                  onClick={() => toggleCollapsedItem(item.slotId)}
                >
                  {isCollapsed ? (
                    <IoChevronDownCircleSharp size={22} />
                  ) : (
                    <IoChevronUpCircleSharp size={22} />
                  )}
                </button>
              </div>
              <div className="item-video-container">
                {!isCollapsed &&
                  (item.videoUrl ? (
                    <video
                      className="video-preview"
                      src={item.videoUrl}
                      controls
                      data-swapy-no-drag
                    />
                  ) : (
                    <p>No video URL yet.</p>
                  ))}
              </div>

              {/* <div className="item-actions">
                <button
                  className="delete"
                  type="button"
                  data-swapy-no-drag
                  onClick={() => onDeleteItem(item.slotId)}
                >
                  Delete
                </button>
              </div> */}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default DraggableItemList;
