import type { Item } from "../../utils/listUtils";

type RevealOrderPanelProps = {
  items: Item[];
  playOrder: string[];
  onMove: (fromIndex: number, direction: -1 | 1) => void;
};

function RevealOrderPanel({ items, playOrder, onMove }: RevealOrderPanelProps) {
  // Ignore any temporary empty Swapy entries during deletion.
  const validItems = items.filter((item): item is Item =>
    Boolean(item && typeof item.slotId === "string"),
  );

  const itemsById = new Map(validItems.map((item) => [item.slotId, item]));

  // Keep valid saved play-order IDs.
  const validPlayOrder = playOrder.filter((slotId) => itemsById.has(slotId));

  // Add any new clips that are not yet in playOrder.
  const includedIds = new Set(validPlayOrder);

  const missingIds = validItems
    .map((item) => item.slotId)
    .filter((slotId) => !includedIds.has(slotId));

  const resolvedPlayOrder = [...validPlayOrder, ...missingIds];

  const orderedItems = resolvedPlayOrder
    .map((slotId) => itemsById.get(slotId))
    .filter((item): item is Item => Boolean(item));

  if (orderedItems.length === 0) {
    return null;
  }

  return (
    <section className="mt-6 border-t border-slate-700 pt-5">
      <h3 className="text-lg font-bold text-white">Play & Reveal Order</h3>

      <p className="mt-1 text-sm text-slate-400">
        Move ranks up or down to choose which clip plays and reveals next.
      </p>

      <div className="mt-3 flex flex-col gap-2">
        {orderedItems.map((item, playIndex) => {
          const rankIndex = validItems.findIndex(
            (rankedItem) => rankedItem.slotId === item.slotId,
          );

          return (
            <div
              key={item.slotId}
              className="flex items-center gap-3 rounded-lg border border-slate-700 bg-slate-800 p-3"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-600 text-sm font-black text-white">
                {playIndex + 1}
              </span>

              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase text-violet-300">
                  Rank #{rankIndex + 1}
                </p>

                <p className="truncate font-bold text-white">{item.title}</p>
              </div>

              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => onMove(playIndex, -1)}
                  disabled={playIndex === 0}
                  className="rounded bg-slate-700 px-2 py-1 text-sm font-bold text-white hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  ↑
                </button>

                <button
                  type="button"
                  onClick={() => onMove(playIndex, 1)}
                  disabled={playIndex === orderedItems.length - 1}
                  className="rounded bg-slate-700 px-2 py-1 text-sm font-bold text-white hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  ↓
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default RevealOrderPanel;
