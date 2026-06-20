import type { Item } from "../components/editor/DraggableItemList";

export function createNewItem(nextId: number): Item {
  return {
    id: `${nextId}`,
    title: `${nextId}`,
  };
}
