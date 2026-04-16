-- Run in phpMyAdmin / XAMPP MySQL
CREATE DATABASE IF NOT EXISTS valorant_shop;
USE valorant_shop;

CREATE TABLE IF NOT EXISTS Users (
  ID INT PRIMARY KEY AUTO_INCREMENT,
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
  TransactionType ENUM('UPGRADE','TOPUP') NOT NULL DEFAULT 'UPGRADE',
  CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_tx_user FOREIGN KEY (UserID) REFERENCES Users(ID)
);

CREATE TABLE IF NOT EXISTS UpgradePricing (
  SkinID VARCHAR(100) NOT NULL,
  Level INT NOT NULL,
  VP_Cost INT NOT NULL,
  PRIMARY KEY (SkinID, Level)
);

INSERT IGNORE INTO Users (ID, VP_Balance) VALUES (1, 350);

-- Sample level prices for Holo Meridian Operator
INSERT IGNORE INTO UpgradePricing (SkinID, Level, VP_Cost) VALUES
('holo-meridian-operator', 1, 0),
('holo-meridian-operator', 2, 500),
('holo-meridian-operator', 3, 750),
('holo-meridian-operator', 4, 1000);

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

DROP FUNCTION IF EXISTS CalculateUpgradeCost $$
CREATE FUNCTION CalculateUpgradeCost(p_user_id INT, p_skin_id VARCHAR(100), p_target_level INT)
RETURNS INT
READS SQL DATA
DETERMINISTIC
BEGIN
  DECLARE current_level INT DEFAULT 1;
  DECLARE target_cost INT DEFAULT 0;

  SELECT IFNULL(LevelUnlocked, 1)
    INTO current_level
  FROM OwnedSkins
  WHERE UserID = p_user_id AND SkinID = p_skin_id;

  SELECT IFNULL(VP_Cost, 0)
    INTO target_cost
  FROM UpgradePricing
  WHERE SkinID = p_skin_id AND Level = p_target_level;

  IF p_target_level <= current_level THEN
    RETURN 0;
  END IF;

  RETURN target_cost;
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
  VALUES (p_user_id, p_skin_id, p_level, p_vp_cost, 'UPGRADE');

  COMMIT;
END $$

DELIMITER ;
