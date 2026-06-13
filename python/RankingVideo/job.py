from pathlib import Path
import re
import shutil


PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
JOBS_DIR = PROJECT_ROOT / "storage" / "jobs"


def is_valid_job_id(jobID: str) -> bool:
    if not jobID:
        return False

    jobID = jobID.strip()

    return re.fullmatch(r"[A-Za-z0-9_-]+", jobID) is not None


def createJob(jobID: str) -> bool:
    if not is_valid_job_id(jobID):
        print(f"Invalid jobID: {jobID}")
        return False

    jobID = jobID.strip()

    job_path = JOBS_DIR / jobID
    input_path = job_path / "input"
    output_path = job_path / "output"

    if job_path.exists():
        print(f"Job already exists: {jobID}")
        return False

    try:
        input_path.mkdir(parents=True)
        output_path.mkdir(parents=True)

        print(f"Created job: {jobID}")
        return True

    except OSError as error:
        print(f"Failed to create job {jobID}: {error}")
        return False


def removeJob(jobID: str) -> bool:
    if not is_valid_job_id(jobID):
        print(f"Invalid jobID: {jobID}")
        return False

    jobID = jobID.strip()

    job_path = JOBS_DIR / jobID

    if not job_path.exists():
        print(f"Job does not exist: {jobID}")
        return False

    if not job_path.is_dir():
        print(f"Job path is not a folder: {job_path}")
        return False

    try:
        shutil.rmtree(job_path)
        print(f"Removed job: {jobID}")
        return True

    except OSError as error:
        print(f"Failed to remove job {jobID}: {error}")
        return False