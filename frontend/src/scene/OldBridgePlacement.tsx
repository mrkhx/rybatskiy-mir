import { useLayoutEffect, useRef, useState, type PropsWithChildren } from "react";
import { Html } from "@react-three/drei";
import type { BridgeCalibration } from "./OldBridgeCalibration";
import { useThree } from "@react-three/fiber";
import { Group, Plane, Raycaster, Vector2, Vector3 } from "three";
import { OLD_BRIDGE_3D, OLD_BRIDGE_PHOTO, oldBridgeCastAnchor } from "./oldBridge3d";
import { RuntimeWaterContext, type RuntimeWater } from "../rig3d/runtimeWater";
import { photoToStage } from "./photoSpace";
import type { FeetAnchor } from "./feetAnchor";

export function OldBridgePlacement({ feet, children, calibration, showMarkers = false }: PropsWithChildren<{ feet: FeetAnchor | null; calibration: BridgeCalibration; showMarkers?: boolean }>) {
  const group = useRef<Group>(null);
  const [water, setWater] = useState<RuntimeWater | null>(null);
  const { camera, size } = useThree();
  const [markers, setMarkers] = useState<{ label: string; point: Vector3 }[]>([]);
  useLayoutEffect(() => {
    const node = group.current;
    if (!node || !feet || !size.width || !size.height) return;
    const photo = OLD_BRIDGE_PHOTO;
    const target = photoToStage(calibration.u, calibration.v,
      size.width, size.height, photo.width, photo.height, photo.objectX, photo.objectY, photo.overscan);
    // Camera orientation is explicit here so sibling effect ordering cannot affect the ray.
    camera.position.set(...OLD_BRIDGE_3D.camera.position);
    camera.lookAt(...OLD_BRIDGE_3D.camera.lookAt);
    camera.updateMatrixWorld(true);
    const ray = new Raycaster();
    ray.setFromCamera(new Vector2(target.x / size.width * 2 - 1, 1 - target.y / size.height * 2), camera);
    const contact = ray.ray.intersectPlane(new Plane(new Vector3(0, 1, 0), 0), new Vector3());
    if (!contact) return;
    const offset = new Vector3(...feet.center).multiplyScalar(calibration.scale)
      .applyAxisAngle(new Vector3(0, 1, 0), calibration.yaw);
    node.scale.setScalar(calibration.scale);
    node.rotation.set(0, calibration.yaw, 0);
    node.position.copy(contact).sub(offset);
    node.position.y += calibration.feetOffset;
    node.updateMatrixWorld(true);
    const waterPhoto = photoToStage(oldBridgeCastAnchor.u, oldBridgeCastAnchor.v, size.width, size.height,
      photo.width, photo.height, photo.objectX, photo.objectY, photo.overscan);
    ray.setFromCamera(new Vector2(waterPhoto.x / size.width * 2 - 1, 1 - waterPhoto.y / size.height * 2), camera);
    const waterlineWorldY = OLD_BRIDGE_3D.waterlineWorldY;
    const castTargetWorld = ray.ray.intersectPlane(new Plane(new Vector3(0, 1, 0), -waterlineWorldY), new Vector3());
    if (castTargetWorld) setWater({ castTargetWorld, waterlineWorldY, motionFrame: node });
    if (showMarkers) setMarkers([
      { label: "photo standing target", point: contact },
      { label: "LeftFoot sole (READY)", point: node.localToWorld(new Vector3(...feet.left)) },
      { label: "RightFoot sole (READY)", point: node.localToWorld(new Vector3(...feet.right)) },
      { label: "fisherman origin", point: node.position.clone() },
      ...(castTargetWorld ? [{ label: `cast target / waterline ${waterlineWorldY}`, point: castTargetWorld }] : []),
    ]);
  }, [camera, feet, size.width, size.height, calibration, showMarkers]);
  return <RuntimeWaterContext.Provider value={water}><group ref={group} visible={feet !== null} scale={calibration.scale}
    rotation={[0, calibration.yaw, 0]}>{children}</group>
    {showMarkers && markers.map(({ label, point }) => <Html key={label} position={point.toArray()} style={{ pointerEvents: "none", whiteSpace: "nowrap" }}>
      <span style={{ color: "#ffed50", background: "#102128bb", fontSize: 11 }}>⊕ {label}</span>
    </Html>)}
  </RuntimeWaterContext.Provider>;
}
