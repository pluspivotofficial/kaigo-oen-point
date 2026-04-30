import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import {
  Plus,
  Pencil,
  Trash2,
  Sparkles,
  MapPin,
  Calendar,
} from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";

type CampaignType = "seven_day" | "prefecture";

interface Campaign {
  id: string;
  type: CampaignType;
  name: string;
  config: Record<string, any>;
  is_active: boolean;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

const PREFECTURES = [
  "北海道", "青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県",
  "茨城県", "栃木県", "群馬県", "埼玉県", "千葉県", "東京都", "神奈川県",
  "新潟県", "富山県", "石川県", "福井県", "山梨県", "長野県",
  "岐阜県", "静岡県", "愛知県", "三重県",
  "滋賀県", "京都府", "大阪府", "兵庫県", "奈良県", "和歌山県",
  "鳥取県", "島根県", "岡山県", "広島県", "山口県",
  "徳島県", "香川県", "愛媛県", "高知県",
  "福岡県", "佐賀県", "長崎県", "熊本県", "大分県", "宮崎県", "鹿児島県",
  "沖縄県",
];

const AdminCampaignsPage = () => {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit/Create dialog state
  const [editing, setEditing] = useState<Campaign | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Common form fields
  const [formType, setFormType] = useState<CampaignType>("seven_day");
  const [formName, setFormName] = useState("");
  const [formIsActive, setFormIsActive] = useState(false);
  const [formStartDate, setFormStartDate] = useState("");
  const [formEndDate, setFormEndDate] = useState("");

  // seven_day specific
  const [formPointsPerHour, setFormPointsPerHour] = useState("");

  // prefecture specific
  const [formPrefecture, setFormPrefecture] = useState("");
  const [formTargetHours, setFormTargetHours] = useState("");
  const [formBonusPoints, setFormBonusPoints] = useState("");

  // Delete dialog
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("campaigns")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      console.error(error);
      toast({
        title: "取得失敗",
        description: error.message,
        variant: "destructive",
      });
    }
    setCampaigns((data ?? []) as Campaign[]);
    setLoading(false);
  };

  const openNew = () => {
    setEditing(null);
    setFormType("seven_day");
    setFormName("");
    setFormIsActive(false);
    setFormStartDate("");
    setFormEndDate("");
    setFormPointsPerHour("");
    setFormPrefecture("");
    setFormTargetHours("");
    setFormBonusPoints("");
    setEditOpen(true);
  };

  const openEdit = (c: Campaign) => {
    setEditing(c);
    setFormType(c.type);
    setFormName(c.name);
    setFormIsActive(c.is_active);
    setFormStartDate(c.start_date ?? "");
    setFormEndDate(c.end_date ?? "");
    setFormPointsPerHour(c.config?.points_per_hour?.toString() ?? "");
    setFormPrefecture(c.config?.prefecture ?? "");
    setFormTargetHours(c.config?.target_hours?.toString() ?? "");
    setFormBonusPoints(c.config?.bonus_points?.toString() ?? "");
    setEditOpen(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      toast({
        title: "キャンペーン名を入力してください",
        variant: "destructive",
      });
      return;
    }

    let config: Record<string, any> = {};
    if (formType === "seven_day") {
      const pph = parseInt(formPointsPerHour, 10);
      if (!Number.isFinite(pph) || pph <= 0) {
        toast({
          title: "1時間あたりのポイントを正しく入力してください",
          variant: "destructive",
        });
        return;
      }
      config = { points_per_hour: pph };
    } else if (formType === "prefecture") {
      if (!formPrefecture) {
        toast({
          title: "都道府県を選択してください",
          variant: "destructive",
        });
        return;
      }
      const targetH = parseInt(formTargetHours, 10);
      const bonus = parseInt(formBonusPoints, 10);
      if (!Number.isFinite(targetH) || targetH <= 0) {
        toast({
          title: "目標稼働時間を正しく入力してください",
          variant: "destructive",
        });
        return;
      }
      if (!Number.isFinite(bonus) || bonus <= 0) {
        toast({
          title: "ボーナスポイントを正しく入力してください",
          variant: "destructive",
        });
        return;
      }
      config = {
        prefecture: formPrefecture,
        target_hours: targetH,
        bonus_points: bonus,
      };
    }

    setSaving(true);
    const payload = {
      type: formType,
      name: formName.trim(),
      config,
      is_active: formIsActive,
      start_date: formStartDate || null,
      end_date: formEndDate || null,
    };

    const { error } = editing
      ? await supabase
          .from("campaigns")
          .update(payload)
          .eq("id", editing.id)
      : await supabase
          .from("campaigns")
          .insert({ ...payload, created_by: user?.id ?? null });

    if (error) {
      toast({
        title: "保存失敗",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: editing
          ? "キャンペーンを更新しました"
          : "キャンペーンを作成しました",
      });
      setEditOpen(false);
      await fetchCampaigns();
    }
    setSaving(false);
  };

  const handleToggleActive = async (c: Campaign) => {
    const { error } = await supabase
      .from("campaigns")
      .update({ is_active: !c.is_active })
      .eq("id", c.id);
    if (error) {
      toast({
        title: "切替失敗",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: !c.is_active ? "有効化しました" : "無効化しました" });
      await fetchCampaigns();
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    const { error } = await supabase
      .from("campaigns")
      .delete()
      .eq("id", deleteId);
    if (error) {
      toast({
        title: "削除失敗",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "キャンペーンを削除しました" });
      setDeleteId(null);
      await fetchCampaigns();
    }
    setDeleting(false);
  };

  const renderConfigSummary = (c: Campaign) => {
    if (c.type === "seven_day") {
      return `1時間 = ${c.config?.points_per_hour ?? "?"} pt`;
    }
    if (c.type === "prefecture") {
      return `${c.config?.prefecture ?? "?"} / 目標 ${c.config?.target_hours ?? "?"}h で ${c.config?.bonus_points ?? "?"}pt`;
    }
    return "—";
  };

  const formatDateRange = (start: string | null, end: string | null) => {
    if (!start && !end) return "期間なし";
    const s = start ? format(new Date(start), "yyyy/MM/dd") : "—";
    const e = end ? format(new Date(end), "yyyy/MM/dd") : "—";
    return `${s} 〜 ${e}`;
  };

  return (
    <AdminLayout title="キャンペーン管理">
      <div className="space-y-4">
        <div className="flex justify-between items-center gap-2 flex-wrap">
          <p className="text-sm text-muted-foreground">
            ポイント加算キャンペーン (登録7日間 / 都道府県別) の管理
          </p>
          <Button onClick={openNew}>
            <Plus className="h-4 w-4 mr-1" />
            新規キャンペーン
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <p className="text-center py-12 text-muted-foreground">
                読み込み中...
              </p>
            ) : campaigns.length === 0 ? (
              <div className="text-center py-12">
                <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">キャンペーンがありません</p>
                <p className="text-xs text-muted-foreground mt-1">
                  「新規キャンペーン」から作成できます
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>名前</TableHead>
                    <TableHead>種別</TableHead>
                    <TableHead>設定</TableHead>
                    <TableHead>期間</TableHead>
                    <TableHead>有効</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {c.type === "seven_day" ? (
                            <>
                              <Calendar className="h-3 w-3 mr-1" />7日間
                            </>
                          ) : (
                            <>
                              <MapPin className="h-3 w-3 mr-1" />都道府県
                            </>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {renderConfigSummary(c)}
                      </TableCell>
                      <TableCell className="text-xs whitespace-nowrap">
                        {formatDateRange(c.start_date, c.end_date)}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={c.is_active}
                          onCheckedChange={() => handleToggleActive(c)}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(c)}
                          aria-label="編集"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteId(c.id)}
                          className="text-destructive"
                          aria-label="削除"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* New / Edit Dialog */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editing ? "キャンペーン編集" : "新規キャンペーン"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              {/* Type */}
              <div>
                <Label>種別</Label>
                <RadioGroup
                  value={formType}
                  onValueChange={(v) => setFormType(v as CampaignType)}
                  disabled={!!editing}
                  className="flex gap-4 mt-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="seven_day" id="t-seven" />
                    <Label
                      htmlFor="t-seven"
                      className="font-normal cursor-pointer"
                    >
                      登録7日間
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="prefecture" id="t-pref" />
                    <Label
                      htmlFor="t-pref"
                      className="font-normal cursor-pointer"
                    >
                      都道府県
                    </Label>
                  </div>
                </RadioGroup>
                {editing && (
                  <p className="text-xs text-muted-foreground mt-1">
                    編集中は種別変更不可
                  </p>
                )}
              </div>

              {/* Name */}
              <div>
                <Label htmlFor="c-name">キャンペーン名 *</Label>
                <Input
                  id="c-name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder={
                    formType === "seven_day"
                      ? "例: 登録7日間ボーナス"
                      : "例: 東京都チャレンジ"
                  }
                />
              </div>

              {/* Type-specific fields */}
              {formType === "seven_day" && (
                <div>
                  <Label htmlFor="c-pph">1時間あたりポイント *</Label>
                  <Input
                    id="c-pph"
                    type="number"
                    min={1}
                    value={formPointsPerHour}
                    onChange={(e) => setFormPointsPerHour(e.target.value)}
                    placeholder="例: 10"
                  />
                </div>
              )}

              {formType === "prefecture" && (
                <>
                  <div>
                    <Label htmlFor="c-pref">都道府県 *</Label>
                    <Select
                      value={formPrefecture}
                      onValueChange={setFormPrefecture}
                    >
                      <SelectTrigger id="c-pref">
                        <SelectValue placeholder="選択してください" />
                      </SelectTrigger>
                      <SelectContent>
                        {PREFECTURES.map((p) => (
                          <SelectItem key={p} value={p}>
                            {p}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="c-target">目標稼働時間 (h) *</Label>
                    <Input
                      id="c-target"
                      type="number"
                      min={1}
                      value={formTargetHours}
                      onChange={(e) => setFormTargetHours(e.target.value)}
                      placeholder="例: 1000"
                    />
                  </div>
                  <div>
                    <Label htmlFor="c-bonus">達成時ボーナスポイント *</Label>
                    <Input
                      id="c-bonus"
                      type="number"
                      min={1}
                      value={formBonusPoints}
                      onChange={(e) => setFormBonusPoints(e.target.value)}
                      placeholder="例: 50"
                    />
                  </div>
                </>
              )}

              {/* Date range */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="c-start">開始日 (任意)</Label>
                  <Input
                    id="c-start"
                    type="date"
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="c-end">終了日 (任意)</Label>
                  <Input
                    id="c-end"
                    type="date"
                    value={formEndDate}
                    onChange={(e) => setFormEndDate(e.target.value)}
                  />
                </div>
              </div>

              {/* is_active */}
              <div className="flex items-center justify-between">
                <Label htmlFor="c-active" className="cursor-pointer">
                  作成/更新後すぐ有効化
                </Label>
                <Switch
                  id="c-active"
                  checked={formIsActive}
                  onCheckedChange={setFormIsActive}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setEditOpen(false)}
                disabled={saving}
              >
                キャンセル
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "保存中..." : "保存"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirm */}
        <AlertDialog
          open={!!deleteId}
          onOpenChange={(open) => !open && setDeleteId(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>キャンペーンを削除</AlertDialogTitle>
              <AlertDialogDescription>
                このキャンペーンを完全に削除します。元に戻せません。
                <br />
                データを残したい場合は「無効化」(Switch OFF) をご利用ください。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>
                キャンセル
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={deleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleting ? "削除中..." : "削除する"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
};

export default AdminCampaignsPage;
