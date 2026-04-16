'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { SkinOffer } from '@/types/shop';

type Props = {
  offer: SkinOffer;
  userVP: number;
  onClose: () => void;
};

export default function GunInspectModal({ offer, userVP, onClose }: Props) {
  const router = useRouter();
  const [selectedLevel, setSelectedLevel] = useState(1);
  const [variantId, setVariantId] = useState(offer.variants[0]?.id);

  const locked = selectedLevel > 1;
  const selectedCost = useMemo(() => offer.levels.find((l) => l.level === selectedLevel)?.cost ?? 0, [offer, selectedLevel]);
  const deficit = Math.max(0, selectedCost - userVP);

  const handleUnlock = () => {
    router.push(
      `/topup?skinId=${offer.skinId}&skinName=${encodeURIComponent(offer.skinName)}&targetLevel=${selectedLevel}&vpDeficit=${deficit}&vpCost=${selectedCost}`
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
              {offer.levels.map((level) => (
                <button
                  key={level.level}
                  onClick={() => setSelectedLevel(level.level)}
                  className={`rounded border px-3 py-2 ${selectedLevel === level.level ? 'border-valorant-mint text-valorant-mint' : 'border-slate-600'}`}
                >
                  L{level.level}
                </button>
              ))}
            </div>
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
              <p className="text-xs text-slate-300">Cost: {selectedCost} VP · You have: {userVP} VP · Deficit: {deficit} VP</p>
              <button
                onClick={handleUnlock}
                className="mt-3 w-full rounded bg-valorant-accent py-2 text-sm font-semibold uppercase"
              >
                Unlock Level {selectedLevel}
              </button>
            </div>
          ) : (
            <p className="mt-2 text-valorant-mint">Level 1 unlocked by default.</p>
          )}
        </div>
      </div>
    </div>
  );
}
