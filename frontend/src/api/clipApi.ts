const API_URL = "http://localhost:8000";

export type Clip = {
  id: string;
  fileName: string;
  videoUrl: string;
};

export type ImportClipResponse = {
  message: string;
  clip: Clip;
};

export async function importClipFromUrl(
  jobId: string,
  url: string
): Promise<ImportClipResponse> {
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