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

  // H-8: email 確認後の初回ログイン時に紹介紐付けを自動実行
  // signUp 時の RPC は session 未確立で no_session になるため、
  // 確認完了後の初回 onAuthStateChange を捕まえて RPC を起動する。
  // referral_processed_at で idempotency 保証 (再ログインで重複処理しない)。
  useEffect(() => {
    if (loading) return;
    const user = session?.user;
    if (!user) return;
    const refCode = (user.user_metadata as Record<string, unknown> | undefined)
      ?.referral_code;
    if (!refCode || typeof refCode !== "string") return;

    void (async () => {
      // 既処理チェック
      const { data: profile } = await supabase
        .from("profiles")
        .select("referral_processed_at")
        .eq("user_id", user.id)
        .maybeSingle();
      if ((profile as { referral_processed_at?: string | null } | null)?.referral_processed_at) {
        return;
      }

      // RPC 呼出 (idempotent、no_session/already_granted/not_found 等は silent)
      const { error } = await supabase.rpc(
        "apply_referral_signup_bonus",
        { p_referral_code: refCode }
      );
      if (error) {
        console.error("[referral-auto-link] RPC error:", error);
        return; // フラグセットしない → 次ログイン時に再試行
      }

      // 結果に関わらず processed フラグセット (再試行ループ防止、idempotency 保証)
      await supabase
        .from("profiles")
        .update({ referral_processed_at: new Date().toISOString() } as never)
        .eq("user_id", user.id);
    })();
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
