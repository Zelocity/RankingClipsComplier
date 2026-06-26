import { useState } from "react";
import { useParams } from "react-router-dom";

import { compileJob } from "../api/clipApi";
import DraggableItemList from "../components/editor/DraggableItemList";
import SubmitUrlForm from "../components/editor/SubmitUrlForm";
import { useItemList } from "../utils/listUtils";

function EditorPage() {
  const { jobId } = useParams<{ jobId: string }>();

  const { itemList, handleAddItem, handleDeleteItem, handleUpdateItemTitle } =
    useItemList(jobId);

  const [compiledVideoUrl, setCompiledVideoUrl] = useState<string | null>(null);
  const [isCompiling, setIsCompiling] = useState(false);
  const [compileError, setCompileError] = useState("");

  if (!jobId) {
    return <p>No job ID found.</p>;
  }

  async function handleCompile() {
    if (itemList.length === 0 || isCompiling) {
      return;
    }

    try {
      setIsCompiling(true);
      setCompileError("");

      const result = await compileJob(jobId);

      // Adds a unique query value so the browser does not reuse an old video.
      setCompiledVideoUrl(`${result.videoUrl}?v=${Date.now()}`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not compile video.";

      setCompileError(message);
    } finally {
      setIsCompiling(false);
    }
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
          {compiledVideoUrl ? (
            <video
              key={compiledVideoUrl}
              src={compiledVideoUrl}
              controls
              className="aspect-[9/16] w-full max-w-[360px] rounded-xl bg-black object-contain"
            />
          ) : (
            <div className="flex aspect-[9/16] w-full max-w-[360px] items-center justify-center rounded-xl bg-black text-slate-500">
              Your compiled video will appear here.
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handleCompile}
          disabled={isCompiling || itemList.length === 0}
          className="mt-5 rounded-lg bg-violet-600 px-5 py-3 font-semibold text-white transition-colors hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isCompiling ? "Compiling..." : "Compile Video"}
        </button>

        {compileError && (
          <p className="mt-3 text-sm text-red-400">{compileError}</p>
        )}

        {compiledVideoUrl && (
          <a
            href={compiledVideoUrl}
            download="compiled_video.mp4"
            className="mt-4 text-sm font-medium text-violet-300 hover:text-violet-200"
          >
            Download Video
          </a>
        )}
      </main>
    </div>
  );
}

export default EditorPage;
