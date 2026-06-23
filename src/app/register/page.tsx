"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Navbar } from "../../components/navbar";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailConfirmationRequired, setEmailConfirmationRequired] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error?.message || "Registration failed."); return; }
      if (data.session?.access_token) {
        const { getSupabaseBrowser } = await import("../../lib/supabase-browser");
        await getSupabaseBrowser().auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
        router.push("/dashboard");
      } else {
        // Email confirmation required — show info panel instead of redirecting
        setEmailConfirmationRequired(true);
      }
    } catch { setError("Registration failed. Please try again."); }
    finally { setLoading(false); }
  }

  return (
    <>
      <Navbar />
      <main className="flex-1 flex items-center justify-center px-6 py-16 relative glow-accent">
        <div className="w-full max-w-sm animate-in">
          <div className="depth-card p-8">
            <div className="text-center mb-8">
              <h1 className="text-[24px] font-bold text-white">Create account</h1>
              <p className="text-sm text-[var(--text-muted)] mt-2">Start generating consistent characters</p>
            </div>

            {emailConfirmationRequired ? (
              <div className="space-y-4">
                <div role="alert" className="p-4 text-sm text-blue-400 bg-blue-900/20 border border-blue-800/30 rounded-[var(--radius-md)]">
                  Account created! Please check your email to confirm your address before signing in.
                </div>
                <p className="text-center text-sm text-[var(--text-muted)]">
                  <Link href="/login" className="text-[var(--text-secondary)] hover:text-white transition-colors">
                    Back to sign in
                  </Link>
                </p>
              </div>
            ) : (
              <>
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
                    <input id="password" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)}
                      className="input-field" placeholder="Min. 8 characters" />
                  </div>

                  <button type="submit" disabled={loading} className="btn-primary w-full">
                    {loading ? "Creating account..." : "Create account"}
                  </button>
                </form>

                <p className="text-center text-sm text-[var(--text-muted)] mt-6">
                  Already have an account?{" "}
                  <Link href="/login" className="text-[var(--text-secondary)] hover:text-white transition-colors">
                    Sign in
                  </Link>
                </p>
              </>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
