import { useEffect, useMemo, useRef, useState } from "react";

import type { Item } from "../../utils/listUtils";
import RichTitleOverlay from "./RichTitleOverlay";
import type { TitleDocument } from "../../utils/titleDocument";

import "./LivePreview.css";

type LivePreviewProps = {
  items: Item[];
  playOrder: string[];
  titleDocument: TitleDocument;
};

const rankStyles = [
  "text-red-500",
  "text-orange-400",
  "text-yellow-300",
  "text-slate-200",
  "text-white",
];

function LivePreview({ items, playOrder, titleDocument }: LivePreviewProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [activePlayIndex, setActivePlayIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [visibleTitleId, setVisibleTitleId] = useState<string | null>(null);

  const shouldAutoPlayNextRef = useRef(false);
  const didFinishActiveRangeRef = useRef(false);

  const resolvedPlayOrder = useMemo(() => {
    const availableIds = new Set(items.map((item) => item.slotId));
    const seenIds = new Set<string>();
    const orderedIds: string[] = [];

    for (const slotId of playOrder) {
      if (availableIds.has(slotId) && !seenIds.has(slotId)) {
        orderedIds.push(slotId);
        seenIds.add(slotId);
      }
    }

    for (const item of items) {
      if (!seenIds.has(item.slotId)) {
        orderedIds.push(item.slotId);
      }
    }

    return orderedIds;
  }, [items, playOrder]);

  const activeItemId = resolvedPlayOrder[activePlayIndex] ?? null;

  const activeItem = items.find((item) => item.slotId === activeItemId) ?? null;

  const activeRankIndex = activeItem
    ? items.findIndex((item) => item.slotId === activeItem.slotId)
    : -1;

  function getTrimStart(item: Item, video: HTMLVideoElement): number {
    return Math.max(
      0,
      Math.min(item.trimStart, Math.max(0, video.duration - 0.01)),
    );
  }

  function getTrimEnd(item: Item, video: HTMLVideoElement): number {
    const trimStart = getTrimStart(item, video);

    // trimEnd null means use the entire source video.
    if (typeof item.trimEnd === "number" && Number.isFinite(item.trimEnd)) {
      return Math.max(trimStart + 0.01, Math.min(item.trimEnd, video.duration));
    }

    return video.duration;
  }

  function finishActiveRange() {
    if (didFinishActiveRangeRef.current) {
      return;
    }

    didFinishActiveRangeRef.current = true;

    if (activePlayIndex >= resolvedPlayOrder.length - 1) {
      setIsPlaying(false);
      return;
    }

    setVisibleTitleId(null);
    shouldAutoPlayNextRef.current = true;

    setActivePlayIndex((previousIndex) => previousIndex + 1);
  }

  useEffect(() => {
    if (resolvedPlayOrder.length === 0) {
      setActivePlayIndex(0);
      setIsPlaying(false);
      setVisibleTitleId(null);
      return;
    }

    setActivePlayIndex((previousIndex) =>
      Math.min(previousIndex, resolvedPlayOrder.length - 1),
    );
  }, [resolvedPlayOrder.length]);

  useEffect(() => {
    setVisibleTitleId(null);
    didFinishActiveRangeRef.current = false;

    const video = videoRef.current;

    if (video === null || activeItem === null) {
      return;
    }

    function prepareActiveClip() {
      video.currentTime = getTrimStart(activeItem, video);

      if (!shouldAutoPlayNextRef.current) {
        return;
      }

      shouldAutoPlayNextRef.current = false;

      void video.play().catch(() => {
        setIsPlaying(false);
      });
    }

    if (video.readyState >= HTMLMediaElement.HAVE_METADATA) {
      prepareActiveClip();
      return;
    }

    video.addEventListener("loadedmetadata", prepareActiveClip, {
      once: true,
    });

    return () => {
      video.removeEventListener("loadedmetadata", prepareActiveClip);
    };
  }, [activeItem?.slotId, activeItem?.trimStart, activeItem?.trimEnd]);

  function changeClip(nextPlayIndex: number) {
    if (nextPlayIndex < 0 || nextPlayIndex >= resolvedPlayOrder.length) {
      return;
    }

    const video = videoRef.current;

    setVisibleTitleId(null);

    shouldAutoPlayNextRef.current = video !== null && !video.paused;

    setActivePlayIndex(nextPlayIndex);
  }

  function handlePrevious() {
    changeClip(activePlayIndex - 1);
  }

  function handleNext() {
    changeClip(activePlayIndex + 1);
  }

  function handlePlayPause() {
    const video = videoRef.current;

    if (video === null || activeItem === null) {
      return;
    }

    if (video.paused) {
      const trimStart = getTrimStart(activeItem, video);
      const trimEnd = getTrimEnd(activeItem, video);

      if (
        video.currentTime < trimStart ||
        video.currentTime >= trimEnd - 0.01
      ) {
        video.currentTime = trimStart;
      }

      didFinishActiveRangeRef.current = false;

      void video.play();
      return;
    }

    video.pause();
  }

  function handleRestart() {
    const video = videoRef.current;

    if (video === null || activeItem === null) {
      return;
    }

    video.pause();

    setVisibleTitleId(null);
    didFinishActiveRangeRef.current = false;

    video.currentTime = getTrimStart(activeItem, video);

    void video.play();
  }

  if (activeItem === null) {
    return (
      <div className="flex aspect-[9/16] w-full max-w-[360px] items-center justify-center rounded-xl bg-black px-6 text-center text-slate-500">
        Import clips to see your live ranking preview.
      </div>
    );
  }

  return (
    <section className="flex w-full flex-col items-center gap-4">
      <div className="relative aspect-[9/16] w-full max-w-[360px] overflow-hidden rounded-xl bg-black shadow-2xl">
        <video
          key={activeItem.slotId}
          ref={videoRef}
          src={activeItem.videoUrl}
          playsInline
          preload="metadata"
          className="h-full w-full object-cover"
          onTimeUpdate={(event) => {
            const video = event.currentTarget;
            const trimEnd = getTrimEnd(activeItem, video);

            if (video.currentTime >= trimEnd - 0.01) {
              video.pause();
              finishActiveRange();
            }
          }}
          onEnded={finishActiveRange}
          onPlay={() => {
            didFinishActiveRangeRef.current = false;
            setIsPlaying(true);
            setVisibleTitleId(activeItem.slotId);
          }}
          onPause={() => setIsPlaying(false)}
        />

        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute inset-x-0 top-0 bg-gradient-to-b from-black/90 via-black/55 to-transparent px-4 pb-14 pt-4">
            <RichTitleOverlay document={titleDocument} />
          </div>

          <div className="absolute left-3 top-24 flex w-[88%] flex-col gap-5">
            {items.map((item, rankIndex) => {
              const isActiveRank = rankIndex === activeRankIndex;

              const wasRevealedEarlier = resolvedPlayOrder
                .slice(0, activePlayIndex)
                .includes(item.slotId);

              const isCurrentTitle = visibleTitleId === item.slotId;

              const shouldShowTitle = wasRevealedEarlier || isCurrentTitle;

              const rankColor = rankStyles[rankIndex] ?? "text-white";

              return (
                <div
                  key={item.slotId}
                  className="flex items-center gap-2 rounded-md px-1 py-0.5"
                >
                  <span
                    className={`preview-outline min-w-8 text-3xl font-black italic leading-none ${rankColor}`}
                  >
                    {rankIndex + 1}.
                  </span>

                  {shouldShowTitle && (
                    <span
                      className={`preview-outline truncate text-sm font-black uppercase ${
                        isCurrentTitle ? "preview-title-slide" : ""
                      } ${isActiveRank ? "text-white" : "text-slate-200"}`}
                    >
                      {item.title}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        <button
          type="button"
          onClick={handlePrevious}
          disabled={activePlayIndex === 0}
          className="rounded-lg bg-slate-700 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Previous
        </button>

        <button
          type="button"
          onClick={handlePlayPause}
          className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-violet-500"
        >
          {isPlaying ? "Pause" : "Play"}
        </button>

        <button
          type="button"
          onClick={handleNext}
          disabled={activePlayIndex >= resolvedPlayOrder.length - 1}
          className="rounded-lg bg-slate-700 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
        </button>

        <button
          type="button"
          onClick={handleRestart}
          className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-700"
        >
          Restart
        </button>
      </div>
    </section>
  );
}

export default LivePreview;
