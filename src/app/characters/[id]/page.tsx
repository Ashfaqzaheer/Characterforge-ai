"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../lib/auth-context";
import { apiFetch } from "../../../lib/api-client";
import { Navbar } from "../../../components/navbar";
import { CharacterPassport } from "../../../components/character-passport";

const SCENE_TEMPLATES = [
  "Walking in a park",
  "Running on a track",
  "Studying at a desk",
  "Driving a car",
  "Talking to a friend",
  "Eating at a table",
  "Fighting in an arena",
  "Sleeping in bed",
  "Reading a book",
  "Happy and smiling",
  "Sad and crying",
  "Angry and shouting",
];

const ASPECT_RATIOS = [
  { value: "9:16", label: "9:16", desc: "Shorts / Reels" },
  { value: "16:9", label: "16:9", desc: "YouTube" },
  { value: "1:1", label: "1:1", desc: "Instagram" },
  { value: "4:5", label: "4:5", desc: "Portrait" },
  { value: "3:4", label: "3:4", desc: "Storybook" },
  { value: "21:9", label: "21:9", desc: "Cinematic" },
] as const;

interface ReferenceImage { id: string; storageKey: string; filename: string; }

interface CharacterDetail {
  id: string; name: string; description: string;
  age?: string | null; gender?: string | null; style?: string | null;
  outfit?: string | null; personality?: string | null; negativePrompt?: string | null;
  hairDescription?: string | null; faceDescription?: string | null;
  eyeColor?: string | null; bodyType?: string | null; colorPalette?: string | null;
  createdAt: string; images: ReferenceImage[];
  generationCount: number;
}

export default function CharacterDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { session, loading: authLoading } = useAuth();
  const router = useRouter();

  const [character, setCharacter] = useState<CharacterDetail | null>(null);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [prompt, setPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState("9:16");
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState("");
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!session) { router.push("/login"); return; }
    async function fetchCharacter() {
      try {
        const res = await apiFetch(`/api/characters/${id}`);
        if (!res.ok) { router.push("/dashboard"); return; }
        const data = await res.json();
        const characterData: CharacterDetail = {
          ...data.character,
          generationCount: data.character._count?.generations ?? 0,
        };
        setCharacter(characterData);
        const urls: Record<string, string> = {};
        const images = data.character.images || [];
        const results = await Promise.allSettled(
          images.map(async (img: { id: string; storageKey: string }) => {
            const urlRes = await apiFetch(`/api/images/${img.storageKey}`);
            if (urlRes.ok) {
              const urlData = await urlRes.json();
              return { id: img.id, url: urlData.url as string };
            }
            return null;
          })
        );
        for (const result of results) {
          if (result.status === "fulfilled" && result.value) {
            urls[result.value.id] = result.value.url;
          }
        }
        setImageUrls(urls);
      } finally { setLoading(false); }
    }
    fetchCharacter();
  }, [id, session, authLoading, router]);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setGenError(""); setGeneratedImage(null); setGenerating(true);
    try {
      const res = await apiFetch("/api/generate", { method: "POST", body: JSON.stringify({ characterId: id, prompt, aspectRatio }) });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 402) setGenError("Insufficient credits.");
        else if (res.status === 429) setGenError("Rate limited. Please try again later.");
        else setGenError(data.error?.message || "Generation failed.");
        return;
      }
      if (data.generation?.imageKey) {
        const urlRes = await apiFetch(`/api/images/${data.generation.imageKey}`);
        if (urlRes.ok) { const urlData = await urlRes.json(); setGeneratedImage(urlData.url); }
      }
    } catch { setGenError("Generation failed. Please try again."); }
    finally { setGenerating(false); }
  }

  if (authLoading || loading) {
    return (<><Navbar /><div className="flex flex-1 items-center justify-center min-h-screen"><p className="text-[#81a0bb]/60">Loading...</p></div></>);
  }
  if (!character) return null;

  const firstImageId = character.images[0]?.id;
  const referenceImageUrl = firstImageId ? imageUrls[firstImageId] ?? null : null;

  return (
    <div className="min-h-screen bg-black">
      <Navbar />

      <main className="max-w-[760px] mx-auto px-5 pt-10 pb-20">
        {/* Back button */}
        <button
          onClick={() => { window.history.length > 1 ? router.back() : router.push("/dashboard"); }}
          className="flex items-center gap-1.5 text-[13px] text-white/50 hover:text-white mb-4 transition-colors"
          aria-label="Go back to dashboard"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5" /><path d="M12 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        {/* Character Passport */}
        <CharacterPassport
          character={character}
          referenceImageUrl={referenceImageUrl}
          onEdit={() => router.push(`/characters/${id}/edit`)}
        />

        {/* Generate Scene Card */}
        <div className="rounded-2xl border border-white/[0.12] bg-[rgba(10,10,10,0.75)] backdrop-blur-sm p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          <h2 className="text-[18px] font-semibold text-white mb-4">Generate Scene</h2>

          {/* Quick templates */}
          <div className="mb-5">
            <p className="text-[11px] text-white/40 mb-2.5 uppercase tracking-wide">Quick templates:</p>
            <div className="flex flex-wrap gap-2">
              {SCENE_TEMPLATES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setPrompt(t)}
                  className={`px-3.5 py-1.5 text-[12px] rounded-full border transition-all ${
                    prompt === t
                      ? "border-[#2d628c] text-white bg-[#2d628c]/20"
                      : "border-white/[0.12] text-[#81a0bb] bg-transparent hover:border-white/25 hover:text-white"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleGenerate} className="space-y-5">
            {genError && (
              <div className="p-3 text-[13px] text-red-400 bg-red-900/15 border border-red-800/25 rounded-xl">{genError}</div>
            )}

            {/* Scene Prompt */}
            <div>
              <label className="block text-[11px] font-medium text-[#81a0bb] mb-2 uppercase tracking-wider">Scene Prompt</label>
              <textarea
                required
                maxLength={500}
                rows={3}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the scene..."
                className="w-full bg-[#0a0a0a] border border-white/[0.12] rounded-xl px-4 py-3 text-[14px] text-white placeholder-white/25 resize-none focus:outline-none focus:border-[#2d628c] focus:ring-1 focus:ring-[#2d628c]/30 transition-all"
              />
              <p className="text-[11px] text-white/30 mt-1.5 text-right">{prompt.length}/500</p>
            </div>

            {/* Aspect Ratio */}
            <div>
              <label className="block text-[11px] font-medium text-[#81a0bb] mb-2 uppercase tracking-wider">Aspect Ratio</label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {ASPECT_RATIOS.map((ar) => (
                  <button
                    key={ar.value}
                    type="button"
                    onClick={() => setAspectRatio(ar.value)}
                    className={`p-2.5 rounded-xl border text-center transition-all ${
                      aspectRatio === ar.value
                        ? "border-[#2d628c] bg-[#2d628c]/15 shadow-[0_0_12px_rgba(45,98,140,0.2)]"
                        : "border-white/[0.12] bg-transparent hover:border-white/25"
                    }`}
                  >
                    <span className={`block text-[13px] font-medium ${aspectRatio === ar.value ? "text-white" : "text-[#81a0bb]"}`}>{ar.label}</span>
                    <span className={`block text-[9px] mt-0.5 ${aspectRatio === ar.value ? "text-white/70" : "text-white/30"}`}>{ar.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Generate Button */}
            <div>
              <button
                type="submit"
                disabled={generating}
                className="h-[44px] px-8 rounded-full bg-gradient-to-r from-[#2d628c] to-[#1a4a6e] text-white text-[14px] font-semibold transition-all hover:shadow-[0_4px_20px_rgba(45,98,140,0.4)] hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:hover:scale-100"
              >
                {generating ? "Generating..." : "Generate"}
              </button>
            </div>
          </form>
        </div>

        {/* Generated Image */}
        {generatedImage && (
          <div className="mt-6 rounded-2xl border border-white/[0.12] bg-[rgba(10,10,10,0.75)] p-6">
            <h2 className="text-[16px] font-semibold text-white mb-3">Generated Image</h2>
            <div className="rounded-xl border border-white/[0.08] overflow-hidden inline-block">
              <img src={generatedImage} alt="Generated scene" className="max-w-full max-h-[400px]" />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
