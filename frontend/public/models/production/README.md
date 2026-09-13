# Production GLB contract

Put **only** real authored assets here. Debug proxies live in `/models/rig3d/` and
**must not** be copied into this folder.

| File | Role |
|---|---|
| `fisherman.glb` | Adult male fisherman, 360° skinned humanoid |
| `rod.glb` | Spinning rod + reel, named anchors |
| `pike.glb` | Skinned pike |

If a file is missing, `/dev/rig3d` **FAIL**s the contract and may still show the
debug proxy with a banner. That is not the game character.

## Fisherman

- One (or few) `SkinnedMesh`, full 360° geometry: skull, ears, nape, jacket back,
  sleeves, boots, fingers. No billboard, no front-only face card, no primitives.
- Age 35–45, sturdy build, olive fishing jacket, khaki pants, rubber boots, cap.
- Semi-realistic game character. Not cartoon, toy, anime, mannequin.
- **30k–70k** triangles.
- PBR 2K: BaseColor + Normal + Roughness (ORM ok). Metallic only on real metal.
- Humanoid bones: `Hips Spine Spine1 Chest Neck Head UpperArm_L/R LowerArm_L/R
  Hand_L/R UpperLeg_L/R LowerLeg_L/R Foot_L/R`
- Fingers: Thumb/Index/Middle/Ring/Pinky, both hands.
- Height ~1.7 m, Y-up, meters, transforms applied.
- Clips (in-place fishing, WALK may use root motion):
  `IDLE WALK READY AIM CAST_BACKSWING CAST_FORWARD CAST_FOLLOW WAIT
  BITE_REACTION HOOKSET REEL FIGHT_LIGHT FIGHT_HEAVY LAND RETURN_IDLE`
- Optional: `TURN_LEFT TURN_RIGHT STEP_LEFT STEP_RIGHT`
- Node `RodGrip` parented to `Hand_R` (or runtime will parent the rod).

## Rod

Named nodes (empty ok): `RodGrip RodTip LineStart Reel ReelHandle
RodSupportTarget ReelHandleTarget`. Hierarchy:

```
Hand_R
 └── RodGrip
      └── Rod (skinned blank)
           ├── Reel
           │    └── ReelHandle
           └── RodTip / LineStart
```

Length 1.8–2.7 m. Thin tapered blank, compact spinning reel.

## Pike

Skinned mesh, bones `PikeRoot Spine_0..N Tail Jaw Pectoral_L Pectoral_R Dorsal Anal`.
Clips: `SWIM_IDLE SWIM_FAST TURN_LEFT TURN_RIGHT STRUGGLE_LIGHT STRUGGLE_HEAVY
SURFACE LANDED`. Uniform scale must not break fins.

## Blender export

- glTF 2.0 binary (`.glb`), Y-up, meters
- Apply transforms, keep armature, export skin + animations
- Embed textures; no cameras, no extra lights, no hidden source meshes
- One material per shading group; no duplicates
- Check: scale, facing +Z forward, root at ground, clip names exact

## Where to get the character (this repo cannot author it)

Do **not** generate a capsule/lathe replacement.

1. **Custom Blender character** (best): model + wrap + paint to identity lock
   (olive jacket, khaki, boots, cap, 35–45). Rig Mixamo-compatible or our names.
2. **Character Creator 4 / iClone** + outfit (outdoor jacket), export Mixamo
   humanoid, retarget fishing clips in Blender.
3. **Licensed marketplace humanoid** (Agora, Renderpeople game-res, similar)
   matching clothing, then retexture to identity. Keep the license file.
4. Mixamo **clips** are fine to retarget. Mixamo **stock characters** must not be
   committed to this public repo (Adobe terms). Drop locally if used for layout.

Runtime remap of Mixamo / CC3 bone names lives in
`src/scene3d/assets/retarget.ts`.

Validator: `src/scene3d/assets/characterAdapter.ts` — FAIL, no mannequin fallback.
