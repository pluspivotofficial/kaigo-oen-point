import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Pencil, Trash2, Megaphone, Gift, CalendarCheck, Sparkles, Eye, EyeOff } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

interface Notice {
  id: string;
  title: string;
  description: string;
  category: string;
  is_published: boolean;
  display_order: number;
  created_at: string;
}

const CATEGORY_OPTIONS = [
  { value: "campaign", label: "キャンペーン", icon: Gift, color: "bg-reward-purple/10 text-reward-purple" },
  { value: "info", label: "お知らせ", icon: Megaphone, color: "bg-primary/10 text-primary" },
  { value: "event", label: "イベント", icon: CalendarCheck, color: "bg-primary/10 text-primary" },
  { value: "new", label: "NEW", icon: Sparkles, color: "bg-secondary/10 text-secondary" },
];

const getCategoryMeta = (cat: string) =>
  CATEGORY_OPTIONS.find((c) => c.value === cat) ?? CATEGORY_OPTIONS[1];

const AdminNoticesPage = () => {
  const navigate = useNavigate();
  const { user, isAdmin, isAdminLoading } = useAuth();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);

  const [editOpen, setEditOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Partial<Notice> | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isAdminLoading) return;
    if (!isAdmin) navigate("/");
  }, [isAdmin, isAdminLoading, navigate]);

  const fetchNotices = async () => {
    const { data } = await supabase
      .from("notices")
      .select("*")
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (data) setNotices(data as Notice[]);
    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin) fetchNotices();
  }, [isAdmin]);

  const openNew = () => {
    setEditing({ title: "", description: "", category: "info", is_published: true, display_order: notices.length + 1 });
    setEditOpen(true);
  };

  const openEdit = (n: Notice) => {
    setEditing(n);
    setEditOpen(true);
  };

  const handleSave = async () => {
    if (!editing?.title?.trim() || !editing?.description?.trim()) {
      toast({ title: "タイトルと説明文は必須です", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      title: editing.title!,
      description: editing.description!,
      category: editing.category ?? "info",
      is_published: editing.is_published ?? true,
      display_order: Number(editing.display_order ?? 0),
    };
    const { error } = editing.id
      ? await supabase.from("notices").update(payload).eq("id", editing.id)
      : await supabase.from("notices").insert(payload);
    setSaving(false);
    if (error) {
      toast({ title: "エラー", description: error.message, variant: "destructive" });
    } else {
      toast({ title: editing.id ? "更新しました" : "追加しました" });
      setEditOpen(false);
      setEditing(null);
      fetchNotices();
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("notices").delete().eq("id", deleteId);
    if (error) {
      toast({ title: "エラー", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "削除しました" });
      setDeleteId(null);
      fetchNotices();
    }
  };

  const togglePublish = async (n: Notice) => {
    const { error } = await supabase.from("notices").update({ is_published: !n.is_published }).eq("id", n.id);
    if (error) {
      toast({ title: "エラー", description: error.message, variant: "destructive" });
    } else {
      fetchNotices();
    }
  };

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background max-w-2xl mx-auto">
      <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-lg border-b border-border px-5 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("/")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-sm font-bold text-foreground flex-1">お知らせ・キャンペーン管理</h1>
        <Button size="sm" onClick={openNew} className="gap-1">
          <Plus className="h-4 w-4" /> 新規
        </Button>
      </header>

      <main className="px-5 py-4 space-y-3">
        {loading ? (
          <p className="text-center text-muted-foreground text-sm py-8">読み込み中...</p>
        ) : notices.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm py-8">お知らせはまだありません</p>
        ) : (
          notices.map((n) => {
            const meta = getCategoryMeta(n.category);
            const Icon = meta.icon;
            return (
              <Card key={n.id} className={!n.is_published ? "opacity-60" : ""}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0 ${meta.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">{meta.label}</Badge>
                        <span className="text-[10px] text-muted-foreground">表示順: {n.display_order}</span>
                        {!n.is_published && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">非公開</Badge>
                        )}
                      </div>
                      <p className="font-semibold text-sm leading-snug">{n.title}</p>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{n.description}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3 justify-end">
                    <Button size="sm" variant="outline" className="gap-1" onClick={() => togglePublish(n)}>
                      {n.is_published ? <><EyeOff className="h-3.5 w-3.5" /> 非公開に</> : <><Eye className="h-3.5 w-3.5" /> 公開</>}
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1" onClick={() => openEdit(n)}>
                      <Pencil className="h-3.5 w-3.5" /> 編集
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1 text-destructive" onClick={() => setDeleteId(n.id)}>
                      <Trash2 className="h-3.5 w-3.5" /> 削除
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </main>

      {/* Edit/Create Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "お知らせを編集" : "新しいお知らせ"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">カテゴリー</Label>
              <Select
                value={editing?.category ?? "info"}
                onValueChange={(v) => setEditing((e) => ({ ...e, category: v }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">タイトル</Label>
              <Input
                value={editing?.title ?? ""}
                onChange={(e) => setEditing((p) => ({ ...p, title: e.target.value }))}
                placeholder="例: 春の紹介キャンペーン開催中！"
              />
            </div>
            <div>
              <Label className="text-xs">説明文</Label>
              <Textarea
                rows={4}
                value={editing?.description ?? ""}
                onChange={(e) => setEditing((p) => ({ ...p, description: e.target.value }))}
                placeholder="お知らせの内容を入力..."
              />
            </div>
            <div>
              <Label className="text-xs">表示順 (小さいほど上)</Label>
              <Input
                type="number"
                value={editing?.display_order ?? 0}
                onChange={(e) => setEditing((p) => ({ ...p, display_order: Number(e.target.value) }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">公開する</Label>
              <Switch
                checked={editing?.is_published ?? true}
                onCheckedChange={(v) => setEditing((p) => ({ ...p, is_published: v }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>キャンセル</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "保存中..." : "保存"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>削除しますか？</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">この操作は取り消せません。</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>キャンセル</Button>
            <Button variant="destructive" onClick={handleDelete}>削除する</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminNoticesPage;
