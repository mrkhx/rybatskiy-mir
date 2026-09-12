#!/usr/bin/env python3
"""Re-key Forest Lake layers from original Imagine JPEGs → PNG with real alpha."""
from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter

ROOT = Path("/workspace/artifacts/imagine_images")
OUT = Path("/workspace/rybatskiy-mir/frontend/public/scene/forest-lake")
OUT.mkdir(parents=True, exist_ok=True)


def rgb_hsv(r, g, b):
    mx = np.maximum(np.maximum(r, g), b)
    mn = np.minimum(np.minimum(r, g), b)
    d = mx - mn
    h = np.zeros_like(mx)
    s = np.zeros_like(mx)
    mask = mx > 0
    s[mask] = d[mask] / mx[mask]
    nz = d > 1e-5
    rc, gc, bc = r[nz], g[nz], b[nz]
    mxn, dn = mx[nz], d[nz]
    hsel = np.zeros_like(rc)
    rmax = (mxn == rc)
    gmax = (mxn == gc) & ~rmax
    bmax = ~rmax & ~gmax
    hsel[rmax] = ((gc[rmax] - bc[rmax]) / dn[rmax]) % 6
    hsel[gmax] = (bc[gmax] - rc[gmax]) / dn[gmax] + 2
    hsel[bmax] = (rc[bmax] - gc[bmax]) / dn[bmax] + 4
    h[nz] = hsel * 60.0
    return h, s, mx


def key(img: Image.Image, mode: str = "prop") -> Image.Image:
    arr = np.asarray(img.convert("RGB")).astype(np.float32)
    r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]
    h, s, v = rgb_hsv(r / 255.0, g / 255.0, b / 255.0)
    dist = np.sqrt((r - 255) ** 2 + g**2 + (b - 255) ** 2)
    mag_rgb = (r > 70) & (b > 70) & (g + 18 < r) & (g + 18 < b)
    mag_hue = ((h >= 265) | (h <= 10)) & (s >= 0.18) & (v >= 0.18)
    if mode == "strict":
        bg = (dist < 95) | (mag_hue & (s > 0.45) & (dist < 160))
    else:
        bg = (dist < 130) | mag_hue | mag_rgb

    alpha = np.where(bg, 0.0, 255.0)
    # despill remaining fringe
    mag = np.clip((np.minimum(r, b) - g) / 160.0, 0, 1)
    r2 = r - mag * np.maximum(r - g, 0)
    b2 = b - mag * np.maximum(b - g, 0)
    out = np.dstack([r2, g, b2, alpha]).astype(np.uint8)
    im = Image.fromarray(out, "RGBA")

    # flood-fill remaining background from the border
    px = np.array(im)
    hgt, wdt = px.shape[:2]
    vis = np.zeros((hgt, wdt), dtype=bool)
    stack = []
    for x in range(wdt):
        stack.append((0, x))
        stack.append((hgt - 1, x))
    for y in range(hgt):
        stack.append((y, 0))
        stack.append((y, wdt - 1))
    while stack:
        y, x = stack.pop()
        if y < 0 or x < 0 or y >= hgt or x >= wdt or vis[y, x]:
            continue
        rr, gg, bb, aa = px[y, x]
        if aa == 0:
            vis[y, x] = True
            stack.extend(((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)))
            continue
        dlt = ((int(rr) - 255) ** 2 + int(gg) ** 2 + (int(bb) - 255) ** 2) ** 0.5
        hue_like = int(rr) > 80 and int(bb) > 80 and int(gg) + 12 < int(rr) and int(gg) + 12 < int(bb)
        if dlt < 150 or hue_like:
            px[y, x, 3] = 0
            vis[y, x] = True
            stack.extend(((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)))
        else:
            vis[y, x] = True
    im = Image.fromarray(px, "RGBA")
    a = im.split()[-1].filter(ImageFilter.GaussianBlur(radius=0.55))
    rgb = im.convert("RGB")
    return Image.merge("RGBA", (*rgb.split(), a))


def trim(img: Image.Image, pad: int = 6) -> Image.Image:
    bbox = img.split()[-1].point(lambda p: 255 if p > 18 else 0).getbbox()
    if not bbox:
        return img
    x0, y0, x1, y1 = bbox
    return img.crop((max(0, x0 - pad), max(0, y0 - pad), min(img.width, x1 + pad), min(img.height, y1 + pad)))


def resize_w(img: Image.Image, w: int) -> Image.Image:
    if img.width <= w:
        return img
    h = max(1, int(img.height * (w / img.width)))
    return img.resize((w, h), Image.Resampling.LANCZOS)


def save_png(img: Image.Image, name: str) -> None:
    path = OUT / name
    img.save(path, "PNG", optimize=True)
    a = np.asarray(img.split()[-1])
    print(f"wrote {name:18} {img.size} opaque={(a>250).mean()*100:5.1f}%  {path.stat().st_size//1024}kb")


# opaque backdrops
Image.open(ROOT / "cdc32747-7459-4b49-a224-8df969e48b69.jpg").convert("RGB").resize((1600, 900), Image.Resampling.LANCZOS).save(OUT / "sky.png", "PNG", optimize=True)
print("wrote sky.png")
water = Image.open(ROOT / "b4221531-327b-4bc7-922a-084153705d29.jpg").convert("RGB")
water = water.crop((0, int(water.height * 0.40), water.width, water.height)).resize((1600, 540), Image.Resampling.LANCZOS)
water.save(OUT / "water.png", "PNG", optimize=True)
print("wrote water.png")

# far forest: strict magenta only, keep purple mountain haze
ff = key(Image.open(ROOT / "17333d78-f607-44be-82f9-009dd3ba2043.jpg"), "strict")
save_png(resize_w(ff, 1600), "far-forest.png")

jobs = [
    ("6c680047-51fb-47e4-8c69-e6b9bba29f98.jpg", "pier.png", 1400, True),
    ("7bf1f215-10a2-4908-a93e-b24a87250d55.jpg", "reeds.png", 720, True),
    ("ce555cb1-2068-49ee-8857-0a58b2bebdb6.jpg", "lilies.png", 640, True),
    ("afbd5c5b-e6b3-4519-8bc2-88ee9b4960ab.jpg", "branch.png", 1000, True),
    ("2318e654-ccf4-424c-937c-01f4dc6d32d5.jpg", "trees.png", 780, True),
    ("6a79cc35-c783-4a63-80fa-270a56bdfcec.jpg", "rocks.png", 700, True),
]
for src, name, w, do_trim in jobs:
    im = key(Image.open(ROOT / src), "prop")
    if do_trim:
        im = trim(im)
    save_png(resize_w(im, w), name)

raw = key(Image.open(ROOT / "8ad7497a-1cb4-4158-b44d-26cd5bbeb3de.jpg"), "prop")
cw, ch = raw.width // 2, raw.height // 2
# top row only — two back-view idle frames
frames = [trim(raw.crop((col * cw, 0, (col + 1) * cw, ch)), 10) for col in range(2)]
mh = max(f.height for f in frames)
mw = max(f.width for f in frames)
cell_w, cell_h = mw, mh
sheet = Image.new("RGBA", (cell_w * 2, cell_h), (0, 0, 0, 0))
for i, f in enumerate(frames):
    sheet.paste(f, (i * cell_w + (cell_w - f.width) // 2, cell_h - f.height), f)
save_png(resize_w(sheet, 720), "angler-idle.png")

# drop old webps so the browser cannot keep serving opaque RGB
for old in OUT.glob("*.webp"):
    old.unlink()
    print("removed", old.name)
print("done")
