# Fisherman build pipeline

Authored Unity character for Рыбацкий Мир.

## Output

`clients/unity/RybatskiyMir3D/Assets/_Project/Characters/Fisherman/`

- `Models/SM_Fisherman.fbx` — LOD0, Humanoid skeleton, sockets, embedded textures
- `Models/SM_Fisherman_LOD1.fbx` / `_LOD2.fbx`
- `Models/SM_Fisherman.glb`
- `Resources/SM_Fisherman.fbx` — same as LOD0, loaded at runtime
- `Textures/T_Fisherman_*`
- `Docs/preview_*.png` — **Blender Cycles**, not Unity Play Mode
- `source/base_male_realistic.blend` — CC0 body extract
- `source/SM_Fisherman.blend` — full authored scene

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
