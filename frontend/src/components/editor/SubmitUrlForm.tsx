import { useState } from "react";

import type { Item } from "../../utils/listUtils";

type ItemListProps = {
  jobId: string;
  items: Item[];
  onAddItem: (jobId: string, urlId: string) => void;
};

function SubmitUrlForm({ jobId, items, onAddItem }: ItemListProps) {
  const [url, setUrl] = useState("");

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    onAddItem(jobId, url);
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

      <button type="submit" onClick={() => onAddItem}>
        Import Video
      </button>
    </form>
  );
}

export default SubmitUrlForm;
