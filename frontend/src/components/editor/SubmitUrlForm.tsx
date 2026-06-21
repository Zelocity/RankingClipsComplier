import { useState, type FormEvent } from "react";

type SubmitUrlFormProps = {
  jobId: string;
  onAddItem: (jobId: string, url: string) => Promise<void>;
};

function SubmitUrlForm({ jobId, onAddItem }: SubmitUrlFormProps) {
  const [url, setUrl] = useState("");
  const [isImporting, setIsImporting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (!url) {
      console.log("Please enter a video URL");
      return;
    }

    try {
      setIsImporting(true);

      console.log("Submitting URL:", url);
      await onAddItem(jobId, url);

      setUrl("");
    } catch (error) {
      console.error("Failed to import video:", error);
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="url"
        value={url}
        onChange={(event) => setUrl(event.target.value)}
        placeholder="Paste video URL"
        disabled={isImporting}
        required
      />

      <button type="submit" disabled={isImporting}>
        {isImporting ? "Importing..." : "Import Video"}
      </button>
    </form>
  );
}

export default SubmitUrlForm;
