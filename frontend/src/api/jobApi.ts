const API_URL = "http://localhost:8000";

export type CreateJobResponse = {
  message: string;
  jobId: string;
};

export async function createJob(): Promise<CreateJobResponse> {
  const response = await fetch(`${API_URL}/jobs`, {
    method: "POST",
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to create job.");
  }

  return data;
}