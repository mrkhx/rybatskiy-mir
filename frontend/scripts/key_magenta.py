#!/usr/bin/env python3
"""Chroma-key magenta sprites → cropped WebP with real alpha."""
from __future__ import annotations

from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter

def key_magenta(src: Path, dst: Path, dist_thr: float = 110.0) -> Image.Image:
    img = Image.open(src).convert("RGB")
    arr = np.asarray(img).astype(np.float32)
    r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]
    dist = np.sqrt((r - 255) ** 2 + g**2 + (b - 255) ** 2)
    mag = (r > 80) & (b > 80) & (g + 20 < r) & (g + 20 < b)
    bg = (dist < dist_thr) | mag
    alpha = np.where(bg, 0.0, 255.0)
    magf = np.clip((np.minimum(r, b) - g) / 180.0, 0, 1)
    r2 = r - magf * np.maximum(r - g, 0)
    b2 = b - magf * np.maximum(b - g, 0)
    px = np.dstack([r2, g, b2, alpha]).astype(np.uint8)
    h, w = px.shape[:2]
    vis = np.zeros((h, w), dtype=bool)
    stack = [(0, x) for x in range(w)] + [(h - 1, x) for x in range(w)]
    stack += [(y, 0) for y in range(h)] + [(y, w - 1) for y in range(h)]
    while stack:
        y, x = stack.pop()
        if y < 0 or x < 0 or y >= h or x >= w or vis[y, x]:
            continue
        rr, gg, bb, aa = px[y, x]
        if aa == 0:
            vis[y, x] = True
            stack.extend(((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)))
            continue
        dlt = ((int(rr) - 255) ** 2 + int(gg) ** 2 + (int(bb) - 255) ** 2) ** 0.5
        hue_like = int(rr) > 80 and int(bb) > 80 and int(gg) + 12 < int(rr) and int(gg) + 12 < int(bb)
        if dlt < 140 or hue_like:
            px[y, x, 3] = 0
            vis[y, x] = True
            stack.extend(((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)))
    im = Image.fromarray(px, "RGBA")
    a = np.array(im.getchannel("A"))
    ys, xs = np.where(a > 12)
    if len(xs) == 0:
        raise SystemExit(f"empty after key: {src}")
    pad = 10
    box = (max(0, int(xs.min()) - pad), max(0, int(ys.min()) - pad), min(w, int(xs.max()) + pad + 1), min(h, int(ys.max()) + pad + 1))
    im = im.crop(box)
    aimg = im.getchannel("A").filter(ImageFilter.MinFilter(3))
    im.putalpha(Image.composite(im.getchannel("A"), aimg, aimg.point(lambda v: 255 if v > 40 else 0)))
    dst.parent.mkdir(parents=True, exist_ok=True)
    im.save(dst, "WEBP", quality=90, method=6)
    aa = np.array(im.getchannel("A"))
    edge = np.concatenate([aa[0, :], aa[-1, :], aa[:, 0], aa[:, -1]])
    print(f"{dst.name:22} {im.size[0]:4}x{im.size[1]:<4} opaque={(aa > 10).mean():.2f} edge={edge.mean():.1f}")
    return im


if __name__ == "__main__":
    root = Path("/workspace/artifacts/imagine_images")
    out = Path("/workspace/rybatskiy-mir/frontend/public/scene/forest-lake")
    char = out / "char"
    jobs = [
        (root / "18a1eb6f-577c-40e9-a61d-035d716e5816.jpg", char / "master.webp"),
        (root / "256b0dff-dc85-4cd7-a7ee-e872c4a303cf.jpg", char / "head.webp"),
        (root / "42926721-f349-481d-95be-78da184326ce.jpg", char / "body.webp"),
        (root / "d2c7a184-a8a9-46e6-81c3-b55238514dda.jpg", char / "arm-l.webp"),
        (root / "cc6b2f80-abc1-4360-aeab-ff233aeaeef6.jpg", char / "arm-r.webp"),
        (root / "76762ff0-3a35-48eb-87eb-a798aceef546.jpg", out / "trees-b.webp"),
        (root / "3b1f1418-5736-4569-b07e-7b4df73c01f5.jpg", out / "float.webp"),
        (root / "05f79f7c-45c8-42e7-9186-e2ee4d011ecf.jpg", char / "idle-sheet.webp"),
    ]
    for src, dst in jobs:
        key_magenta(src, dst)
