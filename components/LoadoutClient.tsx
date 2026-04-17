'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { SkinOffer, ShopPayload } from '@/types/shop';

type Owned = { SkinID: string; LevelUnlocked: number };
type UserResponse = { user?: { ID: number; VP_Balance: number; Username: string }; ownedSkins?: Owned[] };

type Slot = { key: string; label: string; group: string };

const SLOTS: Slot[] = [
  { key: 'Classic', label: 'Classic', group: 'Sidearms' },
  { key: 'Shorty', label: 'Shorty', group: 'Sidearms' },
  { key: 'Frenzy', label: 'Frenzy', group: 'Sidearms' },
  { key: 'Ghost', label: 'Ghost', group: 'Sidearms' },
  { key: 'Sheriff', label: 'Sheriff', group: 'Sidearms' },
  { key: 'Stinger', label: 'Stinger', group: 'SMGs' },
  { key: 'Spectre', label: 'Spectre', group: 'SMGs' },
  { key: 'Bucky', label: 'Bucky', group: 'Shotguns' },
  { key: 'Judge', label: 'Judge', group: 'Shotguns' },
  { key: 'Bulldog', label: 'Bulldog', group: 'Rifles' },
  { key: 'Guardian', label: 'Guardian', group: 'Rifles' },
  { key: 'Phantom', label: 'Phantom', group: 'Rifles' },
  { key: 'Vandal', label: 'Vandal', group: 'Rifles' },
  { key: 'Marshal', label: 'Marshal', group: 'Sniper Rifles' },
  { key: 'Operator', label: 'Operator', group: 'Sniper Rifles' },
  { key: 'Ares', label: 'Ares', group: 'Machine Guns' },
  { key: 'Odin', label: 'Odin', group: 'Machine Guns' },
  { key: 'Melee', label: 'Melee', group: 'Melee' }
];

export default function LoadoutClient() {
  const router = useRouter();
  const params = useSearchParams();
  const userId = Number(params.get('userId') ?? 1);

  const [shopData, setShopData] = useState<ShopPayload | null>(null);
  const [userData, setUserData] = useState<UserResponse | null>(null);
  const [equipped, setEquipped] = useState<Record<string, string>>({});

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

  useEffect(() => {
    const key = `valora-loadout-${userId}`;
    try {
      const saved = window.localStorage.getItem(key);
      if (saved) setEquipped(JSON.parse(saved));
    } catch {
      setEquipped({});
    }
  }, [userId]);

  useEffect(() => {
    const key = `valora-loadout-${userId}`;
    window.localStorage.setItem(key, JSON.stringify(equipped));
  }, [equipped, userId]);

  const ownedMap = useMemo(() => {
    const owned = userData?.ownedSkins ?? [];
    const ownedSet = new Set(owned.map((entry) => entry.SkinID));
    return (shopData?.catalog ?? []).filter((offer) => ownedSet.has(offer.skinId));
  }, [shopData?.catalog, userData?.ownedSkins]);

  const byWeapon = useMemo(() => {
    const map = new Map<string, SkinOffer[]>();
    for (const skin of ownedMap) {
      const key = skin.weaponName;
      if (!map.has(key)) map.set(key, []);
      map.get(key)?.push(skin);
    }
    return map;
  }, [ownedMap]);

  const groups = useMemo(() => {
    const out: Record<string, Slot[]> = {};
    for (const slot of SLOTS) {
      if (!out[slot.group]) out[slot.group] = [];
      out[slot.group].push(slot);
    }
    return out;
  }, []);

  const selectedCost = useMemo(() => {
    return Object.entries(equipped).reduce((sum, [, skinId]) => {
      const offer = ownedMap.find((s) => s.skinId === skinId);
      return sum + (offer?.priceVP ?? 0);
    }, 0);
  }, [equipped, ownedMap]);

  return (
    <main className="mx-auto min-h-screen w-full max-w-[1300px] p-4 text-white md:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <button onClick={() => router.push('/')} className="rounded border border-slate-500/70 bg-slate-900/60 px-4 py-2 text-xs uppercase tracking-[0.2em]">← Back to Shop</button>
        <p className="text-3xl font-black uppercase">Total Loadout Cost: {selectedCost.toLocaleString()} VP</p>
      </div>

      {!userData ? <p className="text-slate-300">Loading your loadout...</p> : null}

      {userData && ownedMap.length === 0 ? (
        <div className="rounded-xl border border-slate-600/60 bg-slate-900/30 p-6 text-center">
          <p className="text-lg font-semibold">No skins owned yet.</p>
          <p className="mt-2 text-sm text-slate-400">Purchase skins from the shop and come back to build your custom loadout.</p>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        {Object.entries(groups).map(([group, slots]) => (
          <section key={group} className="rounded-xl border border-slate-600/60 bg-[#140b18]/90 p-3 lg:col-span-1">
            <h2 className="mb-3 text-3xl font-black uppercase">{group}</h2>
            <div className="space-y-3">
              {slots.map((slot) => {
                const options = byWeapon.get(slot.key) ?? [];
                const selectedSkinId = equipped[slot.key] || '';
                const selectedSkin = options.find((s) => s.skinId === selectedSkinId);

                return (
                  <article key={slot.key} className="rounded border border-slate-500/70 bg-black/35 p-2">
                    <div className="mb-2 h-20 rounded bg-gradient-to-r from-slate-900 to-slate-800">
                      {selectedSkin ? (
                        <img src={selectedSkin.displayIcon || selectedSkin.showcaseImage} alt={selectedSkin.skinName} className="h-full w-full object-contain" />
                      ) : (
                        <div className="grid h-full place-items-center text-xs uppercase text-slate-400">No Skin</div>
                      )}
                    </div>
                    <p className="text-sm font-bold uppercase">{slot.label}</p>
                    <select
                      value={selectedSkinId}
                      onChange={(e) => setEquipped((prev) => ({ ...prev, [slot.key]: e.target.value }))}
                      className="mt-2 w-full rounded border border-slate-600 bg-slate-900 p-2 text-xs"
                    >
                      <option value="">Default</option>
                      {options.map((option) => (
                        <option key={option.skinId} value={option.skinId}>{option.skinName}</option>
                      ))}
                    </select>
                  </article>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
