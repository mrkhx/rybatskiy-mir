# Unity Preview — как смотреть 3D-клиент

Вертикальный срез `clients/unity/RybatskiyMir3D`.  
Это **не** production deploy. Геймплей и арт не меняются этим документом.

Два пути:

1. **Локальный Play Mode** в Unity Hub — основной, работает без GitHub Secrets.
2. **GitHub Actions artifacts** — Windows `.zip` и (если соберётся) WebGL `.zip` после коммита в `full-game-development`.

---

## 1. Открыть проект в Unity Hub

1. Установить [Unity Hub](https://unity.com/download).
2. Установить Editor **Unity 6 LTS 6000.0.38f1** (тот же changeset, что в `ProjectSettings/ProjectVersion.txt`: `82314a941f2c`).
3. Modules: **Windows Build Support (Mono)** минимум. WebGL module — только если хочешь локальный WebGL.
4. Hub → **Add** → выбрать папку  
   `clients/unity/RybatskiyMir3D`  
   (именно её, не корень монорепо).
5. Открыть проект. Первый импорт URP / Input System / Newtonsoft занимает несколько минут.
6. Если Unity спросит Input System: **Yes, enable the new input backend** (Both).
7. Если розовые материалы: Edit → Project Settings → Graphics → Scriptable Render Pipeline Settings → создать URP asset (High).

Сцена: `Assets/_Project/Scenes/ForestLake.unity`.  
Мир, рыбак и камера создаются runtime-скриптом `Bootstrap` после загрузки сцены. Пустая сцена — норма.

---

## 2. Play Mode

1. Открыть `ForestLake`.
2. Нажать Play.
3. `GameInstaller` логинится dev-auth и строит «Лесное озеро».

Inspector `GameInstaller` (на объекте, который появляется в Play):

| Поле | Значение |
|---|---|
| Api Base Url | `http://127.0.0.1:3000` |
| Allow Dev Auth | true |
| Dev Vk Id | `910001` (только цифры) |

---

## 3. Backend для локальной Unity-сцены

Unity **не** поднимает NestJS сам. Нужен тот же backend, что у web-прототипа.

Из корня монорепо:

```bash
cp .env.example .env   # если ещё нет
# ALLOW_DEV_AUTH=true
# PORT=3000
# DATABASE_URL и REDIS_URL из .env.example
npm ci
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run dev --workspace=backend
```

Или `docker compose up` — backend слушает **порт 3000**.

### URL, который использует клиент

- Editor / Windows standalone: **`http://127.0.0.1:3000`**
- Native Windows/Android CORS **не** используют.
- WebGL в браузере CORS **нужен**. Если открываешь WebGL с `http://localhost:8088`, в backend `.env` временно:  
  `FRONTEND_ORIGIN=http://localhost:8088`  
  Это **не** меняет игровую логику, только origin. Пока не делай этого в staging/production.

WebSocket тот же хост: `http://127.0.0.1:3000` (Socket.IO в slice пока stub, рыбалка идёт REST).

---

## 4. Тестовый dev-user

`POST /auth/dev/session` работает только при `ALLOW_DEV_AUTH=true` и **не** в production.

| Поле | Значение |
|---|---|
| vkId | `910001` |
| nickname | `Рыбак` |

vkId обязан быть числом. Строка `unity-slice-1` сервер отвергнет.

Стартовый набор (удочка, катушка, леска, черви) выдаётся `PlayerService.ensure` при первом логине.

---

## 5. Управление

| Действие | Клавиатура | Мышь / геймпад |
|---|---|---|
| Ходьба | **WASD** (A влево, D вправо, strafe) | левый стик |
| Камера | — | **мышь** (курсор захвачен) / правый стик |
| Zoom | — | **колесо мыши** |
| Бег | **Shift** | LB |
| Прыжок | **Пробел** (только в свободном ходе) | South |
| Сесть на мостик | **E** | West (X / Square) |
| Заброс / подсечка | **ЛКМ** или Пробел | South |
| Подмотка | Shift | RT |
| Курсор | **Esc** освобождает, **ЛКМ** возвращает камеру | — |
| Встать / отпустить | **R** или Esc (если курсор уже свободен) | East |

Курсор в Play Mode захватывается. Esc — освободить. Повторный клик — снова камера. R — встать с мостика.

Цикл: подойти к старому мостику → E → прицел/сила (W/S) → ЛКМ заброс → ждать поклёвку → ЛКМ подсечка → вываживание → ЛКМ в садок / R отпустить.

После **E** рыбак смотрит на воду, удочка выходит из рук вперёд, кончик над водой, леска не идёт назад к берегу. Если в Console есть `Rod +Y is not aiming at water` — это баг ориентации.

---

## 6. GitHub Actions — Windows и WebGL artifacts

Workflow: [`.github/workflows/unity-preview.yml`](../.github/workflows/unity-preview.yml)

Триггеры:

- push в `full-game-development` при изменениях `clients/unity/**`;
- ручной **Run workflow**.

**Production/staging не деплоится.** Только artifacts.

Download names:

- `RybatskiyMir3D-Windows.zip`
- `RybatskiyMir3D-WebGL.zip`

Unity 6 image: Docker Hub имеет `unityci/editor` для **6000.0.38f1** (`windows-mono` и `webgl`).

### Какие секреты нужны

GameCI **не соберёт** Unity без лицензии. Секреты сами не выдумываются и в репозиторий не кладутся.

Репозиторий → **Settings → Secrets and variables → Actions**.

#### Вариант A — Unity Personal (бесплатный)

Нужны **все три**:

| Secret | Откуда |
|---|---|
| `UNITY_EMAIL` | email аккаунта Unity |
| `UNITY_PASSWORD` | пароль того же аккаунта (лучше без спецсимволов — ограничение GameCI) |
| `UNITY_LICENSE` | **целиком** содержимое файла `.ulf` |

Как получить `.ulf`:

1. В Actions: **Run workflow** → включить `request_activation` → Run.
2. Скачать artifact `UnityActivationFile` (файл `.alf`).
3. Открыть [https://license.unity3d.com/manual](https://license.unity3d.com/manual) под тем же аккаунтом.
4. Upload `.alf` → скачать `.ulf`.
5. Вставить текст `.ulf` в secret `UNITY_LICENSE`.

Либо активировать Editor локально в Unity Hub (Personal license) и скопировать `.ulf`:

- Windows: `C:\ProgramData\Unity\Unity_lic.ulf`
- macOS: `/Library/Application Support/Unity/Unity_lic.ulf`
- Linux: `~/.local/share/unity3d/Unity/Unity_lic.ulf`

Документация GameCI: [Activation](https://game.ci/docs/github/activation/).

#### Вариант B — Unity Plus / Pro

| Secret | Откуда |
|---|---|
| `UNITY_EMAIL` | email |
| `UNITY_PASSWORD` | пароль |
| `UNITY_SERIAL` | серийник `XX-XXXX-XXXX-XXXX-XXXX-XXXX` с [id.unity.com/subscriptions](https://id.unity.com/en/subscriptions) |

`UNITY_LICENSE` тогда не обязателен.

Если секретов нет, job `license-gate` ставит warning и **Windows/WebGL jobs пропускаются** (workflow зелёный, артефактов нет — это ожидаемо). После добавления секретов: Actions → Unity preview → **Run workflow**.

### Скачать сборку

1. GitHub → **Actions** → workflow **Unity preview**.
2. Открыть нужный run.
3. Внизу **Artifacts**:
   - `RybatskiyMir3D-Windows` → скачивается как `RybatskiyMir3D-Windows.zip`
   - `RybatskiyMir3D-WebGL` → `RybatskiyMir3D-WebGL.zip` (job `continue-on-error`: если WebGL не собрался, Windows всё равно может быть)
4. Срок хранения: 14 дней.

**Windows:** распаковать, запустить `RybatskiyMir3D.exe`. Backend должен быть на `http://127.0.0.1:3000`. Development Build пишет лог:

`%USERPROFILE%\AppData\LocalLow\RybatskiyMir\Rybatskiy Mir\Player.log`

**WebGL:** это не VK Mini App. Распаковать и раздать папку локальным http (браузер не открывает `file://` для Unity WebGL):

```bash
python -m http.server 8088 --directory путь/к/WebGL
```

Потом открыть показанный localhost. Для API нужен CORS origin этого сервера.

### Ограничения CI

- Первый прогон без cache — десятки минут, образ Editor ~7–12 GB.
- Бесплатные GitHub minutes быстро тают. Preview — по коммитам в Unity-клиент, не на каждый frontend-push.
- Windows CI собирается **кросс-компиляцией Mono с Linux-раннера**. Это development preview, не Steam-shipping IL2CPP.
- 2FA на аккаунте Unity: для Personal используй `.ulf` (вариант A). Пароль с 2FA часто ломает активацию по `UNITY_SERIAL`.

---

## 7. Чего здесь нет

- Deploy staging / production
- Steam / Google Play / VK publish
- Автозапуск 3D внутри текущего web Preview
