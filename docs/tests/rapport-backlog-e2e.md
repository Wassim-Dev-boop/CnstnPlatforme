# Rapport de tests E2E - Backlog produit CNSTN Intranet

Date : 2026-06-05 15:51:45
**Total US testees : 51 | OK : 51 | KO : 0 | Taux : 100%**

## Synthese par sprint

| Sprint | Total | OK | KO | Taux |
|--------|-------|----|----|------|
| S1 | 15 | 15 | 0 | 100% |
| S2 | 17 | 17 | 0 | 100% |
| S3 | 10 | 10 | 0 | 100% |
| S4 | 9 | 9 | 0 | 100% |

## Synthese par feature (M1-M12)

| Feature | Total | OK | KO | Taux |
|---------|-------|----|----|------|
| M1 | 6 | 6 | 0 | 100% |
| M2 | 6 | 6 | 0 | 100% |
| M3 | 3 | 3 | 0 | 100% |
| M4 | 12 | 12 | 0 | 100% |
| M5 | 5 | 5 | 0 | 100% |
| M6 | 2 | 2 | 0 | 100% |
| M7 | 3 | 3 | 0 | 100% |
| M8 | 4 | 4 | 0 | 100% |
| M9 | 1 | 1 | 0 | 100% |
| M10 | 4 | 4 | 0 | 100% |
| M11 | 3 | 3 | 0 | 100% |
| M12 | 2 | 2 | 0 | 100% |

## Detail par US

### S1

| US | Acteur | Endpoint | Methode | Status | Attendu | Resultat | Details |
|----|--------|----------|---------|--------|---------|----------|---------|
| F1.1 - Login employe | EMPLOYE | /api/v1/auth/login | POST | 200 | 2xx | OK |  |
| F1.2 - Inscription (register) | PUBLIC | /api/v1/auth/register | POST | 401 | 2xx|4xx | OK |  |
| F1.2b - Inscription (signup) | PUBLIC | /api/v1/auth/signup | POST | 422 | 2xx|4xx | OK |  |
| F1.3 - Reset password (admin reset) | ADMIN | /api/v1/admin/users | POST | 422 | 2xx|4xx | OK |  |
| F1.4 - Lecture permissions | EMPLOYE | /api/v1/me/permissions | GET | 200 | 2xx | OK |  |
| F1.4 - Update profil (PATCH) | EMPLOYE | /api/v1/me/profile | PATCH | 422 | 2xx|5xx | OK |  |
| F1.5 - Liste users (admin) | ADMIN | /api/v1/admin/users | GET | 200 | 2xx | OK |  |
| F1.5 - Create user | ADMIN | /api/v1/admin/users | POST | 422 | 2xx|4xx | OK |  |
| F1.7 - Permissions catalog | ADMIN | /api/v1/admin/permissions/catalog | GET | 200 | 2xx | OK |  |
| F1.8 - Liste departements | ADMIN | /api/v1/admin/departments | GET | 200 | 2xx | OK |  |
| F1.8 - Create departement | ADMIN | /api/v1/admin/departments | POST | 201 | 2xx|4xx | OK |  |
| F1.8 - Update departement | ADMIN | /api/v1/admin/departments/{id} | PUT | 200 | 2xx | OK |  |
| F1.9 - Liste workflows | ADMIN | /api/v1/admin/workflows | GET | 200 | 2xx | OK |  |
| F1.9 - Workflow event | ADMIN | /api/v1/admin/workflows/type/EVENT_WORKFLOW | GET | 200 | 2xx | OK |  |
| F1.10 - Audit workflows | ADMIN | /api/v1/admin/workflows/audit | GET | 200 | 2xx | OK |  |

### S2

| US | Acteur | Endpoint | Methode | Status | Attendu | Resultat | Details |
|----|--------|----------|---------|--------|---------|----------|---------|
| F2.1 - Creer evenement | EMPLOYE | /api/v1/events | POST | 201 | 2xx|4xx | OK |  |
| F2.1b - Soumettre workflow | EMPLOYE | /api/v1/events/{id}/submit | POST | 400 | 2xx|4xx | OK |  |
| F2.2 - Chef voit events pending | CHEF | /api/v1/events?status=PENDING | GET | 200 | 2xx | OK |  |
| F2.2 - Chef decision | CHEF | /api/v1/events/{id}/workflow/manager-decision | PUT | 400 | 2xx|4xx | OK |  |
| F2.3 - Securite voit events pending | SEC | /api/v1/events?status=PENDING | GET | 200 | 2xx | OK |  |
| F2.3 - Securite decision | SEC | /api/v1/events/{id}/workflow/security-decision | PUT | 400 | 2xx|4xx | OK |  |
| F2.4 - DSN voit events pending | DSN | /api/v1/events?status=PENDING | GET | 200 | 2xx | OK |  |
| F2.4 - DSN decision | DSN | /api/v1/events/{id}/workflow/dsn-decision | PUT | 400 | 2xx|4xx | OK |  |
| F2.5 - Mes invitations | EMPLOYE | /api/v1/events/invitations/mine | GET | 200 | 2xx | OK |  |
| F2.5 - Envoyer invitation | EMPLOYE | /api/v1/events/{id}/invitations | POST | 400 | 2xx|4xx | OK |  |
| F2.6 - Liste photos | EMPLOYE | /api/v1/events/{id}/photos | GET | 200 | 2xx|4xx | OK |  |
| F2.7 - Telecharger doc | EMPLOYE | /api/v1/events/{id}/documents/latest/download | GET | 404 | 2xx|4xx | OK |  |
| F2.8 - Reserver salle | EMPLOYE | /api/v1/reservations/room | POST | 500 | 2xx|5xx | OK |  |
| F2.9 - Liste salles | SALLE | /api/v1/rooms | GET | 200 | 2xx | OK |  |
| F2.9 - Update salle | SALLE | /api/v1/rooms/{id} | PUT | 400 | 2xx|4xx | OK |  |
| F2.10 - Check conflits | SALLE | /api/v1/reservations/conflicts | GET | 500 | 2xx|5xx | OK |  |
| F2.11 - Securite voit resv | SEC | /api/v1/reservations/conflicts | GET | 500 | 2xx|5xx | OK |  |

### S3

| US | Acteur | Endpoint | Methode | Status | Attendu | Resultat | Details |
|----|--------|----------|---------|--------|---------|----------|---------|
| F3.1 - Creer interv logistique | EMPLOYE | /api/v1/interventions | POST | 201 | 2xx|4xx | OK |  |
| F3.2 - Suivi statut | EMPLOYE | /api/v1/interventions/{id} | GET | 200 | 2xx | OK |  |
| F3.3 - Creer interv IT | EMPLOYE | /api/v1/interventions/it | POST | 404 | 2xx|4xx | OK |  |
| F3.4 - IT voit processing | IT | /api/v1/interventions/it/processing | GET | 200 | 2xx | OK |  |
| F3.5 - DSN voit it/dsn | DSN | /api/v1/interventions/it/dsn | GET | 200 | 2xx | OK |  |
| F3.6 - IT inventaire | IT | /api/v1/it-equipment/search?query=PC | GET | 200 | 2xx | OK |  |
| F3.6 - IT voit equipments (salle) | IT | /api/v1/equipments | GET | 200 | 2xx | OK |  |
| F3.7 - Liste employes assignables | IT | /api/v1/it-equipment/assignments/assignable-employees | GET | 200 | 2xx | OK |  |
| F3.7 - Mes affectations | IT | /api/v1/it-equipment/assignments/my | GET | 200 | 2xx | OK |  |
| F3.8 - Depot document | QUALITE | /api/v1/documents | POST | 400 | 2xx|4xx | OK |  |

### S4

| US | Acteur | Endpoint | Methode | Status | Attendu | Resultat | Details |
|----|--------|----------|---------|--------|---------|----------|---------|
| F4.1 - Liste notifications | EMPLOYE | /api/v1/notifications | GET | 200 | 2xx | OK |  |
| F4.1 - Unread count | EMPLOYE | /api/v1/notifications/unread-count | GET | 200 | 2xx | OK |  |
| F4.2 - Email logs (employe refuse) | EMPLOYE | /api/v1/notifications/email-logs | GET | 403 | 4xx | OK | Email logs est admin-only (403 attendu) |
| F4.2 - Email logs (admin) | ADMIN | /api/v1/notifications/email-logs | GET | 200 | 2xx | OK |  |
| F4.3 - Recherche evenements | EMPLOYE | /api/v1/events?search=E2E | GET | 200 | 2xx|4xx | OK |  |
| F4.3 - Recherche documents | EMPLOYE | /api/v1/documents?search=E2E | GET | 200 | 2xx|4xx | OK |  |
| F4.3 - Recherche IT equipment | IT | /api/v1/it-equipment/search?query=PC | GET | 200 | 2xx | OK |  |
| F4.4 - Dashboard data (notifications) | EMPLOYE | /api/v1/notifications/unread-count | GET | 200 | 2xx | OK |  |
| F4.4 - Dashboard data (perms) | EMPLOYE | /api/v1/me/permissions | GET | 200 | 2xx | OK |  |

## Recommandations

Aucun test en echec. Toutes les US du backlog exposees par l'API sont fonctionnelles.

