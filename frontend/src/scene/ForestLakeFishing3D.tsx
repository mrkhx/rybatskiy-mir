"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useLayoutEffect, useMemo, useState } from "react";
import type { Session } from "../api/client";
import { Lights, Rig3DScene } from "../rig3d/Rig3DScene";
import type { DebugFlags } from "../rig3d/types";
import { DEBUG_PROXY, PRODUCTION, resolveProductionAssets, type ResolvedAssets } from "../scene3d/assets/paths";
import { OLD_BRIDGE_3D } from "./oldBridge3d";
import { type CatchDecision, useFishingVisualsFromSession } from "./useFishingVisualsFromSession";

const DEBUG_OFF: DebugFlags = {
  skeleton: false,
  ik: false,
  rodAnchors: false,
  fishSkeleton: false,
  line: false,
  fps: false,
  orbit: false,
  fingers: false,
  armAxes: false,
};

function BridgeCamera() {
  const { camera } = useThree();
  const cam = OLD_BRIDGE_3D.camera;
  useLayoutEffect(() => {
    camera.position.set(...cam.position);
    if ("fov" in camera) {
      (camera as typeof camera & { fov: number }).fov = cam.fov;
      camera.near = cam.near;
      camera.far = cam.far;
      camera.updateProjectionMatrix();
    }
    camera.lookAt(...cam.lookAt);
  }, [camera, cam]);
  useFrame(() => {
    camera.position.set(...cam.position);
    camera.lookAt(...cam.lookAt);
  });
  return null;
}

type Props = {
  session: Session | null;
  lastDecision: CatchDecision;
  decisionGen: number;
  reelNonce: number;
};

export function ForestLakeFishing3D({ session, lastDecision, decisionGen, reelNonce }: Props) {
  const [tabHidden, setTabHidden] = useState(typeof document !== "undefined" && document.hidden);
  const visuals = useFishingVisualsFromSession({
    enabled: true,
    session,
    lastDecision,
    decisionGen,
    reelNonce,
  });
  const [assets, setAssets] = useState<ResolvedAssets>({
    fisherman: PRODUCTION.fisherman,
    rod: PRODUCTION.rod,
    pike: DEBUG_PROXY.pike,
    source: { fisherman: "production", rod: "production", pike: "debug" },
    productionPresent: { fisherman: true, rod: true, pike: false },
  });

  useEffect(() => {
    const on = () => setTabHidden(document.hidden);
    document.addEventListener("visibilitychange", on);
    return () => document.removeEventListener("visibilitychange", on);
  }, []);

  useEffect(() => {
    let cancelled = false;
    resolveProductionAssets().then((next) => {
      if (cancelled) return;
      setAssets({
        fisherman: next.productionPresent.fisherman ? next.fisherman : PRODUCTION.fisherman,
        rod: next.productionPresent.rod ? next.rod : PRODUCTION.rod,
        pike: next.productionPresent.pike ? next.pike : DEBUG_PROXY.pike,
        source: {
          fisherman: "production",
          rod: "production",
          pike: next.productionPresent.pike ? "production" : "debug",
        },
        productionPresent: {
          fisherman: true,
          rod: true,
          pike: next.productionPresent.pike,
        },
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const dpr = useMemo<[number, number]>(() => [1, 1.5], []);

  return (
    <div className="lake-3d-layer" aria-hidden="true">
      <Canvas
        className="lake-3d-canvas"
        style={{ pointerEvents: "none", width: "100%", height: "100%" }}
        gl={{ alpha: true, antialias: true, powerPreference: "high-performance", preserveDrawingBuffer: true, premultipliedAlpha: true }}
        dpr={dpr}
        camera={{
          position: OLD_BRIDGE_3D.camera.position,
          fov: OLD_BRIDGE_3D.camera.fov,
          near: OLD_BRIDGE_3D.camera.near,
          far: OLD_BRIDGE_3D.camera.far,
        }}
        frameloop={tabHidden ? "never" : "always"}
        onCreated={({ gl, camera }) => {
          gl.setClearColor(0x000000, 0);
          camera.lookAt(...OLD_BRIDGE_3D.camera.lookAt);
        }}
      >
        <BridgeCamera />
        <Suspense fallback={null}>
          <Lights />
          <group position={OLD_BRIDGE_3D.position} scale={OLD_BRIDGE_3D.scale} rotation={[0, OLD_BRIDGE_3D.spotFacingYaw, 0]}>
            <Rig3DScene
              fishermanUrl={assets.fisherman}
              rodUrl={assets.rod}
              pikeUrl={assets.pike}
              fishermanSource={assets.source.fisherman}
              rodSource={assets.source.rod}
              pikeSource={assets.source.pike}
              yaw={0}
              charClip={visuals.charClip}
              fishClip={visuals.fishClip}
              fishScale={1}
              debug={DEBUG_OFF}
              lineOn
              floatOn
              lineTension={0}
              wave={0.35}
              onCharFinished={visuals.onCharFinished}
              onCastComplete={visuals.onCastComplete}
              onLandingComplete={visuals.onLandingComplete}
              biteKey={visuals.biteKey}
              hookKey={visuals.hookKey}
              fightKey={visuals.fightKey}
              reelKey={visuals.reelKey}
              prepKey={visuals.prepKey}
              landKey={visuals.landKey}
              holdKey={visuals.holdKey}
              releaseKey={visuals.releaseKey}
              keepKey={visuals.keepKey}
              returnKey={visuals.returnKey}
              stowFish={visuals.keepComplete || visuals.releaseComplete || visuals.charClip === "RETURN_TO_READY"}
              onReleaseComplete={visuals.onReleaseComplete}
              onKeepComplete={visuals.onKeepComplete}
              onReturnComplete={visuals.onReturnComplete}
              embed
            />
          </group>
        </Suspense>
      </Canvas>
    </div>
  );
}
