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
import { CAST_DURATION, sampleCast } from "./cast";
import {
  KEEL_BELOW,
  LANDING_DIP,
  LANDING_FLY_TENSION,
  LANDING_GRAVITY,
  LANDING_REST_TENSION,
  LANDING_SETTLE,
  WATERLINE_Y,
  type LandingSim,
} from "./floatLanding";
import { BITE_SINK_DIP, sampleBiteFloat } from "./bite";

useGLTF.preload(PRODUCTION.float);

const _tip = new THREE.Vector3();
const _attach = new THREE.Vector3();
const _hang = new THREE.Vector3();
const _in = new THREE.Vector3();
const _blank = new THREE.Vector3();
const _qRod = new THREE.Quaternion();

export type TackleProps = {
  rod: THREE.Object3D;
  floatRef: React.RefObject<THREE.Group | null>;
  lineOn: boolean;
  floatOn: boolean;
  tension: number;
  wave: number;
  debug: boolean;
  active: boolean;
  castTimeRef?: React.MutableRefObject<number>;
  landSimRef?: React.MutableRefObject<LandingSim>;
};

export const LakeFloat = forwardRef<
  THREE.Group,
  Pick<TackleProps, "floatOn" | "wave" | "active"> & {
    hanging?: boolean;
    rod?: THREE.Object3D;
    casting?: boolean;
    landing?: boolean;
    waiting?: boolean;
    biting?: boolean;
    castTimeRef?: React.MutableRefObject<number>;
    biteTimeRef?: React.MutableRefObject<number>;
    simRef?: React.MutableRefObject<LandingSim>;
  }
>(function LakeFloat({ floatOn, wave, active, hanging = false, rod, casting = false, landing = false, waiting = false, biting = false, castTimeRef, biteTimeRef, simRef }, ref) {
    const gltf = useGLTF(PRODUCTION.float);
    const root = useMemo(() => {
      const s = gltf.scene.clone(true);
      s.scale.setScalar(FLOAT_SCALE);
      return s;
    }, [gltf.scene]);
    const inner = useRef<THREE.Group>(null);
    const clock = useRef(0);
    const fly = useRef({
      on: false,
      pos: new THREE.Vector3(),
      vel: new THREE.Vector3(),
      hang: new THREE.Vector3(),
      hangVel: new THREE.Vector3(),
      primed: false,
      contact: false,
      settleT: 0,
    });
    const lastTip = useRef(new THREE.Vector3());
    const biteRest = useRef(new THREE.Vector3());
    const biteArmed = useRef(false);

    useFrame((_, rawDt) => {
      const dt = Math.min(rawDt, 0.05);
      clock.current += dt;
      const g = inner.current;
      if (!g) return;
      const show = active && floatOn;
      g.visible = show;
      if (!show) return;
      if (!biting) biteArmed.current = false;
      const t = clock.current;
      const gparent = g.parent;
      if (casting && rod) {
        worldOf(rod, "RodTip", _tip) ?? worldOf(rod, "LineStart", _tip);
        const ph = sampleCast(castTimeRef?.current ?? 0);
        if (!fly.current.primed) {
          _hang.copy(_tip);
          _hang.y -= PRECAST_HANG_DROP;
          fly.current.hang.copy(_hang);
          fly.current.pos.copy(_hang);
          fly.current.hangVel.set(0, 0, 0);
          fly.current.vel.set(0, 0, 0);
          fly.current.on = false;
          fly.current.primed = true;
          fly.current.contact = false;
          fly.current.settleT = 0;
          lastTip.current.copy(_tip);
        }
        if (!ph.released) {
          fly.current.on = false;
          _hang.copy(_tip);
          _hang.y -= PRECAST_HANG_DROP;
          _in.set(_tip.x, 0, _tip.z);
          if (_in.lengthSq() > 1e-4) {
            _in.normalize().multiplyScalar(-PRECAST_HANG_IN);
            _hang.add(_in);
          }
          const k = ph.phase === "forward" ? 18 : 10;
          _in.copy(_hang).sub(fly.current.hang);
          fly.current.hangVel.addScaledVector(_in, k * dt);
          fly.current.hangVel.multiplyScalar(Math.exp(-5.5 * dt));
          fly.current.hang.addScaledVector(fly.current.hangVel, dt);
          fly.current.pos.copy(fly.current.hang);
          lastTip.current.copy(_tip);
        } else {
          if (!fly.current.on) {
            fly.current.on = true;
            _blank.subVectors(_tip, lastTip.current).multiplyScalar(1 / Math.max(dt, 1 / 60));
            fly.current.vel.copy(fly.current.hangVel).addScaledVector(_blank, 0.35);
            _blank.set(0, 1, 0).applyQuaternion(rod.getWorldQuaternion(_qRod));
            fly.current.vel.x += _blank.x * 5.8;
            fly.current.vel.z += _blank.z * 5.8;
            fly.current.vel.y += _blank.y * 0.55 + 0.08;
            fly.current.pos.copy(fly.current.hang);
          }
          if ((castTimeRef?.current ?? 0) < CAST_DURATION) {
            fly.current.vel.y -= 13.5 * dt;
            fly.current.pos.addScaledVector(fly.current.vel, dt);
            if (fly.current.pos.y < 0.08) {
              fly.current.pos.y = 0.08;
              fly.current.vel.y = Math.max(0, fly.current.vel.y);
              fly.current.vel.x *= 0.97;
              fly.current.vel.z *= 0.97;
            }
          }
        }
        _hang.copy(fly.current.pos);
        if (gparent) gparent.worldToLocal(_hang);
        g.position.copy(_hang);
        g.rotation.set(0.05 * Math.sin(t * 2.2), 0, 0.08 * Math.sin(t * 1.8));
      } else if (landing && rod) {
        const st = fly.current;
        if (!st.primed) {
          worldOf(rod, "RodTip", _tip) ?? worldOf(rod, "LineStart", _tip);
          st.pos.copy(_tip);
          st.pos.y -= PRECAST_HANG_DROP;
          st.vel.set(0, -0.4, 0);
          st.primed = true;
          st.on = true;
          st.contact = false;
          st.settleT = 0;
        }
        if (!st.contact) {
          st.vel.y -= LANDING_GRAVITY * dt;
          st.pos.addScaledVector(st.vel, dt);
          if (st.pos.y - KEEL_BELOW <= WATERLINE_Y) {
            st.contact = true;
            st.settleT = 0;
            st.vel.y = Math.min(st.vel.y, 0) * 0.14 - 0.28;
            st.vel.x *= 0.42;
            st.vel.z *= 0.42;
            if (simRef) {
              _hang.copy(st.pos);
              if (gparent) gparent.worldToLocal(_hang);
              simRef.current.splashStamp += 1;
              simRef.current.splashX = _hang.x;
              simRef.current.splashZ = _hang.z;
            }
          }
          if (simRef) simRef.current.tension = LANDING_FLY_TENSION;
          g.rotation.set(0.05 * Math.sin(t * 2.2), 0, 0.08 * Math.sin(t * 1.8));
        } else {
          st.settleT += dt;
          const u = Math.max(0, Math.min(1, st.settleT / LANDING_SETTLE));
          const dipU = Math.max(0, Math.min(1, st.settleT / 0.3));
          const dip = -LANDING_DIP * Math.sin(dipU * Math.PI) * (1 - 0.45 * u);
          const bob = FLOAT_BOB_AMP * wave * Math.sin(t * FLOAT_BOB_FREQ) * u;
          const targetY = WATERLINE_Y + dip + bob;
          st.vel.y += (targetY - st.pos.y) * 24 * dt;
          st.vel.y *= Math.exp(-7.2 * dt);
          st.vel.x *= Math.exp(-6.5 * dt);
          st.vel.z *= Math.exp(-6.5 * dt);
          st.pos.addScaledVector(st.vel, dt);
          if (st.pos.y > WATERLINE_Y + 0.035) {
            st.pos.y = WATERLINE_Y + 0.035;
            if (st.vel.y > 0) st.vel.y *= 0.15;
          }
          const tiltX = FLOAT_TILT_X * wave * Math.sin(t * FLOAT_TILT_X_FREQ);
          const tiltZ = FLOAT_TILT_Z * wave * Math.cos(t * FLOAT_TILT_Z_FREQ);
          g.rotation.set(
            0.05 * Math.sin(t * 2.2) * (1 - u) + tiltX * u,
            0,
            0.08 * Math.sin(t * 1.8) * (1 - u) + tiltZ * u,
          );
          if (simRef) {
            const s = u * u * (3 - 2 * u);
            simRef.current.tension = LANDING_FLY_TENSION + (LANDING_REST_TENSION - LANDING_FLY_TENSION) * s;
          }
        }
        _hang.copy(st.pos);
        if (gparent) gparent.worldToLocal(_hang);
        g.position.copy(_hang);
        (window as unknown as { __FLOAT?: { y: number; contact: boolean; settleT: number } }).__FLOAT = {
          y: st.pos.y,
          contact: st.contact,
          settleT: st.settleT,
        };
      } else if (waiting) {
        const st = fly.current;
        const bob = FLOAT_BOB_AMP * wave * Math.sin(t * FLOAT_BOB_FREQ);
        if (st.primed && st.contact) {
          st.pos.y = WATERLINE_Y + bob;
          _hang.copy(st.pos);
          if (gparent) gparent.worldToLocal(_hang);
          g.position.copy(_hang);
        } else {
          g.position.set(FLOAT_X, WATER_Y + bob, 0);
        }
        g.rotation.set(
          FLOAT_TILT_X * wave * Math.sin(t * FLOAT_TILT_X_FREQ),
          0,
          FLOAT_TILT_Z * wave * Math.cos(t * FLOAT_TILT_Z_FREQ),
        );
        if (simRef) simRef.current.tension = LANDING_REST_TENSION;
      } else if (biting) {
        const st = fly.current;
        if (!biteArmed.current) {
          if (!st.primed) {
            st.pos.set(FLOAT_X, WATERLINE_Y, 0);
            st.primed = true;
            st.contact = true;
          }
          biteRest.current.copy(st.pos);
          biteArmed.current = true;
        }
        const b = sampleBiteFloat(biteTimeRef?.current ?? 0);
        const sink = Math.min(1, Math.abs(b.dip) / BITE_SINK_DIP);
        const bob = FLOAT_BOB_AMP * wave * Math.sin(t * FLOAT_BOB_FREQ) * (1 - sink);
        st.pos.set(biteRest.current.x, WATERLINE_Y + b.dip + bob, biteRest.current.z + b.side);
        _hang.copy(st.pos);
        if (gparent) gparent.worldToLocal(_hang);
        g.position.copy(_hang);
        g.rotation.set(
          FLOAT_TILT_X * wave * Math.sin(t * FLOAT_TILT_X_FREQ) + b.tilt * 0.35,
          0,
          FLOAT_TILT_Z * wave * Math.cos(t * FLOAT_TILT_Z_FREQ) + b.tilt,
        );
        if (simRef) simRef.current.tension = b.tension;
        (window as unknown as { __FLOAT?: { y: number; contact: boolean; settleT: number; phase?: string } }).__FLOAT = {
          y: st.pos.y,
          contact: true,
          settleT: biteTimeRef?.current ?? 0,
          phase: b.phase,
        };
      } else {
        fly.current.primed = false;
        fly.current.on = false;
        fly.current.contact = false;
        fly.current.primed = false;
        fly.current.on = false;
        fly.current.contact = false;
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
          if (gparent) gparent.worldToLocal(_hang);
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
  castTimeRef,
  landSimRef,
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
    const ten = landSimRef
      ? landSimRef.current.tension
      : castTimeRef
        ? sampleCast(castTimeRef.current).tension
        : tension;
    mat.opacity = lineOpacity(ten);
    (thin.material as THREE.LineBasicMaterial).opacity = lineOpacity(ten);
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
    sampleLine(_tip, _attach, ten, positions);
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
