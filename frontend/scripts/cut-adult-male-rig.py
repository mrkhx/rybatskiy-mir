#!/usr/bin/env python3
"""Cut A-pose master into cropped 2.5D rig layers + manifest.

Seam pass: large painted sockets, subtract only the far limb core so the
torso does not keep a ghost A-pose sleeve, then bake REAL pixels through
the working rotation arc so shoulders/elbows do not open holes.
"""
from __future__ import annotations

import json
import math
import shutil
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path("/workspace")
MASTER = ROOT / "artifacts/char-rig/master-a-pose.png"
ROD_POLISH = ROOT / "artifacts/char-rig/rod-polish.png"
ROD_SRC = ROOT / "artifacts/char-rig/rod.png"
OUT_DIR = ROOT / "public/characters/adult-male"
PARTS = OUT_DIR / "parts"
DEBUG = ROOT / "artifacts/char-rig"
SCALE = 0.5

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

# Left arm in front of torso AND rod so the support fist reads as a hold.
PARTS_META = {
    "pelvis": {"parent": "root", "pivot": "Hip", "z": 20, "end": "Hip"},
    "torso": {"parent": "pelvis", "pivot": "Hip", "z": 30, "end": "NeckAnchor"},
    "head": {"parent": "torso", "pivot": "NeckAnchor", "z": 50, "end": "HeadAnchor"},
    "hairBack": {"parent": "head", "pivot": "HeadAnchor", "z": 8, "end": "HeadAnchor"},
    "hairFront": {"parent": "head", "pivot": "HeadAnchor", "z": 55, "end": "HeadAnchor"},
    "upperArm_R": {"parent": "torso", "pivot": "ShoulderR", "z": 40, "end": "ElbowR"},
    "forearm_R": {"parent": "upperArm_R", "pivot": "ElbowR", "z": 41, "end": "WristR"},
    "hand_R": {"parent": "forearm_R", "pivot": "WristR", "z": 42, "end": "RodGrip"},
    "upperArm_L": {"parent": "torso", "pivot": "ShoulderL", "z": 46, "end": "ElbowL"},
    "forearm_L": {"parent": "upperArm_L", "pivot": "ElbowL", "z": 47, "end": "WristL"},
    "hand_L": {"parent": "forearm_L", "pivot": "WristL", "z": 48, "end": "WristL"},
    "thigh_L": {"parent": "pelvis", "pivot": "HipL", "z": 18, "end": "KneeL"},
    "shin_L": {"parent": "thigh_L", "pivot": "KneeL", "z": 17, "end": "AnkleL"},
    "foot_L": {"parent": "shin_L", "pivot": "AnkleL", "z": 16, "end": "AnkleL"},
    "thigh_R": {"parent": "pelvis", "pivot": "HipR", "z": 19, "end": "KneeR"},
    "shin_R": {"parent": "thigh_R", "pivot": "KneeR", "z": 18, "end": "AnkleR"},
    "foot_R": {"parent": "shin_R", "pivot": "AnkleR", "z": 17, "end": "AnkleR"},
}

# keep radius = painted socket on BOTH parent and child.
JOINT_PAIRS = [
    ("torso", "head", "NeckAnchor", 60),
    ("torso", "upperArm_L", "ShoulderL", 118),
    ("torso", "upperArm_R", "ShoulderR", 118),
    ("pelvis", "torso", "Hip", 90),
    ("pelvis", "thigh_L", "HipL", 62),
    ("pelvis", "thigh_R", "HipR", 62),
    ("upperArm_L", "forearm_L", "ElbowL", 62),
    ("forearm_L", "hand_L", "WristL", 44),
    ("upperArm_R", "forearm_R", "ElbowR", 62),
    ("forearm_R", "hand_R", "WristR", 44),
    ("thigh_L", "shin_L", "KneeL", 48),
    ("shin_L", "foot_L", "AnkleL", 40),
    ("thigh_R", "shin_R", "KneeR", 48),
    ("shin_R", "foot_R", "AnkleR", 40),
]

SMEAR_FOR = {
    "torso": [("ShoulderL", 118), ("ShoulderR", 118), ("NeckAnchor", 52), ("Hip", 74)],
    "upperArm_L": [("ShoulderL", 96), ("ElbowL", 64)],
    "upperArm_R": [("ShoulderR", 96), ("ElbowR", 64)],
    "forearm_L": [("ElbowL", 62), ("WristL", 44)],
    "forearm_R": [("ElbowR", 62), ("WristR", 44)],
    "hand_L": [("WristL", 40)],
    "hand_R": [("WristR", 40)],
    "pelvis": [("Hip", 74), ("HipL", 54), ("HipR", 54)],
    "thigh_L": [("HipL", 56), ("KneeL", 48)],
    "thigh_R": [("HipR", 56), ("KneeR", 48)],
    "shin_L": [("KneeL", 48), ("AnkleL", 38)],
    "shin_R": [("KneeR", 48), ("AnkleR", 38)],
    "head": [("NeckAnchor", 52)],
}


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


def smear_out(arr: np.ndarray, mask: np.ndarray, zone: np.ndarray, steps: int = 12):
    """Grow mask inside zone; fill new pixels from 8-neighbors (hidden joint meat)."""
    ys, xs = np.where(zone)
    if len(xs) == 0:
        return arr, mask
    pad = steps + 2
    x0, x1 = max(0, int(xs.min()) - pad), min(arr.shape[1], int(xs.max()) + pad + 1)
    y0, y1 = max(0, int(ys.min()) - pad), min(arr.shape[0], int(ys.max()) + pad + 1)
    rgba = arr[y0:y1, x0:x1].copy()
    m = mask[y0:y1, x0:x1].copy()
    z = zone[y0:y1, x0:x1]
    h, w = m.shape
    shifts = ((-1, 0), (1, 0), (0, -1), (0, 1), (-1, -1), (-1, 1), (1, -1), (1, 1))
    for _ in range(steps):
        dil = dilate(m, 1) & z
        new = dil & ~m
        if not new.any():
            break
        acc = np.zeros((h, w, 4), dtype=np.float32)
        cnt = np.zeros((h, w), dtype=np.float32)
        for dy, dx in shifts:
            src = np.roll(np.roll(rgba, dy, 0), dx, 1)
            sm = np.roll(np.roll(m, dy, 0), dx, 1)
            if dy < 0:
                sm[: -dy] = False
            if dy > 0:
                sm[-dy:] = False
            if dx < 0:
                sm[:, : -dx] = False
            if dx > 0:
                sm[:, -dx:] = False
            acc += src * sm[..., None]
            cnt += sm
        fill = (cnt > 0) & new
        if fill.any():
            rgba[fill] = (acc[fill] / cnt[fill, None]).astype(np.uint8)
            rgba[fill, 3] = np.maximum(rgba[fill, 3], 220)
        m = m | new
    out_arr = arr.copy()
    out_m = mask.copy()
    out_arr[y0:y1, x0:x1] = rgba
    out_m[y0:y1, x0:x1] = m
    return out_arr, out_m


def bake_volume(
    arr: np.ndarray,
    src_mask: np.ndarray,
    dest_mask: np.ndarray,
    center,
    angles: list[float],
    radius: int,
):
    """Stamp src pixels rotated around center into dest, clipped to a joint disk.

    Crops to the joint neighbourhood so we do not rotate the full canvas.
    """
    h, w = dest_mask.shape
    cx, cy = int(round(center[0])), int(round(center[1]))
    r = int(radius) + 2
    x0, y0 = max(0, cx - r), max(0, cy - r)
    x1, y1 = min(w, cx + r + 1), min(h, cy + r + 1)
    if x1 <= x0 or y1 <= y0:
        return arr, dest_mask

    zone_full = circle_mask((w, h), center, radius)
    out_arr = arr
    out_m = dest_mask.copy()

    src_crop = np.zeros((y1 - y0, x1 - x0, 4), dtype=np.uint8)
    local_src = src_mask[y0:y1, x0:x1]
    src_crop[local_src] = arr[y0:y1, x0:x1][local_src]
    im = Image.fromarray(src_crop, "RGBA")
    lcx, lcy = cx - x0, cy - y0

    for ang in angles:
        if abs(ang) < 0.05:
            rot = src_crop
        else:
            rot = np.array(
                im.rotate(-ang, resample=Image.Resampling.BILINEAR, center=(lcx, lcy), fillcolor=(0, 0, 0, 0))
            )
        vis = (rot[:, :, 3] > 36) & zone_full[y0:y1, x0:x1]
        new = vis & ~out_m[y0:y1, x0:x1]
        if new.any():
            patch = out_arr[y0:y1, x0:x1].copy()
            patch[new] = rot[new]
            if out_arr is arr:
                out_arr = arr.copy()
            out_arr[y0:y1, x0:x1] = patch
            out_m[y0:y1, x0:x1] = out_m[y0:y1, x0:x1] | new
    return out_arr, out_m


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


def polished_rod_meta(dest: Path) -> dict:
    src = ROD_POLISH if ROD_POLISH.exists() else (ROD_SRC if ROD_SRC.exists() else OUT_DIR / "rod.png")
    shutil.copy(src, dest)
    im = Image.open(dest).convert("RGBA")
    w, h = im.size
    a = np.array(im)
    spine = int(np.argmax((a[:, :, 3] > 40).sum(axis=1))) if h else h // 4
    thick = (a[:, :, 3] > 40).sum(axis=0)
    reel_x = int(np.argmax(thick))
    grip_x = max(80, reel_x - 90)
    blank = max(1, w - grip_x)
    return {
        "image": "rod.png",
        "parent": "hand_R",
        "gripAnchor": "RodGrip",
        "supportAnchor": "RodSupportTarget",
        "width": w,
        "height": h,
        "pivotX": grip_x,
        "pivotY": spine,
        "reelX": reel_x,
        "reelY": min(h - 8, spine + 58),
        "supportX": grip_x + int(blank * 0.62),
        "supportY": spine,
        "tipX": w - 18,
        "tipY": spine,
        "lineStartX": w - 28,
        "lineStartY": spine,
        "length": blank,
        "scale": 0.78,
        "defaultRotation": -8,
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
        "head": circle_mask(size, J["HeadAnchor"], R(198)) | C(J["HeadAnchor"], J["NeckAnchor"], 92, 8, 10),
        "torso": C(J["NeckAnchor"], J["Hip"], 168, 12, 16)
        | C(J["ShoulderL"], J["ShoulderR"], 118, 10, 10)
        | circle_mask(size, J["Hip"], R(118))
        | circle_mask(size, J["ShoulderL"], R(112))
        | circle_mask(size, J["ShoulderR"], R(112))
        | circle_mask(size, (J["ShoulderL"][0] + 36 * s, J["ShoulderL"][1] + 84 * s), R(88))
        | circle_mask(size, (J["ShoulderR"][0] - 36 * s, J["ShoulderR"][1] + 84 * s), R(88)),
        "pelvis": circle_mask(size, J["Hip"], R(128))
        | C(J["HipL"], J["HipR"], 108, 8, 8)
        | C(J["Hip"], (J["Hip"][0], J["Hip"][1] + 90 * s), 118, 4, 4),
        "upperArm_L": C(J["ShoulderL"], J["ElbowL"], 64, 52, 38)
        | circle_mask(size, J["ShoulderL"], R(96))
        | circle_mask(size, J["ElbowL"], R(62)),
        "forearm_L": C(J["ElbowL"], J["WristL"], 54, 40, 18) | circle_mask(size, J["ElbowL"], R(60)),
        "hand_L": circle_mask(size, hand_l, R(52)) | C(J["WristL"], hand_l, 44, 14, 10),
        "upperArm_R": C(J["ShoulderR"], J["ElbowR"], 64, 52, 38)
        | circle_mask(size, J["ShoulderR"], R(96))
        | circle_mask(size, J["ElbowR"], R(62)),
        "forearm_R": C(J["ElbowR"], J["WristR"], 54, 40, 18) | circle_mask(size, J["ElbowR"], R(60)),
        "hand_R": circle_mask(size, hand_r, R(52)) | C(J["WristR"], hand_r, 44, 14, 10),
        "thigh_L": C(J["HipL"], J["KneeL"], 92, 24),
        "shin_L": C(J["KneeL"], J["AnkleL"], 70, 22),
        "foot_L": circle_mask(size, foot_l, R(72)) | C(J["AnkleL"], foot_l, 58, 8),
        "thigh_R": C(J["HipR"], J["KneeR"], 92, 24),
        "shin_R": C(J["KneeR"], J["AnkleR"], 70, 22),
        "foot_R": circle_mask(size, foot_r, R(72)) | C(J["AnkleR"], foot_r, 58, 8),
    }

    masks: dict[str, np.ndarray] = {}
    grow = dilate(alpha, 3)
    for name, m in cap.items():
        masks[name] = dilate(m & alpha, 6) & grow

    masks["hairBack"] = dilate(
        circle_mask(size, (J["HeadAnchor"][0] - 18 * s, J["HeadAnchor"][1] + 8 * s), R(132)) & alpha, 3
    )
    masks["hairFront"] = dilate(
        circle_mask(size, (J["HeadAnchor"][0] + 6 * s, J["HeadAnchor"][1] - 22 * s), R(102)) & alpha, 2
    ) & masks["head"]

    # Socket on parent AND child. Subtract only the child's FAR core so the
    # torso keeps a round shoulder, not a full A-pose ghost sleeve.
    for parent, child, joint, keep in JOINT_PAIRS:
        socket = circle_mask(size, J[joint], R(keep)) & grow
        masks[parent] = masks[parent] | socket
        masks[child] = masks[child] | socket
        if parent == "torso" and child.startswith("upperArm"):
            keep_c = circle_mask(size, J[joint], R(keep + 22))
        else:
            keep_c = circle_mask(size, J[joint], R(keep + 6))
        child_core = masks[child] & ~keep_c
        masks[parent] = masks[parent] & ~child_core

    # Bake a SHORT joint disk of the arm onto the torso (armpit wedge), not the
    # full sleeve — large radius stamps a ghost arm onto the jacket.
    srcs = {name: arr.copy() for name in masks}
    left_arc = list(range(0, -56, -7))
    right_arc = list(range(0, 36, 7))
    elbow_l = list(range(0, 33, 8))
    elbow_r = list(range(-20, 17, 8))

    srcs["torso"], masks["torso"] = bake_volume(
        srcs["torso"], masks["upperArm_L"] | masks["torso"], masks["torso"], J["ShoulderL"], left_arc, R(84)
    )
    srcs["torso"], masks["torso"] = bake_volume(
        srcs["torso"], masks["upperArm_R"] | masks["torso"], masks["torso"], J["ShoulderR"], right_arc, R(84)
    )
    srcs["upperArm_L"], masks["upperArm_L"] = bake_volume(
        srcs["upperArm_L"], masks["torso"], masks["upperArm_L"], J["ShoulderL"], [0, -12, 8], R(86)
    )
    srcs["upperArm_R"], masks["upperArm_R"] = bake_volume(
        srcs["upperArm_R"], masks["torso"], masks["upperArm_R"], J["ShoulderR"], [0, -8, 10], R(86)
    )
    srcs["upperArm_L"], masks["upperArm_L"] = bake_volume(
        srcs["upperArm_L"], masks["forearm_L"], masks["upperArm_L"], J["ElbowL"], elbow_l, R(58)
    )
    srcs["forearm_L"], masks["forearm_L"] = bake_volume(
        srcs["forearm_L"], masks["forearm_L"], masks["forearm_L"], J["ElbowL"], elbow_l, R(56)
    )
    srcs["upperArm_R"], masks["upperArm_R"] = bake_volume(
        srcs["upperArm_R"], masks["forearm_R"], masks["upperArm_R"], J["ElbowR"], elbow_r, R(58)
    )
    srcs["forearm_R"], masks["forearm_R"] = bake_volume(
        srcs["forearm_R"], masks["forearm_R"], masks["forearm_R"], J["ElbowR"], elbow_r, R(56)
    )
    srcs["forearm_L"], masks["forearm_L"] = bake_volume(
        srcs["forearm_L"], masks["hand_L"], masks["forearm_L"], J["WristL"], list(range(-12, 13, 12)), R(44)
    )
    srcs["forearm_R"], masks["forearm_R"] = bake_volume(
        srcs["forearm_R"], masks["hand_R"], masks["forearm_R"], J["WristR"], list(range(-12, 13, 12)), R(44)
    )

    layers = []
    recon = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    for name, spec in PARTS_META.items():
        src = srcs.get(name, arr)
        m = masks[name]
        for jname, rad in SMEAR_FOR.get(name, []):
            zone = circle_mask(size, J[jname], R(rad + 18))
            src, m = smear_out(src, m, zone, steps=14)
        img, ox, oy = crop_layer(src, m, pad=12)
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
        print(f"{name:12} {img.size[0]:4}x{img.size[1]:<4} opaque={int(m.sum())}")

    rod_meta = polished_rod_meta(OUT_DIR / "rod.png")

    debug = Image.alpha_composite(Image.new("RGBA", (w, h), (18, 20, 24, 255)), master)
    draw = ImageDraw.Draw(debug)
    for a, b in [
        ("NeckAnchor", "HeadAnchor"),
        ("Hip", "NeckAnchor"),
        ("ShoulderL", "ShoulderR"),
        ("ShoulderL", "ElbowL"),
        ("ElbowL", "WristL"),
        ("ShoulderR", "ElbowR"),
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
    print("rod", rod_meta["width"], rod_meta["height"], "grip", rod_meta["pivotX"], rod_meta["pivotY"], "scale", rod_meta["scale"])


if __name__ == "__main__":
    main()
