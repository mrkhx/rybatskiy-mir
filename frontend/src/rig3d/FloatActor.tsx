"use client";

import { forwardRef, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { Line2 } from "three/addons/lines/Line2.js";
import { LineGeometry } from "three/addons/lines/LineGeometry.js";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";
import { PRODUCTION } from "../scene3d/assets/paths";
import { worldOf } from "./rodBend";
import { LINE_FLOATS, lineOpacity, sampleLine } from "./fishingLine";
import {
  FLOAT_ATTACH_LOCAL,
  FLOAT_BOB_AMP,
  FLOAT_BOB_FREQ,
  FLOAT_SCALE,
  FLOAT_TILT_X,
  FLOAT_TILT_X_FREQ,
  FLOAT_TILT_Z,
  FLOAT_TILT_Z_FREQ,
  FLOAT_X,
  LINE_COLOR,
  LINE_WIDTH_PX,
  WATER_COLOR,
  WATER_OPACITY,
  WATER_POS,
  WATER_SIZE,
  WATER_Y,
} from "./approvedTackle";
import { PRECAST_HANG_DROP, PRECAST_HANG_IN } from "./aim";

useGLTF.preload(PRODUCTION.float);

const _tip = new THREE.Vector3();
const _attach = new THREE.Vector3();
const _hang = new THREE.Vector3();
const _in = new THREE.Vector3();

export type TackleProps = {
  rod: THREE.Object3D;
  floatRef: React.RefObject<THREE.Group | null>;
  lineOn: boolean;
  floatOn: boolean;
  tension: number;
  wave: number;
  debug: boolean;
  active: boolean;
};

export const LakeFloat = forwardRef<
  THREE.Group,
  Pick<TackleProps, "floatOn" | "wave" | "active"> & { hanging?: boolean; rod?: THREE.Object3D }
>(function LakeFloat({ floatOn, wave, active, hanging = false, rod }, ref) {
    const gltf = useGLTF(PRODUCTION.float);
    const root = useMemo(() => {
      const s = gltf.scene.clone(true);
      s.scale.setScalar(FLOAT_SCALE);
      return s;
    }, [gltf.scene]);
    const inner = useRef<THREE.Group>(null);
    const clock = useRef(0);

    useFrame((_, rawDt) => {
      const dt = Math.min(rawDt, 0.05);
      clock.current += dt;
      const g = inner.current;
      if (!g) return;
      const show = active && floatOn;
      g.visible = show;
      if (!show) return;
      const t = clock.current;
      if (hanging && rod) {
        worldOf(rod, "RodTip", _tip) ?? worldOf(rod, "LineStart", _tip);
        _hang.copy(_tip);
        _hang.y -= PRECAST_HANG_DROP;
        _in.set(_tip.x, 0, _tip.z);
        if (_in.lengthSq() > 1e-4) {
          _in.normalize().multiplyScalar(-PRECAST_HANG_IN);
          _hang.x += _in.x;
          _hang.z += _in.z;
        }
        _hang.x += 0.03 * Math.sin(t * 1.35);
        _hang.z += 0.022 * Math.sin(t * 0.95);
        if (g.parent) g.parent.worldToLocal(_hang);
        g.position.copy(_hang);
        g.rotation.set(0.06 * Math.sin(t * 0.95), 0, 0.08 * Math.sin(t * 1.35));
      } else {
        g.position.set(FLOAT_X, WATER_Y + FLOAT_BOB_AMP * wave * Math.sin(t * FLOAT_BOB_FREQ), 0);
        g.rotation.set(
          FLOAT_TILT_X * wave * Math.sin(t * FLOAT_TILT_X_FREQ),
          0,
          FLOAT_TILT_Z * wave * Math.cos(t * FLOAT_TILT_Z_FREQ),
        );
      }
    });

    return (
      <group
        ref={(n) => {
          inner.current = n;
          if (typeof ref === "function") ref(n);
          else if (ref) ref.current = n;
        }}
        visible={false}
        name="LakeFloat"
      >
        <primitive object={root} />
      </group>
    );
  },
);

export function WaterPlane({ active, floatOn }: { active: boolean; floatOn: boolean }) {
  return (
    <mesh
      visible={active && floatOn}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[WATER_POS.x, WATER_POS.y, WATER_POS.z]}
      receiveShadow={false}
    >
      <planeGeometry args={WATER_SIZE} />
      <meshPhysicalMaterial
        color={WATER_COLOR}
        roughness={0.2}
        metalness={0.06}
        transparent
        opacity={WATER_OPACITY}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

export function FishingLineView({
  rod,
  floatRef,
  lineOn,
  tension,
  debug,
  active,
}: TackleProps) {
  const size = useThree((s) => s.size);
  const positions = useMemo(() => new Float32Array(LINE_FLOATS), []);
  const line = useMemo(() => {
    const geo = new LineGeometry();
    geo.setPositions(positions);
    const mat = new LineMaterial({
      color: LINE_COLOR,
      linewidth: LINE_WIDTH_PX,
      transparent: true,
      opacity: 0.5,
      dashed: false,
      depthTest: true,
      worldUnits: false,
      toneMapped: false,
    });
    const obj = new Line2(geo, mat);
    obj.frustumCulled = false;
    obj.visible = false;
    return obj;
  }, [positions]);
  const thin = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const m = new THREE.LineBasicMaterial({
      color: LINE_COLOR,
      transparent: true,
      opacity: 0.52,
      depthWrite: false,
    });
    const l = new THREE.Line(g, m);
    l.frustumCulled = false;
    l.visible = false;
    return l;
  }, [positions]);

  const markers = {
    tip: useRef<THREE.Mesh>(null),
    attach: useRef<THREE.Mesh>(null),
    water: useRef<THREE.Mesh>(null),
    bottom: useRef<THREE.Mesh>(null),
  };

  useFrame(() => {
    const show = active && lineOn;
    line.visible = show;
    thin.visible = show;
    const mat = line.material as LineMaterial;
    mat.resolution.set(size.width, size.height);
    mat.opacity = lineOpacity(tension);
    (thin.material as THREE.LineBasicMaterial).opacity = lineOpacity(tension);
    if (!show) return;

    worldOf(rod, "RodTip", _tip) ?? worldOf(rod, "LineStart", _tip);
    const floatG = floatRef.current;
    const attachNode = floatG?.getObjectByName("FloatAttach");
    if (attachNode) {
      attachNode.updateWorldMatrix(true, false);
      _attach.setFromMatrixPosition(attachNode.matrixWorld);
    } else if (floatG) {
      _attach.copy(FLOAT_ATTACH_LOCAL);
      floatG.localToWorld(_attach);
    }
    sampleLine(_tip, _attach, tension, positions);
    (line.geometry as LineGeometry).setPositions(positions);
    const attr = thin.geometry.getAttribute("position") as THREE.BufferAttribute;
    attr.needsUpdate = true;
    thin.geometry.computeBoundingSphere();

    if (debug) {
      const wl = floatG?.getObjectByName("FloatWaterline");
      const bot = floatG?.getObjectByName("FloatBottom");
      if (markers.tip.current) markers.tip.current.position.copy(_tip);
      if (markers.attach.current) markers.attach.current.position.copy(_attach);
      if (markers.water.current && wl) {
        wl.updateWorldMatrix(true, false);
        markers.water.current.position.setFromMatrixPosition(wl.matrixWorld);
      }
      if (markers.bottom.current && bot) {
        bot.updateWorldMatrix(true, false);
        markers.bottom.current.position.setFromMatrixPosition(bot.matrixWorld);
      }
    }
  });

  return (
    <>
      <primitive object={line} />
      <primitive object={thin} />
      {debug && active && (
        <group>
          <mesh ref={markers.tip}>
            <sphereGeometry args={[0.012, 8, 8]} />
            <meshBasicMaterial color="#7ec8ff" />
          </mesh>
          <mesh ref={markers.attach}>
            <sphereGeometry args={[0.01, 8, 8]} />
            <meshBasicMaterial color="#e38b6a" />
          </mesh>
          <mesh ref={markers.water}>
            <sphereGeometry args={[0.01, 8, 8]} />
            <meshBasicMaterial color="#8dcc9a" />
          </mesh>
          <mesh ref={markers.bottom}>
            <sphereGeometry args={[0.01, 8, 8]} />
            <meshBasicMaterial color="#c9b896" />
          </mesh>
        </group>
      )}
    </>
  );
}
