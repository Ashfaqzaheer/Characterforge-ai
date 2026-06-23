export interface CreditPack {
  id: "starter" | "popular" | "pro";
  name: string;
  credits: number;
  priceUsd: number;
  priceCents: number;
  popular: boolean;
  stripePriceEnvVar: string;
}

export const CREDIT_PACKS: CreditPack[] = [
  { id: "starter", name: "Starter", credits: 20, priceUsd: 5, priceCents: 500, popular: false, stripePriceEnvVar: "STRIPE_PRICE_STARTER" },
  { id: "popular", name: "Popular", credits: 60, priceUsd: 12, priceCents: 1200, popular: true, stripePriceEnvVar: "STRIPE_PRICE_POPULAR" },
  { id: "pro", name: "Pro", credits: 150, priceUsd: 25, priceCents: 2500, popular: false, stripePriceEnvVar: "STRIPE_PRICE_PRO" },
];

export function getPackById(id: string): CreditPack | undefined {
  return CREDIT_PACKS.find((p) => p.id === id);
}
