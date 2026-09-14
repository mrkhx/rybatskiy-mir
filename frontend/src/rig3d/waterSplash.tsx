"use client";

import { useMemo, useRef, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { SPLASH_LIFE, WATERLINE_Y, type LandingSim } from "./floatLanding";

const DROP_N = 8;

type Props = {
  simRef: MutableRefObject<LandingSim>;
};

/** Cheap contact FX: 2 expanding rings + a handful of droplets. */
export function WaterSplash({ simRef }: Props) {
  const root = useRef<THREE.Group>(null);
  const ringA = useRef<THREE.Mesh>(null);
  const ringB = useRef<THREE.Mesh>(null);
  const drops = useRef<THREE.InstancedMesh>(null);
  const born = useRef(0);
  const dropVel = useMemo(() => {
    const a: THREE.Vector3[] = [];
    for (let i = 0; i < DROP_N; i++) a.push(new THREE.Vector3());
    return a;
  }, []);
  const dropPos = useMemo(() => {
    const a: THREE.Vector3[] = [];
    for (let i = 0; i < DROP_N; i++) a.push(new THREE.Vector3());
    return a;
  }, []);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const lastStamp = useRef(-1);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const g = root.current;
    if (!g) return;
    const sim = simRef.current;
    const stamp = sim.splashStamp;
    if (stamp <= 0) {
      g.visible = false;
      return;
    }
    if (stamp !== lastStamp.current) {
      lastStamp.current = stamp;
      born.current = 0;
      g.position.set(sim.splashX, WATERLINE_Y + 0.004, sim.splashZ);
      for (let i = 0; i < DROP_N; i++) {
        const a = (i / DROP_N) * Math.PI * 2 + 0.2;
        const sp = 0.18 + (i % 3) * 0.05;
        dropPos[i]!.set(Math.cos(a) * 0.012, 0.01, Math.sin(a) * 0.012);
        dropVel[i]!.set(Math.cos(a) * sp, 0.32 + (i % 2) * 0.08, Math.sin(a) * sp);
      }
    }
    born.current += dt;
    const u = born.current / SPLASH_LIFE;
    if (u >= 1) {
      g.visible = false;
      return;
    }
    g.visible = true;
    const fade = 1 - u * u;
    if (ringA.current) {
      const s = 0.05 + u * 0.42;
      ringA.current.scale.set(s, s, s);
      const mat = ringA.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.38 * fade;
    }
    if (ringB.current) {
      const s = 0.03 + u * 0.28;
      ringB.current.scale.set(s, s, s);
      const mat = ringB.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.28 * fade;
    }
    const mesh = drops.current;
    if (mesh) {
      for (let i = 0; i < DROP_N; i++) {
        dropVel[i]!.y -= 9.5 * dt;
        dropPos[i]!.addScaledVector(dropVel[i]!, dt);
        if (dropPos[i]!.y < 0) {
          dropPos[i]!.y = 0;
          dropVel[i]!.y = 0;
          dropVel[i]!.x *= 0.8;
          dropVel[i]!.z *= 0.8;
        }
        dummy.position.copy(dropPos[i]!);
        const sc = 0.012 * fade;
        dummy.scale.setScalar(sc);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
      const mat = mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.55 * fade;
    }
  });

  return (
    <group ref={root} visible={false} name="WaterSplash">
      <mesh ref={ringA} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.9, 1, 24]} />
        <meshBasicMaterial color="#d7ecec" transparent opacity={0} depthWrite={false} />
      </mesh>
      <mesh ref={ringB} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, 0]}>
        <ringGeometry args={[0.88, 1, 24]} />
        <meshBasicMaterial color="#b7d4d6" transparent opacity={0} depthWrite={false} />
      </mesh>
      <instancedMesh ref={drops} args={[undefined, undefined, DROP_N]}>
        <sphereGeometry args={[1, 6, 6]} />
        <meshBasicMaterial color="#e7f4f4" transparent opacity={0} depthWrite={false} />
      </instancedMesh>
    </group>
  );
}
