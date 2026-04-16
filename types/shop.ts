export type Variant = {
  id: string;
  name: string;
  swatch?: string;
};

export type UpgradeLevel = {
  level: number;
  title: string;
  previewImage?: string;
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

export type PurchasePayload = {
  userId: number;
  skinId: string;
  level: number;
  vpCost: number;
};
