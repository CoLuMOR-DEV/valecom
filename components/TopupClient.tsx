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
  const userId = Number(params.get('userId') ?? 1);
  const skinName = params.get('skinName') ?? 'Your account';
  const skinId = params.get('skinId') ?? '';
  const targetLevel = Number(params.get('targetLevel') ?? 1);
  const vpDeficit = Number(params.get('vpDeficit') ?? 1000);
  const vpCost = Number(params.get('vpCost') ?? 0);

  const recommended = useMemo(() => VP_PACKS.find((p) => p.vp >= Math.max(1, vpDeficit)) ?? VP_PACKS[VP_PACKS.length - 1], [vpDeficit]);
  const [selectedVP, setSelectedVP] = useState<number>(recommended.vp);
  const [state, setState] = useState<'idle' | 'processing' | 'success'>('idle');
  const [error, setError] = useState('');

  const isLinkedPurchase = Boolean(skinId) && vpCost > 0;

  const handleCheckout = async () => {
    setError('');
    setState('processing');

    try {
      await new Promise((resolve) => setTimeout(resolve, 1100));

      const topupRes = await fetch('/api/topup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, vpAmount: selectedVP })
      });

      const topupJson = await topupRes.json();
      if (!topupRes.ok) {
        throw new Error(topupJson.error ?? 'Top up failed');
      }

      if (isLinkedPurchase) {
        const purchaseRes = await fetch('/api/purchase', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, skinId, level: targetLevel, vpCost })
        });

        const purchaseJson = await purchaseRes.json();
        if (!purchaseRes.ok) {
          throw new Error(purchaseJson.error ?? 'Purchase failed');
        }
      }

      setState('success');
      setTimeout(() => router.push('/'), 1200);
    } catch (e) {
      setState('idle');
      setError(e instanceof Error ? e.message : 'Checkout failed');
    }
  };

  return (
    <main className="mx-auto max-w-6xl p-4 md:p-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <button
          onClick={() => router.back()}
          className="rounded border border-slate-500/70 bg-slate-900/60 px-4 py-2 text-xs uppercase tracking-[0.2em] text-slate-100"
        >
          ← Back
        </button>
        <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Secure Top Up</p>
      </div>

      <section className="rounded-2xl border border-cyan-400/30 bg-gradient-to-br from-[#091a2f] via-[#081225] to-[#160b24] p-5 shadow-2xl md:p-8">
        <h1 className="mb-2 text-center text-3xl font-black uppercase md:text-5xl">Buy Valorant Points</h1>
        <p className="mb-8 text-center text-sm text-slate-300 md:text-base">
          Recommended for {skinName}: <span className="text-valorant-mint">{recommended.vp} VP</span>
          {isLinkedPurchase ? ` · Auto-purchase level ${targetLevel}` : ' · Wallet top up only'}
        </p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          {VP_PACKS.map((pack) => {
            const isRecommended = pack.vp === recommended.vp;
            const active = selectedVP === pack.vp;
            return (
              <button
                key={pack.vp}
                onClick={() => setSelectedVP(pack.vp)}
                className={`valorant-card relative rounded-xl border p-6 text-left transition ${active ? 'scale-[1.01] border-cyan-300 ring-2 ring-cyan-300/60' : 'border-slate-500/60 hover:border-cyan-300/70'}`}
              >
                {isRecommended ? <span className="absolute left-0 top-0 rounded-br bg-valorant-mint px-3 py-1 text-[10px] font-bold text-black">RECOMMENDED</span> : null}
                <p className="mt-4 text-3xl font-black">{pack.vp.toLocaleString()} VP</p>
                <p className="text-slate-300">PHP {pack.price.toLocaleString()}</p>
              </button>
            );
          })}
        </div>

        <div className="mt-8 rounded-xl border border-slate-600/50 bg-black/30 p-3">
          <CheckoutAnimation state={state} />
        </div>

        {error ? <p className="mt-3 text-center text-sm text-red-400">{error}</p> : null}

        <button
          onClick={handleCheckout}
          disabled={state !== 'idle'}
          className="mt-6 w-full rounded-md bg-valorant-accent py-3 text-xl font-semibold uppercase tracking-wide transition hover:brightness-110 disabled:opacity-60"
        >
          Confirm Purchase
        </button>
      </section>
    </main>
  );
}
