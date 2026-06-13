"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../lib/auth-context";
import { apiFetch } from "../../lib/api-client";
import { Navbar } from "../../components/navbar";

interface CharacterSummary {
  id: string;
  name: string;
  description: string;
  createdAt: string;
}

export default function DashboardPage() {
  const { session, loading: authLoading } = useAuth();
  const router = useRouter();
  const [characters, setCharacters] = useState<CharacterSummary[]>([]);
  const [creditBalance, setCreditBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<CharacterSummary | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!session) { router.push("/login"); return; }

    async function fetchData() {
      try {
        const [charsRes, creditsRes] = await Promise.all([
          apiFetch("/api/characters"),
          apiFetch("/api/credits"),
        ]);
        if (charsRes.ok) { const data = await charsRes.json(); setCharacters(data.characters ?? []); }
        if (creditsRes.ok) { const data = await creditsRes.json(); setCreditBalance(data.balance ?? 0); }
      } finally { setLoading(false); }
    }
    fetchData();
  }, [session, authLoading, router]);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setErrorMsg("");
    try {
      const res = await apiFetch(`/api/characters/${deleteTarget.id}`, { method: "DELETE" });
      if (res.ok) {
        setCharacters((prev) => prev.filter((c) => c.id !== deleteTarget.id));
        setDeleteTarget(null);
        setSuccessMsg("Character deleted successfully");
        setTimeout(() => setSuccessMsg(""), 3000);
      } else {
        const data = await res.json();
        setErrorMsg(data.error?.message || "Failed to delete character.");
      }
    } catch {
      setErrorMsg("Something went wrong. Please try again.");
    } finally {
      setDeleting(false);
    }
  }

  if (authLoading || loading) {
    return (<><Navbar /><div className="flex flex-1 items-center justify-center"><p className="text-zinc-500">Loading...</p></div></>);
  }

  return (
    <>
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-8 w-full">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              Credits: <span className="font-semibold text-foreground">{creditBalance}</span>
            </span>
            <Link href="/characters/new"
              className="inline-flex h-9 items-center rounded-lg bg-foreground px-4 text-background text-sm font-medium hover:opacity-90">
              New Character
            </Link>
          </div>
        </div>

        {/* Success message */}
        {successMsg && (
          <div className="mb-4 p-3 text-sm text-green-700 bg-green-50 dark:bg-green-900/20 dark:text-green-400 rounded-lg">
            {successMsg}
          </div>
        )}

        {characters.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg">
            <p className="text-zinc-500 mb-4">No characters yet</p>
            <Link href="/characters/new"
              className="inline-flex h-9 items-center rounded-lg bg-foreground px-4 text-background text-sm font-medium hover:opacity-90">
              Create your first character
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {characters.map((char) => (
              <div key={char.id} className="relative p-4 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors">
                <Link href={`/characters/${char.id}`} className="block">
                  <h3 className="font-semibold mb-1 truncate pr-16">{char.name}</h3>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2">{char.description}</p>
                </Link>
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); setDeleteTarget(char); }}
                  className="absolute top-3 right-3 px-2 py-1 text-xs rounded border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 max-w-sm w-full shadow-xl border border-zinc-200 dark:border-zinc-800">
              <h2 className="text-lg font-semibold mb-2">Delete this character?</h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6">
                This will permanently remove the character, reference images, and generation history.
              </p>
              {errorMsg && (
                <div className="mb-4 p-2 text-xs text-red-700 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded">
                  {errorMsg}
                </div>
              )}
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => { setDeleteTarget(null); setErrorMsg(""); }}
                  disabled={deleting}
                  className="px-4 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {deleting ? "Deleting..." : "Delete Character"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
