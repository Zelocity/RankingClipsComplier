import { useRef, useState } from "react";
import { importClipFromUrl } from "../api/clipApi";

export type Item = {
  slotId: string;
  title: string;
  url: string;
};

const initialItems: Item[] = [
  {
    slotId: "1",
    title: "1",
    url: "https://www.youtube.com/shorts/02Q-tlITPM0",
  },
  {
    slotId: "2",
    title: "2",
    url: "https://www.youtube.com/shorts/NcrWp5et0cs",
  },
  {
    slotId: "3",
    title: "3",
    url: "https://www.youtube.com/shorts/Z3HeIJDqxcc",
  },
];

export function createNewItem(nextId: number): Item {
  return {
    slotId: `${nextId}`,
    title: `${nextId}`,
    url: "",
  };
}

export function useItemList() {
  const [itemList, setItems] = useState<Item[]>(initialItems);

  // Keeps the next ID after React re-renders the page.
  const nextIdRef = useRef(4);

  async function handleAddItem(jobId: string, urlId: string) {
    const result = await importClipFromUrl(jobId, urlId);

    if (!result) {
      console.log("[handleAddItem] No results from jobId or urlId");
    }
    console.log("[handleAddItem]", result);
    const newItem = createNewItem(nextIdRef.current);

    setItems((previousItems) => [...previousItems, newItem]);

    nextIdRef.current++;
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
