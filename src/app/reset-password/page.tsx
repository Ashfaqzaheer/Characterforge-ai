"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSupabaseBrowser } from "../../lib/supabase-browser";
import { Navbar } from "../../components/navbar";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionError, setSessionError] = useState(false);

  useEffect(() => {
    // Supabase will automatically exchange the token from the URL hash
    const supabase = getSupabaseBrowser();
    supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setSessionReady(true);
      }
    });

    // Check if we already have a session (token already exchanged)
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setSessionReady(true);
      } else {
        // Give Supabase a moment to process the hash
        setTimeout(() => {
          supabase.auth.getSession().then(({ data: d }) => {
            if (d.session) setSessionReady(true);
            else setSessionError(true);
          });
        }, 2000);
      }
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } = await getSupabaseBrowser().auth.updateUser({
        password,
      });

      if (updateError) {
        if (updateError.message.includes("expired")) {
          setError("Reset link has expired. Please request a new one.");
        } else if (updateError.message.includes("weak")) {
          setError("Password is too weak. Please choose a stronger password.");
        } else {
          setError("Failed to update password. Please try again.");
        }
        return;
      }

      setSuccess(true);
      setTimeout(() => router.push("/login"), 2000);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (sessionError) {
    return (
      <>
        <Navbar />
        <main className="flex-1 flex items-center justify-center px-6 py-16 relative glow-accent">
          <div className="w-full max-w-sm animate-in">
            <div className="depth-card p-8 text-center">
              <h1 className="text-[24px] font-bold text-white">Invalid or expired link</h1>
              <p className="text-sm text-[var(--text-muted)] mt-2">
                This password reset link is invalid or has expired.
              </p>
              <Link href="/forgot-password" className="btn-primary inline-block mt-6">
                Request a new link
              </Link>
            </div>
          </div>
        </main>
      </>
    );
  }

  if (!sessionReady) {
    return (
      <>
        <Navbar />
        <div className="flex flex-1 items-center justify-center px-4">
          <p className="text-[var(--text-muted)]">Verifying reset link...</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="flex-1 flex items-center justify-center px-6 py-16 relative glow-accent">
        <div className="w-full max-w-sm animate-in">
          <div className="depth-card p-8">
            <div className="text-center mb-8">
              <h1 className="text-[24px] font-bold text-white">Set new password</h1>
              <p className="text-sm text-[var(--text-muted)] mt-2">
                Enter your new password below
              </p>
            </div>

            {success ? (
              <div className="space-y-4">
                <div className="p-4 text-sm text-green-400 bg-green-900/20 border border-green-800/30 rounded-[var(--radius-md)]">
                  Password updated successfully. Redirecting to sign in...
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <div role="alert" className="p-3 text-sm text-red-400 bg-red-900/20 border border-red-800/30 rounded-[var(--radius-md)]">
                    {error}
                  </div>
                )}

                <div>
                  <label htmlFor="password" className="block text-xs font-medium text-[var(--text-secondary)] mb-2 uppercase tracking-wider">New Password</label>
                  <input
                    id="password"
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-field"
                    placeholder="••••••••"
                  />
                  <p className="text-xs text-[var(--text-muted)] mt-1">Minimum 8 characters</p>
                </div>

                <div>
                  <label htmlFor="confirm" className="block text-xs font-medium text-[var(--text-secondary)] mb-2 uppercase tracking-wider">Confirm Password</label>
                  <input
                    id="confirm"
                    type="password"
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="input-field"
                    placeholder="••••••••"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full mt-2"
                >
                  {loading ? "Updating..." : "Update password"}
                </button>
              </form>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
