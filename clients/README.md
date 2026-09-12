# Клиенты

«Рыбацкий Мир» — мультиплатформенная игра с **одним** server-authoritative backend.

| Клиент | Путь | Роль |
|---|---|---|
| Web 2.5D | `/frontend` | LEGACY / prototype. VK Mini App и текущий Preview. **Не удалять.** |
| Unity 3D | `/clients/unity/RybatskiyMir3D` | Основной кандидат (Windows, Android, позже iOS). Vertical slice: Лесное озеро — Старый мостик. |
| Admin | `/admin` | Служебная панель, не игрок. |

Игровая логика клёва, веса, экономики и инвентаря живёт только в `backend/`.
