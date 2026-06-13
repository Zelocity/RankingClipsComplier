import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { deleteJob } from "../api/jobApi";

function EditorPage() {
  const { jobId } = useParams();
  const navigate = useNavigate();

  const [status, setStatus] = useState<string>("Editor ready.");
  const [isLeaving, setIsLeaving] = useState<boolean>(false);

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
          <h2>Import Video</h2>

          <input
            type="text"
            placeholder="Paste TikTok, YouTube Shorts, or Instagram Reel URL"
          />

          <button>Import URL</button>
        </section>

        <section className="editor-section">
          <h2>Clips</h2>
          <p>No clips added yet.</p>
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