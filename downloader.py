import subprocess
from pathlib import Path

def download_video(url: str, output_dir: str = "input") -> None:
    input_dir = Path(output_dir)
    input_dir.mkdir(exist_ok=True)

    command = [
        "yt-dlp",
        "-P", str(input_dir),
        "-t", "mp4",
        "-o", "%(title).80s-%(id)s.%(ext)s",
        url
    ]

    subprocess.run(command, check=True)

    print("Download complete.")