# ADR: Notification Preferences Service Architecture

## Status

User review is in progress

## Context

Необходимо реализовать сервис управления предпочтениями уведомлений для платформы с несколькими каналами доставки (email, SMS, мессенджеры, пуши). Сервис должен быть единым источником правды для остальных компонентов платформы.

## Decision

### 1. Архитектура приложения

**Domain-Driven Design с модульной структурой:**

```
src/
├── domain/                    # Доменный слой
│   ├── preferences/           # Агрегат Preferences
│   │   ├── entities/
│   │   ├── value-objects/
│   │   ├── services/
│   │   └── repositories/
│   ├── policies/              # Глобальные политики
│   └── shared/                # Общие value objects
├── application/               # Прикладной слой
│   ├── use-cases/
│   ├── dto/
│   └── services/
├── infrastructure/            # Инфраструктурный слой
│   ├── persistence/
│   │   ├── entities/          # TypeORM entities
│   │   └── repositories/
│   └── config/
└── interfaces/                # Интерфейсный слой
    └── http/
        ├── controllers/
        └── dto/
```

### 2. Доменные типы

**Channel (enum):**

- `email`
- `sms`
- `push`
- `messenger`

**Region (enum):**

- `EU` - Европа (GDPR)
- `US` - США
- `RU` - Россия
- `APAC` - Азиатско-Тихоокеанский регион

**NotifType (enum):**

- `transactional` - критические уведомления (не блокируются в quiet hours)
- `marketing` - маркетинговые уведомления (блокируются в quiet hours)

### 3. Структура данных

**UserPreferences (aggregate root):**

- `userId` (UUID)
- `preferences` (Map<NotifType, Map<Channel, ChannelPreference>>)
- `quietHours` (QuietHours | null)
- `createdAt`, `updatedAt`

**ChannelPreference:**

- `enabled` (boolean)

**NotifType → blockedInQuietHours (правило):**

- `transactional` → `blockedInQuietHours: false`
- `marketing` → `blockedInQuietHours: true`

**QuietHours (value object):**

- `startTime` (string, "HH:mm")
- `endTime` (string, "HH:mm")
- `timezone` (string, IANA timezone)

**GlobalPolicy:**

- `id` (string)
- `notifType` (NotifType)
- `channel` (Channel)
- `region` (Region)
- `blocked` (boolean)
- `reason` (string)

### 4. Правила принятия решений

**Приоритет при проверке возможности отправки:**

1. **Global Policy** - если глобальная политика запрещает → `deny`
2. **User Preference** - если пользователь отключил → `deny`
3. **Default Preference** - если дефолт выключен → `deny`
4. **Quiet Hours** - если в quiet hours и `blockedInQuietHours` = true для NotifType → `deny`
5. Иначе → `allow`

**Таблица решений:**

| Global Policy | User Pref | Quiet Hours | blockedInQuietHours | Decision |
| ------------- | --------- | ----------- | ------------------- | -------- |
| blocked       | any       | any         | any                 | deny     |
| allowed       | disabled  | any         | any                 | deny     |
| allowed       | enabled   | true        | true                | deny     |
| allowed       | enabled   | false       | any                 | allow    |
| allowed       | enabled   | true        | false               | allow    |

### 5. Конфигурация по умолчанию

**Default Preferences (hardcoded):**

```typescript
const DEFAULT_PREFERENCES = {
  transactional: {
    email: { enabled: true },
    sms: { enabled: true },
    push: { enabled: true },
    messenger: { enabled: true },
  },
  marketing: {
    email: { enabled: false },
    sms: { enabled: false },
    push: { enabled: false },
    messenger: { enabled: false },
  },
};
```

**Global Policies (hardcoded):**

```typescript
const GLOBAL_POLICIES = [
  {
    id: 'gdpr-marketing-sms',
    notifType: 'marketing',
    channel: 'sms',
    region: 'EU',
    blocked: true,
    reason: 'GDPR compliance - marketing SMS blocked in EU',
  },
  {
    id: 'gdpr-marketing-push',
    notifType: 'marketing',
    channel: 'push',
    region: 'EU',
    blocked: true,
    reason: 'GDPR compliance - marketing push blocked in EU',
  },
];
```

### 6. API Design

**Endpoints:**

1. `GET /users/:userId/preferences`
   - Response: UserPreferences DTO

2. `POST /users/:userId/preferences`
   - Body: UpdatePreferencesRequest
   - Поддержка idempotency через idempotency key

3. `POST /evaluate`
   - Body: EvaluateRequest
   - Response: EvaluateResponse

**DTOs:**

```typescript
// UpdatePreferencesRequest
{
  preferences?: {
    [notifType in NotifType]?: {
      [channel in Channel]?: {
        enabled?: boolean;
      };
    };
  };
  quietHours?: {
    startTime: string;
    endTime: string;
    timezone: string;
  } | null;
}

// EvaluateRequest
{
  userId: string;
  notifType: NotifType;
  channel: Channel;
  region: Region;
  datetime: string; // ISO 8601
}

// EvaluateResponse
{
  decision: 'allow' | 'deny';
  reason?: string;
}
```

### 7. Idempotency

Реализация идемпотентности:

- PATCH-семантика для обновления настроек
- Текущее состояние сравнивается с запрошенным
- Если состояние уже соответствует запросу → no-op, возврат 200 OK
- Использование optimistic locking через version field (опционально)

### 8. База данных

**Таблицы:**

```sql
CREATE TABLE user_preferences (
  user_id UUID PRIMARY KEY,
  preferences JSONB NOT NULL,
  quiet_hours JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Индексы
CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);
```

JSONB используется для гибкости схемы preferences и quiet_hours.

### 9. Обработка таймзон

- Использование IANA timezone identifiers (Europe/Moscow, America/New_York)
- Библиотека: `date-fns-tz` или `luxon`
- Конвертация времени quiet hours в UTC для сравнения

### 10. Observability

**Logging:**

- Structured logging (JSON format)
- Логирование: изменения настроек, решения allow/deny
- Correlation IDs для трассировки запросов

**Metrics (подготовка):**

- Counter: `notifications_evaluated_total{decision="allow|deny"}`
- Counter: `preferences_updated_total`
- Histogram: `evaluate_duration_seconds`

## Consequences

### Positive

- Четкое разделение ответственности между слоями
- Гибкая схема preferences через JSONB
- Понятные правила приоритизации
- Idempotent API операции
- Легко расширяется новыми типами уведомлений

### Negative

- JSONB не валидируется на уровне БД (нужна валидация в коде)
- Hardcoded политики менее гибкие чем БД-решение
- Нет UI для администрирования политик

### Risks

- При масштабировании может потребоваться кэширование preferences
- JSONB может усложнить миграцию данных

## Alternatives Considered

1. **Relational schema для preferences** - отклонено: слишком много таблиц для простых key-value данных
2. **Global policies в БД** - отклонено: для MVP достаточно hardcoded, упрощает разработку
3. **Event-sourcing** - отклонено: over-engineering для текущих требований

## Implementation Notes

1. Начать с доменных типов и value objects
2. Реализовать repository interface и in-memory реализацию для тестов
3. Создать TypeORM entities и persistence layer
4. Реализовать use cases
5. Добавить HTTP controllers с валидацией
6. Написать тесты

## Related

- [PRD](./PRD.txt)
