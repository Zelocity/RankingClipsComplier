import { useParams } from "react-router-dom";

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
      <section className="clip-panel">
        <div className="clip-panel-header">
          <h2>Clips</h2>

          <SubmitUrlForm jobId={jobId} onAddItem={handleAddItem} />
        </div>

        <DraggableItemList items={itemList} onDeleteItem={handleDeleteItem} />
      </section>

      <section className="preview-panel">
        <h2>Compiled Video</h2>

        <div className="compiled-video-container">
          <p>Your compiled video will appear here.</p>

          {/*
          <video className="compiled-video" controls>
            <source src={compiledVideoUrl} type="video/mp4" />
          </video>
          */}
        </div>

        <button className="compile-button">Compile Video</button>
      </section>
    </div>
  );
}

export default EditorPage;
