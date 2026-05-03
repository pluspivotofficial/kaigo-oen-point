import { useState } from "react";
import { Coins, CalendarDays, Users, ExternalLink, TrendingUp, Clock, Megaphone, Gift, Sparkles, LogOut, MapPin, FileText, Settings, Trophy, CalendarCheck, Flame } from "lucide-react";
import appLogo from "@/assets/logo.png";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import { PREFECTURES } from "@/lib/prefectures";
import { toast } from "@/hooks/use-toast";
import { useLoginBonus } from "@/hooks/useLoginBonus";
import { useProfile, useTotalPoints, useMonthlyPoints, useIsAdmin, useUserPointStats } from "@/hooks/useProfile";
import GreetingHeader from "@/components/GreetingHeader";
import NaoMessage from "@/components/home/NaoMessage";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface ColumnPreview {
  id: string;
  title: string;
  excerpt: string | null;
  thumbnail_url: string | null;
  category: string;
  published_at: string | null;
}

const CATEGORY_LABELS: Record<string, string> = {
  "care-tips": "介護のコツ",
  "health": "健康管理",
  "career": "キャリア",
  "lifestyle": "ライフスタイル",
  "news": "ニュース",
  "general": "その他",
};

const NOTICE_CATEGORY_META: Record<string, { icon: any; color: string; label: string; badgeVariant: any }> = {
  campaign: { icon: Gift, color: "bg-reward-purple/10 text-reward-purple", label: "キャンペーン", badgeVariant: "default" },
  info: { icon: Megaphone, color: "bg-primary/10 text-primary", label: "お知らせ", badgeVariant: "secondary" },
  event: { icon: CalendarCheck, color: "bg-primary/10 text-primary", label: "イベント", badgeVariant: "default" },
  new: { icon: Sparkles, color: "bg-secondary/10 text-secondary", label: "NEW", badgeVariant: "outline" },
};

const ProfileCompletionBanner = ({ profile }: { profile: any }) => {
  const navigate = useNavigate();
  if (!profile) return null;

  const d = profile;
  const isDispatch = d.employment_type === "dispatch";
  let count = 0;
  ["full_name", "date_of_birth", "gender", "address", "phone_number", "current_status", "current_job", "employment_type", "care_qualifications", "care_experience"].forEach(k => {
    if (d[k] && String(d[k]).trim() !== "") count++;
  });
  let total = 10;
  if (isDispatch) {
    total = 14;
    ["dispatch_company", "contract_end_date", "work_location"].forEach(k => {
      if (d[k] && String(d[k]).trim() !== "") count++;
    });
    if (d.hourly_rate && d.hourly_rate > 0) count++;
  }

  if (count >= total) return null;

  return (
    <Card className="mb-5 border-primary/30 bg-primary/5">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <Gift className="h-5 w-5 text-primary" />
          <span className="font-semibold text-sm">プロフィールを完成させよう！</span>
        </div>
        <p className="text-xs text-muted-foreground mb-2">
          全項目入力で <span className="text-primary font-bold">500ポイント</span> ボーナス！（残り{total - count}項目）
        </p>
        <div className="w-full h-2 bg-muted rounded-full overflow-hidden mb-2">
          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(count / total) * 100}%` }} />
        </div>
        <Button size="sm" variant="outline" onClick={() => navigate("/profile")} className="w-full text-xs">
          プロフィールを入力する
        </Button>
      </CardContent>
    </Card>
  );
};

const CampaignBanner = ({ profile }: { profile: any }) => {
  if (!profile?.first_launch_date) return null;
  const launch = new Date(profile.first_launch_date);
  const now = new Date();
  const diffDays = Math.ceil((now.getTime() - launch.getTime()) / (1000 * 60 * 60 * 24));
  const daysLeft = 7 - diffDays;
  if (daysLeft <= 0) return null;

  return (
    <Card className="mb-5 border-secondary/30 bg-gradient-to-r from-secondary/10 to-primary/10">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="h-5 w-5 text-secondary" />
          <span className="font-semibold text-sm">🎉 新規登録キャンペーン中！</span>
        </div>
        <p className="text-xs text-muted-foreground">
          シフト1時間あたり <span className="text-primary font-bold">10ポイント</span>！残り <span className="font-bold text-foreground">{daysLeft}日</span>
        </p>
      </CardContent>
    </Card>
  );
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const queryClient = useQueryClient();
  const [savingPrefecture, setSavingPrefecture] = useState(false);

  const { data: profile } = useProfile();
  const { data: totalPoints = 0 } = useTotalPoints();
  const { data: pointStats = { total: 0, earned: 0, used: 0 } } = useUserPointStats();
  const { data: monthlyPoints = 0 } = useMonthlyPoints();
  const { data: isAdmin = false } = useIsAdmin();
  const { streak } = useLoginBonus(user?.id);

  const prefecture = profile?.prefecture ?? null;

  // Monthly shifts count
  const now = new Date();
  const monthStartLabel = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  const { data: monthlyShifts = 0 } = useQuery({
    queryKey: ["monthlyShifts", user?.id, monthStartLabel],
    queryFn: async () => {
      if (!user) return 0;
      const { data } = await supabase.from("shifts").select("id").eq("user_id", user.id).gte("shift_date", monthStartLabel);
      return data?.length ?? 0;
    },
    enabled: !!user,
  });

  // Monthly hours sum (実績サマリー用)
  const { data: monthlyHours = 0 } = useQuery({
    queryKey: ["monthlyHours", user?.id, monthStartLabel],
    queryFn: async () => {
      if (!user) return 0;
      const { data } = await supabase
        .from("shifts")
        .select("hours")
        .eq("user_id", user.id)
        .gte("shift_date", monthStartLabel);
      return (data ?? []).reduce((sum, r) => sum + (r.hours ?? 0), 0);
    },
    enabled: !!user,
  });

  // Badge count (取得済みバッジ数)
  const { data: badgeCount = 0 } = useQuery({
    queryKey: ["userAchievementsCount", user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { count } = await supabase
        .from("user_achievements")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);
      return count ?? 0;
    },
    enabled: !!user,
  });

  // Columns
  const { data: columns = [] } = useQuery({
    queryKey: ["columns_preview"],
    queryFn: async () => {
      const { data } = await supabase
        .from("columns_articles")
        .select("id, title, excerpt, thumbnail_url, category, published_at")
        .eq("is_published", true)
        .order("published_at", { ascending: false })
        .limit(5);
      return (data ?? []) as ColumnPreview[];
    },
  });

  // Notices (期限フィルタ込み)
  const { data: notices = [] } = useQuery({
    queryKey: ["notices_published"],
    queryFn: async () => {
      const { data } = await supabase
        .from("notices")
        .select("id, title, description, category, display_order, start_date, end_date")
        .eq("is_published", true)
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: false });
      const today = new Date().toISOString().split("T")[0];
      // 期間フィルタ: start_date <= today AND (end_date IS NULL OR end_date >= today)
      return (data ?? []).filter((n: any) => {
        if (n.start_date && n.start_date > today) return false;
        if (n.end_date && n.end_date < today) return false;
        return true;
      });
    },
  });

  // バナー (category='banner') を分離してヒーロー位置に表示
  const bannerNotices = (notices as any[]).filter((n) => n.category === "banner");
  const otherNotices = (notices as any[]).filter((n) => n.category !== "banner");

  const handleSavePrefecture = async (value: string) => {
    if (!user) return;
    setSavingPrefecture(true);
    const { error } = await supabase.from("profiles").update({ prefecture: value }).eq("user_id", user.id);
    if (error) {
      toast({ title: "エラー", description: error.message, variant: "destructive" });
    } else {
      queryClient.invalidateQueries({ queryKey: ["profile", user.id] });
      toast({ title: "居住地を登録しました！", description: `${value}で都道府県チャレンジに参加します` });
    }
    setSavingPrefecture(false);
  };

  return (
    <AppLayout
      bgClassName="bg-gradient-sakura-bg"
      title={
        <div className="flex items-center justify-between gap-3 w-full">
          <img src={appLogo} alt="介護職応援ポイント" className="h-12 sm:h-14 shrink-0" />
          {user && <GreetingHeader displayName={profile?.display_name} />}
        </div>
      }
    >
      <ProfileCompletionBanner profile={profile} />

      {/* H-4: なおからの一言 */}
      <NaoMessage />

      {/* DB駆動 ヒーローバナー (category='banner' の notices、期間中のもの) */}
      {bannerNotices.map((b) => (
        <Card
          key={b.id}
          variant="sakura-highlight"
          className="mb-5 animate-pop-in"
        >
          <CardContent className="p-5 text-center">
            <p className="text-xs font-display font-bold text-white/80 tracking-widest mb-2">
              ✿ お知らせ ✿
            </p>
            <h3 className="text-lg font-display font-black text-white mb-2">
              {b.title}
            </h3>
            <p className="text-sm text-white/90 font-body whitespace-pre-line">
              {b.description}
            </p>
            {b.end_date && (
              <p className="text-xs text-white/70 mt-3 font-display">
                〜 {new Date(b.end_date).toLocaleDateString("ja-JP")} まで
              </p>
            )}
          </CardContent>
        </Card>
      ))}

      {profile && !prefecture && (
        <Card className="mb-5 border-secondary/30 bg-secondary/5">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-secondary" />
              <span className="font-semibold text-sm">居住地を登録しよう！</span>
            </div>
            <p className="text-xs text-muted-foreground">
              都道府県を登録すると、同じ地域のみんなと一緒に累計稼働時間チャレンジに参加できます。
            </p>
            <Select onValueChange={handleSavePrefecture} disabled={savingPrefecture}>
              <SelectTrigger>
                <SelectValue placeholder="都道府県を選択" />
              </SelectTrigger>
              <SelectContent>
                {PREFECTURES.map((pref) => (
                  <SelectItem key={pref} value={pref}>{pref}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      {prefecture && (
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="h-4 w-4 text-secondary" />
          <Badge variant="secondary" className="text-xs">{prefecture}</Badge>
          <button
            className="text-[10px] text-muted-foreground hover:text-foreground underline"
            onClick={() => queryClient.invalidateQueries({ queryKey: ["profile", user?.id] })}
          >
            変更
          </button>
        </div>
      )}

      {/* Points Hero (sakura-highlight) */}
      <Card
        variant="sakura-highlight"
        data-tour="dashboard-points"
        className="mb-6 animate-pop-in relative overflow-hidden"
      >
            <CardContent className="p-6 text-center">
              <p className="text-white/85 text-xs mb-2 font-display font-bold tracking-wider">
                ✿ あなたのポイント残高 ✿
              </p>
              <div className="flex items-baseline justify-center gap-2 mb-1">
                <Coins className="h-8 w-8 text-gold self-center" />
                <span className="text-5xl font-display font-black text-white tracking-tight leading-none">
                  {pointStats.total.toLocaleString()}
                </span>
                <span className="text-white/85 text-xl font-display font-bold">
                  pt
                </span>
              </div>
              <p className="text-white/80 text-xs">
                ¥{pointStats.total.toLocaleString()} 相当
              </p>

              {/* ミニ統計 */}
              <div className="mt-3 pt-3 border-t border-white/20 flex justify-center gap-6 text-xs font-display font-bold text-white/85">
                <span>
                  累計獲得{" "}
                  <span className="font-black">
                    +{pointStats.earned.toLocaleString()}
                  </span>
                </span>
                <span>
                  使用{" "}
                  <span className="font-black">
                    -{pointStats.used.toLocaleString()}
                  </span>
                </span>
              </div>
            </CardContent>
      </Card>

      {/* 実績サマリー (Quick Actions の上) */}
      <Card
        variant="sakura-tappable"
        className="mb-5"
        onClick={() => navigate("/achievements")}
      >
        <CardContent className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-gradient-sakura-celebration flex items-center justify-center shrink-0">
            <Trophy className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-display font-bold text-sm text-navy">あなたの実績</p>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="text-xs text-muted-foreground">
                今月の稼働: <strong className="text-coral font-display font-black">{monthlyHours}時間</strong> ⭐
              </span>
              <span className="text-xs text-muted-foreground">
                バッジ: <strong className="text-coral font-display font-black">{badgeCount}個</strong>
              </span>
            </div>
          </div>
          <span className="text-xs text-coral font-display font-bold whitespace-nowrap">
            もっと見る →
          </span>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
        クイックアクション
      </h2>
      <div data-tour="dashboard-actions" className="space-y-3 mb-6">
        <Button variant="outline" className="w-full justify-start gap-3 h-14 text-left" onClick={() => navigate("/shift")}>
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <CalendarDays className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-sm">シフトを申請する</p>
            <p className="text-xs text-muted-foreground">カレンダーから日程と時間帯を選択</p>
          </div>
        </Button>

        <Button variant="outline" className="w-full justify-start gap-3 h-14 text-left" onClick={() => navigate("/points")}>
          <div className="h-9 w-9 rounded-lg bg-secondary/10 flex items-center justify-center">
            <Coins className="h-5 w-5 text-secondary" />
          </div>
          <div>
            <p className="font-semibold text-sm">ポイントを確認・還元</p>
            <p className="text-xs text-muted-foreground">履歴確認と還元サイトへ</p>
          </div>
        </Button>

        <Button variant="outline" className="w-full justify-start gap-3 h-14 text-left" onClick={() => navigate("/referral")}>
          <div className="h-9 w-9 rounded-lg bg-reward-purple/10 flex items-center justify-center">
            <Users className="h-5 w-5 text-reward-purple" />
          </div>
          <div>
            <p className="font-semibold text-sm">友人を紹介する</p>
            <p className="text-xs text-muted-foreground">紹介で最大600ptをGET</p>
          </div>
        </Button>

        <Button variant="outline" className="w-full justify-start gap-3 h-14 text-left" onClick={() => navigate("/ranking")}>
          <div className="h-9 w-9 rounded-lg bg-secondary/10 flex items-center justify-center">
            <Trophy className="h-5 w-5 text-secondary" />
          </div>
          <div>
            <p className="font-semibold text-sm">都道府県ランキング</p>
            <p className="text-xs text-muted-foreground">地域別の累計稼働時間を確認</p>
          </div>
        </Button>

        <a href="https://hop-kaigo.jp/register/seeker" target="_blank" rel="noopener noreferrer" className="block">
          <Button variant="outline" className="w-full justify-start gap-3 h-auto py-3 text-left whitespace-normal">
            <div className="h-9 w-9 rounded-lg bg-reward-gold/10 flex items-center justify-center flex-shrink-0">
              <ExternalLink className="h-5 w-5 text-reward-gold" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm">ポイント有効化・還元サイト</p>
              <p className="text-xs text-muted-foreground leading-relaxed break-words">
                会員登録→「仕事を開始」でポイント有効化。以降は累計勤務時間に応じて1時間=1pt加算されます。
              </p>
            </div>
          </Button>
        </a>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <Card>
          <CardContent className="p-3 flex flex-col items-center">
            <div className="h-9 w-9 rounded-lg bg-accent flex items-center justify-center mb-1">
              <TrendingUp className="h-4 w-4 text-accent-foreground" />
            </div>
            <p className="text-[10px] text-muted-foreground">今月獲得</p>
            <p className="text-lg font-bold text-foreground">{monthlyPoints} pt</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 flex flex-col items-center">
            <div className="h-9 w-9 rounded-lg bg-accent flex items-center justify-center mb-1">
              <Clock className="h-4 w-4 text-accent-foreground" />
            </div>
            <p className="text-[10px] text-muted-foreground">今月勤務</p>
            <p className="text-lg font-bold text-foreground">{monthlyShifts} 回</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 flex flex-col items-center">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center mb-1">
              <Flame className="h-4 w-4 text-primary" />
            </div>
            <p className="text-[10px] text-muted-foreground">連続ログイン</p>
            <p className="text-lg font-bold text-foreground">{streak} 日</p>
          </CardContent>
        </Card>
      </div>

      {/* Notices & Campaigns (banner 以外を一覧表示) */}
      {otherNotices.length > 0 && (
        <>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
            お知らせ・キャンペーン
          </h2>
          <div className="space-y-3 mb-6">
            {otherNotices.map((notice: any) => {
              const meta = NOTICE_CATEGORY_META[notice.category] ?? NOTICE_CATEGORY_META.info;
              const Icon = meta.icon;
              return (
                <Card key={notice.id} className="overflow-hidden">
                  <CardContent className="p-4 flex items-start gap-3">
                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0 ${meta.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={meta.badgeVariant} className="text-[10px] px-1.5 py-0">
                          {meta.label}
                        </Badge>
                      </div>
                      <p className="font-semibold text-sm leading-snug">{notice.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed whitespace-pre-wrap">{notice.description}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* Latest Columns */}
      {columns.length > 0 && (
        <>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider flex items-center gap-2">
            <FileText className="h-4 w-4" />
            コラム記事
          </h2>
          <div className="space-y-3 mb-6">
            {columns.map((col) => (
              <Card key={col.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/column/${col.id}`)}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-[10px]">
                      {CATEGORY_LABELS[col.category] || col.category}
                    </Badge>
                    {col.published_at && (
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(col.published_at).toLocaleDateString("ja-JP")}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-semibold leading-snug line-clamp-2">{col.title}</p>
                  {col.excerpt && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{col.excerpt}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Admin Menu */}
      {isAdmin && (
        <>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider flex items-center gap-2">
            <Settings className="h-4 w-4" />
            管理メニュー
          </h2>
          <div className="space-y-2 mb-6">
            <Button variant="outline" className="w-full justify-start gap-2" onClick={() => navigate("/admin/columns")}>
              <FileText className="h-4 w-4" />
              コラム管理
            </Button>
            <Button variant="outline" className="w-full justify-start gap-2" onClick={() => navigate("/admin/questions")}>
              <FileText className="h-4 w-4" />
              掲示板管理
            </Button>
            <Button variant="outline" className="w-full justify-start gap-2" onClick={() => navigate("/admin/referrals")}>
              <Users className="h-4 w-4" />
              紹介管理
            </Button>
            <Button variant="outline" className="w-full justify-start gap-2" onClick={() => navigate("/admin/points")}>
              <Coins className="h-4 w-4" />
              ポイント管理
            </Button>
            <Button variant="outline" className="w-full justify-start gap-2" onClick={() => navigate("/admin/notices")}>
              <Megaphone className="h-4 w-4" />
              お知らせ・キャンペーン管理
            </Button>
          </div>
        </>
      )}

      {/* Logout */}
      <Button
        variant="ghost"
        className="w-full text-muted-foreground hover:text-destructive gap-2"
        onClick={signOut}
      >
        <LogOut className="h-4 w-4" />
        ログアウト
      </Button>
    </AppLayout>
  );
};

export default Dashboard;
