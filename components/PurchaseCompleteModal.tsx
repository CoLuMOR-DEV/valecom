'use client';

type Props = {
  title: string;
  subtitle: string;
  image?: string;
  onClose: () => void;
};

export default function PurchaseCompleteModal({ title, subtitle, image, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-[70] bg-black/70 p-4 backdrop-blur-sm">
      <div className="mx-auto flex h-full max-w-5xl flex-col items-center justify-center rounded-xl border border-cyan-200/30 bg-gradient-to-b from-[#111d34] via-[#2f3b73] to-[#17284a] p-6 text-center shadow-2xl">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-300">✔ Purchase Complete</p>
        <h2 className="mt-2 text-4xl font-black uppercase text-white">{title}</h2>
        <p className="mt-1 text-sm uppercase tracking-[0.2em] text-slate-200">{subtitle}</p>
        <div className="mt-8 h-[320px] w-full max-w-3xl rounded-lg border border-slate-200/25 bg-black/20 p-4">
          {image ? <img src={image} alt={title} className="h-full w-full object-contain" /> : null}
        </div>
        <button onClick={onClose} className="mt-8 rounded border border-white/60 bg-white/90 px-10 py-2 text-sm font-bold uppercase tracking-[0.2em] text-slate-950">
          Equip
        </button>
      </div>
    </div>
  );
}
