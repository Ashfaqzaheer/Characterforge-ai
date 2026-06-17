"use client";

import { useState } from "react";

const SCENES = [
  { id: "fantasy-forest", title: "Fantasy Forest", desc: "Enchanted woodland with mystical fog and glowing flora", image: "https://images.unsplash.com/photo-1448375240586-882707db888b?w=800&q=80" },
  { id: "cyberpunk-city", title: "Cyberpunk City", desc: "Neon-lit streets with towering holographic billboards", image: "https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=800&q=80" },
  { id: "desert-adventure", title: "Desert Adventure", desc: "Vast golden dunes under a scorching cinematic sky", image: "https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=800&q=80" },
  { id: "royal-palace", title: "Royal Palace", desc: "Grand marble halls with ornate chandeliers and gold trim", image: "https://images.unsplash.com/photo-1555396263-78c5f5f2f0b4?w=800&q=80" },
  { id: "futuristic-lab", title: "Futuristic Lab", desc: "High-tech research facility with glowing screens and pods", image: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&q=80" },
  { id: "space-planet", title: "Space Planet", desc: "Alien landscape with twin moons and crystal formations", image: "https://images.unsplash.com/photo-1614732414444-096e5f1122d5?w=800&q=80" },
  { id: "anime-classroom", title: "Anime Classroom", desc: "Warm afternoon light through school windows, cherry blossoms", image: "https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=800&q=80" },
  { id: "medieval-village", title: "Medieval Village", desc: "Cobblestone streets with thatched roofs and market stalls", image: "https://images.unsplash.com/photo-1533050487297-09b450131914?w=800&q=80" },
];

export function SceneReferences() {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <section className="py-24 px-6 bg-black" id="scenes">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4" style={{ letterSpacing: "-0.03em" }}>
            Build cinematic scenes
          </h2>
          <p className="text-white/60 max-w-lg mx-auto leading-relaxed">
            Use high-quality visual references to design worlds, moods, camera angles, and story-ready environments.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {SCENES.map((scene) => (
            <div
              key={scene.id}
              className={`group relative rounded-2xl overflow-hidden border transition-all duration-300 ${
                selected === scene.id
                  ? "border-[#e8702a] shadow-lg shadow-[#e8702a]/20 scale-[1.02]"
                  : "border-white/10 hover:border-white/30"
              }`}
            >
              <div className="aspect-[4/5] overflow-hidden">
                <img
                  src={scene.image}
                  alt={scene.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  onError={(e) => { (e.target as HTMLImageElement).src = "https://placehold.co/800x1000/1a1a2e/ffffff?text=" + encodeURIComponent(scene.title); }}
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <h3 className="text-white font-semibold text-sm mb-1">{scene.title}</h3>
                <p className="text-white/60 text-xs leading-relaxed mb-3">{scene.desc}</p>
                <button
                  onClick={() => setSelected(selected === scene.id ? null : scene.id)}
                  className={`text-xs font-medium px-4 py-1.5 rounded-full transition-all ${
                    selected === scene.id
                      ? "bg-[#e8702a] text-white"
                      : "bg-white/10 text-white/80 hover:bg-white/20"
                  }`}
                >
                  {selected === scene.id ? "Selected ✓" : "Use as Reference"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
