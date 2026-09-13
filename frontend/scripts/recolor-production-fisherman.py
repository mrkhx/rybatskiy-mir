#!/usr/bin/env python3
"""Recolor Rocketbox Gardener albedo to olive jacket / khaki pants / dark rubber boots."""
from pathlib import Path
import numpy as np
from PIL import Image

SRC = Path("/tmp/rocketbox/Gardener_Male_01/Textures")
OUT = Path("/tmp/rocketbox/fisherman_tex")
OUT.mkdir(parents=True, exist_ok=True)


def rgb_to_hsv(rgb):
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    mx = np.maximum(np.maximum(r, g), b)
    mn = np.minimum(np.minimum(r, g), b)
    df = mx - mn
    h = np.zeros_like(mx)
    mask = df > 1e-5
    rc = np.zeros_like(mx)
    gc = np.zeros_like(mx)
    bc = np.zeros_like(mx)
    rc[mask] = (mx[mask] - r[mask]) / df[mask]
    gc[mask] = (mx[mask] - g[mask]) / df[mask]
    bc[mask] = (mx[mask] - b[mask]) / df[mask]
    h[(mx == r) & mask] = (bc - gc)[(mx == r) & mask]
    h[(mx == g) & mask] = 2.0 + (rc - bc)[(mx == g) & mask]
    h[(mx == b) & mask] = 4.0 + (gc - rc)[(mx == b) & mask]
    h = (h / 6.0) % 1.0
    s = np.zeros_like(mx)
    s[mx > 1e-5] = df[mx > 1e-5] / mx[mx > 1e-5]
    return h, s, mx


def hsv_to_rgb(h, s, v):
    h = h % 1.0
    i = np.floor(h * 6).astype(np.int32)
    f = h * 6 - i
    p = v * (1 - s)
    q = v * (1 - f * s)
    t = v * (1 - (1 - f) * s)
    i6 = i % 6
    r = np.choose(i6, [v, q, p, p, t, v])
    g = np.choose(i6, [t, v, v, q, p, p])
    b = np.choose(i6, [p, p, t, v, v, q])
    return np.stack([r, g, b], axis=-1)


def lerp_color(src, target, w):
    return src * (1 - w[..., None]) + target * w[..., None]


body = np.asarray(Image.open(SRC / "m106_body_color.tga").convert("RGB"), dtype=np.float32) / 255.0
h, s, v = rgb_to_hsv(body)
yy = np.linspace(0, 1, body.shape[0])[:, None]
xx = np.linspace(0, 1, body.shape[1])[None, :]

# boots: yellow rubber
boot = (h > 0.07) & (h < 0.22) & (s > 0.35) & (v > 0.28)
# gloves: pale green-gray
glove = (h > 0.15) & (h < 0.45) & (s > 0.08) & (s < 0.45) & (v > 0.35) & (yy > 0.72)
# white undershirt
shirt = (s < 0.12) & (v > 0.62) & (yy < 0.55) & (xx < 0.55)
# remaining brown fabric
brown = (h > 0.02) & (h < 0.14) & (s > 0.18) & (v > 0.12) & ~boot
jacket = brown & (yy < 0.43)
pants = brown & (yy >= 0.40) & (yy < 0.78)
# leftover brown (belt etc.)
rest = brown & ~jacket & ~pants

olive = np.array([0.28, 0.32, 0.22], dtype=np.float32)
khaki = np.array([0.42, 0.40, 0.28], dtype=np.float32)
rubber = np.array([0.12, 0.13, 0.12], dtype=np.float32)
glove_c = np.array([0.55, 0.52, 0.42], dtype=np.float32)
shirt_c = np.array([0.78, 0.76, 0.68], dtype=np.float32)

out = body.copy()
# keep luminance of source
lum = 0.2126 * body[..., 0] + 0.7152 * body[..., 1] + 0.0722 * body[..., 2]

def apply(mask, target, amount, preserve=0.55):
    if not mask.any():
        return
    tint = target * (lum[..., None] * 1.35 + 0.12)
    w = mask.astype(np.float32) * amount
    out[:] = lerp_color(out, np.clip(tint, 0, 1), w * (1 - preserve) + w * preserve * 0)
    # mix target * source luminance
    mixed = np.clip(target * (0.35 + lum * 1.15)[..., None], 0, 1)
    out[:] = lerp_color(out, mixed, w)


apply(jacket, olive, 0.82, 0.0)
apply(pants, khaki, 0.78, 0.0)
apply(rest, olive * 0.85, 0.55, 0.0)
apply(boot, rubber, 0.9, 0.0)
# keep some rubber highlight
out[boot] = np.clip(out[boot] * 0.55 + rubber * 0.45, 0, 1)
apply(glove, glove_c, 0.65, 0.0)
apply(shirt, shirt_c, 0.5, 0.0)

# leftover yellow (boot islands / atlas scraps)
h2, s2, v2 = rgb_to_hsv(out)
left_y = (h2 > 0.08) & (h2 < 0.22) & (s2 > 0.28) & (v2 > 0.25)
out[left_y] = np.clip(rubber * (0.55 + lum[left_y, None] * 0.7), 0, 1)

Image.fromarray((np.clip(out, 0, 1) * 255).astype(np.uint8)).save(OUT / "body_basecolor.png", optimize=True)

# roughness from inverted specular
spec = np.asarray(Image.open(SRC / "m106_body_specular.tga").convert("L"), dtype=np.float32) / 255.0
rough = np.clip(1.0 - spec * 0.75, 0.28, 0.95)
# rubber boots glossier
rough[boot] = np.clip(0.38 + (1 - spec[boot]) * 0.15, 0.32, 0.55)
# fabric rougher
rough[jacket | pants] = np.clip(rough[jacket | pants] + 0.12, 0.45, 0.92)
Image.fromarray((rough * 255).astype(np.uint8)).save(OUT / "body_roughness.png")

# normal: flip Y for glTF (OpenGL)
norm = np.asarray(Image.open(SRC / "m106_body_normal.tga").convert("RGB"))
norm = norm.copy()
norm[..., 1] = 255 - norm[..., 1]
Image.fromarray(norm).save(OUT / "body_normal.png", optimize=True)

# head albedo unchanged (skin), plus roughness/normal
head = Image.open(SRC / "m106_head_color.tga").convert("RGB")
head.save(OUT / "head_basecolor.png", optimize=True)
hspec = np.asarray(Image.open(SRC / "m106_head_specular.tga").convert("L"), dtype=np.float32) / 255.0
hrough = np.clip(1.0 - hspec * 0.7, 0.35, 0.72)
Image.fromarray((hrough * 255).astype(np.uint8)).save(OUT / "head_roughness.png")
hnorm = np.asarray(Image.open(SRC / "m106_head_normal.tga").convert("RGB")).copy()
hnorm[..., 1] = 255 - hnorm[..., 1]
Image.fromarray(hnorm).save(OUT / "head_normal.png", optimize=True)

# opacity hair cards
op = Image.open(SRC / "m106_opacity_color.tga")
op.save(OUT / "opacity_basecolor.png")

# previews
Image.fromarray((np.clip(out, 0, 1) * 255).astype(np.uint8)).resize((512, 512)).save(OUT / "body_preview.jpg", quality=85)
print("wrote", OUT)
print("boot px", int(boot.sum()), "jacket", int(jacket.sum()), "pants", int(pants.sum()), "glove", int(glove.sum()))
