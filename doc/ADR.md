# ADR: Notification Preferences Service Architecture

## Status

Approved!

## Context

Необходимо реализовать сервис управления предпочтениями уведомлений для платформы с несколькими каналами доставки (email, SMS, мессенджеры, пуши). Сервис должен быть единым источником правды для остальных компонентов платформы.

## Decision

### 1. Архитектура приложения

**NestJS модульная структура:**

```
src/
├── modules/
│   └── preferences/           # Модуль предпочтений
│       ├── preferences.controller.ts
│       ├── preferences.service.ts
│       ├── preferences.module.ts
│       ├── dto/
│       │   ├── update-preferences.dto.ts
│       │   ├── evaluate-request.dto.ts
│       │   └── evaluate-response.dto.ts
│       ├── entities/
│       │   └── user-preferences.entity.ts
│       └── types/
│           ├── channel.enum.ts
│           ├── region.enum.ts
│           ├── notif-type.enum.ts
│           └── global-policies.ts
├── common/
│   ├── types/                 # Общие типы
│   └── utils/                 # Утилиты
├── config/
│   └── configuration.ts
├── database/
│   ├── data-source.ts
│   └── migrations/
├── app.module.ts
└── main.ts
```

**Почему NestJS модули вместо DDD слоёв:**

- Сервис простой - 3 endpoint'а, 1 агрегат
- NestJS модули уже обеспечивают разделение ответственности
- Меньше boilerplate кода
- Следует конвенциям фреймворка
- Легче навигация по коду

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
3. **Quiet Hours** - если в quiet hours и `blockedInQuietHours` = true для NotifType → `deny`
4. Иначе → `allow`

> Примечание: Default preferences не проверяются отдельно, так как они присваиваются пользователю при создании и становятся его user preferences.

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
   - Идемпотентность через сравнение текущего и запрошенного состояния

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

Реализация идемпотентности без idempotency key:

- POST с body, содержащим только изменяемые поля
- Текущее состояние сравнивается с запрошенным
- Если состояние уже соответствует запросу → no-op, возврат 200 OK
- Результат одинаковый при повторных запросах

Пример:

```typescript
// Запрос: отключить marketing_email
POST /users/123/preferences
{ "preferences": { "marketing": { "email": { "enabled": false } } } }

// Если уже disabled → возвращаем 200 OK без изменений
// Если enabled → обновляем и возвращаем 200 OK
```

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
- Библиотека: `date-fns-tz`
- Конвертация времени quiet hours в UTC для сравнения

### 10. Observability

**Logging:**

- Structured logging (JSON format)
- Логирование: изменения настроек, решения allow/deny

**Metrics (подготовка):**

- Counter: `notifications_evaluated_total{decision="allow|deny"}`
- Counter: `preferences_updated_total`
- Histogram: `evaluate_duration_seconds`

## Consequences

### Positive

- Простая структура - легко понять и поддерживать
- Следует конвенциям NestJS - любой разработчик разберётся
- Меньше boilerplate кода
- Гибкая схема preferences через JSONB
- Понятные правила приоритизации
- Idempotent API операции

### Negative

- JSONB не валидируется на уровне БД (нужна валидация в коде)
- Hardcoded политики менее гибкие чем БД-решение (можно улучшить в дальнейшем)
- Нет API и UI для администрирования политик

### Risks

- При масштабировании может потребоваться кэширование preferences
- JSONB может усложнить миграцию данных

## Alternatives Considered

1. **Full DDD с разделением на слои** - отклонено: over-engineering для сервиса с 3 endpoint'ами
2. **Relational schema для preferences** - отклонено: слишком много таблиц для простых key-value данных
3. **Global policies в БД** - отклонено: для MVP достаточно hardcoded, упрощает разработку
4. **Event-sourcing** - отклонено: over-engineering для текущих требований

## Implementation Notes

1. Создать enums: Channel, Region, NotifType
2. Создать TypeORM entity: UserPreferences
3. Реализовать PreferencesService с бизнес-логикой
4. Создать DTOs с валидацией через class-validator
5. Реализовать PreferencesController
6. Написать unit-тесты для service
7. Написать e2e-тесты для controller

## Related

- [PRD](./PRD.txt)

## Возможные улучшения в будущем

- Управление глобальными политиками (API, UI)
- Управление default user preferences (API, UI)
- Расширение возможностей по настройке quiet hours - чтобы можно было настраивать по каналам связи (если это нужно бизнесу)
