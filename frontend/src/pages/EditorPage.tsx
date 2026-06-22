import { useParams } from "react-router-dom";
import "./EditorPage.css";

import DraggableItemList from "../components/editor/DraggableItemList";
import SubmitUrlForm from "../components/editor/SubmitUrlForm";
import { useItemList } from "../utils/listUtils";

function EditorPage() {
  const { jobId } = useParams<{ jobId: string }>();

  const { itemList, handleAddItem, handleDeleteItem } = useItemList(jobId);

  if (!jobId) {
    return <p>No job ID found.</p>;
  }

  return (
    <div className="editor-page">
      <aside className="clip-panel">
        <h2>Video Clips</h2>

        <SubmitUrlForm jobId={jobId} onAddItem={handleAddItem} />

        <DraggableItemList items={itemList} onDeleteItem={handleDeleteItem} />
      </aside>

      <main className="preview-panel">
        <h2>Compiled Video</h2>

        <div className="compiled-video-container">
          <div className="compiled-video-placeholder">
            Compiled video preview
          </div>
        </div>

        <button className="compile-button" type="button">
          Compile Video
        </button>
      </main>
    </div>
  );
}

export default EditorPage;
