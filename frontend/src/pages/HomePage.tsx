import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { createJob } from "../api/jobApi";

function HomePage() {
  const navigate = useNavigate();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function startNewProject() {
      try {
        const job = await createJob();

        navigate(`/editor/${job.jobId}`);
      } catch (error) {
        if (error instanceof Error) {
          setErrorMessage(error.message);
        } else {
          setErrorMessage("Failed to create project.");
        }
      }
    }

    startNewProject();
  }, [navigate]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
      <div className="rounded-xl border border-slate-700 bg-slate-900 p-6 text-center shadow-lg">
        {errorMessage ? (
          <>
            <h1 className="text-xl font-semibold text-red-300">
              Could not create project
            </h1>
            <p className="mt-2 text-sm text-slate-400">{errorMessage}</p>
          </>
        ) : (
          <>
            <h1 className="text-xl font-semibold">Creating project...</h1>
            <p className="mt-2 text-sm text-slate-400">Opening your editor.</p>
          </>
        )}
      </div>
    </main>
  );
}

export default HomePage;
