from pathlib import Path
import argparse
import json
import re
import unicodedata
from functools import lru_cache

import numpy as np
from PIL import Image, ImageDraw, ImageFont
from moviepy import (
    CompositeVideoClip,
    ImageClip,
    VideoClip,
    VideoFileClip,
    concatenate_videoclips,
)

VIDEO_EXTENSIONS = [".mp4", ".mov", ".mkv", ".webm"]

TARGET_WIDTH = 540
TARGET_HEIGHT = 960
EXPORT_SCALE = TARGET_WIDTH / 360

# Matches the Tailwind sizes used by LivePreview.tsx.
# Tuned against the 360px-wide React preview.
# Pillow glyphs render slightly smaller/narrower than the browser font.
TITLE_FONT_SIZE = 33
RANK_FONT_SIZE = 52
LABEL_FONT_SIZE = round(14 * EXPORT_SCALE)  # text-sm
TITLE_TEXT_MAX_WIDTH = 450
OUTLINE_WIDTH = round(2 * EXPORT_SCALE)     # preview-outline
SLIDE_DURATION = 0.42
ANIMATION_FPS = 30

# Segoe UI Emoji renders visually smaller than the bold text font.
EMOJI_SCALE = 1.28

# Noto Color Emoji uses fixed bitmap strikes in Pillow. Render it at its
# supported 109px strike, then resize the resulting transparent image.
NOTO_EMOJI_PATH = (
    Path(__file__).resolve().parent
    / "assets"
    / "fonts"
    / "NotoColorEmoji.ttf"
)
NOTO_EMOJI_NATIVE_SIZE = 109

RANK_COLORS = [
    (239, 68, 68, 255),     # Tailwind red-500
    (251, 146, 60, 255),    # Tailwind orange-400
    (253, 224, 71, 255),    # Tailwind yellow-300
    (226, 232, 240, 255),   # Tailwind slate-200
    (255, 255, 255, 255),
]

DEFAULT_TITLE_DOCUMENT = {
    "type": "doc",
    "content": [
        {
            "type": "paragraph",
            "attrs": {"textAlign": "center"},
            "content": [
                {
                    "type": "text",
                    "text": "RANKING ",
                    "marks": [
                        {
                            "type": "textStyle",
                            "attrs": {"color": "#a78bfa"},
                        },
                    ],
                },
                {
                    "type": "text",
                    "text": "THE BEST MOMENTS",
                    "marks": [
                        {
                            "type": "textStyle",
                            "attrs": {"color": "#ffffff"},
                        },
                    ],
                },
            ],
        },
    ],
}


@lru_cache(maxsize=32)
def load_font(font_size: int, italic: bool = False):
    if italic:
        font_paths = [
            Path(r"C:\Windows\Fonts\arialbi.ttf"),
            Path(r"C:\Windows\Fonts\segoeuiz.ttf"),
            Path(r"C:\Windows\Fonts\arialbd.ttf"),
            Path(r"C:\Windows\Fonts\segoeuib.ttf"),
        ]
    else:
        font_paths = [
            Path(r"C:\Windows\Fonts\seguibl.ttf"),
            Path(r"C:\Windows\Fonts\segoeuib.ttf"),
            Path(r"C:\Windows\Fonts\ariblk.ttf"),
            Path(r"C:\Windows\Fonts\arialbd.ttf"),
            Path(r"C:\Windows\Fonts\impact.ttf"),
        ]

    for font_path in font_paths:
        if font_path.exists():
            return ImageFont.truetype(str(font_path), font_size)

    raise FileNotFoundError(
        "Could not find a usable bold Windows font in C:\\Windows\\Fonts."
    )


@lru_cache(maxsize=1)
def load_emoji_font():
    if not NOTO_EMOJI_PATH.exists():
        raise FileNotFoundError(
            "Noto Color Emoji was not found. Put NotoColorEmoji.ttf at: "
            f"{NOTO_EMOJI_PATH}"
        )

    return ImageFont.truetype(
        str(NOTO_EMOJI_PATH),
        NOTO_EMOJI_NATIVE_SIZE,
    )

def is_emoji_base(character: str) -> bool:
    codepoint = ord(character)

    return (
        0x1F000 <= codepoint <= 0x1FAFF
        or 0x2600 <= codepoint <= 0x27BF
        or codepoint in {
            0x00A9,  # ©
            0x00AE,  # ®
            0x203C,  # ‼
            0x2049,  # ⁉
            0x2122,  # ™
            0x2139,  # ℹ
            0x3030,  # 〰
            0x303D,  # 〽
            0x3297,  # ㊗
            0x3299,  # ㊙
        }
    )


def is_regional_indicator(character: str) -> bool:
    return 0x1F1E6 <= ord(character) <= 0x1F1FF


def is_emoji_modifier(character: str) -> bool:
    return 0x1F3FB <= ord(character) <= 0x1F3FF


def is_variation_selector(character: str) -> bool:
    return ord(character) in {0xFE0E, 0xFE0F}


def consume_emoji_suffix(text: str, index: int):
    parts = []

    while index < len(text):
        character = text[index]

        if (
            is_variation_selector(character)
            or is_emoji_modifier(character)
            or ord(character) == 0x20E3
        ):
            parts.append(character)
            index += 1
            continue

        if (
            ord(character) == 0x200D
            and index + 1 < len(text)
            and is_emoji_base(text[index + 1])
        ):
            parts.append(character)
            parts.append(text[index + 1])
            index += 2

            extra_parts, index = consume_emoji_suffix(text, index)
            parts.extend(extra_parts)
            continue

        break

    return parts, index


def split_display_units(text: str):
    units = []
    index = 0

    while index < len(text):
        character = text[index]

        # Keycap emoji such as 1️⃣ or #️⃣.
        if (
            character in "#*0123456789"
            and index + 1 < len(text)
            and (
                ord(text[index + 1]) == 0x20E3
                or (
                    is_variation_selector(text[index + 1])
                    and index + 2 < len(text)
                    and ord(text[index + 2]) == 0x20E3
                )
            )
        ):
            end = index + 2

            if (
                index + 1 < len(text)
                and is_variation_selector(text[index + 1])
            ):
                end = index + 3

            units.append((text[index:end], True))
            index = end
            continue

        if is_emoji_base(character):
            parts = [character]
            index += 1

            # Country flags are one visible emoji made from two regional
            # indicator characters.
            if (
                is_regional_indicator(character)
                and index < len(text)
                and is_regional_indicator(text[index])
            ):
                parts.append(text[index])
                index += 1

            extra_parts, index = consume_emoji_suffix(text, index)
            parts.extend(extra_parts)

            units.append(("".join(parts), True))
            continue

        units.append((character, False))
        index += 1

    return units


def split_emoji_runs(text: str):
    runs = []

    for unit, is_emoji in split_display_units(text):
        if runs and runs[-1][1] == is_emoji:
            runs[-1] = (runs[-1][0] + unit, is_emoji)
        else:
            runs.append((unit, is_emoji))

    return runs


def font_size_of(font) -> int:
    size = getattr(font, "size", None)

    if isinstance(size, int):
        return size

    return LABEL_FONT_SIZE


def emoji_target_height(font) -> int:
    return max(
        1,
        round(font_size_of(font) * EMOJI_SCALE),
    )


@lru_cache(maxsize=512)
def render_noto_emoji(emoji_text: str, target_height: int):
    emoji_font = load_emoji_font()

    # Draw at Noto's native strike first. This avoids the Pillow
    # "invalid pixel size" error from trying to load it at arbitrary sizes.
    margin = 16
    measure_image = Image.new(
        "RGBA",
        (
            NOTO_EMOJI_NATIVE_SIZE * 4,
            NOTO_EMOJI_NATIVE_SIZE + margin * 2,
        ),
        (0, 0, 0, 0),
    )
    measure_draw = ImageDraw.Draw(measure_image)

    bbox = measure_draw.textbbox(
        (margin, margin),
        emoji_text,
        font=emoji_font,
        embedded_color=True,
    )

    if bbox is None:
        return Image.new("RGBA", (1, 1), (0, 0, 0, 0))

    image_width = max(1, bbox[2] - bbox[0] + margin * 2)
    image_height = max(1, bbox[3] - bbox[1] + margin * 2)

    emoji_image = Image.new(
        "RGBA",
        (image_width, image_height),
        (0, 0, 0, 0),
    )
    emoji_draw = ImageDraw.Draw(emoji_image)

    emoji_draw.text(
        (margin - bbox[0], margin - bbox[1]),
        emoji_text,
        font=emoji_font,
        embedded_color=True,
    )

    alpha_bbox = emoji_image.getbbox()

    if alpha_bbox is not None:
        emoji_image = emoji_image.crop(alpha_bbox)

    if emoji_image.height <= 0:
        return Image.new("RGBA", (1, 1), (0, 0, 0, 0))

    scaled_width = max(
        1,
        round(
            emoji_image.width
            * target_height
            / emoji_image.height
        ),
    )

    return emoji_image.resize(
        (scaled_width, target_height),
        Image.Resampling.LANCZOS,
    )


def get_emoji_y(
    draw,
    text_y: int,
    text_font,
    emoji_height: int,
    stroke_width: int,
) -> int:
    # Center the resized Noto bitmap against the outlined text glyphs.
    _, text_top, _, text_bottom = draw.textbbox(
        (0, 0),
        "Ag",
        font=text_font,
        stroke_width=stroke_width,
    )

    text_center = (text_top + text_bottom) / 2

    return round(text_y + text_center - emoji_height / 2)

def hex_to_rgba(value: str):
    clean_value = value.strip().lstrip("#")

    if len(clean_value) != 6:
        return (255, 255, 255, 255)

    try:
        return (
            int(clean_value[0:2], 16),
            int(clean_value[2:4], 16),
            int(clean_value[4:6], 16),
            255,
        )
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


def text_width(draw, text: str, font) -> int:
    total_width = 0

    for run, is_emoji in split_emoji_runs(text):
        if is_emoji:
            emoji_image = render_noto_emoji(
                run,
                emoji_target_height(font),
            )
            total_width += emoji_image.width
        else:
            total_width += round(
                draw.textlength(
                    run,
                    font=font,
                )
            )

    return total_width


def text_height(draw, font) -> int:
    _, top, _, bottom = draw.textbbox(
        (0, 0),
        "Ag",
        font=font,
        stroke_width=OUTLINE_WIDTH,
    )

    return bottom - top


def draw_outlined_text(
    draw,
    x: int,
    y: int,
    text: str,
    font,
    fill,
    stroke_width: int = OUTLINE_WIDTH,
):
    if not text:
        return

    current_x = x

    for run, is_emoji in split_emoji_runs(text):
        if is_emoji:
            emoji_image = render_noto_emoji(
                run,
                emoji_target_height(font),
            )

            emoji_y = get_emoji_y(
                draw=draw,
                text_y=y,
                text_font=font,
                emoji_height=emoji_image.height,
                stroke_width=stroke_width,
            )

            # The overlay canvas is RGBA. Alpha-compositing preserves Noto's
            # built-in color bitmap while keeping its background transparent.
            draw._image.alpha_composite(
                emoji_image,
                (round(current_x), emoji_y),
            )

            current_x += emoji_image.width
            continue

        # Closely matches .preview-outline:
        # four-way outline plus a dark downwards shadow.
        draw.text(
            (current_x, y + round(4 * EXPORT_SCALE)),
            run,
            font=font,
            fill=(0, 0, 0, 190),
            stroke_width=stroke_width,
            stroke_fill=(0, 0, 0, 190),
        )

        draw.text(
            (current_x, y),
            run,
            font=font,
            fill=fill,
            stroke_width=stroke_width,
            stroke_fill=(0, 0, 0, 255),
        )

        current_x += round(
            draw.textlength(
                run,
                font=font,
            )
        )

def get_node_color(node):
    marks = node.get("marks", [])

    if not isinstance(marks, list):
        return (255, 255, 255, 255)

    for mark in marks:
        if not isinstance(mark, dict) or mark.get("type") != "textStyle":
            continue

        attrs = mark.get("attrs", {})
        color = attrs.get("color") if isinstance(attrs, dict) else None

        if isinstance(color, str):
            return hex_to_rgba(color)

    return (255, 255, 255, 255)


def get_text_style(node):
    marks = node.get("marks", [])

    if not isinstance(marks, list):
        return False, False

    is_bold = any(
        isinstance(mark, dict) and mark.get("type") == "bold"
        for mark in marks
    )
    is_italic = any(
        isinstance(mark, dict) and mark.get("type") == "italic"
        for mark in marks
    )

    return is_bold, is_italic


def get_title_paragraphs(title_document):
    if not isinstance(title_document, dict):
        title_document = DEFAULT_TITLE_DOCUMENT

    raw_content = title_document.get("content", [])

    if not isinstance(raw_content, list):
        raw_content = []

    paragraphs = []

    for block in raw_content:
        if not isinstance(block, dict) or block.get("type") != "paragraph":
            continue

        attrs = block.get("attrs", {})
        alignment = attrs.get("textAlign") if isinstance(attrs, dict) else "center"

        if alignment not in {"left", "center", "right"}:
            alignment = "center"

        parts = []

        for node in block.get("content", []):
            if not isinstance(node, dict):
                continue

            if node.get("type") == "hardBreak":
                parts.append(("break", "", (255, 255, 255, 255), False, False))
                continue

            if node.get("type") != "text":
                continue

            text = node.get("text", "")

            if not isinstance(text, str):
                continue

            bold, italic = get_text_style(node)

            parts.append(
                (
                    "text",
                    text.upper(),
                    get_node_color(node),
                    bold,
                    italic,
                )
            )

        paragraphs.append({"alignment": alignment, "parts": parts})

    if paragraphs:
        return paragraphs

    return get_title_paragraphs(DEFAULT_TITLE_DOCUMENT)


def font_for_title(is_italic: bool):
    return load_font(TITLE_FONT_SIZE, italic=is_italic)


def make_title_lines(draw, title_document, max_width: int):
    visual_lines = []

    for paragraph in get_title_paragraphs(title_document):
        alignment = paragraph["alignment"]
        current_line = []
        pending_space = False

        def line_width(segments):
            width = sum(
                text_width(draw, text, font_for_title(italic))
                for text, _, _, italic in segments
            )

            return width + OUTLINE_WIDTH * 2

        def push_line():
            nonlocal current_line, pending_space

            visual_lines.append(
                {
                    "alignment": alignment,
                    "segments": current_line,
                }
            )

            current_line = []
            pending_space = False

        for kind, value, color, bold, italic in paragraph["parts"]:
            if kind == "break":
                push_line()
                continue

            tokens = re.findall(r"\S+|\s+", value)

            for token in tokens:
                if token.isspace():
                    if current_line:
                        pending_space = True
                    continue

                prefix = " " if pending_space and current_line else ""
                candidate = current_line + [(prefix + token, color, bold, italic)]

                if current_line and line_width(candidate) > max_width:
                    push_line()
                    current_line = [(token, color, bold, italic)]
                else:
                    current_line = candidate

                pending_space = False

        push_line()

    if visual_lines:
        return visual_lines

    return [{"alignment": "center", "segments": []}]


def create_title_layout(draw, width: int, title_document):
    horizontal_padding = round(16 * EXPORT_SCALE)  # px-4
    top_padding = round(16 * EXPORT_SCALE)         # pt-4
    bottom_padding = round(56 * EXPORT_SCALE)      # pb-14

    # React wraps this heading after "THE BEST" at the 360px preview width.
    # Pillow's font metrics are narrower, so cap the usable line width to
    # preserve the same visual wrap in the exported 540px video.
    lines = make_title_lines(
        draw,
        title_document,
        min(
            width - horizontal_padding * 2,
            TITLE_TEXT_MAX_WIDTH,
        ),
    )

    line_height = round(TITLE_FONT_SIZE * 1.25)  # leading-tight

    return {
        "lines": lines,
        "horizontal_padding": horizontal_padding,
        "top_padding": top_padding,
        "line_height": line_height,
        "gradient_height": (
            top_padding
            + len(lines) * line_height
            + bottom_padding
        ),
    }


def draw_top_gradient(image: Image.Image, gradient_height: int):
    width, _ = image.size
    gradient_height = max(1, gradient_height)

    alpha = np.zeros((gradient_height, width), dtype=np.uint8)

    for y in range(gradient_height):
        progress = y / max(gradient_height - 1, 1)

        if progress <= 0.5:
            local_progress = progress / 0.5
            opacity = round(230 + (140 - 230) * local_progress)
        else:
            local_progress = (progress - 0.5) / 0.5
            opacity = round(140 * (1 - local_progress))

        alpha[y, :] = opacity

    gradient = np.zeros((gradient_height, width, 4), dtype=np.uint8)
    gradient[:, :, 3] = alpha

    image.alpha_composite(Image.fromarray(gradient, "RGBA"), (0, 0))


def draw_title_document(draw, width: int, title_document):
    layout = create_title_layout(draw, width, title_document)
    current_y = layout["top_padding"]

    for line in layout["lines"]:
        segments = line["segments"]

        total_width = sum(
            text_width(draw, text, font_for_title(italic))
            for text, _, _, italic in segments
        )

        alignment = line["alignment"]

        if alignment == "left":
            current_x = layout["horizontal_padding"]
        elif alignment == "right":
            current_x = width - layout["horizontal_padding"] - total_width
        else:
            current_x = (width - total_width) // 2

        for text, color, _, italic in segments:
            font = font_for_title(italic)

            draw_outlined_text(
                draw=draw,
                x=current_x,
                y=current_y,
                text=text,
                font=font,
                fill=color,
            )

            current_x += text_width(draw, text, font)

        current_y += layout["line_height"]


def rank_color(index: int):
    if index < len(RANK_COLORS):
        return RANK_COLORS[index]

    return (255, 255, 255, 255)


def create_rank_layout():
    # Scaled from:
    # left-3 top-16 w-[88%] px-1 py-0.5 gap-2 gap-1 min-w-8
    list_left = round(12 * EXPORT_SCALE)
    list_top = round(64 * EXPORT_SCALE)
    list_width = round(360 * 0.88 * EXPORT_SCALE)

    row_horizontal_padding = round(4 * EXPORT_SCALE)
    row_vertical_padding = round(2 * EXPORT_SCALE)
    item_gap = round(8 * EXPORT_SCALE)
    row_gap = round(4 * EXPORT_SCALE)
    number_min_width = round(32 * EXPORT_SCALE)

    number_line_height = RANK_FONT_SIZE  # leading-none
    row_height = number_line_height + row_vertical_padding * 2

    return {
        "list_top": list_top,
        "row_horizontal_padding": row_horizontal_padding,
        "row_vertical_padding": row_vertical_padding,
        "item_gap": item_gap,
        "row_gap": row_gap,
        "number_min_width": number_min_width,
        "row_height": row_height,
        "row_step": row_height + row_gap,
        "number_x": list_left + row_horizontal_padding,
        "label_x": (
            list_left
            + row_horizontal_padding
            + number_min_width
            + item_gap
        ),
        "label_max_width": (
            list_width
            - row_horizontal_padding * 2
            - number_min_width
            - item_gap
        ),
    }


def truncate_text(draw, text: str, font, max_width: int) -> str:
    if text_width(draw, text, font) <= max_width:
        return text

    suffix = "..."
    units = split_display_units(text)

    while units:
        candidate = f"{''.join(unit for unit, _ in units)}{suffix}"

        if text_width(draw, candidate, font) <= max_width:
            return candidate

        units.pop()

    return suffix


def draw_rank_number(draw, layout, index: int, row_y: int):
    draw_outlined_text(
        draw=draw,
        x=layout["number_x"],
        y=row_y + layout["row_vertical_padding"],
        text=f"{index + 1}.",
        font=load_font(RANK_FONT_SIZE, italic=True),
        fill=rank_color(index),
    )


def draw_rank_label(
    draw,
    layout,
    row_y: int,
    text: str,
    is_active: bool,
):
    font = load_font(LABEL_FONT_SIZE)

    label = truncate_text(
        draw=draw,
        text=text.upper(),
        font=font,
        max_width=layout["label_max_width"],
    )

    label_height = text_height(draw, font)

    label_y = row_y + (
        layout["row_height"] - label_height
    ) // 2

    draw_outlined_text(
        draw=draw,
        x=layout["label_x"],
        y=label_y,
        text=label,
        font=font,
        fill=(255, 255, 255, 255)
        if is_active
        else (226, 232, 240, 255),
    )


def create_static_overlay(
    width: int,
    height: int,
    title_document,
    ranked_clips,
    visible_past_ids: set[str],
):
    overlay = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    title_layout = create_title_layout(draw, width, title_document)

    # Keeps the top title gradient from React. There are no per-rank boxes.
    draw_top_gradient(overlay, title_layout["gradient_height"])

    draw = ImageDraw.Draw(overlay)
    draw_title_document(draw, width, title_document)

    rank_layout = create_rank_layout()

    for index, clip_info in enumerate(ranked_clips):
        row_y = rank_layout["list_top"] + index * rank_layout["row_step"]

        draw_rank_number(draw, rank_layout, index, row_y)

        if clip_info["id"] in visible_past_ids:
            draw_rank_label(
                draw=draw,
                layout=rank_layout,
                row_y=row_y,
                text=clip_info["title"],
                is_active=False,
            )

    return np.array(overlay)


def cubic_bezier_ease(progress: float) -> float:
    # React animation:
    # cubic-bezier(0.18, 0.9, 0.25, 1)
    progress = max(0.0, min(progress, 1.0))
    x1, y1, x2, y2 = 0.18, 0.9, 0.25, 1.0

    def coordinate(t, first, second):
        inverse = 1 - t

        return (
            3 * inverse * inverse * t * first
            + 3 * inverse * t * t * second
            + t * t * t
        )

    low = 0.0
    high = 1.0

    for _ in range(16):
        midpoint = (low + high) / 2

        if coordinate(midpoint, x1, x2) < progress:
            low = midpoint
        else:
            high = midpoint

    return coordinate((low + high) / 2, y1, y2)


def create_active_title_frame(
    width: int,
    height: int,
    ranked_clips,
    active_clip_id: str,
    progress: float,
    opacity: float,
):
    frame = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(frame)

    active_index = next(
        (
            index
            for index, clip_info in enumerate(ranked_clips)
            if clip_info["id"] == active_clip_id
        ),
        None,
    )

    if active_index is None:
        return np.array(frame)

    rank_layout = create_rank_layout()
    font = load_font(LABEL_FONT_SIZE)

    label = truncate_text(
        draw=draw,
        text=ranked_clips[active_index]["title"].upper(),
        font=font,
        max_width=rank_layout["label_max_width"],
    )

    label_width = text_width(draw, label, font)
    label_height = text_height(draw, font)

    row_y = rank_layout["list_top"] + active_index * rank_layout["row_step"]

    final_x = rank_layout["label_x"]
    final_y = row_y + (
        rank_layout["row_height"] - label_height
    ) // 2

    # React: transform: translateX(-120%).
    start_x = final_x - round(label_width * 1.2)
    current_x = round(start_x + (final_x - start_x) * progress)

    draw_outlined_text(
        draw=draw,
        x=current_x,
        y=final_y,
        text=label,
        font=font,
        fill=(255, 255, 255, 255),
    )

    if opacity < 1:
        frame_data = np.array(frame)
        frame_data[:, :, 3] = (
            frame_data[:, :, 3].astype(np.float32) * opacity
        ).astype(np.uint8)
        return frame_data

    return np.array(frame)


def create_animated_title_clip(
    width: int,
    height: int,
    ranked_clips,
    active_clip_id: str,
    clip_duration: float,
):
    animation_duration = min(SLIDE_DURATION, clip_duration)

    if animation_duration <= 0:
        return None, None

    max_frame_index = max(
        0,
        int(round(animation_duration * ANIMATION_FPS)),
    )

    @lru_cache(maxsize=max_frame_index + 2)
    def get_frame(frame_index: int):
        time = min(
            frame_index / ANIMATION_FPS,
            animation_duration,
        )

        raw_progress = time / animation_duration

        return create_active_title_frame(
            width=width,
            height=height,
            ranked_clips=ranked_clips,
            active_clip_id=active_clip_id,
            progress=cubic_bezier_ease(raw_progress),
            opacity=raw_progress,
        )

    def frame_index_from_time(time: float):
        return min(
            max_frame_index,
            max(0, int(round(time * ANIMATION_FPS))),
        )

    animated_rgb = VideoClip(
        frame_function=lambda time: get_frame(
            frame_index_from_time(time)
        )[:, :, :3],
        duration=animation_duration,
    )

    animated_mask = VideoClip(
        frame_function=lambda time: (
            get_frame(frame_index_from_time(time))[:, :, 3].astype(np.float32)
            / 255.0
        ),
        is_mask=True,
        duration=animation_duration,
    )

    animated_clip = animated_rgb.with_mask(animated_mask)

    final_frame = create_active_title_frame(
        width=width,
        height=height,
        ranked_clips=ranked_clips,
        active_clip_id=active_clip_id,
        progress=1.0,
        opacity=1.0,
    )

    remaining_duration = clip_duration - animation_duration

    static_clip = None

    if remaining_duration > 0:
        static_clip = (
            ImageClip(final_frame, transparent=True)
            .with_start(animation_duration)
            .with_duration(remaining_duration)
        )

    return animated_clip, static_clip


def add_ranking_overlay(
    clip,
    title_document,
    ranked_clips,
    revealed_clip_ids: set[str],
    active_clip_id: str,
):
    # The active title is rendered separately as an animated transparent layer.
    visible_past_ids = set(revealed_clip_ids)
    visible_past_ids.discard(active_clip_id)

    static_overlay = ImageClip(
        create_static_overlay(
            width=int(clip.w),
            height=int(clip.h),
            title_document=title_document,
            ranked_clips=ranked_clips,
            visible_past_ids=visible_past_ids,
        ),
        transparent=True,
    ).with_duration(clip.duration)

    animated_title, static_active_title = create_animated_title_clip(
        width=int(clip.w),
        height=int(clip.h),
        ranked_clips=ranked_clips,
        active_clip_id=active_clip_id,
        clip_duration=clip.duration,
    )

    layers = [clip, static_overlay]

    if animated_title is not None:
        layers.append(animated_title)

    if static_active_title is not None:
        layers.append(static_active_title)

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
        config = json.load(config_file)

    if not isinstance(config, dict):
        raise ValueError("Render config must be a JSON object.")

    return config


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

        if not isinstance(clip_id, str) or not isinstance(file_name, str):
            continue

        safe_file_name = Path(file_name).name
        file_path = input_path / safe_file_name

        if (
            not safe_file_name
            or safe_file_name != file_name
            or file_path.suffix.lower() not in VIDEO_EXTENSIONS
            or not file_path.exists()
        ):
            continue

        clips.append(
            {
                "id": clip_id,
                "fileName": safe_file_name,
                "title": (
                    title.strip()
                    if isinstance(title, str) and title.strip()
                    else file_path.stem
                ),
            }
        )

    return clips or create_fallback_clips(input_path)


def resolve_clip_order(requested_ids, clip_by_id, fallback_clips):
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
):
    input_path = Path(input_dir)
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    render_config = read_render_config(config_path)

    saved_clips = get_config_clips(render_config, input_path)

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
                f"Processing {play_index + 1}/{len(playback_clips)}: "
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

            decorated_clips.append(
                add_ranking_overlay(
                    clip=vertical_clip,
                    title_document=title_document,
                    ranked_clips=ranked_clips,
                    revealed_clip_ids=revealed_clip_ids,
                    active_clip_id=clip_info["id"],
                )
            )

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
