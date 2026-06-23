"use client";

import Link from "next/link";
import { CREDIT_PACKS } from "../lib/credit-packs";

export function PricingSection() {
  return (
    <section className="py-24 px-6 bg-black" id="pricing">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4" style={{ letterSpacing: "-0.03em" }}>
            Buy credits, use anytime
          </h2>
          <p className="text-white/60 max-w-md mx-auto leading-relaxed">
            No subscriptions. Buy a pack, generate images, top up when you need more.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {CREDIT_PACKS.map((pack) => (
            <div
              key={pack.id}
              className={`relative rounded-2xl p-6 border backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] ${
                pack.popular
                  ? "border-[#e8702a] bg-gradient-to-b from-[#e8702a]/10 to-transparent shadow-lg shadow-[#e8702a]/10"
                  : "border-white/10 bg-white/[0.03]"
              }`}
            >
              {pack.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#e8702a] text-white text-xs font-semibold px-4 py-1 rounded-full">
                  Most Popular
                </div>
              )}

              <div className="mb-6 pt-2">
                <h3 className="text-white font-semibold text-lg mb-1">{pack.name}</h3>
                <p className="text-white/50 text-sm">{pack.credits} credits</p>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-4xl font-bold text-white">${pack.priceUsd}</span>
                  <span className="text-white/50 text-sm">one-time</span>
                </div>
                <p className="text-white/40 text-xs mt-1">${(pack.priceUsd / pack.credits).toFixed(2)} per credit</p>
              </div>

              <Link
                href="/register"
                className={`block w-full text-center text-sm font-medium py-3 rounded-full transition-all ${
                  pack.popular
                    ? "bg-[#e8702a] hover:bg-[#d2611f] text-white hover:shadow-lg hover:shadow-[#e8702a]/30"
                    : "bg-white/10 text-white hover:bg-white/20"
                }`}
              >
                Get {pack.name}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
