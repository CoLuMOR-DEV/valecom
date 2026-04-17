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
      varchar PasswordHash
      int VP_Balance
      timestamp CreatedAt
    }

    OwnedSkins {
      int OwnedSkinID PK
      int UserID FK
      varchar SkinID
      int LevelUnlocked
      timestamp UpdatedAt
    }

    Transactions {
      int TransactionID PK
      int UserID FK
      varchar SkinID
      int PurchasedLevel
      int VP_Cost
      enum TransactionType
      timestamp CreatedAt
    }

    LoadoutSelections {
      int SelectionID PK
      int UserID FK
      varchar WeaponSlot
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

    UpgradePricing {
      varchar SkinID PK
      int Level PK
      int VP_Cost
    }
```

## Notes
- `OwnedSkins` stores all purchased skins for each user.
- `Transactions` stores topups and purchases (`PURCHASE`, `BUNDLE`, `TOPUP`).
- `LoadoutSelections` stores equipped skin per weapon slot per user.
- `AuditLogs` stores trigger-based transaction audit entries.
