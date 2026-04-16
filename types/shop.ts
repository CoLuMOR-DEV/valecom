export type Variant = {
  id: string;
  name: string;
  swatch?: string;
  displayIcon?: string;
};

export type UpgradeLevel = {
  level: number;
  title: string;
  previewImage?: string;
  previewVideo?: string;
  cost: number;
};

export type SkinOffer = {
  skinId: string;
  skinName: string;
  weaponName: string;
  displayIcon: string;
  showcaseImage: string;
  priceVP: number;
  featured?: boolean;
  collectionName?: string;
  variants: Variant[];
  levels: UpgradeLevel[];
};

export type BundleOffer = {
  id: string;
  name: string;
  displayIcon: string;
  priceVP: number;
  skinIds: string[];
  available: boolean;
};

export type ShopPayload = {
  featured: SkinOffer;
  featuredBundle: BundleOffer;
  bundles: BundleOffer[];
  daily: SkinOffer[];
  catalog: SkinOffer[];
  bundleImage: string;
  vpIcon: string;
  dailyResetAtISO: string;
};

export type PurchasePayload = {
  userId: number;
  skinId: string;
  level: number;
  vpCost: number;
};
