import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { createSwapy, utils } from "swapy";
import type { SlotItemMapArray, Swapy } from "swapy";
import type { Item } from "../../utils/listUtils";

type DraggableItemListProps = {
  items: Item[];
  onDeleteItem: (slotId: string) => void;
};

function DraggableItemList({ items, onDeleteItem }: DraggableItemListProps) {
  const { jobId } = useParams();

  const [slotItemMap, setSlotItemMap] = useState<SlotItemMapArray>(
    utils.initSlotItemMap(items, "slotId"),
  );

  const slottedItems = useMemo(() => {
    return utils.toSlottedItems(items, "slotId", slotItemMap);
  }, [items, slotItemMap]);

  const swapyRef = useRef<Swapy | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    utils.dynamicSwapy(
      swapyRef.current,
      items,
      "slotId",
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
            <div className="item" data-swapy-item={itemId}>
              <span>{item.title}</span>

              {item.videoUrlId ? (
                <video className="video-preview" controls>
                  <source src={item.videoUrlId} type="video/mp4" />
                  Your browser does not support this video.
                </video>
              ) : (
                <p>No video URL yet.</p>
              )}
              <button
                className="delete"
                data-swapy-no-drag
                onClick={() => onDeleteItem(item.slotId)}
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
