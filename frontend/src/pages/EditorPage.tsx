import { useEffect, useState, type FormEvent } from "react";
import { useParams } from "react-router-dom";

import RevealOrderPanel from "../components/editor/RevealOrderPanel";
import LivePreview from "../components/editor/LivePreview";
import { compileJob } from "../api/clipApi";
import DraggableItemList from "../components/editor/DraggableItemList";
import SubmitUrlForm from "../components/editor/SubmitUrlForm";
import { type Item, useItemList } from "../utils/listUtils";

function EditorPage() {
  const { jobId } = useParams<{ jobId: string }>();

  const { itemList, handleAddItem, handleDeleteItem, handleUpdateItemTitle } =
    useItemList(jobId);

  const [compiledVideoUrl, setCompiledVideoUrl] = useState<string | null>(null);
  const [isCompiling, setIsCompiling] = useState(false);
  const [compileError, setCompileError] = useState("");

  const [previewItems, setPreviewItems] = useState<Item[]>([]);
  const [playOrder, setPlayOrder] = useState<string[]>([]);

  // Applied title currently shown in the preview.
  const [videoTitle, setVideoTitle] = useState("RANKING THE BEST MOMENTS");

  // What the user is currently typing.
  const [draftVideoTitle, setDraftVideoTitle] = useState("");

  useEffect(() => {
    setPlayOrder((previousOrder) => {
      const availableIds = new Set(previewItems.map((item) => item.slotId));

      const keptIds = previousOrder.filter((slotId) =>
        availableIds.has(slotId),
      );

      const keptIdSet = new Set(keptIds);

      const newIds = previewItems
        .map((item) => item.slotId)
        .filter((slotId) => !keptIdSet.has(slotId));

      const nextOrder = [...keptIds, ...newIds];

      const didOrderChange =
        nextOrder.length !== previousOrder.length ||
        nextOrder.some((slotId, index) => slotId !== previousOrder[index]);

      return didOrderChange ? nextOrder : previousOrder;
    });
  }, [previewItems]);

  function handleApplyVideoTitle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cleanedTitle = draftVideoTitle.trim();

    if (!cleanedTitle) {
      return;
    }

    setVideoTitle(cleanedTitle);
  }

  function handleMovePlayOrder(fromIndex: number, direction: -1 | 1) {
    setPlayOrder((previousOrder) => {
      const toIndex = fromIndex + direction;

      if (toIndex < 0 || toIndex >= previousOrder.length) {
        return previousOrder;
      }

      const nextOrder = [...previousOrder];

      [nextOrder[fromIndex], nextOrder[toIndex]] = [
        nextOrder[toIndex],
        nextOrder[fromIndex],
      ];

      return nextOrder;
    });
  }

  async function handleCompile() {
    if (!jobId || itemList.length === 0 || isCompiling) {
      return;
    }

    try {
      setIsCompiling(true);
      setCompileError("");

      const result = await compileJob(jobId);

      setCompiledVideoUrl(`${result.videoUrl}?v=${Date.now()}`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not compile video.";

      setCompileError(message);
    } finally {
      setIsCompiling(false);
    }
  }

  if (!jobId) {
    return <p>No job ID found.</p>;
  }

  return (
    <div className="grid min-h-screen grid-cols-[800px_minmax(0,1fr)] bg-slate-950 text-white">
      <aside className="overflow-y-auto border-r border-slate-700 bg-slate-900 p-5">
        <section className="mb-6 border-b border-slate-700 pb-5">
          <h2 className="text-lg font-bold text-white">Video Title</h2>

          <p className="mt-1 pb-2 text-sm text-slate-400">
            Name for the whole ranking video.
          </p>

          <form
            onSubmit={handleApplyVideoTitle}
            className="flex flex-col gap-3"
          >
            <input
              type="text"
              value={draftVideoTitle}
              onChange={(event) => setDraftVideoTitle(event.target.value)}
              data-swapy-no-drag
              placeholder="Ranking The Best Moments"
              className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-lg text-white outline-none placeholder:text-slate-500 focus:border-violet-400"
            />

            <button
              type="submit"
              data-swapy-no-drag
              className="w-fit rounded-lg bg-violet-600 px-4 py-2 font-medium text-white transition-colors hover:bg-violet-500"
            >
              Apply Title
            </button>
          </form>
        </section>

        <h2 className="mb-5 text-xl font-bold">Video Clips</h2>

        <SubmitUrlForm jobId={jobId} onAddItem={handleAddItem} />

        <DraggableItemList
          items={itemList}
          onDeleteItem={handleDeleteItem}
          onUpdateItemTitle={handleUpdateItemTitle}
          onOrderChange={setPreviewItems}
        />

        <RevealOrderPanel
          items={previewItems}
          playOrder={playOrder}
          onMove={handleMovePlayOrder}
        />
      </aside>

      <main className="flex flex-col items-center p-8">
        <h2 className="mb-6 text-2xl font-bold">Live Preview</h2>

        <div className="flex min-h-[600px] w-full max-w-3xl items-center justify-center rounded-2xl border-2 border-dashed border-slate-600 bg-slate-900">
          {compiledVideoUrl ? (
            <video
              key={compiledVideoUrl}
              src={compiledVideoUrl}
              controls
              className="aspect-[9/16] w-full max-w-[360px] rounded-xl bg-black object-contain"
            />
          ) : (
            <div className="flex min-h-[600px] w-full max-w-3xl items-center justify-center rounded-2xl border-2 border-dashed border-slate-600 bg-slate-900 p-6">
              <LivePreview
                items={previewItems}
                playOrder={playOrder}
                videoTitle={videoTitle}
              />
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
