import { useState } from "react";

import type { Item } from "../../utils/listUtils";

type ItemListProps = {
  items: Item[];
  onAddItem: (slotId: string) => void;
};

function SubmitUrlForm({ onAddItem }: ItemListProps) {
  const [url, setUrl] = useState("");

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    console.log("Submitted URL:", url);

    setUrl("");
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="url"
        value={url}
        onChange={(event) => setUrl(event.target.value)}
        placeholder="Paste video URL"
      />

      <button type="submit">Import Video</button>
    </form>
  );
}

export default SubmitUrlForm;
