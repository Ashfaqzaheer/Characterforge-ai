"use client";

import Link from "next/link";
import { useAuth } from "../lib/auth-context";

export function Navbar() {
  const { session, signOut } = useAuth();

  return (
    <nav className="sticky top-0 z-50 border-b border-[var(--border-default)] backdrop-blur-xl bg-[rgba(0,0,0,0.8)]">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="text-lg font-semibold tracking-tight text-white hover:text-[var(--text-secondary)] transition-colors duration-[var(--motion-fast)]">
          CharacterForge
        </Link>

        <div className="flex items-center gap-6">
          {session ? (
            <>
              <Link href="/dashboard" className="text-sm text-[var(--text-secondary)] hover:text-white transition-colors duration-[var(--motion-instant)]">
                Dashboard
              </Link>
              <Link href="/history" className="text-sm text-[var(--text-secondary)] hover:text-white transition-colors duration-[var(--motion-instant)]">
                History
              </Link>
              <button
                onClick={signOut}
                className="text-sm text-[var(--text-muted)] hover:text-white transition-colors duration-[var(--motion-instant)]"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm text-[var(--text-secondary)] hover:text-white transition-colors duration-[var(--motion-instant)]">
                Sign in
              </Link>
              <Link href="/register" className="btn-primary text-xs py-2 px-5">
                Get Started
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
