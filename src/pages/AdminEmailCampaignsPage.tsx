import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Plus, Mail, Pencil, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";

type CampaignStatus = "draft" | "sending" | "sent" | "partial_failed" | "failed";

interface EmailCampaign {
  id: string;
  subject: string;
  status: CampaignStatus;
  sent_count: number;
  failed_count: number;
  created_at: string;
  sent_at: string | null;
}

const statusBadge = (
  status: CampaignStatus
): { label: string; variant: "default" | "secondary" | "destructive" | "outline" } => {
  switch (status) {
    case "draft":
      return { label: "下書き", variant: "secondary" };
    case "sending":
      return { label: "送信中", variant: "default" };
    case "sent":
      return { label: "送信完了", variant: "outline" };
    case "partial_failed":
      return { label: "一部失敗", variant: "destructive" };
    case "failed":
      return { label: "失敗", variant: "destructive" };
  }
};

const AdminEmailCampaignsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchCampaigns = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("email_campaigns")
      .select("id, subject, status, sent_count, failed_count, created_at, sent_at")
      .order("created_at", { ascending: false });
    if (error) {
      toast({
        title: "取得失敗",
        description: error.message,
        variant: "destructive",
      });
    }
    setCampaigns((data ?? []) as EmailCampaign[]);
    setLoading(false);
  };

  useEffect(() => {
    void fetchCampaigns();
  }, []);

  const handleCreateNew = async () => {
    if (!user) return;
    setCreating(true);
    const { data, error } = await supabase
      .from("email_campaigns")
      .insert({
        subject: "(無題)",
        body_html: "<p></p>",
        body_text: null,
        target_filter: { type: "all" },
        status: "draft",
        created_by: user.id,
      })
      .select("id")
      .single();
    setCreating(false);
    if (error || !data) {
      toast({
        title: "作成失敗",
        description: error?.message ?? "不明なエラー",
        variant: "destructive",
      });
      return;
    }
    navigate(`/admin/email-campaigns/${data.id}`);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    const { error } = await supabase
      .from("email_campaigns")
      .delete()
      .eq("id", deleteId);
    setDeleting(false);
    if (error) {
      toast({
        title: "削除失敗",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    toast({ title: "キャンペーンを削除しました" });
    setDeleteId(null);
    await fetchCampaigns();
  };

  const formatDateTime = (iso: string | null) =>
    iso ? format(new Date(iso), "yyyy/MM/dd HH:mm") : "—";

  return (
    <AdminLayout title="メール配信">
      <div className="space-y-4">
        <div className="flex justify-between items-center gap-2 flex-wrap">
          <p className="text-sm text-muted-foreground">
            登録ユーザー宛の一斉メール配信を作成・管理します。
          </p>
          <Button onClick={handleCreateNew} disabled={creating}>
            <Plus className="h-4 w-4 mr-1" />
            {creating ? "作成中..." : "新規作成"}
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
                <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">
                  まだメールキャンペーンがありません
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  「新規作成」から作成できます
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>件名</TableHead>
                    <TableHead className="w-24">状態</TableHead>
                    <TableHead className="w-28 text-right">送信成功</TableHead>
                    <TableHead className="w-24 text-right">失敗</TableHead>
                    <TableHead className="w-36">作成</TableHead>
                    <TableHead className="w-36">送信日時</TableHead>
                    <TableHead className="w-24 text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.map((c) => {
                    const badge = statusBadge(c.status);
                    return (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium max-w-[280px] truncate">
                          {c.subject || "(無題)"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={badge.variant}>{badge.label}</Badge>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {c.sent_count}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {c.failed_count > 0 ? (
                            <span className="text-destructive">{c.failed_count}</span>
                          ) : (
                            c.failed_count
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDateTime(c.created_at)}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDateTime(c.sent_at)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              navigate(`/admin/email-campaigns/${c.id}`)
                            }
                            aria-label="編集"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteId(c.id)}
                            disabled={c.status === "sending"}
                            className="text-destructive"
                            aria-label="削除"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <AlertDialog
          open={!!deleteId}
          onOpenChange={(open) => !open && setDeleteId(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>キャンペーンを削除</AlertDialogTitle>
              <AlertDialogDescription>
                このメールキャンペーンと配信ログを完全に削除します。元に戻せません。
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

export default AdminEmailCampaignsPage;
