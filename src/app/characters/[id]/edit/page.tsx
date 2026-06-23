"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../../lib/auth-context";
import { apiFetch } from "../../../../lib/api-client";
import { Navbar } from "../../../../components/navbar";

export default function EditCharacterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { session, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [style, setStyle] = useState("");
  const [outfit, setOutfit] = useState("");
  const [personality, setPersonality] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [hairDescription, setHairDescription] = useState("");
  const [faceDescription, setFaceDescription] = useState("");
  const [eyeColor, setEyeColor] = useState("");
  const [bodyType, setBodyType] = useState("");
  const [colorPalette, setColorPalette] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!session) { router.replace("/login"); return; }
    async function fetchCharacter() {
      try {
        const res = await apiFetch(`/api/characters/${id}`);
        if (!res.ok) { router.push("/dashboard"); return; }
        const { character: c } = await res.json();
        setName(c.name || "");
        setDescription(c.description || "");
        setAge(c.age || "");
        setGender(c.gender || "");
        setStyle(c.style || "");
        setOutfit(c.outfit || "");
        setPersonality(c.personality || "");
        setNegativePrompt(c.negativePrompt || "");
        setHairDescription(c.hairDescription || "");
        setFaceDescription(c.faceDescription || "");
        setEyeColor(c.eyeColor || "");
        setBodyType(c.bodyType || "");
        setColorPalette(c.colorPalette || "");
      } finally { setLoading(false); }
    }
    fetchCharacter();
  }, [id, session, authLoading, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setSubmitting(true);
    try {
      const res = await apiFetch(`/api/characters/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ name, description, age, gender, style, outfit, personality, negativePrompt, hairDescription, faceDescription, eyeColor, bodyType, colorPalette }),
      });
      const data = await res.json();
      if (!res.ok) { setErrors({ form: data.error?.message || "Failed to update character." }); return; }
      router.push(`/characters/${id}`);
    } catch { setErrors({ form: "Something went wrong. Please try again." }); }
    finally { setSubmitting(false); }
  }

  if (authLoading || loading) {
    return (<><Navbar /><div className="flex flex-1 items-center justify-center min-h-screen"><p className="text-white/40">Loading...</p></div></>);
  }

  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-8 w-full animate-in">
        <button onClick={() => { window.history.length > 1 ? router.back() : router.push(`/characters/${id}`); }} className="flex items-center gap-1.5 text-[13px] text-white/50 hover:text-white mb-4 transition-colors" aria-label="Back to character">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5" /><path d="M12 19l-7-7 7-7" /></svg>
          Back
        </button>
        <h1 className="text-2xl font-bold mb-6 text-white">Edit Character</h1>

        <div className="rounded-2xl border border-white/[0.12] bg-[rgba(10,10,10,0.75)] p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {errors.form && <div role="alert" className="p-3 text-sm text-red-400 bg-red-900/15 border border-red-800/25 rounded-xl">{errors.form}</div>}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-medium text-[#81a0bb] mb-2 uppercase tracking-wider">Name *</label>
                <input type="text" required maxLength={100} value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-[#0a0a0a] border border-white/[0.12] rounded-xl px-4 py-3 text-[14px] text-white placeholder-white/25 focus:outline-none focus:border-[#2d628c]" />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[#81a0bb] mb-2 uppercase tracking-wider">Age</label>
                <input type="text" maxLength={50} value={age} onChange={(e) => setAge(e.target.value)} className="w-full bg-[#0a0a0a] border border-white/[0.12] rounded-xl px-4 py-3 text-[14px] text-white placeholder-white/25 focus:outline-none focus:border-[#2d628c]" />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-[#81a0bb] mb-2 uppercase tracking-wider">Description *</label>
              <textarea required maxLength={1000} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} className="w-full bg-[#0a0a0a] border border-white/[0.12] rounded-xl px-4 py-3 text-[14px] text-white placeholder-white/25 resize-none focus:outline-none focus:border-[#2d628c]" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="block text-[11px] font-medium text-[#81a0bb] mb-2 uppercase tracking-wider">Gender</label><input type="text" maxLength={50} value={gender} onChange={(e) => setGender(e.target.value)} className="w-full bg-[#0a0a0a] border border-white/[0.12] rounded-xl px-4 py-3 text-[14px] text-white placeholder-white/25 focus:outline-none focus:border-[#2d628c]" /></div>
              <div><label className="block text-[11px] font-medium text-[#81a0bb] mb-2 uppercase tracking-wider">Eye Color</label><input type="text" maxLength={50} value={eyeColor} onChange={(e) => setEyeColor(e.target.value)} className="w-full bg-[#0a0a0a] border border-white/[0.12] rounded-xl px-4 py-3 text-[14px] text-white placeholder-white/25 focus:outline-none focus:border-[#2d628c]" /></div>
              <div><label className="block text-[11px] font-medium text-[#81a0bb] mb-2 uppercase tracking-wider">Hair</label><input type="text" maxLength={200} value={hairDescription} onChange={(e) => setHairDescription(e.target.value)} className="w-full bg-[#0a0a0a] border border-white/[0.12] rounded-xl px-4 py-3 text-[14px] text-white placeholder-white/25 focus:outline-none focus:border-[#2d628c]" /></div>
              <div><label className="block text-[11px] font-medium text-[#81a0bb] mb-2 uppercase tracking-wider">Face</label><input type="text" maxLength={200} value={faceDescription} onChange={(e) => setFaceDescription(e.target.value)} className="w-full bg-[#0a0a0a] border border-white/[0.12] rounded-xl px-4 py-3 text-[14px] text-white placeholder-white/25 focus:outline-none focus:border-[#2d628c]" /></div>
              <div><label className="block text-[11px] font-medium text-[#81a0bb] mb-2 uppercase tracking-wider">Body Type</label><input type="text" maxLength={100} value={bodyType} onChange={(e) => setBodyType(e.target.value)} className="w-full bg-[#0a0a0a] border border-white/[0.12] rounded-xl px-4 py-3 text-[14px] text-white placeholder-white/25 focus:outline-none focus:border-[#2d628c]" /></div>
              <div><label className="block text-[11px] font-medium text-[#81a0bb] mb-2 uppercase tracking-wider">Art Style</label><input type="text" maxLength={200} value={style} onChange={(e) => setStyle(e.target.value)} className="w-full bg-[#0a0a0a] border border-white/[0.12] rounded-xl px-4 py-3 text-[14px] text-white placeholder-white/25 focus:outline-none focus:border-[#2d628c]" /></div>
            </div>

            <div><label className="block text-[11px] font-medium text-[#81a0bb] mb-2 uppercase tracking-wider">Outfit</label><input type="text" maxLength={500} value={outfit} onChange={(e) => setOutfit(e.target.value)} className="w-full bg-[#0a0a0a] border border-white/[0.12] rounded-xl px-4 py-3 text-[14px] text-white placeholder-white/25 focus:outline-none focus:border-[#2d628c]" /></div>
            <div><label className="block text-[11px] font-medium text-[#81a0bb] mb-2 uppercase tracking-wider">Personality</label><input type="text" maxLength={500} value={personality} onChange={(e) => setPersonality(e.target.value)} className="w-full bg-[#0a0a0a] border border-white/[0.12] rounded-xl px-4 py-3 text-[14px] text-white placeholder-white/25 focus:outline-none focus:border-[#2d628c]" /></div>
            <div><label className="block text-[11px] font-medium text-[#81a0bb] mb-2 uppercase tracking-wider">Color Palette</label><input type="text" maxLength={200} value={colorPalette} onChange={(e) => setColorPalette(e.target.value)} className="w-full bg-[#0a0a0a] border border-white/[0.12] rounded-xl px-4 py-3 text-[14px] text-white placeholder-white/25 focus:outline-none focus:border-[#2d628c]" /></div>
            <div><label className="block text-[11px] font-medium text-[#81a0bb] mb-2 uppercase tracking-wider">Negative Prompt</label><textarea maxLength={500} rows={2} value={negativePrompt} onChange={(e) => setNegativePrompt(e.target.value)} className="w-full bg-[#0a0a0a] border border-white/[0.12] rounded-xl px-4 py-3 text-[14px] text-white placeholder-white/25 resize-none focus:outline-none focus:border-[#2d628c]" /></div>

            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={submitting} className="h-[44px] px-8 rounded-full bg-gradient-to-r from-[#2d628c] to-[#1a4a6e] text-white text-[14px] font-semibold transition-all hover:shadow-[0_4px_20px_rgba(45,98,140,0.4)] disabled:opacity-50">
                {submitting ? "Saving..." : "Save Changes"}
              </button>
              <button type="button" onClick={() => router.push(`/characters/${id}`)} className="h-[44px] px-6 rounded-full border border-white/[0.12] text-white/60 text-[14px] hover:border-white/30 hover:text-white transition-colors">
                Cancel
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
