# Fisherman build pipeline

Authored Unity character for Рыбацкий Мир.

## Output

`clients/unity/RybatskiyMir3D/Assets/_Project/Characters/Fisherman/`

- `Models/SM_Fisherman_LOD0.fbx` — LOD0, Humanoid skeleton, sockets, embedded textures
- `Models/SM_Fisherman_LOD1.fbx` / `SM_Fisherman_LOD2.fbx` — matching `_LOD1` / `_LOD2` mesh names
- `Models/SM_Fisherman.glb`
- `Resources/SM_Fisherman.fbx` — copy of LOD0 for `Resources.Load` (no LOD siblings in that folder)
- `Textures/T_Fisherman_*`
- `Docs/preview_*.png` — **Blender Cycles**, not Unity Play Mode
- `source/base_male_realistic.blend` — CC0 body extract
- `source/SM_Fisherman.blend` — full authored scene

Do **not** put `SM_Fisherman.fbx` next to `_LOD1` / `_LOD2` in `Models/` — Unity treats that as inconsistent LOD naming.

Meshes inside each file are named `Body_LOD0`, `Jacket_LOD0`, `Vest_LOD0`, `Pants_LOD0`, `Boots_LOD0`, `Hair_LOD0`, `Cap_LOD0` (and `_LOD1` / `_LOD2` in the matching files).

Export hygiene (in `build_fisherman.py`, not Unity importer):

- apply transforms, reject negative scale
- `mesh.validate()`, remove doubles / loose / degenerate / zero-area
- triangulate
- recalc normals outside
- write custom split normals
- FBX `mesh_smooth_type=OFF` + tangents, `add_leaf_bones=False`

## Rebuild

Needs Blender 4.2+ (headless is fine):

```
blender --background --python tools/fisherman/build_fisherman.py
```

## License

| Part | Source | License |
|---|---|---|
| Body + eyes | Blender Studio Human Base Meshes v1.4.1, `GEO-body_male_realistic` | **CC0** (commercial, no attribution required) |
| Clothes, hair, cap, boots, sockets, Mixamo-style rig, textures | this pipeline | original, Рыбацкий Мир |

https://www.blender.org/download/demo-files/ — Human Base Meshes bundle.
