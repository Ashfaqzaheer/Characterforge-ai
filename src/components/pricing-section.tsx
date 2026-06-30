"use client";

import Link from "next/link";
import { useAuth } from "../lib/auth-context";
import { CREDIT_PACKS } from "../lib/credit-packs";
import { FREE_TIER } from "../lib/free-tier";

function scrollTo(id: string) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth" });
}

export function PricingSection() {
  const { session } = useAuth();
  const popularPack = CREDIT_PACKS.find((p) => p.popular)!;

  return (
    <section className="py-24 px-6 bg-black" id="pricing">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4" style={{ letterSpacing: "-0.03em" }}>
            Simple, transparent pricing
          </h2>
          <p className="text-white/60 max-w-md mx-auto leading-relaxed">
            Start free, buy credits when you need more, or talk to us about enterprise volumes.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Free Tier */}
          <div className="relative rounded-2xl p-6 border border-white/10 bg-white/[0.03] backdrop-blur-sm transition-all duration-300 hover:scale-[1.02]">
            <div className="mb-6 pt-2">
              <h3 className="text-white font-semibold text-lg mb-1">Free</h3>
              <p className="text-white/50 text-sm">{FREE_TIER.INITIAL_CREDITS} credits on signup</p>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="text-4xl font-bold text-white">₹0</span>
              </div>
              <p className="text-white/40 text-xs mt-1">forever</p>
            </div>
            <ul className="text-sm text-white/60 space-y-2 mb-6">
              <li>{FREE_TIER.INITIAL_CREDITS} generations</li>
              <li>{FREE_TIER.MAX_CHARACTERS} characters</li>
              <li>{FREE_TIER.MAX_IMAGES_PER_GEN} image per generation</li>
            </ul>
            {session ? (
              <button
                disabled
                className="block w-full text-center text-sm font-medium py-3 rounded-full bg-white/10 text-white/50 cursor-not-allowed"
              >
                Current Plan
              </button>
            ) : (
              <Link
                href="/register"
                className="block w-full text-center text-sm font-medium py-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all"
              >
                Start Free
              </Link>
            )}
          </div>

          {/* Popular Pack */}
          <div className="relative rounded-2xl p-6 border border-[#e8702a] bg-gradient-to-b from-[#e8702a]/10 to-transparent shadow-lg shadow-[#e8702a]/10 backdrop-blur-sm transition-all duration-300 hover:scale-[1.02]">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#e8702a] text-white text-xs font-semibold px-4 py-1 rounded-full">
              Most Popular
            </div>
            <div className="mb-6 pt-2">
              <h3 className="text-white font-semibold text-lg mb-1">{popularPack.name}</h3>
              <p className="text-white/50 text-sm">{popularPack.credits} credits</p>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="text-4xl font-bold text-white">₹{popularPack.priceInr}</span>
                <span className="text-white/50 text-sm">one-time</span>
              </div>
              <p className="text-white/40 text-xs mt-1">₹{(popularPack.priceInr / popularPack.credits).toFixed(2)} per credit</p>
            </div>
            <ul className="text-sm text-white/60 space-y-2 mb-6">
              <li>Unlimited characters</li>
              <li>Priority generation</li>
            </ul>
            <Link
              href={session ? "/dashboard" : "/register"}
              className="block w-full text-center text-sm font-medium py-3 rounded-full bg-[#e8702a] hover:bg-[#d2611f] text-white hover:shadow-lg hover:shadow-[#e8702a]/30 transition-all"
            >
              {session ? "Buy Credits" : "Get Started"}
            </Link>
          </div>

          {/* Enterprise */}
          <div className="relative rounded-2xl p-6 border border-amber-500/30 bg-white/[0.03] backdrop-blur-sm transition-all duration-300 hover:scale-[1.02]">
            <div className="mb-6 pt-2">
              <h3 className="text-white font-semibold text-lg mb-1">Enterprise</h3>
              <p className="text-white/50 text-sm">For teams &amp; products</p>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="text-4xl font-bold text-white">Custom</span>
              </div>
              <p className="text-white/40 text-xs mt-1">volume pricing</p>
            </div>
            <ul className="text-sm text-white/60 space-y-2 mb-6">
              <li>Unlimited everything</li>
              <li>API access</li>
              <li>Dedicated support</li>
              <li>Custom model fine-tuning</li>
            </ul>
            <button
              onClick={() => scrollTo("contact")}
              className="block w-full text-center text-sm font-medium py-3 rounded-full border border-amber-500/30 text-white hover:bg-amber-500/10 transition-all"
            >
              Contact Sales
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
