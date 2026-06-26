import { useEffect, useRef, useState } from "react";
import type { Item } from "../../utils/listUtils";

type LivePreviewProps = {
  items: Item[];
};

function LivePreview({ items }: LivePreviewProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [activeIndex, setActiveIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const shouldAutoPlayNextRef = useRef(false);

  const activeItem = items[activeIndex] ?? null;
  const rankNumber = activeIndex + 1;

  useEffect(() => {
    if (items.length === 0) {
      setActiveIndex(0);
      setIsPlaying(false);
      return;
    }

    setActiveIndex((previousIndex) =>
      Math.min(previousIndex, items.length - 1),
    );
  }, [items.length]);

  useEffect(() => {
    const video = videoRef.current;

    if (!video || !activeItem) {
      return;
    }

    video.currentTime = 0;

    if (!shouldAutoPlayNextRef.current) {
      return;
    }

    shouldAutoPlayNextRef.current = false;

    void video.play().catch(() => {
      setIsPlaying(false);
    });
  }, [activeItem?.slotId]);

  function changeClip(nextIndex: number) {
    const video = videoRef.current;

    shouldAutoPlayNextRef.current = video ? !video.paused : false;

    setActiveIndex(nextIndex);
  }

  function handlePrevious() {
    if (activeIndex === 0) {
      return;
    }

    changeClip(activeIndex - 1);
  }

  function handleNext() {
    if (activeIndex >= items.length - 1) {
      return;
    }

    changeClip(activeIndex + 1);
  }

  function handlePlayPause() {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    if (video.paused) {
      void video.play();
    } else {
      video.pause();
    }
  }

  function handleRestart() {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    video.currentTime = 0;
    void video.play();
  }

  function handleVideoEnded() {
    if (activeIndex >= items.length - 1) {
      setIsPlaying(false);
      return;
    }

    shouldAutoPlayNextRef.current = true;
    setActiveIndex((previousIndex) => previousIndex + 1);
  }

  if (!activeItem) {
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
          onEnded={handleVideoEnded}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          className="h-full w-full object-cover"
        />

        <div className="pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-black/80 via-black/30 to-transparent px-5 pb-16 pt-5">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-violet-300">
            Rank #{rankNumber}
          </p>

          <h3 className="mt-2 text-xl font-black leading-tight text-white drop-shadow-lg">
            {activeItem.title}
          </h3>
        </div>

        <div className="pointer-events-none absolute bottom-4 left-4 rounded-lg bg-black/70 px-3 py-2 text-sm font-semibold text-white backdrop-blur-sm">
          Clip {activeIndex + 1} of {items.length}
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        <button
          type="button"
          onClick={handlePrevious}
          disabled={activeIndex === 0}
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
          disabled={activeIndex >= items.length - 1}
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
