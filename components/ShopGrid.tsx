'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import GunInspectModal from './GunInspectModal';
import PurchaseCompleteModal from './PurchaseCompleteModal';
import type { ShopPayload, SkinOffer } from '@/types/shop';

type Owned = { SkinID: string; LevelUnlocked: number };
type UserResponse = { user?: { ID: number; VP_Balance: number; Username: string }; ownedSkins?: Owned[] };
type PurchaseDone = { title: string; subtitle: string; image?: string } | null;

const fallbackUser = { user: { ID: 1, VP_Balance: 0, Username: 'Loading Agent' }, ownedSkins: [] as Owned[] };

function VpLogo({ icon }: { icon?: string }) {
  return icon ? <img src={icon} alt="Valorant Points" className="h-5 w-5 rounded-full border border-slate-500/70" /> : <span className="text-xs">VP</span>;
}

function formatRemaining(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = String(Math.floor(total / 3600)).padStart(2, '0');
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
  const s = String(total % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

export default function ShopGrid() {
  const router = useRouter();
  const [data, setData] = useState<ShopPayload | null>(null);
  const [selected, setSelected] = useState<SkinOffer | null>(null);
  const [userData, setUserData] = useState<UserResponse>(fallbackUser);
  const [now, setNow] = useState(Date.now());
  const [bundleError, setBundleError] = useState('');
  const [buyingBundle, setBuyingBundle] = useState(false);
  const [completed, setCompleted] = useState<PurchaseDone>(null);

  const userId = 1;

  const getStoreSeed = () => {
    if (typeof window === 'undefined') return Date.now();
    const nextReset = new Date();
    nextReset.setUTCHours(0, 0, 0, 0);
    nextReset.setUTCDate(nextReset.getUTCDate() + 1);

    const savedSeed = window.localStorage.getItem('valora-shop-seed');
    const savedReset = window.localStorage.getItem('valora-shop-seed-reset');
    if (savedSeed && savedReset && Number(savedReset) > Date.now()) {
      return Number(savedSeed);
    }

    const newSeed = Date.now();
    window.localStorage.setItem('valora-shop-seed', String(newSeed));
    window.localStorage.setItem('valora-shop-seed-reset', String(nextReset.getTime()));
    return newSeed;
  };

  const refreshStore = (forceNewSeed = false) => {
    const seed = forceNewSeed
      ? (() => {
          const newSeed = Date.now();
          if (typeof window !== 'undefined') {
            const nextReset = new Date();
            nextReset.setUTCHours(0, 0, 0, 0);
            nextReset.setUTCDate(nextReset.getUTCDate() + 1);
            window.localStorage.setItem('valora-shop-seed', String(newSeed));
            window.localStorage.setItem('valora-shop-seed-reset', String(nextReset.getTime()));
          }
          return newSeed;
        })()
      : getStoreSeed();

    return fetch(`/api/shop?seed=${seed}`)
      .then((res) => res.json())
      .then((json) => (json.featured && Array.isArray(json.daily) ? setData(json) : null))
      .catch(() => null);
  };

  const refreshUser = () =>
    fetch(`/api/user/${userId}`)
      .then((res) => res.json())
      .then((json) => setUserData(json?.user ? { user: json.user, ownedSkins: json.ownedSkins ?? [] } : fallbackUser))
      .catch(() => setUserData(fallbackUser));

  useEffect(() => {
    refreshStore();
    refreshUser();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const remaining = useMemo(() => formatRemaining(new Date(data?.dailyResetAtISO || 0).getTime() - now), [data?.dailyResetAtISO, now]);
  const activeBundle = data?.featuredBundle;
  const bundleSkins = useMemo(() => data?.catalog.filter((skin) => activeBundle?.skinIds.includes(skin.skinId)) ?? [], [activeBundle?.skinIds, data?.catalog]);

  const handleBuyBundle = async () => {
    if (!activeBundle) return;
    setBundleError('');

    if ((userData.user?.VP_Balance ?? 0) < activeBundle.priceVP) {
      setBundleError('Not enough VP to buy this bundle.');
      return;
    }
    if (!activeBundle.skinIds.length) {
      setBundleError('Bundle skins were not resolved from the API.');
      return;
    }

    setBuyingBundle(true);
    try {
      const res = await fetch('/api/purchase-bundle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, bundleId: activeBundle.id, priceVP: activeBundle.priceVP, skinIds: activeBundle.skinIds })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Bundle purchase failed');
      await refreshUser();
      setCompleted({ title: activeBundle.name, subtitle: 'Bundle Purchased', image: data?.bundleImage });
    } catch (e) {
      setBundleError(e instanceof Error ? e.message : 'Bundle purchase failed');
    } finally {
      setBuyingBundle(false);
    }
  };

  if (!data || !activeBundle) return <div className="p-8 text-xl uppercase tracking-widest text-slate-300">Loading store...</div>;

  return (
    <main className="mx-auto min-h-screen w-full max-w-[1350px] px-4 py-6 text-white">
      <header className="mb-4 rounded-xl border border-slate-700/60 bg-gradient-to-r from-[#0c1627] to-[#121f35] p-4 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Valora</p>
            <h1 className="text-2xl font-black uppercase">Skin Shop</h1>
          </div>
          <div className="flex items-center gap-2">
            <button className="rounded border border-cyan-400/60 bg-cyan-500/15 px-3 py-1 text-xs uppercase tracking-widest">Daily Offers</button>
            <button disabled className="cursor-not-allowed rounded border border-slate-600/60 bg-slate-900/50 px-3 py-1 text-xs uppercase tracking-widest text-slate-500">Bundle Shop</button>
            <button onClick={() => router.push(`/topup?userId=${userId}`)} className="rounded border border-emerald-400/60 bg-emerald-500/10 px-3 py-1 text-xs uppercase tracking-widest text-emerald-100">
              Top Up VP
            </button>
            <button onClick={() => router.push(`/loadout?userId=${userId}`)} className="rounded border border-fuchsia-400/60 bg-fuchsia-500/10 px-3 py-1 text-xs uppercase tracking-widest text-fuchsia-100">
              My Loadout
            </button>
            <button onClick={() => refreshStore(true)} className="rounded border border-slate-400/70 bg-black/30 px-3 py-1 text-xs uppercase tracking-widest">Refresh</button>
            <p className="inline-flex items-center gap-2 rounded border border-cyan-400/50 bg-cyan-500/10 px-3 py-1 text-xs">
              <VpLogo icon={data.vpIcon} /> {userData.user?.VP_Balance ?? 0}
            </p>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden rounded-xl border border-slate-300/30 bg-[#0b1728] shadow-[0_20px_80px_rgba(0,0,0,.45)]">
        <img src={data.bundleImage} alt={activeBundle.name} className="h-[430px] w-full object-cover opacity-75" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/35 to-black/75" />
        <div className="absolute inset-0 grid grid-cols-12 gap-4 p-5">
          <div className="col-span-8 flex flex-col justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-300">Featured Collection</p>
              <h2 className="mt-2 text-5xl font-black uppercase">{activeBundle.name}</h2>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleBuyBundle} disabled={buyingBundle} className="rounded border-2 border-slate-100 bg-[#ece9df] px-8 py-3 text-lg font-bold text-black disabled:opacity-60">
                <span className="inline-flex items-center gap-2"><VpLogo icon={data.vpIcon} />{activeBundle.priceVP.toLocaleString()}</span>
              </button>
            </div>
            {bundleError ? <p className="text-xs text-red-300">{bundleError}</p> : null}
          </div>

          <div className="col-span-4 rounded-lg border border-slate-300/20 bg-black/35 p-3 backdrop-blur-sm">
            <p className="mb-2 text-xs uppercase tracking-[0.2em] text-slate-200">Inspect Bundle Contents</p>
            <div className="max-h-[320px] space-y-2 overflow-y-auto pr-1">
              {bundleSkins.map((skin) => (
                <button key={skin.skinId} onClick={() => setSelected(skin)} className="flex w-full items-center gap-2 rounded border border-slate-500/70 bg-slate-900/60 p-2 text-left hover:border-cyan-300/70">
                  <img src={skin.displayIcon || skin.showcaseImage} alt={skin.skinName} className="h-10 w-14 object-contain" />
                  <div>
                    <p className="truncate text-xs font-semibold uppercase">{skin.skinName}</p>
                    <p className="text-[10px] uppercase text-slate-400">{skin.weaponName}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="my-5 rounded-lg border border-slate-700/50 bg-[#0d1d35] p-3">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm uppercase tracking-[0.2em]">Daily Offers · <span className="text-amber-300">{remaining}</span></p>
          <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Daily rotation locked until next reset or manual refresh</p>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          {data.daily.map((offer) => (
            <button key={offer.skinId} onClick={() => setSelected(offer)} className="group overflow-hidden rounded border border-slate-400/40 bg-[#0e2038] text-left transition hover:-translate-y-0.5 hover:border-cyan-300/60">
              <div className="h-40 bg-gradient-to-br from-[#573455] to-[#142c4e] p-2">
                <img src={offer.displayIcon || offer.showcaseImage} alt={offer.skinName} className="h-full w-full object-contain" />
              </div>
              <div className="flex items-center justify-between bg-black/45 px-3 py-2">
                <div>
                  <p className="truncate text-sm font-semibold uppercase tracking-wider">{offer.skinName}</p>
                  <p className="text-[10px] uppercase tracking-widest text-slate-400">{offer.weaponName}</p>
                </div>
                <p className="inline-flex items-center gap-1 text-sm"><VpLogo icon={data.vpIcon} /> {offer.priceVP}</p>
              </div>
            </button>
          ))}
        </div>
      </section>

      {selected ? (
        <GunInspectModal
          offer={selected}
          userId={userData.user?.ID ?? 1}
          userVP={userData.user?.VP_Balance ?? 0}
          ownedLevel={userData.ownedSkins?.find((s) => s.SkinID === selected.skinId)?.LevelUnlocked ?? 0}
          onClose={() => {
            setSelected(null);
            refreshUser();
          }}
        />
      ) : null}

      {completed ? <PurchaseCompleteModal title={completed.title} subtitle={completed.subtitle} image={completed.image} onClose={() => setCompleted(null)} /> : null}
    </main>
  );
}
