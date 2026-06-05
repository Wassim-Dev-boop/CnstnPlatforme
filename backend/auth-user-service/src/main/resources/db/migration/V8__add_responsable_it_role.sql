-- V8: Default IT equipment categories

-- Insert default IT equipment categories
INSERT INTO it_equipment_categories(name, description, active)
VALUES
    ('PC', 'Ordinateurs de bureau', TRUE),
    ('Ordinateur portable', 'Ordinateurs portables', TRUE),
    ('Imprimante', 'Imprimantes', TRUE),
    ('Scanner', 'Scanners', TRUE),
    ('Écran', 'Écrans et moniteurs', TRUE),
    ('Clavier', 'Claviers', TRUE),
    ('Souris', 'Souris et trackpad', TRUE),
    ('Téléphone IP', 'Téléphones IP', TRUE),
    ('Réseau', 'Équipements réseau (routeur, switch)', TRUE),
    ('Autre', 'Autres équipements IT', TRUE)
ON CONFLICT (name) DO NOTHING;

-- Insert demo IT equipment
INSERT INTO it_equipment(name, serial_number, category_id, brand, model, state, assignment_status, description)
SELECT 
    'PC Bureau DSI-001',
    'DSI-PC-001',
    (SELECT id FROM it_equipment_categories WHERE name = 'PC'),
    'Dell',
    'OptiPlex 7090',
    'OPERATIONAL',
    'NOT_ASSIGNED',
    'PC bureau standard DSI'
WHERE NOT EXISTS (SELECT 1 FROM it_equipment WHERE serial_number = 'DSI-PC-001');

INSERT INTO it_equipment(name, serial_number, category_id, brand, model, state, assignment_status, description)
SELECT 
    'Portable HP DSI-002',
    'DSI-PORT-002',
    (SELECT id FROM it_equipment_categories WHERE name = 'Ordinateur portable'),
    'HP',
    'ProBook 450',
    'OPERATIONAL',
    'ASSIGNED',
    'Portable pour collaborateurs'
WHERE NOT EXISTS (SELECT 1 FROM it_equipment WHERE serial_number = 'DSI-PORT-002');

INSERT INTO it_equipment(name, serial_number, category_id, brand, model, state, assignment_status, description)
SELECT 
    'Imprimante HP ADM-001',
    'ADM-IMP-001',
    (SELECT id FROM it_equipment_categories WHERE name = 'Imprimante'),
    'HP',
    'LaserJet Pro',
    'OPERATIONAL',
    'NOT_ASSIGNED',
    'Imprimante bureau administratif'
WHERE NOT EXISTS (SELECT 1 FROM it_equipment WHERE serial_number = 'ADM-IMP-001');
