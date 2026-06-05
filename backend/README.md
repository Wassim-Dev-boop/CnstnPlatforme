# CNSTN Intranet Backend (Spring Cloud + Keycloak)

Monorepo backend microservices pour la plateforme intranet CNSTN.

## Stack

- Java 21
- Spring Boot 3.2.x
- Spring Cloud (Gateway, Config Server, Eureka, OpenFeign, Resilience4j)
- Keycloak 24
- PostgreSQL 16 (une base par microservice)
- Docker Compose

## Conventions Niveau Étudiant (ISET DSI)

- Architecture classique: `controller -> service -> repository`.
- DTO séparés des entités, mappers manuels simples.
- Intégration HTTP backend en style classique (`RestTemplate`), sans patterns complexes inutiles.
- Sécurité explicite avec `@PreAuthorize` par rôle.
- Code orienté lisibilité et maintenabilité pédagogique.

## Modules

- `api-gateway`
- `config-server`
- `discovery-server`
- `auth-user-service`
- `event-service`
- `reservation-service`
- `intervention-service`
- `ged-service`
- `notification-service`

## Sécurité

- Realm Keycloak: `cnstn-intranet`
- Rôles: `ADMIN`, `EMPLOYE`, `CHEF_HIERARCHIQUE`, `RESPONSABLE_SALLE`, `RESPONSABLE_SECURITE`, `DIRECTEUR_DSN`, `RESPONSABLE_QUALITE`
- Chaque microservice est configuré en `OAuth2 Resource Server` et valide le JWT localement.

## Implémentation disponible

Le microservice `auth-user-service` est implémenté avec:

- Entités JPA: `users`, `roles`, `departments`
- DTO + mapper séparés
- Endpoints REST admin + profil utilisateur
- `@PreAuthorize` par rôle exact
- Pagination Spring (`Pageable`) sur les listes
- Gestion globale des exceptions (`ProblemDetail`)
- Synchronisation Keycloak Admin REST API (users + roles)
- Migration Flyway SQL (`snake_case`)

Les autres services métier (`event`, `reservation`, `intervention`, `ged`, `notification`) disposent d'une implémentation backend fonctionnelle alignée backlog (entités, services et endpoints protégés par rôle).

Voir la liste complète des routes:

- `docs/ENDPOINTS.md`
- `docs/postman/CNSTN-Intranet.postman_collection.json`
- `docs/postman/CNSTN-Intranet.local.postman_environment.json`

## Mot de passe oublié (email réel)

- `POST /api/v1/password/forgot` génère un token temporaire et envoie un email réel.
- `POST /api/v1/password/reset` applique le nouveau mot de passe dans Keycloak.
- L'envoi email est géré par `notification-service` via SMTP (`spring.mail.*`).
- En mode Docker local, le projet est configuré pour SMTP Gmail réel (pas de Mailpit).
- Variables recommandées:
  - `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_FROM`
  - `MAIL_SMTP_AUTH=true`, `MAIL_SMTP_STARTTLS_ENABLE=true`, `MAIL_SMTP_STARTTLS_REQUIRED=true`
  - `NOTIFICATION_INTERNAL_API_KEY` (même valeur dans `auth-user-service` et `notification-service`)
  - `PASSWORD_RESET_FRONTEND_URL` (URL de votre écran frontend de reset)

## Invitation partenaire (email réel Gmail)

- `POST /api/v1/events/{id}/partners` enregistre l'invitation et déclenche un email via `notification-service`.
- Si l'envoi SMTP échoue, l'API retourne une erreur (pas de faux succès).

Configuration Gmail conseillée:

1. Copier le modèle d'environnement:

```powershell
Copy-Item .env.example .env
```

2. Dans `.env`, renseigner les vraies valeurs Gmail (compte + app password):

```text
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=your_account@gmail.com
MAIL_PASSWORD=your_gmail_app_password
MAIL_FROM=your_account@gmail.com
MAIL_SMTP_AUTH=true
MAIL_SMTP_STARTTLS_ENABLE=true
MAIL_SMTP_STARTTLS_REQUIRED=true
```

3. Redémarrer les services concernés:

```powershell
docker compose up -d --build notification-service event-service
```

4. Valider l'envoi réel:

```powershell
curl -X POST "http://localhost:8080/api/v1/events/{EVENT_ID}/partners" ^
  -H "Authorization: Bearer {TOKEN}" ^
  -H "Content-Type: application/json" ^
  -d "{\"partnerName\":\"Partenaire Test\",\"partnerEmail\":\"destinataire@gmail.com\"}"
```

Vérifier ensuite dans la boîte Gmail du destinataire.

## Lancement Docker

1. Vérifier que Docker Desktop est démarré.
2. Depuis la racine:

```bash
docker compose up --build
```

Endpoints principaux:

- Gateway: `http://localhost:8080`
- Frontend (dockerisé): `http://localhost:4200`
- Eureka: `http://localhost:8761`
- Config Server: `http://localhost:8888`
- Keycloak: `http://localhost:8090` (admin/admin)

## Exécution des tests

Tests API complets (Postman/Newman):

```bash
newman run docs/postman/CNSTN-Intranet.postman_collection.json -e docs/postman/CNSTN-Intranet.local.postman_environment.json
```

Matrice des rôles (1 test par utilisateur Keycloak):

```powershell
.\scripts\role-matrix-tests.ps1
```

Tests fonctionnels backlog (28 user stories):

```powershell
.\scripts\backlog-functional-tests.ps1
```

Matrice backlog -> endpoints:

- `docs/BACKLOG_TEST_MATRIX.md`

Exécution globale en une seule commande:

```powershell
.\scripts\run-all-tests.ps1
```

Avec validation frontend en plus:

```powershell
.\scripts\run-all-tests.ps1 -WithFrontend
```

## Keycloak import

Le realm est importé automatiquement via:

- `infra/keycloak/realm-export.json`

Utilisateur seed:

- login: `admin.cnstn`
- mot de passe: `Admin@12345`

## Notes

- Le dossier `config-repo/` est prêt pour Spring Cloud Config (backend Git).
- Si nécessaire, initialise `config-repo` en dépôt Git local sur ta machine:

```bash
cd config-repo
git init
git add .
git commit -m "init config"
```
