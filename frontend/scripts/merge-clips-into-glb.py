#!/usr/bin/env python3
"""Copy animation clips from a baked GLB into the original production fisherman GLB.

Mesh / skins / images / accessors already in the dest file are left untouched.
Channels are remapped by node name.
"""
import json
import struct
import sys
from pathlib import Path


def read_glb(path: Path):
    data = path.read_bytes()
    off = 12
    gltf = None
    blob = b""
    while off < len(data):
        clen, ctype = struct.unpack_from("<I4s", data, off)
        off += 8
        chunk = data[off : off + clen]
        off += clen
        if ctype[:4] == b"JSON":
            gltf = json.loads(chunk)
        elif ctype[:4] == b"BIN\x00":
            blob = chunk
    return gltf, bytearray(blob)


def write_glb(path: Path, gltf: dict, blob: bytes):
    js = json.dumps(gltf, separators=(",", ":")).encode("utf-8")
    js += b" " * ((4 - len(js) % 4) % 4)
    blob = bytes(blob)
    pad = (4 - len(blob) % 4) % 4
    blob += b"\x00" * pad
    total = 12 + 8 + len(js) + 8 + len(blob)
    out = bytearray()
    out += struct.pack("<4sII", b"glTF", 2, total)
    out += struct.pack("<I4s", len(js), b"JSON")
    out += js
    out += struct.pack("<I4s", len(blob), b"BIN\x00")
    out += blob
    path.write_bytes(out)
    print("wrote", path, len(out), "anims", [a.get("name") for a in gltf.get("animations", [])])


def view_bytes(gltf, blob, index):
    v = gltf["bufferViews"][index]
    start = v.get("byteOffset", 0)
    return bytes(blob[start : start + v["byteLength"]])


def append_view(gltf, blob: bytearray, data: bytes, target=None):
    pad = (4 - len(blob) % 4) % 4
    blob.extend(b"\x00" * pad)
    off = len(blob)
    blob.extend(data)
    view = {"buffer": 0, "byteOffset": off, "byteLength": len(data)}
    if target is not None:
        view["target"] = target
    gltf["bufferViews"].append(view)
    return len(gltf["bufferViews"]) - 1


def main():
    dest_path = Path(sys.argv[1])
    src_path = Path(sys.argv[2])
    dest, dest_bin = read_glb(dest_path)
    src, src_bin = read_glb(src_path)

    dest_nodes = {n.get("name"): i for i, n in enumerate(dest["nodes"]) if n.get("name")}
    src_nodes = src["nodes"]
    print("dest nodes", len(dest_nodes), "src anims", [a.get("name") for a in src.get("animations", [])])

    dest["animations"] = []
    acc_remap = {}

    def copy_accessor(ai: int) -> int:
        if ai in acc_remap:
            return acc_remap[ai]
        acc = dict(src["accessors"][ai])
        view_i = acc["bufferView"]
        raw = view_bytes(src, src_bin, view_i)
        new_view = append_view(dest, dest_bin, raw, src["bufferViews"][view_i].get("target"))
        acc["bufferView"] = new_view
        dest["accessors"].append(acc)
        ni = len(dest["accessors"]) - 1
        acc_remap[ai] = ni
        return ni

    kept = []
    for anim in src.get("animations", []):
        name = anim.get("name") or "clip"
        if name.endswith(".001") or name == "THROWING_REF":
            continue
        samplers = []
        for s in anim.get("samplers", []):
            samplers.append(
                {
                    "input": copy_accessor(s["input"]),
                    "output": copy_accessor(s["output"]),
                    "interpolation": s.get("interpolation", "LINEAR"),
                }
            )
        channels = []
        for ch in anim.get("channels", []):
            src_node = src_nodes[ch["target"]["node"]]
            nname = src_node.get("name")
            if nname not in dest_nodes:
                continue
            channels.append(
                {
                    "sampler": ch["sampler"],
                    "target": {"node": dest_nodes[nname], "path": ch["target"]["path"]},
                }
            )
        if not channels:
            print("skip empty", name)
            continue
        dest["animations"].append({"name": name, "samplers": samplers, "channels": channels})
        kept.append(name)
        print("merged", name, "channels", len(channels))

    dest["buffers"][0]["byteLength"] = len(dest_bin)
    write_glb(dest_path, dest, dest_bin)
    print("kept", kept)


if __name__ == "__main__":
    main()
