import { useEffect, useState } from "react";
import { Coins, ArrowUpRight, ArrowDownRight, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";

interface PointsRow {
  id: string;
  created_at: string;
  description: string;
  points: number;
  type: string;
}

const PointsPage = () => {
  const { user } = useAuth();
  const [history, setHistory] = useState<PointsRow[]>([]);
  const [totalPoints, setTotalPoints] = useState(0);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("points_history")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) {
          setHistory(data);
          setTotalPoints(data.reduce((sum, item) => sum + item.points, 0));
        }
      });
  }, [user]);

  return (
    <AppLayout title="ポイント">
      {/* Total Points */}
      <Card className="bg-gradient-to-br from-primary to-primary/80 border-0 mb-6">
        <CardContent className="p-6 text-center">
          <p className="text-primary-foreground/70 text-sm mb-1">累計ポイント</p>
          <div className="flex items-center justify-center gap-2">
            <Coins className="h-7 w-7 text-reward-gold" />
            <span className="text-3xl font-extrabold text-primary-foreground">
              {totalPoints.toLocaleString()}
            </span>
            <span className="text-primary-foreground/70 text-sm mt-1">pt</span>
          </div>
          <p className="text-primary-foreground/60 text-xs mt-1">¥{totalPoints.toLocaleString()} 相当</p>
        </CardContent>
      </Card>

      {/* Redeem CTA */}
      <Card className="mb-6 border-primary/20 bg-primary/5">
        <CardContent className="p-5">
          <a href="https://hop-kaigo.jp/register/seeker" target="_blank" rel="noopener noreferrer">
            <Button className="w-full h-12 gap-2 mb-3" size="lg">
              <ExternalLink className="h-4 w-4" />
              ポイントを有効化する（会員登録）
            </Button>
          </a>
          <div className="space-y-2 text-xs text-muted-foreground">
            <p>上記サイトで<strong className="text-foreground">会員登録</strong>後、<strong className="text-foreground">「仕事を開始」</strong>することでポイントが有効化されます。</p>
            <p>有効化以降は、<strong className="text-foreground">累計勤務時間に応じて1時間＝1ポイント</strong>が自動的に加算されます。</p>
          </div>
        </CardContent>
      </Card>

      {/* History */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">ポイント履歴</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">まだ履歴がありません</p>
          ) : (
            history.map((item) => (
              <div key={item.id} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                <div className="flex items-center gap-3">
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                    item.type === "redeem"
                      ? "bg-destructive/10"
                      : item.type === "bonus"
                      ? "bg-reward-purple/10"
                      : "bg-secondary/10"
                  }`}>
                    {item.type === "redeem" ? (
                      <ArrowDownRight className="h-4 w-4 text-destructive" />
                    ) : (
                      <ArrowUpRight className={`h-4 w-4 ${item.type === "bonus" ? "text-reward-purple" : "text-secondary"}`} />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{item.description}</p>
                    <p className="text-xs text-muted-foreground">{new Date(item.created_at).toLocaleDateString("ja-JP")}</p>
                  </div>
                </div>
                <Badge
                  variant={item.points > 0 ? "default" : "destructive"}
                  className="font-mono text-xs"
                >
                  {item.points > 0 ? "+" : ""}{item.points.toLocaleString()} pt
                </Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </AppLayout>
  );
};

export default PointsPage;
