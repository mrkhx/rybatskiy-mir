"use client";

import { forwardRef, useContext, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { Line2 } from "three/addons/lines/Line2.js";
import { LineGeometry } from "three/addons/lines/LineGeometry.js";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";
import { anchorWorldY, readFloatAnchors } from "./floatAnchors";
import { MotionSpace } from "./motionSpace";
import { RuntimeWaterContext, advanceToWater, castVelocity, sampleBallisticCast } from "./runtimeWater";
import { PRODUCTION } from "../scene3d/assets/paths";
import { worldOf } from "./rodBend";
import { LINE_FLOATS, lineOpacity, lineToLocal, sampleLine } from "./fishingLine";
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
import { sampleHookFloat } from "./hookset";
import { sampleFight } from "./fight";
import { prepFloatWorld, prepLift } from "./landPrep";
import { landFloatWorld } from "./land";
import { keepFloatWorld } from "./keep";
import { holdFloatWorld } from "./landedHold";
import { releaseFloatWorld } from "./release";
import { RETURN_DURATION, returnFloatWorld } from "./returnReady";

useGLTF.preload(PRODUCTION.float);

const _tip = new THREE.Vector3();
const _attach = new THREE.Vector3();
const _keel = new THREE.Vector3();
const _hang = new THREE.Vector3();
const _in = new THREE.Vector3();
const _blank = new THREE.Vector3();
const _worldScale = new THREE.Vector3();
const _rigEnd = new THREE.Vector3();
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
  fishPointRef?: React.MutableRefObject<THREE.Vector3>;
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
    hooking?: boolean;
    fighting?: boolean;
    reeling?: boolean;
    prepping?: boolean;
    outing?: boolean;
    holding?: boolean;
    releasing?: boolean;
    keeping?: boolean;
    returning?: boolean;
    castTimeRef?: React.MutableRefObject<number>;
    biteTimeRef?: React.MutableRefObject<number>;
    hookTimeRef?: React.MutableRefObject<number>;
    fightTimeRef?: React.MutableRefObject<number>;
    prepTimeRef?: React.MutableRefObject<number>;
    outTimeRef?: React.MutableRefObject<number>;
    holdTimeRef?: React.MutableRefObject<number>;
    releaseTimeRef?: React.MutableRefObject<number>;
    keepTimeRef?: React.MutableRefObject<number>;
    returnTimeRef?: React.MutableRefObject<number>;
    approachRef?: React.MutableRefObject<number>;
    fishPointRef?: React.MutableRefObject<THREE.Vector3>;
    simRef?: React.MutableRefObject<LandingSim>;
  }
>(function LakeFloat({ floatOn, wave, active, hanging = false, rod, casting = false, landing = false, waiting = false, biting = false, hooking = false, fighting = false, reeling = false, prepping = false, outing = false, holding = false, releasing = false, keeping = false, returning = false, castTimeRef, biteTimeRef, hookTimeRef, fightTimeRef, prepTimeRef, outTimeRef, holdTimeRef, releaseTimeRef, keepTimeRef, returnTimeRef, approachRef, fishPointRef, simRef }, ref) {
    const water = useContext(RuntimeWaterContext);
    const motion = useMemo(() => new MotionSpace(water?.motionFrame ?? null, water?.waterlineWorldY), [water?.motionFrame, water?.waterlineWorldY]);
    const waterline = water?.waterlineWorldY ?? WATERLINE_Y;
    const previousTarget = useRef<THREE.Vector3 | null>(null);
    const gltf = useGLTF(PRODUCTION.float);
    const root = useMemo(() => {
      const s = gltf.scene.clone(true);
      s.scale.setScalar(FLOAT_SCALE);
      return s;
    }, [gltf.scene]);
    const anchors = useMemo(() => readFloatAnchors(root), [root]);
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
    const calibratedCast = useRef<{ start: THREE.Vector3; velocity: THREE.Vector3; releasedAt: number; duration: number; gravity: number } | null>(null);
    const lastTip = useRef(new THREE.Vector3());
    const biteRest = useRef(new THREE.Vector3());
    const biteArmed = useRef(false);
    const hookRest = useRef(new THREE.Vector3());
    const hookArmed = useRef(false);
    const fightRest = useRef(new THREE.Vector3());
    const fightArmed = useRef(false);
    const prepArmed = useRef(false);
    const outArmed = useRef(false);
    const holdArmed = useRef(false);
    const relArmed = useRef(false);
    const keepArmed = useRef(false);
    const retArmed = useRef(false);

    useFrame((_, rawDt) => {
      if (document.hidden) return;
      const dt = Math.min(rawDt, 0.05);
      clock.current += dt;
      const g = inner.current;
      if (!g) return;
      const show = active && floatOn;
      g.visible = show;
      if (!show) return;
      if (!biting) biteArmed.current = false;
      if (!hooking) hookArmed.current = false;
      if (!fighting && !reeling && !prepping && !outing && !holding && !releasing && !keeping && !returning) fightArmed.current = false;
      if (!prepping) prepArmed.current = false;
      if (!outing) outArmed.current = false;
      if (!holding) holdArmed.current = false;
      if (!releasing) relArmed.current = false;
      if (!keeping) keepArmed.current = false;
      if (!returning) retArmed.current = false;
      const t = clock.current;
      const gparent = g.parent;
      const motionScale = water ? water.motionFrame.getWorldScale(_worldScale).y : 1;
      const keelBelow = water && anchors.bottom ? -anchorWorldY(g, anchors.bottom) : KEEL_BELOW * motionScale;
      const floatRestY = waterline - (water && anchors.waterline ? anchorWorldY(g, anchors.waterline) : 0);
      const gravity = LANDING_GRAVITY * motionScale;
      // Preserve the same photo-water location when cover cropping changes on resize.
      if (water) {
        if (previousTarget.current) {
          _in.copy(water.castTargetWorld).sub(previousTarget.current);
          if (_in.lengthSq() > 0) {
            calibratedCast.current?.start.add(_in);
            for (const point of [fly.current.pos, fly.current.hang, biteRest.current, hookRest.current, fightRest.current]) point.add(_in);
          }
        }
        if (!previousTarget.current) previousTarget.current = water.castTargetWorld.clone();
        else previousTarget.current.copy(water.castTargetWorld);
      }
      const restWorld = (out: THREE.Vector3) => {
        if (water) return out.copy(water.castTargetWorld);
        out.set(FLOAT_X, WATER_Y, 0);
        if (gparent) gparent.localToWorld(out);
        return out;
      };
      if (casting && rod) {
        if (!worldOf(rod, "RodTip", _tip)) worldOf(rod, "LineStart", _tip);
        const ph = sampleCast(castTimeRef?.current ?? 0);
        if (!fly.current.primed) {
          _hang.copy(_tip);
          _hang.y -= PRECAST_HANG_DROP * motionScale;
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
          _hang.y -= PRECAST_HANG_DROP * motionScale;
          _in.set(_tip.x, 0, _tip.z);
          if (_in.lengthSq() > 1e-4) {
            _in.normalize().multiplyScalar(-PRECAST_HANG_IN * motionScale);
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
            if (water) {
              // End the cast just above contact; the existing landing solver continues it.
              _in.copy(water.castTargetWorld);
              _in.y += keelBelow;
              const releasedAt = castTimeRef?.current ?? 0;
              const duration = Math.max(.05, CAST_DURATION - releasedAt);
              castVelocity(fly.current.pos, _in, duration, gravity, fly.current.vel);
              calibratedCast.current = { start: fly.current.pos.clone(), velocity: fly.current.vel.clone(), releasedAt, duration, gravity };
            }
          }
          const flight = calibratedCast.current;
          if (water && flight) {
            sampleBallisticCast(flight.start, flight.velocity, (castTimeRef?.current ?? 0) - flight.releasedAt,
              flight.duration, flight.gravity, fly.current.pos, fly.current.vel);
          } else if ((castTimeRef?.current ?? 0) < CAST_DURATION) {
            fly.current.vel.y -= gravity * dt;
            fly.current.pos.addScaledVector(fly.current.vel, dt);
            if (fly.current.pos.y < waterline + 0.08 * motionScale) {
              fly.current.pos.y = waterline + 0.08 * motionScale;
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
        if (water && calibratedCast.current) {
          // CAST's final callback may run before this child gets its last frame.
          const flight = calibratedCast.current;
          sampleBallisticCast(flight.start, flight.velocity, flight.duration, flight.duration,
            flight.gravity, st.pos, st.vel);
          calibratedCast.current = null;
        }
        if (!st.primed) {
          if (!worldOf(rod, "RodTip", _tip)) worldOf(rod, "LineStart", _tip);
          st.pos.copy(_tip);
          st.pos.y -= PRECAST_HANG_DROP * motionScale;
          st.vel.set(0, -0.4, 0);
          st.primed = true;
          st.on = true;
          st.contact = false;
          st.settleT = 0;
        }
        if (!st.contact) {
          let contacted: boolean;
          if (water) contacted = advanceToWater(st.pos, st.vel, dt, gravity, waterline + keelBelow);
          else {
            st.vel.y -= gravity * dt;
            st.pos.addScaledVector(st.vel, dt);
            contacted = st.pos.y - keelBelow <= waterline;
          }
          if (contacted) {
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
          const dip = -LANDING_DIP * motionScale * Math.sin(dipU * Math.PI) * (1 - 0.45 * u);
          const bob = FLOAT_BOB_AMP * wave * Math.sin(t * FLOAT_BOB_FREQ) * u * motionScale;
          const targetY = floatRestY + dip + bob;
          st.vel.y += (targetY - st.pos.y) * 24 * dt;
          st.vel.y *= Math.exp(-7.2 * dt);
          st.vel.x *= Math.exp(-6.5 * dt);
          st.vel.z *= Math.exp(-6.5 * dt);
          st.pos.addScaledVector(st.vel, dt);
          if (st.pos.y > waterline + 0.035 * motionScale) {
            st.pos.y = waterline + 0.035 * motionScale;
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
        const bob = FLOAT_BOB_AMP * motionScale * wave * Math.sin(t * FLOAT_BOB_FREQ);
        if (st.primed && st.contact) {
          st.pos.y = floatRestY + bob;
          _hang.copy(st.pos);
          if (gparent) gparent.worldToLocal(_hang);
          g.position.copy(_hang);
        } else {
          restWorld(st.pos);
          st.pos.y = floatRestY + bob;
          st.primed = true;
          st.contact = true;
          _hang.copy(st.pos);
          if (gparent) gparent.worldToLocal(_hang);
          g.position.copy(_hang);
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
            restWorld(st.pos);
            st.primed = true;
            st.contact = true;
          }
          biteRest.current.copy(st.pos);
          biteArmed.current = true;
        }
        const b = sampleBiteFloat(biteTimeRef?.current ?? 0);
        const sink = Math.min(1, Math.abs(b.dip) / BITE_SINK_DIP);
        const bob = FLOAT_BOB_AMP * wave * Math.sin(t * FLOAT_BOB_FREQ) * (1 - sink);
        motion.surface(biteRest.current, 0, b.dip + bob, b.side, st.pos);
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
      } else if (hooking) {
        const st = fly.current;
        if (!hookArmed.current) {
          if (!st.primed) {
            restWorld(st.pos);
            st.primed = true;
            st.contact = true;
          }
          hookRest.current.copy(st.pos);
          hookArmed.current = true;
        }
        const h = sampleHookFloat(hookTimeRef?.current ?? 0);
        motion.surface(hookRest.current, h.pull, h.dip, h.side, st.pos);
        _hang.copy(st.pos);
        if (gparent) gparent.worldToLocal(_hang);
        g.position.copy(_hang);
        g.rotation.set(
          FLOAT_TILT_X * wave * Math.sin(t * FLOAT_TILT_X_FREQ) + h.tilt * 0.4,
          0,
          FLOAT_TILT_Z * wave * Math.cos(t * FLOAT_TILT_Z_FREQ) + h.tilt,
        );
        if (simRef) simRef.current.tension = h.tension;
        (window as unknown as { __FLOAT?: { y: number; contact: boolean; settleT: number; phase?: string } }).__FLOAT = {
          y: st.pos.y,
          contact: true,
          settleT: hookTimeRef?.current ?? 0,
          phase: h.phase,
        };
      } else if (fighting || reeling) {
        const st = fly.current;
        if (!fightArmed.current) {
          if (!st.primed) {
            restWorld(st.pos);
            st.primed = true;
            st.contact = true;
          }
          fightRest.current.copy(st.pos);
          fightArmed.current = true;
        }
        const f = sampleFight(fightTimeRef?.current ?? 0);
        const approach = approachRef?.current ?? 0;
        motion.surface(fightRest.current, f.fishX * f.floatFollow - approach * 0.45,
          f.floatDip, f.fishZ * f.floatFollow, st.pos);
        _hang.copy(st.pos);
        if (gparent) gparent.worldToLocal(_hang);
        g.position.copy(_hang);
        g.rotation.set(
          FLOAT_TILT_X * wave * Math.sin(t * FLOAT_TILT_X_FREQ) + 0.12 * f.pull,
          0,
          FLOAT_TILT_Z * wave * Math.cos(t * FLOAT_TILT_Z_FREQ) + 0.16 * f.side,
        );
        if (simRef) simRef.current.tension = f.tension;
        (window as unknown as { __FLOAT?: { y: number; contact: boolean; settleT: number; phase?: string } }).__FLOAT = {
          y: st.pos.y,
          contact: true,
          settleT: fightTimeRef?.current ?? 0,
          phase: f.phase,
        };
      } else if (prepping) {
        const st = fly.current;
        if (!prepArmed.current) {
          if (!st.primed) {
            restWorld(st.pos);
            st.primed = true;
            st.contact = true;
          }
          fightRest.current.copy(st.pos);
          prepArmed.current = true;
        }
        const fish = fishPointRef?.current;
        if (fish) motion.pair(prepFloatWorld, fightRest.current, fish, prepTimeRef?.current ?? 0, st.pos);
        _hang.copy(st.pos);
        if (gparent) gparent.worldToLocal(_hang);
        g.position.copy(_hang);
        const lift = prepLift(prepTimeRef?.current ?? 0);
        g.rotation.set(
          FLOAT_TILT_X * wave * Math.sin(t * FLOAT_TILT_X_FREQ) * (1 - lift) + 0.35 * lift,
          0,
          FLOAT_TILT_Z * wave * Math.cos(t * FLOAT_TILT_Z_FREQ) * (1 - lift),
        );
        if (simRef) simRef.current.tension = 0.7 - 0.08 * lift;
        (window as unknown as { __FLOAT?: { y: number; contact: boolean; settleT: number; phase?: string } }).__FLOAT = {
          y: st.pos.y,
          contact: st.pos.y < waterline + 0.04,
          settleT: prepTimeRef?.current ?? 0,
          phase: lift > 0.02 ? "lift" : "prep",
        };
      } else if (outing) {
        const st = fly.current;
        if (!outArmed.current) {
          if (!st.primed) {
            restWorld(st.pos);
            st.primed = true;
            st.contact = true;
          }
          fightRest.current.copy(st.pos);
          outArmed.current = true;
        }
        const fish = fishPointRef?.current;
        if (fish) motion.pair(landFloatWorld, fightRest.current, fish, outTimeRef?.current ?? 0, st.pos);
        _hang.copy(st.pos);
        if (gparent) gparent.worldToLocal(_hang);
        g.position.copy(_hang);
        g.rotation.set(0.22, 0, 0.04 * Math.sin(t * 3.2));
        if (simRef) simRef.current.tension = 0.55;
        (window as unknown as { __FLOAT?: { y: number; contact: boolean; settleT: number; phase?: string } }).__FLOAT = {
          y: st.pos.y,
          contact: false,
          settleT: outTimeRef?.current ?? 0,
          phase: "land",
        };
      } else if (holding) {
        const st = fly.current;
        if (!holdArmed.current) {
          if (!st.primed) {
            restWorld(st.pos);
            st.primed = true;
            st.contact = false;
          }
          fightRest.current.copy(st.pos);
          holdArmed.current = true;
        }
        const fish = fishPointRef?.current;
        if (fish) motion.pair(holdFloatWorld, fightRest.current, fish, holdTimeRef?.current ?? 0, st.pos);
        _hang.copy(st.pos);
        if (gparent) gparent.worldToLocal(_hang);
        g.position.copy(_hang);
        g.rotation.set(0.2, 0, 0.03 * Math.sin(t * 2.4));
        if (simRef) simRef.current.tension = 0.36;
        (window as unknown as { __FLOAT?: { y: number; contact: boolean; settleT: number; phase?: string } }).__FLOAT = {
          y: st.pos.y,
          contact: false,
          settleT: holdTimeRef?.current ?? 0,
          phase: "hold",
        };
      } else if (releasing) {
        const st = fly.current;
        if (!relArmed.current) {
          if (!st.primed) {
            restWorld(st.pos);
            st.primed = true;
            st.contact = false;
          }
          fightRest.current.copy(st.pos);
          relArmed.current = true;
        }
        const fish = fishPointRef?.current;
        if (fish) motion.pair(releaseFloatWorld, fightRest.current, fish, releaseTimeRef?.current ?? 0, st.pos);
        _hang.copy(st.pos);
        if (gparent) gparent.worldToLocal(_hang);
        g.position.copy(_hang);
        g.rotation.set(0.08 * (1 - Math.min(1, (releaseTimeRef?.current ?? 0) / 1.5)), 0, 0.04 * Math.sin(t * 2.6));
        if (simRef) simRef.current.tension = 0.12;
        (window as unknown as { __FLOAT?: { y: number; contact: boolean; settleT: number; phase?: string } }).__FLOAT = {
          y: st.pos.y,
          contact: st.pos.y < waterline + 0.04,
          settleT: releaseTimeRef?.current ?? 0,
          phase: "release",
        };
      } else if (keeping) {
        const st = fly.current;
        if (!keepArmed.current) {
          if (!st.primed) {
            restWorld(st.pos);
            st.primed = true;
            st.contact = false;
          }
          fightRest.current.copy(st.pos);
          keepArmed.current = true;
        }
        const fish = fishPointRef?.current;
        if (fish) motion.pair(keepFloatWorld, fightRest.current, fish, keepTimeRef?.current ?? 0, st.pos);
        _hang.copy(st.pos);
        if (gparent) gparent.worldToLocal(_hang);
        g.position.copy(_hang);
        g.rotation.set(0.06, 0, 0.03 * Math.sin(t * 2.2));
        if (simRef) simRef.current.tension = 0.12;
        (window as unknown as { __FLOAT?: { y: number; contact: boolean; settleT: number; phase?: string } }).__FLOAT = {
          y: st.pos.y,
          contact: false,
          settleT: keepTimeRef?.current ?? 0,
          phase: "keep",
        };
      } else if (returning) {
        const st = fly.current;
        if (!retArmed.current) {
          if (!st.primed) {
            restWorld(st.pos);
            st.primed = true;
            st.contact = false;
          }
          fightRest.current.copy(st.pos);
          retArmed.current = true;
        }
        if (water) {
          const u = Math.max(0, Math.min(1, (returnTimeRef?.current ?? 0) / RETURN_DURATION));
          _in.copy(water.castTargetWorld);
          _in.y = floatRestY + FLOAT_BOB_AMP * motionScale * wave * Math.sin(t * FLOAT_BOB_FREQ);
          st.pos.lerpVectors(fightRest.current, _in, u * u * (3 - 2 * u));
        } else returnFloatWorld(fightRest.current, returnTimeRef?.current ?? 0, st.pos);
        _hang.copy(st.pos);
        if (gparent) gparent.worldToLocal(_hang);
        g.position.copy(_hang);
        const u = Math.min(1, (returnTimeRef?.current ?? 0) / RETURN_DURATION);
        g.rotation.set(
          0.06 * (1 - u) + (water ? FLOAT_TILT_X * wave * Math.sin(t * FLOAT_TILT_X_FREQ) * u : 0), 0,
          0.03 * (1 - u) * Math.sin(t * 2.2) + (water ? FLOAT_TILT_Z * wave * Math.cos(t * FLOAT_TILT_Z_FREQ) * u : 0),
        );
        if (simRef) simRef.current.tension = 0.05;
        (window as unknown as { __FLOAT?: { y: number; contact: boolean; settleT: number; phase?: string } }).__FLOAT = {
          y: st.pos.y,
          contact: st.pos.y < waterline + 0.05,
          settleT: returnTimeRef?.current ?? 0,
          phase: "return",
        };
      } else {
        calibratedCast.current = null;
        fly.current.primed = false;
        fly.current.on = false;
        fly.current.contact = false;
        if (hanging && rod) {
          if (!worldOf(rod, "RodTip", _tip)) worldOf(rod, "LineStart", _tip);
          _hang.copy(_tip);
          _hang.y -= PRECAST_HANG_DROP * motionScale;
          _in.set(_tip.x, 0, _tip.z);
          if (_in.lengthSq() > 1e-4) {
            _in.normalize().multiplyScalar(-PRECAST_HANG_IN * motionScale);
            _hang.x += _in.x;
            _hang.z += _in.z;
          }
          _hang.x += 0.03 * Math.sin(t * 1.35);
          _hang.z += 0.022 * Math.sin(t * 0.95);
          if (gparent) gparent.worldToLocal(_hang);
          g.position.copy(_hang);
          g.rotation.set(0.06 * Math.sin(t * 0.95), 0, 0.08 * Math.sin(t * 1.35));
        } else {
          restWorld(_hang);
          _hang.y = floatRestY + FLOAT_BOB_AMP * motionScale * wave * Math.sin(t * FLOAT_BOB_FREQ);
          if (gparent) gparent.worldToLocal(_hang);
          g.position.copy(_hang);
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
  fishPointRef,
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

  const leaderPos = useMemo(() => new Float32Array(LINE_FLOATS), []);
  const leader = useMemo(() => {
    const geo = new LineGeometry();
    geo.setPositions(leaderPos);
    const mat = new LineMaterial({
      color: 0x8a7a55,
      linewidth: Math.max(1, LINE_WIDTH_PX * 0.78),
      transparent: true,
      opacity: 0.55,
      dashed: false,
      depthTest: true,
      worldUnits: false,
      toneMapped: false,
    });
    const obj = new Line2(geo, mat);
    obj.frustumCulled = false;
    obj.visible = false;
    return obj;
  }, [leaderPos]);
  const leaderThin = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(leaderPos, 3));
    const m = new THREE.LineBasicMaterial({
      color: 0x8a7a55,
      transparent: true,
      opacity: 0.58,
      depthWrite: false,
    });
    const l = new THREE.Line(g, m);
    l.frustumCulled = false;
    l.visible = false;
    return l;
  }, [leaderPos]);

  const markers = {
    tip: useRef<THREE.Mesh>(null),
    attach: useRef<THREE.Mesh>(null),
    water: useRef<THREE.Mesh>(null),
    bottom: useRef<THREE.Mesh>(null),
    fish: useRef<THREE.Mesh>(null),
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
    if (!show) {
      leader.visible = false;
      leaderThin.visible = false;
      return;
    }

    if (!worldOf(rod, "RodTip", _tip)) worldOf(rod, "LineStart", _tip);
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
    lineToLocal(positions, line.parent);
    (line.geometry as LineGeometry).setPositions(positions);
    const attr = thin.geometry.getAttribute("position") as THREE.BufferAttribute;
    attr.needsUpdate = true;
    thin.geometry.computeBoundingSphere();

    const hasLeader = Boolean(floatG);
    leader.visible = hasLeader;
    leaderThin.visible = hasLeader;
    if (floatG) {
      const bot = floatG?.getObjectByName("FloatBottom");
      if (bot) {
        bot.updateWorldMatrix(true, false);
        _keel.setFromMatrixPosition(bot.matrixWorld);
      } else if (floatG) {
        floatG.updateWorldMatrix(true, false);
        _keel.setFromMatrixPosition(floatG.matrixWorld);
        _keel.y -= 0.075;
      }
      if (fishPointRef) _rigEnd.copy(fishPointRef.current);
      else {
        // Existing hanging leader length, transformed with the float instead of bypassing it.
        _rigEnd.set(0, -.14, 0);
        floatG.localToWorld(_rigEnd);
      }
      sampleLine(_keel, _rigEnd, ten, leaderPos);
      lineToLocal(leaderPos, leader.parent);
      (leader.geometry as LineGeometry).setPositions(leaderPos);
      const lattr = leaderThin.geometry.getAttribute("position") as THREE.BufferAttribute;
      lattr.needsUpdate = true;
      leaderThin.geometry.computeBoundingSphere();
      (leader.material as LineMaterial).resolution.set(size.width, size.height);
      (leader.material as LineMaterial).opacity = lineOpacity(ten) + 0.08;
      (leaderThin.material as THREE.LineBasicMaterial).opacity = lineOpacity(ten) + 0.1;
    }

    const showMarks = debug;
    if (showMarks) {
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
      if (markers.fish.current) markers.fish.current.position.copy(_rigEnd);
      for (const marker of Object.values(markers)) {
        const node = marker.current;
        if (node?.parent) node.parent.worldToLocal(node.position);
      }
    }
  });

  return (
    <>
      <primitive object={line} />
      <primitive object={thin} />
      <primitive object={leader} />
      <primitive object={leaderThin} />
      {debug && active && (
        <group>
          <mesh ref={markers.tip}>
            <sphereGeometry args={[0.014, 8, 8]} />
            <meshBasicMaterial color="#7ec8ff" depthTest={false} />
          </mesh>
          <mesh ref={markers.attach}>
            <sphereGeometry args={[0.012, 8, 8]} />
            <meshBasicMaterial color="#e38b6a" depthTest={false} />
          </mesh>
          <mesh ref={markers.water}>
            <sphereGeometry args={[0.01, 8, 8]} />
            <meshBasicMaterial color="#8dcc9a" depthTest={false} />
          </mesh>
          <mesh ref={markers.bottom}>
            <sphereGeometry args={[0.012, 8, 8]} />
            <meshBasicMaterial color="#c9b896" depthTest={false} />
          </mesh>
          {fishPointRef && (
            <mesh ref={markers.fish}>
              <sphereGeometry args={[0.028, 10, 10]} />
              <meshBasicMaterial color="#7ad0a0" transparent opacity={0.85} depthTest={false} />
            </mesh>
          )}
        </group>
      )}
    </>
  );
}
