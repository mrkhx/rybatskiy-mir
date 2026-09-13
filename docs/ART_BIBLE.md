# Art Bible — Рыбацкий Мир (2.5D)

Production visual standard for the **browser / VK** client.
Location template: **Лесное озеро — Старый мостик**.
Unity 3D client is frozen; this bible is for the 2.5D live scene.

Style: **stylized semi-realistic 2.5D**. Painted, atmospheric, natural asymmetry.
Not photobash. Not flat vector. Not a children’s cartoon. Not pixel art.

---

## 1. Camera

- Locked over-shoulder fishing camera, slight ¾ from behind the angler.
- Horizon at **42–48%** of frame height.
- Angler sits on the left third of the pier, looking out over the lake.
- Scale: angler ~18–22% of frame height while seated.
- Parallax: far −8px, play −10px, foreground −28px (pointer-driven, subtle).

## 2. Layers (back → front)

| Layer | Contents | Motion |
|---|---|---|
| BACKGROUND | sky, distant hills, atmospheric haze | slow drift, sun glow |
| MIDGROUND | mixed conifers, a few deciduous, bushes, shoreline | wind sway, desaturated |
| WATER | depth gradient, drift texture, sheen, ripples | always moving |
| GAMEPLAY | pier, angler, rod, line, float, fish/splash | gameplay-driven |
| FOREGROUND | reeds, grass tufts, hanging branch | stronger wind, never over UI |
| WEATHER | rain, fog sheets, lightning wash | weather from backend |
| UI | HUD, dock, sheets | always `z-index ≥ 20` |

## 3. Palette

| Token | Hex | Use |
|---|---|---|
| Sky day | `#8EC4D4` → `#9FC4B8` | zenith → horizon |
| Water body | `#1F7080` | mid lake |
| Water highlight | `#4A96A0` | sheen / caustics |
| Deep | `#08242E` | near shore / under pier |
| Hill far | `#1A3328` | distant forest |
| Jacket | `#6D7D4E` | angler |
| Vest | `#7E915B` | angler |
| Pants | `#4A433C` | angler |
| Boots | `#2C261E` | angler |
| Cap | `#5C4A2E` | angler |
| Skin | `#D2AE86` | angler |
| Wood wet | `#3A2A1C` | pier |
| Accent UI | `#C9B896` | HUD primary |

Time-of-day grades via CSS custom properties (`data-tod`). Never bake TOD into assets.

## 4. Lighting

- Soft overcast key from upper-right.
- Warm sun disc only on CLEAR / PARTLY_CLOUDY.
- Contact shadow under pier and boots.
- Night: cool wash `--wash-op: 0.55`, moon instead of sun.
- Dawn/dusk: warm grade, never a full-screen orange overlay.

## 5. Character

- Adult male fisherman, 35–45, sturdy, human proportions.
- Seated ¾ back view on the old bridge.
- Layered rig: hips/legs, torso, head, left arm, right upper arm, right forearm, wrist socket.
- Painted sprites, **not** SVG capsules, **not** 2-frame flipbooks as the only motion.
- Idle = breath + weight shift. Cast / fight drive the right arm and torso lean.
- **Rod is never baked into the character sprite.**

## 6. Gear

- Rod: canvas stroke, root at wrist, tip solved in screen space, bend from tension.
- Line: quadratic from tip → float / lure / fish, sag from slack.
- Float: red/white quill, bob / twitch / dip / submerge.
- Fish during fight: underwater shadow + splash, not a collectible card.

## 7. Water

- Depth gradient (teal → deep under pier).
- Moving texture + screen-blend sheen.
- Wind ripples, rain circles, float rings, bite splash.
- Canvas 2D, not a full-screen WebGL lake.

## 8. Vegetation

- Mixed silhouettes: pine, spruce, birch, saplings. No cloned row.
- Reeds in foreground, different phases of wind.
- Lilies offset left/right, slow bob.
- Foreground never covers HUD, dock, or primary buttons.

## 9. Weather (backend clock)

| Code | Visual |
|---|---|
| CLEAR | sun glow, high sheen |
| PARTLY_CLOUDY / OVERCAST | muted sun, extra haze |
| RAIN / DOWNPOUR | streaks, water circles, darker grade |
| STORM | rain + rare double lightning (not a white flash) |
| FOG | depth layers, horizon loss, not a white curtain |
| WIND | stronger reed/branch/water phase |

## 10. UI

- Always above the scene (`z-index 20+`).
- Exploration: topbar + dock only.
- Fishing: compact bottom HUD (spot, method, depth, weather, time, tension).
- Rain must not kill HUD contrast (backdrop blur + mask).

## 11. Transparency

Foreground / character / prop assets: **real alpha**. Forbidden: magenta leftover, white/black boxes, visible bounding rects.
CI-style check: `frontend/scripts/check-scene-alpha.py`.

## 12. Naming

```
frontend/public/scene/forest-lake/
  sky.webp
  far-forest.webp
  trees.webp
  water.webp
  pier.webp
  reeds.webp
  lilies.webp
  rocks.webp
  branch.webp
  char/body.webp
  char/head.webp
  char/arm-l.webp
  char/arm-r.webp
  char/forearm-r.webp
```

## 13. Performance

| Tier | Who | Cuts |
|---|---|---|
| HIGH | desktop | full ripples, rain, parallax |
| MEDIUM | default | fewer ripples, no caustic drift |
| LOW | small mobile | no rain sprites, static sheen, no parallax |

## 14. Forbidden

- Magenta / technical backgrounds in the live scene.
- SVG-primitive “scarecrow” as the hero.
- Rod painted into the character.
- New waterbodies in this pass.
- Photoreal collage, comic outlines, emoji-as-art.
