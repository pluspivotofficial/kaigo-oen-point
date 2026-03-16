import { useEffect, useState } from "react";
import { Coins, CalendarDays, Users, ExternalLink, TrendingUp, Clock, Megaphone, Gift, Sparkles, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";

const MOCK_NOTICES = [
  {
    id: 1,
    type: "campaign" as const,
    title: "春の紹介キャンペーン開催中！",
    description: "3/31まで友人紹介で通常の2倍、30,000ポイントもらえる！",
    icon: Gift,
    color: "bg-reward-purple/10 text-reward-purple",
    badge: "キャンペーン",
    badgeVariant: "default" as const,
  },
  {
    id: 2,
    type: "info" as const,
    title: "4月のシフト申請受付開始",
    description: "4月分のシフト申請が可能になりました。お早めに申請ください。",
    icon: Megaphone,
    color: "bg-primary/10 text-primary",
    badge: "お知らせ",
    badgeVariant: "secondary" as const,
  },
  {
    id: 3,
    type: "new" as const,
    title: "ポイント還元サイトがリニューアル",
    description: "より使いやすくなりました。新しいサイトをチェック！",
    icon: Sparkles,
    color: "bg-secondary/10 text-secondary",
    badge: "NEW",
    badgeVariant: "outline" as const,
  },
];

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [totalPoints, setTotalPoints] = useState(0);
  const [monthlyPoints, setMonthlyPoints] = useState(0);
  const [monthlyShifts, setMonthlyShifts] = useState(0);

  useEffect(() => {
    if (!user) return;

    // Total points
    supabase.from("points_history").select("points").eq("user_id", user.id)
      .then(({ data }) => {
        if (data) setTotalPoints(data.reduce((sum, r) => sum + r.points, 0));
      });

    // Monthly stats
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
    supabase.from("shifts").select("hours").eq("user_id", user.id).gte("shift_date", monthStart)
      .then(({ data }) => {
        if (data) {
          setMonthlyShifts(data.length);
          setMonthlyPoints(data.reduce((sum, r) => sum + r.hours, 0));
        }
      });
  }, [user]);

  return (
    <AppLayout title="ホップポイント">
      {/* Points Hero */}
      <Card className="bg-gradient-to-br from-primary to-primary/80 border-0 mb-6 animate-pulse-glow">
        <CardContent className="p-6 text-center">
          <p className="text-primary-foreground/70 text-sm font-medium mb-1">累計ポイント</p>
          <div className="flex items-center justify-center gap-2">
            <Coins className="h-8 w-8 text-reward-gold" />
            <span className="text-4xl font-extrabold text-primary-foreground tracking-tight">
              {totalPoints.toLocaleString()}
            </span>
            <span className="text-primary-foreground/70 text-sm mt-2">pt</span>
          </div>
          <p className="text-primary-foreground/60 text-xs mt-2">
            ¥{totalPoints.toLocaleString()} 相当
          </p>
        </CardContent>
      </Card>

      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-accent flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-accent-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">今月獲得</p>
              <p className="text-lg font-bold text-foreground">{monthlyPoints} pt</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-accent flex items-center justify-center">
              <Clock className="h-5 w-5 text-accent-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">今月勤務</p>
              <p className="text-lg font-bold text-foreground">{monthlyShifts} 回</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notices & Campaigns */}
      <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
        お知らせ・キャンペーン
      </h2>
      <div className="space-y-3 mb-6">
        {MOCK_NOTICES.map((notice) => (
          <Card key={notice.id} className="overflow-hidden">
            <CardContent className="p-4 flex items-start gap-3">
              <div className={`h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0 ${notice.color}`}>
                <notice.icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant={notice.badgeVariant} className="text-[10px] px-1.5 py-0">
                    {notice.badge}
                  </Badge>
                </div>
                <p className="font-semibold text-sm leading-snug">{notice.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{notice.description}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
        クイックアクション
      </h2>
      <div className="space-y-3">
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
            <p className="text-xs text-muted-foreground">紹介で15,000ポイントもらえる！</p>
          </div>
        </Button>

        <a href="https://hop-kaigo.jp/register/seeker" target="_blank" rel="noopener noreferrer" className="block">
          <Button variant="outline" className="w-full justify-start gap-3 h-auto py-3 text-left">
            <div className="h-9 w-9 rounded-lg bg-reward-gold/10 flex items-center justify-center flex-shrink-0">
              <ExternalLink className="h-5 w-5 text-reward-gold" />
            </div>
            <div>
              <p className="font-semibold text-sm">ポイント有効化・還元サイト</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                会員登録→「仕事を開始」でポイント有効化。以降は累計勤務時間に応じて1時間=1pt加算されます。
              </p>
            </div>
          </Button>
        </a>

        <Button variant="ghost" className="w-full justify-start gap-3 h-12 text-muted-foreground" onClick={signOut}>
          <LogOut className="h-4 w-4" />
          ログアウト
        </Button>
      </div>
    </AppLayout>
  );
};

export default Dashboard;
