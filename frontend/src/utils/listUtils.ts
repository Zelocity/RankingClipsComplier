import { useRef, useState } from "react";
import { importClipFromUrl } from "../api/clipApi";

export type Item = {
  slotId: string;
  title: string;
  videoUrlId: string;
};

const initialItems: Item[] = [
  {
    slotId: "1",
    title: "1",
    videoUrlId: "https://www.youtube.com/shorts/02Q-tlITPM0",
  },
  {
    slotId: "2",
    title: "2",
    videoUrlId: "https://www.youtube.com/shorts/NcrWp5et0cs",
  },
  {
    slotId: "3",
    title: "3",
    videoUrlId: "https://www.youtube.com/shorts/Z3HeIJDqxcc",
  },
];

export function createNewItem(nextId: number, videoUrlId: string): Item {
  return {
    slotId: `${nextId}`,
    title: `${nextId}`,
    videoUrlId: `${videoUrlId}`,
  };
}

export function useItemList() {
  const [itemList, setItems] = useState<Item[]>(initialItems);

  // Keeps the next ID after React re-renders the page.
  const nextIdRef = useRef(4);

  async function handleAddItem(jobId: string, url: string) {
    try {
      console.log("Importing:", { jobId, url });

      const result = await importClipFromUrl(jobId, url);

      console.log("Backend returned:", result);
      console.log("videoUrl:", result?.videoUrl);

      if (!result?.videoUrl) {
        console.error("No videoUrl was returned:", result);
        return;
      }

      const newItem = createNewItem(nextIdRef.current, result.videoUrl);

      console.log("New item being added:", newItem);

      setItems((previousItems) => [...previousItems, newItem]);

      nextIdRef.current++;
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
