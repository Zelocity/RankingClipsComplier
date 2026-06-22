import { useEffect, useState } from "react";
import { getClipsForJob, importClipFromUrl, type Clip } from "../api/clipApi";

export type Item = {
  slotId: string;
  title: string;
  videoUrl: string;
};

function createItemFromClip(clip: Clip, titleNumber: number): Item {
  return {
    slotId: clip.id,
    title: `Untitled ${titleNumber}`,
    videoUrl: clip.videoUrl,
  };
}

export function useItemList(currentJobId: string | undefined) {
  const [itemList, setItems] = useState<Item[]>([]);

  useEffect(() => {
    if (!currentJobId) {
      setItems([]);
      return;
    }

    let cancelled = false;

    async function loadSavedClips() {
      try {
        const clips = await getClipsForJob(currentJobId);

        if (cancelled) return;

        const restoredItems = clips.map((clip, index) =>
          createItemFromClip(clip, index + 1),
        );

        console.log("Restored clips:", restoredItems);

        setItems(restoredItems);
      } catch (error) {
        console.error("Could not load saved clips:", error);
      }
    }

    void loadSavedClips();

    return () => {
      cancelled = true;
    };
  }, [currentJobId]);

  async function handleAddItem(jobId: string, url: string) {
    try {
      const result = await importClipFromUrl(jobId, url);

      if (!result.videoUrl) {
        console.error("No video URL returned:", result);
        return;
      }

      const newItem = createItemFromClip(result, itemList.length + 1);

      setItems((previousItems) => [...previousItems, newItem]);
    } catch (error) {
      console.error("Could not import clip:", error);
    }
  }

  function handleDeleteItem(slotId: string) {
    setItems((previousItems) =>
      previousItems.filter((item) => item.slotId !== slotId),
    );
  }

  return {
    itemList,
    setItems,
    handleAddItem,
    handleDeleteItem,
  };
}
