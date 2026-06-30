export interface CreditPack {
  id: "starter" | "creator" | "studio";
  name: string;
  credits: number;
  priceInr: number;
  pricePaise: number;
  popular: boolean;
}

export const CREDIT_PACKS: CreditPack[] = [
  { id: "starter", name: "Starter", credits: 100, priceInr: 99, pricePaise: 9900, popular: false },
  { id: "creator", name: "Creator", credits: 250, priceInr: 199, pricePaise: 19900, popular: true },
  { id: "studio", name: "Studio", credits: 700, priceInr: 499, pricePaise: 49900, popular: false },
];

export function getPackById(id: string): CreditPack | undefined {
  return CREDIT_PACKS.find((p) => p.id === id);
}
