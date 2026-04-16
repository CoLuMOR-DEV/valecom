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
  const [selectedLevel, setSelectedLevel] = useState(ownedLevel);
  const [variantId, setVariantId] = useState(offer.variants[0]?.id);
  const [upgradeCost, setUpgradeCost] = useState(0);
  const [deficit, setDeficit] = useState(0);

  const locked = selectedLevel > ownedLevel;
  const levelMeta = useMemo(() => offer.levels.find((l) => l.level === selectedLevel), [offer.levels, selectedLevel]);

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

  return (
    <div className="fixed inset-0 z-50 bg-black/80 p-6">
      <div className="mx-auto grid h-full max-w-6xl grid-cols-12 gap-4 rounded-lg border border-slate-200/20 bg-[#070c16] p-4">
        <div className="col-span-8 flex flex-col gap-2">
          <div className="flex items-center justify-between px-1 text-xs uppercase tracking-wider text-slate-300">
            <p>{offer.skinName} Level {selectedLevel}</p>
            <button onClick={onClose}>✕</button>
          </div>

          <div className="relative h-[470px] border border-slate-500/40 bg-black">
            {levelMeta?.previewVideo ? (
              <video key={levelMeta.previewVideo} src={levelMeta.previewVideo} controls autoPlay muted loop className="h-full w-full object-cover" />
            ) : (
              <img src={levelMeta?.previewImage || offer.showcaseImage} alt={offer.skinName} className="h-full w-full object-cover" />
            )}
          </div>

          <div className="grid grid-cols-4 gap-2">
            {[1, 2, 3, 4].map((lvl) => {
              const lmeta = offer.levels.find((l) => l.level === lvl);
              return (
                <button
                  key={lvl}
                  onClick={() => setSelectedLevel(lvl)}
                  className={`h-20 border ${selectedLevel === lvl ? 'border-cyan-300' : 'border-slate-600'} bg-slate-900/50`}
                >
                  <p className="text-xs uppercase">Level {lvl}</p>
                  <p className="text-[10px] text-slate-400">{lmeta?.cost ?? 0} VP</p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="col-span-4 flex flex-col gap-4 border-l border-slate-700/50 pl-4">
          <h3 className="text-2xl font-bold uppercase">{offer.skinName}</h3>

          <div>
            <p className="mb-2 text-sm text-slate-300">Variants</p>
            <div className="grid grid-cols-4 gap-2">
              {offer.variants.map((variant) => (
                <button
                  key={variant.id}
                  onClick={() => setVariantId(variant.id)}
                  className={`h-10 rounded border ${variantId === variant.id ? 'border-cyan-300' : 'border-slate-700'}`}
                  style={{ background: variant.swatch || '#334155' }}
                  title={variant.name}
                />
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
            <div className="rounded border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">This level is already unlocked.</div>
          )}

          <button className="rounded border-2 border-slate-100 bg-[#ece9df] py-3 text-black">BUY SKIN · {offer.priceVP} VP</button>
        </div>
      </div>
    </div>
  );
}
