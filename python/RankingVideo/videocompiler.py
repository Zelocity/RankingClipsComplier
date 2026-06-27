from pathlib import Path
import argparse
import json

import numpy as np
from PIL import Image, ImageDraw, ImageFont
from moviepy import (
    CompositeVideoClip,
    ImageClip,
    VideoFileClip,
    concatenate_videoclips,
)

VIDEO_EXTENSIONS = [".mp4", ".mov", ".mkv", ".webm"]

TARGET_WIDTH = 540
TARGET_HEIGHT = 960

RANK_COLORS = [
    (239, 68, 68, 255),     # Red
    (251, 146, 60, 255),    # Orange
    (250, 204, 21, 255),    # Yellow
    (203, 213, 225, 255),   # Light gray
    (255, 255, 255, 255),   # White
]

DEFAULT_TITLE_DOCUMENT = {
    "type": "doc",
    "content": [
        {
            "type": "paragraph",
            "attrs": {
                "textAlign": "center",
            },
            "content": [
                {
                    "type": "text",
                    "text": "RANKING ",
                    "marks": [
                        {
                            "type": "textStyle",
                            "attrs": {
                                "color": "#a78bfa",
                            },
                        },
                    ],
                },
                {
                    "type": "text",
                    "text": "THE BEST MOMENTS",
                    "marks": [
                        {
                            "type": "textStyle",
                            "attrs": {
                                "color": "#ffffff",
                            },
                        },
                    ],
                },
            ],
        },
    ],
}


def load_font(font_size: int):
    font_paths = [
        Path(r"C:\Windows\Fonts\arialbd.ttf"),
        Path(r"C:\Windows\Fonts\segoeuib.ttf"),
        Path(r"C:\Windows\Fonts\impact.ttf"),
    ]

    for font_path in font_paths:
        if font_path.exists():
            return ImageFont.truetype(
                str(font_path),
                font_size,
            )

    raise FileNotFoundError(
        "Could not find a bold Windows font. "
        "Check C:\\Windows\\Fonts for a usable .ttf font."
    )


def hex_to_rgba(value: str):
    clean_value = value.strip().lstrip("#")

    if len(clean_value) != 6:
        return (255, 255, 255, 255)

    try:
        red = int(clean_value[0:2], 16)
        green = int(clean_value[2:4], 16)
        blue = int(clean_value[4:6], 16)

        return (red, green, blue, 255)
    except ValueError:
        return (255, 255, 255, 255)


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


def text_width(draw, text: str, font, stroke_width: int) -> int:
    left, _, right, _ = draw.textbbox(
        (0, 0),
        text,
        font=font,
        stroke_width=stroke_width,
    )

    return right - left


def text_height(draw, text: str, font, stroke_width: int) -> int:
    _, top, _, bottom = draw.textbbox(
        (0, 0),
        text,
        font=font,
        stroke_width=stroke_width,
    )

    return bottom - top


def draw_outlined_text(
    draw,
    x: int,
    y: int,
    text: str,
    font,
    fill,
    stroke_width: int,
):
    if not text:
        return

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


def truncate_text(
    draw,
    text: str,
    font,
    stroke_width: int,
    max_width: int,
) -> str:
    if text_width(draw, text, font, stroke_width) <= max_width:
        return text

    suffix = "..."
    shortened = text

    while shortened:
        candidate = f"{shortened}{suffix}"

        if text_width(draw, candidate, font, stroke_width) <= max_width:
            return candidate

        shortened = shortened[:-1]

    return suffix


def get_node_color(node):
    marks = node.get("marks", [])

    if not isinstance(marks, list):
        return (255, 255, 255, 255)

    for mark in marks:
        if not isinstance(mark, dict):
            continue

        if mark.get("type") != "textStyle":
            continue

        attrs = mark.get("attrs", {})

        if not isinstance(attrs, dict):
            continue

        color = attrs.get("color")

        if isinstance(color, str):
            return hex_to_rgba(color)

    return (255, 255, 255, 255)


def get_title_paragraphs(title_document):
    if not isinstance(title_document, dict):
        title_document = DEFAULT_TITLE_DOCUMENT

    raw_content = title_document.get("content", [])

    if not isinstance(raw_content, list):
        raw_content = []

    paragraphs = []

    for block in raw_content:
        if not isinstance(block, dict):
            continue

        if block.get("type") != "paragraph":
            continue

        attrs = block.get("attrs", {})

        if not isinstance(attrs, dict):
            attrs = {}

        alignment = attrs.get("textAlign", "center")

        if alignment not in ["left", "center", "right"]:
            alignment = "center"

        raw_parts = block.get("content", [])

        if not isinstance(raw_parts, list):
            raw_parts = []

        segments = []

        for node in raw_parts:
            if not isinstance(node, dict):
                continue

            if node.get("type") != "text":
                continue

            raw_text = node.get("text", "")

            if not isinstance(raw_text, str):
                continue

            segments.append(
                (
                    raw_text.upper(),
                    get_node_color(node),
                )
            )

        paragraphs.append(
            {
                "alignment": alignment,
                "segments": segments,
            }
        )

    if paragraphs:
        return paragraphs

    return [
        {
            "alignment": "center",
            "segments": [
                ("RANKING ", (167, 139, 250, 255)),
                ("THE BEST MOMENTS", (255, 255, 255, 255)),
            ],
        },
    ]


def create_overlay_layout(
    draw,
    width: int,
    height: int,
    title_document,
    rank_count: int,
):
    title_font = load_font(max(18, int(width * 0.068)))
    title_stroke = max(2, width // 360)
    rank_stroke = max(2, width // 300)

    title_paragraphs = get_title_paragraphs(title_document)

    title_line_height = text_height(
        draw,
        "Ag",
        title_font,
        title_stroke,
    ) + int(width * 0.012)

    title_area_height = (
        int(height * 0.03)
        + title_line_height * len(title_paragraphs)
        + int(height * 0.035)
    )

    title_area_height = min(
        title_area_height,
        int(height * 0.34),
    )

    list_top = title_area_height + int(height * 0.02)
    list_bottom = int(height * 0.83)

    available_height = max(1, list_bottom - list_top)
    row_height = max(28, available_height // max(1, rank_count))

    rank_number_font = load_font(
        max(
            16,
            min(
                int(width * 0.13),
                int(row_height * 0.88),
            ),
        )
    )

    rank_label_font = load_font(
        max(
            12,
            min(
                int(width * 0.055),
                int(row_height * 0.52),
            ),
        )
    )

    return {
        "title_font": title_font,
        "title_stroke": title_stroke,
        "title_paragraphs": title_paragraphs,
        "title_line_height": title_line_height,
        "title_area_height": title_area_height,
        "rank_stroke": rank_stroke,
        "rank_number_font": rank_number_font,
        "rank_label_font": rank_label_font,
        "rank_number_x": int(width * 0.05),
        "rank_label_x": int(width * 0.22),
        "list_top": list_top,
        "row_height": row_height,
    }


def draw_title_document(
    draw,
    image_width: int,
    y: int,
    title_document,
    font,
    stroke_width: int,
):
    paragraphs = get_title_paragraphs(title_document)

    horizontal_padding = int(image_width * 0.04)

    line_height = text_height(
        draw,
        "Ag",
        font,
        stroke_width,
    ) + int(image_width * 0.012)

    current_y = y

    for paragraph in paragraphs:
        segments = paragraph["segments"]

        total_width = sum(
            text_width(
                draw,
                text,
                font,
                stroke_width,
            )
            for text, _ in segments
        )

        alignment = paragraph["alignment"]

        if alignment == "left":
            current_x = horizontal_padding
        elif alignment == "right":
            current_x = image_width - horizontal_padding - total_width
        else:
            current_x = (image_width - total_width) // 2

        for text, color in segments:
            draw_outlined_text(
                draw=draw,
                x=current_x,
                y=current_y,
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

        current_y += line_height


def rank_color(index: int):
    if index < len(RANK_COLORS):
        return RANK_COLORS[index]

    return (255, 255, 255, 255)


def create_ranking_overlay(
    width: int,
    height: int,
    title_document,
    ranked_clips,
    revealed_clip_ids: set[str],
    active_clip_id: str,
) -> np.ndarray:
    overlay = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    layout = create_overlay_layout(
        draw=draw,
        width=width,
        height=height,
        title_document=title_document,
        rank_count=len(ranked_clips),
    )

    # This is the only black background panel.
    # It stays behind the overall title at the top.
    draw.rectangle(
        (
            0,
            0,
            width,
            layout["title_area_height"],
        ),
        fill=(0, 0, 0, 180),
    )

    draw_title_document(
        draw=draw,
        image_width=width,
        y=int(height * 0.02),
        title_document=title_document,
        font=layout["title_font"],
        stroke_width=layout["title_stroke"],
    )

    max_label_width = int(width * 0.72)

    for index, clip_info in enumerate(ranked_clips):
        row_y = layout["list_top"] + index * layout["row_height"]
        clip_id = clip_info["id"]

        draw_outlined_text(
            draw=draw,
            x=layout["rank_number_x"],
            y=row_y,
            text=f"{index + 1}.",
            font=layout["rank_number_font"],
            fill=rank_color(index),
            stroke_width=layout["rank_stroke"],
        )

        # Future titles are blank.
        if clip_id not in revealed_clip_ids:
            continue

        # Current title is drawn separately as an animated layer.
        if clip_id == active_clip_id:
            continue

        label = truncate_text(
            draw=draw,
            text=clip_info["title"].upper(),
            font=layout["rank_label_font"],
            stroke_width=layout["rank_stroke"],
            max_width=max_label_width,
        )

        draw_outlined_text(
            draw=draw,
            x=layout["rank_label_x"],
            y=row_y + int(layout["row_height"] * 0.18),
            text=label,
            font=layout["rank_label_font"],
            fill=(255, 255, 255, 255),
            stroke_width=layout["rank_stroke"],
        )

    active_rank_index = next(
        (
            index
            for index, clip_info in enumerate(ranked_clips)
            if clip_info["id"] == active_clip_id
        ),
        0,
    )

    draw_outlined_text(
        draw=draw,
        x=int(width * 0.04),
        y=int(height * 0.86),
        text=f"#{active_rank_index + 1}",
        font=load_font(max(28, int(width * 0.16))),
        fill=(255, 255, 255, 255),
        stroke_width=max(3, width // 260),
    )

    return np.array(overlay)


def ease_out_cubic(progress: float) -> float:
    progress = max(0.0, min(progress, 1.0))

    return 1 - (1 - progress) ** 3


def create_sliding_active_title_clip(
    width: int,
    height: int,
    title_document,
    ranked_clips,
    active_clip_id: str,
    duration: float,
):
    active_rank_index = next(
        (
            index
            for index, clip_info in enumerate(ranked_clips)
            if clip_info["id"] == active_clip_id
        ),
        None,
    )

    if active_rank_index is None:
        return None

    measure_image = Image.new(
        "RGBA",
        (width, height),
        (0, 0, 0, 0),
    )
    measure_draw = ImageDraw.Draw(measure_image)

    layout = create_overlay_layout(
        draw=measure_draw,
        width=width,
        height=height,
        title_document=title_document,
        rank_count=len(ranked_clips),
    )

    active_clip = ranked_clips[active_rank_index]

    label = truncate_text(
        draw=measure_draw,
        text=active_clip["title"].upper(),
        font=layout["rank_label_font"],
        stroke_width=layout["rank_stroke"],
        max_width=int(width * 0.72),
    )

    label_width = text_width(
        measure_draw,
        label,
        layout["rank_label_font"],
        layout["rank_stroke"],
    )

    label_height = text_height(
        measure_draw,
        label,
        layout["rank_label_font"],
        layout["rank_stroke"],
    )

    padding = layout["rank_stroke"] + 8

    # Transparent image: no black box behind the clip title.
    title_image = Image.new(
        "RGBA",
        (
            label_width + padding * 2,
            label_height + padding * 2,
        ),
        (0, 0, 0, 0),
    )

    title_draw = ImageDraw.Draw(title_image)

    draw_outlined_text(
        draw=title_draw,
        x=padding,
        y=padding,
        text=label,
        font=layout["rank_label_font"],
        fill=(255, 255, 255, 255),
        stroke_width=layout["rank_stroke"],
    )

    row_y = (
        layout["list_top"]
        + active_rank_index * layout["row_height"]
    )

    final_x = layout["rank_label_x"] - padding
    final_y = (
        row_y
        + int(layout["row_height"] * 0.18)
        - padding
    )

    # Start at the left edge instead of fully off-screen.
    # This avoids MoviePy's negative-position broadcast error.
    start_x = 0

    slide_duration = min(0.42, max(0.01, duration))

    def get_position(time: float):
        progress = ease_out_cubic(time / slide_duration)

        current_x = start_x + (
            final_x - start_x
        ) * progress

        return (int(current_x), final_y)

    return (
        ImageClip(
            np.array(title_image),
            transparent=True,
        )
        .with_duration(duration)
        .with_position(get_position)
    )


def add_ranking_overlay(
    clip,
    title_document,
    ranked_clips,
    revealed_clip_ids: set[str],
    active_clip_id: str,
):
    overlay_image = create_ranking_overlay(
        width=int(clip.w),
        height=int(clip.h),
        title_document=title_document,
        ranked_clips=ranked_clips,
        revealed_clip_ids=revealed_clip_ids,
        active_clip_id=active_clip_id,
    )

    static_overlay_clip = ImageClip(
        overlay_image,
        transparent=True,
    ).with_duration(clip.duration)

    sliding_title_clip = create_sliding_active_title_clip(
        width=int(clip.w),
        height=int(clip.h),
        title_document=title_document,
        ranked_clips=ranked_clips,
        active_clip_id=active_clip_id,
        duration=clip.duration,
    )

    layers = [
        clip,
        static_overlay_clip,
    ]

    if sliding_title_clip is not None:
        layers.append(sliding_title_clip)

    return CompositeVideoClip(
        layers,
        size=(int(clip.w), int(clip.h)),
    ).with_duration(clip.duration)


def read_render_config(config_path: str | None):
    if not config_path:
        return {}

    path = Path(config_path)

    if not path.exists():
        raise FileNotFoundError(
            f"Render config was not found: {path}"
        )

    with path.open("r", encoding="utf-8") as config_file:
        loaded_config = json.load(config_file)

    if not isinstance(loaded_config, dict):
        raise ValueError("Render config must be a JSON object.")

    return loaded_config


def create_fallback_clips(input_path: Path):
    return [
        {
            "id": file.name,
            "fileName": file.name,
            "title": file.stem,
        }
        for file in sorted(input_path.iterdir())
        if file.is_file()
        and file.suffix.lower() in VIDEO_EXTENSIONS
    ]


def get_config_clips(config, input_path: Path):
    raw_clips = config.get("clips", [])

    if not isinstance(raw_clips, list):
        return create_fallback_clips(input_path)

    clips = []

    for raw_clip in raw_clips:
        if not isinstance(raw_clip, dict):
            continue

        clip_id = raw_clip.get("id")
        file_name = raw_clip.get("fileName")
        title = raw_clip.get("title")

        if not isinstance(clip_id, str):
            continue

        if not isinstance(file_name, str):
            continue

        safe_file_name = Path(file_name).name

        if not safe_file_name:
            continue

        if Path(safe_file_name).suffix.lower() not in VIDEO_EXTENSIONS:
            continue

        if not (input_path / safe_file_name).exists():
            continue

        clips.append(
            {
                "id": clip_id,
                "fileName": safe_file_name,
                "title": (
                    title
                    if isinstance(title, str) and title.strip()
                    else Path(safe_file_name).stem
                ),
            }
        )

    return clips or create_fallback_clips(input_path)


def resolve_clip_order(
    requested_ids,
    clip_by_id,
    fallback_clips,
):
    ordered_clips = []
    included_ids = set()

    if isinstance(requested_ids, list):
        for clip_id in requested_ids:
            if (
                isinstance(clip_id, str)
                and clip_id in clip_by_id
                and clip_id not in included_ids
            ):
                ordered_clips.append(clip_by_id[clip_id])
                included_ids.add(clip_id)

    for clip in fallback_clips:
        if clip["id"] not in included_ids:
            ordered_clips.append(clip)
            included_ids.add(clip["id"])

    return ordered_clips


def compile_videos(
    input_dir: str,
    output_dir: str,
    config_path: str | None = None,
) -> None:
    input_path = Path(input_dir)
    output_path = Path(output_dir)

    output_path.mkdir(parents=True, exist_ok=True)

    render_config = read_render_config(config_path)

    saved_clips = get_config_clips(
        render_config,
        input_path,
    )

    if not saved_clips:
        raise FileNotFoundError("No videos found in input folder.")

    clip_by_id = {
        clip["id"]: clip
        for clip in saved_clips
    }

    ranked_clips = resolve_clip_order(
        render_config.get("rankedClipIds"),
        clip_by_id,
        saved_clips,
    )

    playback_clips = resolve_clip_order(
        render_config.get("playOrder"),
        clip_by_id,
        ranked_clips,
    )

    title_document = render_config.get(
        "titleDocument",
        DEFAULT_TITLE_DOCUMENT,
    )

    source_clips = []
    decorated_clips = []
    final_video = None

    try:
        for play_index, clip_info in enumerate(playback_clips):
            video_file = input_path / clip_info["fileName"]

            print(
                f"Processing {play_index + 1}/"
                f"{len(playback_clips)}: "
                f"{video_file.name}"
            )

            source_clip = VideoFileClip(str(video_file))
            source_clips.append(source_clip)

            short_clip = source_clip.subclipped(
                0,
                min(8, source_clip.duration),
            )

            vertical_clip = format_vertical(short_clip)

            revealed_clip_ids = {
                played_clip["id"]
                for played_clip in playback_clips[: play_index + 1]
            }

            decorated_clip = add_ranking_overlay(
                clip=vertical_clip,
                title_document=title_document,
                ranked_clips=ranked_clips,
                revealed_clip_ids=revealed_clip_ids,
                active_clip_id=clip_info["id"],
            )

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
    parser.add_argument("--config")

    args = parser.parse_args()

    compile_videos(
        input_dir=args.input,
        output_dir=args.output,
        config_path=args.config,
    )