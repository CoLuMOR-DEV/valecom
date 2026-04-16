import { NextRequest, NextResponse } from 'next/server';
import type { SkinOffer, ShopPayload } from '@/types/shop';

type ApiSkin = {
  uuid: string;
  displayName: string;
  displayIcon?: string;
  chromas: Array<{ uuid: string; displayName: string; swatch?: string }>;
  levels: Array<{ uuid: string; displayName: string; displayIcon?: string; streamedVideo?: string }>;
};

type ApiWeapon = {
  displayName: string;
  skins: ApiSkin[];
};

const iconicNames = ['Holo Meridian Operator', 'Ion Operator', 'Reaver Vandal', 'Sakura Sheriff', 'Neptune Odin', 'Prime Phantom'];

const staticFallbackOffers: SkinOffer[] = [
  {
    skinId: 'holo-meridian-operator',
    skinName: 'Holo Meridian Operator',
    weaponName: 'Operator',
    displayIcon: 'https://media.valorant-api.com/weaponskinlevels/ce33f807-4e5c-85ad-f0e3-e89f6f7f8d72/displayicon.png',
    showcaseImage: 'https://media.valorant-api.com/weaponskinlevels/ce33f807-4e5c-85ad-f0e3-e89f6f7f8d72/displayicon.png',
    priceVP: 2175,
    featured: true,
    collectionName: 'HOLO MERIDIAN',
    variants: [1, 2, 3, 4].map((v) => ({ id: `holo-v${v}`, name: `Variant ${v}` })),
    levels: [1, 2, 3, 4].map((l) => ({ level: l, title: `Level ${l}`, cost: [0, 500, 750, 1000][l - 1] }))
  },
  {
    skinId: 'ion-operator',
    skinName: 'Ion Operator',
    weaponName: 'Operator',
    displayIcon: '',
    showcaseImage: '',
    priceVP: 1775,
    variants: [1, 2, 3, 4].map((v) => ({ id: `ion-v${v}`, name: `Variant ${v}` })),
    levels: [1, 2, 3, 4].map((l) => ({ level: l, title: `Level ${l}`, cost: [0, 400, 700, 900][l - 1] }))
  },
  {
    skinId: 'reaver-vandal',
    skinName: 'Reaver Vandal',
    weaponName: 'Vandal',
    displayIcon: '',
    showcaseImage: '',
    priceVP: 1775,
    variants: [1, 2, 3, 4].map((v) => ({ id: `reaver-v${v}`, name: `Variant ${v}` })),
    levels: [1, 2, 3, 4].map((l) => ({ level: l, title: `Level ${l}`, cost: [0, 400, 700, 900][l - 1] }))
  },
  {
    skinId: 'sakura-sheriff',
    skinName: 'Sakura Sheriff',
    weaponName: 'Sheriff',
    displayIcon: '',
    showcaseImage: '',
    priceVP: 1275,
    variants: [1, 2, 3, 4].map((v) => ({ id: `sakura-v${v}`, name: `Variant ${v}` })),
    levels: [1, 2, 3, 4].map((l) => ({ level: l, title: `Level ${l}`, cost: [0, 300, 500, 700][l - 1] }))
  },
  {
    skinId: 'neptune-odin',
    skinName: 'Neptune Odin',
    weaponName: 'Odin',
    displayIcon: '',
    showcaseImage: '',
    priceVP: 1775,
    variants: [1, 2, 3, 4].map((v) => ({ id: `neptune-v${v}`, name: `Variant ${v}` })),
    levels: [1, 2, 3, 4].map((l) => ({ level: l, title: `Level ${l}`, cost: [0, 400, 700, 900][l - 1] }))
  },
  {
    skinId: 'prime-phantom',
    skinName: 'Prime Phantom',
    weaponName: 'Phantom',
    displayIcon: '',
    showcaseImage: '',
    priceVP: 1775,
    variants: [1, 2, 3, 4].map((v) => ({ id: `prime-v${v}`, name: `Variant ${v}` })),
    levels: [1, 2, 3, 4].map((l) => ({ level: l, title: `Level ${l}`, cost: [0, 400, 700, 900][l - 1] }))
  }
];

const vpBySkinName: Record<string, number> = {
  'Ion Operator': 1775,
  'Reaver Vandal': 1775,
  'Sakura Sheriff': 1275,
  'Neptune Odin': 1775,
  'Prime Phantom': 1775,
  'Holo Meridian Operator': 2175
};

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

function toOffer(skin: ApiSkin, weaponName: string, featured = false): SkinOffer {
  const baseName = iconicNames.find((name) => skin.displayName.toLowerCase().includes(name.toLowerCase())) ?? skin.displayName;
  return {
    skinId: skin.uuid,
    skinName: baseName,
    weaponName,
    displayIcon: skin.displayIcon ?? '',
    showcaseImage: skin.levels?.[0]?.displayIcon ?? skin.displayIcon ?? '',
    priceVP: vpBySkinName[baseName] ?? (featured ? 2175 : 1775),
    featured,
    collectionName: featured ? 'HOLO MERIDIAN' : undefined,
    variants: (skin.chromas ?? []).slice(0, 4).map((c, index) => ({
      id: c.uuid,
      name: c.displayName || `Variant ${index + 1}`,
      swatch: c.swatch
    })),
    levels: [1, 2, 3, 4].map((level) => ({
      level,
      title: `Level ${level}`,
      previewImage: skin.levels?.[Math.min(level - 1, (skin.levels?.length ?? 1) - 1)]?.displayIcon,
      previewVideo: skin.levels?.[Math.min(level - 1, (skin.levels?.length ?? 1) - 1)]?.streamedVideo,
      cost: [0, 500, 750, 1000][level - 1] ?? 0
    }))
  };
}

function nextDailyResetISO(): string {
  const now = new Date();
  const target = new Date(now);
  target.setUTCHours(0, 0, 0, 0);
  target.setUTCDate(target.getUTCDate() + 1);
  return target.toISOString();
}

function buildPayload(allOffers: SkinOffer[], seed: number): ShopPayload {
  const featured = allOffers.find((s) => s.skinName.toLowerCase().includes('holo meridian')) ?? allOffers[0];
  const pool = allOffers.filter((s) => s.skinId !== featured.skinId);
  const shuffled = seededShuffle(pool, seed);
  return {
    featured,
    daily: shuffled.slice(0, 4),
    bundlePriceVP: 8700,
    bundleImage: featured.showcaseImage,
    dailyResetAtISO: nextDailyResetISO()
  };
}

export async function GET(request: NextRequest) {
  const seed = Number(request.nextUrl.searchParams.get('seed') ?? Date.now());
  try {
    const response = await fetch('https://valorant-api.com/v1/weapons', { next: { revalidate: 900 } });
    const json = await response.json();
    const weapons: ApiWeapon[] = json.data;

    const found: SkinOffer[] = [];
    for (const desiredName of iconicNames) {
      for (const weapon of weapons) {
        const skin = weapon.skins.find((candidate) => candidate.displayName.toLowerCase().includes(desiredName.toLowerCase()));
        if (skin) {
          found.push(toOffer(skin, weapon.displayName, desiredName.includes('Holo Meridian')));
          break;
        }
      }
    }

    if (found.length > 0) {
      return NextResponse.json(buildPayload(found, seed));
    }

    return NextResponse.json(buildPayload(staticFallbackOffers, seed));
  } catch {
    return NextResponse.json(buildPayload(staticFallbackOffers, seed));
  }
}
