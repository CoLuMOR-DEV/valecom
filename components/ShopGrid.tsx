'use client';

import { useEffect, useMemo, useState } from 'react';
import GunInspectModal from './GunInspectModal';
import type { ShopPayload, SkinOffer } from '@/types/shop';

type Owned = { SkinID: string; LevelUnlocked: number };

type UserResponse = {
  user?: { ID: number; VP_Balance: number; Username: string };
  ownedSkins?: Owned[];
};

const fallbackUser = {
  user: { ID: 1, VP_Balance: 0, Username: 'Loading Agent' },
  ownedSkins: [] as Owned[]
};

function VpLogo() {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-slate-500 text-[10px]">V</span>
      <span>P</span>
    </span>
  );
}

function formatRemaining(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = String(Math.floor(total / 3600)).padStart(2, '0');
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
  const s = String(total % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

export default function ShopGrid() {
  const [data, setData] = useState<ShopPayload | null>(null);
  const [selected, setSelected] = useState<SkinOffer | null>(null);
  const [userData, setUserData] = useState<UserResponse>(fallbackUser);
  const [now, setNow] = useState(Date.now());

  const userId = 1;

  const refreshStore = () => {
    fetch(`/api/shop?seed=${Date.now()}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.featured && Array.isArray(json.daily)) {
          setData(json);
        }
      })
      .catch(() => null);
  };

  const refreshUser = () => {
    fetch(`/api/user/${userId}`)
      .then((res) => res.json())
      .then((json) => {
        if (json?.user) {
          setUserData({ user: json.user, ownedSkins: json.ownedSkins ?? [] });
          return;
        }
        setUserData(fallbackUser);
      })
      .catch(() => setUserData(fallbackUser));
  };

  useEffect(() => {
    refreshStore();
    refreshUser();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const remaining = useMemo(() => {
    if (!data?.dailyResetAtISO) return '00:00:00';
    return formatRemaining(new Date(data.dailyResetAtISO).getTime() - now);
  }, [data?.dailyResetAtISO, now]);

  if (!data) {
    return <div className="p-8 text-xl uppercase tracking-widest text-slate-300">Loading store...</div>;
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-[1200px] px-4 py-6 text-white">
      <div className="mb-4 flex items-center justify-between text-xs uppercase tracking-[0.25em] text-slate-300">
        <p>Back // Store</p>
        <div className="flex items-center gap-5">
          <p>Player: {userData.user?.Username ?? 'Agent'}</p>
          <p className="rounded border border-cyan-400/50 bg-cyan-500/10 px-3 py-1 text-cyan-200">
            <VpLogo /> {userData.user?.VP_Balance ?? 0}
          </p>
          <button
            onClick={refreshStore}
            className="rounded border border-slate-500 bg-slate-900/50 px-2 py-1 text-[10px] tracking-wider hover:border-cyan-300"
          >
            Refresh Store
          </button>
        </div>
      </div>

      <section className="relative overflow-hidden border border-slate-300/40 bg-[#0b1728] shadow-[0_0_0_1px_rgba(255,255,255,.08)]">
        {data.bundleImage ? (
          <img src={data.bundleImage} alt={data.featured.skinName} className="h-[420px] w-full object-cover opacity-75" />
        ) : (
          <div className="h-[420px] w-full bg-gradient-to-r from-[#601b2e] via-[#27436f] to-[#221f3b]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-black/65 via-black/30 to-black/60" />

        <div className="absolute inset-0 flex flex-col justify-between p-6">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-300">Featured</p>
            <h1 className="mt-2 text-6xl font-black uppercase leading-none text-white">{data.featured.collectionName}</h1>
            <p className="mt-1 text-base uppercase tracking-widest text-slate-200">Collection</p>
          </div>

          <div className="ml-auto flex items-center gap-3">
            <button className="border-2 border-slate-100 bg-[#ece9df] px-16 py-3 text-2xl font-bold text-black">
              <span className="inline-flex items-center gap-2">
                <VpLogo /> {data.bundlePriceVP.toLocaleString()}
              </span>
            </button>
            <button className="h-14 w-14 border-2 border-slate-100 bg-[#ece9df] text-black">⟡</button>
          </div>
        </div>
      </section>

      <section className="my-5 flex items-center justify-center gap-4 text-sm uppercase tracking-[0.2em] text-slate-200">
        <div className="h-px w-48 bg-slate-600" />
        <p>Daily Offers</p>
        <p className="text-amber-300">{remaining}</p>
        <div className="h-px w-48 bg-slate-600" />
      </section>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-4">
        {data.daily.map((offer) => (
          <button
            key={offer.skinId}
            onClick={() => setSelected(offer)}
            className="group overflow-hidden border border-slate-400/40 bg-[#0e2038] text-left transition hover:-translate-y-0.5 hover:border-cyan-300/60"
          >
            <div className="h-40 bg-gradient-to-br from-[#573455] to-[#142c4e] p-2">
              {offer.displayIcon || offer.showcaseImage ? (
                <img src={offer.displayIcon || offer.showcaseImage} alt={offer.skinName} className="h-full w-full object-contain" />
              ) : (
                <div className="flex h-full items-center justify-center text-xs uppercase text-slate-200">{offer.weaponName}</div>
              )}
            </div>
            <div className="flex items-center justify-between bg-black/45 px-3 py-2">
              <p className="truncate text-sm font-semibold uppercase tracking-wider">{offer.skinName}</p>
              <p className="text-sm text-slate-200">
                <VpLogo /> {offer.priceVP}
              </p>
            </div>
          </button>
        ))}
      </section>

      <section className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-5">
        {['Night.Market', 'Battlepass', 'Agents', 'Esports', 'Accessories'].map((tab) => (
          <div key={tab} className="border border-slate-500/50 bg-[#0a1b31] px-3 py-2 text-center text-sm uppercase tracking-widest text-slate-200">
            {tab}
          </div>
        ))}
      </section>

      {selected && (
        <GunInspectModal
          offer={selected}
          userId={userData.user?.ID ?? 1}
          userVP={userData.user?.VP_Balance ?? 0}
          ownedLevel={userData.ownedSkins?.find((s) => s.SkinID === selected.skinId)?.LevelUnlocked ?? 1}
          onClose={() => {
            setSelected(null);
            refreshUser();
          }}
        />
      )}
    </main>
  );
}
