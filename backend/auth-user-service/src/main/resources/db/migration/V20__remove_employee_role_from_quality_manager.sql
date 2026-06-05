-- Remove EMPLOYE role from users that are RESPONSABLE_QUALITE.
-- Requirement: responsable qualite must keep a single role.
DELETE FROM user_roles ur_emp
USING user_roles ur_quality,
      roles r_emp,
      roles r_quality
WHERE ur_emp.user_id = ur_quality.user_id
  AND ur_emp.role_id = r_emp.id
  AND ur_quality.role_id = r_quality.id
  AND r_emp.name = 'EMPLOYE'
  AND r_quality.name = 'RESPONSABLE_QUALITE';
