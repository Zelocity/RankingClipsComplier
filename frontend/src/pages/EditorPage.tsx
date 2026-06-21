import DraggableItemList from "../components/editor/DraggableItemList";
import { useItemList } from "../utils/listUtils";

function EditorPage() {
  const { items, handleAddItem, handleDeleteItem } = useItemList();

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
