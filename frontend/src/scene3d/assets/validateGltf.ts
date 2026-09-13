import * as THREE from "three";
import { FORBIDDEN_GENERATORS, type ContractCheck } from "./contract";

export type GltfLike = {
  scene: THREE.Object3D;
  animations?: THREE.AnimationClip[];
  parser?: { json?: { asset?: { generator?: string } } };
};

export function gltfGenerator(gltf: GltfLike): string {
  return gltf.parser?.json?.asset?.generator ?? "";
}

export function isForbiddenGenerator(generator: string): boolean {
  const g = generator.toLowerCase();
  return FORBIDDEN_GENERATORS.some((f) => g.includes(f.toLowerCase()));
}

export function collectNodes(root: THREE.Object3D): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  root.traverse((o) => out.push(o));
  return out;
}

export function collectSkinnedMeshes(root: THREE.Object3D): THREE.SkinnedMesh[] {
  const out: THREE.SkinnedMesh[] = [];
  root.traverse((o) => {
    const m = o as THREE.SkinnedMesh;
    if (m.isSkinnedMesh) out.push(m);
  });
  return out;
}

export function triangleCount(root: THREE.Object3D): number {
  let tris = 0;
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh || !mesh.geometry) return;
    const g = mesh.geometry;
    if (g.index) tris += g.index.count / 3;
    else {
      const pos = g.getAttribute("position");
      if (pos) tris += pos.count / 3;
    }
  });
  return Math.round(tris);
}

export function boneNames(root: THREE.Object3D): string[] {
  const names = new Set<string>();
  root.traverse((o) => {
    const m = o as THREE.SkinnedMesh;
    if (m.isSkinnedMesh && m.skeleton) {
      for (const b of m.skeleton.bones) names.add(b.name);
    }
  });
  if (names.size === 0) {
    collectNodes(root).forEach((n) => {
      if (n.name) names.add(n.name);
    });
  }
  return [...names];
}

export function clipNames(gltf: GltfLike): string[] {
  return (gltf.animations ?? []).map((c) => c.name);
}

export function hasSkinAttributes(mesh: THREE.SkinnedMesh): boolean {
  const g = mesh.geometry;
  return Boolean(
    g.getAttribute("skinIndex") ||
      g.getAttribute("skinWeight") ||
      g.getAttribute("JOINTS_0") ||
      g.getAttribute("WEIGHTS_0"),
  );
}

export function worldBox(root: THREE.Object3D): THREE.Box3 {
  root.updateWorldMatrix(true, true);
  return new THREE.Box3().setFromObject(root);
}

export function materialFlags(root: THREE.Object3D) {
  let baseColor = 0;
  let normal = 0;
  let roughness = 0;
  let count = 0;
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const mat of mats) {
      if (!mat) continue;
      count += 1;
      const std = mat as THREE.MeshStandardMaterial;
      if (std.map) baseColor += 1;
      if (std.normalMap) normal += 1;
      if (std.roughnessMap || std.metalnessMap) roughness += 1;
    }
  });
  return { count, baseColor, normal, roughness };
}

export function check(
  id: string,
  ok: boolean,
  detail: string,
  level: ContractCheck["level"] = "fail",
): ContractCheck {
  return { id, ok, level, detail };
}

export function passFrom(checks: ContractCheck[]): boolean {
  return checks.every((c) => c.ok || c.level === "warn");
}
