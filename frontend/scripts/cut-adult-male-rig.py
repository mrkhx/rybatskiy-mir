#!/usr/bin/env python3
"""Cut A-pose master into cropped 2.5D rig layers + manifest.

Joints are in 1254x1800 (half-res) space, then scaled. Arms in this master
are a raised A-pose (out to the sides), not hanging at the hips.
"""
from __future__ import annotations

import json
import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path("/workspace")
MASTER = ROOT / "artifacts/char-rig/master-a-pose.png"
ROD_SRC = ROOT / "artifacts/char-rig/rod.png"
OUT_DIR = ROOT / "public/characters/adult-male"
PARTS = OUT_DIR / "parts"
DEBUG = ROOT / "artifacts/char-rig"
SCALE = 0.5  # runtime canvas; source master stays 2508x3600

# Measured on 1254x1800 silhouette (arms out ~y=490–660).
JOINTS_BASE = {
    "HeadAnchor": (643.0, 212.0),
    "NeckAnchor": (649.0, 382.0),
    "ShoulderL": (455.0, 492.0),
    "ShoulderR": (828.0, 508.0),
    "ElbowL": (252.0, 548.0),
    "ElbowR": (1008.0, 558.0),
    "WristL": (112.0, 622.0),
    "WristR": (1152.0, 632.0),
    "Hip": (655.0, 1004.0),
    "HipL": (567.0, 1030.0),
    "HipR": (749.0, 1030.0),
    "KneeL": (511.0, 1364.0),
    "KneeR": (787.0, 1355.0),
    "AnkleL": (492.0, 1643.0),
    "AnkleR": (762.0, 1634.0),
    "RodGrip": (1196.0, 652.0),
    "RodSupportTarget": (980.0, 430.0),
}

HAND_L = (68.0, 648.0)
HAND_R = (1198.0, 652.0)
FOOT_L = (496.0, 1688.0)
FOOT_R = (768.0, 1680.0)

PARTS_META = {
    "pelvis": {"parent": "root", "pivot": "Hip", "z": 20, "end": "Hip"},
    "torso": {"parent": "pelvis", "pivot": "Hip", "z": 30, "end": "NeckAnchor"},
    "head": {"parent": "torso", "pivot": "NeckAnchor", "z": 50, "end": "HeadAnchor"},
    "hairBack": {"parent": "head", "pivot": "HeadAnchor", "z": 8, "end": "HeadAnchor"},
    "hairFront": {"parent": "head", "pivot": "HeadAnchor", "z": 55, "end": "HeadAnchor"},
    "upperArm_L": {"parent": "torso", "pivot": "ShoulderL", "z": 12, "end": "ElbowL"},
    "forearm_L": {"parent": "upperArm_L", "pivot": "ElbowL", "z": 13, "end": "WristL"},
    "hand_L": {"parent": "forearm_L", "pivot": "WristL", "z": 14, "end": "WristL"},
    "upperArm_R": {"parent": "torso", "pivot": "ShoulderR", "z": 40, "end": "ElbowR"},
    "forearm_R": {"parent": "upperArm_R", "pivot": "ElbowR", "z": 41, "end": "WristR"},
    "hand_R": {"parent": "forearm_R", "pivot": "WristR", "z": 42, "end": "RodGrip"},
    "thigh_L": {"parent": "pelvis", "pivot": "HipL", "z": 18, "end": "KneeL"},
    "shin_L": {"parent": "thigh_L", "pivot": "KneeL", "z": 17, "end": "AnkleL"},
    "foot_L": {"parent": "shin_L", "pivot": "AnkleL", "z": 16, "end": "AnkleL"},
    "thigh_R": {"parent": "pelvis", "pivot": "HipR", "z": 19, "end": "KneeR"},
    "shin_R": {"parent": "thigh_R", "pivot": "KneeR", "z": 18, "end": "AnkleR"},
    "foot_R": {"parent": "shin_R", "pivot": "AnkleR", "z": 17, "end": "AnkleR"},
}

# Child subtracted from parent EXCEPT a keep-radius around the shared joint.
JOINT_PAIRS = [
    ("torso", "head", "NeckAnchor", 52),
    ("torso", "upperArm_L", "ShoulderL", 58),
    ("torso", "upperArm_R", "ShoulderR", 58),
    ("pelvis", "torso", "Hip", 78),
    ("pelvis", "thigh_L", "HipL", 52),
    ("pelvis", "thigh_R", "HipR", 52),
    ("upperArm_L", "forearm_L", "ElbowL", 46),
    ("forearm_L", "hand_L", "WristL", 34),
    ("upperArm_R", "forearm_R", "ElbowR", 46),
    ("forearm_R", "hand_R", "WristR", 34),
    ("thigh_L", "shin_L", "KneeL", 40),
    ("shin_L", "foot_L", "AnkleL", 36),
    ("thigh_R", "shin_R", "KneeR", 40),
    ("shin_R", "foot_R", "AnkleR", 36),
]


def scale_pt(p: tuple[float, float], k: float) -> tuple[float, float]:
    return (p[0] * k, p[1] * k)


def capsule_mask(size, a, b, radius: int) -> np.ndarray:
    im = Image.new("L", size, 0)
    d = ImageDraw.Draw(im)
    d.line([a, b], fill=255, width=max(2, int(radius * 2)))
    r = radius
    for p in (a, b):
        d.ellipse([p[0] - r, p[1] - r, p[0] + r, p[1] + r], fill=255)
    return np.array(im) > 80


def circle_mask(size, c, radius: int) -> np.ndarray:
    im = Image.new("L", size, 0)
    d = ImageDraw.Draw(im)
    d.ellipse([c[0] - radius, c[1] - radius, c[0] + radius, c[1] + radius], fill=255)
    return np.array(im) > 80


def dilate(mask: np.ndarray, px: int) -> np.ndarray:
    if px <= 0:
        return mask
    k = min(max(px * 2 + 1, 3), 21)
    if k % 2 == 0:
        k += 1
    im = Image.fromarray((mask.astype(np.uint8) * 255), "L").filter(ImageFilter.MaxFilter(k))
    return np.array(im) > 80


def crop_layer(arr: np.ndarray, mask: np.ndarray, pad: int = 10):
    ys, xs = np.where(mask)
    if len(xs) == 0:
        empty = Image.new("RGBA", (8, 8), (0, 0, 0, 0))
        return empty, 0, 0
    x0, x1 = max(0, int(xs.min()) - pad), min(arr.shape[1] - 1, int(xs.max()) + pad)
    y0, y1 = max(0, int(ys.min()) - pad), min(arr.shape[0] - 1, int(ys.max()) + pad)
    layer = np.zeros((y1 - y0 + 1, x1 - x0 + 1, 4), dtype=np.uint8)
    local = mask[y0 : y1 + 1, x0 : x1 + 1]
    layer[local] = arr[y0 : y1 + 1, x0 : x1 + 1][local]
    return Image.fromarray(layer, "RGBA"), int(x0), int(y0)


def bone_angle(a, b) -> float:
    return math.degrees(math.atan2(b[1] - a[1], b[0] - a[0]))


def overshoot(a, b, extra_a: float, extra_b: float):
    dx, dy = b[0] - a[0], b[1] - a[1]
    L = math.hypot(dx, dy) or 1.0
    ux, uy = dx / L, dy / L
    return (a[0] - ux * extra_a, a[1] - uy * extra_a), (b[0] + ux * extra_b, b[1] + uy * extra_b)


def clean_rod(src: Path, dest: Path) -> dict:
    """Keep tapered blank + compact reel; drop the hanging blob under the seat."""
    raw = Image.open(src).convert("RGBA")
    arr = np.array(raw)
    h, w = arr.shape[:2]
    spine = 74
    mask = Image.new("L", (w, h), 0)
    d = ImageDraw.Draw(mask)
    # butt + cork handle
    d.line([(24, spine), (310, spine)], fill=255, width=78)
    d.ellipse([8, spine - 44, 90, spine + 44], fill=255)
    # reel seat
    d.line([(300, spine), (470, spine)], fill=255, width=64)
    # compact spinning reel under the seat
    d.ellipse([330, spine - 8, 510, spine + 118], fill=255)
    d.ellipse([360, spine + 70, 430, spine + 150], fill=255)
    # tapered blank to tip
    d.line([(460, spine), (900, spine)], fill=255, width=42)
    d.line([(880, spine), (1400, spine)], fill=255, width=26)
    d.line([(1380, spine), (1800, spine)], fill=255, width=16)
    d.line([(1780, spine), (2178, spine)], fill=255, width=10)
    d.ellipse([2158, spine - 8, 2188, spine + 8], fill=255)
    keep = np.array(mask) > 80
    out = np.zeros_like(arr)
    out[keep] = arr[keep]
    Image.fromarray(out, "RGBA").save(dest, optimize=True)
    return {
        "image": "rod.png",
        "parent": "hand_R",
        "gripAnchor": "RodGrip",
        "supportAnchor": "RodSupportTarget",
        "width": w,
        "height": h,
        "pivotX": 338,
        "pivotY": spine,
        "reelX": 410,
        "reelY": spine + 78,
        "supportX": 820,
        "supportY": spine,
        "tipX": 2168,
        "tipY": spine,
        "lineStartX": 2148,
        "lineStartY": spine,
        "length": 1830,
        "scale": 0.58,
        "defaultRotation": -12,
    }


def main() -> None:
    full = Image.open(MASTER).convert("RGBA")
    k = SCALE / 0.5
    w, h = int(full.width * SCALE), int(full.height * SCALE)
    master = full.resize((w, h), Image.Resampling.LANCZOS)
    arr = np.array(master)
    alpha = arr[:, :, 3] > 24
    J = {name: scale_pt(p, k) for name, p in JOINTS_BASE.items()}
    hand_l = scale_pt(HAND_L, k)
    hand_r = scale_pt(HAND_R, k)
    foot_l = scale_pt(FOOT_L, k)
    foot_r = scale_pt(FOOT_R, k)
    size = (w, h)
    PARTS.mkdir(parents=True, exist_ok=True)
    s = h / 1800.0

    def R(px: float) -> int:
        return max(4, int(px * s))

    def C(a, b, radius, extra_a=8.0, extra_b=22.0):
        a2, b2 = overshoot(a, b, extra_a * s, extra_b * s)
        return capsule_mask(size, a2, b2, R(radius))

    cap = {
        "head": circle_mask(size, J["HeadAnchor"], R(198))
        | C(J["HeadAnchor"], J["NeckAnchor"], 92, 8, 10),
        "torso": C(J["NeckAnchor"], J["Hip"], 168, 12, 16)
        | C(J["ShoulderL"], J["ShoulderR"], 108, 6, 6)
        | circle_mask(size, J["Hip"], R(118))
        | circle_mask(size, J["ShoulderL"], R(44))
        | circle_mask(size, J["ShoulderR"], R(44)),
        "pelvis": circle_mask(size, J["Hip"], R(128))
        | C(J["HipL"], J["HipR"], 108, 8, 8)
        | C(J["Hip"], (J["Hip"][0], J["Hip"][1] + 90 * s), 118, 4, 4),
        "upperArm_L": C(J["ShoulderL"], J["ElbowL"], 56, 10, 32) | circle_mask(size, J["ElbowL"], R(56)),
        "forearm_L": C(J["ElbowL"], J["WristL"], 50, 32, 16) | circle_mask(size, J["ElbowL"], R(54)),
        "hand_L": circle_mask(size, hand_l, R(52)) | C(J["WristL"], hand_l, 42, 12, 10),
        "upperArm_R": C(J["ShoulderR"], J["ElbowR"], 56, 10, 32) | circle_mask(size, J["ElbowR"], R(56)),
        "forearm_R": C(J["ElbowR"], J["WristR"], 50, 32, 16) | circle_mask(size, J["ElbowR"], R(54)),
        "hand_R": circle_mask(size, hand_r, R(52)) | C(J["WristR"], hand_r, 42, 12, 10),
        "thigh_L": C(J["HipL"], J["KneeL"], 92, 24),
        "shin_L": C(J["KneeL"], J["AnkleL"], 70, 22),
        "foot_L": circle_mask(size, foot_l, R(72)) | C(J["AnkleL"], foot_l, 58, 8),
        "thigh_R": C(J["HipR"], J["KneeR"], 92, 24),
        "shin_R": C(J["KneeR"], J["AnkleR"], 70, 22),
        "foot_R": circle_mask(size, foot_r, R(72)) | C(J["AnkleR"], foot_r, 58, 8),
    }

    masks: dict[str, np.ndarray] = {}
    grow = dilate(alpha, 2)
    for name, m in cap.items():
        masks[name] = dilate(m & alpha, 5) & grow

    masks["hairBack"] = dilate(
        circle_mask(size, (J["HeadAnchor"][0] - 18 * s, J["HeadAnchor"][1] + 8 * s), R(132)) & alpha, 3
    )
    masks["hairFront"] = dilate(
        circle_mask(size, (J["HeadAnchor"][0] + 6 * s, J["HeadAnchor"][1] - 22 * s), R(102)) & alpha, 2
    ) & masks["head"]

    for parent, child, joint, keep in JOINT_PAIRS:
        keep_c = circle_mask(size, J[joint], R(keep))
        child_core = masks[child] & ~keep_c
        masks[parent] = masks[parent] & ~child_core

    layers = []
    recon = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    for name, spec in PARTS_META.items():
        img, ox, oy = crop_layer(arr, masks[name], pad=8)
        img.save(PARTS / f"{name}.png")
        recon.paste(img, (ox, oy), img)
        px, py = J[spec["pivot"]]
        layers.append(
            {
                "id": name,
                "image": f"parts/{name}.png",
                "parent": spec["parent"],
                "x": round(px, 2),
                "y": round(py, 2),
                "pivotX": round(px - ox, 2),
                "pivotY": round(py - oy, 2),
                "cropX": ox,
                "cropY": oy,
                "width": img.size[0],
                "height": img.size[1],
                "defaultRotation": 0,
                "zIndex": spec["z"],
            }
        )
        print(f"{name:12} {img.size[0]:4}x{img.size[1]:<4} opaque={int(masks[name].sum())}")

    rod_meta = clean_rod(ROD_SRC if ROD_SRC.exists() else OUT_DIR / "rod.png", OUT_DIR / "rod.png")

    debug = Image.alpha_composite(Image.new("RGBA", (w, h), (18, 20, 24, 255)), master)
    draw = ImageDraw.Draw(debug)
    for a, b in [
        ("NeckAnchor", "HeadAnchor"),
        ("Hip", "NeckAnchor"),
        ("ShoulderL", "ShoulderR"),
        ("ShoulderL", "ElbowL"),
        ("ElbowL", "WristL"),
        ("WristL", "RodGrip") if False else ("ShoulderR", "ElbowR"),
        ("ElbowR", "WristR"),
        ("WristR", "RodGrip"),
        ("Hip", "HipL"),
        ("Hip", "HipR"),
        ("HipL", "KneeL"),
        ("KneeL", "AnkleL"),
        ("HipR", "KneeR"),
        ("KneeR", "AnkleR"),
    ]:
        draw.line([J[a], J[b]], fill=(255, 220, 80, 230), width=3)
    draw.line([J["ElbowL"], J["WristL"]], fill=(255, 220, 80, 230), width=3)
    for name, p in J.items():
        col = (80, 220, 255) if "Rod" in name else (255, 70, 70)
        draw.ellipse([p[0] - 6, p[1] - 6, p[0] + 6, p[1] + 6], fill=col)
    DEBUG.mkdir(parents=True, exist_ok=True)
    debug.save(DEBUG / "skeleton-debug.png")
    recon_bg = Image.new("RGBA", (w, h), (22, 24, 28, 255))
    Image.alpha_composite(recon_bg, recon).save(DEBUG / "reconstruct.png")

    bind = {name: bone_angle(J[spec["pivot"]], J[spec["end"]]) for name, spec in PARTS_META.items()}
    bind["hand_L"] = bone_angle(J["WristL"], hand_l)
    bind["hand_R"] = bone_angle(J["WristR"], hand_r)
    bind["foot_L"] = bone_angle(J["AnkleL"], foot_l)
    bind["foot_R"] = bone_angle(J["AnkleR"], foot_r)
    bind["hairBack"] = 0.0
    bind["hairFront"] = 0.0
    bind["pelvis"] = 0.0

    manifest = {
        "id": "adult-male",
        "name": "Adult male fisherman",
        "sourceMaster": "master.png",
        "identityLock": "/scene/forest-lake/char/master.webp",
        "nativeCanvasWidth": w,
        "nativeCanvasHeight": h,
        "baseline": round(max(J["AnkleL"][1], J["AnkleR"][1]) + 48 * s, 2),
        "characterScale": 1,
        "bindPoseAngles": {key: round(val, 2) for key, val in bind.items()},
        "parts": layers,
        "anchors": {key: {"x": round(val[0], 2), "y": round(val[1], 2)} for key, val in J.items()},
        "rod": rod_meta,
        "boneLengths": {
            "upperArm_L": round(math.dist(J["ShoulderL"], J["ElbowL"]), 2),
            "forearm_L": round(math.dist(J["ElbowL"], J["WristL"]), 2),
            "upperArm_R": round(math.dist(J["ShoulderR"], J["ElbowR"]), 2),
            "forearm_R": round(math.dist(J["ElbowR"], J["WristR"]), 2),
        },
    }
    (OUT_DIR / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print("canvas", w, h)


if __name__ == "__main__":
    main()
