import { NextRequest, NextResponse } from 'next/server';
import type { BundleOffer, SkinOffer, ShopPayload } from '@/types/shop';

type ApiSkinLevel = {
  uuid: string;
  displayName: string;
  displayIcon?: string;
  streamedVideo?: string;
};

type ApiSkinChroma = {
  uuid: string;
  displayName: string;
  displayIcon?: string;
  swatch?: string;
};

type ApiSkin = {
  uuid: string;
  displayName: string;
  contentTierUuid?: string;
  displayIcon?: string;
  wallpaper?: string;
  chromas: ApiSkinChroma[];
  levels: ApiSkinLevel[];
};

type ApiWeapon = {
  displayName: string;
  skins: ApiSkin[];
};

type BundleSpec = {
  name: string;
  aliases: string[];
  priceVP: number;
};

const REQUESTED_BUNDLES: BundleSpec[] = [
  { name: 'Kuronami', aliases: ['Kuronami'], priceVP: 8700 },
  { name: 'Mystbloom', aliases: ['Mystbloom'], priceVP: 8700 },
  { name: 'Primordium', aliases: ['Primordium'], priceVP: 8700 },
  { name: 'Xerofang', aliases: ['Xerofang'], priceVP: 7100 },
  { name: 'Aemondir', aliases: ['Aemondir'], priceVP: 8700 },
  { name: 'Overdrive', aliases: ['Overdrive'], priceVP: 7100 },
  { name: 'Neo Frontier', aliases: ['Neo Frontier'], priceVP: 8700 },
  { name: 'Araxys', aliases: ['Araxys'], priceVP: 8700 },
  { name: 'Prelude to Chaos', aliases: ['Prelude to Chaos'], priceVP: 8700 },
  { name: 'Spectrum', aliases: ['Spectrum'], priceVP: 10700 },
  { name: 'Elderflame', aliases: ['Elderflame'], priceVP: 9900 },
  { name: 'RGX 11z Pro', aliases: ['RGX 11z Pro', 'RGX'], priceVP: 8700 },
  { name: 'RGX 11z Pro EP 4', aliases: ['RGX 11z Pro 11z Pro EP 4', 'RGX 11z Pro Ep 4'], priceVP: 8700 },
  { name: 'Reaver', aliases: ['Reaver'], priceVP: 7100 },
  { name: 'Reaver // 2.0', aliases: ['Reaver 2.0', 'Reaver // 2.0'], priceVP: 7100 },
  { name: 'Prime', aliases: ['Prime'], priceVP: 7100 },
  { name: 'Prime // 2.0', aliases: ['Prime 2.0', 'Prime // 2.0'], priceVP: 7100 },
  { name: 'Oni', aliases: ['Oni'], priceVP: 7100 },
  { name: 'Oni // 2.0', aliases: ['Oni 2.0', 'Oni // 2.0'], priceVP: 7100 },
  { name: 'Ion', aliases: ['Ion'], priceVP: 7100 },
  { name: 'Magepunk', aliases: ['Magepunk'], priceVP: 7100 }
];

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const out = [...arr];
  let s = seed || 1;
  for (let i = out.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function normalize(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function skinPrice(name: string): number {
  const n = normalize(name);
  if (n.includes('exclusive') || n.includes('champions') || n.includes('spectrum')) return 2675;
  if (n.includes('ultra') || n.includes('elderflame')) return 2475;
  if (n.includes('premium') || n.includes('prime') || n.includes('reaver') || n.includes('kuronami')) return 1775;
  if (n.includes('deluxe')) return 1275;
  return 875;
}

function normalizeVariantName(raw: string, index: number): string {
  const parts = raw.split('(');
  const fallback = `Variant ${index + 1}`;
  if (!parts[1]) return index === 0 ? 'Default' : fallback;
  const clean = parts[1].replace(')', '').replace(/Level\s*\d+/i, '').trim();
  return clean || fallback;
}

function buildLevels(skin: ApiSkin) {
  const tierCosts = [0, 500, 800, 1200, 1500];
  const levelCount = Math.max(4, Math.min(5, skin.levels.length || 4));
  return Array.from({ length: levelCount }, (_, idx) => {
    const level = idx + 1;
    const levelMeta = skin.levels[Math.min(idx, Math.max((skin.levels?.length ?? 1) - 1, 0))];
    return {
      level,
      title: `Level ${level}`,
      previewImage: levelMeta?.displayIcon || skin.displayIcon || '',
      previewVideo: levelMeta?.streamedVideo,
      cost: tierCosts[idx] ?? 1700
    };
  });
}

function toOffer(skin: ApiSkin, weaponName: string): SkinOffer {
  const variants = (skin.chromas || [])
    .slice(0, 4)
    .map((c, idx) => ({
      id: c.uuid,
      name: normalizeVariantName(c.displayName || '', idx),
      swatch: c.swatch,
      displayIcon: c.displayIcon || skin.displayIcon || ''
    }));

  const ensuredVariants = variants.length
    ? variants
    : [{ id: `${skin.uuid}-default`, name: 'Default', swatch: '#334155', displayIcon: skin.displayIcon || '' }];

  return {
    skinId: skin.uuid,
    skinName: skin.displayName,
    weaponName,
    displayIcon: skin.displayIcon || skin.levels?.[0]?.displayIcon || '',
    showcaseImage: skin.wallpaper || skin.levels?.[0]?.displayIcon || skin.displayIcon || '',
    priceVP: skinPrice(skin.displayName),
    collectionName: skin.displayName.split(' ')[0],
    variants: ensuredVariants,
    levels: buildLevels(skin)
  };
}

function isStandardWeaponSkin(skin: ApiSkin): boolean {
  const name = normalize(skin.displayName);
  if (!skin.displayIcon) return false;
  if (name.includes('standard') || name.includes('random favorite')) return false;
  return true;
}

function resolveBundleOffers(allSkins: SkinOffer[]): BundleOffer[] {
  return REQUESTED_BUNDLES.map((bundle) => {
    const matching = allSkins.filter((skin) => {
      const n = normalize(skin.skinName);
      return bundle.aliases.some((alias) => n.includes(normalize(alias)));
    });

    return {
      id: normalize(bundle.name).replace(/\s+/g, '-'),
      name: bundle.name,
      displayIcon: matching[0]?.showcaseImage || matching[0]?.displayIcon || '',
      priceVP: bundle.priceVP,
      skinIds: matching.map((s) => s.skinId),
      available: matching.length > 0
    };
  });
}

function nextDailyResetISO(): string {
  const now = new Date();
  const target = new Date(now);
  target.setUTCHours(0, 0, 0, 0);
  target.setUTCDate(target.getUTCDate() + 1);
  return target.toISOString();
}

function buildPayload(allOffers: SkinOffer[], seed: number): ShopPayload {
  const bundles = resolveBundleOffers(allOffers);
  const availableBundles = bundles.filter((b) => b.available);
  const featuredBundle = availableBundles[0] || bundles[0];

  const bundleSkinSet = new Set(availableBundles.flatMap((b) => b.skinIds));
  const dailyPool = allOffers.filter((offer) => !bundleSkinSet.has(offer.skinId));
  const shuffled = seededShuffle(dailyPool, seed);

  const featured = shuffled[0] || allOffers[0];

  return {
    featured,
    featuredBundle,
    bundles,
    daily: shuffled.slice(0, 8),
    catalog: shuffled.slice(0, 72),
    bundlePriceVP: featuredBundle?.priceVP ?? 8700,
    bundleImage: featuredBundle?.displayIcon || featured.showcaseImage,
    dailyResetAtISO: nextDailyResetISO(),
    requestedBundleCoverage: {
      available: bundles.filter((bundle) => bundle.available).map((bundle) => bundle.name),
      missing: bundles.filter((bundle) => !bundle.available).map((bundle) => bundle.name)
    }
  };
}

export async function GET(request: NextRequest) {
  const seed = Number(request.nextUrl.searchParams.get('seed') ?? Date.now());
  try {
    const response = await fetch('https://valorant-api.com/v1/weapons', { next: { revalidate: 900 } });
    const json = await response.json();
    const weapons: ApiWeapon[] = json.data || [];

    const offers = weapons
      .flatMap((weapon) =>
        (weapon.skins || [])
          .filter(isStandardWeaponSkin)
          .map((skin) => toOffer(skin, weapon.displayName))
      )
      .slice(0, 120);

    if (offers.length < 20) {
      return NextResponse.json({ error: 'Could not generate enough shop skins from API.' }, { status: 502 });
    }

    return NextResponse.json(buildPayload(offers, seed));
  } catch {
    return NextResponse.json({ error: 'Failed to fetch Valorant API.' }, { status: 500 });
  }
}
