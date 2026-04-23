import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import { Coins, Search, Pencil, Trash2, ChevronLeft, Users, MinusCircle } from "lucide-react";

interface Profile {
  user_id: string;
  display_name: string | null;
  full_name: string | null;
  prefecture: string | null;
  phone_number: string | null;
}

interface PointEntry {
  id: string;
  user_id: string;
  points: number;
  description: string;
  type: string;
  created_at: string;
  shift_id: string | null;
}

interface UserSummary {
  user_id: string;
  display_name: string | null;
  full_name: string | null;
  prefecture: string | null;
  total_points: number;
  earn_points: number;
  spend_points: number;
  entry_count: number;
}

const AdminPointsPage = () => {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [allPoints, setAllPoints] = useState<PointEntry[]>([]);
  const [search, setSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // edit dialog
  const [editEntry, setEditEntry] = useState<PointEntry | null>(null);
  const [editPoints, setEditPoints] = useState<string>("");
  const [editDescription, setEditDescription] = useState<string>("");
  const [saving, setSaving] = useState(false);

  // delete confirm
  const [deleteEntry, setDeleteEntry] = useState<PointEntry | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .rpc("has_role", { _user_id: user.id, _role: "admin" })
      .then(({ data }) => {
        setIsAdmin(Boolean(data));
      });
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    const [{ data: profilesData }, { data: pointsData }] = await Promise.all([
      supabase.from("profiles").select("user_id, display_name, full_name, prefecture"),
      supabase.from("points_history").select("*").order("created_at", { ascending: false }).limit(5000),
    ]);
    if (profilesData) setProfiles(profilesData as Profile[]);
    if (pointsData) setAllPoints(pointsData as PointEntry[]);
    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin) fetchData();
  }, [isAdmin]);

  const summaries: UserSummary[] = useMemo(() => {
    const map = new Map<string, UserSummary>();
    profiles.forEach((p) => {
      map.set(p.user_id, {
        user_id: p.user_id,
        display_name: p.display_name,
        full_name: p.full_name,
        prefecture: p.prefecture,
        total_points: 0,
        earn_points: 0,
        spend_points: 0,
        entry_count: 0,
      });
    });
    allPoints.forEach((entry) => {
      let s = map.get(entry.user_id);
      if (!s) {
        s = {
          user_id: entry.user_id,
          display_name: null,
          full_name: null,
          prefecture: null,
          total_points: 0,
          earn_points: 0,
          spend_points: 0,
          entry_count: 0,
        };
        map.set(entry.user_id, s);
      }
      s.total_points += entry.points;
      s.entry_count += 1;
      if (entry.points >= 0) s.earn_points += entry.points;
      else s.spend_points += entry.points;
    });
    return Array.from(map.values()).sort((a, b) => b.total_points - a.total_points);
  }, [profiles, allPoints]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return summaries;
    return summaries.filter((s) => {
      return (
        (s.display_name || "").toLowerCase().includes(q) ||
        (s.full_name || "").toLowerCase().includes(q) ||
        (s.prefecture || "").toLowerCase().includes(q) ||
        s.user_id.toLowerCase().includes(q)
      );
    });
  }, [summaries, search]);

  const selectedUser = useMemo(
    () => summaries.find((s) => s.user_id === selectedUserId) || null,
    [summaries, selectedUserId]
  );

  const userEntries = useMemo(() => {
    if (!selectedUserId) return [];
    return allPoints.filter((e) => e.user_id === selectedUserId);
  }, [allPoints, selectedUserId]);

  const totals = useMemo(() => {
    const total = summaries.reduce((sum, s) => sum + s.total_points, 0);
    const userCount = summaries.filter((s) => s.entry_count > 0).length;
    return { total, userCount, totalUsers: summaries.length };
  }, [summaries]);

  const openEdit = (entry: PointEntry) => {
    setEditEntry(entry);
    setEditPoints(String(entry.points));
    setEditDescription(entry.description);
  };

  const handleSaveEdit = async () => {
    if (!editEntry) return;
    const pts = Number(editPoints);
    if (Number.isNaN(pts)) {
      toast({ title: "ポイントは数値で入力してください", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("points_history")
      .update({ points: pts, description: editDescription })
      .eq("id", editEntry.id);
    if (error) {
      toast({ title: "更新エラー", description: error.message, variant: "destructive" });
      setSaving(false);
      return;
    }
    setAllPoints((prev) =>
      prev.map((e) => (e.id === editEntry.id ? { ...e, points: pts, description: editDescription } : e))
    );
    toast({ title: "ポイントを更新しました" });
    setEditEntry(null);
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteEntry) return;
    setDeleting(true);
    const { error } = await supabase.from("points_history").delete().eq("id", deleteEntry.id);
    if (error) {
      toast({ title: "削除エラー", description: error.message, variant: "destructive" });
      setDeleting(false);
      return;
    }
    setAllPoints((prev) => prev.filter((e) => e.id !== deleteEntry.id));
    toast({ title: "ポイント履歴を削除しました" });
    setDeleteEntry(null);
    setDeleting(false);
  };

  if (isAdmin === null) {
    return (
      <AppLayout title="ポイント管理">
        <p className="text-muted-foreground text-center py-12">読み込み中...</p>
      </AppLayout>
    );
  }

  if (!isAdmin) {
    return (
      <AppLayout title="ポイント管理">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-sm text-muted-foreground">このページは管理者のみアクセス可能です。</p>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  // Detail view
  if (selectedUser) {
    return (
      <AppLayout title="ポイント内訳">
        <Button variant="ghost" size="sm" className="mb-4 gap-1" onClick={() => setSelectedUserId(null)}>
          <ChevronLeft className="h-4 w-4" />
          ユーザー一覧に戻る
        </Button>

        <Card className="mb-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {selectedUser.display_name || selectedUser.full_name || "未設定"}
            </CardTitle>
            <p className="text-xs text-muted-foreground break-all">{selectedUser.user_id}</p>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-2 text-center">
            <div className="p-3 rounded-lg bg-primary/10">
              <p className="text-[10px] text-muted-foreground">合計</p>
              <p className="text-lg font-bold text-primary">{selectedUser.total_points.toLocaleString()}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted">
              <p className="text-[10px] text-muted-foreground">獲得</p>
              <p className="text-lg font-bold">+{selectedUser.earn_points.toLocaleString()}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted">
              <p className="text-[10px] text-muted-foreground">使用</p>
              <p className="text-lg font-bold">{selectedUser.spend_points.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">履歴 ({userEntries.length}件)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {userEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">履歴はありません</p>
            ) : (
              userEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="p-3 rounded-lg border bg-card flex items-start justify-between gap-2"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={entry.points >= 0 ? "default" : "secondary"} className="text-[10px]">
                        {entry.type}
                      </Badge>
                      <span
                        className={`text-sm font-bold ${
                          entry.points >= 0 ? "text-primary" : "text-destructive"
                        }`}
                      >
                        {entry.points >= 0 ? "+" : ""}
                        {entry.points.toLocaleString()}pt
                      </span>
                    </div>
                    <p className="text-xs text-foreground truncate">{entry.description}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {new Date(entry.created_at).toLocaleString("ja-JP")}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => openEdit(entry)}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-destructive"
                      onClick={() => setDeleteEntry(entry)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={!!editEntry} onOpenChange={(open) => !open && setEditEntry(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>ポイント履歴を編集</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label htmlFor="edit-points">ポイント (マイナス可)</Label>
                <Input
                  id="edit-points"
                  type="number"
                  value={editPoints}
                  onChange={(e) => setEditPoints(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="edit-desc">説明</Label>
                <Input
                  id="edit-desc"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditEntry(null)} disabled={saving}>
                キャンセル
              </Button>
              <Button onClick={handleSaveEdit} disabled={saving}>
                {saving ? "保存中..." : "保存"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirm */}
        <AlertDialog open={!!deleteEntry} onOpenChange={(open) => !open && setDeleteEntry(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>このポイント履歴を削除しますか？</AlertDialogTitle>
              <AlertDialogDescription>
                {deleteEntry && (
                  <>
                    <strong>{deleteEntry.points >= 0 ? "+" : ""}{deleteEntry.points}pt</strong>
                    {" - "}
                    {deleteEntry.description}
                    <br />
                    この操作は取り消せません。
                  </>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>キャンセル</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} disabled={deleting}>
                {deleting ? "削除中..." : "削除する"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </AppLayout>
    );
  }

  // List view
  return (
    <AppLayout title="ポイント管理">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <Card>
          <CardContent className="p-3 text-center">
            <Users className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
            <p className="text-[10px] text-muted-foreground">登録ユーザー</p>
            <p className="text-base font-bold">{totals.totalUsers}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <Users className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
            <p className="text-[10px] text-muted-foreground">獲得経験者</p>
            <p className="text-base font-bold">{totals.userCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <Coins className="h-4 w-4 mx-auto mb-1 text-primary" />
            <p className="text-[10px] text-muted-foreground">総ポイント</p>
            <p className="text-base font-bold text-primary">{totals.total.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="名前・都道府県・IDで検索"
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* User list */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <p className="text-center text-muted-foreground py-8 text-sm">読み込み中...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">ユーザー</TableHead>
                  <TableHead className="text-xs text-right">合計pt</TableHead>
                  <TableHead className="text-xs text-right">件数</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((s) => (
                  <TableRow
                    key={s.user_id}
                    className="cursor-pointer"
                    onClick={() => setSelectedUserId(s.user_id)}
                  >
                    <TableCell className="py-2">
                      <p className="text-sm font-medium truncate max-w-[180px]">
                        {s.display_name || s.full_name || "未設定"}
                      </p>
                      <p className="text-[10px] text-muted-foreground">{s.prefecture || "—"}</p>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="text-sm font-bold text-primary">
                        {s.total_points.toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {s.entry_count}
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-sm text-muted-foreground py-6">
                      該当するユーザーがいません
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </AppLayout>
  );
};

export default AdminPointsPage;
