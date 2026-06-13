import { useState } from "react";
import { createJob } from "./api/jobApi";
import "./App.css";

function App() {
  const [jobId, setJobId] = useState<string>("");
  const [status, setStatus] = useState<string>("No job created yet.");
  const [isCreatingJob, setIsCreatingJob] = useState<boolean>(false);

  async function handleCreateJob() {
    try {
      setIsCreatingJob(true);
      setStatus("Creating job...");

      const result = await createJob();

      setJobId(result.jobId);
      setStatus(result.message);
    } catch (error) {
      if (error instanceof Error) {
        setStatus(`Error: ${error.message}`);
      } else {
        setStatus("Unknown error creating job.");
      }
    } finally {
      setIsCreatingJob(false);
    }
  }

  return (
    <main>
      <h1>Ranking Video Compiler</h1>

      <button onClick={handleCreateJob} disabled={isCreatingJob}>
        {isCreatingJob ? "Creating..." : "Create Job"}
      </button>

      <p>
        <strong>Status:</strong> {status}
      </p>

      {jobId && (
        <p>
          <strong>Current Job ID:</strong> {jobId}
        </p>
      )}
    </main>
  );
}

export default App;