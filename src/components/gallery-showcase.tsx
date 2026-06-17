"use client";

const GALLERY = [
  { id: "hero-char", title: "Hero Character", image: "https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=600&q=80" },
  { id: "cute-kid", title: "Cute Kid Character", image: "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=600&q=80" },
  { id: "anime-char", title: "Anime Character", image: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&q=80" },
  { id: "fantasy-warrior", title: "Fantasy Warrior", image: "https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=600&q=80" },
  { id: "scifi-explorer", title: "Sci-fi Explorer", image: "https://images.unsplash.com/photo-1581822261290-991b38693d1b?w=600&q=80" },
  { id: "realistic-portrait", title: "Realistic Portrait", image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&q=80" },
  { id: "story-scene", title: "Story Scene", image: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&q=80" },
  { id: "cinematic-poster", title: "Cinematic Poster", image: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=600&q=80" },
];

export function GalleryShowcase() {
  return (
    <section className="py-24 px-6 bg-[#050505]" id="gallery">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4" style={{ letterSpacing: "-0.03em" }}>
            Explore visual examples
          </h2>
          <p className="text-white/60 max-w-lg mx-auto leading-relaxed">
            Browse character and scene ideas before generating your own.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {GALLERY.map((item, i) => (
            <div
              key={item.id}
              className={`group relative rounded-2xl overflow-hidden border border-white/10 hover:border-white/30 transition-all duration-300 ${
                i % 3 === 0 ? "row-span-2" : ""
              }`}
            >
              <div className={`overflow-hidden ${i % 3 === 0 ? "aspect-[3/5]" : "aspect-square"}`}>
                <img
                  src={item.image}
                  alt={item.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  onError={(e) => { (e.target as HTMLImageElement).src = "https://placehold.co/600x600/1a1a2e/ffffff?text=" + encodeURIComponent(item.title); }}
                />
              </div>
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all duration-300 flex items-end">
                <div className="p-4 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                  <h3 className="text-white font-semibold text-sm">{item.title}</h3>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
