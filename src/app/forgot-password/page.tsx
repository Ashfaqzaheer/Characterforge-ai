"use client";

import { useState } from "react";
import Link from "next/link";
import { getSupabaseBrowser } from "../../lib/supabase-browser";
import { Navbar } from "../../components/navbar";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { error: resetError } = await getSupabaseBrowser().auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (resetError) {
        console.error("[forgot-password]", resetError.message);
      }

      // Always show success message regardless of whether email exists (security)
      setSubmitted(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Navbar />
      <main className="flex-1 flex items-center justify-center px-6 py-16 relative glow-accent">
        <div className="w-full max-w-sm animate-in">
          <div className="depth-card p-8">
            <div className="text-center mb-8">
              <h1 className="text-[24px] font-bold text-white">Reset password</h1>
              <p className="text-sm text-[var(--text-muted)] mt-2">
                Enter your email to receive a reset link
              </p>
            </div>

            {submitted ? (
              <div className="space-y-4">
                <div className="p-4 text-sm text-green-400 bg-green-900/20 border border-green-800/30 rounded-[var(--radius-md)]">
                  If an account exists with this email, a password reset link has been sent.
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
                    <input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="input-field"
                      placeholder="you@example.com"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary w-full mt-2"
                  >
                    {loading ? "Sending..." : "Send reset link"}
                  </button>
                </form>

                <p className="text-center text-sm text-[var(--text-muted)] mt-6">
                  <Link href="/login" className="text-[var(--text-secondary)] hover:text-white transition-colors">
                    Back to sign in
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
