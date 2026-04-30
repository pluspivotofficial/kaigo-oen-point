import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/contexts/AuthContext";
import {
  ArrowLeft,
  Shield,
  Ban,
  Plus,
  Minus,
  Save,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";

interface UserDetail {
  user_id: string;
  display_name: string | null;
  email: string | null;
  prefecture: string | null;
  phone_number: string | null;
  is_admin: boolean;
  is_banned: boolean;
  ban_reason: string | null;
  created_at: string;
  total_points: number;
}

interface PointEntry {
  id: string;
  points: number;
  description: string;
  reason: string | null;
  type: string;
  admin_action: boolean;
  created_at: string;
}

const AdminUserDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  const [user, setUser] = useState<UserDetail | null>(null);
  const [points, setPoints] = useState<PointEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Profile edit form
  const [displayName, setDisplayName] = useState("");
  const [prefecture, setPrefecture] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // Point operation form
  const [opType, setOpType] = useState<"add" | "subtract">("add");
  const [opAmount, setOpAmount] = useState("");
  const [opReason, setOpReason] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [executingOp, setExecutingOp] = useState(false);

  // BAN form
  const [banReasonInput, setBanReasonInput] = useState("");
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [unbanDialogOpen, setUnbanDialogOpen] = useState(false);
  const [executingBan, setExecutingBan] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetchData();
  }, [id]);

  const fetchData = async () => {
    if (!id) return;
    setLoading(true);

    const { data: profile, error: pErr } = await supabase
      .from("profiles")
      .select(
        "user_id, display_name, email, prefecture, phone_number, is_admin, is_banned, ban_reason, created_at"
      )
      .eq("user_id", id)
      .single();

    if (pErr || !profile) {
      console.error("Failed to fetch profile", pErr);
      toast({
        title: "ユーザーが見つかりません",
        variant: "destructive",
      });
      navigate("/admin/users");
      return;
    }

    // Recent 20 + total balance
    const [{ data: pointsData }, { data: allPoints }] = await Promise.all([
      supabase
        .from("points_history")
        .select("id, points, description, reason, type, admin_action, created_at")
        .eq("user_id", id)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase.from("points_history").select("points").eq("user_id", id),
    ]);

    const total = (allPoints ?? []).reduce((sum, p) => sum + p.points, 0);

    setUser({
      user_id: profile.user_id,
      display_name: profile.display_name,
      email: profile.email,
      prefecture: profile.prefecture,
      phone_number: profile.phone_number,
      is_admin: profile.is_admin ?? false,
      is_banned: profile.is_banned ?? false,
      ban_reason: profile.ban_reason,
      created_at: profile.created_at,
      total_points: total,
    });
    setPoints((pointsData ?? []) as PointEntry[]);

    setDisplayName(profile.display_name ?? "");
    setPrefecture(profile.prefecture ?? "");
    setPhoneNumber(profile.phone_number ?? "");

    setLoading(false);
  };

  const handleSaveProfile = async () => {
    if (!id) return;
    setSavingProfile(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: displayName.trim() || null,
        prefecture: prefecture.trim() || null,
        phone_number: phoneNumber.trim() || null,
      })
      .eq("user_id", id);

    if (error) {
      toast({
        title: "保存失敗",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "プロフィールを保存しました" });
      await fetchData();
    }
    setSavingProfile(false);
  };

  const handleExecuteOp = async () => {
    if (!id || !currentUser || !user) return;
    const amount = parseInt(opAmount, 10);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast({
        title: "有効な数値を入力してください",
        variant: "destructive",
      });
      return;
    }
    if (!opReason.trim()) {
      toast({ title: "理由を入力してください", variant: "destructive" });
      return;
    }
    if (opType === "subtract" && amount > user.total_points) {
      toast({
        title: "残高不足",
        description: `減算量(${amount}pt) > 残高(${user.total_points}pt)`,
        variant: "destructive",
      });
      return;
    }

    setExecutingOp(true);
    const signedAmount = opType === "add" ? amount : -amount;
    const description =
      opType === "add"
        ? `管理者によるポイント加算 (+${amount})`
        : `管理者によるポイント減算 (-${amount})`;

    const { error } = await supabase.from("points_history").insert({
      user_id: id,
      points: signedAmount,
      description,
      reason: opReason.trim(),
      type: opType === "add" ? "earn" : "spend",
      admin_action: true,
      admin_user_id: currentUser.id,
    });

    if (error) {
      toast({
        title: "操作失敗",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "ポイント操作完了",
        description,
      });
      setOpAmount("");
      setOpReason("");
      setConfirmOpen(false);
      await fetchData();
    }
    setExecutingOp(false);
  };

  const handleBan = async () => {
    if (!id || !currentUser || !user) return;
    if (!banReasonInput.trim()) {
      toast({ title: "凍結理由を入力してください", variant: "destructive" });
      return;
    }
    setExecutingBan(true);

    // 1. profiles を更新
    const { error: updateErr } = await supabase
      .from("profiles")
      .update({
        is_banned: true,
        ban_reason: banReasonInput.trim(),
        banned_at: new Date().toISOString(),
        banned_by: currentUser.id,
      })
      .eq("user_id", id);

    if (updateErr) {
      toast({
        title: "凍結DB更新に失敗",
        description: updateErr.message,
        variant: "destructive",
      });
      setExecutingBan(false);
      return;
    }

    // 2. Edge Function でセッション破棄を試みる
    let signOutWarning = "";
    try {
      const { error: fnErr } = await supabase.functions.invoke(
        "banned-user-signout",
        {
          body: { user_id: id },
        }
      );
      if (fnErr) {
        signOutWarning = `セッション破棄失敗: ${fnErr.message}。次回トークン更新時(最大1時間)に弾かれます。`;
      }
    } catch (e) {
      signOutWarning = `セッション破棄関数未デプロイか通信失敗。次回トークン更新時(最大1時間)に弾かれます。`;
    }

    toast({
      title: "アカウントを凍結しました",
      description: signOutWarning || "セッション破棄完了、対象ユーザーは即時ログアウトされます。",
      variant: signOutWarning ? "destructive" : "default",
    });

    setBanReasonInput("");
    setBanDialogOpen(false);
    setExecutingBan(false);
    await fetchData();
  };

  const handleUnban = async () => {
    if (!id) return;
    setExecutingBan(true);

    const { error } = await supabase
      .from("profiles")
      .update({
        is_banned: false,
        ban_reason: null,
        banned_at: null,
        banned_by: null,
      })
      .eq("user_id", id);

    if (error) {
      toast({
        title: "凍結解除失敗",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "アカウント凍結を解除しました" });
      setUnbanDialogOpen(false);
      await fetchData();
    }
    setExecutingBan(false);
  };

  if (loading || !user) {
    return (
      <AdminLayout title="ユーザー詳細">
        <p className="text-center py-12 text-muted-foreground">
          読み込み中...
        </p>
      </AdminLayout>
    );
  }

  const isSelf = currentUser?.id === user.user_id;
  const opAmountNum = parseInt(opAmount, 10) || 0;
  const previewBalance =
    opType === "add"
      ? user.total_points + opAmountNum
      : user.total_points - opAmountNum;

  return (
    <AdminLayout title="ユーザー詳細">
      <div className="space-y-4 max-w-4xl">
        {/* 戻るボタン */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/admin/users")}
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          ユーザー一覧に戻る
        </Button>

        {/* ヘッダー: 基本情報 */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start gap-4 flex-wrap">
              <div>
                <CardTitle className="text-xl">
                  {user.display_name || "(表示名未設定)"}
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {user.email}
                </p>
                <p className="text-xs text-muted-foreground mt-1 font-mono">
                  user_id: {user.user_id}
                </p>
              </div>
              <div className="flex gap-1 flex-wrap">
                {user.is_admin && (
                  <Badge variant="default">
                    <Shield className="h-3 w-3 mr-1" />管理者
                  </Badge>
                )}
                {user.is_banned && (
                  <Badge variant="destructive">
                    <Ban className="h-3 w-3 mr-1" />凍結
                  </Badge>
                )}
                {isSelf && <Badge variant="outline">自分</Badge>}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">残高</p>
                <p className="text-2xl font-bold">
                  {user.total_points.toLocaleString()}
                  <span className="text-sm font-normal ml-1">pt</span>
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">登録日</p>
                <p>{format(new Date(user.created_at), "yyyy/MM/dd")}</p>
              </div>
              <div>
                <p className="text-muted-foreground">都道府県</p>
                <p>{user.prefecture || "未設定"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* プロフィール編集 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">プロフィール編集</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="display_name">表示名</Label>
                <Input
                  id="display_name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="prefecture">都道府県</Label>
                <Input
                  id="prefecture"
                  value={prefecture}
                  onChange={(e) => setPrefecture(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="phone_number">電話番号</Label>
                <Input
                  id="phone_number"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                />
              </div>
            </div>
            <Button onClick={handleSaveProfile} disabled={savingProfile}>
              <Save className="h-4 w-4 mr-1" />
              {savingProfile ? "保存中..." : "プロフィールを保存"}
            </Button>
          </CardContent>
        </Card>

        {/* ポイント操作 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">ポイント手動操作</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>操作種別</Label>
              <RadioGroup
                value={opType}
                onValueChange={(v) => setOpType(v as "add" | "subtract")}
                className="flex gap-4 mt-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="add" id="op-add" />
                  <Label
                    htmlFor="op-add"
                    className="font-normal cursor-pointer flex items-center"
                  >
                    <Plus className="h-4 w-4 mr-1" />加算
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="subtract" id="op-sub" />
                  <Label
                    htmlFor="op-sub"
                    className="font-normal cursor-pointer flex items-center"
                  >
                    <Minus className="h-4 w-4 mr-1" />減算
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div>
              <Label htmlFor="op-amount">数量 (pt)</Label>
              <Input
                id="op-amount"
                type="number"
                min={1}
                value={opAmount}
                onChange={(e) => setOpAmount(e.target.value)}
                placeholder="例: 100"
              />
              {opAmount && opAmountNum > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  実行後の残高: {user.total_points.toLocaleString()} →{" "}
                  <span className="font-bold">
                    {previewBalance.toLocaleString()}
                  </span>{" "}
                  pt
                  {opType === "subtract" &&
                    opAmountNum > user.total_points && (
                      <span className="text-destructive ml-2">
                        ⚠ 残高超過
                      </span>
                    )}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="op-reason">理由 (管理者メモ、必須)</Label>
              <Textarea
                id="op-reason"
                value={opReason}
                onChange={(e) => setOpReason(e.target.value)}
                placeholder="例: シフト記録漏れ分の補填、ユーザー問い合わせで確認済"
                rows={2}
              />
            </div>

            <Button
              onClick={() => setConfirmOpen(true)}
              disabled={
                !opAmount ||
                !opReason.trim() ||
                opAmountNum <= 0 ||
                (opType === "subtract" && opAmountNum > user.total_points)
              }
              variant={opType === "add" ? "default" : "destructive"}
            >
              {opType === "add" ? (
                <Plus className="h-4 w-4 mr-1" />
              ) : (
                <Minus className="h-4 w-4 mr-1" />
              )}
              {opType === "add" ? "加算" : "減算"}を実行
            </Button>
          </CardContent>
        </Card>

        {/* BAN セクション */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Ban className="h-4 w-4" />
              アカウント凍結
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {user.is_banned ? (
              <>
                <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
                  <p className="font-semibold text-destructive">凍結中</p>
                  <p className="mt-1 text-muted-foreground">
                    理由: {user.ban_reason || "(未設定)"}
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setUnbanDialogOpen(true)}
                  disabled={isSelf}
                >
                  凍結を解除
                </Button>
                {isSelf && (
                  <p className="text-xs text-muted-foreground">
                    自分自身の凍結状態は変更できません
                  </p>
                )}
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  凍結すると、対象ユーザーはアプリにログインできなくなります。
                  既存セッションは Edge Function 経由で破棄されます。
                </p>
                <Button
                  variant="destructive"
                  onClick={() => setBanDialogOpen(true)}
                  disabled={isSelf}
                >
                  <Ban className="h-4 w-4 mr-1" />
                  アカウントを凍結
                </Button>
                {isSelf && (
                  <p className="text-xs text-muted-foreground">
                    自分自身は凍結できません
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* 直近のポイント履歴 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              直近のポイント履歴 (最新20件)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>日時</TableHead>
                  <TableHead>説明</TableHead>
                  <TableHead className="text-right">変動</TableHead>
                  <TableHead>種別</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {points.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-center py-8 text-muted-foreground"
                    >
                      履歴なし
                    </TableCell>
                  </TableRow>
                ) : (
                  points.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="text-xs whitespace-nowrap">
                        {format(new Date(p.created_at), "MM/dd HH:mm")}
                      </TableCell>
                      <TableCell className="text-sm">
                        <div>{p.description}</div>
                        {p.admin_action && p.reason && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            理由: {p.reason}
                          </p>
                        )}
                      </TableCell>
                      <TableCell
                        className={`text-right font-mono ${
                          p.points >= 0 ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {p.points >= 0 ? "+" : ""}
                        {p.points.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={p.admin_action ? "default" : "outline"}
                        >
                          {p.admin_action ? "管理者" : p.type}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* BAN 確認ダイアログ (理由入力) */}
        <AlertDialog open={banDialogOpen} onOpenChange={setBanDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>アカウント凍結の確認</AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-3">
                  <div>
                    対象: {user.display_name || "(表示名未設定)"} (
                    {user.email})
                  </div>
                  <div className="text-xs text-destructive">
                    この操作で対象ユーザーは即時ログアウトされ、再ログインできなくなります。
                  </div>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-2 py-2">
              <Label htmlFor="ban-reason">凍結理由 (管理者メモ、必須)</Label>
              <Textarea
                id="ban-reason"
                value={banReasonInput}
                onChange={(e) => setBanReasonInput(e.target.value)}
                placeholder="例: 規約違反 (虚偽申告) を確認、3回目の警告"
                rows={3}
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={executingBan}>
                キャンセル
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleBan}
                disabled={executingBan || !banReasonInput.trim()}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {executingBan ? "凍結処理中..." : "凍結を実行"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* 凍結解除ダイアログ */}
        <AlertDialog open={unbanDialogOpen} onOpenChange={setUnbanDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>凍結解除の確認</AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-2">
                  <div>
                    対象: {user.display_name || "(表示名未設定)"} (
                    {user.email})
                  </div>
                  <div className="text-xs text-muted-foreground">
                    凍結解除後、対象ユーザーは通常通りログイン・アプリ利用が可能になります。
                  </div>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={executingBan}>
                キャンセル
              </AlertDialogCancel>
              <AlertDialogAction onClick={handleUnban} disabled={executingBan}>
                {executingBan ? "解除中..." : "凍結解除"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* ポイント操作 確認ダイアログ */}
        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                ポイント{opType === "add" ? "加算" : "減算"}の確認
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-2">
                  <div>
                    対象: {user.display_name || "(表示名未設定)"} ({user.email})
                  </div>
                  <div>
                    {user.total_points.toLocaleString()} pt →{" "}
                    <span className="font-bold">
                      {previewBalance.toLocaleString()}
                    </span>{" "}
                    pt ({opType === "add" ? "+" : "-"}
                    {opAmountNum.toLocaleString()})
                  </div>
                  <div className="text-xs">理由: {opReason}</div>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={executingOp}>
                キャンセル
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleExecuteOp}
                disabled={executingOp}
                className={
                  opType === "subtract"
                    ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    : ""
                }
              >
                {executingOp ? "実行中..." : "実行する"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
};

export default AdminUserDetailPage;
