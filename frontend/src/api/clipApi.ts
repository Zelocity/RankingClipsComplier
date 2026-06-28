const API_URL = "http://localhost:8000";
import type { TitleDocument } from "../utils/titleDocument";

export type Clip = {
  id: string;
  fileName: string;
  title: string;
  videoUrl: string;
};

export async function updateClipTitle(
  jobId: string,
  clipId: string,
  title: string,
): Promise<Clip> {
  const response = await fetch(
    `${API_URL}/jobs/${jobId}/clips/${clipId}/title`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ title }),
    },
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Could not update clip title.");
  }

  return {
    id: data.id,
    fileName: data.fileName,
    title: data.title,
    videoUrl: data.videoUrl,
  };
}

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

export type CompileResponse = {
  message: string;
  videoUrl: string;
  downloadUrl: string;
};

export type CompileSettings = {
  titleDocument: TitleDocument;
  rankedClipIds: string[];
  playOrder: string[];
};

export async function compileJob(
  jobId: string,
  settings: CompileSettings,
): Promise<CompileResponse> {
  const response = await fetch(`${API_URL}/compile/${jobId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(settings),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Could not compile video.");
  }

  return data;
}

export async function deleteClip(jobId: string, clipId: string): Promise<void> {
  const response = await fetch(`${API_URL}/jobs/${jobId}/clips/${clipId}`, {
    method: "DELETE",
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Could not delete clip.");
  }
}
