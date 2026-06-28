import { useEffect, useMemo, useRef, useState, type RefObject } from "react";

import type { Item } from "../../utils/listUtils";

import "./ClipTrimControls.css";

// const DEFAULT_CLIP_LENGTH = 8;
const MINIMUM_CLIP_LENGTH = 0.25;

type ClipTrimControlsProps = {
  item: Item;
  duration: number;
  videoRef: RefObject<HTMLVideoElement | null>;
  onUpdateItemTrim: (
    slotId: string,
    trimStart: number,
    trimEnd: number,
  ) => void | Promise<void>;
};

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "0:00.0";
  }

  const wholeMinutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds - wholeMinutes * 60;

  return `${wholeMinutes}:${remainingSeconds.toFixed(1).padStart(4, "0")}`;
}

function getDefaultTrimEnd(duration: number): number {
  return duration;
}

function ClipTrimControls({
  item,
  duration,
  videoRef,
  onUpdateItemTrim,
}: ClipTrimControlsProps) {
  const safeDuration = Number.isFinite(duration) && duration > 0 ? duration : 0;

  const minimumGap = Math.min(MINIMUM_CLIP_LENGTH, safeDuration);

  const initialValues = useMemo(() => {
    if (safeDuration <= 0) {
      return {
        start: item.trimStart,
        end: item.trimEnd ?? 0,
      };
    }

    const maximumStart = Math.max(0, safeDuration - minimumGap);

    const start = clamp(item.trimStart, 0, maximumStart);

    const requestedEnd = item.trimEnd ?? getDefaultTrimEnd(safeDuration);

    const end = clamp(
      requestedEnd,
      Math.min(safeDuration, start + minimumGap),
      safeDuration,
    );

    return {
      start,
      end,
    };
  }, [item.slotId, item.trimStart, item.trimEnd, minimumGap, safeDuration]);

  const [trimStart, setTrimStart] = useState(initialValues.start);
  const [trimEnd, setTrimEnd] = useState(initialValues.end);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const trimValuesRef = useRef(initialValues);
  const lastSavedRef = useRef(initialValues);

  useEffect(() => {
    const videoElement = videoRef.current;

    if (videoElement === null || safeDuration <= 0) {
      return;
    }

    const activeVideo: HTMLVideoElement = videoElement;

    function stopAtTrimEnd() {
      const { start, end } = trimValuesRef.current;

      if (activeVideo.currentTime >= end) {
        activeVideo.pause();
        activeVideo.currentTime = start;
      }
    }

    activeVideo.addEventListener("timeupdate", stopAtTrimEnd);

    return () => {
      activeVideo.removeEventListener("timeupdate", stopAtTrimEnd);
    };
  }, [safeDuration, videoRef]);

  function seekVideo(time: number) {
    const videoElement = videoRef.current;

    if (videoElement === null) {
      return;
    }

    const activeVideo: HTMLVideoElement = videoElement;

    activeVideo.currentTime = time;
  }

  function setStart(nextStart: number) {
    if (safeDuration <= 0) {
      return;
    }

    const { end } = trimValuesRef.current;

    const nextValue = clamp(nextStart, 0, Math.max(0, end - minimumGap));

    trimValuesRef.current = {
      start: nextValue,
      end,
    };

    setTrimStart(nextValue);
    seekVideo(nextValue);
  }

  function setEnd(nextEnd: number) {
    if (safeDuration <= 0) {
      return;
    }

    const { start } = trimValuesRef.current;

    const nextValue = clamp(
      nextEnd,
      Math.min(safeDuration, start + minimumGap),
      safeDuration,
    );

    trimValuesRef.current = {
      start,
      end: nextValue,
    };

    setTrimEnd(nextValue);
    seekVideo(nextValue);
  }

  async function saveTrim() {
    if (safeDuration <= 0 || isSaving) {
      return;
    }

    const { start, end } = trimValuesRef.current;
    const previous = lastSavedRef.current;

    const didChange =
      Math.abs(start - previous.start) > 0.001 ||
      Math.abs(end - previous.end) > 0.001;

    if (!didChange) {
      return;
    }

    try {
      setIsSaving(true);
      setSaveError("");

      await onUpdateItemTrim(item.slotId, start, end);

      lastSavedRef.current = {
        start,
        end,
      };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Could not save trim settings.";

      setSaveError(message);
    } finally {
      setIsSaving(false);
    }
  }

  function handlePreviewSelection() {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    video.currentTime = trimValuesRef.current.start;
    void video.play();
  }

  async function handleReset() {
    if (safeDuration <= 0) {
      return;
    }

    const resetValues = {
      start: 0,
      end: getDefaultTrimEnd(safeDuration),
    };

    trimValuesRef.current = resetValues;

    setTrimStart(resetValues.start);
    setTrimEnd(resetValues.end);
    seekVideo(resetValues.start);

    try {
      setIsSaving(true);
      setSaveError("");

      await onUpdateItemTrim(item.slotId, resetValues.start, resetValues.end);

      lastSavedRef.current = resetValues;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Could not reset trim settings.";

      setSaveError(message);
    } finally {
      setIsSaving(false);
    }
  }

  if (safeDuration <= 0) {
    return (
      <div className="mt-3 rounded-lg border border-slate-700 bg-slate-900 p-3 text-sm text-slate-400">
        Loading video duration…
      </div>
    );
  }

  const startPercent = (trimStart / safeDuration) * 100;
  const endPercent = (trimEnd / safeDuration) * 100;

  const maximumStart = Math.max(0, trimEnd - minimumGap);
  const minimumEnd = Math.min(safeDuration, trimStart + minimumGap);

  return (
    <section
      data-swapy-no-drag
      className="mt-3 rounded-lg border border-slate-700 bg-slate-900 p-3"
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <h4 className="text-sm font-semibold text-slate-100">Clip Range</h4>

        <span className="text-xs tabular-nums text-violet-300">
          {formatTime(trimStart)} – {formatTime(trimEnd)}
        </span>
      </div>

      <div className="relative h-8">
        <div className="absolute left-0 right-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-slate-700" />

        <div
          className="absolute top-1/2 h-2 -translate-y-1/2 rounded-full bg-violet-500"
          style={{
            left: `${startPercent}%`,
            width: `${Math.max(0, endPercent - startPercent)}%`,
          }}
        />

        <input
          type="range"
          min={0}
          max={maximumStart}
          step={0.05}
          value={trimStart}
          onPointerDown={(event) => event.stopPropagation()}
          onChange={(event) => setStart(Number(event.target.value))}
          onPointerUp={() => void saveTrim()}
          onBlur={() => void saveTrim()}
          aria-label="Clip start time"
          className="trim-range trim-range-start"
        />

        <input
          type="range"
          min={minimumEnd}
          max={safeDuration}
          step={0.05}
          value={trimEnd}
          onPointerDown={(event) => event.stopPropagation()}
          onChange={(event) => setEnd(Number(event.target.value))}
          onPointerUp={() => void saveTrim()}
          onBlur={() => void saveTrim()}
          aria-label="Clip end time"
          className="trim-range trim-range-end"
        />
      </div>

      <div className="mt-2 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={handlePreviewSelection}
          className="rounded-md bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-violet-500"
        >
          Preview Selection
        </button>

        <button
          type="button"
          onClick={() => void handleReset()}
          disabled={isSaving}
          className="rounded-md px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          Reset to Full Clip
        </button>
      </div>

      {isSaving && <p className="mt-2 text-xs text-slate-400">Saving range…</p>}

      {saveError && <p className="mt-2 text-xs text-red-400">{saveError}</p>}
    </section>
  );
}

export default ClipTrimControls;
