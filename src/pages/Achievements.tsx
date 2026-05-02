import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { Trophy, Calendar, Users, Flame, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";

type Category = "milestone" | "monthly" | "social" | "streak";

interface Achievement {
  id: string;
  name: string;
  description: string;
  emoji: string;
  category: Category;
  bonus_points: number;
  display_order: number;
}

interface UserAchievement {
  achievement_id: string;
  unlocked_at: string;
}

const CATEGORY_META: Record<Category, { label: string; icon: typeof Trophy }> = {
  milestone: { label: "マイルストーン", icon: Trophy },
  monthly: { label: "今月の挑戦", icon: Calendar },
  social: { label: "つながり", icon: Users },
  streak: { label: "継続", icon: Flame },
};

const Achievements = () => {
  const { user } = useAuth();

  const { data: allAchievements = [], isLoading: aLoading } = useQuery<
    Achievement[]
  >({
    queryKey: ["achievements_master"],
    queryFn: async () => {
      const { data } = await supabase
        .from("achievements")
        .select("*")
        .order("display_order");
      return (data ?? []) as Achievement[];
    },
    staleTime: Infinity,
  });

  const { data: myAchievements = [], isLoading: mLoading } = useQuery<
    UserAchievement[]
  >({
    queryKey: ["my_achievements", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("user_achievements")
        .select("achievement_id, unlocked_at")
        .eq("user_id", user.id);
      return (data ?? []) as UserAchievement[];
    },
    enabled: !!user,
  });

  const unlockedMap = useMemo(() => {
    const m = new Map<string, string>();
    myAchievements.forEach((u) => m.set(u.achievement_id, u.unlocked_at));
    return m;
  }, [myAchievements]);

  // カテゴリ別にグループ化
  const grouped = useMemo(() => {
    const g: Record<Category, Achievement[]> = {
      milestone: [],
      monthly: [],
      social: [],
      streak: [],
    };
    allAchievements.forEach((a) => {
      g[a.category]?.push(a);
    });
    return g;
  }, [allAchievements]);

  const unlockedCount = myAchievements.length;
  const totalCount = allAchievements.length;

  const isLoading = aLoading || mLoading;

  return (
    <AppLayout bgClassName="bg-gradient-sakura-bg" title="実績">
      <div className="text-center mb-3">
        <p className="text-xs font-display font-bold text-coral tracking-widest">
          ✿ 実績 ✿
        </p>
      </div>

      {/* サマリー */}
      <Card variant="sakura-highlight" className="mb-5 animate-pop-in">
        <CardContent className="p-5 text-center">
          <p className="text-white/85 text-xs mb-1 font-display font-bold tracking-wider">
            あなたの実績
          </p>
          <div className="flex items-baseline justify-center gap-2">
            <span className="text-4xl font-display font-black text-white tracking-tight leading-none">
              {unlockedCount}
            </span>
            <span className="text-white/85 text-base font-display font-bold">
              / {totalCount} 個
            </span>
          </div>
          <p className="text-white/80 text-xs mt-1">取得済みバッジ</p>
        </CardContent>
      </Card>

      <Tabs defaultValue="badges" className="mb-5">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="badges">バッジ</TabsTrigger>
          <TabsTrigger value="challenges">チャレンジ</TabsTrigger>
          <TabsTrigger value="ranking">ランキング</TabsTrigger>
        </TabsList>

        {/* バッジ */}
        <TabsContent value="badges" className="mt-4 space-y-5">
          {isLoading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : (
            (Object.keys(CATEGORY_META) as Category[]).map((cat) => {
              const items = grouped[cat] ?? [];
              if (items.length === 0) return null;
              const Icon = CATEGORY_META[cat].icon;
              return (
                <section key={cat}>
                  <h3 className="flex items-center gap-2 mb-2 px-1">
                    <Icon className="h-4 w-4 text-coral" />
                    <span className="text-sm font-display font-bold">
                      {CATEGORY_META[cat].label}
                    </span>
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {items.map((a) => {
                      const unlockedAt = unlockedMap.get(a.id);
                      const isUnlocked = !!unlockedAt;
                      return (
                        <Card
                          key={a.id}
                          variant="sakura"
                          className={`p-4 text-center transition-all ${
                            isUnlocked
                              ? "hover:animate-bounce-soft"
                              : "opacity-50 grayscale"
                          }`}
                        >
                          <div className="text-5xl mb-2" aria-hidden="true">
                            {a.emoji}
                          </div>
                          <p className="font-display font-bold text-sm text-navy">
                            {a.name}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">
                            {a.description}
                          </p>
                          {isUnlocked ? (
                            <div className="mt-2 inline-block bg-gradient-sakura-celebration text-white text-[10px] font-display font-bold px-2 py-0.5 rounded-full">
                              {format(new Date(unlockedAt!), "yyyy/MM/dd")} 取得
                            </div>
                          ) : (
                            <div className="mt-2 inline-block bg-pink-soft text-coral-deep text-[10px] font-display font-bold px-2 py-0.5 rounded-full">
                              未取得 (+{a.bonus_points}pt)
                            </div>
                          )}
                        </Card>
                      );
                    })}
                  </div>
                </section>
              );
            })
          )}
        </TabsContent>

        {/* チャレンジ (G-2) */}
        <TabsContent value="challenges" className="mt-4">
          <Card variant="sakura">
            <CardContent className="p-12 text-center">
              <Sparkles className="h-12 w-12 text-coral/40 mx-auto mb-3" />
              <p className="text-base font-display font-bold text-navy">
                Coming Soon 🌸
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                月替わりチャレンジが登場予定です
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ランキング (G-3) */}
        <TabsContent value="ranking" className="mt-4">
          <Card variant="sakura">
            <CardContent className="p-12 text-center">
              <Trophy className="h-12 w-12 text-coral/40 mx-auto mb-3" />
              <p className="text-base font-display font-bold text-navy">
                Coming Soon 🌸
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                都道府県別ランキングが登場予定です
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
};

export default Achievements;
