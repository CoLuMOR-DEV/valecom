# Valorant Shop ERD

```mermaid
erDiagram
    Users ||--o{ OwnedSkins : owns
    Users ||--o{ Transactions : makes
    Users ||--o{ LoadoutSelections : equips
    Users ||--o{ AuditLogs : logs

    Users {
      int ID PK
      varchar Username UK
      varchar Email UK
      varchar PasswordHash "bcrypt hash"
      int VP_Balance "CHECK >= 0"
      boolean IsAdmin
      timestamp CreatedAt
    }

    OwnedSkins {
      int OwnedSkinID PK
      int UserID FK
      varchar SkinID "UK with UserID"
      int LevelUnlocked "CHECK >= 1"
      timestamp UpdatedAt
    }

    Transactions {
      int TransactionID PK
      int UserID FK
      varchar SkinID
      int PurchasedLevel
      int VP_Cost "CHECK >= 0"
      enum TransactionType
      timestamp CreatedAt
    }

    LoadoutSelections {
      int SelectionID PK
      int UserID FK
      varchar WeaponSlot "UK with UserID"
      varchar SkinID
      timestamp UpdatedAt
    }

    AuditLogs {
      int AuditID PK
      int UserID FK
      varchar ActionType
      json ActionMeta
      timestamp CreatedAt
    }
```

## Notes
- `OwnedSkins` stores all purchased skins for each user, with uniqueness on `(UserID, SkinID)`.
- `Transactions` stores topups and purchases (`PURCHASE`, `BUNDLE`, `TOPUP`).
- `LoadoutSelections` stores equipped skin per weapon slot per user, with uniqueness on `(UserID, WeaponSlot)`.
- `AuditLogs` stores trigger-based transaction/loadout audit entries.
- `UpgradePricing` was removed from the schema.

## DB Logic Layer (from `init_valorant_shop.sql`)

### Stored Functions
- `CheckTotalVP(p_user_id)`
- `RecommendedTopupVP(p_needed_vp)`
- `CountOwnedSkins(p_user_id)`

### Stored Procedures
- `StartShopSession(...)`
- `ProcessTopup(...)`
- `ProcessSkinPurchase(...)`
- `ProcessBundlePurchase(...)`
- `SaveLoadoutSelection(...)`

### Triggers
- `trg_transactions_audit` (AFTER INSERT on `Transactions`)
- `trg_loadout_before_insert` (BEFORE INSERT on `LoadoutSelections`)
- `trg_loadout_before_update` (BEFORE UPDATE on `LoadoutSelections`)
- `trg_loadout_audit_insert` (AFTER INSERT on `LoadoutSelections`)
- `trg_loadout_audit_update` (AFTER UPDATE on `LoadoutSelections`)

### Authentication and Account Management
- `PasswordHash` stores bcrypt hashes only; plaintext passwords are not stored.
- `IsAdmin` marks admin-capable accounts, including the seeded `admin_user`.
- Admin account creation is handled through `/api/admin/users` after server-side bcrypt admin authentication.
