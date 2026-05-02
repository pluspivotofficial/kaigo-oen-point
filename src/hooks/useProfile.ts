import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useProfile = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();
      return data;
    },
    enabled: !!user,
  });
};

export const useTotalPoints = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["totalPoints", user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { data } = await supabase
        .from("points_history")
        .select("points")
        .eq("user_id", user.id);
      return data ? data.reduce((sum, r) => sum + r.points, 0) : 0;
    },
    enabled: !!user,
  });
};

/**
 * total / earned / used を一括取得 (Dashboard ヒーローのミニ統計用)
 * earned: points > 0 の合計、used: points < 0 の絶対値合計
 */
export const useUserPointStats = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["userPointStats", user?.id],
    queryFn: async () => {
      if (!user) return { total: 0, earned: 0, used: 0 };
      const { data } = await supabase
        .from("points_history")
        .select("points")
        .eq("user_id", user.id);
      let total = 0;
      let earned = 0;
      let used = 0;
      (data ?? []).forEach((r) => {
        total += r.points;
        if (r.points > 0) earned += r.points;
        else if (r.points < 0) used += Math.abs(r.points);
      });
      return { total, earned, used };
    },
    enabled: !!user,
  });
};

export const useMonthlyPoints = () => {
  const { user } = useAuth();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  return useQuery({
    queryKey: ["monthlyPoints", user?.id, monthStart],
    queryFn: async () => {
      if (!user) return 0;
      const { data } = await supabase
        .from("points_history")
        .select("points")
        .eq("user_id", user.id)
        .gte("created_at", monthStart);
      return data ? data.reduce((sum, r) => sum + r.points, 0) : 0;
    },
    enabled: !!user,
  });
};

export const useIsAdmin = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["isAdmin", user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      return data?.some((r: any) => r.role === "admin") ?? false;
    },
    enabled: !!user,
  });
};
