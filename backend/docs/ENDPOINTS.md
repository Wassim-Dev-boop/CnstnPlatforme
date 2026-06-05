# API Overview (Implemented)

## Auth User Service (`auth-user-service`)

- `GET /api/v1/me`
- `PATCH /api/v1/me/profile`
- `POST /api/v1/password/forgot`
- `POST /api/v1/password/reset`
- `GET /api/v1/admin/users`
- `GET /api/v1/admin/users/{id}`
- `POST /api/v1/admin/users`
- `PUT /api/v1/admin/users/{id}`
- `PUT /api/v1/admin/users/{id}/roles`
- `DELETE /api/v1/admin/users/{id}`
- `GET /api/v1/admin/roles`
- `POST /api/v1/admin/roles`
- `PUT /api/v1/admin/roles/{id}`
- `DELETE /api/v1/admin/roles/{id}`
- `GET /api/v1/admin/departments`
- `POST /api/v1/admin/departments`
- `PUT /api/v1/admin/departments/{id}`
- `DELETE /api/v1/admin/departments/{id}`

## Event Service (`event-service`)

- `GET /api/v1/events`
- `GET /api/v1/events/{id}`
- `POST /api/v1/events`
- `PUT /api/v1/events/{id}/decision`
- `POST /api/v1/events/{id}/partners`
- `GET /api/v1/events/{id}/partners`
- `GET /api/v1/events/{id}/meeting`

## Reservation Service (`reservation-service`)

- `GET /api/v1/rooms`
- `POST /api/v1/rooms`
- `PUT /api/v1/rooms/{id}`
- `DELETE /api/v1/rooms/{id}`
- `GET /api/v1/equipments`
- `POST /api/v1/equipments`
- `PUT /api/v1/equipments/{id}`
- `DELETE /api/v1/equipments/{id}`
- `GET /api/v1/reservations`
- `GET /api/v1/reservations/{id}`
- `POST /api/v1/reservations`
- `GET /api/v1/reservations/conflicts`
- `PUT /api/v1/reservations/{id}/security-validation`

## Intervention Service (`intervention-service`)

- `GET /api/v1/interventions`
- `GET /api/v1/interventions/{id}`
- `POST /api/v1/interventions`
- `PUT /api/v1/interventions/{id}/status`
- `PUT /api/v1/interventions/{id}/validate`

## GED Service (`ged-service`)

- `GET /api/v1/documents`
- `GET /api/v1/documents/{id}`
- `POST /api/v1/documents`
- `PUT /api/v1/documents/{id}/submit`
- `PUT /api/v1/documents/{id}/approve`
- `PUT /api/v1/documents/{id}/publish`

## Notification Service (`notification-service`)

- `GET /api/v1/notifications`
- `POST /api/v1/notifications`
- `PUT /api/v1/notifications/{id}/read`
- `GET /api/v1/notifications/stream` (SSE)
- `POST /internal/v1/emails/send` (interne, API key)
