import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile, useTotalPoints } from "@/hooks/useProfile";
import {
  pickFromCategory,
  getByCategoryAndIndex,
  renderMessage,
  type NaoCategory,
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
  hitMilestoneToday: boolean;
  streakIs30: boolean;
  streakIs7: boolean;
  daysSinceLastSeen: number;
  isNewUser: boolean;
  hourOfDay: number;
}

// 優先度順にカテゴリを確定
const determineCategory = (ctx: NaoContext): NaoCategory => {
  if (ctx.hasBadgeToday) return "afterBadge";
  if (ctx.hasShiftToday) return "afterShiftLog";
  if (ctx.hitMilestoneToday) return "pointsMilestone";
  if (ctx.streakIs30) return "consecutive30";
  if (ctx.streakIs7) return "consecutive7";
  if (ctx.daysSinceLastSeen >= 7) return "comeback7";
  if (ctx.daysSinceLastSeen >= 3) return "comeback3";
  if (ctx.isNewUser) return "firstLogin";
  if (ctx.hourOfDay >= 5 && ctx.hourOfDay < 10) return "morning";
  if (ctx.hourOfDay >= 10 && ctx.hourOfDay < 17) return "daytime";
  if (ctx.hourOfDay >= 17 && ctx.hourOfDay < 21) return "evening";
  return "night";
};

interface ResolvedMessage {
  text: string;
  illustrationKey: string;
}

const NaoMessage = () => {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { data: totalPoints = 0 } = useTotalPoints();
  const [resolved, setResolved] = useState<ResolvedMessage | null>(null);
  const [imgError, setImgError] = useState(false);

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

  // ポイント節目判定 (100/500/1000/5000 のいずれかを当日跨いだ)
  const { data: hitMilestoneToday = false } = useQuery({
    queryKey: ["nao.milestone", user?.id, today, totalPoints],
    queryFn: async () => {
      if (!user || totalPoints === 0) return false;
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
      if (todayEarned === 0) return false;
      const prevTotal = totalPoints - todayEarned;
      const milestones = [100, 500, 1000, 5000];
      return milestones.some((m) => prevTotal < m && totalPoints >= m);
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  // 連続ログイン (login_streaks の current_streak を参照、更新は useLoginBonus 任せ)
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

  // メッセージ確定 (キャッシュ優先 → context 集約 → カテゴリ確定 → ランダム選択)
  useEffect(() => {
    if (!user || !profile) return;

    // キャッシュ確認 (新形式: { category, index })
    let cached: ResolvedMessage | null = null;
    try {
      const raw = localStorage.getItem(cacheKey(user.id, today));
      if (raw) {
        const parsed = JSON.parse(raw) as {
          category?: NaoCategory;
          index?: number;
        };
        if (parsed.category && typeof parsed.index === "number") {
          cached = getByCategoryAndIndex(parsed.category, parsed.index);
        }
      }
    } catch {
      // localStorage 利用不可 / 旧形式: 無視して新規選択
    }

    if (cached) {
      setResolved(cached);
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
      hitMilestoneToday,
      streakIs30: streakValue >= 30,
      streakIs7: streakValue >= 7 && streakValue < 30,
      daysSinceLastSeen,
      isNewUser,
      hourOfDay: new Date().getHours(),
    };

    const category = determineCategory(ctx);
    const picked = pickFromCategory(category);
    if (!picked) return;

    setResolved({ text: picked.text, illustrationKey: picked.illustrationKey });
    try {
      localStorage.setItem(
        cacheKey(user.id, today),
        JSON.stringify({ category, index: picked.index })
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
    hitMilestoneToday,
    streakValue,
  ]);

  if (!profile || !resolved) return null;

  const text = renderMessage(resolved.text, profile.display_name);

  return (
    <div className="mb-5 rounded-2xl border border-pink-soft bg-gradient-to-br from-coral/5 via-pink-soft/40 to-cream p-4 shadow-sakura-soft animate-pop-in">
      <div className="flex gap-3 sm:gap-4 items-start">
        {!imgError && (
          <img
            src={`/nao/${resolved.illustrationKey}.png`}
            alt="なお"
            className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover flex-shrink-0 bg-pink-soft/30"
            loading="lazy"
            onError={() => setImgError(true)}
          />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-display font-bold text-coral tracking-wider mb-2">
            ✿ なお
          </p>
          <p className="text-sm sm:text-base font-body text-navy/85 leading-relaxed whitespace-pre-line">
            {text}
          </p>
        </div>
      </div>
    </div>
  );
};

export default NaoMessage;
