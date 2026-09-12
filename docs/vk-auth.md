# VK-авторизация — TODO

Полноценный вход через VK нельзя включить без реального приложения VK.

## Что уже есть

- Интерфейс `VkAuthProvider` (`backend/src/auth/vk/`)
- Заглушка `UnconfiguredVkAuthProvider`: в production без настроек VK вход отклоняется
- Локальный dev-вход `POST /auth/dev/session` — **только** при `ALLOW_DEV_AUTH=true` и `NODE_ENV !== production`

Секреты VK в код не вшиты и в репозиторий не попадают.

## Что нужно до реализации production-входа

1. Создать приложение VK Mini Apps / VK ID и получить `VK_APP_ID`.
2. Сохранить `VK_APP_SECRET` только в серверном окружении (не в frontend, не в Git).
3. Реализовать проверку launch-параметров Mini App:
   - собрать строку из `vk_*` параметров;
   - HMAC-SHA256 с защищённым ключом приложения;
   - сравнить с `sign`.
4. По `vk_user_id` найти или создать `User`.
5. Выдать собственный JWT backend (VK-токен на клиент не проксировать как session).
6. При необходимости отдельно подключить VK ID OAuth для админки — это другой поток.

## Чего нельзя делать

- Хардкодить секрет или токен в репозитории
- Считать `vk_user_id` из querystring доверенным без подписи
- Включать `ALLOW_DEV_AUTH` в production
- Логировать `VK_APP_SECRET`, JWT и `Authorization`
