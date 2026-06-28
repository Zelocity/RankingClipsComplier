import type { Item } from "../../utils/listUtils";

type RevealOrderPanelProps = {
  items: Item[];
  revealRankOrder: number[];
  onMove: (fromIndex: number, direction: -1 | 1) => void;
};

function RevealOrderPanel({
  items,
  revealRankOrder,
  onMove,
}: RevealOrderPanelProps) {
  const validItems = items.filter((item): item is Item =>
    Boolean(item && typeof item.slotId === "string"),
  );

  if (validItems.length === 0) {
    return null;
  }

  const resolvedRevealOrder: number[] = [];
  const usedRanks = new Set<number>();

  for (const rankNumber of revealRankOrder) {
    const isValidRank =
      Number.isInteger(rankNumber) &&
      rankNumber >= 1 &&
      rankNumber <= validItems.length;

    if (isValidRank && !usedRanks.has(rankNumber)) {
      resolvedRevealOrder.push(rankNumber);
      usedRanks.add(rankNumber);
    }
  }

  for (let rankNumber = 1; rankNumber <= validItems.length; rankNumber += 1) {
    if (!usedRanks.has(rankNumber)) {
      resolvedRevealOrder.push(rankNumber);
    }
  }

  return (
    <section className="mt-6 border-t border-slate-700 pt-5">
      <h2 className="text-lg font-bold text-white">Play & Reveal Order</h2>

      <p className="mt-1 text-sm text-slate-400">
        Choose which rank appears next. This pattern stays the same when a clip
        changes rank.
      </p>

      <div className="mt-3 flex flex-col gap-2">
        {resolvedRevealOrder.map((rankNumber, playIndex) => {
          const rankedItem = validItems[rankNumber - 1];

          if (!rankedItem) {
            return null;
          }

          return (
            <div
              key={rankNumber}
              className="flex items-center gap-3 rounded-lg border border-slate-700 bg-slate-800 p-3"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-600 text-sm font-black text-white">
                {playIndex + 1}
              </span>

              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase text-violet-300">
                  Reveal Rank #{rankNumber}
                </p>

                <p className="truncate font-bold text-white">
                  {rankedItem.title}
                </p>
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
                  disabled={playIndex === resolvedRevealOrder.length - 1}
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
