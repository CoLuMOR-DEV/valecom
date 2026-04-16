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
  const [selectedBundleId, setSelectedBundleId] = useState<string>('');
  const [userData, setUserData] = useState<UserResponse>(fallbackUser);
  const [now, setNow] = useState(Date.now());
  const [bundleError, setBundleError] = useState('');
  const [buyingBundle, setBuyingBundle] = useState(false);

  const userId = 1;

  const refreshStore = () => {
    fetch(`/api/shop?seed=${Date.now()}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.featured && Array.isArray(json.daily)) {
          setData(json);
          setSelectedBundleId(json.featuredBundle?.id || '');
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

  const activeBundle = useMemo(
    () => data?.bundles?.find((bundle) => bundle.id === selectedBundleId) || data?.featuredBundle,
    [data, selectedBundleId]
  );

  const handleInspectBundle = () => {
    if (!activeBundle || !data) return;
    const firstSkin = data.catalog.find((skin) => activeBundle.skinIds.includes(skin.skinId));
    if (firstSkin) setSelected(firstSkin);
  };

  const handleBuyBundle = async () => {
    if (!activeBundle) return;
    setBundleError('');

    if ((userData.user?.VP_Balance ?? 0) < activeBundle.priceVP) {
      setBundleError('Not enough VP to buy this bundle.');
      return;
    }

    if (!activeBundle.skinIds.length) {
      setBundleError('Bundle exists in catalog but no skins were resolved from API.');
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
      if (!res.ok) {
        throw new Error(json.error ?? 'Bundle purchase failed');
      }
      refreshUser();
    } catch (e) {
      setBundleError(e instanceof Error ? e.message : 'Bundle purchase failed');
    } finally {
      setBuyingBundle(false);
    }
  };

  if (!data) {
    return <div className="p-8 text-xl uppercase tracking-widest text-slate-300">Loading store...</div>;
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-[1300px] px-4 py-6 text-white">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-xs uppercase tracking-[0.25em] text-slate-300">
        <p>Back // Store</p>
        <div className="flex items-center gap-3">
          <p>Player: {userData.user?.Username ?? 'Agent'}</p>
          <p className="rounded border border-cyan-400/50 bg-cyan-500/10 px-3 py-1 text-cyan-200">
            <VpLogo /> {userData.user?.VP_Balance ?? 0}
          </p>
          <button onClick={refreshStore} className="rounded border border-slate-500 bg-slate-900/50 px-2 py-1 text-[10px] tracking-wider hover:border-cyan-300">
            Refresh Store
          </button>
        </div>
      </div>

      <section className="relative overflow-hidden rounded-xl border border-slate-300/30 bg-[#0b1728] shadow-[0_20px_80px_rgba(0,0,0,.45)]">
        {data.bundleImage ? (
          <img src={data.bundleImage} alt={activeBundle?.name} className="h-[420px] w-full object-cover opacity-70" />
        ) : (
          <div className="h-[420px] w-full bg-gradient-to-r from-[#601b2e] via-[#27436f] to-[#221f3b]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/30 to-black/70" />

        <div className="absolute inset-0 grid grid-cols-12 gap-4 p-6">
          <div className="col-span-8 flex flex-col justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-300">Featured Bundle</p>
              <h1 className="mt-2 text-5xl font-black uppercase leading-none text-white">{activeBundle?.name || data.featuredBundle.name}</h1>
              <p className="mt-2 text-sm uppercase tracking-[0.2em] text-slate-200">
                Available requested bundles: {data.requestedBundleCoverage.available.length} / {data.bundles.length}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button onClick={handleBuyBundle} disabled={buyingBundle} className="border-2 border-slate-100 bg-[#ece9df] px-10 py-3 text-xl font-bold text-black disabled:opacity-60">
                <span className="inline-flex items-center gap-2">
                  <VpLogo /> {activeBundle?.priceVP.toLocaleString()}
                </span>
              </button>
              <button onClick={handleInspectBundle} className="rounded border border-slate-100/80 bg-black/25 px-5 py-3 text-xs uppercase tracking-widest">
                Inspect Bundle
              </button>
            </div>
            {bundleError ? <p className="text-xs text-red-300">{bundleError}</p> : null}
          </div>

          <div className="col-span-4 flex flex-col gap-2 rounded-lg border border-slate-300/20 bg-black/35 p-3 backdrop-blur-sm">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-200">Bundles</p>
            <div className="max-h-[310px] space-y-2 overflow-y-auto pr-1">
              {data.bundles.map((bundle) => (
                <button
                  key={bundle.id}
                  onClick={() => setSelectedBundleId(bundle.id)}
                  className={`flex w-full items-center justify-between rounded border px-3 py-2 text-left text-xs ${selectedBundleId === bundle.id ? 'border-cyan-300 bg-cyan-900/20' : 'border-slate-600 bg-slate-900/60'}`}
                >
                  <span>{bundle.name}</span>
                  <span className={bundle.available ? 'text-emerald-300' : 'text-amber-200'}>{bundle.available ? 'Available' : 'Missing'}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="my-5 flex items-center justify-center gap-4 text-sm uppercase tracking-[0.2em] text-slate-200">
        <div className="h-px w-48 bg-slate-600" />
        <p>Daily Offers (Bundles Excluded)</p>
        <p className="text-amber-300">{remaining}</p>
        <div className="h-px w-48 bg-slate-600" />
      </section>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-4">
        {data.daily.map((offer) => (
          <button
            key={offer.skinId}
            onClick={() => setSelected(offer)}
            className="group overflow-hidden rounded border border-slate-400/40 bg-[#0e2038] text-left transition hover:-translate-y-0.5 hover:border-cyan-300/60"
          >
            <div className="h-40 bg-gradient-to-br from-[#573455] to-[#142c4e] p-2">
              {offer.displayIcon || offer.showcaseImage ? (
                <img src={offer.displayIcon || offer.showcaseImage} alt={offer.skinName} className="h-full w-full object-contain" />
              ) : (
                <div className="flex h-full items-center justify-center text-xs uppercase text-slate-200">{offer.weaponName}</div>
              )}
            </div>
            <div className="flex items-center justify-between bg-black/45 px-3 py-2">
              <div>
                <p className="truncate text-sm font-semibold uppercase tracking-wider">{offer.skinName}</p>
                <p className="text-[10px] uppercase tracking-widest text-slate-400">{offer.weaponName}</p>
              </div>
              <p className="text-sm text-slate-200">
                <VpLogo /> {offer.priceVP}
              </p>
            </div>
          </button>
        ))}
      </section>


      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg uppercase tracking-[0.2em] text-slate-200">Expanded Skin Catalog</h2>
          <p className="text-xs uppercase text-slate-400">{data.catalog.length} skins loaded from Valorant API</p>
        </div>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-6">
          {data.catalog.slice(0, 60).map((offer) => (
            <button
              key={`catalog-${offer.skinId}`}
              onClick={() => setSelected(offer)}
              className="rounded border border-slate-700/70 bg-slate-900/40 p-2 text-left hover:border-cyan-300/60"
            >
              <div className="h-20">
                {offer.displayIcon ? <img src={offer.displayIcon} alt={offer.skinName} className="h-full w-full object-contain" /> : null}
              </div>
              <p className="truncate text-[11px] uppercase">{offer.skinName}</p>
            </button>
          ))}
        </div>
      </section>

      <section className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-5">
        {['Night.Market', 'Battlepass', 'Agents', 'Esports', 'Accessories'].map((tab) => (
          <div key={tab} className="rounded border border-slate-500/50 bg-[#0a1b31] px-3 py-2 text-center text-sm uppercase tracking-widest text-slate-200">
            {tab}
          </div>
        ))}
      </section>

      {selected && (
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
      )}
    </main>
  );
}
