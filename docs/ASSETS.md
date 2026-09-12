# Assets & licenses — Рыбацкий Мир 3D slice

Бюджет арта = 0. Всё ниже либо **собственный** (права проекта), либо **CC0**.

| Asset | Source | License | Commercial | Attribution | Modify |
|---|---|---|---|---|---|
| Рыбак SM_Fisherman (mesh) | Blender Studio Human Base Meshes v1.4.1 `GEO-body_male_realistic` | CC0 | yes | not required | yes |
| Одежда / кепка / волосы / сапоги / сокеты / rig | `tools/fisherman/build_fisherman.py` | original | yes | n/a | yes |
| Текстуры T_Fisherman_* | same pipeline (procedural albedo) | original | yes | n/a | yes |
| Анимации IDLE..LAND | procedural poses on the Humanoid rig | original | yes | n/a | yes |
| Удилище, леска, поплавок | `FishingGear.cs` | original | yes | n/a | yes |
| Окунь | `FishActor.cs` | original | yes | n/a | yes |
| Террейн, мостик, лес, камыш | `ForestLakeBuilder` / `Vegetation` | original | yes | n/a | yes |
| Текстуры wood/bark/grass/cloth (мир) | `TextureFactory.cs` (value-noise) | original | yes | n/a | yes |
| Шейдеры воды, листвы, неба | `Assets/_Project/Shaders` | original | yes | n/a | yes |
| SFX (вода, ветер, splash, катушка) | `WorldAudio.cs` synthesised PCM | original | yes | n/a | yes |
| URP / Input System / Cinemachine | Unity Package Manager | Unity companion | yes | Unity | n/a |

CC0 body: https://www.blender.org/download/demo-files/ (Human Base Meshes v1.4.1). Commercial use and modification allowed, attribution not required.

Нельзя: платный Synty/Megascans, Mixamo raw redistribution вне игры, модели без явной лицензии.

Fallback: если FBX не загрузился, `FishermanBody` собирает примитивы. Это **не** геройский меш.
