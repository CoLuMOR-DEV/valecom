'use client';

import { useEffect, useState } from 'react';
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
    <div className="fixed inset-0 z-50 bg-black/70 p-8">
      <div className="mx-auto grid h-full max-w-6xl grid-cols-12 gap-6 rounded-lg border border-slate-200/20 bg-slate-950/90 p-6">
        <div className="col-span-8">
          <img src={offer.showcaseImage} alt={offer.skinName} className="h-[540px] w-full rounded object-cover" />
        </div>
        <div className="col-span-4 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-bold uppercase">{offer.skinName}</h3>
            <button onClick={onClose}>✕</button>
          </div>

          <div>
            <p className="mb-2 text-sm text-slate-300">Levels</p>
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4].map((level) => (
                <button
                  key={level}
                  onClick={() => setSelectedLevel(level)}
                  className={`rounded border px-3 py-2 ${selectedLevel === level ? 'border-valorant-mint text-valorant-mint' : 'border-slate-600'}`}
                >
                  L{level}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-slate-400">Current unlocked level: {ownedLevel}</p>
          </div>

          <div>
            <p className="mb-2 text-sm text-slate-300">Variants</p>
            <div className="grid grid-cols-4 gap-2">
              {offer.variants.map((variant) => (
                <button
                  key={variant.id}
                  onClick={() => setVariantId(variant.id)}
                  className={`h-10 rounded border ${variantId === variant.id ? 'border-valorant-mint' : 'border-slate-700'}`}
                  style={{ background: variant.swatch || '#334155' }}
                  title={variant.name}
                />
              ))}
            </div>
          </div>

          {locked ? (
            <div className="mt-4 rounded border border-amber-400/40 bg-amber-900/20 p-3">
              <p className="mb-2 text-sm uppercase text-amber-200">Level {selectedLevel} locked</p>
              <p className="text-xs text-slate-300">Cost: {upgradeCost} VP · You have: {userVP} VP · Deficit: {deficit} VP</p>
              <button
                onClick={handleUnlock}
                className="mt-3 w-full rounded bg-valorant-accent py-2 text-sm font-semibold uppercase"
              >
                Unlock Level {selectedLevel}
              </button>
            </div>
          ) : (
            <p className="mt-2 text-valorant-mint">This level is already unlocked.</p>
          )}
        </div>
      </div>
    </div>
  );
}
