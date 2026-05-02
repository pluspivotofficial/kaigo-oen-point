import { Coins, ArrowUpRight, ArrowDownRight, ExternalLink, TrendingUp, CalendarDays, UserCog, Gift } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

const PointsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: history = [] } = useQuery({
    queryKey: ["pointsHistory", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("points_history")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user,
  });

  const totalPoints = history.reduce((sum, item) => sum + item.points, 0);

  // 累計推移グラフデータ（古い順に並べて累積）
  const chartData = useMemo(() => {
    if (history.length === 0) return [];
    const sorted = [...history].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    // 日付ごとに集計
    const byDate: Record<string, number> = {};
    sorted.forEach((h) => {
      const d = new Date(h.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      byDate[key] = (byDate[key] ?? 0) + h.points;
    });
    let cum = 0;
    return Object.entries(byDate).map(([date, pts]) => {
      cum += pts;
      const d = new Date(date);
      return {
        date: `${d.getMonth() + 1}/${d.getDate()}`,
        累計: cum,
      };
    });
  }, [history]);

  // 累計獲得 / 使用 (sakura ミニ統計用)
  const earned = history.reduce((sum, h) => (h.points > 0 ? sum + h.points : sum), 0);
  const used = history.reduce((sum, h) => (h.points < 0 ? sum + Math.abs(h.points) : sum), 0);

  return (
    <AppLayout bgClassName="bg-gradient-sakura-bg" title="ポイント">
      {/* セクションキッカー */}
      <div className="text-center mb-3">
        <p className="text-xs font-display font-bold text-coral tracking-widest">
          ✿ ポイント履歴 ✿
        </p>
      </div>

      <Card variant="sakura-highlight" className="mb-6 animate-pop-in">
        <CardContent className="p-6 text-center">
          <p className="text-white/85 text-xs mb-1 font-display font-bold tracking-wider">
            あなたのポイント残高
          </p>
          <div className="flex items-baseline justify-center gap-2">
            <Coins className="h-7 w-7 text-gold self-center" />
            <span className="text-4xl font-display font-black text-white tracking-tight leading-none">
              {totalPoints.toLocaleString()}
            </span>
            <span className="text-white/85 text-base font-display font-bold">pt</span>
          </div>
          <p className="text-white/80 text-xs mt-1">
            ¥{totalPoints.toLocaleString()} 相当
          </p>
          <div className="mt-3 pt-3 border-t border-white/20 flex justify-center gap-6 text-xs font-display font-bold text-white/85">
            <span>
              累計獲得 <span className="font-black">+{earned.toLocaleString()}</span>
            </span>
            <span>
              使用 <span className="font-black">-{used.toLocaleString()}</span>
            </span>
          </div>
        </CardContent>
      </Card>

      {/* 累計推移グラフ */}
      {chartData.length > 0 && (
        <Card variant="sakura" data-tour="points-chart" className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-display font-bold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-coral" />
              ポイント獲得推移
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="累計"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: "hsl(var(--primary))" }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ポイントを獲得できる導線 */}
      <Card variant="sakura" data-tour="points-earn" className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-display font-bold flex items-center gap-2">
            <Gift className="h-4 w-4 text-coral" />
            ポイントを獲得する
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button
            variant="outline"
            className="w-full justify-start gap-3 h-auto py-3 text-left"
            onClick={() => navigate("/shift")}
          >
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <CalendarDays className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm">シフトを登録する</p>
              <p className="text-xs text-muted-foreground">1シフト登録で +5pt</p>
            </div>
          </Button>

          <Button
            variant="outline"
            className="w-full justify-start gap-3 h-auto py-3 text-left"
            onClick={() => navigate("/profile")}
          >
            <div className="h-9 w-9 rounded-lg bg-secondary/10 flex items-center justify-center flex-shrink-0">
              <UserCog className="h-5 w-5 text-secondary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm">プロフィールを入力する</p>
              <p className="text-xs text-muted-foreground">各項目+100pt、完了で+500ptボーナス</p>
            </div>
          </Button>

          <a href="https://hop-kaigo.jp/register/seeker" target="_blank" rel="noopener noreferrer" className="block">
            <Button variant="outline" className="w-full justify-start gap-3 h-auto py-3 text-left whitespace-normal">
              <div className="h-9 w-9 rounded-lg bg-reward-gold/10 flex items-center justify-center flex-shrink-0">
                <ExternalLink className="h-5 w-5 text-reward-gold" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-sm">ポイントを有効化（ホップ会員登録）</p>
                <p className="text-xs text-muted-foreground leading-relaxed break-words">
                  会員登録→「仕事を開始」で勤務時間に応じて1時間=1pt自動加算
                </p>
              </div>
            </Button>
          </a>
        </CardContent>
      </Card>

      <Card variant="sakura">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-display font-bold">ポイント履歴</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {history.length === 0 ? (
            <div className="text-center py-8 space-y-3">
              <p className="text-sm text-muted-foreground">まだ履歴がありません</p>
              <p className="text-xs text-muted-foreground">
                上の「ポイントを獲得する」からスタート！
              </p>
            </div>
          ) : (
            history.map((item) => {
              const isAdminOp = (item as any).admin_action === true;
              const isPositive = item.points > 0;
              const badgeVariant: "sakura-coral" | "sakura-gold" | "sakura-pink" = isAdminOp
                ? "sakura-coral"
                : isPositive
                ? "sakura-gold"
                : "sakura-pink";
              return (
                <div key={item.id} className="flex items-center justify-between py-3 border-b border-pink-soft last:border-0">
                  <div className="flex items-center gap-3">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                      isPositive ? "bg-gold/10" : "bg-pink-soft"
                    }`}>
                      {isPositive ? (
                        <ArrowUpRight className="h-4 w-4 text-gold-deep" />
                      ) : (
                        <ArrowDownRight className="h-4 w-4 text-coral" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-display font-bold">{item.description}</p>
                      <p className="text-xs text-muted-foreground">{new Date(item.created_at).toLocaleDateString("ja-JP")}</p>
                    </div>
                  </div>
                  <Badge variant={badgeVariant} className="font-mono text-xs">
                    {isPositive ? "+" : ""}{item.points.toLocaleString()} pt
                  </Badge>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </AppLayout>
  );
};

export default PointsPage;
