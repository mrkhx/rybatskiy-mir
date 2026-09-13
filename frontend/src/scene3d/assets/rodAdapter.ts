import { LIMITS, ROD_NODES, type AdapterReport } from "./contract";
import {
  boneNames,
  check,
  collectSkinnedMeshes,
  type GltfLike,
  gltfGenerator,
  isForbiddenGenerator,
  passFrom,
  triangleCount,
  worldBox,
} from "./validateGltf";

export function inspectRod(
  gltf: GltfLike,
  url: string,
  source: "production" | "debug",
): AdapterReport {
  const root = gltf.scene;
  const names = new Set<string>();
  root.traverse((o) => {
    if (o.name) names.add(o.name);
  });
  const missing = ROD_NODES.filter((n) => !names.has(n));
  const skins = collectSkinnedMeshes(root);
  const generator = gltfGenerator(gltf);
  const tris = triangleCount(root);
  const box = worldBox(root);
  const size = box.getSize(box.max.clone());
  const length = Math.max(size.x, size.y, size.z);
  const proxy = isForbiddenGenerator(generator) || source === "debug";

  const checks = [
    check("rodGrip", names.has("RodGrip"), names.has("RodGrip") ? "RodGrip" : "missing RodGrip"),
    check("rodTip", names.has("RodTip"), names.has("RodTip") ? "RodTip" : "missing RodTip"),
    check("reel", names.has("Reel"), names.has("Reel") ? "Reel" : "missing Reel"),
    check("reelHandle", names.has("ReelHandle"), names.has("ReelHandle") ? "ReelHandle" : "missing ReelHandle"),
    check(
      "anchors",
      missing.length === 0,
      missing.length ? `missing ${missing.join(", ")}` : "all rod nodes present",
    ),
    check(
      "length",
      length >= LIMITS.rod.lengthMin && length <= LIMITS.rod.lengthMax,
      `length ${length.toFixed(2)} m`,
      "warn",
    ),
    check("triangles", tris >= LIMITS.rod.trisMin && tris <= LIMITS.rod.trisMax, `${tris} tris`, "warn"),
    check("notProxy", !proxy, proxy ? `not a production asset (${generator || source})` : "generator ok"),
    check("noForbiddenGenerator", !isForbiddenGenerator(generator), generator || "generator empty"),
  ];

  return {
    kind: "rod",
    url,
    source,
    pass: passFrom(checks),
    generator,
    triangleCount: tris,
    skinned: skins.length > 0,
    bones: boneNames(root),
    clips: (gltf.animations ?? []).map((c) => c.name),
    checks,
    stats: { length: Number(length.toFixed(3)), missingNodes: missing.length },
  };
}
