import { Coins, CalendarDays, Users, ExternalLink, TrendingUp, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import AppLayout from "@/components/AppLayout";

const MOCK_POINTS = 3_250;
const MOCK_THIS_MONTH = 168;
const MOCK_SHIFTS_THIS_MONTH = 21;

const Dashboard = () => {
  const navigate = useNavigate();

  return (
    <AppLayout title="ホップポイント">
      {/* Points Hero */}
      <Card className="bg-gradient-to-br from-primary to-primary/80 border-0 mb-6 animate-pulse-glow">
        <CardContent className="p-6 text-center">
          <p className="text-primary-foreground/70 text-sm font-medium mb-1">累計ポイント</p>
          <div className="flex items-center justify-center gap-2">
            <Coins className="h-8 w-8 text-reward-gold" />
            <span className="text-4xl font-extrabold text-primary-foreground tracking-tight">
              {MOCK_POINTS.toLocaleString()}
            </span>
            <span className="text-primary-foreground/70 text-sm mt-2">pt</span>
          </div>
          <p className="text-primary-foreground/60 text-xs mt-2">
            ¥{MOCK_POINTS.toLocaleString()} 相当
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
              <p className="text-lg font-bold text-foreground">{MOCK_THIS_MONTH} pt</p>
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
              <p className="text-lg font-bold text-foreground">{MOCK_SHIFTS_THIS_MONTH} 回</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
        クイックアクション
      </h2>
      <div className="space-y-3">
        <Button
          variant="outline"
          className="w-full justify-start gap-3 h-14 text-left"
          onClick={() => navigate("/shift")}
        >
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <CalendarDays className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-sm">シフトを申請する</p>
            <p className="text-xs text-muted-foreground">カレンダーから日程と時間帯を選択</p>
          </div>
        </Button>

        <Button
          variant="outline"
          className="w-full justify-start gap-3 h-14 text-left"
          onClick={() => navigate("/points")}
        >
          <div className="h-9 w-9 rounded-lg bg-secondary/10 flex items-center justify-center">
            <Coins className="h-5 w-5 text-secondary" />
          </div>
          <div>
            <p className="font-semibold text-sm">ポイントを確認・還元</p>
            <p className="text-xs text-muted-foreground">履歴確認と還元サイトへ</p>
          </div>
        </Button>

        <Button
          variant="outline"
          className="w-full justify-start gap-3 h-14 text-left"
          onClick={() => navigate("/referral")}
        >
          <div className="h-9 w-9 rounded-lg bg-reward-purple/10 flex items-center justify-center">
            <Users className="h-5 w-5 text-reward-purple" />
          </div>
          <div>
            <p className="font-semibold text-sm">友人を紹介する</p>
            <p className="text-xs text-muted-foreground">紹介で15,000ポイントもらえる！</p>
          </div>
        </Button>

        <a
          href="https://example.com/redeem"
          target="_blank"
          rel="noopener noreferrer"
          className="block"
        >
          <Button
            variant="outline"
            className="w-full justify-start gap-3 h-14 text-left"
          >
            <div className="h-9 w-9 rounded-lg bg-reward-gold/10 flex items-center justify-center">
              <ExternalLink className="h-5 w-5 text-reward-gold" />
            </div>
            <div>
              <p className="font-semibold text-sm">ポイント還元サイト</p>
              <p className="text-xs text-muted-foreground">登録して還元を受けましょう</p>
            </div>
          </Button>
        </a>
      </div>
    </AppLayout>
  );
};

export default Dashboard;
