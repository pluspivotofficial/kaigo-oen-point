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
import { format } from "date-fns";
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
    const [
      { data: profiles, error: pErr },
      { data: points, error: ptErr },
    ] = await Promise.all([
      supabase
        .from("profiles")
        .select(
          "user_id, display_name, email, prefecture, created_at, is_admin, is_banned"
        )
        .order("created_at", { ascending: false }),
      supabase.from("points_history").select("user_id, points"),
    ]);

    if (pErr) console.error("Failed to fetch profiles", pErr);
    if (ptErr) console.error("Failed to fetch points_history", ptErr);

    // Aggregate points by user_id
    const pointsByUser = new Map<string, number>();
    (points ?? []).forEach((p) => {
      pointsByUser.set(p.user_id, (pointsByUser.get(p.user_id) ?? 0) + p.points);
    });

    const rows: UserRow[] = (profiles ?? []).map((p) => ({
      user_id: p.user_id,
      display_name: p.display_name,
      email: p.email,
      prefecture: p.prefecture,
      created_at: p.created_at,
      is_admin: p.is_admin ?? false,
      is_banned: p.is_banned ?? false,
      total_points: pointsByUser.get(p.user_id) ?? 0,
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>表示名</TableHead>
                    <TableHead>メアド</TableHead>
                    <TableHead>都道府県</TableHead>
                    <TableHead className="text-right">残高(pt)</TableHead>
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
                      <TableCell className="font-medium">
                        {u.display_name || (
                          <span className="text-muted-foreground">未設定</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {u.email || "—"}
                      </TableCell>
                      <TableCell>{u.prefecture || "—"}</TableCell>
                      <TableCell className="text-right font-mono">
                        {u.total_points.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
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
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminUsersPage;
