-- Optional Data Control Language (DCL) presets.
-- Run with a MySQL administrator account after sql/init_valorant_shop.sql.
USE valorant_shop;

CREATE ROLE IF NOT EXISTS 'valorant_shop_readonly', 'valorant_shop_app_runtime', 'valorant_shop_admin_ops';

GRANT SELECT ON valorant_shop.* TO 'valorant_shop_readonly';
GRANT SELECT, INSERT, UPDATE, EXECUTE ON valorant_shop.* TO 'valorant_shop_app_runtime';
GRANT SELECT, INSERT, UPDATE, DELETE, EXECUTE, SHOW VIEW ON valorant_shop.* TO 'valorant_shop_admin_ops';

-- Example account mapping for local development; change passwords before sharing environments.
CREATE USER IF NOT EXISTS 'valora_runtime'@'%' IDENTIFIED BY 'change_me_runtime_password';
GRANT 'valorant_shop_app_runtime' TO 'valora_runtime'@'%';
SET DEFAULT ROLE 'valorant_shop_app_runtime' TO 'valora_runtime'@'%';

FLUSH PRIVILEGES;
