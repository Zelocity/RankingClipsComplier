import { useEffect, useState } from "react";

import {
  deleteClip,
  getClipsForJob,
  importClipFromUrl,
  updateClipTitle,
  updateClipTrim,
  type Clip,
} from "../api/clipApi";

export type Item = {
  slotId: string;
  title: string;
  videoUrl: string;
  trimStart: number;
  trimEnd: number | null;
};

function createItemFromClip(clip: Clip, titleNumber: number): Item {
  return {
    slotId: clip.id,
    title: clip.title || `Untitled ${titleNumber}`,
    videoUrl: clip.videoUrl,
    trimStart: clip.trimStart,
    trimEnd: clip.trimEnd,
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

        if (cancelled) {
          return;
        }

        setItems(
          clips.map((clip, index) =>
            createItemFromClip(clip, index + 1),
          ),
        );
      } catch (error) {
        console.error("Could not load saved clips:", error);
      }
    }

    void loadSavedClips();

    return () => {
      cancelled = true;
    };
  }, [currentJobId]);

  async function handleUpdateItemTitle(
    slotId: string,
    newTitle: string,
  ) {
    const trimmedTitle = newTitle.trim();

    if (!trimmedTitle || !currentJobId) {
      return;
    }

    const updatedClip = await updateClipTitle(
      currentJobId,
      slotId,
      trimmedTitle,
    );

    setItems((previousItems) =>
      previousItems.map((item) =>
        item.slotId === slotId
          ? {
              ...item,
              title: updatedClip.title,
            }
          : item,
      ),
    );
  }

  async function handleUpdateItemTrim(
    slotId: string,
    trimStart: number,
    trimEnd: number,
  ) {
    if (!currentJobId) {
      return;
    }

    const updatedClip = await updateClipTrim(
      currentJobId,
      slotId,
      trimStart,
      trimEnd,
    );

    setItems((previousItems) =>
      previousItems.map((item) =>
        item.slotId === slotId
          ? {
              ...item,
              trimStart: updatedClip.trimStart,
              trimEnd: updatedClip.trimEnd,
            }
          : item,
      ),
    );
  }

  async function handleAddItem(jobId: string, url: string) {
    try {
      const result = await importClipFromUrl(jobId, url);

      if (!result.videoUrl) {
        console.error("No video URL returned:", result);
        return;
      }

      const newItem = createItemFromClip(
        result,
        itemList.length + 1,
      );

      setItems((previousItems) => [...previousItems, newItem]);
    } catch (error) {
      console.error("Could not import clip:", error);
    }
  }

  async function handleDeleteItem(slotId: string) {
    if (!currentJobId) {
      return;
    }

    try {
      await deleteClip(currentJobId, slotId);

      setItems((previousItems) =>
        previousItems.filter((item) => item.slotId !== slotId),
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not delete clip.";

      console.error(message);
      alert(message);
      throw error;
    }
  }

  return {
    itemList,
    setItems,
    handleAddItem,
    handleDeleteItem,
    handleUpdateItemTitle,
    handleUpdateItemTrim,
  };
}
