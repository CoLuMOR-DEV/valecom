import { NextResponse } from 'next/server';
import type { SkinOffer } from '@/types/shop';

type ApiSkin = {
  uuid: string;
  displayName: string;
  displayIcon?: string;
  contentTierUuid?: string;
  chromas: Array<{ uuid: string; displayName: string; swatch?: string }>;
  levels: Array<{ uuid: string; displayName: string; streamedVideo?: string; displayIcon?: string }>;
};

type ApiWeapon = {
  displayName: string;
  skins: ApiSkin[];
};

const iconicNames = ['Holo Meridian Operator', 'Ion Operator', 'Reaver Vandal', 'Sakura Sheriff', 'Neptune Odin'];

function toOffer(skin: ApiSkin, weaponName: string, featured = false): SkinOffer {
  return {
    skinId: skin.uuid,
    skinName: skin.displayName,
    weaponName,
    displayIcon: skin.displayIcon ?? '',
    showcaseImage: skin.levels?.[0]?.displayIcon ?? skin.displayIcon ?? '',
    priceVP: featured ? 2175 : 1775,
    featured,
    collectionName: featured ? 'Holo Meridian Collection' : undefined,
    variants: (skin.chromas ?? []).slice(0, 4).map((c, index) => ({
      id: c.uuid,
      name: c.displayName || `Variant ${index + 1}`,
      swatch: c.swatch
    })),
    levels: [1, 2, 3, 4].map((level) => ({
      level,
      title: `Level ${level}`,
      previewImage: skin.levels?.[Math.min(level - 1, (skin.levels?.length ?? 1) - 1)]?.displayIcon,
      cost: level === 1 ? 0 : 250 * level
    }))
  };
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

    const fallback = found[0];

    return NextResponse.json({
      featured: found.find((s) => s.skinName.toLowerCase().includes('holo meridian')) ?? fallback,
      daily: found.filter((s) => !s.skinName.toLowerCase().includes('holo meridian')).slice(0, 4)
    });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch shop data' }, { status: 500 });
  }
}
