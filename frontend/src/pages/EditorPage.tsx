import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { deleteJob } from "../api/jobApi";
import { importClipFromUrl, type Clip } from "../api/clipApi";

function EditorPage() {
  const { jobId } = useParams();
  const navigate = useNavigate();

  const [url, setUrl] = useState<string>("");
  const [clips, setClips] = useState<Clip[]>([]);
  const [status, setStatus] = useState<string>("Editor ready.");
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [isLeaving, setIsLeaving] = useState<boolean>(false);

  async function handleImportClip() {
    if (!jobId) {
      setStatus("Missing job ID.");
      return;
    }

    if (!url.trim()) {
      setStatus("Please enter a URL.");
      return;
    }

    try {
      setIsImporting(true);
      setStatus("Importing clip...");

      const result = await importClipFromUrl(jobId, url.trim());

      setClips((previousClips) => [...previousClips, result.clip]);
      setUrl("");
      setStatus(result.message);
    } catch (error) {
      if (error instanceof Error) {
        setStatus(`Error: ${error.message}`);
      } else {
        setStatus("Unknown error importing clip.");
      }
    } finally {
      setIsImporting(false);
    }
  }

  async function handleLeaveEditor() {
    if (!jobId) {
      navigate("/");
      return;
    }

    try {
      setIsLeaving(true);
      setStatus("Deleting job...");

      await deleteJob(jobId);

      navigate("/");
    } catch (error) {
      if (error instanceof Error) {
        setStatus(`Error: ${error.message}`);
      } else {
        setStatus("Unknown error deleting job.");
      }
    } finally {
      setIsLeaving(false);
    }
  }

  return (
    <main className="page">
      <section className="panel">
        <div className="top-row">
          <div>
            <h1>Project Editor</h1>
            <p>Add clips, arrange rankings, compile, and download your video.</p>
          </div>

          <button onClick={handleLeaveEditor} disabled={isLeaving}>
            {isLeaving ? "Leaving..." : "Back Home"}
          </button>
        </div>

        <div className="job-box">
          <strong>Current Job ID:</strong>
          <span>{jobId}</span>
        </div>

        <p className="status">
          <strong>Status:</strong> {status}
        </p>

        <section className="editor-section">
          <h2>Import Video URL</h2>

          <input
            type="text"
            value={url}
            placeholder="Paste TikTok, YouTube Shorts, Instagram Reel, or other supported URL"
            onChange={(event) => setUrl(event.target.value)}
          />

          <button onClick={handleImportClip} disabled={isImporting}>
            {isImporting ? "Importing..." : "Add Clip"}
          </button>
        </section>

        <section className="editor-section">
          <h2>Clips</h2>

          {clips.length === 0 ? (
            <p>No clips added yet.</p>
          ) : (
            <div className="clip-list">
              {clips.map((clip, index) => (
                <div className="clip-card" key={clip.id}>
                  <h3>Clip {index + 1}</h3>

                  <video src={clip.videoUrl} controls width="320" />

                  <p>{clip.fileName}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="editor-section">
          <h2>Export</h2>
          <button>Compile Video</button>
          <button>Download Final Video</button>
        </section>
      </section>
    </main>
  );
}

export default EditorPage;