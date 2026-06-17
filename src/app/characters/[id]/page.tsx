"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../lib/auth-context";
import { apiFetch } from "../../../lib/api-client";
import { Navbar } from "../../../components/navbar";

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

interface ReferenceImage {
  id: string;
  storageKey: string;
  filename: string;
}

interface CharacterDetail {
  id: string;
  name: string;
  description: string;
  age?: string | null;
  gender?: string | null;
  style?: string | null;
  outfit?: string | null;
  personality?: string | null;
  negativePrompt?: string | null;
  hairDescription?: string | null;
  faceDescription?: string | null;
  eyeColor?: string | null;
  bodyType?: string | null;
  colorPalette?: string | null;
  createdAt: string;
  images: ReferenceImage[];
}

export default function CharacterDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
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
        setCharacter(data.character);

        const urls: Record<string, string> = {};
        for (const img of data.character.images || []) {
          const urlRes = await apiFetch(`/api/images/${img.storageKey}`);
          if (urlRes.ok) { const urlData = await urlRes.json(); urls[img.id] = urlData.url; }
        }
        setImageUrls(urls);
      } finally { setLoading(false); }
    }
    fetchCharacter();
  }, [id, session, authLoading, router]);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setGenError("");
    setGeneratedImage(null);
    setGenerating(true);
    try {
      const res = await apiFetch("/api/generate", {
        method: "POST",
        body: JSON.stringify({ characterId: id, prompt, aspectRatio }),
      });
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
    return (<><Navbar /><div className="flex flex-1 items-center justify-center"><p className="text-[var(--text-muted)]">Loading...</p></div></>);
  }
  if (!character) return null;

  const memoryFields = [
    { label: "Age", value: character.age },
    { label: "Gender", value: character.gender },
    { label: "Hair", value: character.hairDescription },
    { label: "Face", value: character.faceDescription },
    { label: "Eye Color", value: character.eyeColor },
    { label: "Body Type", value: character.bodyType },
    { label: "Style", value: character.style },
    { label: "Outfit", value: character.outfit },
    { label: "Personality", value: character.personality },
    { label: "Color Palette", value: character.colorPalette },
    { label: "Negative Prompt", value: character.negativePrompt },
  ].filter((f) => f.value);

  return (
    <>
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-8 w-full animate-in">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">{character.name}</h1>
          <p className="text-[var(--text-secondary)] mt-1">{character.description}</p>
        </div>

        {/* Character Memory */}
        {memoryFields.length > 0 && (
          <section className="depth-card p-6 mb-6">
            <h2 className="text-lg font-semibold mb-3 text-white">Character Memory</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {memoryFields.map((f) => (
                <div key={f.label} className="p-2 rounded-[var(--radius-md)] bg-[var(--surface-card)] border border-[var(--border-default)]">
                  <span className="text-xs text-[var(--text-muted)]">{f.label}</span>
                  <p className="text-sm text-[var(--text-primary)]">{f.value}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Reference Images */}
        {character.images.length > 0 && (
          <section className="depth-card p-6 mb-6">
            <h2 className="text-lg font-semibold mb-3 text-white">Reference Images</h2>
            <div className="flex gap-3 flex-wrap">
              {character.images.map((img) => (
                <div key={img.id} className="w-32 h-32 rounded-[var(--radius-md)] border border-[var(--border-default)] overflow-hidden bg-[var(--surface-card)]">
                  {imageUrls[img.id] ? (
                    <img src={imageUrls[img.id]} alt={`Reference: ${img.filename}`} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-[var(--text-muted)]">Loading...</div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Generation Form */}
        <section className="depth-card p-6 mb-8">
          <h2 className="text-lg font-semibold mb-3 text-white">Generate Scene</h2>

          {/* Scene Templates */}
          <div className="mb-4">
            <p className="text-xs text-[var(--text-muted)] mb-2">Quick templates:</p>
            <div className="flex flex-wrap gap-2">
              {SCENE_TEMPLATES.map((template) => (
                <button
                  key={template}
                  type="button"
                  onClick={() => setPrompt(template)}
                  className="glass-card px-3 py-1 text-xs rounded-[var(--radius-full)] text-[var(--text-secondary)]"
                >
                  {template}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleGenerate} className="space-y-4">
            {genError && (
              <div role="alert" className="p-3 text-sm text-red-400 bg-red-900/20 border border-red-800/30 rounded-[var(--radius-md)]">
                {genError}
              </div>
            )}
            <div>
              <label htmlFor="prompt" className="block text-xs font-medium text-[var(--text-secondary)] mb-2 uppercase tracking-wider">Scene Prompt</label>
              <textarea id="prompt" required maxLength={500} rows={3} value={prompt} onChange={(e) => setPrompt(e.target.value)}
                className="input-field resize-none"
                placeholder="Describe the scene..." />
              <p className="text-xs text-[var(--text-muted)] mt-1">{prompt.length}/500</p>
            </div>
            {/* Aspect Ratio Selector */}
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-2 uppercase tracking-wider">Aspect Ratio</label>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                {ASPECT_RATIOS.map((ar) => (
                  <button
                    key={ar.value}
                    type="button"
                    onClick={() => setAspectRatio(ar.value)}
                    className={`glass-card p-2 rounded-[var(--radius-md)] text-center transition-all ${
                      aspectRatio === ar.value
                        ? "bg-[var(--brand-primary)] border-[var(--brand-primary)] text-white"
                        : "text-[var(--text-secondary)]"
                    }`}
                  >
                    <span className="block text-sm font-medium">{ar.label}</span>
                    <span className="block text-[10px] opacity-70">{ar.desc}</span>
                  </button>
                ))}
              </div>
            </div>
            <button type="submit" disabled={generating} className="btn-primary">
              {generating ? "Generating..." : "Generate"}
            </button>
          </form>
        </section>

        {/* Generated Image */}
        {generatedImage && (
          <section className="depth-card p-6">
            <h2 className="text-lg font-semibold mb-3 text-white">Generated Image</h2>
            <div className="rounded-[var(--radius-md)] border border-[var(--border-default)] overflow-hidden inline-block">
              <img src={generatedImage} alt="Generated scene" className="max-w-full max-h-96" />
            </div>
          </section>
        )}
      </main>
    </>
  );
}
