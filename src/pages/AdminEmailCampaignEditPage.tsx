import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ChevronLeft,
  Save,
  Trash2,
  AlertTriangle,
  Info,
  Send,
  Mail,
  Pencil,
  Eye,
  Code,
} from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import AdminLayout from "@/components/AdminLayout";
import EmailRichTextEditor from "@/components/admin/EmailRichTextEditor";
import { wrapWithSakuraTemplate } from "@/lib/emailTemplate";

type CampaignStatus = "draft" | "sending" | "sent" | "partial_failed" | "failed";

interface EmailCampaign {
  id: string;
  subject: string;
  body_html: string;
  body_text: string | null;
  status: CampaignStatus;
  sent_count: number;
  failed_count: number;
  created_at: string;
  updated_at: string;
  sent_at: string | null;
}

const statusBadgeProps = (
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

// プレビュー用のサンプル変数 (実際の送信値とは別)
const PREVIEW_VARS: Record<string, string> = {
  name: "山田 太郎",
  email: "example@kaigopoint.com",
  unsubscribe_url: "#preview-only",
};

const substitutePreview = (html: string): string =>
  html.replace(/\{\{(\w+)\}\}/g, (_, k) => PREVIEW_VARS[k] ?? `{{${k}}}`);

// HTML から簡易プレーンテキスト生成 (body_text に保存)
const htmlToPlainText = (html: string): string => {
  return html
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/h[1-6]>/gi, "\n\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<hr\s*\/?\s*>/gi, "\n---\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
};

const AdminEmailCampaignEditPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [campaign, setCampaign] = useState<EmailCampaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testSending, setTestSending] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // form state
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");

  useEffect(() => {
    if (!id) return;
    void (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("email_campaigns")
        .select(
          "id, subject, body_html, body_text, status, sent_count, failed_count, created_at, updated_at, sent_at"
        )
        .eq("id", id)
        .single();
      if (error || !data) {
        toast({
          title: "取得失敗",
          description: error?.message ?? "キャンペーンが見つかりません",
          variant: "destructive",
        });
        navigate("/admin/email-campaigns");
        return;
      }
      const c = data as EmailCampaign;
      setCampaign(c);
      setSubject(c.subject);
      setBodyHtml(c.body_html);
      setLoading(false);
    })();
  }, [id, navigate]);

  // バリデーション (配信停止リンクはテンプレ側で自動挿入)
  const validation = useMemo(() => {
    const errors: string[] = [];
    if (!subject.trim()) errors.push("件名が空です");
    if (!bodyHtml || bodyHtml === "<p></p>")
      errors.push("本文が空です");
    return {
      ok: errors.length === 0,
      errors,
    };
  }, [subject, bodyHtml]);

  const isLocked = campaign?.status === "sending";
  const hasSendHistory =
    campaign?.status === "sent" ||
    campaign?.status === "partial_failed" ||
    campaign?.status === "failed";

  // 内部用: 保存処理 (ボタンと "テスト送信" の両方から使う)
  const persistDraft = async (): Promise<boolean> => {
    if (!campaign) return false;
    const { error } = await supabase
      .from("email_campaigns")
      .update({
        subject: subject.trim(),
        body_html: bodyHtml,
        body_text: htmlToPlainText(bodyHtml),
      })
      .eq("id", campaign.id);
    if (error) {
      toast({
        title: "保存失敗",
        description: error.message,
        variant: "destructive",
      });
      return false;
    }
    setCampaign({
      ...campaign,
      subject: subject.trim(),
      body_html: bodyHtml,
      body_text: htmlToPlainText(bodyHtml),
      updated_at: new Date().toISOString(),
    });
    return true;
  };

  const handleSave = async () => {
    if (!campaign || !validation.ok) return;
    setSaving(true);
    const ok = await persistDraft();
    setSaving(false);
    if (ok) toast({ title: "保存しました" });
  };

  const handleTestSend = async () => {
    if (!campaign || !validation.ok) return;
    if (!user?.email) {
      toast({
        title: "送信先メアドが取得できません",
        description: "再ログインしてお試しください",
        variant: "destructive",
      });
      return;
    }
    setTestSending(true);

    // まず最新内容を保存 (Edge Function は DB の body を読むため)
    const saved = await persistDraft();
    if (!saved) {
      setTestSending(false);
      return;
    }

    // Edge Function 呼出
    const { data, error } = await supabase.functions.invoke(
      "send-campaign-email",
      {
        body: {
          mode: "test",
          campaign_id: campaign.id,
          test_recipient: user.email,
        },
      }
    );
    setTestSending(false);

    if (error) {
      toast({
        title: "テスト送信に失敗しました",
        description: error.message ?? "Edge Function 呼出エラー",
        variant: "destructive",
      });
      return;
    }
    if (data?.success === false) {
      toast({
        title: "テスト送信に失敗しました",
        description: data?.error ?? "Resend API エラー",
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "テスト送信しました",
      description: `${user.email} 宛に送信完了。受信ボックスをご確認ください。`,
    });
  };

  const handleDelete = async () => {
    if (!campaign) return;
    setDeleting(true);
    const { error } = await supabase
      .from("email_campaigns")
      .delete()
      .eq("id", campaign.id);
    setDeleting(false);
    if (error) {
      toast({
        title: "削除失敗",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    toast({ title: "削除しました" });
    navigate("/admin/email-campaigns");
  };

  if (loading || !campaign) {
    return (
      <AdminLayout title="メール配信 / 編集">
        <p className="text-muted-foreground">読み込み中...</p>
      </AdminLayout>
    );
  }

  const badge = statusBadgeProps(campaign.status);

  return (
    <AdminLayout title="メール配信 / 編集">
      <div className="space-y-4">
        {/* 戻る + ヘッダー */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/admin/email-campaigns")}
            className="gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            一覧に戻る
          </Button>
          <div className="flex items-center gap-2">
            <Badge variant={badge.variant}>{badge.label}</Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDeleteOpen(true)}
              disabled={isLocked}
              className="text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              削除
            </Button>
          </div>
        </div>

        {/* 状態に応じたバナー */}
        {isLocked && (
          <Card className="border-primary/40 bg-primary/5">
            <CardContent className="p-3 flex items-start gap-2 text-sm">
              <Info className="h-4 w-4 mt-0.5 text-primary shrink-0" />
              <div>
                <p className="font-medium">送信中のため編集できません</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  送信が完了するまでお待ちください (10分以上経過した場合は再開可能)。
                </p>
              </div>
            </CardContent>
          </Card>
        )}
        {hasSendHistory && (
          <Card className="border-amber-300 bg-amber-50/60 dark:bg-amber-950/20">
            <CardContent className="p-3 flex items-start gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 mt-0.5 text-amber-600 shrink-0" />
              <div>
                <p className="font-medium">既に送信履歴があります</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  送信成功 {campaign.sent_count} 件 / 失敗 {campaign.failed_count} 件 ({format(new Date(campaign.sent_at ?? campaign.updated_at), "yyyy/MM/dd HH:mm")})
                  。本文を編集して再送する場合、過去送信済の宛先には届きません(failed のみ再送)。
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 件名 */}
        <Card>
          <CardContent className="p-4">
            <Label htmlFor="subject" className="mb-1.5 block">
              件名 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="例: 4月のお知らせ - 介護職応援ポイントから"
              disabled={isLocked}
              maxLength={200}
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              {subject.length} / 200 文字
              {subject.length > 70 && (
                <span className="ml-2 text-amber-600">
                  ※ 70文字を超えると Gmail/iOS Mail で省略表示されることがあります
                </span>
              )}
            </p>
          </CardContent>
        </Card>

        {/* 本文 (Tabs: 編集 / プレビュー / HTMLコード) */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <div>
              <Label className="block">
                本文 <span className="text-destructive">*</span>
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                配信停止リンクとフッター(運営情報・著作表記)は送信時に自動で付与されます。
                本文には自由に書いてください。
              </p>
            </div>
            <Tabs defaultValue="edit" className="w-full">
              <TabsList>
                <TabsTrigger value="edit" className="gap-1.5">
                  <Pencil className="h-3.5 w-3.5" />
                  編集
                </TabsTrigger>
                <TabsTrigger value="preview" className="gap-1.5">
                  <Eye className="h-3.5 w-3.5" />
                  プレビュー
                </TabsTrigger>
                <TabsTrigger value="code" className="gap-1.5">
                  <Code className="h-3.5 w-3.5" />
                  HTML コード
                </TabsTrigger>
              </TabsList>

              <TabsContent value="edit" className="mt-3">
                {isLocked ? (
                  <div
                    className="prose prose-sm max-w-none p-4 border rounded-lg bg-muted/30"
                    dangerouslySetInnerHTML={{ __html: bodyHtml }}
                  />
                ) : (
                  <EmailRichTextEditor
                    content={bodyHtml}
                    onChange={setBodyHtml}
                  />
                )}
              </TabsContent>

              <TabsContent value="preview" className="mt-3">
                <p className="text-[10px] text-muted-foreground mb-2">
                  プレビュー用変数: name=「山田 太郎」 / email=「example@kaigopoint.com」 /
                  配信停止リンク=ダミー。実際の送信ではテンプレ側で自動付与されます。
                </p>
                <iframe
                  title="メールプレビュー"
                  srcDoc={substitutePreview(wrapWithSakuraTemplate(bodyHtml))}
                  className="w-full min-h-[640px] rounded-lg border bg-white"
                  sandbox=""
                />
              </TabsContent>

              <TabsContent value="code" className="mt-3">
                <p className="text-[10px] text-muted-foreground mb-2">
                  実際に送信される完全な HTML(sakura テンプレート + 本文)。
                  Outlook / Gmail での崩れを確認するときに使います。
                </p>
                <Textarea
                  value={substitutePreview(wrapWithSakuraTemplate(bodyHtml))}
                  readOnly
                  className="font-mono text-xs min-h-[320px] bg-muted/30"
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* バリデーション結果 */}
        {!validation.ok && !isLocked && (
          <Card className="border-destructive/40 bg-destructive/5">
            <CardContent className="p-3 flex items-start gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 mt-0.5 text-destructive shrink-0" />
              <div className="space-y-1">
                <p className="font-medium text-destructive">保存前に修正が必要</p>
                <ul className="text-xs space-y-0.5 list-disc list-inside text-foreground/80">
                  {validation.errors.map((err) => (
                    <li key={err}>{err}</li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        )}

        {/* アクションバー */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              onClick={handleTestSend}
              disabled={
                saving || testSending || isLocked || !validation.ok || !user?.email
              }
              className="gap-1"
            >
              <Send className="h-4 w-4" />
              {testSending ? "送信中..." : "テスト送信"}
            </Button>
            {user?.email && (
              <span className="text-xs text-muted-foreground">
                送信先: {user.email}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-block">
                  <Button
                    disabled
                    aria-disabled
                    className="gap-1 opacity-60 cursor-not-allowed"
                  >
                    <Mail className="h-4 w-4" />
                    全員に送信 (Coming Soon)
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent side="top">
                本番送信は明日以降の予定です
              </TooltipContent>
            </Tooltip>
            <Button
              onClick={handleSave}
              disabled={saving || testSending || isLocked || !validation.ok}
              className="gap-1"
            >
              <Save className="h-4 w-4" />
              {saving ? "保存中..." : "下書き保存"}
            </Button>
          </div>
        </div>

        {/* 削除確認 */}
        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
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

export default AdminEmailCampaignEditPage;
