import { useState } from "react";
import DraggableItemList, {
  type Item,
} from "../components/editor/DraggableItemList.tsx";
import { createNewItem } from "../utils/listUtils";

const initialItems: Item[] = [
  { id: "1", title: "1" },
  { id: "2", title: "2" },
  { id: "3", title: "3" },
];

let nextId = 4;

function EditorPage() {
  const [items, setItems] = useState<Item[]>(initialItems);

  function handleAddItem() {
    const newItem = createNewItem(nextId);

    setItems((previousItems) => [...previousItems, newItem]);
    nextId++;
  }

  function handleDeleteItem(itemId: string) {
    setItems((previousItems) =>
      previousItems.filter((item) => item.id !== itemId),
    );
  }

  return (
    <div className="container">
      <DraggableItemList items={items} onDeleteItem={handleDeleteItem} />

      <button className="add-item-button" onClick={handleAddItem}>
        +
      </button>
    </div>
  );
}

export default EditorPage;
