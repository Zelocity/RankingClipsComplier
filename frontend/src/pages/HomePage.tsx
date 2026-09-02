import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createJob } from "../api/jobApi";

function HomePage() {
  const navigate = useNavigate();

  const [status, setStatus] = useState<string>("Ready.");
  const [isCreatingJob, setIsCreatingJob] = useState<boolean>(false);

  async function handleCreateJob() {
    try {
      setIsCreatingJob(true);
      setStatus("Creating new project...");

      const result = await createJob();

      navigate(`/editor/${result.jobId}`);
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
    <main className="page">
      <section className="panel">
        <h1>Ranking Video Compiler</h1>
        <p>Create ranking-style videos from online clips or local videos.</p>

        <button onClick={handleCreateJob} disabled={isCreatingJob}>
          {isCreatingJob ? "Creating..." : "Create New Project"}
        </button>

        <p className="status">
          <strong>Status:</strong> {status}
        </p>
      </section>
    </main>
  );
}

export default HomePage;