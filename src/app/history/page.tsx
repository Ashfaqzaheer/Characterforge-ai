"use client";

import { useEffect, useState } from "react";
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
  character: {
    name: string;
  };
}

export default function HistoryPage() {
  const { session, loading: authLoading } = useAuth();
  const router = useRouter();
  const [generations, setGenerations] = useState<HistoryItem[]>([]);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!session) {
      router.push("/login");
      return;
    }

    async function fetchHistory() {
      setLoading(true);
      try {
        const res = await apiFetch(`/api/generations?page=${page}&pageSize=20`);
        if (!res.ok) return;

        const data = await res.json();
        setGenerations(data.generations ?? []);
        setTotalPages(data.totalPages ?? 1);

        // Fetch image URLs
        const urls: Record<string, string> = {};
        for (const gen of data.generations ?? []) {
          if (gen.imageKey) {
            const urlRes = await apiFetch(`/api/images/${gen.imageKey}`);
            if (urlRes.ok) {
              const urlData = await urlRes.json();
              urls[gen.id] = urlData.url;
            }
          }
        }
        setImageUrls(urls);
      } finally {
        setLoading(false);
      }
    }

    fetchHistory();
  }, [session, authLoading, router, page]);

  if (authLoading || loading) {
    return (
      <>
        <Navbar />
        <div className="flex flex-1 items-center justify-center">
          <p className="text-zinc-500">Loading...</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-8 w-full">
        <h1 className="text-2xl font-bold mb-6">Generation History</h1>

        {generations.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg">
            <p className="text-zinc-500">No generations yet</p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {generations.map((gen) => (
                <div
                  key={gen.id}
                  className="flex gap-4 p-4 border border-zinc-200 dark:border-zinc-800 rounded-lg"
                >
                  {/* Thumbnail */}
                  <div className="w-20 h-20 rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-zinc-100 dark:bg-zinc-900 flex-shrink-0">
                    {imageUrls[gen.id] ? (
                      <img
                        src={imageUrls[gen.id]}
                        alt={`Generated: ${gen.prompt}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-zinc-400">
                        {gen.status === "COMPLETED" ? "..." : gen.status}
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{gen.prompt}</p>
                    <p className="text-xs text-zinc-500 mt-1">
                      Character: {gen.character?.name ?? "Unknown"}
                    </p>
                    {gen.aspectRatio && (
                      <p className="text-xs text-zinc-500">
                        Aspect Ratio: {gen.aspectRatio}
                      </p>
                    )}
                    <p className="text-xs text-zinc-500">
                      {new Date(gen.createdAt).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 mt-8">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="h-9 px-4 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 disabled:opacity-50 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  Previous
                </button>
                <span className="text-sm text-zinc-600 dark:text-zinc-400">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="h-9 px-4 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 disabled:opacity-50 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </>
  );
}
