import {
  FINGER_ROOTS,
  FISHERMAN_BONES,
  FISHERMAN_CLIPS,
  FISHERMAN_CLIPS_OPTIONAL,
  LIMITS,
  type AdapterReport,
} from "./contract";
import { importHumanoid } from "./retarget";
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

export function inspectFisherman(
  gltf: GltfLike,
  url: string,
  source: "production" | "debug",
  opts?: { retarget?: boolean },
): AdapterReport {
  if (opts?.retarget !== false) importHumanoid(gltf);

  const root = gltf.scene;
  const skins = collectSkinnedMeshes(root);
  const bones = boneNames(root);
  const clips = clipNames(gltf);
  const generator = gltfGenerator(gltf);
  const tris = triangleCount(root);
  const box = worldBox(root);
  const size = box.getSize(box.max.clone());
  const mats = materialFlags(root);
  const boneSet = new Set(bones.map((b) => b.toLowerCase()));
  const clipSet = new Set(clips.map((c) => c.toUpperCase()));

  const missingBones = FISHERMAN_BONES.filter((b) => !boneSet.has(b.toLowerCase()));
  const missingFingers = FINGER_ROOTS.filter(
    (f) => !bones.some((b) => b.toLowerCase().startsWith(f.toLowerCase())),
  );
  const missingClips = FISHERMAN_CLIPS.filter((c) => !clipSet.has(c));
  const missingOptional = FISHERMAN_CLIPS_OPTIONAL.filter((c) => !clipSet.has(c));

  const skinned = skins.length > 0;
  const weighted = skins.some(hasSkinAttributes);
  const height = size.y;
  const depth = Math.min(size.x, size.z);
  const proxy = isForbiddenGenerator(generator) || source === "debug";

  const checks = [
    check("skinnedMesh", skinned, skinned ? `${skins.length} SkinnedMesh` : "no THREE.SkinnedMesh"),
    check("skinWeights", weighted, weighted ? "JOINTS/WEIGHTS present" : "missing skin attributes"),
    check("humanoidBones", missingBones.length === 0, missingBones.length ? `missing ${missingBones.join(", ")}` : "core bones ok"),
    check("fingerBones", missingFingers.length === 0, missingFingers.length ? `missing ${missingFingers.join(", ")}` : "finger roots ok", "warn"),
    check(
      "triangles",
      tris >= LIMITS.fisherman.trisMin && tris <= LIMITS.fisherman.trisMax,
      `${tris} tris (target ${LIMITS.fisherman.trisMin}–${LIMITS.fisherman.trisMax})`,
    ),
    check(
      "height",
      height >= LIMITS.fisherman.heightMin && height <= LIMITS.fisherman.heightMax,
      `height ${height.toFixed(2)} m`,
      "warn",
    ),
    check(
      "volume360",
      depth >= LIMITS.fisherman.depthMin,
      `min horizontal depth ${depth.toFixed(2)} m (card/billboard if tiny)`,
    ),
    check("baseColor", mats.baseColor > 0, mats.baseColor ? `albedo on ${mats.baseColor} mats` : "no baseColor textures"),
    check("normalMap", mats.normal > 0, mats.normal ? `normals on ${mats.normal} mats` : "no normal maps"),
    check("roughnessMap", mats.roughness > 0, mats.roughness ? "ORM/roughness present" : "no roughness/metal maps", "warn"),
    check("idleClip", clipSet.has("IDLE"), clipSet.has("IDLE") ? "IDLE present" : "missing IDLE"),
    check(
      "actionClips",
      missingClips.length === 0,
      missingClips.length ? `missing ${missingClips.join(", ")}` : "required clips ok",
      "warn",
    ),
    check(
      "locomotionClips",
      missingOptional.length === 0,
      missingOptional.length ? `optional missing ${missingOptional.join(", ")}` : "WALK/TURN/STEP present",
      "warn",
    ),
    check(
      "notProxy",
      !proxy,
      proxy ? `not a production asset (${generator || source})` : "generator ok",
    ),
    check("noForbiddenGenerator", !isForbiddenGenerator(generator), generator || "generator empty"),
  ];

  return {
    kind: "fisherman",
    url,
    source,
    pass: passFrom(checks),
    generator,
    triangleCount: tris,
    skinned,
    bones,
    clips,
    checks,
    stats: {
      skinnedMeshes: skins.length,
      height: Number(height.toFixed(3)),
      depth: Number(depth.toFixed(3)),
      materials: mats.count,
      missingBones: missingBones.length,
      missingClips: missingClips.length,
    },
  };
}
