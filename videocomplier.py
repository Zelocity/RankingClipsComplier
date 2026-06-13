from pathlib import Path
from moviepy import VideoFileClip, concatenate_videoclips


INPUT_DIR = Path("input")
OUTPUT_DIR = Path("output")

VIDEO_EXTENSIONS = [".mp4", ".mov", ".mkv", ".webm"]


def format_vertical(clip, target_width=1080, target_height=1920):
    target_ratio = target_width / target_height
    clip_ratio = clip.w / clip.h

    # If video is too wide, resize by height then crop sides
    if clip_ratio > target_ratio:
        clip = clip.resized(height=target_height)
        clip = clip.cropped(
            x_center=clip.w / 2,
            y_center=clip.h / 2,
            width=target_width,
            height=target_height
        )

    # If video is too tall/narrow, resize by width then crop top/bottom
    else:
        clip = clip.resized(width=target_width)
        clip = clip.cropped(
            x_center=clip.w / 2,
            y_center=clip.h / 2,
            width=target_width,
            height=target_height
        )

    return clip


def compile_videos(input_dir: str = "input", output_dir: str = "output") -> None:
    input_path = Path(input_dir)
    output_path = Path(output_dir)

    output_path.mkdir(exist_ok=True)

    video_files = [
        file for file in input_path.iterdir()
        if file.suffix.lower() in VIDEO_EXTENSIONS
    ]

    video_files.sort()

    if not video_files:
        print("No videos found in input folder.")
        return

    clips = []

    for video_file in video_files:
        print(f"Processing: {video_file.name}")

        clip = VideoFileClip(str(video_file))

        # Optional: limit each video to first 8 seconds
        # Remove this line if you want the full video
        clip = clip.subclipped(0, min(8, clip.duration))

        clip = format_vertical(clip)
        clips.append(clip)

    final_video = concatenate_videoclips(clips, method="compose")

    final_output = output_path / "compiled_video.mp4"

    final_video.write_videofile(
        str(final_output),
        fps=30,
        codec="libx264",
        audio_codec="aac"
    )

    for clip in clips:
        clip.close()

    final_video.close()

    print(f"Done! Final video saved to: {final_output}")
