# SM_Fisherman

- Format: FBX (binary) + GLB
- Body: Blender Studio Human Base Meshes v1.4.1, `GEO-body_male_realistic`, **CC0**
- Clothes / hair / cap / boots / sockets / rig: original Blender Python (`tools/fisherman/build_fisherman.py`)
- License: CC0 (body) + original (clothes/rig) → commercial use OK, body needs no attribution
- Rig: Mixamo-style Unity Humanoid names, T-pose
- Height: 1.780 m (target 1.78)
- LOD0 triangles: 27277
- LOD1 triangles: 13634
- LOD2 triangles: 6813
- Files: `SM_Fisherman_LOD0.fbx`, `SM_Fisherman_LOD1.fbx`, `SM_Fisherman_LOD2.fbx`
- Runtime: `Resources/SM_Fisherman.fbx` (copy of LOD0, no LOD siblings in that folder)
- Export: triangulated, custom split normals, FBX `mesh_smooth_type=OFF`, tangents on, leaf bones off
- Sockets: RightHandGrip, LeftHandGrip, RodGrip, RodSupport, HeadLook, Chest, Hips, BackRodMount, BackpackMount, HipAccessoryMount
- Anim clips: none in this pass (rig is pose-ready; FishermanBody drives IDLE..LAND)
- Preview PNGs in this folder are **Blender Cycles**, not Unity Play Mode

## mesh.validate / normals

| Mesh | verts | tris | non-tri | zero/NaN normals substituted | validate() changed |
|---|---:|---:|---:|---:|---|
| Body_LOD0 | 10574 | 21144 | 0 | 0 | False |
| Eye.R_LOD0 | 546 | 1088 | 0 | 0 | False |
| Eye.R.001_LOD0 | 546 | 1088 | 0 | 0 | False |
| Jacket_LOD0 | 1362 | 2533 | 0 | 0 | False |
| Vest_LOD0 | 447 | 774 | 0 | 0 | False |
| Pants_LOD0 | 70 | 132 | 0 | 0 | False |
| Boots_LOD0 | 130 | 208 | 0 | 0 | False |
| Hair_LOD0 | 98 | 154 | 0 | 0 | False |
| Cap_LOD0 | 82 | 156 | 0 | 0 | False |
| Body_LOD1 | 5288 | 10572 | 0 | 0 | False |
| Eye.R_LOD1 | 274 | 544 | 0 | 0 | False |
| Eye.R.001_LOD1 | 274 | 544 | 0 | 0 | False |
| Jacket_LOD1 | 719 | 1265 | 0 | 0 | False |
| Vest_LOD1 | 250 | 386 | 0 | 0 | False |
| Pants_LOD1 | 37 | 66 | 0 | 0 | False |
| Boots_LOD1 | 69 | 103 | 0 | 0 | False |
| Hair_LOD1 | 57 | 76 | 0 | 0 | False |
| Cap_LOD1 | 43 | 78 | 0 | 0 | False |
| Body_LOD2 | 2645 | 5286 | 0 | 0 | False |
| Eye.R_LOD2 | 138 | 272 | 0 | 0 | False |
| Eye.R.001_LOD2 | 138 | 272 | 0 | 0 | False |
| Jacket_LOD2 | 391 | 633 | 0 | 0 | False |
| Vest_LOD2 | 144 | 193 | 0 | 0 | False |
| Pants_LOD2 | 20 | 31 | 0 | 0 | False |
| Boots_LOD2 | 41 | 51 | 0 | 0 | False |
| Hair_LOD2 | 34 | 37 | 0 | 0 | False |
| Cap_LOD2 | 23 | 38 | 0 | 0 | False |
