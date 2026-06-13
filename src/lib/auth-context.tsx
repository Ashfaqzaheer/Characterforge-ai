"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { getSupabaseBrowser } from "./supabase-browser";
import type { Session } from "@supabase/supabase-js";

interface AuthContextValue {
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  session: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let subscription: { unsubscribe: () => void } | undefined;

    try {
      const supabase = getSupabaseBrowser();

      supabase.auth.getSession().then(({ data: { session: s } }) => {
        setSession(s);
        setLoading(false);
      });

      const {
        data: { subscription: sub },
      } = supabase.auth.onAuthStateChange((_event, s) => {
        setSession(s);
        if (_event === "TOKEN_REFRESHED" || _event === "SIGNED_IN") {
          setLoading(false);
        }
        if (_event === "SIGNED_OUT") {
          setSession(null);
        }
      });

      subscription = sub;
    } catch {
      // Env vars not available (build time)
      setLoading(false);
    }

    return () => subscription?.unsubscribe();
  }, []);

  const signOut = useCallback(async () => {
    try {
      const supabase = getSupabaseBrowser();
      await supabase.auth.signOut();
    } catch {
      // ignore
    }
    setSession(null);
  }, []);

  return (
    <AuthContext.Provider value={{ session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
