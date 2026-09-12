#!/usr/bin/env python3
"""Chroma-key magenta scene layers and export WebP assets."""
from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter

ROOT = Path("/workspace/artifacts/imagine_images")
OUT = Path("/workspace/rybatskiy-mir/frontend/public/scene/forest-lake")
OUT.mkdir(parents=True, exist_ok=True)


def key_magenta(img: Image.Image, thresh: float = 55, softness: float = 48) -> Image.Image:
    a = np.asarray(img.convert("RGBA")).astype(np.float32)
    r, g, b = a[:, :, 0], a[:, :, 1], a[:, :, 2]
    dist = np.sqrt((r - 255.0) ** 2 + g**2 + (b - 255.0) ** 2)
    alpha = np.clip((dist - thresh) / softness, 0.0, 1.0)
    mag = np.clip((np.minimum(r, b) - g) / 180.0, 0.0, 1.0)
    r2 = r - mag * np.maximum(r - g, 0)
    b2 = b - mag * np.maximum(b - g, 0)
    out = np.dstack([r2, g, b2, alpha * 255.0]).astype(np.uint8)
    return Image.fromarray(out, "RGBA")


def trim(img: Image.Image, pad: int = 4) -> Image.Image:
    bbox = img.split()[-1].point(lambda p: 255 if p > 12 else 0).getbbox()
    if not bbox:
        return img
    x0, y0, x1, y1 = bbox
    x0 = max(0, x0 - pad)
    y0 = max(0, y0 - pad)
    x1 = min(img.width, x1 + pad)
    y1 = min(img.height, y1 + pad)
    return img.crop((x0, y0, x1, y1))


def resize_w(img: Image.Image, w: int) -> Image.Image:
    if img.width <= w:
        return img
    h = int(img.height * (w / img.width))
    return img.resize((w, h), Image.Resampling.LANCZOS)


def save_webp(img: Image.Image, name: str, quality: int = 86) -> None:
    path = OUT / name
    img.save(path, "WEBP", quality=quality, method=6)
    print(f"wrote {path.name} {img.size} {path.stat().st_size // 1024}kb")


# Sky & water — no chroma, just compress
sky = Image.open(ROOT / "cdc32747-7459-4b49-a224-8df969e48b69.jpg").convert("RGB")
save_webp(resize_w(sky, 1600), "sky.webp", 82)

water = Image.open(ROOT / "b4221531-327b-4bc7-922a-084153705d29.jpg").convert("RGB")
save_webp(resize_w(water, 1600), "water.webp", 82)

jobs = [
    ("17333d78-f607-44be-82f9-009dd3ba2043.jpg", "far-forest.webp", 1600, False, 50, 55),
    ("6c680047-51fb-47e4-8c69-e6b9bba29f98.jpg", "pier.webp", 1400, True, 48, 50),
    ("7bf1f215-10a2-4908-a93e-b24a87250d55.jpg", "reeds.webp", 700, True, 45, 42),
    ("ce555cb1-2068-49ee-8857-0a58b2bebdb6.jpg", "lilies.webp", 640, True, 42, 40),
    ("afbd5c5b-e6b3-4519-8bc2-88ee9b4960ab.jpg", "branch.webp", 1100, True, 48, 48),
    ("2318e654-ccf4-424c-937c-01f4dc6d32d5.jpg", "trees.webp", 900, True, 48, 48),
    ("6a79cc35-c783-4a63-80fa-270a56bdfcec.jpg", "rocks.webp", 700, True, 45, 42),
]

for src, name, w, do_trim, thresh, soft in jobs:
    im = key_magenta(Image.open(ROOT / src), thresh, soft)
    # slight blur on alpha to kill jagged jpeg chroma
    rgb = im.convert("RGB")
    alpha = im.split()[-1].filter(ImageFilter.GaussianBlur(radius=0.6))
    im = Image.merge("RGBA", (*rgb.split(), alpha))
    if do_trim:
        im = trim(im)
    save_webp(resize_w(im, w), name, 86)

# Angler 2x2 sheet
raw = key_magenta(Image.open(ROOT / "8ad7497a-1cb4-4158-b44d-26cd5bbeb3de.jpg"), 52, 46)
cw, ch = raw.width // 2, raw.height // 2
frames = []
for row in range(2):
    for col in range(2):
        cell = raw.crop((col * cw, row * ch, (col + 1) * cw, (row + 1) * ch))
        frames.append(trim(cell, 8))

# shared canvas
mw = max(f.width for f in frames)
mh = max(f.height for f in frames)
cell = int(max(mw, mh) * 1.04)
sheet = Image.new("RGBA", (cell * 2, cell * 2), (0, 0, 0, 0))
for i, f in enumerate(frames):
    r, c = divmod(i, 2)
    x = c * cell + (cell - f.width) // 2
    y = r * cell + (cell - f.height)  # feet-align
    sheet.paste(f, (x, y), f)
save_webp(resize_w(sheet, 800), "angler-idle.webp", 88)

# flipped trees for the right bank
trees = Image.open(OUT / "trees.webp")
trees.transpose(Image.Transpose.FLIP_LEFT_RIGHT).save(OUT / "trees-r.webp", "WEBP", quality=86, method=6)
print("wrote trees-r.webp")
print("done", list(p.name for p in OUT.iterdir()))
