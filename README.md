# Notification Preferences Service

Сервис управления предпочтениями уведомлений для платформы с несколькими каналами доставки (email, SMS, мессенджеры, пуши). Единый источник правды для остальных компонентов платформы.

## Запуск проекта

### Требования

- Node.js 18+
- Docker и Docker Compose

### Установка зависимостей

```bash
npm install
```

### Настройка окружения (опционально)

В `.env` файле.

### Запуск PostgreSQL

```bash
docker-compose up -d
```

### Применение миграций

```bash
npm run migration:run
```

### Добавление тестовых данных

```bash
npm run db:seed
```

### Запуск dev сервера

```bash
npm run start:dev
```

API доступно по адресу: `http://localhost:3000`

Документация API (Swagger): `http://localhost:3000/api/docs`

### Остановка проекта

```bash
# Остановить dev сервер (Ctrl+C)
# Остановить PostgreSQL
docker-compose down
```

## Запуск тестов

### Unit-тесты

```bash
npm test
```

### Unit-тесты с покрытием

```bash
npm run test:cov
```

## Архитектура и основные решения

### Структура проекта

```
src/
├── modules/
│   └── preferences/           # Модуль предпочтений
│       ├── preferences.controller.ts
│       ├── preferences.service.ts
│       ├── preferences.module.ts
│       ├── dto/               # Data Transfer Objects
│       ├── entities/          # TypeORM сущности
│       ├── types/             # Доменные типы и enums
│       └── constants/         # Конфигурация по умолчанию
├── database/                  # Миграции и сидинг
├── config/
└── main.ts
```

### Ключевые решения

1. **NestJS модульная архитектура** - сервис простой (3 endpoint'а), поэтому выбрана стандартная структура NestJS вместо DDD слоёв.

2. **JSONB для preferences** - гибкая схема для хранения настроек каналов без создания множества таблиц.

3. **Приоритет проверок при evaluate:**
   - Global Policy → deny (блокировка по региону/типу)
   - User Preference → deny (пользователь отключил канал)
   - Quiet Hours → deny (только для marketing уведомлений)
   - Иначе → allow

4. **Идемпотентность без idempotency key** - сравнение текущего состояния с запрошенным, no-op если совпадают.

5. **Hardcoded глобальные политики** - для MVP достаточно, в будущем можно вынести в БД.

### Доменные типы

- **Channel**: `email`, `sms`, `push`, `messenger`
- **NotifType**: `transactional` (не блокируется в quiet hours), `marketing` (блокируется в quiet hours)
- **Region**: `EU`, `US`, `RU`, `APAC`

### API Endpoints

| Method | Endpoint                     | Описание                           |
| ------ | ---------------------------- | ---------------------------------- |
| GET    | `/users/:userId/preferences` | Получить предпочтения пользователя |
| POST   | `/users/:userId/preferences` | Обновить предпочтения              |
| POST   | `/evaluate`                  | Проверить возможность отправки     |

## Что добавить для продакшена

### Управление

- **Admin API для глобальных политик** - CRUD для политик без деплоя
- **Admin API для default preferences** - управление дефолтами
- **Audit log** - история изменений настроек пользователей

### Безопасность

- **Authentication/Authorization** - JWT или API keys для защиты endpoints
- **Rate limiting** - защита от abuse
- **Input validation** - усиление валидации UUID, таймзон

### Надёжность

- **Кэширование preferences** - Redis для уменьшения нагрузки на БД при частых запросах evaluate
- **Connection pooling** - настройка пула соединений PostgreSQL
- **Graceful shutdown** - корректное завершение соединений при остановке

### Observability

- **Метрики** - счётчики allow/deny решений (добавил комментарии)
- **Health checks** - `/health` endpoint для Kubernetes

### Масштабирование

- **Read replicas** - разделение чтения и записи в БД
- **Horizontal scaling** - stateless сервис, можно запускать несколько инстансов
