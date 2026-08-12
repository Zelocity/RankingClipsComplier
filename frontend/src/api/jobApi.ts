const API_URL = import.meta.env.VITE_API_URL;

export type CreatedJob = {
  message: string;
  jobId: string;
};

export async function createJob(): Promise<CreatedJob> {
  const response = await fetch(`${API_URL}/jobs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to create job.");
  }

  return data;
}

export async function deleteJob(jobId: string): Promise<void> {
  const response = await fetch(`${API_URL}/jobs/${jobId}`, {
    method: "DELETE",
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to delete job.");
  }
}
