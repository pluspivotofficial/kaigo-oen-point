import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";
import PointsCelebration from "@/components/PointsCelebration";
import BadgeUnlockModal, { type BadgeInfo } from "@/components/BadgeUnlockModal";

interface AchievementContextValue {
  /**
   * ポイント獲得演出を発火する。
   * @param amount 獲得pt
   * @param description 任意の説明文 (例: "シフト登録ボーナス")
   */
  showPoints: (amount: number, description?: string) => void;

  /**
   * バッジ判定 RPC を呼び、新規付与されたバッジを取得済キューに追加する。
   * 戻り値: 新規付与されたバッジIDの配列。
   * モーダルは自動でキュー先頭から順に表示される。
   */
  checkAchievements: () => Promise<string[]>;
}

const AchievementContext = createContext<AchievementContextValue>({
  showPoints: () => {},
  checkAchievements: async () => [],
});

export const useAchievement = () => useContext(AchievementContext);

interface PointsCelebrationState {
  amount: number;
  description?: string;
  key: number;
}

export const AchievementProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { user } = useAuth();
  const location = useLocation();
  // /admin 配下では業務集中性を守るためモーダル/オーバーレイを抑制。
  // バッジ判定 (RPC) と user_achievements への記録は通常通り行われる。
  const isAdminPath = location.pathname.startsWith("/admin");

  const [pointsCel, setPointsCel] = useState<PointsCelebrationState | null>(null);
  const [badgeQueue, setBadgeQueue] = useState<BadgeInfo[]>([]);
  const checkedOnLoginRef = useRef<string | null>(null);

  // achievements マスター (10件) を1度取得してキャッシュ
  const { data: allAchievements = [] } = useQuery<BadgeInfo[]>({
    queryKey: ["achievements_master"],
    queryFn: async () => {
      const { data } = await supabase
        .from("achievements")
        .select("id, name, description, emoji, bonus_points")
        .order("display_order");
      return (data ?? []) as BadgeInfo[];
    },
    staleTime: Infinity,
    enabled: !!user,
  });

  const showPoints = useCallback(
    (amount: number, description?: string) => {
      // /admin 配下では非表示
      if (isAdminPath) return;
      setPointsCel({ amount, description, key: Date.now() });
    },
    [isAdminPath],
  );

  const checkAchievements = useCallback(async (): Promise<string[]> => {
    if (!user) return [];
    const { data, error } = await supabase.rpc("check_and_grant_achievements");
    if (error) {
      console.error("[AchievementContext] check_and_grant_achievements", error);
      return [];
    }
    const granted: string[] = ((data as any)?.granted ?? []) as string[];
    // /admin 配下ではモーダルキューに積まない (バッジ自体は付与済)
    if (granted.length > 0 && allAchievements.length > 0 && !isAdminPath) {
      const newBadges = allAchievements.filter((a) => granted.includes(a.id));
      setBadgeQueue((prev) => [...prev, ...newBadges]);
    }
    return granted;
  }, [user, allAchievements, isAdminPath]);

  // ログイン成功時に1度だけ自動チェック (first_login 等)
  useEffect(() => {
    if (!user) {
      checkedOnLoginRef.current = null;
      return;
    }
    if (checkedOnLoginRef.current === user.id) return;
    if (allAchievements.length === 0) return; // master 取得待ち
    checkedOnLoginRef.current = user.id;
    checkAchievements();
  }, [user, allAchievements, checkAchievements]);

  const dismissBadge = () => {
    setBadgeQueue((prev) => prev.slice(1));
  };

  const dismissPoints = () => {
    setPointsCel(null);
  };

  return (
    <AchievementContext.Provider value={{ showPoints, checkAchievements }}>
      {children}

      {/* グローバルオーバーレイ */}
      <PointsCelebration
        key={pointsCel?.key}
        amount={pointsCel?.amount ?? 0}
        description={pointsCel?.description}
        visible={!!pointsCel}
        onComplete={dismissPoints}
      />
      <BadgeUnlockModal badge={badgeQueue[0] ?? null} onClose={dismissBadge} />
    </AchievementContext.Provider>
  );
};
