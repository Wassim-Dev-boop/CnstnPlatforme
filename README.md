# CNSTN Intranet Platform

Plateforme intranet microservices du Centre National des Sciences et Technologies Nucléaires (CNSTN).

## Stack technique

| Couche | Technologie |
|---|---|
| Frontend | Angular 21 (standalone, signals, control flow) |
| Backend | Java 21 + Spring Boot 3.2.5 + Spring Cloud 2023.0.1 |
| Persistance | PostgreSQL 16 + Flyway (4 services) / JPA `ddl-auto: update` (2 services) |
| Auth | Keycloak 24 (realm `cnstn-intranet`, OIDC + JWT) |
| Infra | Docker Compose, Eureka discovery, Config server, API Gateway (Spring Cloud Gateway) |
| Mail | MailHog (dev) |
| Build | Maven multi-module, npm |

## Microservices (8)

| Service | Port | DB schema | Rôle |
|---|---|---|---|
| `config-server` | 8888 | — | Configuration centralisée |
| `discovery-server` | 8761 | — | Eureka registry |
| `api-gateway` | 8080 | — | Route + filtre JWT |
| `auth-user-service` | 8081 | Flyway | Identité, rôles, équipements IT, départements |
| `event-service` | 8083 | Flyway | Workflow événements (4 étapes) |
| `reservation-service` | 8082 | Flyway | Réservations salles + équipements |
| `ged-service` | 8084 | Flyway | Gestion électronique de documents |
| `intervention-service` | 8085 | JPA | Interventions logistiques + IT |
| `notification-service` | 8086 | JPA | Notifications in-app + email |

## Démarrage rapide

```bash
cd backend
docker compose up -d --build
```

Au premier démarrage, la plateforme initialise :
- PostgreSQL (volume `postgres_data`)
- Keycloak (realm `cnstn-intranet` importé depuis `infra/keycloak/realm-export.json`)
- 49 migrations Flyway (auth, event, ged, reservation)
- Création automatique de 8 comptes de test (voir section "Comptes de test")

URLs :
- Frontend : http://localhost:4200
- API Gateway : http://localhost:8080
- Keycloak admin : http://localhost:8090 (`admin` / `admin`)
- Eureka : http://localhost:8761
- MailHog : http://localhost:8025
- pgAdmin : http://localhost:5050 (`admin@cnstn.tn` / `admin`)

## Comptes de test

Tous les comptes (sauf admin) utilisent le mot de passe `User@12345` :

| Compte | Rôle | Domaine |
|---|---|---|
| `admin.cnstn` | `ADMIN` | `Admin@12345` |
| `employe.cnstn` | `EMPLOYE` | RH |
| `chef.cnstn` | `CHEF_HIERARCHIQUE` | DSI |
| `directeur.cnstn` | `DIRECTEUR_DSN` | DSN |
| `salle.cnstn` | `RESPONSABLE_SALLE` | Logistique |
| `securite.cnstn` | `RESPONSABLE_SECURITE` | Sécurité |
| `qualite.cnstn` | `RESPONSABLE_QUALITE` | Qualité |
| `responsable_it.cnstn` | `RESPONSABLE_IT` | IT |

## Tests E2E

Un script PowerShell teste les 36 US du backlog sur les 4 sprints (51 endpoints HTTP).

```powershell
.\docs\tests\test-backlog-e2e.ps1
```

**Résultat : 51/51 OK (100%)** — voir `docs/tests/rapport-backlog-e2e.md`.

## Structure du repo

```
.
├── backend/                  # 9 services Spring Boot
│   ├── api-gateway/
│   ├── auth-user-service/
│   ├── config-server/
│   ├── discovery-server/
│   ├── event-service/
│   ├── ged-service/
│   ├── intervention-service/
│   ├── notification-service/
│   ├── reservation-service/
│   ├── infra/
│   │   ├── keycloak/         # realm-export.json
│   │   └── postgres/         # init scripts
│   └── docker-compose.yml
├── frontend/                 # Angular 21 app
├── docs/
│   ├── tests/                # E2E PowerShell + rapports
│   └── ...                   # Documentation fonctionnelle
└── .github/
```

## Sécurité

⚠️ Mots de passe en clair (`User@12345`, `Admin@12345`, `admin-cli-secret`) — environnement **dev uniquement**. En production, utiliser des variables d'environnement ou un vault (HashiCorp Vault, AWS Secrets Manager).

## Licence

Projet universitaire — ISET DSI 2026.
