import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "super_admin" | "admin" | "moderator" | "buyer";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  roles: AppRole[];
  isAdmin: boolean;           // admin or super_admin
  isSuperAdmin: boolean;
  isModerator: boolean;       // moderator, admin, or super_admin
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  roles: [],
  isAdmin: false,
  isSuperAdmin: false,
  isModerator: false,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<AppRole[]>([]);

  useEffect(() => {
    let latestEvent = 0;

    // Also fires once on subscribe with the stored session (INITIAL_SESSION).
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const event = ++latestEvent;
      setSession(session);
      setUser(session?.user ?? null);

      // Supabase calls made inside this callback can deadlock the auth client, so load roles afterwards.
      // `loading` stays true until the first roles arrive, so pages never mistake an admin for a regular user.
      setTimeout(async () => {
        const { data } = session?.user
          ? await supabase.from("user_roles").select("role").eq("user_id", session.user.id)
          : { data: [] };
        if (event !== latestEvent) return; // a newer sign-in or sign-out has taken over
        setRoles((data ?? []).map((r) => r.role as AppRole));
        setLoading(false);
      }, 0);
    });

    return () => subscription.unsubscribe();
  }, []);

  const isSuperAdmin = roles.includes("super_admin");
  const isAdmin = isSuperAdmin || roles.includes("admin");
  const isModerator = isAdmin || roles.includes("moderator");

  const signOut = async () => {
    await supabase.auth.signOut();
    setRoles([]);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, roles, isAdmin, isSuperAdmin, isModerator, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
