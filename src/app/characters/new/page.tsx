"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../lib/auth-context";
import { apiFetch } from "../../../lib/api-client";
import { Navbar } from "../../../components/navbar";

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
      if (f.size > 5 * 1024 * 1024) {
        setErrors((prev) => ({ ...prev, files: "Each image must be 5MB or smaller." }));
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
        setErrors({ form: createData.error?.message || "Failed to create character." });
        return;
      }

      const characterId = createData.character?.id;

      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);
        const uploadRes = await apiFetch(`/api/characters/${characterId}/images`, { method: "POST", body: formData });
        if (!uploadRes.ok) {
          const uploadData = await uploadRes.json();
          setErrors({ files: uploadData.error?.message || "Image upload failed." });
          break;
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
        <h1 className="text-2xl font-bold mb-6 text-white">Create Character</h1>

        <div className="depth-card p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {errors.form && (
              <div role="alert" className="p-3 text-sm text-red-400 bg-red-900/20 border border-red-800/30 rounded-[var(--radius-md)]">
                {errors.form}
              </div>
            )}

            {/* Required fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="name" className="block text-xs font-medium text-[var(--text-secondary)] mb-2 uppercase tracking-wider">Name *</label>
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
