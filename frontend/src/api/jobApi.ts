const API_URL = "http://localhost:8000";

export type jobResponse = {
  message: string;
  jobId: string;
};

export async function createJob(): Promise<jobResponse> {
  const response = await fetch(`${API_URL}/jobs`, {
    method: "POST",
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to create job.");
  }

  return data;
}

export async function deleteJob(jobId: string): Promise<jobResponse> {
  const response = await fetch(`${API_URL}/jobs/${jobId}`, {
    method: "DELETE",
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to delete job.");
  }
  data.message = `Successfully deleted job: ${jobId}`;
  return data;
}
