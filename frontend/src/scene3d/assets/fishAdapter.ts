import { LIMITS, PIKE_BONES, PIKE_CLIPS, type AdapterReport } from "./contract";
import {
  boneNames,
  check,
  clipNames,
  collectSkinnedMeshes,
  type GltfLike,
  gltfGenerator,
  hasSkinAttributes,
  isForbiddenGenerator,
  materialFlags,
  passFrom,
  triangleCount,
  worldBox,
} from "./validateGltf";

export function inspectPike(
  gltf: GltfLike,
  url: string,
  source: "production" | "debug",
): AdapterReport {
  const root = gltf.scene;
  const skins = collectSkinnedMeshes(root);
  const bones = boneNames(root);
  const clips = clipNames(gltf);
  const generator = gltfGenerator(gltf);
  const tris = triangleCount(root);
  const box = worldBox(root);
  const size = box.getSize(box.max.clone());
  const length = Math.max(size.x, size.y, size.z);
  const depth = Math.min(size.x, size.y, size.z);
  const mats = materialFlags(root);
  const boneSet = new Set(bones.map((b) => b.toLowerCase()));
  const clipSet = new Set(clips.map((c) => c.toUpperCase()));
  const missingBones = PIKE_BONES.filter((b) => {
    if (b === "Spine_0") return !bones.some((n) => /^spine[_-]?\d/i.test(n));
    return !boneSet.has(b.toLowerCase());
  });
  const missingClips = PIKE_CLIPS.filter((c) => !clipSet.has(c));
  const proxy = isForbiddenGenerator(generator) || source === "debug";
  const skinned = skins.length > 0;

  const checks = [
    check("skinnedMesh", skinned, skinned ? `${skins.length} SkinnedMesh` : "no THREE.SkinnedMesh"),
    check("skinWeights", skins.some(hasSkinAttributes), "skin attributes"),
    check("spine", missingBones.filter((b) => b.startsWith("Spine") || b === "PikeRoot").length === 0, "spine chain"),
    check("tail", bones.some((b) => /tail/i.test(b)), bones.some((b) => /tail/i.test(b)) ? "Tail" : "missing Tail"),
    check("fins", ["Pectoral_L", "Pectoral_R", "Dorsal"].every((n) => boneSet.has(n.toLowerCase())), "fin bones", "warn"),
    check(
      "triangles",
      tris >= LIMITS.pike.trisMin && tris <= LIMITS.pike.trisMax,
      `${tris} tris (target ${LIMITS.pike.trisMin}–${LIMITS.pike.trisMax})`,
    ),
    check("volume360", depth >= 0.04, `min axis ${depth.toFixed(3)} m (flat card if tiny)`),
    check("clips", missingClips.length === 0, missingClips.length ? `missing ${missingClips.join(", ")}` : "fish clips ok"),
    check("albedo", mats.baseColor > 0, "baseColor", "warn"),
    check("notProxy", !proxy, proxy ? `not a production asset (${generator || source})` : "generator ok"),
    check("noForbiddenGenerator", !isForbiddenGenerator(generator), generator || "generator empty"),
  ];

  return {
    kind: "pike",
    url,
    source,
    pass: passFrom(checks),
    generator,
    triangleCount: tris,
    skinned,
    bones,
    clips,
    checks,
    stats: { length: Number(length.toFixed(3)), missingBones: missingBones.length, missingClips: missingClips.length },
  };
}
