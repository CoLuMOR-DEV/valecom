'use client';

import { useEffect, useState } from 'react';
import GunInspectModal from './GunInspectModal';
import type { SkinOffer } from '@/types/shop';

type ShopResponse = {
  featured: SkinOffer;
  daily: SkinOffer[];
};

export default function ShopGrid() {
  const [data, setData] = useState<ShopResponse | null>(null);
  const [selected, setSelected] = useState<SkinOffer | null>(null);

  useEffect(() => {
    fetch('/api/shop')
      .then((res) => res.json())
      .then(setData)
      .catch(() => null);
  }, []);

  if (!data) {
    return <div className="p-8">Loading store...</div>;
  }

  return (
    <main className="mx-auto max-w-7xl p-6">
      <section className="valorant-card mb-8 overflow-hidden">
        <button onClick={() => setSelected(data.featured)} className="block w-full">
          <img src={data.featured.showcaseImage} alt={data.featured.skinName} className="h-[380px] w-full object-cover" />
          <div className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs text-slate-300">FEATURED</p>
              <h1 className="text-4xl font-bold uppercase">{data.featured.collectionName}</h1>
            </div>
            <p className="text-3xl">{data.featured.priceVP} VP</p>
          </div>
        </button>
      </section>

      <h2 className="mb-3 text-center text-xl uppercase tracking-wider text-slate-200">Daily Offers</h2>
      <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {data.daily.map((offer) => (
          <button key={offer.skinId} onClick={() => setSelected(offer)} className="valorant-card overflow-hidden text-left">
            <img src={offer.displayIcon || offer.showcaseImage} alt={offer.skinName} className="h-40 w-full object-cover" />
            <div className="p-3">
              <p className="truncate text-lg uppercase">{offer.skinName}</p>
              <p className="text-slate-300">{offer.priceVP} VP</p>
            </div>
          </button>
        ))}
      </section>

      {selected && <GunInspectModal offer={selected} userVP={350} onClose={() => setSelected(null)} />}
    </main>
  );
}
