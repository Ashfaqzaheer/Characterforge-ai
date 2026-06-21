"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../lib/auth-context";
import { apiFetch } from "../../lib/api-client";
import { Navbar } from "../../components/navbar";

interface HistoryItem {
  id: string;
  prompt: string;
  imageKey: string | null;
  aspectRatio: string | null;
  status: string;
  createdAt: string;
  character: { name: string };
}

export default function HistoryPage() {
  const { session, loading: authLoading } = useAuth();
  const router = useRouter();
  const [generations, setGenerations] = useState<HistoryItem[]>([]);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<HistoryItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<HistoryItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!session) { router.push("/login"); return; }
    async function fetchHistory() {
      setLoading(true);
      try {
        const res = await apiFetch(`/api/generations?page=${page}&pageSize=20`);
        if (!res.ok) return;
        const data = await res.json();
        setGenerations(data.generations ?? []);
        setTotalPages(data.totalPages ?? 1);
        const urls: Record<string, string> = {};
        for (const gen of data.generations ?? []) {
          if (gen.imageKey) {
            const urlRes = await apiFetch(`/api/images/${gen.imageKey}`);
            if (urlRes.ok) { const urlData = await urlRes.json(); urls[gen.id] = urlData.url; }
          }
        }
        setImageUrls(urls);
      } finally { setLoading(false); }
    }
    fetchHistory();
  }, [session, authLoading, router, page]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") { setSelected(null); setDeleteTarget(null); }
  }, []);

  useEffect(() => {
    if (selected || deleteTarget) document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [selected, deleteTarget, handleKeyDown]);

  function showToast(type: "success" | "error", message: string) {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await apiFetch(`/api/generations/${deleteTarget.id}`, { method: "DELETE" });
      if (res.ok) {
        setGenerations((prev) => prev.filter((g) => g.id !== deleteTarget.id));
        setDeleteTarget(null);
        showToast("success", "Image deleted from history.");
      } else {
        showToast("error", "Failed to delete image. Please try again.");
      }
    } catch {
      showToast("error", "Failed to delete image. Please try again.");
    } finally { setDeleting(false); }
  }

  function handleDownload() {
    if (!selected || !imageUrls[selected.id]) return;
    const link = document.createElement("a");
    link.href = imageUrls[selected.id];
    link.download = `characterforge-${selected.id}.png`;
    link.click();
  }

  if (authLoading || loading) {
    return (<><Navbar /><div className="flex flex-1 items-center justify-center min-h-screen"><p className="text-white/40">Loading...</p></div></>);
  }

  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      <main className="max-w-4xl mx-auto px-5 py-10 animate-in">
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

        <h1 className="text-[28px] font-bold text-white mb-8">Generation History</h1>

        {/* Toast */}
        {toast && (
          <div className={`fixed top-20 right-5 z-[300] px-4 py-3 rounded-xl text-sm font-medium shadow-lg animate-in ${
            toast.type === "success" ? "bg-green-900/80 text-green-300 border border-green-700/40" : "bg-red-900/80 text-red-300 border border-red-700/40"
          }`}>
            {toast.message}
          </div>
        )}

        {generations.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-white/[0.12] rounded-2xl">
            <p className="text-white/40">No generations yet</p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {generations.map((gen) => {
                const isClickable = gen.status === "COMPLETED" && !!imageUrls[gen.id];
                return (
                  <div
                    key={gen.id}
                    onClick={() => isClickable && setSelected(gen)}
                    className={`flex gap-4 p-4 rounded-2xl border border-white/[0.12] bg-[rgba(10,10,10,0.75)] transition-all group ${
                      isClickable ? "cursor-pointer hover:border-[#2d628c] hover:shadow-[0_0_16px_rgba(45,98,140,0.15)]" : ""
                    }`}
                  >
                    <div className="w-16 h-16 rounded-xl border border-white/[0.08] overflow-hidden bg-[#0a0a0a] flex-shrink-0">
                      {imageUrls[gen.id] ? (
                        <img src={imageUrls[gen.id]} alt={gen.prompt} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px] text-white/25">
                          {gen.status === "COMPLETED" ? "..." : gen.status}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{gen.prompt}</p>
                      <p className="text-[11px] text-white/40 mt-1">Character: {gen.character?.name ?? "Unknown"}</p>
                      {gen.aspectRatio && <p className="text-[11px] text-white/40">Ratio: {gen.aspectRatio}</p>}
                      <p className="text-[11px] text-white/30">
                        {new Date(gen.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    {/* Delete button */}
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteTarget(gen); }}
                      className="self-center p-2 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-900/20 transition-all opacity-0 group-hover:opacity-100"
                      aria-label="Delete"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" />
                      </svg>
                    </button>
                  </div>
                );
              })}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 mt-10">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                  className="h-9 px-5 text-sm rounded-full border border-white/[0.12] text-white/60 disabled:opacity-30 hover:border-white/30 transition-colors">Previous</button>
                <span className="text-sm text-white/40">Page {page} of {totalPages}</span>
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="h-9 px-5 text-sm rounded-full border border-white/[0.12] text-white/60 disabled:opacity-30 hover:border-white/30 transition-colors">Next</button>
              </div>
            )}
          </>
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
                  <span>Character: {selected.character?.name}</span>
                  {selected.aspectRatio && <span>Ratio: {selected.aspectRatio}</span>}
                  <span>{new Date(selected.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
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

        {/* Delete Confirmation Modal */}
        {deleteTarget && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setDeleteTarget(null)}>
            <div className="max-w-sm w-full rounded-2xl border border-white/[0.12] bg-[#0a0a0a] p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-lg font-semibold text-white mb-2">Delete this image from history?</h2>
              <p className="text-sm text-white/50 mb-6">This will permanently remove this generation record.</p>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setDeleteTarget(null)} disabled={deleting}
                  className="px-4 py-2 text-sm rounded-full border border-white/[0.12] text-white/60 hover:border-white/30 transition-colors disabled:opacity-50">Cancel</button>
                <button onClick={handleDelete} disabled={deleting}
                  className="px-4 py-2 text-sm rounded-full bg-red-600 text-white hover:bg-red-500 transition-colors disabled:opacity-50">
                  {deleting ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
