import { createTitleSegment, type TitleSegment } from "../../utils/titleUtils";

type VideoTitleEditorProps = {
  segments: TitleSegment[];
  onChange: (nextSegments: TitleSegment[]) => void;
};

function VideoTitleEditor({ segments, onChange }: VideoTitleEditorProps) {
  function updateSegment(segmentId: string, updates: Partial<TitleSegment>) {
    onChange(
      segments.map((segment) =>
        segment.id === segmentId ? { ...segment, ...updates } : segment,
      ),
    );
  }

  function removeSegment(segmentId: string) {
    if (segments.length <= 1) {
      return;
    }

    onChange(segments.filter((segment) => segment.id !== segmentId));
  }

  function moveSegment(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;

    if (nextIndex < 0 || nextIndex >= segments.length) {
      return;
    }

    const nextSegments = [...segments];

    [nextSegments[index], nextSegments[nextIndex]] = [
      nextSegments[nextIndex],
      nextSegments[index],
    ];

    onChange(nextSegments);
  }

  function addSegment() {
    onChange([...segments, createTitleSegment()]);
  }

  return (
    <section className="mb-6 border-b border-slate-700 pb-5">
      <h2 className="text-lg font-bold text-white">Video Title</h2>

      <p className="mt-1 text-sm text-slate-400">
        Add colored inline pieces for the title shown on the ranking video.
      </p>

      <div className="mt-4 flex flex-col gap-3">
        {segments.map((segment, index) => (
          <div
            key={segment.id}
            className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 p-2"
          >
            <input
              type="text"
              value={segment.text}
              onChange={(event) =>
                updateSegment(segment.id, {
                  text: event.target.value,
                })
              }
              placeholder="Title text"
              className="min-w-0 flex-1 rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-violet-400"
            />

            <input
              type="color"
              value={segment.color}
              onChange={(event) =>
                updateSegment(segment.id, {
                  color: event.target.value,
                })
              }
              className="h-10 w-11 cursor-pointer rounded border border-slate-600 bg-slate-900 p-1"
              title="Choose text color"
            />

            <button
              type="button"
              onClick={() => moveSegment(index, -1)}
              disabled={index === 0}
              className="rounded bg-slate-700 px-2 py-1 text-white hover:bg-slate-600 disabled:opacity-40"
            >
              ←
            </button>

            <button
              type="button"
              onClick={() => moveSegment(index, 1)}
              disabled={index === segments.length - 1}
              className="rounded bg-slate-700 px-2 py-1 text-white hover:bg-slate-600 disabled:opacity-40"
            >
              →
            </button>

            <button
              type="button"
              onClick={() => removeSegment(segment.id)}
              disabled={segments.length <= 1}
              className="rounded bg-red-600 px-2 py-1 text-sm font-bold text-white hover:bg-red-500 disabled:opacity-40"
            >
              ×
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={addSegment}
          className="w-fit rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500"
        >
          Add Inline Text
        </button>
      </div>
    </section>
  );
}

export default VideoTitleEditor;
