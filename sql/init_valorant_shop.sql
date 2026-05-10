-- Run in phpMyAdmin / XAMPP MySQL
CREATE DATABASE IF NOT EXISTS valorant_shop;
USE valorant_shop;

CREATE TABLE IF NOT EXISTS Users (
  ID INT PRIMARY KEY AUTO_INCREMENT,
  Username VARCHAR(50) NOT NULL UNIQUE,
  Email VARCHAR(120) NULL UNIQUE,
  PasswordHash VARCHAR(255) NOT NULL DEFAULT 'demo123',
  VP_Balance INT NOT NULL DEFAULT 0,
  CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_users_vp_non_negative CHECK (VP_Balance >= 0)
);

CREATE TABLE IF NOT EXISTS OwnedSkins (
  OwnedSkinID INT PRIMARY KEY AUTO_INCREMENT,
  UserID INT NOT NULL,
  SkinID VARCHAR(100) NOT NULL,
  LevelUnlocked INT NOT NULL DEFAULT 1,
  UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_user_skin (UserID, SkinID),
  CONSTRAINT fk_owned_user FOREIGN KEY (UserID) REFERENCES Users(ID),
  CONSTRAINT chk_owned_level_positive CHECK (LevelUnlocked >= 1)
);

CREATE TABLE IF NOT EXISTS Transactions (
  TransactionID INT PRIMARY KEY AUTO_INCREMENT,
  UserID INT NOT NULL,
  SkinID VARCHAR(100) NOT NULL,
  PurchasedLevel INT NOT NULL,
  VP_Cost INT NOT NULL,
  TransactionType ENUM('PURCHASE', 'BUNDLE', 'TOPUP') NOT NULL DEFAULT 'PURCHASE',
  CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_tx_user FOREIGN KEY (UserID) REFERENCES Users(ID),
  CONSTRAINT chk_vp_cost_positive CHECK (VP_Cost >= 0)
);

CREATE TABLE IF NOT EXISTS LoadoutSelections (
  SelectionID INT PRIMARY KEY AUTO_INCREMENT,
  UserID INT NOT NULL,
  WeaponSlot VARCHAR(50) NOT NULL,
  SkinID VARCHAR(100) NOT NULL,
  UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_user_slot (UserID, WeaponSlot),
  CONSTRAINT fk_loadout_user FOREIGN KEY (UserID) REFERENCES Users(ID)
);

CREATE TABLE IF NOT EXISTS AuditLogs (
  AuditID INT PRIMARY KEY AUTO_INCREMENT,
  UserID INT NULL,
  ActionType VARCHAR(50) NOT NULL,
  ActionMeta JSON NULL,
  CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_audit_user (UserID),
  CONSTRAINT fk_audit_user FOREIGN KEY (UserID) REFERENCES Users(ID)
);

INSERT IGNORE INTO Users (ID, Username, Email, PasswordHash, VP_Balance) VALUES
(1, 'demo_user', 'demo@valora.local', 'demo123', 350),
(2, 'admin_user', 'admin@valora.local', 'admin123', 5000);

DELIMITER $$

DROP FUNCTION IF EXISTS CheckTotalVP $$
CREATE FUNCTION CheckTotalVP(p_user_id INT)
RETURNS INT
READS SQL DATA
DETERMINISTIC
BEGIN
  DECLARE total_vp INT;
  SELECT VP_Balance INTO total_vp FROM Users WHERE ID = p_user_id;
  RETURN IFNULL(total_vp, 0);
END $$

DROP FUNCTION IF EXISTS RecommendedTopupVP $$
CREATE FUNCTION RecommendedTopupVP(p_needed_vp INT)
RETURNS INT
DETERMINISTIC
BEGIN
  DECLARE need_vp INT DEFAULT GREATEST(IFNULL(p_needed_vp, 0), 0);

  IF need_vp <= 475 THEN RETURN 475; END IF;
  IF need_vp <= 1000 THEN RETURN 1000; END IF;
  IF need_vp <= 2050 THEN RETURN 2050; END IF;
  IF need_vp <= 3650 THEN RETURN 3650; END IF;
  IF need_vp <= 5350 THEN RETURN 5350; END IF;
  RETURN 11000;
END $$

DROP FUNCTION IF EXISTS CountOwnedSkins $$
CREATE FUNCTION CountOwnedSkins(p_user_id INT)
RETURNS INT
READS SQL DATA
DETERMINISTIC
BEGIN
  DECLARE owned_count INT;
  SELECT COUNT(*) INTO owned_count FROM OwnedSkins WHERE UserID = p_user_id;
  RETURN IFNULL(owned_count, 0);
END $$

DROP PROCEDURE IF EXISTS StartShopSession $$
CREATE PROCEDURE StartShopSession(
  IN p_username VARCHAR(50),
  IN p_email VARCHAR(120),
  IN p_password_hash VARCHAR(255),
  IN p_initial_vp INT,
  OUT p_user_id INT,
  OUT p_current_vp INT
)
BEGIN
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;

  INSERT INTO Users (Username, Email, PasswordHash, VP_Balance)
  VALUES (p_username, p_email, p_password_hash, GREATEST(IFNULL(p_initial_vp, 0), 0))
  ON DUPLICATE KEY UPDATE
    Email = COALESCE(VALUES(Email), Email),
    PasswordHash = PasswordHash;

  SELECT ID, VP_Balance
    INTO p_user_id, p_current_vp
  FROM Users
  WHERE Username = p_username
  LIMIT 1;

  COMMIT;
END $$

DROP PROCEDURE IF EXISTS ProcessTopup $$
CREATE PROCEDURE ProcessTopup(
  IN p_user_id INT,
  IN p_vp_amount INT
)
BEGIN
  DECLARE current_vp INT;

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;

  SELECT VP_Balance INTO current_vp
  FROM Users
  WHERE ID = p_user_id
  FOR UPDATE;

  IF current_vp IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'User does not exist';
  END IF;

  IF p_vp_amount <= 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'VP amount should be positive';
  END IF;

  UPDATE Users
  SET VP_Balance = VP_Balance + p_vp_amount
  WHERE ID = p_user_id;

  INSERT INTO Transactions (UserID, SkinID, PurchasedLevel, VP_Cost, TransactionType)
  VALUES (p_user_id, 'VP_TOPUP', 0, p_vp_amount, 'TOPUP');

  COMMIT;
END $$

DROP PROCEDURE IF EXISTS ProcessSkinPurchase $$
CREATE PROCEDURE ProcessSkinPurchase(
  IN p_user_id INT,
  IN p_skin_id VARCHAR(100),
  IN p_level INT,
  IN p_vp_cost INT
)
BEGIN
  DECLARE current_vp INT;

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;

  SELECT VP_Balance INTO current_vp
  FROM Users
  WHERE ID = p_user_id
  FOR UPDATE;

  IF current_vp IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'User does not exist';
  END IF;

  IF p_vp_cost < 0 OR p_level <= 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid purchase payload';
  END IF;

  IF current_vp < p_vp_cost THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Insufficient VP balance';
  END IF;

  UPDATE Users
  SET VP_Balance = VP_Balance - p_vp_cost
  WHERE ID = p_user_id;

  INSERT INTO OwnedSkins (UserID, SkinID, LevelUnlocked)
  VALUES (p_user_id, p_skin_id, p_level)
  ON DUPLICATE KEY UPDATE LevelUnlocked = GREATEST(LevelUnlocked, VALUES(LevelUnlocked));

  INSERT INTO Transactions (UserID, SkinID, PurchasedLevel, VP_Cost, TransactionType)
  VALUES (p_user_id, p_skin_id, p_level, p_vp_cost, 'PURCHASE');

  COMMIT;
END $$

DROP PROCEDURE IF EXISTS ProcessBundlePurchase $$
CREATE PROCEDURE ProcessBundlePurchase(
  IN p_user_id INT,
  IN p_bundle_id VARCHAR(100),
  IN p_price_vp INT,
  IN p_skin_ids_json JSON
)
BEGIN
  DECLARE current_vp INT;

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;

  SELECT VP_Balance INTO current_vp
  FROM Users
  WHERE ID = p_user_id
  FOR UPDATE;

  IF current_vp IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'User does not exist';
  END IF;

  IF p_price_vp <= 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Bundle price should be positive';
  END IF;

  IF current_vp < p_price_vp THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Insufficient VP balance for bundle';
  END IF;

  UPDATE Users
  SET VP_Balance = VP_Balance - p_price_vp
  WHERE ID = p_user_id;

  INSERT INTO OwnedSkins (UserID, SkinID, LevelUnlocked)
  SELECT p_user_id, ids.skin_id, 1
  FROM JSON_TABLE(p_skin_ids_json, '$[*]' COLUMNS (skin_id VARCHAR(100) PATH '$')) ids
  ON DUPLICATE KEY UPDATE LevelUnlocked = GREATEST(LevelUnlocked, VALUES(LevelUnlocked));

  INSERT INTO Transactions (UserID, SkinID, PurchasedLevel, VP_Cost, TransactionType)
  VALUES (p_user_id, CONCAT('BUNDLE:', p_bundle_id), 1, p_price_vp, 'BUNDLE');

  COMMIT;
END $$

DROP PROCEDURE IF EXISTS SaveLoadoutSelection $$
CREATE PROCEDURE SaveLoadoutSelection(
  IN p_user_id INT,
  IN p_weapon_slot VARCHAR(50),
  IN p_skin_id VARCHAR(100)
)
BEGIN
  DECLARE has_skin INT DEFAULT 0;

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;

  SELECT COUNT(*) INTO has_skin
  FROM OwnedSkins
  WHERE UserID = p_user_id AND SkinID = p_skin_id;

  IF has_skin = 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Skin must be owned before equipping';
  END IF;

  INSERT INTO LoadoutSelections (UserID, WeaponSlot, SkinID)
  VALUES (p_user_id, p_weapon_slot, p_skin_id)
  ON DUPLICATE KEY UPDATE SkinID = VALUES(SkinID);

  COMMIT;
END $$

DROP TRIGGER IF EXISTS trg_transactions_audit $$
CREATE TRIGGER trg_transactions_audit
AFTER INSERT ON Transactions
FOR EACH ROW
BEGIN
  INSERT INTO AuditLogs (UserID, ActionType, ActionMeta)
  VALUES (
    NEW.UserID,
    CONCAT('TRANSACTION_', NEW.TransactionType),
    JSON_OBJECT('skinId', NEW.SkinID, 'vpCost', NEW.VP_Cost, 'level', NEW.PurchasedLevel)
  );
END $$

DROP TRIGGER IF EXISTS trg_loadout_before_insert $$
CREATE TRIGGER trg_loadout_before_insert
BEFORE INSERT ON LoadoutSelections
FOR EACH ROW
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM OwnedSkins
    WHERE UserID = NEW.UserID AND SkinID = NEW.SkinID
  ) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cannot equip skin that is not owned';
  END IF;
END $$

DROP TRIGGER IF EXISTS trg_loadout_before_update $$
CREATE TRIGGER trg_loadout_before_update
BEFORE UPDATE ON LoadoutSelections
FOR EACH ROW
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM OwnedSkins
    WHERE UserID = NEW.UserID AND SkinID = NEW.SkinID
  ) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cannot equip skin that is not owned';
  END IF;
END $$

DROP TRIGGER IF EXISTS trg_loadout_audit_insert $$
CREATE TRIGGER trg_loadout_audit_insert
AFTER INSERT ON LoadoutSelections
FOR EACH ROW
BEGIN
  INSERT INTO AuditLogs (UserID, ActionType, ActionMeta)
  VALUES (
    NEW.UserID,
    'LOADOUT_EQUIP',
    JSON_OBJECT('weaponSlot', NEW.WeaponSlot, 'skinId', NEW.SkinID)
  );
END $$

DROP TRIGGER IF EXISTS trg_loadout_audit_update $$
CREATE TRIGGER trg_loadout_audit_update
AFTER UPDATE ON LoadoutSelections
FOR EACH ROW
BEGIN
  INSERT INTO AuditLogs (UserID, ActionType, ActionMeta)
  VALUES (
    NEW.UserID,
    'LOADOUT_SWITCH',
    JSON_OBJECT('weaponSlot', NEW.WeaponSlot, 'oldSkinId', OLD.SkinID, 'newSkinId', NEW.SkinID)
  );
END $$

DROP VIEW IF EXISTS v_user_commerce_summary $$
CREATE VIEW v_user_commerce_summary AS
SELECT
  u.ID AS UserID,
  u.Username,
  u.Email,
  u.VP_Balance,
  CountOwnedSkins(u.ID) AS OwnedSkinCount,
  COALESCE(SUM(CASE WHEN t.TransactionType = 'TOPUP' THEN t.VP_Cost ELSE 0 END), 0) AS TotalTopupVP,
  COALESCE(SUM(CASE WHEN t.TransactionType IN ('PURCHASE', 'BUNDLE') THEN t.VP_Cost ELSE 0 END), 0) AS TotalSpentVP,
  COUNT(CASE WHEN t.TransactionType = 'PURCHASE' THEN 1 END) AS SkinPurchaseCount,
  COUNT(CASE WHEN t.TransactionType = 'BUNDLE' THEN 1 END) AS BundlePurchaseCount
FROM Users u
LEFT JOIN Transactions t ON t.UserID = u.ID
GROUP BY u.ID, u.Username, u.Email, u.VP_Balance $$

DELIMITER ;
