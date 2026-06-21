"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../lib/auth-context";
import { RevealLayer } from "../components/reveal-layer";
import { SceneReferences } from "../components/scene-references";
import { GalleryShowcase } from "../components/gallery-showcase";
import { PricingSection } from "../components/pricing-section";

const BG_IMAGE_1 = "https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260609_195923_b0ba8ace-1d1d-4f2c-9a28-1ab84b330680.png&w=1280&q=85";
const BG_IMAGE_2 = "https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260609_201152_bba90a12-bf12-459f-91f0-51f237dbaf3b.png&w=1280&q=85";

const NAV_ITEMS = [
  { label: "Characters", href: "#characters" },
  { label: "Scenes", href: "#scenes" },
  { label: "Gallery", href: "#gallery" },
  { label: "Pricing", href: "#pricing" },
];

function scrollTo(id: string) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth" });
}

export default function HomePage() {
  const { session } = useAuth();
  const router = useRouter();
  const mouse = useRef({ x: -999, y: -999 });
  const smooth = useRef({ x: -999, y: -999 });
  const rafRef = useRef<number>(0);
  const [cursorPos, setCursorPos] = useState({ x: -999, y: -999 });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("characters");

  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      mouse.current = { x: e.clientX, y: e.clientY };
    }
    function animate() {
      smooth.current.x += (mouse.current.x - smooth.current.x) * 0.1;
      smooth.current.y += (mouse.current.y - smooth.current.y) * 0.1;
      setCursorPos({ x: smooth.current.x, y: smooth.current.y });
      rafRef.current = requestAnimationFrame(animate);
    }
    window.addEventListener("mousemove", handleMouseMove);
    rafRef.current = requestAnimationFrame(animate);
    return () => { window.removeEventListener("mousemove", handleMouseMove); cancelAnimationFrame(rafRef.current); };
  }, []);

  // Track active section on scroll
  useEffect(() => {
    function handleScroll() {
      const sections = ["characters", "scenes", "gallery", "pricing"];
      for (const id of sections.reverse()) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= 200) {
          setActiveSection(id);
          break;
        }
      }
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  function handleNavClick(href: string) {
    const id = href.replace("#", "");
    scrollTo(id);
    setActiveSection(id);
    setMobileOpen(false);
  }

  return (
    <div className="min-h-screen bg-black tracking-[-0.02em]" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-between p-4 sm:p-5">
        <Link href="/" className="flex items-center gap-2">
          <svg width="26" height="26" viewBox="0 0 256 256" fill="#ffffff">
            <path d="M 256 256 L 128 256 L 0 128 L 128 128 Z M 256 128 L 128 128 L 0 0 L 128 0 Z" />
          </svg>
          <span className="text-white text-2xl font-playfair italic">CharacterForge</span>
        </Link>

        {/* Center pill nav (desktop) */}
        <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 bg-white/20 backdrop-blur-md border border-white/30 rounded-full px-2 py-2 items-center gap-1">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.href}
              onClick={() => handleNavClick(item.href)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                activeSection === item.href.replace("#", "")
                  ? "bg-white/30 text-white"
                  : "text-white/80 hover:bg-white/20 hover:text-white"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Sign Up / Dashboard (desktop) */}
        <Link href={session ? "/dashboard" : "/register"} className="hidden md:block bg-white text-gray-900 text-sm font-semibold px-6 py-2.5 rounded-full hover:bg-gray-100 transition-colors">
          {session ? "Dashboard" : "Sign Up"}
        </Link>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden text-white p-2"
          aria-label="Toggle menu"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {mobileOpen ? (
              <path d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path d="M3 12h18M3 6h18M3 18h18" />
            )}
          </svg>
        </button>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[99] bg-black/95 backdrop-blur-lg flex flex-col items-center justify-center gap-6 md:hidden">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.href}
              onClick={() => handleNavClick(item.href)}
              className="text-white text-2xl font-medium hover:text-white/70 transition-colors"
            >
              {item.label}
            </button>
          ))}
          <Link href="/register" onClick={() => setMobileOpen(false)} className="mt-4 bg-[#e8702a] text-white px-8 py-3 rounded-full font-medium">
            Sign Up
          </Link>
          <Link href="/login" onClick={() => setMobileOpen(false)} className="text-white/60 text-sm">
            Sign In
          </Link>
        </div>
      )}

      {/* Hero Section */}
      <section className="relative w-full overflow-hidden h-screen bg-black" style={{ height: "100dvh" }}>
        {/* Background video (ambient, behind images) */}
        <video
          autoPlay
          muted
          playsInline
          loop
          preload="auto"
          className="absolute left-1/2 top-0 -translate-x-1/2 object-cover object-top z-[5] opacity-30"
          style={{ width: "120%", height: "120%" }}
        >
          <source src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260418_080021_d598092b-c4c2-4e53-8e46-94cf9064cd50.mp4" type="video/mp4" />
        </video>

        <div className="absolute inset-0 bg-center bg-cover bg-no-repeat z-10 hero-zoom" style={{ backgroundImage: `url(${BG_IMAGE_1})` }} />
        <RevealLayer image={BG_IMAGE_2} cursorX={cursorPos.x} cursorY={cursorPos.y} />

        <div className="absolute top-[14%] left-0 right-0 flex flex-col items-center text-center px-5 pointer-events-none z-50">
          <h1 className="text-white leading-[0.95]">
            <span className="block font-playfair italic font-normal text-5xl sm:text-7xl md:text-8xl hero-anim hero-reveal" style={{ letterSpacing: "-0.05em", animationDelay: "0.25s" }}>
              Create characters
            </span>
            <span className="block font-normal text-5xl sm:text-7xl md:text-8xl -mt-1 hero-anim hero-reveal" style={{ letterSpacing: "-0.08em", animationDelay: "0.42s" }}>
              that feel alive
            </span>
          </h1>
        </div>

        <div className="hidden sm:block absolute bottom-14 left-10 md:left-14 max-w-[260px] z-50 hero-anim hero-fade" style={{ animationDelay: "0.7s" }}>
          <p className="text-sm text-white/80 leading-relaxed">
            Design consistent AI characters with personality, style, outfits, and visual identity ready for every scene.
          </p>
        </div>

        <div className="absolute bottom-10 sm:bottom-24 left-5 right-5 sm:left-auto sm:right-10 md:right-14 max-w-full sm:max-w-[260px] flex flex-col items-start gap-4 sm:gap-5 z-50 hero-anim hero-fade" style={{ animationDelay: "0.85s" }}>
          <p className="text-xs sm:text-sm text-white/80 leading-relaxed">
            Generate characters, build scenes, choose aspect ratios, and create story-ready visuals from one cinematic workspace.
          </p>
          <button
            onClick={() => router.push(session ? "/dashboard" : "/login")}
            className="bg-[#e8702a] hover:bg-[#d2611f] text-white text-sm font-medium px-7 py-3 rounded-full transition-all hover:scale-[1.03] active:scale-95 hover:shadow-lg hover:shadow-[#e8702a]/30"
          >
            {session ? "Go to Dashboard" : "Start Creating"}
          </button>
        </div>
      </section>

      {/* Characters Section */}
      <section id="characters" className="py-24 px-6 bg-[#030303]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4" style={{ letterSpacing: "-0.03em" }}>
              Build consistent characters
            </h2>
            <p className="text-white/60 max-w-lg mx-auto leading-relaxed">
              Create AI characters with full memory — personality, outfits, hair, face, and style that stay consistent across every scene.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { title: "Character Memory", desc: "Store hair, face, eyes, outfit, personality, and color palette for perfect consistency." },
              { title: "Reference Images", desc: "Upload 1-3 reference images per character. The AI uses them to maintain visual identity." },
              { title: "Scene Templates", desc: "Choose from 12+ scene templates. Click to generate — no prompt engineering needed." },
            ].map((feature) => (
              <div key={feature.title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 hover:border-white/30 transition-all duration-300">
                <h3 className="text-white font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-white/60 text-sm leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <Link href="/characters/new" className="bg-[#e8702a] hover:bg-[#d2611f] text-white text-sm font-medium px-8 py-3 rounded-full transition-all hover:scale-[1.03] active:scale-95 inline-block">
              Create Your First Character
            </Link>
          </div>
        </div>
      </section>

      {/* Scenes, Gallery, Pricing */}
      <SceneReferences />
      <GalleryShowcase />
      <PricingSection />
    </div>
  );
}
