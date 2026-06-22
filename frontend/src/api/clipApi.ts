const API_URL = "http://localhost:8000";

export type Clip = {
  id: string;
  fileName: string;
  videoUrl: string;
};

export async function getClipsForJob(jobId: string): Promise<Clip[]> {
  const response = await fetch(`${API_URL}/jobs/${jobId}/clips`);

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to load saved clips.");
  }

  return data.clips;
}

export async function importClipFromUrl(
  jobId: string,
  url: string,
): Promise<Clip> {
  const response = await fetch(`${API_URL}/jobs/${jobId}/import-url`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ url }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || data.message || "Failed to import clip.");
  }

  return data;
}
