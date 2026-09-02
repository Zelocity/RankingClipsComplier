import { describe, it, vi, expect } from "vitest";
import { createJob, deleteJob } from "./jobApi.ts";
import { importClipFromUrl } from "./clipApi.ts";
// import { calculateDiscount } from "./utils";

describe("createJob() and deleteJob()", () => {
  it("should create job", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        message: "Created job successfully",
        jobId: "abc123",
      }),
    }) as unknown as typeof fetch;

    const job = await createJob();

    expect(job.jobId).toBe("abc123");
    expect(job.message).toBe("Created job successfully");
  });

  it("should delete a job", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        message: "Deleted job successfully",
        jobId: "abc123",
      }),
    }) as unknown as typeof fetch;

    const result = await deleteJob("abc123");

    expect(result.message).toBe("Successfully deleted job: abc123");
    expect(result.jobId).toBe("abc123");

    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining("abc123"),
      expect.objectContaining({
        method: "DELETE",
      }),
    );
  });
});

describe("importClipFromUrl()", () => {
  it("returns a clip from the backend response", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        message: "Clip imported successfully.",
        id: "abc123",
        fileName: "abc123.mp4",
        videoUrl: "http://localhost:8000/jobs/job1/clips/abc123.mp4",
      }),
    }) as unknown as typeof fetch;

    const clip = await importClipFromUrl(
      "job1",
      "https://www.youtube.com/shorts/example",
    );

    console.log("clip:", clip);

    expect(clip.id).toBe("abc123");
    expect(clip.fileName).toBe("abc123.mp4");
    expect(clip.videoUrl).toContain("abc123.mp4");
  });
});
