import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";

import type { Item } from "../../utils/listUtils";

const MINIMUM_CLIP_LENGTH = 0.25;

type DragHandle = "start" | "end" | null;

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

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds - minutes * 60;

  return `${minutes}:${remainingSeconds.toFixed(1).padStart(4, "0")}`;
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

    // null means use the entire video.
    const requestedEnd = item.trimEnd ?? safeDuration;

    const end = clamp(
      requestedEnd,
      Math.min(safeDuration, start + minimumGap),
      safeDuration,
    );

    return { start, end };
  }, [item.slotId, item.trimStart, item.trimEnd, safeDuration, minimumGap]);

  const [trimStart, setTrimStart] = useState(initialValues.start);
  const [trimEnd, setTrimEnd] = useState(initialValues.end);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [draggingHandle, setDraggingHandle] = useState<DragHandle>(null);

  const trackRef = useRef<HTMLDivElement | null>(null);

  const trimValuesRef = useRef(initialValues);
  const lastSavedRef = useRef(initialValues);
  const draggingHandleRef = useRef<DragHandle>(null);

  useEffect(() => {
    setTrimStart(initialValues.start);
    setTrimEnd(initialValues.end);

    trimValuesRef.current = initialValues;
    lastSavedRef.current = initialValues;
  }, [initialValues]);

  useEffect(() => {
    const videoElement = videoRef.current;

    if (videoElement === null || safeDuration <= 0) {
      return;
    }

    function stopAtTrimEnd() {
      const { start, end } = trimValuesRef.current;

      if (videoElement.currentTime >= end) {
        videoElement.pause();
        videoElement.currentTime = start;
      }
    }

    videoElement.addEventListener("timeupdate", stopAtTrimEnd);

    return () => {
      videoElement.removeEventListener("timeupdate", stopAtTrimEnd);
    };
  }, [safeDuration, videoRef]);

  function seekVideo(time: number) {
    const videoElement = videoRef.current;

    if (videoElement === null) {
      return;
    }

    videoElement.currentTime = time;
  }

  function setStart(nextStart: number) {
    if (safeDuration <= 0) {
      return;
    }

    const { end } = trimValuesRef.current;

    const start = clamp(nextStart, 0, Math.max(0, end - minimumGap));

    trimValuesRef.current = { start, end };

    setTrimStart(start);
    seekVideo(start);
  }

  function setEnd(nextEnd: number) {
    if (safeDuration <= 0) {
      return;
    }

    const { start } = trimValuesRef.current;

    const end = clamp(
      nextEnd,
      Math.min(safeDuration, start + minimumGap),
      safeDuration,
    );

    trimValuesRef.current = { start, end };

    setTrimEnd(end);
    seekVideo(end);
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

      lastSavedRef.current = { start, end };
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : "Could not save trim settings.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  function getTimeFromPointer(clientX: number): number | null {
    const track = trackRef.current;

    if (track === null || safeDuration <= 0) {
      return null;
    }

    const rect = track.getBoundingClientRect();

    if (rect.width <= 0) {
      return null;
    }

    const percent = clamp((clientX - rect.left) / rect.width, 0, 1);

    return percent * safeDuration;
  }

  function updateHandleFromPointer(
    handle: Exclude<DragHandle, null>,
    clientX: number,
  ) {
    const time = getTimeFromPointer(clientX);

    if (time === null) {
      return;
    }

    if (handle === "start") {
      setStart(time);
    } else {
      setEnd(time);
    }
  }

  function handlePointerDown(
    handle: Exclude<DragHandle, null>,
    event: ReactPointerEvent<HTMLButtonElement>,
  ) {
    event.preventDefault();
    event.stopPropagation();

    draggingHandleRef.current = handle;
    setDraggingHandle(handle);

    event.currentTarget.setPointerCapture(event.pointerId);

    updateHandleFromPointer(handle, event.clientX);
  }

  function handlePointerMove(
    handle: Exclude<DragHandle, null>,
    event: ReactPointerEvent<HTMLButtonElement>,
  ) {
    if (draggingHandleRef.current !== handle) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    updateHandleFromPointer(handle, event.clientX);
  }

  function handlePointerUp(
    handle: Exclude<DragHandle, null>,
    event: ReactPointerEvent<HTMLButtonElement>,
  ) {
    if (draggingHandleRef.current !== handle) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    updateHandleFromPointer(handle, event.clientX);

    draggingHandleRef.current = null;
    setDraggingHandle(null);

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    void saveTrim();
  }

  function handlePreviewSelection() {
    const videoElement = videoRef.current;

    if (videoElement === null) {
      return;
    }

    videoElement.currentTime = trimValuesRef.current.start;
    void videoElement.play();
  }

  async function handleReset() {
    if (safeDuration <= 0) {
      return;
    }

    const resetValues = {
      start: 0,
      end: safeDuration,
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
      setSaveError(
        error instanceof Error
          ? error.message
          : "Could not reset trim settings.",
      );
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

      <div
        ref={trackRef}
        data-swapy-no-drag
        className="relative h-10 select-none touch-none"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <div className="absolute left-0 right-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-slate-700" />

        <div
          className="absolute top-1/2 h-2 -translate-y-1/2 rounded-full bg-violet-500"
          style={{
            left: `${startPercent}%`,
            width: `${Math.max(0, endPercent - startPercent)}%`,
          }}
        />

        <button
          type="button"
          aria-label="Drag clip start time"
          className={`absolute top-1/2 z-30 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-violet-500 shadow-lg transition-transform hover:scale-110 ${
            draggingHandle === "start" ? "scale-125" : ""
          }`}
          style={{ left: `${startPercent}%` }}
          onPointerDown={(event) => handlePointerDown("start", event)}
          onPointerMove={(event) => handlePointerMove("start", event)}
          onPointerUp={(event) => handlePointerUp("start", event)}
          onPointerCancel={(event) => handlePointerUp("start", event)}
        />

        <button
          type="button"
          aria-label="Drag clip end time"
          className={`absolute top-1/2 z-30 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-violet-500 shadow-lg transition-transform hover:scale-110 ${
            draggingHandle === "end" ? "scale-125" : ""
          }`}
          style={{ left: `${endPercent}%` }}
          onPointerDown={(event) => handlePointerDown("end", event)}
          onPointerMove={(event) => handlePointerMove("end", event)}
          onPointerUp={(event) => handlePointerUp("end", event)}
          onPointerCancel={(event) => handlePointerUp("end", event)}
        />
      </div>

      <div className="mt-2 flex items-center justify-between gap-2">
        <button
          type="button"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={handlePreviewSelection}
          className="rounded-md bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-violet-500"
        >
          Preview Selection
        </button>

        <button
          type="button"
          onPointerDown={(event) => event.stopPropagation()}
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
