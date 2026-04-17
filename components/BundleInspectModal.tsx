'use client';

import { useMemo, useState } from 'react';
import type { BundleOffer, SkinOffer } from '@/types/shop';

type Props = {
  bundle: BundleOffer;
  skins: SkinOffer[];
  userVP: number;
  onClose: () => void;
  onBuyBundle: () => Promise<void>;
};

const stages = ['Validating payment', 'Preparing order', 'Delivering skins'];

export default function BundleInspectModal({ bundle, skins, userVP, onClose, onBuyBundle }: Props) {
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState(0);
  const [error, setError] = useState('');
  const current = skins[index];
  const canAfford = userVP >= bundle.priceVP;

  const meta = useMemo(() => `${index + 1} / ${skins.length}`, [index, skins.length]);

  const handleBuy = async () => {
    setError('');
    if (!canAfford) {
      setError('Not enough VP for this bundle.');
      return;
    }

    setBusy(true);
    try {
      for (let i = 0; i < stages.length; i += 1) {
        setStage(i);
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
      await onBuyBundle();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Bundle purchase failed');
    } finally {
      setBusy(false);
      setStage(0);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 p-3 backdrop-blur-sm md:p-6">
      <div className="mx-auto grid h-full max-w-6xl grid-cols-1 gap-4 rounded-xl border border-slate-500/40 bg-[#060d1b] p-3 md:grid-cols-12 md:p-5">
        <div className="md:col-span-8">
          <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.2em] text-slate-300">
            <p>{bundle.name} · {meta}</p>
            <button onClick={onClose}>✕</button>
          </div>
          <div className="h-[280px] rounded border border-slate-600/60 bg-black md:h-[520px]">
            {current ? <img src={current.showcaseImage || current.displayIcon} alt={current.skinName} className="h-full w-full object-contain" /> : null}
          </div>
          <div className="mt-3 flex items-center justify-between">
            <button onClick={() => setIndex((v) => (v - 1 + skins.length) % skins.length)} className="rounded border border-slate-600 px-4 py-2 text-xs uppercase">Prev</button>
            <p className="text-center text-sm">
              <span className="font-bold uppercase">{current?.skinName}</span>
              <br />
              <span className="text-xs text-slate-400">{current?.weaponName}</span>
            </p>
            <button onClick={() => setIndex((v) => (v + 1) % skins.length)} className="rounded border border-slate-600 px-4 py-2 text-xs uppercase">Next</button>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-700 pt-3 md:col-span-4 md:border-l md:border-t-0 md:pl-4 md:pt-0">
          <h3 className="text-2xl font-black uppercase">Bundle Contents</h3>
          <div className="max-h-[270px] space-y-2 overflow-y-auto pr-1">
            {skins.map((skin, idx) => (
              <button key={skin.skinId} onClick={() => setIndex(idx)} className={`w-full rounded border p-2 text-left ${idx === index ? 'border-cyan-300 bg-cyan-500/10' : 'border-slate-700 bg-slate-900/40'}`}>
                <p className="truncate text-xs font-semibold uppercase">{skin.skinName}</p>
                <p className="text-[10px] uppercase text-slate-400">{skin.weaponName}</p>
              </button>
            ))}
          </div>

          <div className="rounded border border-amber-400/30 bg-amber-900/20 p-3 text-sm">
            <p className="uppercase text-amber-200">Price</p>
            <p className="text-2xl font-black">{bundle.priceVP.toLocaleString()} VP</p>
            <p className="text-xs text-slate-300">Your VP: {userVP.toLocaleString()}</p>
          </div>

          <button onClick={handleBuy} disabled={busy || !skins.length} className="rounded bg-[#ece9df] py-3 font-semibold uppercase text-black disabled:opacity-60">
            {busy ? 'Processing Order...' : 'Buy Bundle'}
          </button>

          {busy ? (
            <div className="rounded border border-slate-600/60 bg-black/35 p-3 text-xs">
              {stages.map((label, idx) => (
                <p key={label} className={idx <= stage ? 'text-emerald-300' : 'text-slate-500'}>{idx <= stage ? '●' : '○'} {label}</p>
              ))}
            </div>
          ) : null}

          {error ? <p className="text-xs text-red-300">{error}</p> : null}
        </div>
      </div>
    </div>
  );
}
