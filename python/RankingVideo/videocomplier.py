from pathlib import Path
import argparse

import numpy as np
from PIL import Image, ImageDraw, ImageFont
from moviepy import (
    CompositeVideoClip,
    ImageClip,
    VideoFileClip,
    concatenate_videoclips,
)

VIDEO_EXTENSIONS = [".mp4", ".mov", ".mkv", ".webm"]

TARGET_WIDTH = 1080
TARGET_HEIGHT = 1920

RANKING_LABELS = [
    "Stare",
    "CRONCH",
    "Glasses",
    "Cute",
    "bread cat",
]

RANK_COLORS = [
    (239, 68, 68, 255),     # Red
    (251, 146, 60, 255),    # Orange
    (250, 204, 21, 255),    # Yellow
    (203, 213, 225, 255),   # Light gray
    (255, 255, 255, 255),   # White
]


def load_font(font_size: int):
    font_paths = [
        Path(r"C:\Windows\Fonts\arialbd.ttf"),
        Path(r"C:\Windows\Fonts\impact.ttf"),
    ]

    for font_path in font_paths:
        if font_path.exists():
            return ImageFont.truetype(str(font_path), font_size)

    raise FileNotFoundError(
        "Could not find a bold Windows font. "
        "Check C:\\Windows\\Fonts for a usable .ttf font."
    )


def format_vertical(
    clip,
    target_width=TARGET_WIDTH,
    target_height=TARGET_HEIGHT,
):
    target_ratio = target_width / target_height
    clip_ratio = clip.w / clip.h

    if clip_ratio > target_ratio:
        clip = clip.resized(height=target_height)
    else:
        clip = clip.resized(width=target_width)

    return clip.cropped(
        x_center=clip.w / 2,
        y_center=clip.h / 2,
        width=target_width,
        height=target_height,
    )


def text_width(draw, text, font, stroke_width: int) -> int:
    left, _, right, _ = draw.textbbox(
        (0, 0),
        text,
        font=font,
        stroke_width=stroke_width,
    )

    return right - left


def draw_outlined_text(
    draw,
    x: int,
    y: int,
    text: str,
    font,
    fill,
    stroke_width: int,
):
    shadow_offset = max(3, stroke_width)

    draw.text(
        (x + shadow_offset, y + shadow_offset),
        text,
        font=font,
        fill=(0, 0, 0, 220),
        stroke_width=stroke_width,
        stroke_fill=(0, 0, 0, 255),
    )

    draw.text(
        (x, y),
        text,
        font=font,
        fill=fill,
        stroke_width=stroke_width,
        stroke_fill=(0, 0, 0, 255),
    )


def draw_centered_segments(
    draw,
    image_width: int,
    y: int,
    segments,
    font,
    stroke_width: int,
):
    total_width = sum(
        text_width(draw, text, font, stroke_width)
        for text, _ in segments
    )

    current_x = (image_width - total_width) // 2

    for text, color in segments:
        draw_outlined_text(
            draw=draw,
            x=current_x,
            y=y,
            text=text,
            font=font,
            fill=color,
            stroke_width=stroke_width,
        )

        current_x += text_width(
            draw,
            text,
            font,
            stroke_width,
        )


def create_ranking_overlay(width: int, height: int) -> np.ndarray:
    overlay = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    title_font = load_font(int(width * 0.068))
    rank_number_font = load_font(int(width * 0.13))
    rank_label_font = load_font(int(width * 0.055))

    title_stroke = max(2, width // 360)
    rank_stroke = max(3, width // 300)

    # Dark readable area behind the title.
    draw.rectangle(
        (0, 0, width, int(height * 0.16)),
        fill=(0, 0, 0, 180),
    )

    draw_centered_segments(
        draw=draw,
        image_width=width,
        y=int(height * 0.02),
        segments=[
            ("Ranking ", (255, 255, 255, 255)),
            ("Funniest", (250, 204, 21, 255)),
        ],
        font=title_font,
        stroke_width=title_stroke,
    )

    draw_centered_segments(
        draw=draw,
        image_width=width,
        y=int(height * 0.075),
        segments=[
            ("Cat ", (239, 68, 68, 255)),
            ("Moments", (255, 255, 255, 255)),
        ],
        font=title_font,
        stroke_width=title_stroke,
    )

    rank_number_x = int(width * 0.05)
    rank_label_x = int(width * 0.22)

    starting_y = int(height * 0.20)
    row_spacing = int(height * 0.105)

    for index, label in enumerate(RANKING_LABELS):
        row_y = starting_y + index * row_spacing

        draw_outlined_text(
            draw=draw,
            x=rank_number_x,
            y=row_y,
            text=f"{index + 1}.",
            font=rank_number_font,
            fill=RANK_COLORS[index],
            stroke_width=rank_stroke,
        )

        draw_outlined_text(
            draw=draw,
            x=rank_label_x,
            y=row_y + int(height * 0.025),
            text=label,
            font=rank_label_font,
            fill=(255, 255, 255, 255),
            stroke_width=rank_stroke,
        )

    return np.array(overlay)


def add_ranking_overlay(clip):
    overlay_image = create_ranking_overlay(
        width=int(clip.w),
        height=int(clip.h),
    )

    overlay_clip = ImageClip(
        overlay_image,
        transparent=True,
    ).with_duration(clip.duration)

    return CompositeVideoClip(
        [clip, overlay_clip],
        size=(int(clip.w), int(clip.h)),
    ).with_duration(clip.duration)


def compile_videos(input_dir: str, output_dir: str) -> None:
    input_path = Path(input_dir)
    output_path = Path(output_dir)

    output_path.mkdir(parents=True, exist_ok=True)

    video_files = sorted(
        file
        for file in input_path.iterdir()
        if file.suffix.lower() in VIDEO_EXTENSIONS
    )

    if not video_files:
        raise FileNotFoundError("No videos found in input folder.")

    source_clips = []
    decorated_clips = []
    final_video = None

    try:
        for video_file in video_files:
            print(f"Processing: {video_file.name}")

            source_clip = VideoFileClip(str(video_file))
            source_clips.append(source_clip)

            short_clip = source_clip.subclipped(
                0,
                min(8, source_clip.duration),
            )

            vertical_clip = format_vertical(short_clip)

            # Adds the ranking title/list to this individual clip.
            decorated_clip = add_ranking_overlay(vertical_clip)

            decorated_clips.append(decorated_clip)

        final_video = concatenate_videoclips(
            decorated_clips,
            method="compose",
        )

        final_output = output_path / "compiled_video.mp4"

        final_video.write_videofile(
            str(final_output),
            fps=30,
            codec="libx264",
            audio_codec="aac",
        )

        print(f"Done. Final video saved to: {final_output}")

    finally:
        if final_video is not None:
            final_video.close()

        for clip in decorated_clips:
            clip.close()

        for clip in source_clips:
            clip.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()

    parser.add_argument("--input", required=True)
    parser.add_argument("--output", required=True)

    args = parser.parse_args()

    compile_videos(args.input, args.output)