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
