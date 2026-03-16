import { Coins, ArrowUpRight, ArrowDownRight, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import AppLayout from "@/components/AppLayout";

const MOCK_HISTORY = [
  { id: 1, date: "2026-03-15", description: "早番勤務", points: 8, type: "earn" as const },
  { id: 2, date: "2026-03-14", description: "遅番勤務", points: 8, type: "earn" as const },
  { id: 3, date: "2026-03-13", description: "夜勤勤務", points: 16, type: "earn" as const },
  { id: 4, date: "2026-03-10", description: "ポイント還元", points: -500, type: "redeem" as const },
  { id: 5, date: "2026-03-09", description: "早番勤務", points: 8, type: "earn" as const },
  { id: 6, date: "2026-03-08", description: "友人紹介ボーナス", points: 15000, type: "bonus" as const },
  { id: 7, date: "2026-03-07", description: "遅番勤務", points: 8, type: "earn" as const },
  { id: 8, date: "2026-03-05", description: "早番勤務", points: 8, type: "earn" as const },
];

const TOTAL_POINTS = 3_250;

const PointsPage = () => {
  return (
    <AppLayout title="ポイント">
      {/* Total Points */}
      <Card className="bg-gradient-to-br from-primary to-primary/80 border-0 mb-6">
        <CardContent className="p-6 text-center">
          <p className="text-primary-foreground/70 text-sm mb-1">累計ポイント</p>
          <div className="flex items-center justify-center gap-2">
            <Coins className="h-7 w-7 text-reward-gold" />
            <span className="text-3xl font-extrabold text-primary-foreground">
              {TOTAL_POINTS.toLocaleString()}
            </span>
            <span className="text-primary-foreground/70 text-sm mt-1">pt</span>
          </div>
          <p className="text-primary-foreground/60 text-xs mt-1">¥{TOTAL_POINTS.toLocaleString()} 相当</p>
        </CardContent>
      </Card>

      {/* Redeem CTA */}
      <a href="https://example.com/redeem" target="_blank" rel="noopener noreferrer">
        <Button className="w-full mb-6 h-12 gap-2" size="lg">
          <ExternalLink className="h-4 w-4" />
          ポイントを還元する
        </Button>
      </a>

      {/* History */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">ポイント履歴</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {MOCK_HISTORY.map((item) => (
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
                  <p className="text-xs text-muted-foreground">{item.date}</p>
                </div>
              </div>
              <Badge
                variant={item.points > 0 ? "default" : "destructive"}
                className="font-mono text-xs"
              >
                {item.points > 0 ? "+" : ""}{item.points.toLocaleString()} pt
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </AppLayout>
  );
};

export default PointsPage;
