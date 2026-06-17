"use client";

import Link from "next/link";

const PLANS = [
  {
    name: "Free",
    price: "₹0",
    period: "/month",
    features: ["3 character generations", "2 scene generations", "Basic gallery access", "Community support"],
    cta: "Start Free",
    href: "/register",
    popular: false,
  },
  {
    name: "Creator",
    price: "₹499",
    period: "/month",
    features: ["100 character generations", "50 scene generations", "HD image export", "Priority generation", "Save unlimited characters"],
    cta: "Upgrade to Creator",
    href: "/register",
    popular: true,
  },
  {
    name: "Studio",
    price: "₹1499",
    period: "/month",
    features: ["Unlimited character generations", "Unlimited scene generations", "8K quality exports", "Commercial usage", "Priority support"],
    cta: "Go Studio",
    href: "/register",
    popular: false,
  },
];

export function PricingSection() {
  return (
    <section className="py-24 px-6 bg-black" id="pricing">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4" style={{ letterSpacing: "-0.03em" }}>
            Simple pricing
          </h2>
          <p className="text-white/60 max-w-md mx-auto leading-relaxed">
            Start free, upgrade when you need more power.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl p-6 border backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] ${
                plan.popular
                  ? "border-[#e8702a] bg-gradient-to-b from-[#e8702a]/10 to-transparent shadow-lg shadow-[#e8702a]/10"
                  : "border-white/10 bg-white/[0.03]"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#e8702a] text-white text-xs font-semibold px-4 py-1 rounded-full">
                  Most Popular
                </div>
              )}

              <div className="mb-6 pt-2">
                <h3 className="text-white font-semibold text-lg mb-2">{plan.name}</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-white">{plan.price}</span>
                  <span className="text-white/50 text-sm">{plan.period}</span>
                </div>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm text-white/70">
                    <svg className="w-4 h-4 text-[#e8702a] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>

              <Link
                href={plan.href}
                className={`block w-full text-center text-sm font-medium py-3 rounded-full transition-all ${
                  plan.popular
                    ? "bg-[#e8702a] hover:bg-[#d2611f] text-white hover:shadow-lg hover:shadow-[#e8702a]/30"
                    : "bg-white/10 text-white hover:bg-white/20"
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
