"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSupabaseBrowser } from "../../lib/supabase-browser";

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
      <div className="flex flex-1 items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-6 text-center">
          <h1 className="text-2xl font-bold">Invalid or expired link</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            This password reset link is invalid or has expired.
          </p>
          <Link href="/forgot-password" className="inline-flex h-9 items-center rounded-lg bg-foreground px-4 text-background text-sm font-medium hover:opacity-90">
            Request a new link
          </Link>
        </div>
      </div>
    );
  }

  if (!sessionReady) {
    return (
      <div className="flex flex-1 items-center justify-center px-4">
        <p className="text-zinc-500">Verifying reset link...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Set new password</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
            Enter your new password below
          </p>
        </div>

        {success ? (
          <div className="space-y-4">
            <div className="p-4 text-sm text-green-700 bg-green-50 dark:bg-green-900/20 dark:text-green-400 rounded-lg">
              Password updated successfully. Redirecting to sign in...
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div role="alert" className="p-3 text-sm text-red-700 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-lg">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-1">New Password</label>
              <input
                id="password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
                placeholder="••••••••"
              />
              <p className="text-xs text-zinc-500 mt-1">Minimum 8 characters</p>
            </div>

            <div>
              <label htmlFor="confirm" className="block text-sm font-medium mb-1">Confirm Password</label>
              <input
                id="confirm"
                type="password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-10 rounded-lg bg-foreground text-background font-medium text-sm transition-colors hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "Updating..." : "Update password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
