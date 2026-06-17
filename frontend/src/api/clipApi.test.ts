import { describe, it, vi, expect } from "vitest";
import { createJob, deleteJob } from "./jobApi.ts";
import { importClipFromUrl } from "./clipApi.ts";
// import { calculateDiscount } from "./utils";

// describe("createJob()", () => {
//   it("should create job id and output id", () => {
//     let data = createJob();

//     console.log("data: ", data);
//   });
// });

describe("importClipFromUrl()", () => {
  it("returns a clip from the backend response", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        message: "Clip imported successfully.",
        clip: {
          id: "abc123",
          fileName: "abc123.mp4",
          videoUrl: "http://localhost:8000/jobs/job1/clips/abc123.mp4",
        },
      }),
    }) as unknown as typeof fetch;

    const clip = await importClipFromUrl(
      "job1",
      "https://www.youtube.com/shorts/example",
    );

    console.log("clip:", clip);

    expect(clip.clip.id).toBe("abc123");
    expect(clip.clip.fileName).toBe("abc123.mp4");
    expect(clip.clip.videoUrl).toContain("abc123.mp4");
  });

  //   it("should correctly deduct a percentage from the price", () => {
  //     const result = calculateDiscount(100, 20);
  //     expect(result).toBe(80); // Assertion
  //   });
  //   it("should return 0 if given a negative price", () => {
  //     const result = calculateDiscount(-50, 10);
  //     expect(result).toBe(0);
  //   });
});
