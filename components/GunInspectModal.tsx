'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { SkinOffer } from '@/types/shop';
import PurchaseCompleteModal from './PurchaseCompleteModal';

type Props = {
  offer: SkinOffer;
  userId: number;
  userVP: number;
  ownedLevel: number;
  canPurchase: boolean;
  onClose: () => void;
  onRequireLogin: () => void;
};

const steps = ['Authorizing purchase', 'Reserving inventory', 'Finalizing'];

export default function GunInspectModal({ offer, userId, userVP, ownedLevel, canPurchase, onClose, onRequireLogin }: Props) {
  const router = useRouter();
  const [selectedLevel, setSelectedLevel] = useState(Math.max(1, ownedLevel || 1));
  const [variantId, setVariantId] = useState(offer.variants[0]?.id);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState(0);
  const [error, setError] = useState('');
  const [showPurchased, setShowPurchased] = useState(false);

  const levelMeta = useMemo(() => offer.levels.find((l) => l.level === selectedLevel), [offer.levels, selectedLevel]);
  const selectedVariant = offer.variants.find((variant) => variant.id === variantId) ?? offer.variants[0];

  const handleBuySkin = async () => {
    setError('');

    if (!canPurchase) {
      onRequireLogin();
      return;
    }

    if (ownedLevel >= 1) {
      setError('Skin already owned. Check your Loadout to equip it.');
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
      for (let i = 0; i < steps.length; i += 1) {
        setStage(i);
        await new Promise((resolve) => setTimeout(resolve, 400));
      }

      const res = await fetch('/api/purchase-skin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, skinId: offer.skinId, vpCost: offer.priceVP })
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error ?? 'Purchase failed');
      }

      setShowPurchased(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Buy skin failed');
    } finally {
      setBusy(false);
      setStage(0);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/80 p-2 backdrop-blur-sm md:p-6">
        <div className="mx-auto grid h-full max-w-6xl grid-cols-1 gap-4 rounded-lg border border-slate-200/20 bg-[#070c16] p-3 md:grid-cols-12 md:p-4">
          <div className="flex flex-col gap-2 md:col-span-8">
            <div className="flex items-center justify-between px-1 text-xs uppercase tracking-wider text-slate-300">
              <p>
                {offer.skinName} · {selectedVariant?.name || 'Default'} · Level {selectedLevel}
              </p>
              <button onClick={onClose}>✕</button>
            </div>

            <div className="relative h-[260px] border border-slate-500/40 bg-black md:h-[470px]">
              {levelMeta?.previewVideo ? (
                <video key={levelMeta.previewVideo} src={levelMeta.previewVideo} controls autoPlay muted loop className="h-full w-full object-cover" />
              ) : (
                <img src={selectedVariant?.displayIcon || levelMeta?.previewImage || offer.showcaseImage} alt={offer.skinName} className="h-full w-full object-contain" />
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
              {offer.levels.map((lvl) => (
                <button
                  key={lvl.level}
                  onClick={() => setSelectedLevel(lvl.level)}
                  className={`h-16 border ${selectedLevel === lvl.level ? 'border-cyan-300 bg-cyan-500/15' : 'border-slate-600 bg-slate-900/50'}`}
                >
                  <p className="text-xs uppercase">Level {lvl.level}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-4 border-t border-slate-700/50 pt-3 md:col-span-4 md:border-l md:border-t-0 md:pl-4 md:pt-0">
            <h3 className="text-2xl font-bold uppercase">{offer.skinName}</h3>
            <p className="-mt-2 text-xs uppercase tracking-[0.2em] text-slate-400">Preview levels only · Single skin purchase</p>

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

            <div className="rounded border border-cyan-500/30 bg-cyan-950/20 p-3 text-sm text-slate-200">
              <p className="mb-1 uppercase tracking-wide">Price</p>
              <p className="text-lg font-bold">{offer.priceVP.toLocaleString()} VP</p>
            </div>

            <button
              onClick={handleBuySkin}
              disabled={busy}
              className="rounded border-2 border-slate-100 bg-[#ece9df] py-3 text-black transition hover:brightness-110 disabled:opacity-60"
            >
              {busy ? 'PROCESSING...' : canPurchase ? `BUY SKIN · ${offer.priceVP} VP` : 'LOGIN TO BUY'}
            </button>
            <button
              onClick={() => (canPurchase ? router.push(`/topup?userId=${userId}&skinName=${encodeURIComponent(offer.skinName)}&vpDeficit=${Math.max(0, offer.priceVP - userVP)}`) : onRequireLogin())}
              className="rounded border border-cyan-300/60 bg-cyan-500/10 py-2 text-xs font-semibold uppercase tracking-wider text-cyan-100"
            >
              {canPurchase ? 'Top Up VP' : 'Login Required'}
            </button>

            {!canPurchase ? <p className="text-xs text-amber-300">Guest mode: inspect all levels and variants, but purchases are disabled.</p> : null}

            {busy ? (
              <div className="rounded border border-slate-600/60 bg-black/35 p-3 text-xs">
                {steps.map((label, idx) => (
                  <p key={label} className={idx <= stage ? 'text-emerald-300' : 'text-slate-500'}>
                    {idx <= stage ? '●' : '○'} {label}
                  </p>
                ))}
              </div>
            ) : null}

            {error ? <p className="text-xs text-red-300">{error}</p> : null}
          </div>
        </div>
      </div>
      {showPurchased ? (
        <PurchaseCompleteModal
          title={offer.skinName}
          subtitle={`Purchased · ${offer.weaponName}`}
          image={selectedVariant?.displayIcon || levelMeta?.previewImage || offer.showcaseImage}
          onClose={onClose}
        />
      ) : null}
    </>
  );
}
