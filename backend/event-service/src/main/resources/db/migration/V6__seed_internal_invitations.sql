-- V6: Seed invitations internes de demonstration (sans donnees TEST/E2E).

INSERT INTO event_invitations (
    id,
    event_id,
    invited_username,
    invited_email,
    invited_display_name,
    invited_by_username,
    invited_by_display_name,
    message,
    status,
    response_reason,
    responded_at,
    expires_at,
    created_at,
    updated_at
)
SELECT
    '33333333-3333-3333-3333-333333331001'::uuid,
    e.id,
    'employe.cnstn',
    'employe@cnstn.tn',
    'Employe CNSTN',
    'admin.cnstn',
    'Admin CNSTN',
    'Invitation interne pour la session cyber.',
    'PENDING',
    NULL,
    NULL,
    NOW() + INTERVAL '10 days',
    NOW(),
    NOW()
FROM events e
WHERE e.id = '22222222-2222-2222-2222-222222221002'::uuid
ON CONFLICT (event_id, invited_username) DO NOTHING;

INSERT INTO event_invitations (
    id,
    event_id,
    invited_username,
    invited_email,
    invited_display_name,
    invited_by_username,
    invited_by_display_name,
    message,
    status,
    response_reason,
    responded_at,
    expires_at,
    created_at,
    updated_at
)
SELECT
    '33333333-3333-3333-3333-333333331002'::uuid,
    e.id,
    'chef.cnstn',
    'chef@cnstn.tn',
    'Chef Hierarchique',
    'admin.cnstn',
    'Admin CNSTN',
    'Validation de présence confirmée.',
    'ACCEPTED',
    NULL,
    NOW() - INTERVAL '1 day',
    NOW() + INTERVAL '10 days',
    NOW() - INTERVAL '2 days',
    NOW() - INTERVAL '1 day'
FROM events e
WHERE e.id = '22222222-2222-2222-2222-222222221001'::uuid
ON CONFLICT (event_id, invited_username) DO NOTHING;
