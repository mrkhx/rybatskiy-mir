# PF_Fisherman

The Forest Lake scene is empty and assembled at runtime by `Bootstrap` → `GameInstaller` → `FishermanBody.Build`.

`FishermanBody.Build` instantiates `Resources/SM_Fisherman.fbx` (the authored Humanoid) and binds bones. That instance **is** the playable prefab.

When the project is opened in Unity Editor, `FishermanImport` (AssetPostprocessor):

1. Sets the FBX Animation Type to **Humanoid** (`ModelImporterAnimationType.Human`) and creates an Avatar from the Mixamo-named skeleton.
2. Writes `PF_Fisherman.prefab` next to this file on first import, as a convenience for the Animator window.

Do not treat the runtime capsule fallback as the hero mesh. If the FBX is missing, `FishermanBody` still builds primitives so the slice is playable.
