"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../lib/auth-context";
import { apiFetch } from "../../../lib/api-client";
import { Navbar } from "../../../components/navbar";

interface CharacterTemplate {
  id: string;
  label: string;
  emoji: string;
  description: string;
  fields: {
    name?: string;
    description?: string;
    age?: string;
    gender?: string;
    style?: string;
    outfit?: string;
    personality?: string;
    hairDescription?: string;
    faceDescription?: string;
    eyeColor?: string;
    bodyType?: string;
    colorPalette?: string;
  };
}

const CHARACTER_TEMPLATES: CharacterTemplate[] = [
  {
    id: "anime-hero", label: "Anime Hero", emoji: "⚡",
    description: "Spiky-haired protagonist with fierce determination",
    fields: {
      description: "A passionate young hero with an unbreakable spirit and fierce eyes",
      age: "17", gender: "male", style: "anime",
      personality: "determined, passionate, never gives up, loyal to friends",
      hairDescription: "spiky black hair that defies gravity",
      faceDescription: "sharp features, intense determined eyes, angular jaw",
      eyeColor: "dark brown with an inner fire",
      bodyType: "athletic, lean muscular build",
      outfit: "torn white training shirt, dark pants, red headband",
      colorPalette: "black, white, red accents",
    },
  },
  {
    id: "fantasy-warrior", label: "Fantasy Warrior", emoji: "⚔️",
    description: "Battle-hardened knight in ornate armor",
    fields: {
      description: "A veteran warrior who has survived countless battles, their eyes carrying the weight of hard-won wisdom",
      age: "35", gender: "female", style: "fantasy, epic, painterly",
      personality: "stoic, honorable, protective, battle-hardened but kind",
      hairDescription: "long silver hair, often braided or tied back",
      faceDescription: "strong jaw, battle scar across left cheek, weathered but beautiful",
      eyeColor: "steel grey",
      bodyType: "tall, powerfully built, broad shoulders",
      outfit: "ornate silver plate armor with blue gemstones, red cape",
      colorPalette: "silver, royal blue, crimson, gold",
    },
  },
  {
    id: "cyberpunk-hacker", label: "Cyberpunk Hacker", emoji: "💻",
    description: "Neon-lit tech genius in a dystopian city",
    fields: {
      description: "A brilliant underground hacker who navigates the digital underworld with ease, always three steps ahead",
      age: "24", gender: "female", style: "cyberpunk, neon noir, digital art",
      personality: "sarcastic, brilliant, cynical, secretly caring, resourceful",
      hairDescription: "undercut with neon purple and electric blue dye job",
      faceDescription: "sharp cheekbones, cybernetic eye implant left eye glowing amber",
      eyeColor: "one natural green, one cybernetic amber implant",
      bodyType: "slim, wiry, quick",
      outfit: "black cropped jacket with LED strips, cargo pants, fingerless gloves, holographic visor",
      colorPalette: "neon purple, electric blue, amber, black",
    },
  },
  {
    id: "medieval-queen", label: "Medieval Queen", emoji: "👑",
    description: "Regal monarch commanding respect and authority",
    fields: {
      description: "A wise and powerful queen who rules with both iron will and deep compassion for her people",
      age: "38", gender: "female", style: "medieval fantasy, regal, oil painting",
      personality: "commanding, wise, compassionate, dignified, strategic",
      hairDescription: "flowing auburn hair adorned with braids and a jeweled crown",
      faceDescription: "high cheekbones, piercing intelligent eyes, elegant bearing",
      eyeColor: "emerald green",
      bodyType: "tall and poised, graceful posture",
      outfit: "deep burgundy velvet gown with gold embroidery, ermine-trimmed cloak, jeweled crown",
      colorPalette: "burgundy, gold, ivory, deep green",
    },
  },
  {
    id: "superhero", label: "Superhero", emoji: "🦸",
    description: "Caped guardian with iconic costume and heroic presence",
    fields: {
      description: "A powerful guardian who protects the innocent, their presence radiating strength and unwavering resolve",
      age: "28", gender: "male", style: "comic book, bold colors, dynamic",
      personality: "heroic, selfless, inspiring, determined, hopeful",
      hairDescription: "dark wavy hair, always perfectly windswept",
      faceDescription: "square jaw, chiseled features, confident smile",
      eyeColor: "bright blue",
      bodyType: "massively muscular, heroic physique, broad chest",
      outfit: "navy blue suit with red cape, gold chest emblem, matching boots and gloves",
      colorPalette: "navy blue, red, gold, white",
    },
  },
  {
    id: "scifi-pilot", label: "Sci-Fi Pilot", emoji: "🚀",
    description: "Daring space explorer with a spacecraft and attitude",
    fields: {
      description: "A fearless interstellar pilot who has navigated every corner of the galaxy, surviving on wit and instinct",
      age: "31", gender: "female", style: "sci-fi, cinematic, realistic",
      personality: "daring, quick-witted, adventurous, cocky but reliable",
      hairDescription: "short practical sandy brown hair, sometimes tucked under helmet",
      faceDescription: "sun-tanned, laugh lines, sharp perceptive eyes",
      eyeColor: "hazel, always scanning the horizon",
      bodyType: "lean and agile, pilot-fit",
      outfit: "worn leather flight jacket with patches, flight suit, fingerless gloves, dog tags",
      colorPalette: "tan, khaki, deep space navy, chrome",
    },
  },
];

export default function NewCharacterPage() {
  const { session, loading: authLoading } = useAuth();
  const router = useRouter();
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
  const [files, setFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [activeTemplate, setActiveTemplate] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !session) {
      router.replace("/login");
    }
  }, [authLoading, session, router]);

  if (authLoading) {
    return (
      <>
        <Navbar />
        <div className="flex flex-1 items-center justify-center">
          <p className="text-[var(--text-muted)]">Loading...</p>
        </div>
      </>
    );
  }

  if (!session) {
    return null;
  }

  function applyTemplate(template: CharacterTemplate) {
    setActiveTemplate(template.id);
    setName("");
    if (template.fields.description) setDescription(template.fields.description);
    if (template.fields.age) setAge(template.fields.age);
    if (template.fields.gender) setGender(template.fields.gender);
    if (template.fields.style) setStyle(template.fields.style);
    if (template.fields.outfit) setOutfit(template.fields.outfit);
    if (template.fields.personality) setPersonality(template.fields.personality);
    if (template.fields.hairDescription) setHairDescription(template.fields.hairDescription);
    if (template.fields.faceDescription) setFaceDescription(template.fields.faceDescription);
    if (template.fields.eyeColor) setEyeColor(template.fields.eyeColor);
    if (template.fields.bodyType) setBodyType(template.fields.bodyType);
    if (template.fields.colorPalette) setColorPalette(template.fields.colorPalette);
    setErrors({});
    setTimeout(() => { document.getElementById("name")?.focus(); }, 100);
  }

  function clearTemplate() {
    setActiveTemplate(null);
    setName(""); setDescription(""); setAge(""); setGender("");
    setStyle(""); setOutfit(""); setPersonality(""); setHairDescription("");
    setFaceDescription(""); setEyeColor(""); setBodyType(""); setColorPalette("");
    setNegativePrompt("");
    setErrors({});
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files || []);
    if (selected.length > 3) {
      setErrors((prev) => ({ ...prev, files: "Maximum 3 images allowed." }));
      return;
    }
    for (const f of selected) {
      if (!["image/png", "image/jpeg", "image/webp"].includes(f.type)) {
        setErrors((prev) => ({ ...prev, files: "Only PNG, JPEG, and WebP images are allowed." }));
        return;
      }
      if (f.size > 4 * 1024 * 1024) {
        setErrors((prev) => ({ ...prev, files: "Each image must be 4MB or smaller." }));
        return;
      }
    }
    setErrors((prev) => { const next = { ...prev }; delete next.files; return next; });
    setFiles(selected);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setSubmitting(true);

    try {
      const createRes = await apiFetch("/api/characters", {
        method: "POST",
        body: JSON.stringify({
          name, description, age, gender, style, outfit, personality,
          negativePrompt, hairDescription, faceDescription, eyeColor, bodyType, colorPalette,
        }),
      });

      const createData = await createRes.json();
      if (!createRes.ok) {
        if (createData.error?.code === "CHARACTER_LIMIT_REACHED") {
          setErrors({ form: "CHARACTER_LIMIT_REACHED" });
        } else {
          setErrors({ form: createData.error?.message || "Failed to create character." });
        }
        return;
      }

      const characterId = createData.character?.id;
      if (!characterId) {
        setErrors({ form: "Character creation failed unexpectedly." });
        return;
      }

      if (files.length > 0) {
        const uploadResults = await Promise.allSettled(
          files.map(async (file) => {
            const formData = new FormData();
            formData.append("file", file);
            const uploadRes = await apiFetch(`/api/characters/${characterId}/images`, { method: "POST", body: formData });
            if (!uploadRes.ok) {
              const uploadData = await uploadRes.json();
              throw new Error(uploadData.error?.message || "Upload failed");
            }
            return true;
          })
        );

        const succeeded = uploadResults.filter((r) => r.status === "fulfilled").length;
        const failed = uploadResults.filter((r) => r.status === "rejected").length;

        if (failed > 0 && succeeded > 0) {
          setErrors({ files: `Character created, but ${failed} of ${files.length} images failed to upload. Redirecting to character page...` });
          setTimeout(() => router.push(`/characters/${characterId}`), 3000);
          return;
        }

        if (failed > 0 && succeeded === 0) {
          setErrors({ files: `Character created but no images were uploaded. Visit the character page to add reference images.` });
          setTimeout(() => router.push(`/characters/${characterId}`), 3000);
          return;
        }
      }

      router.push(`/characters/${characterId}`);
    } catch {
      setErrors({ form: "Something went wrong. Please try again." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-8 w-full animate-in">
        {/* Back button */}
        <button
          onClick={() => router.push("/dashboard")}
          className="flex items-center gap-1.5 text-[13px] text-white/50 hover:text-white mb-4 transition-colors"
          aria-label="Back to dashboard"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5" /><path d="M12 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        <h1 className="text-2xl font-bold mb-6 text-white">Create Character</h1>

        {/* Template Picker */}
        <div className="mb-6">
          <p className="text-sm text-white/50 mb-3">Start from a template or fill in from scratch:</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {CHARACTER_TEMPLATES.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => applyTemplate(template)}
                className={`text-left p-3 rounded-xl border transition-all ${
                  activeTemplate === template.id
                    ? "border-[#e8702a] bg-[#e8702a]/10"
                    : "border-white/[0.12] bg-white/[0.02] hover:border-white/25 hover:bg-white/[0.04]"
                }`}
              >
                <div className="text-lg mb-1">{template.emoji}</div>
                <div className="text-[13px] font-medium text-white leading-tight">{template.label}</div>
                <div className="text-[11px] text-white/40 mt-0.5 leading-tight">{template.description}</div>
              </button>
            ))}
          </div>
          {activeTemplate && (
            <button
              type="button"
              onClick={clearTemplate}
              className="mt-2 text-[11px] text-white/30 hover:text-white/60 transition-colors"
            >
              ✕ Clear template
            </button>
          )}
        </div>

        <div className="depth-card p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {errors.form && (
              <div role="alert" className="p-3 text-sm text-red-400 bg-red-900/20 border border-red-800/30 rounded-[var(--radius-md)]">
                {errors.form === "CHARACTER_LIMIT_REACHED" ? (
                  <span>
                    You&apos;ve reached the free limit of 3 characters.{" "}
                    <a href="/dashboard" className="underline text-[#e8702a] hover:text-[#d2611f]">Buy credits</a> to create unlimited characters.
                  </span>
                ) : (
                  errors.form
                )}
              </div>
            )}

            {/* Required fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="name" className="block text-xs font-medium text-[var(--text-secondary)] mb-2 uppercase tracking-wider">Name *</label>
                {activeTemplate && (
                  <p className="text-[11px] text-[#e8702a]/70 mb-1">Give your character a unique name to make them your own.</p>
                )}
                <input id="name" type="text" required maxLength={100} value={name} onChange={(e) => setName(e.target.value)}
                  className="input-field"
                  placeholder="Character name" />
              </div>
              <div>
                <label htmlFor="age" className="block text-xs font-medium text-[var(--text-secondary)] mb-2 uppercase tracking-wider">Age</label>
                <input id="age" type="text" maxLength={50} value={age} onChange={(e) => setAge(e.target.value)}
                  className="input-field"
                  placeholder="e.g. 12, young adult" />
              </div>
            </div>

            <div>
              <label htmlFor="description" className="block text-xs font-medium text-[var(--text-secondary)] mb-2 uppercase tracking-wider">Description *</label>
              <textarea id="description" required maxLength={1000} rows={3} value={description} onChange={(e) => setDescription(e.target.value)}
                className="input-field resize-none"
                placeholder="General character description..." />
            </div>

            {/* Character Memory fields */}
            <h2 className="text-lg font-semibold pt-2 text-white">Character Memory</h2>
            <p className="text-xs text-[var(--text-muted)] -mt-3">These details are used in every generation to maintain consistency.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="gender" className="block text-xs font-medium text-[var(--text-secondary)] mb-2 uppercase tracking-wider">Gender</label>
                <input id="gender" type="text" maxLength={50} value={gender} onChange={(e) => setGender(e.target.value)}
                  className="input-field"
                  placeholder="e.g. female, male" />
              </div>
              <div>
                <label htmlFor="eyeColor" className="block text-xs font-medium text-[var(--text-secondary)] mb-2 uppercase tracking-wider">Eye Color</label>
                <input id="eyeColor" type="text" maxLength={50} value={eyeColor} onChange={(e) => setEyeColor(e.target.value)}
                  className="input-field"
                  placeholder="e.g. blue, brown" />
              </div>
              <div>
                <label htmlFor="hairDescription" className="block text-xs font-medium text-[var(--text-secondary)] mb-2 uppercase tracking-wider">Hair</label>
                <input id="hairDescription" type="text" maxLength={200} value={hairDescription} onChange={(e) => setHairDescription(e.target.value)}
                  className="input-field"
                  placeholder="e.g. long black hair with bangs" />
              </div>
              <div>
                <label htmlFor="faceDescription" className="block text-xs font-medium text-[var(--text-secondary)] mb-2 uppercase tracking-wider">Face</label>
                <input id="faceDescription" type="text" maxLength={200} value={faceDescription} onChange={(e) => setFaceDescription(e.target.value)}
                  className="input-field"
                  placeholder="e.g. round face, freckles" />
              </div>
              <div>
                <label htmlFor="bodyType" className="block text-xs font-medium text-[var(--text-secondary)] mb-2 uppercase tracking-wider">Body Type</label>
                <input id="bodyType" type="text" maxLength={100} value={bodyType} onChange={(e) => setBodyType(e.target.value)}
                  className="input-field"
                  placeholder="e.g. slim, athletic" />
              </div>
              <div>
                <label htmlFor="style" className="block text-xs font-medium text-[var(--text-secondary)] mb-2 uppercase tracking-wider">Art Style</label>
                <input id="style" type="text" maxLength={200} value={style} onChange={(e) => setStyle(e.target.value)}
                  className="input-field"
                  placeholder="e.g. anime, pixar, cartoon" />
              </div>
            </div>

            <div>
              <label htmlFor="outfit" className="block text-xs font-medium text-[var(--text-secondary)] mb-2 uppercase tracking-wider">Outfit</label>
              <input id="outfit" type="text" maxLength={500} value={outfit} onChange={(e) => setOutfit(e.target.value)}
                className="input-field"
                placeholder="e.g. blue school uniform with red tie" />
            </div>

            <div>
              <label htmlFor="personality" className="block text-xs font-medium text-[var(--text-secondary)] mb-2 uppercase tracking-wider">Personality</label>
              <input id="personality" type="text" maxLength={500} value={personality} onChange={(e) => setPersonality(e.target.value)}
                className="input-field"
                placeholder="e.g. cheerful, shy, brave" />
            </div>

            <div>
              <label htmlFor="colorPalette" className="block text-xs font-medium text-[var(--text-secondary)] mb-2 uppercase tracking-wider">Color Palette</label>
              <input id="colorPalette" type="text" maxLength={200} value={colorPalette} onChange={(e) => setColorPalette(e.target.value)}
                className="input-field"
                placeholder="e.g. pastel blue, pink, white" />
            </div>

            <div>
              <label htmlFor="negativePrompt" className="block text-xs font-medium text-[var(--text-secondary)] mb-2 uppercase tracking-wider">Negative Prompt</label>
              <textarea id="negativePrompt" maxLength={500} rows={2} value={negativePrompt} onChange={(e) => setNegativePrompt(e.target.value)}
                className="input-field resize-none"
                placeholder="Things to avoid: e.g. blurry, extra fingers, low quality" />
            </div>

            {/* Reference Images */}
            <div>
              <label htmlFor="images" className="block text-xs font-medium text-[var(--text-secondary)] mb-2 uppercase tracking-wider">Reference Images (1-3)</label>
              <input id="images" type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={handleFileChange}
                className="w-full text-sm text-[var(--text-muted)] file:mr-3 file:rounded-[var(--radius-full)] file:border file:border-[var(--border-default)] file:bg-[var(--surface-card)] file:px-4 file:py-2 file:text-sm file:font-medium file:text-[var(--text-secondary)]" />
              {errors.files && <p className="text-xs text-red-400 mt-1">{errors.files}</p>}
              {files.length > 0 && <p className="text-xs text-[var(--text-muted)] mt-1">{files.length} file{files.length !== 1 ? "s" : ""} selected</p>}
            </div>

            <button type="submit" disabled={submitting} className="btn-primary w-full mt-2">
              {submitting ? "Creating..." : "Create Character"}
            </button>
          </form>
        </div>
      </main>
    </>
  );
}
