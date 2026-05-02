import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users,
  UserPlus,
  TrendingUp,
  TrendingDown,
  LineChart as LineChartIcon,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { eachDayOfInterval, format, subDays, startOfDay } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";

interface KpiData {
  totalUsers: number;
  newThisMonth: number;
  pointsIssued: number;
  pointsUsed: number;
}

interface DailyPoint {
  date: string;       // "MM/DD" 表示用
  fullDate: string;   // "yyyy-MM-dd" tooltip用
  新規登録: number;
}

const TREND_DAYS = 30;

const startOfThisMonth = (): string => {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
};

const KpiCard = ({
  icon,
  label,
  value,
  suffix,
  loading,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  suffix: string;
  loading: boolean;
  accent?: "primary" | "success" | "danger";
}) => {
  const accentColor =
    accent === "success"
      ? "text-green-600"
      : accent === "danger"
      ? "text-red-600"
      : "text-foreground";

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-2 text-muted-foreground">
          {icon}
          <span className="text-sm">{label}</span>
        </div>
        <div className={`text-3xl font-bold ${accentColor}`}>
          {loading ? (
            <span className="text-muted-foreground text-base">読み込み中...</span>
          ) : (
            <>
              {value.toLocaleString()}
              <span className="text-sm font-normal text-muted-foreground ml-1">
                {suffix}
              </span>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const AdminDashboardPage = () => {
  const [data, setData] = useState<KpiData>({
    totalUsers: 0,
    newThisMonth: 0,
    pointsIssued: 0,
    pointsUsed: 0,
  });
  const [trendCreatedAts, setTrendCreatedAts] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchKpis();
  }, []);

  const fetchKpis = async () => {
    setLoading(true);

    const monthStart = startOfThisMonth();
    const trendStart = startOfDay(subDays(new Date(), TREND_DAYS - 1)).toISOString();

    const [
      { count: totalUsers, error: e1 },
      { count: newThisMonth, error: e2 },
      { data: pointsData, error: e3 },
      { data: trendData, error: e4 },
    ] = await Promise.all([
      supabase
        .from("profiles")
        .select("*", { count: "exact", head: true }),
      supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .gte("created_at", monthStart),
      supabase.from("points_history").select("points"),
      supabase
        .from("profiles")
        .select("created_at")
        .gte("created_at", trendStart)
        .order("created_at", { ascending: true }),
    ]);

    if (e1) console.error("total users", e1);
    if (e2) console.error("new this month", e2);
    if (e3) console.error("points data", e3);
    if (e4) console.error("trend data", e4);

    let issued = 0;
    let used = 0;
    (pointsData ?? []).forEach((p) => {
      if (p.points > 0) issued += p.points;
      else if (p.points < 0) used += Math.abs(p.points);
    });

    setData({
      totalUsers: totalUsers ?? 0,
      newThisMonth: newThisMonth ?? 0,
      pointsIssued: issued,
      pointsUsed: used,
    });
    setTrendCreatedAts((trendData ?? []).map((r) => r.created_at as string));
    setLoading(false);
  };

  // 過去30日の日次新規登録数 (0件の日も0として埋める)
  const trendChartData = useMemo<DailyPoint[]>(() => {
    const today = startOfDay(new Date());
    const start = subDays(today, TREND_DAYS - 1);
    const days = eachDayOfInterval({ start, end: today });

    // YYYY-MM-DD ごとの登録数 Map
    const counts = new Map<string, number>();
    trendCreatedAts.forEach((iso) => {
      const key = format(startOfDay(new Date(iso)), "yyyy-MM-dd");
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });

    return days.map((d) => {
      const key = format(d, "yyyy-MM-dd");
      return {
        date: format(d, "MM/dd"),
        fullDate: key,
        新規登録: counts.get(key) ?? 0,
      };
    });
  }, [trendCreatedAts]);

  return (
    <AdminLayout title="ダッシュボード">
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          サービス全体の主要指標
        </p>

        {/* KPI 4枚 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            icon={<Users className="h-4 w-4" />}
            label="総ユーザー数"
            value={data.totalUsers}
            suffix="人"
            loading={loading}
          />
          <KpiCard
            icon={<UserPlus className="h-4 w-4" />}
            label="今月の新規登録"
            value={data.newThisMonth}
            suffix="人"
            loading={loading}
            accent="primary"
          />
          <KpiCard
            icon={<TrendingUp className="h-4 w-4" />}
            label="総ポイント発行数"
            value={data.pointsIssued}
            suffix="pt"
            loading={loading}
            accent="success"
          />
          <KpiCard
            icon={<TrendingDown className="h-4 w-4" />}
            label="総ポイント使用数"
            value={data.pointsUsed}
            suffix="pt"
            loading={loading}
            accent="danger"
          />
        </div>

        {/* 日次新規登録数の推移 (過去30日) */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <LineChartIcon className="h-4 w-4 text-primary" />
              新規登録の推移 (過去 {TREND_DAYS} 日)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              {loading ? (
                <p className="text-muted-foreground text-center py-12">
                  読み込み中...
                </p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={trendChartData}
                    margin={{ top: 5, right: 10, left: -10, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                      labelFormatter={(label, payload) => {
                        const full = payload?.[0]?.payload?.fullDate;
                        return full ?? label;
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="新規登録"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2.5}
                      dot={{ r: 2.5, fill: "hsl(var(--primary))" }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboardPage;
