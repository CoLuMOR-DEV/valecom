# Valorant In-Game Shop Replica (Next.js + MySQL)

## Architecture
- **Frontend:** Next.js App Router + Tailwind + Framer Motion.
- **Middleware Backend:** Next.js API routes (`/api/shop`, `/api/topup`, `/api/purchase`, `/api/admin/transactions`).
- **Database:** MySQL via XAMPP locally; same code works with PlanetScale/Aiven by changing env vars.

## Flow: Inspect -> Top-Up -> Upgrade
1. Open store (`/`) and click skin card.
2. Inspect modal opens with Level 1-4 + variants (only L1 unlocked).
3. Selecting locked level shows deficit + **Unlock Level X** CTA.
4. CTA redirects to `/topup` with contextual query state (`skinName`, `targetLevel`, `vpDeficit`, `vpCost`).
5. Top-up page highlights recommended VP pack and runs 2-second animated checkout.
6. Checkout calls `POST /api/topup`, then `POST /api/purchase` which triggers `ProcessUpgradePurchase`.

## Database setup (XAMPP)
1. Open phpMyAdmin.
2. Run `sql/init_valorant_shop.sql`.
3. Copy `.env.example` to `.env.local` and update credentials.

## Production MySQL strategy (Vercel)
- **PlanetScale:** serverless-compatible, branch-based schema workflow.
- **Aiven MySQL:** managed MySQL with SSL and static host.
- Set Vercel env vars (`MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE`).
- Optional: route DB calls through private network/Vercel secure connection if provider supports it.

## Scripts
```bash
npm install
npm run dev
npm run build
```

## Hardcoded admin route
- Path: `/admin`
- Password: `VALO_ADMIN_2026`
