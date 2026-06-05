# Postman Quick Start

## 1) Import

- `CNSTN-Intranet.postman_collection.json`
- `CNSTN-Intranet.local.postman_environment.json`

## 2) Démarrage backend

Depuis la racine du projet:

```bash
docker compose up --build
```

## 3) Ordre recommandé d'exécution

1. `00 - Auth (Keycloak Tokens)`
2. `01 - Auth User Service (ADMIN)`
3. `02 - Event Service`
4. `03 - Reservation Service`
5. `04 - Intervention Service`
6. `05 - GED Service`
7. `06 - Notification Service`

Les IDs (`departmentId`, `eventId`, etc.) et tokens sont automatiquement stockés dans l'environnement par les scripts de test Postman.

## 4) Comptes Keycloak de test (realm import)

- `admin.cnstn / Admin@12345`
- `employe.cnstn / User@12345`
- `chef.cnstn / User@12345`
- `salle.cnstn / User@12345`
- `securite.cnstn / User@12345`
- `directeur.cnstn / User@12345`
- `qualite.cnstn / User@12345`

Client de token Postman:

- `cnstn-postman` (public + direct access grants)
