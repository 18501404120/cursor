#!/usr/bin/env python3
"""生成带「会议记录」字样的应用图标（PNG + icns）。"""

from __future__ import annotations

import os
import shutil
import subprocess
import sys
import tempfile

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
ASSETS = os.path.join(ROOT, "assets")
PNG_PATH = os.path.join(ASSETS, "app-icon.png")
ICNS_PATH = os.path.join(ASSETS, "AppIcon.icns")

FONT_CANDIDATES = [
    "/System/Library/Fonts/PingFang.ttc",
    "/System/Library/Fonts/STHeiti Light.ttc",
    "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
]


def ensure_pillow():
    try:
        from PIL import Image, ImageDraw, ImageFont  # noqa: F401
        return
    except ImportError:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-q", "pillow"])


def pick_font(size: int):
    from PIL import ImageFont

    for path in FONT_CANDIDATES:
        if os.path.isfile(path):
            try:
                return ImageFont.truetype(path, size=size)
            except OSError:
                continue
    return ImageFont.load_default()


def draw_icon(size: int = 1024):
    from PIL import Image, ImageDraw

    img = Image.new("RGBA", (size, size), (37, 99, 235, 255))
    draw = ImageDraw.Draw(img)
    margin = int(size * 0.12)
    draw.rounded_rectangle(
        (margin, margin, size - margin, size - margin),
        radius=int(size * 0.14),
        fill=(26, 35, 50, 255),
    )

    font_main = pick_font(int(size * 0.16))
    font_sub = pick_font(int(size * 0.09))
    text_main = "会议"
    text_sub = "记录"

    bbox_main = draw.textbbox((0, 0), text_main, font=font_main)
    bbox_sub = draw.textbbox((0, 0), text_sub, font=font_sub)
    w_main = bbox_main[2] - bbox_main[0]
    w_sub = bbox_sub[2] - bbox_sub[0]
    h_main = bbox_main[3] - bbox_main[1]
    h_sub = bbox_sub[3] - bbox_sub[1]
    gap = int(size * 0.04)
    total_h = h_main + gap + h_sub
    y0 = (size - total_h) // 2

    draw.text(((size - w_main) // 2, y0), text_main, fill=(232, 237, 245, 255), font=font_main)
    draw.text(((size - w_sub) // 2, y0 + h_main + gap), text_sub, fill=(147, 197, 253, 255), font=font_sub)

    mic_r = int(size * 0.055)
    cx, cy = size // 2, int(size * 0.18)
    draw.rounded_rectangle(
        (cx - mic_r, cy - mic_r, cx + mic_r, cy + mic_r * 1.8),
        radius=mic_r // 2,
        fill=(239, 68, 68, 255),
    )
    draw.arc(
        (cx - mic_r * 1.6, cy, cx + mic_r * 1.6, cy + mic_r * 3.2),
        start=200,
        end=340,
        fill=(239, 68, 68, 255),
        width=max(4, size // 128),
    )
    return img


def write_icns(png_path: str, icns_path: str) -> None:
    if shutil.which("iconutil") is None or shutil.which("sips") is None:
        print("⚠️  未找到 iconutil/sips，跳过 icns，仅生成 PNG")
        return

    with tempfile.TemporaryDirectory() as tmp:
        iconset = os.path.join(tmp, "AppIcon.iconset")
        os.makedirs(iconset, exist_ok=True)
        specs = [
            (16, "icon_16x16.png"),
            (32, "icon_16x16@2x.png"),
            (32, "icon_32x32.png"),
            (64, "icon_32x32@2x.png"),
            (128, "icon_128x128.png"),
            (256, "icon_128x128@2x.png"),
            (256, "icon_256x256.png"),
            (512, "icon_256x256@2x.png"),
            (512, "icon_512x512.png"),
            (1024, "icon_512x512@2x.png"),
        ]
        for dim, name in specs:
            out = os.path.join(iconset, name)
            subprocess.check_call(["sips", "-z", str(dim), str(dim), png_path, "--out", out], stdout=subprocess.DEVNULL)
        subprocess.check_call(["iconutil", "-c", "icns", iconset, "-o", icns_path])


def main() -> int:
    os.makedirs(ASSETS, exist_ok=True)
    ensure_pillow()
    img = draw_icon(1024)
    img.save(PNG_PATH, format="PNG")
    write_icns(PNG_PATH, ICNS_PATH)
    print(f"✅ 图标已生成: {PNG_PATH}")
    if os.path.isfile(ICNS_PATH):
        print(f"✅ icns 已生成: {ICNS_PATH}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
