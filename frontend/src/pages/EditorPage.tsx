import { useParams } from "react-router-dom";
//import "./EditorPage.css";

import DraggableItemList from "../components/editor/DraggableItemList";
import SubmitUrlForm from "../components/editor/SubmitUrlForm";
import { useItemList } from "../utils/listUtils";

function EditorPage() {
  const { jobId } = useParams<{ jobId: string }>();

  const { itemList, handleAddItem, handleDeleteItem, handleUpdateItemTitle } =
    useItemList(jobId);

  if (!jobId) {
    return <p>No job ID found.</p>;
  }

  return (
    <div className="grid min-h-screen grid-cols-[800px_minmax(0,1fr)] bg-slate-950 text-white">
      <aside className="overflow-y-auto border-r border-slate-700 bg-slate-900 p-5">
        <h2 className="mb-5 text-xl font-bold">Video Clips</h2>

        <SubmitUrlForm jobId={jobId} onAddItem={handleAddItem} />

        <DraggableItemList
          items={itemList}
          onDeleteItem={handleDeleteItem}
          onUpdateItemTitle={handleUpdateItemTitle}
        />
      </aside>

      <main className="flex flex-col items-center p-8">
        <h2 className="mb-6 text-2xl font-bold">Compiled Video</h2>

        <div className="flex min-h-[600px] w-full max-w-3xl items-center justify-center rounded-2xl border-2 border-dashed border-slate-600 bg-slate-900">
          <div className="flex aspect-[9/16] w-full max-w-[360px] items-center justify-center rounded-xl bg-black text-slate-500">
            Compiled video preview
          </div>
        </div>

        <button
          type="button"
          className="mt-5 rounded-lg bg-blue-500 px-5 py-3 font-semibold text-white transition hover:bg-blue-400"
        >
          Compile Video
        </button>
      </main>
    </div>
  );
}

export default EditorPage;
