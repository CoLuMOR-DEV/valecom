-- Run in phpMyAdmin / XAMPP MySQL
CREATE DATABASE IF NOT EXISTS valorant_shop;
USE valorant_shop;

CREATE TABLE IF NOT EXISTS Users (
  ID INT PRIMARY KEY AUTO_INCREMENT,
  Username VARCHAR(50) NOT NULL UNIQUE,
  Email VARCHAR(120) NULL UNIQUE,
  PasswordHash VARCHAR(255) NOT NULL DEFAULT 'demo123',
  VP_Balance INT NOT NULL DEFAULT 0,
  CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS OwnedSkins (
  OwnedSkinID INT PRIMARY KEY AUTO_INCREMENT,
  UserID INT NOT NULL,
  SkinID VARCHAR(100) NOT NULL,
  LevelUnlocked INT NOT NULL DEFAULT 1,
  UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_user_skin (UserID, SkinID),
  CONSTRAINT fk_owned_user FOREIGN KEY (UserID) REFERENCES Users(ID)
);

CREATE TABLE IF NOT EXISTS Transactions (
  TransactionID INT PRIMARY KEY AUTO_INCREMENT,
  UserID INT NOT NULL,
  SkinID VARCHAR(100) NOT NULL,
  PurchasedLevel INT NOT NULL,
  VP_Cost INT NOT NULL,
  TransactionType ENUM('PURCHASE', 'BUNDLE', 'TOPUP') NOT NULL DEFAULT 'PURCHASE',
  CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_tx_user FOREIGN KEY (UserID) REFERENCES Users(ID)
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

CREATE TABLE IF NOT EXISTS UpgradePricing (
  SkinID VARCHAR(100) NOT NULL,
  Level INT NOT NULL,
  VP_Cost INT NOT NULL,
  PRIMARY KEY (SkinID, Level)
);

INSERT IGNORE INTO Users (ID, Username, Email, PasswordHash, VP_Balance) VALUES
(1, 'demo_user', 'demo@valora.local', 'demo123', 350),
(2, 'admin_user', 'admin@valora.local', 'admin123', 5000);

-- Per-level cumulative pricing examples
INSERT IGNORE INTO UpgradePricing (SkinID, Level, VP_Cost) VALUES
('holo-meridian-operator', 1, 0),
('holo-meridian-operator', 2, 500),
('holo-meridian-operator', 3, 750),
('holo-meridian-operator', 4, 1000),
('ion-operator', 1, 0),
('ion-operator', 2, 400),
('ion-operator', 3, 700),
('ion-operator', 4, 900);

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

DROP PROCEDURE IF EXISTS ProcessUpgradePurchase $$
CREATE PROCEDURE ProcessUpgradePurchase(
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


DROP PROCEDURE IF EXISTS SaveLoadoutSelection $$
CREATE PROCEDURE SaveLoadoutSelection(
  IN p_user_id INT,
  IN p_weapon_slot VARCHAR(50),
  IN p_skin_id VARCHAR(100)
)
BEGIN
  INSERT INTO LoadoutSelections (UserID, WeaponSlot, SkinID)
  VALUES (p_user_id, p_weapon_slot, p_skin_id)
  ON DUPLICATE KEY UPDATE SkinID = VALUES(SkinID);
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

DROP VIEW IF EXISTS v_user_commerce_summary $$
CREATE VIEW v_user_commerce_summary AS
SELECT
  u.ID AS UserID,
  u.Username,
  u.Email,
  u.VP_Balance,
  COALESCE(SUM(CASE WHEN t.TransactionType = 'TOPUP' THEN t.VP_Cost ELSE 0 END), 0) AS TotalTopupVP,
  COALESCE(SUM(CASE WHEN t.TransactionType IN ('PURCHASE', 'BUNDLE') THEN t.VP_Cost ELSE 0 END), 0) AS TotalSpentVP,
  COUNT(CASE WHEN t.TransactionType = 'PURCHASE' THEN 1 END) AS SkinPurchaseCount,
  COUNT(CASE WHEN t.TransactionType = 'BUNDLE' THEN 1 END) AS BundlePurchaseCount
FROM Users u
LEFT JOIN Transactions t ON t.UserID = u.ID
GROUP BY u.ID, u.Username, u.Email, u.VP_Balance $$

DELIMITER ;
