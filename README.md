# Ranking Video Compiler

A web application for importing, organizing, ranking, and compiling short-form video clips into a single ranking-style video.

The project is designed to simplify the process of creating ranked content from sources such as TikTok, Instagram Reels, and YouTube Shorts. Users can import clips using URLs, rearrange their order through a drag-and-drop interface, preview clips, and compile them into one finished video.

## Features

* Import video clips from supported URLs
* Create separate compilation jobs
* Drag and drop clips to reorder rankings
* Collapse and expand individual clips
* Preview imported videos
* Delete clips from a compilation
* Store clips by job
* Compile multiple clips into a single video
* Automatically process media using Python and FFmpeg
* Responsive React-based editor interface

## Tech Stack

### Frontend

* React
* TypeScript
* Vite
* Swapy
* HTML/CSS

### Backend

* Node.js
* Express
* TypeScript

### Video Processing

* Python
* yt-dlp
* FFmpeg
* MoviePy

## How It Works

The application is split into three main parts:

1. **Frontend**
   The React frontend provides the video editor interface. Users can submit video URLs, preview imported clips, reorder them, and manage their ranking.

2. **Backend**
   The Express backend manages jobs and communicates between the frontend and the Python media-processing scripts.

3. **Video Processing**
   Python, yt-dlp, FFmpeg, and MoviePy handle downloading, processing, and combining video clips.

A typical workflow looks like:

```text
Video URL
    ↓
React Frontend
    ↓
Express API
    ↓
Python / yt-dlp
    ↓
Downloaded Clip
    ↓
User Reorders Clips
    ↓
Compilation Request
    ↓
FFmpeg / MoviePy
    ↓
Final Ranking Video
```

## Project Structure

```text
ranking-video-compiler/
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── utils/
│   │   └── services/
│   └── package.json
│
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   └── server.ts
│   └── package.json
│
├── python/
│   ├── compiler.py
│   ├── job.py
│   └── cleanup.py
│
└── storage/
    └── jobs/
        └── {jobId}/
            ├── input/
            └── output/
```

> The exact folder structure may vary as development continues.

## Getting Started

### Prerequisites

Make sure you have the following installed:

* Node.js
* npm
* Python
* FFmpeg
* Git

You can verify the installations with:

```bash
node --version
npm --version
python --version
ffmpeg -version
git --version
```

## Installation

### 1. Clone the repository

```bash
git clone <your-repository-url>
cd ranking-video-compiler
```

### 2. Install frontend dependencies

```bash
cd frontend
npm install
```

### 3. Install backend dependencies

```bash
cd ../backend
npm install
```

### 4. Set up Python

Create a virtual environment:

```bash
python -m venv .venv
```

Activate it on Windows:

```bash
.venv\Scripts\activate
```

Activate it on macOS/Linux:

```bash
source .venv/bin/activate
```

Install the Python dependencies:

```bash
pip install -r requirements.txt
```

The media-processing dependencies include tools such as:

```text
yt-dlp
moviepy
```

FFmpeg must also be installed on the system.

## Running the Project

### Start the backend

From the backend directory:

```bash
npm run dev
```

The backend currently runs locally at:

```text
http://localhost:8000
```

### Start the frontend

Open another terminal and navigate to the frontend directory:

```bash
npm run dev
```

Vite will display the local development URL, typically:

```text
http://localhost:5173
```

Open the URL in your browser to use the application.

## Importing a Clip

Users can enter a supported video URL into the editor.

The frontend sends the URL to an endpoint similar to:

```text
POST /jobs/:jobId/import-url
```

The backend then:

1. Validates the job and URL.
2. Creates the required job directories.
3. Starts the Python/yt-dlp process.
4. Downloads the video.
5. Returns information about the imported clip.
6. Adds the clip to the editor.

Imported videos are organized by job:

```text
storage/jobs/{jobId}/input/
```

Compiled videos can be stored in:

```text
storage/jobs/{jobId}/output/
```

## Ranking Clips

Clips in the editor can be reordered using drag and drop.

The project uses **Swapy** to manage the draggable clip list.

Each item is associated with a slot, allowing the ranking order to be changed visually before compilation.

## Video Compilation

Once the clips are arranged in the desired order, the backend can pass the selected videos to the Python compiler.

MoviePy and FFmpeg are used to process and combine the clips into one output video.

```text
Clip 1
Clip 2
Clip 3
Clip 4
   ↓
Compiler
   ↓
Final Video
```

## Planned Features

Future improvements include:

* Video trimming controls
* Dual-handle trim slider
* Live trim preview
* Ranking number overlays
* Custom ranking text
* Improved compilation progress
* Persistent projects
* Improved error handling
* User accounts
* Cloud storage
* Online deployment
* Background video processing
* Downloadable final videos
* Additional video source support
* Improved mobile interface

## Development Goals

The main goal of this project is to reduce the repetitive work involved in creating ranking-style short-form videos.

Instead of manually downloading, trimming, organizing, numbering, and combining every clip, the application aims to provide the entire workflow through a single browser-based editor.

## Known Limitations

* Some websites may restrict automated video downloading.
* Certain URLs may require authentication or cookies.
* yt-dlp compatibility can change when platforms update their websites.
* Video compilation can use significant CPU, memory, and storage.
* The application is currently intended primarily for development and personal use.

## Legal Notice

Users are responsible for ensuring they have permission to download, modify, and redistribute any media processed through this application.

This project is intended for educational and personal development purposes and is not affiliated with TikTok, Instagram, YouTube, or other supported platforms.

## Author

**Brandon Shin**

Computer Science graduate and software developer interested in full-stack development, interactive applications, media tools, and software engineering.

## Status

🚧 **In Development**

The project is actively being developed, with additional editing and video-processing functionality planned.
