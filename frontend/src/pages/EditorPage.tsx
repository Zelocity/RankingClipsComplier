import { useParams } from "react-router-dom";

import DraggableItemList from "../components/editor/DraggableItemList";
import SubmitUrlForm from "../components/editor/SubmitUrlForm";
import { useItemList } from "../utils/listUtils";

function EditorPage() {
  const { jobId } = useParams();
  const { itemList, handleAddItem, handleDeleteItem } = useItemList();

  if (!jobId) {
    return <p>No job ID found.</p>;
  }

  return (
    <div className="container">
      <DraggableItemList items={itemList} onDeleteItem={handleDeleteItem} />
      <SubmitUrlForm jobId={jobId} items={itemList} onAddItem={handleAddItem} />
    </div>
  );
}

export default EditorPage;
