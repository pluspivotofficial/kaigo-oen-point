import { createContext, useContext, useEffect, useState } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  isAdmin: boolean;
  isAdminLoading: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  isAdmin: false,
  isAdminLoading: true,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAdminLoading, setIsAdminLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // is_admin の取得は session loading 完了後にのみ行う
  // (これより前に走るとレース条件で isAdminLoading が誤って false になり、
  //  ProtectedAdminRoute が user 確定前に !isAdmin で / にリダイレクトしてしまう)
  useEffect(() => {
    if (loading) return;

    const userId = session?.user?.id;
    if (!userId) {
      setIsAdmin(false);
      setIsAdminLoading(false);
      return;
    }

    setIsAdminLoading(true);
    supabase
      .rpc("is_admin", { _user_id: userId })
      .then(({ data, error }) => {
        setIsAdmin(data === true && !error);
        setIsAdminLoading(false);
      });
  }, [session?.user?.id, loading]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        isAdmin,
        isAdminLoading,
        loading,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
