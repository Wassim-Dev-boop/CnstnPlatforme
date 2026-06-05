DELETE FROM role_permissions rp
USING permissions p
WHERE rp.permission_id = p.id
  AND p.code = 'VIEW_REPORTS_MODULE';

DELETE FROM user_permissions up
USING permissions p
WHERE up.permission_id = p.id
  AND p.code = 'VIEW_REPORTS_MODULE';

DELETE FROM permissions
WHERE code = 'VIEW_REPORTS_MODULE';
