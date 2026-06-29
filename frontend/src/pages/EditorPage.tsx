import { useEffect, useMemo, useState } from "react";
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

function getRankedItems(items: Item[], draggedItems: Item[]) {
  if (draggedItems.length === 0) {
    return items;
  }

  const itemsById = new Map(items.map((item) => [item.slotId, item]));

  const rankedItems: Item[] = [];
  const usedIds = new Set<string>();

  for (const draggedItem of draggedItems) {
    const currentItem = itemsById.get(draggedItem.slotId);

    if (currentItem && !usedIds.has(currentItem.slotId)) {
      rankedItems.push(currentItem);
      usedIds.add(currentItem.slotId);
    }
  }

  for (const item of items) {
    if (!usedIds.has(item.slotId)) {
      rankedItems.push(item);
    }
  }

  return rankedItems;
}

function syncRevealRankOrder(previousOrder: number[], rankCount: number) {
  const nextOrder: number[] = [];
  const usedRanks = new Set<number>();

  for (const rankNumber of previousOrder) {
    const isValidRank =
      Number.isInteger(rankNumber) &&
      rankNumber >= 1 &&
      rankNumber <= rankCount;

    if (isValidRank && !usedRanks.has(rankNumber)) {
      nextOrder.push(rankNumber);
      usedRanks.add(rankNumber);
    }
  }

  for (let rankNumber = rankCount; rankNumber >= 1; rankNumber -= 1) {
    if (!usedRanks.has(rankNumber)) {
      nextOrder.push(rankNumber);
    }
  }

  return nextOrder;
}

function EditorPage() {
  const { jobId } = useParams<{ jobId: string }>();

  const {
    itemList,
    handleAddItem,
    handleDeleteItem,
    handleUpdateItemTitle,
    handleUpdateItemTrim,
    handleResetItems,
  } = useItemList(jobId);

  const [compiledVideoUrl, setCompiledVideoUrl] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const [isCompiling, setIsCompiling] = useState(false);
  const [compileError, setCompileError] = useState("");

  // The order of cards after the user drags them.
  // This determines Rank #1, Rank #2, etc.
  const [previewItems, setPreviewItems] = useState<Item[]>([]);

  // Example: [4, 3, 1, 2]
  // This stays the same even when clips change rank.
  const [revealRankOrder, setRevealRankOrder] = useState<number[]>([]);

  const [titleDocument, setTitleDocument] = useState<TitleDocument>(
    createDefaultTitleDocument,
  );

  const rankedItems = useMemo(() => {
    return getRankedItems(itemList, previewItems);
  }, [itemList, previewItems]);

  useEffect(() => {
    setRevealRankOrder((previousOrder) => {
      const nextOrder = syncRevealRankOrder(previousOrder, rankedItems.length);

      const didChange =
        nextOrder.length !== previousOrder.length ||
        nextOrder.some(
          (rankNumber, index) => rankNumber !== previousOrder[index],
        );

      return didChange ? nextOrder : previousOrder;
    });
  }, [rankedItems.length]);

  // Converts rank numbers into the clips currently occupying those ranks.
  const clipPlayOrder = useMemo(() => {
    return revealRankOrder
      .map((rankNumber) => rankedItems[rankNumber - 1]?.slotId)
      .filter((slotId): slotId is string => Boolean(slotId));
  }, [rankedItems, revealRankOrder]);

  function handleMoveRevealOrder(fromIndex: number, direction: -1 | 1) {
    setRevealRankOrder((previousOrder) => {
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

  function handleBackToReactPreview() {
    setCompiledVideoUrl(null);
    setDownloadUrl(null);
    setCompileError("");
  }

  async function handleResetProject() {
    const shouldReset = window.confirm(
      "Reset this project? This will permanently remove every imported clip and compiled video.",
    );

    if (!shouldReset) {
      return;
    }

    try {
      await handleResetItems();

      setPreviewItems([]);
      setRevealRankOrder([]);
      setTitleDocument(createDefaultTitleDocument());

      handleBackToReactPreview();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not reset project.";

      setCompileError(message);
    }
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

        // Backend still receives clip IDs.
        playOrder: clipPlayOrder,
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

        <button
          type="button"
          onClick={() => void handleResetProject()}
          disabled={itemList.length === 0}
          className="mt-3 rounded-lg border border-red-500/60 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-300 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Reset Project
        </button>

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
          revealRankOrder={revealRankOrder}
          onMove={handleMoveRevealOrder}
        />
      </aside>

      <main className="flex flex-col items-center p-8">
        <h2 className="mb-6 text-2xl font-bold">Live Preview</h2>

        <div className="flex min-h-[600px] w-full max-w-3xl items-center justify-center rounded-2xl border-2 border-dashed border-slate-600 bg-slate-900">
          {compiledVideoUrl ? (
            <div className="flex flex-col items-center gap-4">
              <video
                key={compiledVideoUrl}
                src={compiledVideoUrl}
                controls
                className="aspect-[9/16] w-full max-w-[360px] rounded-xl bg-black object-contain"
              />

              <button
                type="button"
                onClick={handleBackToReactPreview}
                className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-600"
              >
                Back to React Preview
              </button>
            </div>
          ) : (
            <div className="flex min-h-[600px] w-full max-w-3xl items-center justify-center rounded-2xl border-2 border-dashed border-slate-600 bg-slate-900 p-6">
              <LivePreview
                items={rankedItems}
                playOrder={clipPlayOrder}
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
