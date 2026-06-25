"use client";

import { useEffect, useState, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../../../lib/auth-context";
import { apiFetch } from "../../../../lib/api-client";
import { Navbar } from "../../../../components/navbar";

interface TimelineEntry {
  id: string;
  prompt: string;
  imageKey: string | null;
  aspectRatio: string | null;
  status: string;
  createdAt: string;
  completedAt: string | null;
}

interface TimelineData {
  character: { id: string; name: string; createdAt: string };
  timeline: TimelineEntry[];
}

export default function CharacterTimelinePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { session, loading: authLoading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<TimelineData | null>(null);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<TimelineEntry | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!session) { router.push("/login"); return; }
    async function fetchTimeline() {
      try {
        const res = await apiFetch(`/api/characters/${id}/timeline`);
        if (!res.ok) { router.push(`/characters/${id}`); return; }
        const json = await res.json();
        setData(json);
        const withImages = (json.timeline ?? []).filter(
          (g: TimelineEntry) => g.status === "COMPLETED" && g.imageKey
        );
        const results = await Promise.allSettled(
          withImages.map(async (g: TimelineEntry) => {
            const urlRes = await apiFetch(`/api/images/${g.imageKey}`);
            if (urlRes.ok) { const urlData = await urlRes.json(); return { id: g.id, url: urlData.url as string }; }
            return null;
          })
        );
        const urls: Record<string, string> = {};
        for (const result of results) {
          if (result.status === "fulfilled" && result.value) {
            urls[result.value.id] = result.value.url;
          }
        }
        setImageUrls(urls);
      } finally { setLoading(false); }
    }
    fetchTimeline();
  }, [id, session, authLoading, router]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") setSelected(null);
  }, []);

  useEffect(() => {
    if (selected) document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [selected, handleKeyDown]);

  function handleDownload() {
    if (!selected || !imageUrls[selected.id] || !data) return;
    const date = new Date(selected.createdAt).toISOString().split("T")[0];
    const link = document.createElement("a");
    link.href = imageUrls[selected.id];
    link.download = `${data.character.name}-${date}.png`;
    link.click();
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    });
  }

  if (authLoading || loading) {
    return (<><Navbar /><div className="flex flex-1 items-center justify-center min-h-screen"><p className="text-white/40">Loading...</p></div></>);
  }

  if (!data) return null;

  const { character, timeline } = data;
  const createdDate = new Date(character.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" });

  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      <main className="max-w-[760px] mx-auto px-5 pt-10 pb-20 animate-in">
        {/* Back button */}
        <button
          onClick={() => { window.history.length > 1 ? router.back() : router.push(`/characters/${id}`); }}
          className="flex items-center gap-1.5 text-[13px] text-white/50 hover:text-white mb-4 transition-colors"
          aria-label="Back to character"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5" /><path d="M12 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        <h1 className="text-[28px] font-bold text-white mb-1">{character.name}&apos;s Journey</h1>
        <p className="text-[13px] text-white/40 mb-8">{timeline.length} scenes · Created {createdDate}</p>

        {timeline.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-white/[0.12] rounded-2xl">
            <p className="text-white/40 mb-2">No scenes generated yet</p>
            <p className="text-white/30 text-sm">Generate scenes from the character page to build your timeline.</p>
            <Link href={`/characters/${id}`} className="mt-4 inline-block bg-gradient-to-r from-[#2d628c] to-[#1a4a6e] text-white text-sm font-medium px-6 py-2.5 rounded-full hover:shadow-[0_4px_16px_rgba(45,98,140,0.3)] transition-all">
              Generate First Scene
            </Link>
          </div>
        ) : (
          <div className="relative pl-10">
            {/* Vertical line */}
            <div className="absolute left-[31px] top-0 bottom-0 w-px bg-white/[0.08]" />

            {/* Character Created entry */}
            <div className="relative mb-6">
              <div className="absolute left-[-18px] top-2 w-3 h-3 rounded-full border-2 border-[#e8702a] bg-black" />
              <div className="flex gap-4 p-4 rounded-2xl border border-white/[0.12] bg-[rgba(10,10,10,0.75)]">
                <div className="w-16 h-16 rounded-xl bg-[#e8702a]/20 border border-[#e8702a]/30 flex items-center justify-center flex-shrink-0">
                  <span className="text-[20px] font-bold text-[#e8702a]">{character.name.charAt(0).toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">Character Created</p>
                  <p className="text-[11px] text-white/40 mt-1">{character.name}</p>
                  <p className="text-[11px] text-white/30 mt-0.5">{formatDate(character.createdAt)}</p>
                </div>
              </div>
            </div>

            {/* Generation entries */}
            {timeline.map((gen) => {
              const isClickable = gen.status === "COMPLETED" && !!imageUrls[gen.id];
              return (
                <div key={gen.id} className="relative mb-4">
                  <div className="absolute left-[-18px] top-5 w-3 h-3 rounded-full border-2 border-[#2d628c] bg-black" />
                  <div
                    onClick={() => isClickable && setSelected(gen)}
                    className={`flex gap-4 p-4 rounded-2xl border border-white/[0.12] bg-[rgba(10,10,10,0.75)] transition-all ${
                      isClickable ? "cursor-pointer hover:border-[#2d628c] hover:shadow-[0_0_16px_rgba(45,98,140,0.15)]" : ""
                    }`}
                  >
                    <div className="w-16 h-16 rounded-xl border border-white/[0.08] overflow-hidden bg-[#0a0a0a] flex-shrink-0">
                      {imageUrls[gen.id] ? (
                        <img src={imageUrls[gen.id]} alt={gen.prompt} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px] text-white/25">
                          {gen.status === "COMPLETED" ? "..." : gen.status === "PENDING" ? "⏳" : "✗"}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white line-clamp-2">{gen.prompt}</p>
                      {gen.status === "PENDING" && <p className="text-[11px] text-amber-400 mt-1">⏳ Pending</p>}
                      {gen.status === "FAILED" && <p className="text-[11px] text-red-400 mt-1">✗ Failed</p>}
                      <p className="text-[11px] text-white/30 mt-1">{formatDate(gen.createdAt)}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Image Lightbox */}
        {selected && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4" onClick={() => setSelected(null)}>
            <div className="relative max-w-2xl w-full rounded-2xl border border-white/[0.12] bg-[#0a0a0a] p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => setSelected(null)} className="absolute top-4 right-4 w-8 h-8 rounded-full border border-white/[0.12] flex items-center justify-center text-white/60 hover:text-white hover:border-white/30 transition-colors" aria-label="Close">✕</button>
              <div className="rounded-xl overflow-hidden border border-white/[0.08] mb-4">
                {imageUrls[selected.id] ? (
                  <img src={imageUrls[selected.id]} alt={selected.prompt} className="w-full max-h-[60vh] object-contain bg-black" />
                ) : (
                  <div className="w-full h-48 flex items-center justify-center text-white/30 text-sm">Image unavailable</div>
                )}
              </div>
              <div className="space-y-2">
                <p className="text-white font-medium text-sm">{selected.prompt}</p>
                <div className="flex flex-wrap gap-3 text-[11px] text-white/50">
                  {selected.aspectRatio && <span>Ratio: {selected.aspectRatio}</span>}
                  <span>{formatDate(selected.createdAt)}</span>
                </div>
              </div>
              {imageUrls[selected.id] && (
                <button onClick={handleDownload} className="mt-4 h-9 px-5 text-sm rounded-full bg-gradient-to-r from-[#2d628c] to-[#1a4a6e] text-white font-medium hover:shadow-[0_4px_16px_rgba(45,98,140,0.3)] transition-all">
                  Download Image
                </button>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
