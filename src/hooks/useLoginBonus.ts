import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const LOGIN_MILESTONES = [
  { days: 1, points: 5, label: "初回ログイン" },
  { days: 3, points: 10, label: "3日連続ログイン" },
  { days: 7, points: 30, label: "7日連続ログイン" },
  { days: 30, points: 100, label: "30日連続ログイン" },
  { days: 100, points: 500, label: "100日連続ログイン" },
];

export function useLoginBonus(userId: string | undefined) {
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    if (!userId) return;
    checkAndUpdateStreak(userId);
  }, [userId]);

  async function checkAndUpdateStreak(uid: string) {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    const { data: existing } = await supabase
      .from("login_streaks")
      .select("*")
      .eq("user_id", uid)
      .single();

    let currentStreak = 1;

    if (!existing) {
      // First ever login
      await supabase.from("login_streaks").insert({
        user_id: uid,
        current_streak: 1,
        last_login_date: todayStr,
        longest_streak: 1,
      });
      currentStreak = 1;
    } else {
      const lastLogin = existing.last_login_date as string;
      if (lastLogin === todayStr) {
        // Already logged in today
        setStreak(existing.current_streak as number);
        return;
      }

      // Check if yesterday
      const lastDate = new Date(lastLogin + "T00:00:00");
      const todayDate = new Date(todayStr + "T00:00:00");
      const diffDays = Math.round((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        currentStreak = (existing.current_streak as number) + 1;
      } else {
        currentStreak = 1; // streak broken
      }

      const longest = Math.max(existing.longest_streak as number, currentStreak);
      await supabase
        .from("login_streaks")
        .update({ current_streak: currentStreak, last_login_date: todayStr, longest_streak: longest })
        .eq("user_id", uid);
    }

    setStreak(currentStreak);

    // Check milestones
    const { data: claimed } = await supabase
      .from("login_bonus_claimed")
      .select("milestone")
      .eq("user_id", uid);

    const claimedMilestones = new Set((claimed || []).map((c: any) => c.milestone as number));

    for (const m of LOGIN_MILESTONES) {
      if (currentStreak >= m.days && !claimedMilestones.has(m.days)) {
        // Award points
        await supabase.from("points_history").insert({
          user_id: uid,
          description: `🎁 ${m.label}ボーナス`,
          points: m.points,
          type: "earn",
        });
        await supabase.from("login_bonus_claimed").insert({
          user_id: uid,
          milestone: m.days,
        });
        toast({
          title: `🎉 ${m.label}ボーナス！`,
          description: `+${m.points}ポイント獲得しました！（${currentStreak}日連続ログイン中）`,
        });
      }
    }
  }

  return { streak };
}

export { LOGIN_MILESTONES };
