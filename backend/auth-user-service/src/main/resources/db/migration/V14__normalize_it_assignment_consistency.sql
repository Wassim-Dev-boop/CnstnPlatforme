-- V14: normaliser la coherence des affectations IT de demonstration.

UPDATE it_equipment e
SET assignment_status = 'NOT_ASSIGNED',
    current_employee_id = NULL,
    updated_at = NOW()
WHERE e.assignment_status = 'ASSIGNED'
  AND (e.current_employee_id IS NULL OR TRIM(e.current_employee_id) = '')
  AND NOT EXISTS (
      SELECT 1
      FROM it_equipment_assignments a
      WHERE a.equipment_id = e.id
        AND a.status = 'ACTIVE'
        AND a.returned_at IS NULL
  );
