import { useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { deleteJob } from "../api/jobApi";
import { importClipFromUrl, type Clip } from "../api/clipApi";
import TrimSlider from "../components/TrimSlider";

type EditorClip = Clip & {
  duration: number;
  startTime: number;
  endTime: number;
};

function EditorPage() {
  const { jobId } = useParams();
  const navigate = useNavigate();

  const [url, setUrl] = useState<string>("");
  const [clips, setClips] = useState<EditorClip[]>([]);
  const [status, setStatus] = useState<string>("Editor ready.");
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [isLeaving, setIsLeaving] = useState<boolean>(false);

  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});

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

      const newClip: EditorClip = {
        ...result.clip,
        duration: 0,
        startTime: 0,
        endTime: 8,
      };

      setClips((previousClips) => [...previousClips, newClip]);
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

  function updateClipDuration(clipId: string, duration: number) {
    setClips((previousClips) =>
      previousClips.map((clip) => {
        if (clip.id !== clipId) return clip;

        return {
          ...clip,
          duration,
          endTime: Math.min(clip.endTime, duration),
        };
      })
    );
  }

  function updateClipTime(
    clipId: string,
    field: "startTime" | "endTime",
    value: number
  ) {
    const MIN_CLIP_LENGTH = 0.5;

    setClips((previousClips) =>
      previousClips.map((clip) => {
        if (clip.id !== clipId) return clip;

        let newStartTime = clip.startTime;
        let newEndTime = clip.endTime;

        if (field === "startTime") {
          newStartTime = value;

          if (newStartTime >= newEndTime) {
            newStartTime = Math.max(0, newEndTime - MIN_CLIP_LENGTH);
          }
        }

        if (field === "endTime") {
          newEndTime = value;

          if (newEndTime <= newStartTime) {
            newEndTime = newStartTime + MIN_CLIP_LENGTH;
          }

          if (clip.duration > 0) {
            newEndTime = Math.min(newEndTime, clip.duration);
          }
        }

        return {
          ...clip,
          startTime: newStartTime,
          endTime: newEndTime,
        };
      })
    );
  }

  function previewClipTime(clipId: string, time: number) {
    const video = videoRefs.current[clipId];

    if (!video) return;

    video.currentTime = time;
    video.pause();
  }

  function handlePreviewPlay(clip: EditorClip) {
    const video = videoRefs.current[clip.id];

    if (!video) return;

    if (
      video.currentTime < clip.startTime ||
      video.currentTime >= clip.endTime
    ) {
      video.currentTime = clip.startTime;
    }
  }

  function handlePreviewTimeUpdate(clip: EditorClip) {
    const video = videoRefs.current[clip.id];

    if (!video) return;

    if (video.currentTime >= clip.endTime) {
      video.pause();
      video.currentTime = clip.startTime;
    }
  }

  function playPreviewSegment(clip: EditorClip) {
    const video = videoRefs.current[clip.id];

    if (!video) return;

    video.currentTime = clip.startTime;
    video.play();
  }

  function removeClip(clipId: string) {
    setClips((previousClips) =>
      previousClips.filter((clip) => clip.id !== clipId)
    );

    delete videoRefs.current[clipId];
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
            <p>Add clips, choose start/end points, compile, and download.</p>
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
                  <div className="clip-card-header">
                    <h3>Clip {index + 1}</h3>

                    <button onClick={() => removeClip(clip.id)}>
                      Remove
                    </button>
                  </div>

                  <video
                    ref={(element) => {
                      videoRefs.current[clip.id] = element;
                    }}
                    src={clip.videoUrl}
                    controls
                    onLoadedMetadata={(event) => {
                      updateClipDuration(
                        clip.id,
                        event.currentTarget.duration
                      );
                    }}
                    onPlay={() => handlePreviewPlay(clip)}
                    onTimeUpdate={() => handlePreviewTimeUpdate(clip)}
                  />

                  <p className="clip-file-name">{clip.fileName}</p>

                  <TrimSlider
                    duration={clip.duration}
                    startTime={clip.startTime}
                    endTime={clip.endTime}
                    onChangeStart={(value) => {
                      updateClipTime(clip.id, "startTime", value);
                      previewClipTime(clip.id, value);
                    }}
                    onChangeEnd={(value) => {
                      updateClipTime(clip.id, "endTime", value);
                      previewClipTime(clip.id, value);
                    }}
                  />

                  <button onClick={() => playPreviewSegment(clip)}>
                    Preview Segment
                  </button>
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