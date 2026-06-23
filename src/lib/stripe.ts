import Stripe from "stripe";

export const stripe: Stripe | null = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2025-04-30" as any })
  : null;

export const STRIPE_ENABLED = !!process.env.STRIPE_SECRET_KEY;
