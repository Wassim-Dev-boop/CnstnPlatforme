CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(120) NOT NULL UNIQUE,
    module VARCHAR(120) NOT NULL,
    action VARCHAR(120) NOT NULL,
    label VARCHAR(160) NOT NULL,
    description VARCHAR(500),
    system_permission BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS permissions_customized BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS user_permissions (
    user_id UUID NOT NULL,
    permission_id UUID NOT NULL,
    PRIMARY KEY (user_id, permission_id),
    CONSTRAINT fk_user_permissions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_permissions_permission FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
);

INSERT INTO permissions(code, module, action, label, description, system_permission)
VALUES
    ('VIEW_USERS_MODULE', 'UTILISATEURS', 'VIEW_MODULE', 'Voir module utilisateurs', 'Afficher ou masquer le module utilisateurs dans le frontend.', TRUE),
    ('VIEW_EVENTS_MODULE', 'EVENEMENTS', 'VIEW_MODULE', 'Voir module evenements', 'Afficher ou masquer le module evenements dans le frontend.', TRUE),
    ('VIEW_GED_MODULE', 'GED', 'VIEW_MODULE', 'Voir module GED', 'Afficher ou masquer le module GED dans le frontend.', TRUE),
    ('VIEW_INTERVENTIONS_MODULE', 'INTERVENTIONS', 'VIEW_MODULE', 'Voir module interventions', 'Afficher ou masquer le module interventions dans le frontend.', TRUE),
    ('VIEW_REPORTS_MODULE', 'RAPPORTS', 'VIEW_MODULE', 'Voir module rapports', 'Afficher ou masquer le module rapports dans le frontend.', TRUE),
    ('CREATE_USER', 'UTILISATEURS', 'CREATE', 'Creer utilisateur', 'Autoriser la creation d utilisateurs.', TRUE),
    ('UPDATE_USER', 'UTILISATEURS', 'UPDATE', 'Modifier utilisateur', 'Autoriser la modification d utilisateurs.', TRUE),
    ('CREATE_EVENT', 'EVENEMENTS', 'CREATE', 'Creer evenement', 'Autoriser la creation d evenements.', TRUE),
    ('VALIDATE_EVENT', 'EVENEMENTS', 'VALIDATE', 'Valider evenement', 'Autoriser la validation d evenements.', TRUE),
    ('PUBLISH_DOCUMENT', 'GED', 'PUBLISH', 'Publier document', 'Autoriser la publication de documents GED.', TRUE),
    ('CHANGE_INTERVENTION_STATUS', 'INTERVENTIONS', 'CHANGE_STATUS', 'Changer statut intervention', 'Autoriser le changement de statut des interventions.', TRUE)
ON CONFLICT (code) DO NOTHING;

INSERT INTO user_roles(user_id, role_id)
SELECT u.id, r.id
FROM users u
JOIN roles r ON r.name = 'EMPLOYE'
WHERE u.username = 'qualite.cnstn'
ON CONFLICT DO NOTHING;
