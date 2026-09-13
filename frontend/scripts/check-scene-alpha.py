#!/usr/bin/env python3
"""Fail if foreground scene assets have opaque rectangular edges."""
from __future__ import annotations

import sys
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1] / "public" / "scene" / "forest-lake"
SKIP_FULLBLEED = {"sky.webp", "water.webp", "pier.webp"}
MAX_EDGE = 24.0

def main() -> int:
    failed = []
    for path in sorted(ROOT.rglob("*")):
        if path.suffix.lower() not in {".webp", ".png"}:
            continue
        if path.name in SKIP_FULLBLEED:
            continue
        im = Image.open(path).convert("RGBA")
        a = np.array(im.getchannel("A"))
        edge = np.concatenate([a[0, :], a[-1, :], a[:, 0], a[:, -1]])
        mean = float(edge.mean())
        if mean > MAX_EDGE:
            failed.append(f"{path.relative_to(ROOT)} edge_alpha={mean:.1f}")
            print("FAIL", path.relative_to(ROOT), f"edge_alpha={mean:.1f}")
        else:
            print("ok  ", path.relative_to(ROOT), f"edge_alpha={mean:.1f}")
    if failed:
        print(f"\n{len(failed)} asset(s) have visible bounding-box edges")
        return 1
    print("alpha check passed")
    return 0

if __name__ == "__main__":
    sys.exit(main())
