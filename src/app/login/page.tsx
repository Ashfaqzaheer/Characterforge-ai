"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSupabaseBrowser } from "../../lib/supabase-browser";
import { Navbar } from "../../components/navbar";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { error: signInError } = await getSupabaseBrowser().auth.signInWithPassword({ email, password });
      if (signInError) { setError("Invalid email or password."); return; }
      router.push("/dashboard");
    } catch { setError("Invalid email or password."); }
    finally { setLoading(false); }
  }

  return (
    <>
      <Navbar />
      <main className="flex-1 flex items-center justify-center px-6 py-16 relative glow-accent">
        <div className="w-full max-w-sm animate-in">
          <div className="depth-card p-8">
            <div className="text-center mb-8">
              <h1 className="text-[24px] font-bold text-white">Welcome back</h1>
              <p className="text-sm text-[var(--text-muted)] mt-2">Sign in to CharacterForge AI</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div role="alert" className="p-3 text-sm text-red-400 bg-red-900/20 border border-red-800/30 rounded-[var(--radius-md)]">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-xs font-medium text-[var(--text-secondary)] mb-2 uppercase tracking-wider">Email</label>
                <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  className="input-field" placeholder="you@example.com" />
              </div>

              <div>
                <label htmlFor="password" className="block text-xs font-medium text-[var(--text-secondary)] mb-2 uppercase tracking-wider">Password</label>
                <input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                  className="input-field" placeholder="••••••••" />
                <div className="mt-2 text-right">
                  <Link href="/forgot-password" className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors">
                    Forgot password?
                  </Link>
                </div>
              </div>

              <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
                {loading ? "Signing in..." : "Sign in"}
              </button>
            </form>

            <p className="text-center text-sm text-[var(--text-muted)] mt-6">
              No account?{" "}
              <Link href="/register" className="text-[var(--text-secondary)] hover:text-white transition-colors">
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </main>
    </>
  );
}
