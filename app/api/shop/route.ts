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

type ApiContentTier = {
  uuid: string;
  devName?: string;
  displayName?: string;
};

type ApiCurrency = {
  displayName: string;
  displayIcon?: string;
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

function skinPrice(name: string, tierName?: string): number {
  const tier = normalize(tierName || '');
  if (tier.includes('select')) return 875;
  if (tier.includes('deluxe')) return 1275;
  if (tier.includes('premium')) return 1775;
  if (tier.includes('exclusive')) return 2175;
  if (tier.includes('ultra')) return 2475;

  const n = normalize(name);
  if (n.includes('champions') || n.includes('spectrum')) return 2675;
  if (n.includes('exclusive')) return 2175;
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

function toOffer(skin: ApiSkin, weaponName: string, tierName?: string): SkinOffer {
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
    priceVP: skinPrice(skin.displayName, tierName),
    collectionName: skin.displayName.split(' ')[0],
    variants: ensuredVariants,
    levels: buildLevels(skin)
  };
}

function isStandardWeaponSkin(skin: ApiSkin): boolean {
  const name = normalize(skin.displayName);
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
  const bundles = resolveBundleOffers(allOffers).filter((b) => b.available);
  const featuredBundle = bundles[0];

  const bundleSkinSet = new Set(bundles.flatMap((b) => b.skinIds));
  const dailyPool = allOffers.filter((offer) => !bundleSkinSet.has(offer.skinId));
  const shuffled = seededShuffle(dailyPool, seed);
  const shuffledCatalog = seededShuffle(allOffers, seed + 17);

  const featured = shuffled[0] || allOffers[0];

  return {
    featured,
    featuredBundle: featuredBundle || {
      id: 'featured-fallback',
      name: 'Featured Collection',
      displayIcon: featured.showcaseImage,
      priceVP: 8700,
      skinIds: [featured.skinId],
      available: true
    },
    bundles,
    daily: shuffled.slice(0, 4),
    catalog: shuffledCatalog.slice(0, 72),
    bundleImage: featuredBundle?.displayIcon || featured.showcaseImage,
    vpIcon: 'https://media.valorant-api.com/currencies/85ad13f7-3d1b-5128-9eb2-7cd8a00f8d1b/displayicon.png',
    dailyResetAtISO: nextDailyResetISO(),
  };
}

export async function GET(request: NextRequest) {
  const seed = Number(request.nextUrl.searchParams.get('seed') ?? Date.now());
  try {
    const [weaponsRes, tiersRes] = await Promise.all([
      fetch('https://valorant-api.com/v1/weapons', { next: { revalidate: 900 } }),
      fetch('https://valorant-api.com/v1/contenttiers', { next: { revalidate: 900 } })
    ]);
    const [weaponsJson, tiersJson] = await Promise.all([weaponsRes.json(), tiersRes.json()]);
    const weapons: ApiWeapon[] = weaponsJson.data || [];
    const tiers: ApiContentTier[] = tiersJson.data || [];
    const tierLookup = new Map(tiers.map((tier) => [tier.uuid, tier.devName || tier.displayName || '']));

    const offers = weapons
      .flatMap((weapon) =>
        (weapon.skins || [])
          .filter(isStandardWeaponSkin)
          .map((skin) => toOffer(skin, weapon.displayName, tierLookup.get(skin.contentTierUuid || '')))
      );

    if (offers.length < 20) {
      return NextResponse.json({ error: 'Could not generate enough shop skins from API.' }, { status: 502 });
    }

    const payload = buildPayload(offers, seed);

    try {
      const currenciesRes = await fetch('https://valorant-api.com/v1/currencies', { next: { revalidate: 900 } });
      const currenciesJson = await currenciesRes.json();
      const currencies: ApiCurrency[] = currenciesJson.data || [];
      const vp = currencies.find((currency) => normalize(currency.displayName).includes('valorant points'));
      payload.vpIcon = vp?.displayIcon || payload.vpIcon;
    } catch {
      // Keep fallback VP icon URL.
    }

    return NextResponse.json(payload);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch Valorant API.' }, { status: 500 });
  }
}
