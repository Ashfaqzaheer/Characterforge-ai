"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../lib/auth-context";

export function Navbar() {
  const { session, signOut } = useAuth();
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.push("/login");
  }

  if (!session) return null;

  return (
    <nav className="border-b border-zinc-200 dark:border-zinc-800 px-4 py-3">
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="font-semibold text-lg">
            CharacterForge
          </Link>
          <div className="flex gap-4 text-sm">
            <Link
              href="/dashboard"
              className="text-zinc-600 dark:text-zinc-400 hover:text-foreground"
            >
              Dashboard
            </Link>
            <Link
              href="/history"
              className="text-zinc-600 dark:text-zinc-400 hover:text-foreground"
            >
              History
            </Link>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-foreground"
        >
          Sign out
        </button>
      </div>
    </nav>
  );
}
