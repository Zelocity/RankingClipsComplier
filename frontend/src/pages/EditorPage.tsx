import DraggableItemList from "../components/editor/DraggableItemList";
import SubmitUrlForm from "../components/editor/SubmitUrlForm";
import { useItemList } from "../utils/listUtils";

function EditorPage() {
  const { itemList, handleAddItem, handleDeleteItem } = useItemList();

  return (
    <div className="container">
      <DraggableItemList items={itemList} onDeleteItem={handleDeleteItem} />
      <SubmitUrlForm items={itemList} onAddItem={handleAddItem} />

      <button className="add-item-button" onClick={handleAddItem}>
        +
      </button>
    </div>
  );
}

export default EditorPage;
