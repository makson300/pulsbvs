# Пульс БВС — контракт API будущего backend v1

**Статус:** проектный контракт, backend не реализован.

Этот документ задаёт минимальный API первого пилота. Он основан на локальном прототипе из `src/domain/fleet.ts` (`DroneAsset`, `BatteryAsset`, `SavedTelemetryImport`, ручные записи операций и `FleetState`), но не переносит его технические ограничения в production-контур.

## 1. Границы и принципы

- Все бизнес-данные принадлежат одной `organization`; доступ за её границы запрещён.
- `localStorage` — только демо-хранилище. Он не является источником истины и не хранит оригиналы файлов.
- Сервер создаёт неизменяемую запись импорта, хранит метаданные оригинала и журнал аудита.
- Поддерживаемые frontend-источники — CSV/TXT и KML. Это не означает, что любой CSV/TXT имеет подтверждённую схему конкретной DJI-модели.
- DAT/ZIP/JSON могут быть загружены для учёта оригинала и карточки происхождения, но имеют терминальный статус `unsupported` до появления подтверждённого чтения формата и схемы. Для них нельзя создавать полёты, точки телеметрии, батарейные оценки или алерты.
- KML — маршрутный источник. Он не даёт основания для состояния батареи без фактически доступной батарейной телеметрии.
- Каждый аналитический результат содержит версию парсера и профиля правил, перечень фактически использованных полей, качество и ограничения.

## 2. Общие соглашения

### Идентификаторы и время

- Все `id` — UUID в строковом представлении.
- Временные поля — ISO 8601 в UTC, например `2026-07-30T09:10:00Z`.
- Денежные, процентные и физические значения передаются числами; единица указывается именем поля либо явным полем `unit`.
- API использует JSON UTF-8; загрузка оригинала — `multipart/form-data`.

### Авторизация и область организации

После реализации аутентификации идентичность пользователя берётся только из серверной сессии/токена. `organization_id` не принимается от клиента в теле запроса: активная организация определяется сервером. Глобальному администратору и будущему переключателю организаций потребуется отдельный контракт.

Роли первого пилота:

| Роль | Права |
| --- | --- |
| `owner` | организация, пользователи, все активы и экспорт |
| `engineer` | активы, импорты, алерты и задачи ТО |
| `pilot` | просмотр разрешённых активов, создание импортов |
| `observer` | только чтение |

Точная модель приглашений, восстановления доступа и разграничения по площадкам — вне v1 и должна быть отдельным ADR/контрактом до реализации.

### Успешные ответы и списки

Одиночный ресурс возвращается непосредственно JSON-объектом. Коллекции имеют вид:

```json
{
  "items": [],
  "next_cursor": null
}
```

Списки поддерживают `limit` (по умолчанию 50, максимум 100) и непрозрачный `cursor`. Фильтры передаются в query string.

### Ошибки

```json
{
  "error": {
    "code": "MALFORMED_TELEMETRY",
    "message": "Не удалось прочитать табличные данные: отсутствует строка заголовков.",
    "details": [
      { "field": "file", "reason": "headers_missing" }
    ],
    "request_id": "uuid"
  }
}
```

Минимальные коды:

| HTTP | Код | Значение |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | неверные параметры или тело запроса |
| 401 | `UNAUTHENTICATED` | нет действующей сессии |
| 403 | `FORBIDDEN` | роль не даёт доступ |
| 404 | `NOT_FOUND` | ресурс отсутствует в активной организации |
| 409 | `CONFLICT` | конфликт уникальности или версии |
| 413 | `FILE_TOO_LARGE` | превышен лимит, определяемый развёртыванием |
| 415 | `MEDIA_TYPE_NOT_ALLOWED` | тип файла не разрешён политикой |
| 422 | `MALFORMED_TELEMETRY` | файл прочитан, но схема/данные некорректны |
| 422 | `REQUIRED_TELEMETRY_FIELDS_MISSING` | недостаточно полей для запрошенного вида анализа |
| 500 | `IMPORT_PROCESSING_FAILED` | непредвиденная ошибка обработки; детали не раскрывают внутренности |

## 3. Ресурсы

### Organization

```json
{
  "id": "uuid",
  "name": "АгроСфера",
  "created_at": "2026-07-30T09:00:00Z",
  "updated_at": "2026-07-30T09:00:00Z"
}
```

- `GET /v1/organization` — получить активную организацию.
- `PATCH /v1/organization` — изменить `name`; роль `owner`.

Создание организации и приглашения пользователей зависят от выбранной модели аутентификации и не должны реализовываться до её ADR.

### User

```json
{
  "id": "uuid",
  "organization_id": "uuid",
  "email": "operator@example.invalid",
  "display_name": "Иван Петров",
  "role": "engineer",
  "status": "active",
  "created_at": "2026-07-30T09:00:00Z",
  "updated_at": "2026-07-30T09:00:00Z"
}
```

- `GET /v1/users` — список пользователей; роль `owner`.
- `GET /v1/users/me` — текущий пользователь.
- `PATCH /v1/users/{user_id}` — изменить `display_name` или роль; роль `owner`.

Не передавать пароли, ключи, токены и другие секреты ни в одном ответе API.

### Drone

`DroneAsset` является UI-прототипом. В API `health`, `status`, `tone` и строковый `flightHours` не являются вручную вводимым источником истины: они должны быть вычисляемыми или явно обозначаться как операторская оценка после появления подтверждённых правил.

```json
{
  "id": "uuid",
  "organization_id": "uuid",
  "name": "Agras T40 №02",
  "manufacturer": "DJI",
  "model": "Agras T40",
  "serial_number": null,
  "status": "active",
  "notes": null,
  "created_at": "2026-07-30T09:00:00Z",
  "updated_at": "2026-07-30T09:00:00Z"
}
```

- `GET /v1/drones?status=active`
- `POST /v1/drones`
- `GET /v1/drones/{drone_id}`
- `PATCH /v1/drones/{drone_id}`
- `GET /v1/drones/{drone_id}/telemetry-imports`
- `GET /v1/drones/{drone_id}/flights`

Создание:

```json
{
  "name": "Agras T40 №02",
  "manufacturer": "DJI",
  "model": "Agras T40",
  "serial_number": null,
  "notes": "Пилотный актив"
}
```

`serial_number` необязателен и относится к чувствительным эксплуатационным данным; его видимость и маскирование требуют политики доступа до production.

### Battery

`BatteryAsset.label`, `cycles` и демонстрационные поля состояния являются прототипом. Реальный счётчик циклов должен иметь источник и время актуальности; он не должен без доказательства перезаписываться произвольным логом.

```json
{
  "id": "uuid",
  "organization_id": "uuid",
  "label": "BT-009",
  "manufacturer": "DJI",
  "model": null,
  "serial_number": null,
  "status": "active",
  "cycle_count": null,
  "cycle_count_source": null,
  "cycle_count_observed_at": null,
  "notes": null,
  "created_at": "2026-07-30T09:00:00Z",
  "updated_at": "2026-07-30T09:00:00Z"
}
```

- `GET /v1/batteries?status=active`
- `POST /v1/batteries`
- `GET /v1/batteries/{battery_id}`
- `PATCH /v1/batteries/{battery_id}`
- `GET /v1/batteries/{battery_id}/telemetry-imports`
- `GET /v1/batteries/{battery_id}/flights`
- `GET /v1/batteries/{battery_id}/risk-alerts`
- `GET /v1/batteries/{battery_id}/maintenance-tasks`

## 4. Импорт и оригинал журнала

### Модель telemetry import

```json
{
  "id": "uuid",
  "organization_id": "uuid",
  "drone_id": "uuid",
  "battery_id": "uuid",
  "source_name": "flight.csv",
  "source_kind": "csv",
  "status": "analyzed",
  "original_file": {
    "storage_key": "organizations/uuid/imports/uuid/original",
    "sha256": "hex-digest",
    "byte_size": 18432,
    "media_type": "text/csv",
    "received_at": "2026-07-30T09:10:00Z"
  },
  "source_context": {
    "declared_source": "телефон пилота",
    "flight_date_note": "30.07, утро",
    "scenario_note": "проверочный полёт",
    "hidden_data_note": "скрыты точные координаты и имя пилота"
  },
  "parser": {
    "name": "generic-csv",
    "version": "not-yet-implemented",
    "schema_version": null
  },
  "created_by_user_id": "uuid",
  "created_at": "2026-07-30T09:10:00Z",
  "updated_at": "2026-07-30T09:10:04Z"
}
```

`storage_key` — внутренний идентификатор, не публичный URL. Ссылка на скачивание оригинала выдаётся отдельным авторизованным действием, фиксируется в аудите и подчиняется политике хранения.

### Статусы и допустимые переходы

| Статус | Значение | Следующий статус |
| --- | --- | --- |
| `uploaded` | оригинал принят и зафиксирован | `parsing`, `unsupported`, `failed` |
| `parsing` | очередь/воркер читает файл | `parsed`, `unsupported`, `failed` |
| `parsed` | синтаксис и нормализация получены | `analyzed`, `failed` |
| `analyzed` | сохранены факты, качество и допустимые результаты анализа | терминальный |
| `unsupported` | файл сохранён как оригинал, но декодер/схема не подтверждены | терминальный |
| `failed` | обработка завершилась ошибкой | терминальный; повтор — новым импортом |

Нельзя перескакивать к `analyzed` для `unsupported`, маршрутизировать DAT/ZIP в универсальный CSV-парсер или создавать по ним полёты и алерты.

### Загрузка

`POST /v1/telemetry-imports` — `multipart/form-data`.

| Поле | Обязательное | Описание |
| --- | --- | --- |
| `file` | да | исходный файл |
| `drone_id` | да | существующий дрон активной организации |
| `battery_id` | нет | существующая батарея активной организации; отсутствие допустимо для маршрутного источника |
| `source_context` | нет | JSON с операторскими фактами о происхождении; не подменяет данные файла и не запускает аналитику само по себе |

Пример `source_context`:

```json
{
  "declared_source": "телефон пилота",
  "flight_date_note": "30.07, утро",
  "scenario_note": "проверочный полёт",
  "hidden_data_note": "скрыты точные координаты и имя пилота"
}
```

`source_context` соответствует frontend-карточке первого файла. Поля свободные текстовые, проходят обычные ограничения длины и маскирование в аудит-логах. Они помогают проследить происхождение файла, но не считаются фактической телеметрией и не повышают уровень доверия к анализу без подтверждённых данных внутри файла.

Ответ на допустимый CSV/TXT/KML до завершения фоновой обработки:

```json
{
  "id": "uuid",
  "status": "uploaded",
  "source_kind": "csv",
  "drone_id": "uuid",
  "battery_id": "uuid",
  "created_at": "2026-07-30T09:10:00Z"
}
```

Успешный ответ `201 Created` на DAT/ZIP/JSON:

```json
{
  "id": "uuid",
  "status": "unsupported",
  "source_kind": "unsupported",
  "source_context": {
    "declared_source": "телефон пилота",
    "flight_date_note": "30.07, утро",
    "scenario_note": "проверочный полёт",
    "hidden_data_note": "скрыты точные координаты и имя пилота"
  },
  "reason": {
    "code": "FILE_READING_NOT_CONFIRMED",
    "message": "Файл сохранён как оригинал, но чтение этого формата ещё не подтверждено. Аналитика не выполнена."
  }
}
```

`unsupported` — состояние созданного ресурса, а не HTTP-ошибка: оригинал сохранён и доступен по правилам организации, но аналитика намеренно не запускалась.

`GET /v1/telemetry-imports?drone_id=&battery_id=&status=&source_kind=` — история импортов.

`GET /v1/telemetry-imports/{import_id}` — статус, метаданные, результаты качества, анализа и связанные сущности.

`GET /v1/telemetry-imports/{import_id}/original-download` — одноразовая или короткоживущая ссылка только после проверки прав. Механизм подписи выбирается реализацией и не должен утекать в логи.

`GET /v1/telemetry-imports/{import_id}/telemetry-points?limit=&cursor=` — нормализованные точки только для `analyzed` импорта. Без поддержки неизвестных источников.

### Результат parsing и data quality

```json
{
  "source_kind": "csv",
  "detected_columns": ["timestamp", "pack_voltage", "cell1"],
  "missing_core_fields": ["coordinates"],
  "normalization": {
    "accepted_points": 120,
    "rejected_rows": 2,
    "field_units": {
      "pack_voltage": "V",
      "battery_temperature": "C"
    }
  },
  "quality": {
    "score": 63,
    "level": "medium",
    "available": ["Время", "Напряжение пакета"],
    "missing": ["Координаты", "Напряжения ячеек"],
    "notes": ["Мало точек телеметрии: выводы предварительные."]
  },
  "limitations": [
    "Напряжения ячеек отсутствуют: разбаланс не оценивается."
  ]
}
```

Уровни `low`, `medium`, `high` в API намеренно машинные. Клиент может локализовать их; текущие русские значения frontend (`низкое`, `среднее`, `высокое`) остаются UI-деталью.

## 5. Flight и нормализованная телеметрия

Полёт создаётся только если импорт завершён `analyzed` и его источник действительно позволяет выделить границы полёта. Один импорт может не создать ни одного полёта или позже поддержать несколько полётов — это зависит от подтверждённой схемы источника.

```json
{
  "id": "uuid",
  "organization_id": "uuid",
  "telemetry_import_id": "uuid",
  "drone_id": "uuid",
  "battery_id": "uuid",
  "started_at": "2026-07-30T09:00:00Z",
  "ended_at": "2026-07-30T09:06:00Z",
  "summary": {
    "points": 120,
    "duration_min": 6,
    "battery_start_percent": 94,
    "battery_end_percent": 86,
    "min_pack_voltage_v": 49.8,
    "max_battery_temperature_c": 36,
    "max_cell_deviation_v": 0.02
  },
  "created_at": "2026-07-30T09:10:04Z"
}
```

- `GET /v1/flights?drone_id=&battery_id=&from=&to=`
- `GET /v1/flights/{flight_id}`
- `GET /v1/flights/{flight_id}/telemetry-points?fields=timestamp,pack_voltage&limit=`

Нормализованная точка не должна содержать предположительно расшифрованные поля:

```json
{
  "timestamp": "2026-07-30T09:00:00Z",
  "latitude": 55.7512,
  "longitude": 37.6184,
  "altitude_m": 180,
  "speed_mps": 8.1,
  "battery_percent": 94,
  "pack_voltage_v": 51.2,
  "battery_current_a": null,
  "battery_temperature_c": 32,
  "cell_voltages_v": [4.18, 4.17, 4.18, 4.17],
  "source_fields": ["timestamp", "pack_voltage", "cell1", "cell2", "cell3", "cell4"]
}
```

## 6. Результат оценки и risk alert

`RiskAlert` переносит текущий тип из `src/analytics/batteryRisk.ts`, но становится сохранённым фактом анализа. `BATTERY_DEVICE_ERROR` запрещён, пока реальный источник не подтвердит точные коды/значения/единицы поля предупреждений.

```json
{
  "id": "uuid",
  "organization_id": "uuid",
  "telemetry_import_id": "uuid",
  "flight_id": "uuid",
  "drone_id": "uuid",
  "battery_id": "uuid",
  "code": "BATTERY_OVERHEAT",
  "severity": "critical",
  "status": "open",
  "title": "Перегрев батареи",
  "detail": "Температура батареи достигла 50 °C.",
  "recommendation": "Прекратите эксплуатацию и выполните проверку.",
  "evidence": {
    "used_fields": ["battery_temperature"],
    "observed_values": { "max_battery_temperature_c": 50 },
    "parser_version": "t40-adapter/not-implemented",
    "rule_profile_version": "t40/not-implemented",
    "confidence": "medium",
    "limitations": ["Источник поля и единицы ещё должны быть подтверждены реальным образцом."]
  },
  "created_at": "2026-07-30T09:10:04Z",
  "updated_at": "2026-07-30T09:10:04Z"
}
```

- `GET /v1/risk-alerts?status=open&severity=critical&battery_id=`
- `GET /v1/risk-alerts/{alert_id}`
- `PATCH /v1/risk-alerts/{alert_id}` — разрешены `status` (`open`, `acknowledged`, `resolved`, `dismissed`) и `resolution_note`; изменение фиксируется в аудите.

Создание и закрытие алерта не означает автоматическое решение о допуске к полёту.

## 7. Maintenance task

```json
{
  "id": "uuid",
  "organization_id": "uuid",
  "target_type": "battery",
  "target_id": "uuid",
  "risk_alert_id": "uuid",
  "title": "Диагностика батареи BT-021",
  "description": "Создано по критическому разбалансу ячеек.",
  "priority": "critical",
  "status": "open",
  "due_at": "2026-07-31T09:00:00Z",
  "assignee_user_id": "uuid",
  "resolution_note": null,
  "created_at": "2026-07-30T09:10:04Z",
  "updated_at": "2026-07-30T09:10:04Z",
  "closed_at": null
}
```

- `GET /v1/maintenance-tasks?status=open&target_type=battery&assignee_user_id=`
- `POST /v1/maintenance-tasks`
- `GET /v1/maintenance-tasks/{task_id}`
- `PATCH /v1/maintenance-tasks/{task_id}`

Создание вручную:

```json
{
  "target_type": "battery",
  "target_id": "uuid",
  "risk_alert_id": null,
  "title": "Контрольный осмотр",
  "description": "Внешний осмотр перед сезоном.",
  "priority": "normal",
  "due_at": "2026-08-01T09:00:00Z",
  "assignee_user_id": "uuid"
}
```

Статусы: `open`, `in_progress`, `completed`, `cancelled`. При `completed` обязательны `resolution_note` и `closed_at`; вложения и подтверждающие документы требуют отдельной модели файлов.

## 8. Ручной операционный учёт и отдельный журнал полётов

Локальный прототип уже включает паспорта активов, задачи, события, документы, ручные записи вылетов и два чек-листа. В серверном контуре они остаются отдельными от `telemetry_import` и `flight`: ручная запись не создаёт точки телеметрии, батарейные оценки или алерты.

Минимальные ресурсы будущего API: `asset_passport`, `incident`, `document_record`, `manual_flight`, `checklist_run`.

- `asset_passport` хранит вручную введённые учётный/серийный номер, владельца, дату приобретения и заметку для `drone` или `battery`.
- `incident` хранит серьёзность, дату, описание, статус `open`/`resolved`, связанный актив и автора записи.
- `document_record` хранит метаданные и срок действия; оригинал документа требует отдельного защищённого файлового ресурса, контроля доступа и политики хранения.
- `manual_flight` хранит дату, пилота, задачу, длительность, место, заметку и ссылки на дрон/батарею. Поле `source` обязательно равно `manual`.
- `checklist_run` связан с `manual_flight`, имеет фазу `preflight` или `postflight`, ответы, время подтверждения и автора. Юридически значимая подпись не входит в v1 без согласованных требований.

## 9. Аудит, владение и хранение

Каждая запись выше содержит `organization_id`; его нельзя менять PATCH-операцией. Минимальное событие аудита:

```json
{
  "id": "uuid",
  "organization_id": "uuid",
  "actor_user_id": "uuid",
  "action": "telemetry_import.original_downloaded",
  "entity_type": "telemetry_import",
  "entity_id": "uuid",
  "occurred_at": "2026-07-30T09:15:00Z",
  "metadata": { "request_id": "uuid" }
}
```

Аудируются создание/изменение/удаление активов, загрузка/обработка/скачивание оригинала, смена статуса алерта и задачи ТО, а также операции с пользователями. IP-адреса, технические идентификаторы и срок хранения должны быть ограничены отдельной политикой, а не бесконечно сохраняться по умолчанию.

Удаление данных в v1 не описано как физическое: сначала нужны требования к срокам хранения, legal hold, резервному копированию и on-prem политике.

## 10. Соответствие localStorage-прототипу и отложенные решения

| Frontend-прототип | Backend-ресурс | Существенная разница |
| --- | --- | --- |
| `DroneAsset` | `drone` | нет демонстрационных вычисленных `health`/`tone` как источника истины |
| `BatteryAsset` | `battery` | циклы имеют источник и время наблюдения |
| `SavedTelemetryImport` | `telemetry_import`, `flight`, `risk_alert` | анализ, оригинал и жизненный цикл хранятся отдельно и аудируются |
| `FleetState` | организация и отдельные коллекции | выбор текущего дрона/батареи — состояние UI, не серверная доменная сущность |
| `createSavedImport` | upload + асинхронный import pipeline | неподдерживаемый формат остаётся `unsupported` |
| `upsertImport` | неизменяемая запись импорта | повторная загрузка создаёт новую запись, не перезаписывает прошлый анализ |
| `ManualFlightEntry`, `ChecklistRun` | `manual_flight`, `checklist_run` | ручная запись отделена от телеметрии и требует автора/аудита |
| задачи, события, документы, паспорта | отдельные ресурсы операций | браузерная демо-версия не хранит оригиналы документов и не имеет прав доступа |

Открытые решения до реализации:

1. провайдер аутентификации и жизненный цикл приглашений;
2. пределы размера файла, время обработки и очередь задач;
3. срок хранения оригиналов, резервных копий и допустимое удаление;
4. точная модель площадок/проектов и гранулярные права;
5. утверждённая схема реального источника DJI Agras T40 и профиль правил;
6. формат отчётов и экспортов;
7. правила дедупликации одинаковых оригиналов по SHA-256.
