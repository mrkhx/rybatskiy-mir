# Backup и restore PostgreSQL

На первом этапе достаточно PostgreSQL. Redis используется как кэш/инфраструктура realtime, persistence для него не требуется (AOF/RDB выключены в staging/production compose).

## Что бэкапить

- База `POSTGRES_DB` (сейчас таблица `User`, дальше — все игровые данные).
- Не бэкапить образы Docker — они в GHCR.
- Не бэкапить `.env` вместе с дампом на тот же носитель без шифрования.

## Рекомендуемая периодичность

| Среда | Частота | Хранение |
|---|---|---|
| staging | раз в сутки + перед миграцией | 7 дней |
| production | каждые 6 часов + ежедневная копия | 14–30 дней |

Перед `prisma migrate deploy` (старт нового backend-образа) снимайте внеочередной дамп.

## Создание дампа

На сервере, из каталога приложения:

```bash
COMPOSE_FILE=docker-compose.production.yml \
ENV_FILE=.env.production \
./scripts/pg-backup.sh
```

Скрипт пишет `backups/rybatskiy-mir-YYYYMMDDTHHMMSSZ.dump` (формат `pg_dump -Fc`).

Шифрование GPG:

```bash
ENCRYPT=1 BACKUP_GPG_RECIPIENT=backup@example.com \
COMPOSE_FILE=docker-compose.production.yml \
ENV_FILE=.env.production \
./scripts/pg-backup.sh
```

Каталог `backups/` в `.gitignore`.

## Где хранить

1. Локальный диск VPS — только как буфер.
2. Копия **вне сервера**: отдельный object storage / другой VPS / encrypted volume.
3. Дампы шифровать (GPG или age) до отправки наружу.
4. Права на файлы: только пользователь деплоя, не world-readable.

Не складывать бэкапы в Git и не класть их в Docker-образы.

## Restore

Остановка записи (хотя бы backend) перед восстановлением:

```bash
docker compose --env-file .env.production -f docker-compose.production.yml stop backend
COMPOSE_FILE=docker-compose.production.yml ENV_FILE=.env.production \
  ./scripts/pg-restore.sh backups/rybatskiy-mir-YYYYMMDDTHHMMSSZ.dump
docker compose --env-file .env.production -f docker-compose.production.yml start backend
```

`pg_restore --clean --if-exists` пересоздаёт объекты в текущей базе. Это разрушительная операция — сначала проверьте дамп на копии.

Зашифрованный файл `.gpg` скрипт расшифрует сам.

## Проверка восстановления

Не реже раза в месяц:

1. Поднять отдельный postgres (другой compose-проект или локальный контейнер).
2. Восстановить последний дамп.
3. `pg_restore` без ошибок, `SELECT count(*) FROM "User";` осмыслен.
4. Прогнать backend с `DATABASE_URL` на эту копию и дернуть `GET /health/ready`.

Дамп, который ни разу не восстанавливали, считается несуществующим.

## Миграции и backup

- Prisma migrate — только вперёд.
- Откат Docker-образа **не откатывает** схему. Миграции должны быть обратно совместимы с предыдущим приложением (expand/contract).
- Перед миграцией: backup → deploy → `GET /health/ready` → smoke `/auth/vk/status`.

## Volume PostgreSQL

Данные живут в named volume `postgres_data`. Удаление volume = потеря данных. Перед `docker compose down -v` нужен свежий дамп.
