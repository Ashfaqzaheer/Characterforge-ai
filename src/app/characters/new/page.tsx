"use client";

import { useState } from "react";
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

  if (authLoading) {
    return (
      <>
        <Navbar />
        <div className="flex flex-1 items-center justify-center">
          <p className="text-zinc-500">Loading...</p>
        </div>
      </>
    );
  }

  if (!session) {
    router.push("/login");
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
      <main className="max-w-2xl mx-auto px-4 py-8 w-full">
        <h1 className="text-2xl font-bold mb-6">Create Character</h1>

        <form onSubmit={handleSubmit} className="space-y-5">
          {errors.form && (
            <div role="alert" className="p-3 text-sm text-red-700 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-lg">
              {errors.form}
            </div>
          )}

          {/* Required fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-1">Name *</label>
              <input id="name" type="text" required maxLength={100} value={name} onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
                placeholder="Character name" />
            </div>
            <div>
              <label htmlFor="age" className="block text-sm font-medium mb-1">Age</label>
              <input id="age" type="text" maxLength={50} value={age} onChange={(e) => setAge(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
                placeholder="e.g. 12, young adult" />
            </div>
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium mb-1">Description *</label>
            <textarea id="description" required maxLength={1000} rows={3} value={description} onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 resize-none"
              placeholder="General character description..." />
          </div>

          {/* Character Memory fields */}
          <h2 className="text-lg font-semibold pt-2">Character Memory</h2>
          <p className="text-xs text-zinc-500 -mt-3">These details are used in every generation to maintain consistency.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="gender" className="block text-sm font-medium mb-1">Gender</label>
              <input id="gender" type="text" maxLength={50} value={gender} onChange={(e) => setGender(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
                placeholder="e.g. female, male" />
            </div>
            <div>
              <label htmlFor="eyeColor" className="block text-sm font-medium mb-1">Eye Color</label>
              <input id="eyeColor" type="text" maxLength={50} value={eyeColor} onChange={(e) => setEyeColor(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
                placeholder="e.g. blue, brown" />
            </div>
            <div>
              <label htmlFor="hairDescription" className="block text-sm font-medium mb-1">Hair</label>
              <input id="hairDescription" type="text" maxLength={200} value={hairDescription} onChange={(e) => setHairDescription(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
                placeholder="e.g. long black hair with bangs" />
            </div>
            <div>
              <label htmlFor="faceDescription" className="block text-sm font-medium mb-1">Face</label>
              <input id="faceDescription" type="text" maxLength={200} value={faceDescription} onChange={(e) => setFaceDescription(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
                placeholder="e.g. round face, freckles" />
            </div>
            <div>
              <label htmlFor="bodyType" className="block text-sm font-medium mb-1">Body Type</label>
              <input id="bodyType" type="text" maxLength={100} value={bodyType} onChange={(e) => setBodyType(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
                placeholder="e.g. slim, athletic" />
            </div>
            <div>
              <label htmlFor="style" className="block text-sm font-medium mb-1">Art Style</label>
              <input id="style" type="text" maxLength={200} value={style} onChange={(e) => setStyle(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
                placeholder="e.g. anime, pixar, cartoon" />
            </div>
          </div>

          <div>
            <label htmlFor="outfit" className="block text-sm font-medium mb-1">Outfit</label>
            <input id="outfit" type="text" maxLength={500} value={outfit} onChange={(e) => setOutfit(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
              placeholder="e.g. blue school uniform with red tie" />
          </div>

          <div>
            <label htmlFor="personality" className="block text-sm font-medium mb-1">Personality</label>
            <input id="personality" type="text" maxLength={500} value={personality} onChange={(e) => setPersonality(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
              placeholder="e.g. cheerful, shy, brave" />
          </div>

          <div>
            <label htmlFor="colorPalette" className="block text-sm font-medium mb-1">Color Palette</label>
            <input id="colorPalette" type="text" maxLength={200} value={colorPalette} onChange={(e) => setColorPalette(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
              placeholder="e.g. pastel blue, pink, white" />
          </div>

          <div>
            <label htmlFor="negativePrompt" className="block text-sm font-medium mb-1">Negative Prompt</label>
            <textarea id="negativePrompt" maxLength={500} rows={2} value={negativePrompt} onChange={(e) => setNegativePrompt(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 resize-none"
              placeholder="Things to avoid: e.g. blurry, extra fingers, low quality" />
          </div>

          {/* Reference Images */}
          <div>
            <label htmlFor="images" className="block text-sm font-medium mb-1">Reference Images (1-3)</label>
            <input id="images" type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={handleFileChange}
              className="w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-100 file:px-3 file:py-2 file:text-sm file:font-medium dark:file:bg-zinc-800" />
            {errors.files && <p className="text-xs text-red-600 dark:text-red-400 mt-1">{errors.files}</p>}
            {files.length > 0 && <p className="text-xs text-zinc-500 mt-1">{files.length} file{files.length !== 1 ? "s" : ""} selected</p>}
          </div>

          <button type="submit" disabled={submitting}
            className="w-full h-10 rounded-lg bg-foreground text-background font-medium text-sm transition-colors hover:opacity-90 disabled:opacity-50">
            {submitting ? "Creating..." : "Create Character"}
          </button>
        </form>
      </main>
    </>
  );
}
