import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useParams } from "react-router-dom";

import RevealOrderPanel from "../components/editor/RevealOrderPanel";
import LivePreview from "../components/editor/LivePreview";
import VideoTitleEditor from "../components/editor/VideoTitleEditor";
import {
  createDefaultTitleDocument,
  type TitleDocument,
} from "../utils/titleDocument";
import { compileJob } from "../api/clipApi";
import DraggableItemList from "../components/editor/DraggableItemList";
import SubmitUrlForm from "../components/editor/SubmitUrlForm";
import { type Item, useItemList } from "../utils/listUtils";

function EditorPage() {
  const { jobId } = useParams<{ jobId: string }>();

  const {
    itemList,
    handleAddItem,
    handleDeleteItem,
    handleUpdateItemTitle,
    handleUpdateItemTrim,
  } = useItemList(jobId);

  const [compiledVideoUrl, setCompiledVideoUrl] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const [isCompiling, setIsCompiling] = useState(false);
  const [compileError, setCompileError] = useState("");

  // This is the order created by dragging cards around.
  const [previewItems, setPreviewItems] = useState<Item[]>([]);

  // This is the separate order used to reveal clips.
  const [playOrder, setPlayOrder] = useState<string[]>([]);

  const [titleDocument, setTitleDocument] = useState<TitleDocument>(
    createDefaultTitleDocument,
  );

  const rankedItems = useMemo(() => {
    if (previewItems.length === 0) {
      return itemList;
    }

    const currentItemsById = new Map(
      itemList.map((item) => [item.slotId, item]),
    );

    const orderedItems: Item[] = [];
    const seenIds = new Set<string>();

    for (const previewItem of previewItems) {
      const currentItem = currentItemsById.get(previewItem.slotId);

      if (currentItem && !seenIds.has(currentItem.slotId)) {
        orderedItems.push(currentItem);
        seenIds.add(currentItem.slotId);
      }
    }

    for (const item of itemList) {
      if (!seenIds.has(item.slotId)) {
        orderedItems.push(item);
      }
    }

    return orderedItems;
  }, [itemList, previewItems]);

  useEffect(() => {
    setPlayOrder((previousOrder) => {
      const availableIds = new Set(rankedItems.map((item) => item.slotId));

      // Keep the existing reveal sequence.
      const keptIds = previousOrder.filter((slotId) =>
        availableIds.has(slotId),
      );

      const keptIdSet = new Set(keptIds);

      // Only add newly imported clips to the end of Reveal Order.
      const newIds = rankedItems
        .map((item) => item.slotId)
        .filter((slotId) => !keptIdSet.has(slotId));

      const nextOrder = [...keptIds, ...newIds];

      const didOrderChange =
        nextOrder.length !== previousOrder.length ||
        nextOrder.some((slotId, index) => slotId !== previousOrder[index]);

      return didOrderChange ? nextOrder : previousOrder;
    });
  }, [rankedItems]);

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
    if (!jobId || rankedItems.length === 0 || isCompiling) {
      return;
    }

    try {
      setIsCompiling(true);
      setCompileError("");
      setCompiledVideoUrl(null);
      setDownloadUrl(null);

      const result = await compileJob(jobId, {
        titleDocument,
        rankedClipIds: rankedItems.map((item) => item.slotId),
        playOrder,
      });

      setCompiledVideoUrl(`${result.videoUrl}?v=${Date.now()}`);
      setDownloadUrl(result.downloadUrl);
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
        <VideoTitleEditor content={titleDocument} onChange={setTitleDocument} />

        <h2 className="mb-5 text-xl font-bold">Video Clips</h2>

        <SubmitUrlForm jobId={jobId} onAddItem={handleAddItem} />

        <DraggableItemList
          items={itemList}
          onDeleteItem={handleDeleteItem}
          onUpdateItemTitle={handleUpdateItemTitle}
          onUpdateItemTrim={handleUpdateItemTrim}
          onOrderChange={setPreviewItems}
        />

        <RevealOrderPanel
          items={rankedItems}
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
                items={rankedItems}
                playOrder={playOrder}
                titleDocument={titleDocument}
              />
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handleCompile}
          disabled={isCompiling || rankedItems.length === 0}
          className="mt-5 rounded-lg bg-violet-600 px-5 py-3 font-semibold text-white transition-colors hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isCompiling ? "Compiling..." : "Compile Video"}
        </button>

        {compileError && (
          <p className="mt-3 text-sm text-red-400">{compileError}</p>
        )}

        {downloadUrl && (
          <a
            href={downloadUrl}
            className="mt-4 rounded-lg bg-emerald-600 px-5 py-3 font-semibold text-white transition-colors hover:bg-emerald-500"
          >
            Download Export
          </a>
        )}
      </main>
    </div>
  );
}

export default EditorPage;
