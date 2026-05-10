# Valorant In-Game Shop Replica (Next.js + MySQL)

## What is improved in this revision
- Real DB-backed purchase persistence end-to-end on localhost (XAMPP MySQL).
- ACID-focused stored procedures for top-ups, single-skin purchases, bundle purchases, and loadout saves.
- Trigger-based auditing for transactions and loadout equip/switch actions.
- UI reads live user VP/owned skin/loadout state from DB with localStorage fallback.

## Architecture
- **Frontend:** Next.js App Router + Tailwind + Framer Motion.
- **Backend middleware:** Next.js API routes.
- **Database:** MySQL (XAMPP local) with production-ready env strategy for PlanetScale/Aiven.

## Localhost setup (XAMPP)
1. Start Apache + MySQL in XAMPP.
2. Open phpMyAdmin and run: `sql/init_valorant_shop.sql`.
3. Copy env file and configure credentials:
   ```bash
   cp .env.example .env.local
   ```
4. Install and start:
   ```bash
   npm install
   npm run dev
   ```
5. Open:
   - `http://localhost:3000` (shop)
   - `http://localhost:3000/loadout` (loadout)
   - `http://localhost:3000/admin` (admin table)

## API map
- `GET /api/shop` → featured + daily skin data from Valorant API.
- `GET /api/user/1` → live VP balance + owned skins.
- `POST /api/topup` → `ProcessTopup` stored procedure.
- `POST /api/purchase-skin` → `ProcessSkinPurchase` stored procedure for level 1 purchases.
- `POST /api/purchase-bundle` → `ProcessBundlePurchase` stored procedure.
- `GET /api/loadout?userId=1` → fetch persisted loadout selections.
- `POST /api/loadout` → persist loadout selections via `SaveLoadoutSelection`.
- `GET /api/admin/transactions` → admin table rows.

## Admin route
- Path: `/admin`
- Password: `VALO_ADMIN_2026`

## Production MySQL strategy for Vercel
- PlanetScale or Aiven can be used by setting:
  `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE`.
- Keep API code unchanged; only env vars differ by environment.
