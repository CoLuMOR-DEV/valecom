'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { SkinOffer, ShopPayload } from '@/types/shop';

type Owned = { SkinID: string; LevelUnlocked: number };
type UserResponse = { user?: { ID: number; VP_Balance: number; Username: string }; ownedSkins?: Owned[] };

export default function LoadoutClient() {
  const router = useRouter();
  const params = useSearchParams();
  const userId = Number(params.get('userId') ?? 1);

  const [shopData, setShopData] = useState<ShopPayload | null>(null);
  const [userData, setUserData] = useState<UserResponse | null>(null);

  useEffect(() => {
    Promise.all([fetch('/api/shop').then((res) => res.json()), fetch(`/api/user/${userId}`).then((res) => res.json())])
      .then(([shop, user]) => {
        setShopData(shop?.catalog ? shop : null);
        setUserData(user?.user ? user : null);
      })
      .catch(() => {
        setShopData(null);
        setUserData(null);
      });
  }, [userId]);

  const owned = userData?.ownedSkins ?? [];

  const ownedOffers = useMemo(() => {
    const byId = new Map<string, SkinOffer>((shopData?.catalog ?? []).map((offer) => [offer.skinId, offer]));
    return owned.map((entry) => ({
      offer: byId.get(entry.SkinID),
      skinId: entry.SkinID,
      level: entry.LevelUnlocked
    }));
  }, [shopData?.catalog, owned]);

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl p-4 text-white md:p-8">
      <div className="mb-6 flex items-center justify-between">
        <button onClick={() => router.push('/')} className="rounded border border-slate-500/70 bg-slate-900/60 px-4 py-2 text-xs uppercase tracking-[0.2em]">← Back to Shop</button>
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{userData?.user?.Username ?? 'Agent'} Loadout</p>
      </div>

      <section className="mb-5 rounded-xl border border-fuchsia-400/35 bg-gradient-to-r from-[#1a1033] to-[#0a182f] p-5">
        <h1 className="text-3xl font-black uppercase md:text-5xl">My Skin Loadout</h1>
        <p className="mt-2 text-sm text-slate-200">A full view of all purchased skins and current unlocked levels.</p>
      </section>

      {!userData ? <p className="text-slate-300">Loading your loadout...</p> : null}

      {userData && ownedOffers.length === 0 ? (
        <div className="rounded-xl border border-slate-600/60 bg-slate-900/30 p-6 text-center">
          <p className="text-lg font-semibold">No skins owned yet.</p>
          <p className="mt-2 text-sm text-slate-400">Purchase your first skin from the shop to build your loadout.</p>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ownedOffers.map((item) => (
          <article key={item.skinId} className="overflow-hidden rounded-xl border border-slate-500/60 bg-[#0f1d32] shadow-lg">
            <div className="h-44 bg-gradient-to-br from-[#34305d] to-[#1a3a63] p-2">
              {item.offer ? (
                <img src={item.offer.displayIcon || item.offer.showcaseImage} alt={item.offer.skinName} className="h-full w-full object-contain" />
              ) : (
                <div className="grid h-full place-items-center text-sm text-slate-300">Image unavailable</div>
              )}
            </div>
            <div className="space-y-1 px-4 py-3">
              <p className="truncate text-sm font-bold uppercase">{item.offer?.skinName ?? item.skinId}</p>
              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">{item.offer?.weaponName ?? 'Weapon'}</p>
              <p className="text-xs text-cyan-300">Unlocked Level: {item.level}</p>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
