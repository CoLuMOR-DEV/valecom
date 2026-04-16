'use client';

import { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import CheckoutAnimation from '@/components/CheckoutAnimation';

const VP_PACKS = [
  { vp: 475, price: 199 },
  { vp: 1000, price: 399 },
  { vp: 2050, price: 799 },
  { vp: 3650, price: 1399 },
  { vp: 5350, price: 1999 },
  { vp: 11000, price: 3999 }
];

export default function TopupClient() {
  const params = useSearchParams();
  const router = useRouter();
  const skinName = params.get('skinName') ?? 'Selected Skin';
  const skinId = params.get('skinId') ?? '';
  const targetLevel = Number(params.get('targetLevel') ?? 4);
  const vpDeficit = Number(params.get('vpDeficit') ?? 1000);
  const vpCost = Number(params.get('vpCost') ?? 1000);

  const recommended = useMemo(() => VP_PACKS.find((p) => p.vp >= vpDeficit) ?? VP_PACKS[VP_PACKS.length - 1], [vpDeficit]);
  const [selectedVP, setSelectedVP] = useState<number>(recommended.vp);
  const [state, setState] = useState<'idle' | 'processing' | 'success'>('idle');

  const handleCheckout = async () => {
    setState('processing');
    await new Promise((resolve) => setTimeout(resolve, 2000));
    await fetch('/api/topup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 1, vpAmount: selectedVP })
    });

    await fetch('/api/purchase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 1, skinId, level: targetLevel, vpCost })
    });

    setState('success');
    setTimeout(() => router.push('/'), 1200);
  };

  return (
    <main className="mx-auto max-w-6xl p-8">
      <h1 className="mb-2 text-center text-5xl uppercase">Buy Valorant Points</h1>
      <p className="mb-8 text-center text-slate-300">
        Recommended for {skinName} Level {targetLevel} Upgrade: <span className="text-valorant-mint">{recommended.vp} VP</span>
      </p>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {VP_PACKS.map((pack) => {
          const isRecommended = pack.vp === recommended.vp;
          const active = selectedVP === pack.vp;
          return (
            <button
              key={pack.vp}
              onClick={() => setSelectedVP(pack.vp)}
              className={`valorant-card relative p-6 text-left ${active ? 'ring-2 ring-valorant-mint' : ''}`}
            >
              {isRecommended && <span className="absolute left-0 top-0 bg-valorant-mint px-3 py-1 text-xs text-black">RECOMMENDED</span>}
              <p className="mt-4 text-3xl font-bold">{pack.vp.toLocaleString()} VP</p>
              <p className="text-slate-400">PHP {pack.price.toLocaleString()}</p>
            </button>
          );
        })}
      </div>

      <div className="mt-8">
        <CheckoutAnimation state={state} />
      </div>

      <button
        onClick={handleCheckout}
        disabled={state !== 'idle'}
        className="mt-6 w-full rounded bg-valorant-accent py-3 text-xl uppercase disabled:opacity-60"
      >
        Confirm Purchase
      </button>
    </main>
  );
}
