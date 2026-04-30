import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Users,
  UserPlus,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";

interface KpiData {
  totalUsers: number;
  newThisMonth: number;
  pointsIssued: number;
  pointsUsed: number;
}

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchKpis();
  }, []);

  const fetchKpis = async () => {
    setLoading(true);

    const monthStart = startOfThisMonth();

    const [
      { count: totalUsers, error: e1 },
      { count: newThisMonth, error: e2 },
      { data: pointsData, error: e3 },
    ] = await Promise.all([
      supabase
        .from("profiles")
        .select("*", { count: "exact", head: true }),
      supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .gte("created_at", monthStart),
      supabase.from("points_history").select("points"),
    ]);

    if (e1) console.error("total users", e1);
    if (e2) console.error("new this month", e2);
    if (e3) console.error("points data", e3);

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
    setLoading(false);
  };

  return (
    <AdminLayout title="ダッシュボード">
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          サービス全体の主要指標
        </p>

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

        <Card>
          <CardContent className="p-5 text-sm text-muted-foreground space-y-1">
            <p>
              <span className="font-semibold text-foreground">グラフ・推移表示</span>:
              Phase B 以降で検討（recharts 既存利用可）
            </p>
            <p>
              <span className="font-semibold text-foreground">集計範囲</span>:
              「今月」=
              {new Date().toLocaleDateString("ja-JP", {
                year: "numeric",
                month: "long",
              })}
              の月初〜現在
            </p>
            <p>
              <span className="font-semibold text-foreground">ポイント集計</span>:
              points_history の points {">"} 0 を発行、 {"<"} 0 を使用 (絶対値)
              として算出
            </p>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboardPage;
