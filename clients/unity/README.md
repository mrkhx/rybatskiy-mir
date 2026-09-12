# RybatskiyMir3D

Открывать в Unity **эту** папку: `clients/unity/RybatskiyMir3D`.

Текущий React frontend (`/frontend`) **не удалять** — это LEGACY / prototype для VK и web preview.

Как смотреть 3D после коммитов: [docs/UNITY_PREVIEW.md](../../docs/UNITY_PREVIEW.md).

## Требования

- Unity 6 LTS **6000.0.38f1** (или любой 6000.0.x)
- Modules: Windows Build Support; Android Build Support (IL2CPP + SDK) когда дойдёте до APK
- WebGL **не** нужен для первого slice
- Локально запущенный backend монорепо (`ALLOW_DEV_AUTH=true`)

## Первый запуск

1. Unity Hub → Add → `clients/unity/RybatskiyMir3D`.
2. Дождаться импорта URP / Input System / Cinemachine / Newtonsoft.
3. **Graphics**: Project Settings → Graphics → Scriptable Render Pipeline Settings → создать URP asset (High Quality) если Unity не создал сам. Без этого вода/материалы могут стать magenta.
4. Input System: если всплывёт диалог — **Yes, enable the new input backend** (Both).
5. Play на пустой сцене. `Bootstrap` сам создаёт мир, рыбака и камеру.
6. Inspector `GameInstaller`: `Api Base Url` = `http://127.0.0.1:3000`, `Allow Dev Auth` = true, `Dev Vk Id` = число (`910001`). Backend требует numeric vkId.
7. Backend: `npm run dev --workspace=backend` из корня монорепо.

## Управление

| Действие | Клавиатура | Геймпад |
|---|---|---|
| Ходьба | WASD (A/D strafe) | Левый стик |
| Камера | Мышь | Правый стик |
| Бег | Left Shift | LB |
| Сесть на мостик | E | A / South |
| Заброс / подсечка | ЛКМ / Пробел | A / RT |
| Подмотка | Shift | RT |
| Встать / отпустить | Esc | B / East |

## Что это за стадия

**STAGE 1 — runtime blockout.** Мир, рыбак, удочка, вода собираются кодом (stylized primitives + палитра art bible). Это не финальный визуал и не «сцена из кубов как продукт». Следующий этап — авторский мостик, SK_Fisherman, Gerstner-water.

Клёв, вес, XP, садок — **только backend**. Unity только показывает `Session.state`.

## Чего здесь нет специально

Магазин, лодки, другие водоёмы, VK login UI, Steamworks, WebGL-сборка.
