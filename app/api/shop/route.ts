import { NextResponse } from 'next/server';
import type { SkinOffer, ShopPayload } from '@/types/shop';

type ApiSkin = {
  uuid: string;
  displayName: string;
  displayIcon?: string;
  chromas: Array<{ uuid: string; displayName: string; swatch?: string }>;
  levels: Array<{ uuid: string; displayName: string; displayIcon?: string }>;
};

type ApiWeapon = {
  displayName: string;
  skins: ApiSkin[];
};

const iconicNames = ['Holo Meridian Operator', 'Ion Operator', 'Reaver Vandal', 'Sakura Sheriff', 'Neptune Odin'];

const vpBySkinName: Record<string, number> = {
  'Ion Operator': 1775,
  'Reaver Vandal': 1775,
  'Sakura Sheriff': 1275,
  'Neptune Odin': 1775,
  'Holo Meridian Operator': 2175
};

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

export async function GET() {
  try {
    const response = await fetch('https://valorant-api.com/v1/weapons', { next: { revalidate: 900 } });
    const json = await response.json();
    const weapons: ApiWeapon[] = json.data;

    const found: SkinOffer[] = [];
    for (const desiredName of iconicNames) {
      for (const weapon of weapons) {
        const skin = weapon.skins.find((candidate) =>
          candidate.displayName.toLowerCase().includes(desiredName.toLowerCase())
        );
        if (skin) {
          found.push(toOffer(skin, weapon.displayName, desiredName.includes('Holo Meridian')));
          break;
        }
      }
    }

    if (found.length === 0) {
      return NextResponse.json({ error: 'No shop skins found from API' }, { status: 502 });
    }

    const payload: ShopPayload = {
      featured: found.find((s) => s.skinName.toLowerCase().includes('holo meridian')) ?? found[0],
      daily: found.filter((s) => !s.skinName.toLowerCase().includes('holo meridian')).slice(0, 4),
      bundlePriceVP: 8700,
      dailyResetAtISO: nextDailyResetISO()
    };

    return NextResponse.json(payload);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch shop data' }, { status: 500 });
  }
}
