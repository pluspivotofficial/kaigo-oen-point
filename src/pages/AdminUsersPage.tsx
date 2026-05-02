import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, ChevronRight, Shield, Ban } from "lucide-react";
import { format, formatDistanceToNow, startOfMonth } from "date-fns";
import { ja } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";

interface UserRow {
  user_id: string;
  display_name: string | null;
  email: string | null;
  prefecture: string | null;
  created_at: string;
  is_admin: boolean;
  is_banned: boolean;
  total_points: number;
  points_earned: number;
  points_used: number;
  referrals_count: number;
  last_sign_in_at: string | null;
  shifts_this_month: number;
}

const AdminUsersPage = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);

    const monthStart = format(startOfMonth(new Date()), "yyyy-MM-dd");

    const [
      { data: profiles, error: pErr },
      { data: points, error: ptErr },
      { data: referrals, error: rErr },
      { data: shifts, error: sErr },
    ] = await Promise.all([
      supabase
        .from("profiles")
        .select(
          "user_id, display_name, email, prefecture, created_at, is_admin, is_banned"
        )
        .order("created_at", { ascending: false }),
      supabase.from("points_history").select("user_id, points"),
      supabase.from("referrals").select("referrer_id"),
      supabase
        .from("shifts")
        .select("user_id, shift_date")
        .gte("shift_date", monthStart),
    ]);

    if (pErr) console.error("Failed to fetch profiles", pErr);
    if (ptErr) console.error("Failed to fetch points_history", ptErr);
    if (rErr) console.error("Failed to fetch referrals", rErr);
    if (sErr) console.error("Failed to fetch shifts", sErr);

    // 集計 Map (N+1 回避)
    const earnedByUser = new Map<string, number>();
    const usedByUser = new Map<string, number>();
    const totalByUser = new Map<string, number>();
    (points ?? []).forEach((p) => {
      totalByUser.set(p.user_id, (totalByUser.get(p.user_id) ?? 0) + p.points);
      if (p.points > 0) {
        earnedByUser.set(p.user_id, (earnedByUser.get(p.user_id) ?? 0) + p.points);
      } else if (p.points < 0) {
        usedByUser.set(p.user_id, (usedByUser.get(p.user_id) ?? 0) + Math.abs(p.points));
      }
    });

    const referralsByUser = new Map<string, number>();
    (referrals ?? []).forEach((r) => {
      referralsByUser.set(r.referrer_id, (referralsByUser.get(r.referrer_id) ?? 0) + 1);
    });

    const shiftsByUser = new Map<string, number>();
    (shifts ?? []).forEach((s) => {
      shiftsByUser.set(s.user_id, (shiftsByUser.get(s.user_id) ?? 0) + 1);
    });

    // 最終ログイン日時を RPC で一括取得
    const userIds = (profiles ?? []).map((p) => p.user_id);
    const lastSignInByUser = new Map<string, string>();
    if (userIds.length > 0) {
      const { data: lastSigns, error: lsErr } = await supabase.rpc(
        "get_user_last_sign_in",
        { _user_ids: userIds }
      );
      if (lsErr) {
        console.error("Failed to fetch last_sign_in_at", lsErr);
      } else {
        (lastSigns ?? []).forEach((row: any) => {
          if (row.last_sign_in_at) {
            lastSignInByUser.set(row.user_id, row.last_sign_in_at);
          }
        });
      }
    }

    const rows: UserRow[] = (profiles ?? []).map((p) => ({
      user_id: p.user_id,
      display_name: p.display_name,
      email: p.email,
      prefecture: p.prefecture,
      created_at: p.created_at,
      is_admin: p.is_admin ?? false,
      is_banned: p.is_banned ?? false,
      total_points: totalByUser.get(p.user_id) ?? 0,
      points_earned: earnedByUser.get(p.user_id) ?? 0,
      points_used: usedByUser.get(p.user_id) ?? 0,
      referrals_count: referralsByUser.get(p.user_id) ?? 0,
      last_sign_in_at: lastSignInByUser.get(p.user_id) ?? null,
      shifts_this_month: shiftsByUser.get(p.user_id) ?? 0,
    }));

    setUsers(rows);
    setLoading(false);
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return users;
    const q = search.toLowerCase();
    return users.filter(
      (u) =>
        u.display_name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q)
    );
  }, [users, search]);

  const renderLastSignIn = (iso: string | null) => {
    if (!iso) return <span className="text-xs text-muted-foreground">—</span>;
    const date = new Date(iso);
    const relative = formatDistanceToNow(date, { addSuffix: true, locale: ja });
    const absolute = format(date, "yyyy/MM/dd HH:mm");
    return (
      <span className="text-xs whitespace-nowrap" title={absolute}>
        {relative}
      </span>
    );
  };

  return (
    <AdminLayout title="ユーザー一覧">
      <div className="space-y-4">
        {/* 検索 */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="名前またはメアドで検索"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* 件数 */}
        <p className="text-sm text-muted-foreground">
          {filtered.length} 件
          {search.trim() && ` (全 ${users.length} 件中)`}
        </p>

        {/* テーブル */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <p className="text-center py-12 text-muted-foreground">
                読み込み中...
              </p>
            ) : filtered.length === 0 ? (
              <p className="text-center py-12 text-muted-foreground">
                {search.trim()
                  ? "該当ユーザーが見つかりません"
                  : "ユーザーがいません"}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>表示名</TableHead>
                      <TableHead>メアド</TableHead>
                      <TableHead>都道府県</TableHead>
                      <TableHead className="text-right">残高</TableHead>
                      <TableHead className="text-right">獲得 / 使用</TableHead>
                      <TableHead className="text-right">紹介数</TableHead>
                      <TableHead className="text-right">今月シフト</TableHead>
                      <TableHead>最終ログイン</TableHead>
                      <TableHead>登録日</TableHead>
                      <TableHead>ステータス</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((u) => (
                      <TableRow
                        key={u.user_id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => navigate(`/admin/users/${u.user_id}`)}
                      >
                        <TableCell className="font-medium whitespace-nowrap">
                          {u.display_name || (
                            <span className="text-muted-foreground">未設定</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {u.email || "—"}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {u.prefecture || "—"}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {u.total_points.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right text-xs font-mono">
                          <div className="text-green-600">
                            +{u.points_earned.toLocaleString()}
                          </div>
                          <div className="text-red-600">
                            -{u.points_used.toLocaleString()}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {u.referrals_count > 0 ? (
                            u.referrals_count
                          ) : (
                            <span className="text-xs text-muted-foreground">0</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {u.shifts_this_month > 0 ? (
                            u.shifts_this_month
                          ) : (
                            <span className="text-xs text-muted-foreground">0</span>
                          )}
                        </TableCell>
                        <TableCell>{renderLastSignIn(u.last_sign_in_at)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {format(new Date(u.created_at), "yyyy/MM/dd")}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            {u.is_admin && (
                              <Badge variant="default">
                                <Shield className="h-3 w-3 mr-1" />
                                管理者
                              </Badge>
                            )}
                            {u.is_banned && (
                              <Badge variant="destructive">
                                <Ban className="h-3 w-3 mr-1" />
                                凍結
                              </Badge>
                            )}
                            {!u.is_admin && !u.is_banned && (
                              <span className="text-xs text-muted-foreground">
                                通常
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminUsersPage;
