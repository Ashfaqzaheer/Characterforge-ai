"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../lib/auth-context";
import { apiFetch } from "../../lib/api-client";
import { Navbar } from "../../components/navbar";

interface CharacterSummary { id: string; name: string; description: string; createdAt: string; }

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
        const [charsRes, creditsRes] = await Promise.all([apiFetch("/api/characters"), apiFetch("/api/credits")]);
        if (charsRes.ok) { const data = await charsRes.json(); setCharacters(data.characters ?? []); }
        if (creditsRes.ok) { const data = await creditsRes.json(); setCreditBalance(data.balance ?? 0); }
      } finally { setLoading(false); }
    }
    fetchData();
  }, [session, authLoading, router]);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true); setErrorMsg("");
    try {
      const res = await apiFetch(`/api/characters/${deleteTarget.id}`, { method: "DELETE" });
      if (res.ok) {
        setCharacters((prev) => prev.filter((c) => c.id !== deleteTarget.id));
        setDeleteTarget(null);
        setSuccessMsg("Character deleted successfully");
        setTimeout(() => setSuccessMsg(""), 3000);
      } else { const data = await res.json(); setErrorMsg(data.error?.message || "Failed to delete."); }
    } catch { setErrorMsg("Something went wrong."); }
    finally { setDeleting(false); }
  }

  if (authLoading || loading) {
    return (<><Navbar /><div className="flex flex-1 items-center justify-center"><p className="text-[var(--text-muted)]">Loading...</p></div></>);
  }

  return (
    <>
      <Navbar />
      <main className="max-w-6xl mx-auto px-6 py-10 w-full animate-in">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-[50px] font-bold text-white leading-tight">Dashboard</h1>
            <p className="text-[var(--text-secondary)] text-sm mt-1">Manage your characters and generations</p>
          </div>
          <div className="flex items-center gap-5">
            <div className="glass-card px-4 py-2 text-sm">
              <span className="text-[var(--text-muted)]">Credits:</span>{" "}
              <span className="font-semibold text-white">{creditBalance}</span>
            </div>
            <Link href="/characters/new" className="btn-primary">
              New Character
            </Link>
          </div>
        </div>

        {successMsg && (
          <div className="mb-6 p-3 text-sm text-green-400 bg-green-900/20 border border-green-800/30 rounded-[var(--radius-md)] animate-in">
            {successMsg}
          </div>
        )}

        {characters.length === 0 ? (
          <div className="text-center py-24 depth-card">
            <p className="text-[var(--text-muted)] mb-4 text-lg">No characters yet</p>
            <Link href="/characters/new" className="btn-primary">
              Create your first character
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {characters.map((char) => (
              <div key={char.id} className="depth-card p-5 relative group">
                <Link href={`/characters/${char.id}`} className="block">
                  <h3 className="font-semibold text-white mb-2 truncate pr-24 text-[16px]">{char.name}</h3>
                  <p className="text-sm text-[var(--text-secondary)] line-clamp-2 leading-relaxed">{char.description}</p>
                </Link>
                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Link
                    href={`/characters/${char.id}/edit`}
                    onClick={(e) => e.stopPropagation()}
                    className="px-2 py-1 text-xs rounded-[var(--radius-full)] border border-white/[0.12] text-[#81a0bb] hover:border-[#2d628c] hover:text-white transition-all"
                  >
                    Edit
                  </Link>
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); setDeleteTarget(char); }}
                    className="px-2 py-1 text-xs rounded-[var(--radius-full)] border border-red-800/40 text-red-400 hover:bg-red-900/30 hover:border-red-600 transition-all"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="depth-card p-8 max-w-sm w-full animate-in">
              <h2 className="text-lg font-semibold text-white mb-3">Delete this character?</h2>
              <p className="text-sm text-[var(--text-secondary)] mb-6 leading-relaxed">
                This will permanently remove the character, reference images, and generation history.
              </p>
              {errorMsg && (
                <div className="mb-4 p-2 text-xs text-red-400 bg-red-900/20 border border-red-800/30 rounded-[var(--radius-sm)]">{errorMsg}</div>
              )}
              <div className="flex gap-3 justify-end">
                <button onClick={() => { setDeleteTarget(null); setErrorMsg(""); }} disabled={deleting} className="btn-secondary text-sm">Cancel</button>
                <button onClick={handleDelete} disabled={deleting}
                  className="px-5 py-2 text-sm rounded-[var(--radius-full)] bg-red-600 text-white hover:bg-red-500 disabled:opacity-50 transition-colors">
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
