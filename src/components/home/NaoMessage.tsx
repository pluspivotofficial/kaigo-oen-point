import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile, useTotalPoints } from "@/hooks/useProfile";
import {
  getMessageById,
  pickRandomMessageByCategory,
  renderMessage,
  type MessageCategory,
  type NaoMessage,
} from "@/lib/naoMessages";

// 当日の YYYY-MM-DD 文字列 (ローカル時刻基準)
const todayDateStr = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// 当日 00:00 (ISO, ローカル) — Supabase クエリ用
const todayStartIso = (): string => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
};

const cacheKey = (userId: string, date: string): string =>
  `nao:msg:${userId}:${date}`;
const lastSeenKey = (userId: string): string => `nao:lastSeen:${userId}`;

interface NaoContext {
  hasBadgeToday: boolean;
  hasShiftToday: boolean;
  pointMilestone: 100 | 500 | 1000 | 5000 | null;
  streakIs30: boolean;
  streakIs7: boolean;
  daysSinceLastSeen: number;
  isNewUser: boolean;
  hourOfDay: number;
}

// 優先度順にカテゴリを確定
const determineCategory = (ctx: NaoContext): MessageCategory => {
  if (ctx.hasBadgeToday) return "badge_earned";
  if (ctx.hasShiftToday) return "shift_added";
  if (ctx.pointMilestone === 5000) return "milestone_5000";
  if (ctx.pointMilestone === 1000) return "milestone_1000";
  if (ctx.pointMilestone === 500) return "milestone_500";
  if (ctx.pointMilestone === 100) return "milestone_100";
  if (ctx.streakIs30) return "streak_30";
  if (ctx.streakIs7) return "streak_7";
  if (ctx.daysSinceLastSeen >= 7) return "absent_7";
  if (ctx.daysSinceLastSeen >= 3) return "absent_3";
  if (ctx.isNewUser) return "new_user";
  if (ctx.hourOfDay >= 5 && ctx.hourOfDay < 10) return "morning";
  if (ctx.hourOfDay >= 10 && ctx.hourOfDay < 17) return "daytime";
  if (ctx.hourOfDay >= 17 && ctx.hourOfDay < 21) return "evening";
  return "night";
};

const NaoMessage = () => {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { data: totalPoints = 0 } = useTotalPoints();
  const [message, setMessage] = useState<NaoMessage | null>(null);

  const today = todayDateStr();
  const todayIsoStart = todayStartIso();

  // 当日の各シグナル取得
  const { data: hasBadgeToday = false } = useQuery({
    queryKey: ["nao.badgeToday", user?.id, today],
    queryFn: async () => {
      if (!user) return false;
      const { count } = await supabase
        .from("user_achievements")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("unlocked_at", todayIsoStart);
      return (count ?? 0) > 0;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const { data: hasShiftToday = false } = useQuery({
    queryKey: ["nao.shiftToday", user?.id, today],
    queryFn: async () => {
      if (!user) return false;
      const { count } = await supabase
        .from("shifts")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", todayIsoStart);
      return (count ?? 0) > 0;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  // ポイント節目: 当日の earn 合計を引いた前日値と totalPoints の差で節目跨ぎを判定
  const { data: pointMilestone = null } = useQuery({
    queryKey: ["nao.milestone", user?.id, today, totalPoints],
    queryFn: async () => {
      if (!user || totalPoints === 0) return null;
      const { data } = await supabase
        .from("points_history")
        .select("points")
        .eq("user_id", user.id)
        .eq("type", "earn")
        .gte("created_at", todayIsoStart);
      const todayEarned = (data ?? []).reduce(
        (s, r) => s + (r.points ?? 0),
        0
      );
      if (todayEarned === 0) return null;
      const prevTotal = totalPoints - todayEarned;
      const milestones: (5000 | 1000 | 500 | 100)[] = [5000, 1000, 500, 100];
      for (const m of milestones) {
        if (prevTotal < m && totalPoints >= m) return m;
      }
      return null;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  // 連続ログイン (login_streaks の current_streak のみ参照、更新は useLoginBonus 任せ)
  const { data: streakValue = 0 } = useQuery({
    queryKey: ["nao.streak", user?.id, today],
    queryFn: async () => {
      if (!user) return 0;
      const { data } = await supabase
        .from("login_streaks")
        .select("current_streak")
        .eq("user_id", user.id)
        .maybeSingle();
      return (data?.current_streak as number | undefined) ?? 0;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  // メッセージ確定 (キャッシュ優先、なければ context 集約 → カテゴリ確定 → ランダム選択)
  useEffect(() => {
    if (!user || !profile) return;

    // キャッシュ確認
    let cached: NaoMessage | null = null;
    try {
      const raw = localStorage.getItem(cacheKey(user.id, today));
      if (raw) {
        const parsed = JSON.parse(raw) as { id?: string };
        if (parsed.id) cached = getMessageById(parsed.id);
      }
    } catch {
      // localStorage 利用不可: 無視して新規選択
    }

    if (cached) {
      setMessage(cached);
      return;
    }

    // localStorage 由来の最終訪問日 → 「久しぶり」判定 (DB race を避ける)
    let daysSinceLastSeen = 0;
    try {
      const lastSeen = localStorage.getItem(lastSeenKey(user.id));
      if (lastSeen) {
        const last = new Date(lastSeen);
        const now = new Date(today);
        daysSinceLastSeen = Math.max(
          0,
          Math.floor((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24))
        );
      }
    } catch {
      // ignore
    }

    // 新規ユーザー判定 (登録後7日以内)
    const createdAt = profile.created_at
      ? new Date(profile.created_at as string)
      : null;
    const todayDate = new Date(today);
    const isNewUser = createdAt
      ? Math.floor(
          (todayDate.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
        ) <= 7
      : false;

    const ctx: NaoContext = {
      hasBadgeToday,
      hasShiftToday,
      pointMilestone,
      streakIs30: streakValue >= 30,
      streakIs7: streakValue >= 7 && streakValue < 30,
      daysSinceLastSeen,
      isNewUser,
      hourOfDay: new Date().getHours(),
    };

    const category = determineCategory(ctx);
    const picked = pickRandomMessageByCategory(category);
    if (!picked) return;

    setMessage(picked);
    try {
      localStorage.setItem(
        cacheKey(user.id, today),
        JSON.stringify({ id: picked.id })
      );
      localStorage.setItem(lastSeenKey(user.id), today);
    } catch {
      // ignore
    }
  }, [
    user,
    profile,
    today,
    hasBadgeToday,
    hasShiftToday,
    pointMilestone,
    streakValue,
  ]);

  if (!profile || !message) return null;

  const text = renderMessage(message.text, profile.display_name);

  return (
    <div className="mb-5 rounded-2xl border border-pink-soft bg-gradient-to-br from-coral/5 via-pink-soft/40 to-cream p-4 shadow-sakura-soft animate-pop-in">
      <p className="text-xs font-display font-bold text-coral tracking-wider mb-2">
        ✿ なお
      </p>
      <p className="text-sm font-body text-navy/85 leading-relaxed whitespace-pre-line">
        {text}
      </p>
    </div>
  );
};

export default NaoMessage;
