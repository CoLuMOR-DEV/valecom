'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { SkinOffer } from '@/types/shop';

type Props = {
  offer: SkinOffer;
  userId: number;
  userVP: number;
  ownedLevel: number;
  onClose: () => void;
};

export default function GunInspectModal({ offer, userId, userVP, ownedLevel, onClose }: Props) {
  const router = useRouter();
  const [selectedLevel, setSelectedLevel] = useState(Math.max(1, ownedLevel));
  const [variantId, setVariantId] = useState(offer.variants[0]?.id);
  const [upgradeCost, setUpgradeCost] = useState(0);
  const [deficit, setDeficit] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const locked = selectedLevel > ownedLevel;
  const levelMeta = useMemo(() => offer.levels.find((l) => l.level === selectedLevel), [offer.levels, selectedLevel]);
  const selectedVariant = offer.variants.find((variant) => variant.id === variantId) ?? offer.variants[0];

  useEffect(() => {
    fetch('/api/upgrade-cost', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, skinId: offer.skinId, targetLevel: selectedLevel })
    })
      .then((res) => res.json())
      .then((json) => {
        setUpgradeCost(json.cost ?? 0);
        setDeficit(json.deficit ?? 0);
      })
      .catch(() => {
        setUpgradeCost(0);
        setDeficit(0);
      });
  }, [userId, offer.skinId, selectedLevel]);

  const handleUnlock = () => {
    router.push(
      `/topup?userId=${userId}&skinId=${offer.skinId}&skinName=${encodeURIComponent(offer.skinName)}&targetLevel=${selectedLevel}&vpDeficit=${deficit}&vpCost=${upgradeCost}`
    );
  };

  const handleBuySkin = async () => {
    setError('');
    if (ownedLevel >= 1) {
      setError('Skin already owned. Use Unlock Level for upgrades.');
      return;
    }

    if (userVP < offer.priceVP) {
      router.push(
        `/topup?userId=${userId}&skinId=${offer.skinId}&skinName=${encodeURIComponent(offer.skinName)}&targetLevel=1&vpDeficit=${offer.priceVP - userVP}&vpCost=${offer.priceVP}`
      );
      return;
    }

    setBusy(true);
    try {
      const res = await fetch('/api/purchase-skin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, skinId: offer.skinId, vpCost: offer.priceVP })
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error ?? 'Purchase failed');
      }

      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Buy skin failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 p-6 backdrop-blur-sm">
      <div className="mx-auto grid h-full max-w-6xl grid-cols-12 gap-4 rounded-lg border border-slate-200/20 bg-[#070c16] p-4">
        <div className="col-span-8 flex flex-col gap-2">
          <div className="flex items-center justify-between px-1 text-xs uppercase tracking-wider text-slate-300">
            <p>
              {offer.skinName} · {selectedVariant?.name || 'Default'} · Level {selectedLevel}
            </p>
            <button onClick={onClose}>✕</button>
          </div>

          <div className="relative h-[470px] border border-slate-500/40 bg-black">
            {levelMeta?.previewVideo ? (
              <video key={levelMeta.previewVideo} src={levelMeta.previewVideo} controls autoPlay muted loop className="h-full w-full object-cover" />
            ) : (
              <img src={selectedVariant?.displayIcon || levelMeta?.previewImage || offer.showcaseImage} alt={offer.skinName} className="h-full w-full object-contain" />
            )}
          </div>

          <div className="grid grid-cols-5 gap-2">
            {offer.levels.map((lvl) => (
              <button
                key={lvl.level}
                onClick={() => setSelectedLevel(lvl.level)}
                className={`h-20 border ${selectedLevel === lvl.level ? 'border-cyan-300' : 'border-slate-600'} bg-slate-900/50`}
              >
                <p className="text-xs uppercase">Level {lvl.level}</p>
                <p className="text-[10px] text-slate-400">{lvl.cost} VP</p>
              </button>
            ))}
          </div>
        </div>

        <div className="col-span-4 flex flex-col gap-4 border-l border-slate-700/50 pl-4">
          <h3 className="text-2xl font-bold uppercase">{offer.skinName}</h3>

          <div>
            <p className="mb-2 text-sm text-slate-300">Variants</p>
            <div className="grid grid-cols-2 gap-2">
              {offer.variants.map((variant) => (
                <button
                  key={variant.id}
                  onClick={() => setVariantId(variant.id)}
                  className={`rounded border p-2 text-left ${variantId === variant.id ? 'border-cyan-300' : 'border-slate-700'}`}
                >
                  <div className="mb-2 h-12 overflow-hidden rounded bg-slate-900/60">
                    {variant.displayIcon ? <img src={variant.displayIcon} alt={variant.name} className="h-full w-full object-contain" /> : null}
                  </div>
                  <p className="truncate text-xs">{variant.name}</p>
                </button>
              ))}
            </div>
          </div>

          {locked ? (
            <div className="rounded border border-amber-400/40 bg-amber-900/20 p-3">
              <p className="mb-2 text-sm uppercase text-amber-200">Level {selectedLevel} locked</p>
              <p className="text-xs text-slate-300">Cost: {upgradeCost} VP · You have: {userVP} VP · Deficit: {deficit} VP</p>
              <button onClick={handleUnlock} className="mt-3 w-full rounded bg-[#ff4655] py-2 text-sm font-semibold uppercase">
                Unlock Level {selectedLevel}
              </button>
            </div>
          ) : (
            <div className="rounded border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">Current selected level is unlocked.</div>
          )}

          <button
            onClick={handleBuySkin}
            disabled={busy}
            className="rounded border-2 border-slate-100 bg-[#ece9df] py-3 text-black disabled:opacity-60"
          >
            {busy ? 'PROCESSING...' : `BUY SKIN · ${offer.priceVP} VP`}
          </button>
          {error ? <p className="text-xs text-red-300">{error}</p> : null}
        </div>
      </div>
    </div>
  );
}
