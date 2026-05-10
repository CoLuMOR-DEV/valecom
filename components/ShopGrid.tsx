"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import GunInspectModal from "./GunInspectModal";
import PurchaseCompleteModal from "./PurchaseCompleteModal";
import BundleInspectModal from "./BundleInspectModal";
import ThemeToggle from "./ThemeToggle";
import type { ShopPayload, SkinOffer } from "@/types/shop";

type Owned = { SkinID: string; LevelUnlocked: number };
type SessionUser = { ID: number; Username: string; VP_Balance: number };
type UserResponse = { user?: SessionUser; ownedSkins?: Owned[] };
type PurchaseDone = { title: string; subtitle: string; image?: string } | null;

const fallbackUser = {
  user: { ID: 0, VP_Balance: 0, Username: "Guest" },
  ownedSkins: [] as Owned[],
};

function VpLogo({ icon }: { icon?: string }) {
  return icon ? (
    <img
      src={icon}
      alt="Valorant Points"
      className="h-5 w-5 rounded-full border border-slate-500/70"
    />
  ) : (
    <span className="text-xs">VP</span>
  );
}

function formatRemaining(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = String(Math.floor(total / 3600)).padStart(2, "0");
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
  const s = String(total % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

export default function ShopGrid() {
  const router = useRouter();
  const [data, setData] = useState<ShopPayload | null>(null);
  const [selected, setSelected] = useState<SkinOffer | null>(null);
  const [userData, setUserData] = useState<UserResponse>(fallbackUser);
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
  const [showBundleInspect, setShowBundleInspect] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [bundleError, setBundleError] = useState("");
  const [completed, setCompleted] = useState<PurchaseDone>(null);

  useEffect(() => {
    const raw = window.localStorage.getItem("valora-user");
    if (!raw) return;

    try {
      setSessionUser(JSON.parse(raw));
    } catch {
      window.localStorage.removeItem("valora-user");
    }
  }, []);

  const userId = sessionUser?.ID ?? 0;
  const canPurchase = Boolean(sessionUser?.ID);

  const getStoreSeed = () => {
    if (typeof window === "undefined") return Date.now();
    const nextReset = new Date();
    nextReset.setUTCHours(0, 0, 0, 0);
    nextReset.setUTCDate(nextReset.getUTCDate() + 1);

    const savedSeed = window.localStorage.getItem("valora-shop-seed");
    const savedReset = window.localStorage.getItem("valora-shop-seed-reset");
    if (savedSeed && savedReset && Number(savedReset) > Date.now()) {
      return Number(savedSeed);
    }

    const newSeed = Date.now();
    window.localStorage.setItem("valora-shop-seed", String(newSeed));
    window.localStorage.setItem(
      "valora-shop-seed-reset",
      String(nextReset.getTime()),
    );
    return newSeed;
  };

  const refreshStore = (forceNewSeed = false) => {
    const seed = forceNewSeed
      ? (() => {
          const newSeed = Date.now();
          if (typeof window !== "undefined") {
            const nextReset = new Date();
            nextReset.setUTCHours(0, 0, 0, 0);
            nextReset.setUTCDate(nextReset.getUTCDate() + 1);
            window.localStorage.setItem("valora-shop-seed", String(newSeed));
            window.localStorage.setItem(
              "valora-shop-seed-reset",
              String(nextReset.getTime()),
            );
          }
          return newSeed;
        })()
      : getStoreSeed();

    return fetch(`/api/shop?seed=${seed}`)
      .then((res) => res.json())
      .then((json) =>
        json.featured && Array.isArray(json.daily) ? setData(json) : null,
      )
      .catch(() => null);
  };

  const refreshUser = () => {
    if (!userId) {
      setUserData(fallbackUser);
      return;
    }

    fetch(`/api/user/${userId}`)
      .then((res) => res.json())
      .then((json) => {
        const payload = json?.user
          ? { user: json.user, ownedSkins: json.ownedSkins ?? [] }
          : fallbackUser;
        setUserData(payload);
        if (payload.user && typeof window !== "undefined") {
          window.localStorage.setItem(
            "valora-user",
            JSON.stringify(payload.user),
          );
          setSessionUser(payload.user);
        }
      })
      .catch(() => setUserData(fallbackUser));
  };

  useEffect(() => {
    refreshStore();
  }, []);

  useEffect(() => {
    refreshUser();
  }, [userId]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const remaining = useMemo(
    () => formatRemaining(new Date(data?.dailyResetAtISO || 0).getTime() - now),
    [data?.dailyResetAtISO, now],
  );
  const activeBundle = data?.featuredBundle;
  const bundleSkins = useMemo(
    () =>
      data?.catalog.filter((skin) =>
        activeBundle?.skinIds.includes(skin.skinId),
      ) ?? [],
    [activeBundle?.skinIds, data?.catalog],
  );

  const handleBuyBundle = async () => {
    if (!activeBundle || !canPurchase) return;
    setBundleError("");

    if ((userData.user?.VP_Balance ?? 0) < activeBundle.priceVP) {
      throw new Error("Not enough VP to buy this bundle.");
    }

    const res = await fetch("/api/purchase-bundle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        bundleId: activeBundle.id,
        priceVP: activeBundle.priceVP,
        skinIds: activeBundle.skinIds,
      }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "Bundle purchase failed");

    await refreshUser();
    setCompleted({
      title: activeBundle.name,
      subtitle: "Bundle Purchased",
      image: data?.bundleImage,
    });
  };

  if (!data || !activeBundle)
    return (
      <div className="p-8 text-xl uppercase tracking-widest muted-text">
        Loading store...
      </div>
    );

  return (
    <main className="mx-auto grid min-h-screen w-full max-w-[1450px] gap-4 px-3 py-4 md:px-4 md:py-6 lg:grid-cols-[280px_1fr]">
      <aside className="glass-panel sticky top-4 z-20 h-fit rounded-[2rem] p-4 lg:min-h-[calc(100vh-2rem)]">
        <div className="flex items-start justify-between gap-3 lg:block">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] muted-text">
              Valora
            </p>
            <h1 className="mt-1 text-3xl font-black uppercase leading-none">
              Skin Shop
            </h1>
            <p className="mt-2 text-xs muted-text">
              {canPurchase
                ? `Signed in as ${userData.user?.Username ?? sessionUser?.Username}`
                : "Guest mode: inspect only"}
            </p>
          </div>
          <div className="lg:mt-5">
            <ThemeToggle />
          </div>
        </div>

        <div className="mt-5 grid gap-2">
          <p className="rounded-2xl border border-cyan-400/40 bg-cyan-500/10 px-3 py-3 text-xs font-bold uppercase tracking-[0.25em] text-cyan-100">
            Daily Offers
          </p>
          <button
            onClick={() =>
              canPurchase
                ? router.push(`/topup?userId=${userId}`)
                : router.push("/login")
            }
            className="nav-action rounded-2xl px-3 py-3 text-left text-xs font-bold uppercase tracking-[0.22em] transition"
          >
            Top Up VP
          </button>
          <button
            onClick={() =>
              canPurchase
                ? router.push(`/loadout?userId=${userId}`)
                : router.push("/login")
            }
            className="nav-action rounded-2xl px-3 py-3 text-left text-xs font-bold uppercase tracking-[0.22em] transition"
          >
            My Loadout
          </button>
          <button
            onClick={() => router.push("/admin")}
            className="nav-action rounded-2xl px-3 py-3 text-left text-xs font-bold uppercase tracking-[0.22em] transition"
          >
            Admin Panel
          </button>
          {canPurchase ? (
            <button
              onClick={() => {
                window.localStorage.removeItem("valora-user");
                setSessionUser(null);
              }}
              className="nav-action rounded-2xl px-3 py-3 text-left text-xs font-bold uppercase tracking-[0.22em] transition"
            >
              Logout
            </button>
          ) : (
            <button
              onClick={() => router.push("/login")}
              className="nav-action rounded-2xl px-3 py-3 text-left text-xs font-bold uppercase tracking-[0.22em] transition"
            >
              Login / Sign Up
            </button>
          )}
          <button
            onClick={() => refreshStore(true)}
            className="nav-action rounded-2xl px-3 py-3 text-left text-xs font-bold uppercase tracking-[0.22em] transition"
          >
            Refresh Store
          </button>
        </div>

        <div className="mt-5 rounded-[1.5rem] border border-cyan-400/30 bg-cyan-500/10 p-4">
          <p className="text-[10px] uppercase tracking-[0.28em] muted-text">
            Wallet Balance
          </p>
          <p className="mt-2 inline-flex items-center gap-2 text-2xl font-black">
            <VpLogo icon={data.vpIcon} />{" "}
            {(userData.user?.VP_Balance ?? 0).toLocaleString()}
          </p>
        </div>
      </aside>

      <div className="min-w-0">
        <section
          onClick={() => setShowBundleInspect(true)}
          className="glass-card relative cursor-pointer overflow-hidden rounded-[2rem]"
        >
          <img
            src={data.bundleImage}
            alt={activeBundle.name}
            className="h-[280px] w-full object-cover opacity-80 md:h-[470px]"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/25 to-black/70" />
          <div className="absolute inset-0 grid grid-cols-1 gap-4 p-4 md:grid-cols-12 md:p-5">
            <div className="flex flex-col justify-between md:col-span-8">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-300">
                  Featured Collection
                </p>
                <h2 className="mt-2 text-3xl font-black uppercase md:text-5xl">
                  {activeBundle.name}
                </h2>
                <p className="mt-3 text-xs uppercase tracking-[0.2em] text-cyan-200">
                  Click anywhere to inspect the full bundle with levels
                </p>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowBundleInspect(true);
                  }}
                  className="valorant-primary rounded-2xl px-6 py-3 text-lg font-bold md:px-8"
                >
                  <span className="inline-flex items-center gap-2">
                    <VpLogo icon={data.vpIcon} />
                    {activeBundle.priceVP.toLocaleString()}
                  </span>
                </button>
              </div>
              {bundleError ? (
                <p className="text-xs text-red-300">{bundleError}</p>
              ) : null}
            </div>
          </div>
        </section>

        <section className="glass-panel my-5 rounded-[2rem] p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm uppercase tracking-[0.2em]">
              Daily Offers · <span className="text-amber-300">{remaining}</span>
            </p>
            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
              Daily rotation locked until next reset or manual refresh
            </p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
            {data.daily.map((offer) => (
              <button
                key={offer.skinId}
                onClick={() => setSelected(offer)}
                className="glass-card group overflow-hidden rounded-[1.5rem] text-left transition hover:-translate-y-1 hover:border-cyan-300/70"
              >
                <div className="h-40 bg-gradient-to-br from-rose-500/20 via-slate-900/30 to-cyan-500/20 p-3">
                  <img
                    src={offer.displayIcon || offer.showcaseImage}
                    alt={offer.skinName}
                    className="h-full w-full object-contain"
                  />
                </div>
                <div className="flex items-center justify-between border-t border-white/10 bg-black/25 px-3 py-3">
                  <div>
                    <p className="truncate text-sm font-semibold uppercase tracking-wider">
                      {offer.skinName}
                    </p>
                    <p className="text-[10px] uppercase tracking-widest text-slate-400">
                      {offer.weaponName}
                    </p>
                  </div>
                  <p className="inline-flex items-center gap-1 text-sm">
                    <VpLogo icon={data.vpIcon} /> {offer.priceVP}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </section>

        {selected ? (
          <GunInspectModal
            offer={selected}
            userId={userData.user?.ID ?? 0}
            userVP={userData.user?.VP_Balance ?? 0}
            ownedLevel={
              userData.ownedSkins?.find((s) => s.SkinID === selected.skinId)
                ?.LevelUnlocked ?? 0
            }
            canPurchase={canPurchase}
            onRequireLogin={() => router.push("/login")}
            onClose={() => {
              setSelected(null);
              refreshUser();
            }}
          />
        ) : null}

        {showBundleInspect ? (
          <BundleInspectModal
            bundle={activeBundle}
            skins={bundleSkins}
            userVP={userData.user?.VP_Balance ?? 0}
            canPurchase={canPurchase}
            onClose={() => setShowBundleInspect(false)}
            onRequireLogin={() => router.push("/login")}
            onBuyBundle={async () => {
              try {
                await handleBuyBundle();
              } catch (e) {
                setBundleError(
                  e instanceof Error ? e.message : "Bundle purchase failed",
                );
                throw e;
              }
            }}
          />
        ) : null}

        {completed ? (
          <PurchaseCompleteModal
            title={completed.title}
            subtitle={completed.subtitle}
            image={completed.image}
            onClose={() => setCompleted(null)}
          />
        ) : null}
      </div>
    </main>
  );
}
