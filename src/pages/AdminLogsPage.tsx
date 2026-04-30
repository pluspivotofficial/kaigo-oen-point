import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Activity, Plus, Minus } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";

interface LogEntry {
  id: string;
  created_at: string;
  user_id: string;
  admin_user_id: string | null;
  points: number;
  description: string;
  reason: string | null;
  type: string;
  target_name: string | null;
  target_email: string | null;
  admin_name: string | null;
}

const AdminLogsPage = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);

    // 1. 管理者操作ログ取得 (最新50件)
    const { data: pointsData, error: pErr } = await supabase
      .from("points_history")
      .select(
        "id, created_at, user_id, admin_user_id, points, description, reason, type"
      )
      .eq("admin_action", true)
      .order("created_at", { ascending: false })
      .limit(50);

    if (pErr) {
      console.error("Failed to fetch admin logs", pErr);
      setLoading(false);
      return;
    }

    const points = pointsData ?? [];

    // 2. ユニークな user_id (対象 + 管理者) を集める
    const userIds = new Set<string>();
    points.forEach((p) => {
      userIds.add(p.user_id);
      if (p.admin_user_id) userIds.add(p.admin_user_id);
    });

    // 3. profiles を一括取得
    const { data: profilesData } = userIds.size
      ? await supabase
          .from("profiles")
          .select("user_id, display_name, email")
          .in("user_id", Array.from(userIds))
      : { data: [] };

    const profileMap = new Map<
      string,
      { name: string | null; email: string | null }
    >();
    (profilesData ?? []).forEach((p) => {
      profileMap.set(p.user_id, { name: p.display_name, email: p.email });
    });

    // 4. ログに対象ユーザー名・管理者名を結合
    const enriched: LogEntry[] = points.map((p) => ({
      ...p,
      target_name: profileMap.get(p.user_id)?.name ?? null,
      target_email: profileMap.get(p.user_id)?.email ?? null,
      admin_name: p.admin_user_id
        ? profileMap.get(p.admin_user_id)?.name ?? null
        : null,
    }));

    setLogs(enriched);
    setLoading(false);
  };

  return (
    <AdminLayout title="操作ログ">
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          管理者がポイントを手動で操作した記録（最新 50 件）
        </p>

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <p className="text-center py-12 text-muted-foreground">
                読み込み中...
              </p>
            ) : logs.length === 0 ? (
              <div className="text-center py-12">
                <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">操作ログがありません</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>日時</TableHead>
                    <TableHead>対象ユーザー</TableHead>
                    <TableHead>操作</TableHead>
                    <TableHead className="text-right">ポイント</TableHead>
                    <TableHead>理由</TableHead>
                    <TableHead>管理者</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => {
                    const isAdd = log.points >= 0;
                    return (
                      <TableRow key={log.id}>
                        <TableCell className="text-xs whitespace-nowrap">
                          {format(
                            new Date(log.created_at),
                            "yyyy/MM/dd HH:mm"
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm font-medium">
                            {log.target_name || "(表示名未設定)"}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {log.target_email || "—"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={isAdd ? "default" : "destructive"}
                          >
                            {isAdd ? (
                              <>
                                <Plus className="h-3 w-3 mr-1" />加算
                              </>
                            ) : (
                              <>
                                <Minus className="h-3 w-3 mr-1" />減算
                              </>
                            )}
                          </Badge>
                        </TableCell>
                        <TableCell
                          className={`text-right font-mono ${
                            isAdd ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          {isAdd ? "+" : ""}
                          {log.points.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-sm max-w-xs">
                          <div
                            className="truncate"
                            title={log.reason ?? ""}
                          >
                            {log.reason || (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {log.admin_name || (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminLogsPage;
