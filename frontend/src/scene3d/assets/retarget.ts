import type { Object3D } from "three";
import type { GltfLike } from "./validateGltf";

/**
 * Name-remap pipeline for Mixamo / Character Creator / UE mannequin
 * onto the production fisherman contract. Does not invent clips or meshes.
 */
const BONE_ALIASES: Record<string, string> = {
  hips: "Hips",
  pelvis: "Hips",
  mixamorighips: "Hips",
  cc_base_hip: "Hips",
  cc_base_pelvis: "Hips",
  spine: "Spine",
  mixamorigspine: "Spine",
  cc_base_spine01: "Spine",
  spine1: "Spine1",
  mixamorigspine1: "Spine1",
  cc_base_spine02: "Spine1",
  spine2: "Chest",
  chest: "Chest",
  mixamorigspine2: "Chest",
  cc_base_chest: "Chest",
  neck: "Neck",
  mixamorigneck: "Neck",
  cc_base_necktwist01: "Neck",
  head: "Head",
  mixamorighead: "Head",
  cc_base_head: "Head",
  leftarm: "UpperArm_L",
  leftupperarm: "UpperArm_L",
  mixamorigleftarm: "UpperArm_L",
  cc_base_l_upperarm: "UpperArm_L",
  rightarm: "UpperArm_R",
  rightupperarm: "UpperArm_R",
  mixamorigrightarm: "UpperArm_R",
  cc_base_r_upperarm: "UpperArm_R",
  leftforearm: "LowerArm_L",
  leftlowerarm: "LowerArm_L",
  mixamorigleftforearm: "LowerArm_L",
  cc_base_l_forearm: "LowerArm_L",
  rightforearm: "LowerArm_R",
  rightlowerarm: "LowerArm_R",
  mixamorigrightforearm: "LowerArm_R",
  cc_base_r_forearm: "LowerArm_R",
  lefthand: "Hand_L",
  mixamoriglefthand: "Hand_L",
  cc_base_l_hand: "Hand_L",
  righthand: "Hand_R",
  mixamorigrighthand: "Hand_R",
  cc_base_r_hand: "Hand_R",
  leftupleg: "UpperLeg_L",
  leftupperleg: "UpperLeg_L",
  mixamorigleftupleg: "UpperLeg_L",
  cc_base_l_thigh: "UpperLeg_L",
  rightupleg: "UpperLeg_R",
  rightupperleg: "UpperLeg_R",
  mixamorigrightupleg: "UpperLeg_R",
  cc_base_r_thigh: "UpperLeg_R",
  leftleg: "LowerLeg_L",
  leftlowerleg: "LowerLeg_L",
  mixamorigleftleg: "LowerLeg_L",
  cc_base_l_calf: "LowerLeg_L",
  rightleg: "LowerLeg_R",
  rightlowerleg: "LowerLeg_R",
  mixamorigrightleg: "LowerLeg_R",
  cc_base_r_calf: "LowerLeg_R",
  leftfoot: "Foot_L",
  mixamorigleftfoot: "Foot_L",
  cc_base_l_foot: "Foot_L",
  rightfoot: "Foot_R",
  mixamorigrightfoot: "Foot_R",
  cc_base_r_foot: "Foot_R",
  "bip01pelvis": "Hips",
  "bip01spine": "Spine",
  "bip01spine1": "Spine1",
  "bip01spine2": "Chest",
  "bip01neck": "Neck",
  "bip01head": "Head",
  "bip01lclavicle": "Shoulder_L",
  "bip01rclavicle": "Shoulder_R",
  "bip01lupperarm": "UpperArm_L",
  "bip01rupperarm": "UpperArm_R",
  "bip01lforearm": "LowerArm_L",
  "bip01rforearm": "LowerArm_R",
  "bip01lhand": "Hand_L",
  "bip01rhand": "Hand_R",
  "bip01lthigh": "UpperLeg_L",
  "bip01rthigh": "UpperLeg_R",
  "bip01lcalf": "LowerLeg_L",
  "bip01rcalf": "LowerLeg_R",
  "bip01lfoot": "Foot_L",
  "bip01rfoot": "Foot_R",
};

const FINGER_RE = /^(mixamorig)?(left|right)hand(thumb|index|middle|ring|pinky)(\d)$/i;

const CLIP_ALIASES: Record<string, string> = {
  idle: "IDLE",
  walking: "WALK",
  walk: "WALK",
  "walking.glb": "WALK",
  ready: "READY",
  aim: "AIM",
  aiming: "AIM",
  cast: "CAST_FORWARD",
  casting: "CAST_FORWARD",
  wait: "WAIT",
  bite: "BITE_REACTION",
  hookset: "HOOKSET",
  hook: "HOOKSET",
  reel: "REEL",
  reeling: "REEL",
  fight: "FIGHT_LIGHT",
  land: "LAND",
  turnleft: "TURN_LEFT",
  turnright: "TURN_RIGHT",
  stepleft: "STEP_LEFT",
  stepright: "STEP_RIGHT",
};

function keyOf(name: string): string {
  return name.replace(/^mixamorig[_:]?/i, "").replace(/[^a-z0-9]/gi, "").toLowerCase();
}

function contractBoneName(name: string): string | null {
  const k = keyOf(name);
  if (BONE_ALIASES[k]) return BONE_ALIASES[k];
  const finger = name.replace(/^mixamorig[_:]?/i, "").replace(/[_:\s]/g, "");
  const m = finger.match(FINGER_RE);
  if (m) {
    const side = m[2].toLowerCase() === "left" ? "L" : "R";
    const digit = m[3][0].toUpperCase() + m[3].slice(1);
    return `${digit}_${side}_${m[4]}`;
  }
  return null;
}

export function normalizeHumanoidNames(root: Object3D): Record<string, string> {
  const renamed: Record<string, string> = {};
  root.traverse((o) => {
    const next = contractBoneName(o.name);
    if (next && next !== o.name) {
      renamed[o.name] = next;
      o.name = next;
    }
  });
  return renamed;
}

export function normalizeClipNames(gltf: GltfLike): void {
  for (const clip of gltf.animations ?? []) {
    const mapped = CLIP_ALIASES[keyOf(clip.name)];
    if (mapped) clip.name = mapped;
  }
}

export function remapClipTracks(gltf: GltfLike, renamed: Record<string, string>): void {
  if (!Object.keys(renamed).length) return;
  for (const clip of gltf.animations ?? []) {
    for (const track of clip.tracks) {
      for (const [from, to] of Object.entries(renamed)) {
        if (track.name.startsWith(`${from}.`) || track.name.startsWith(`${from}/`)) {
          track.name = track.name.replace(from, to);
        }
      }
    }
  }
}

/** Run after GLTFLoader. Safe on already-contract names. */
export function importHumanoid(gltf: GltfLike): void {
  const renamed = normalizeHumanoidNames(gltf.scene);
  remapClipTracks(gltf, renamed);
  normalizeClipNames(gltf);
}
