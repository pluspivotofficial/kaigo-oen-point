import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import RichTextEditor from "@/components/RichTextEditor";
import { Plus, Pencil, Trash2, Eye, EyeOff, ArrowLeft, FileText } from "lucide-react";

interface ColumnArticle {
  id: string;
  title: string;
  content: string;
  excerpt: string | null;
  thumbnail_url: string | null;
  category: string;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

const CATEGORIES = [
  { value: "care-tips", label: "介護のコツ" },
  { value: "health", label: "健康管理" },
  { value: "career", label: "キャリア" },
  { value: "lifestyle", label: "ライフスタイル" },
  { value: "news", label: "ニュース" },
  { value: "general", label: "その他" },
];

const AdminColumnsPage = () => {
  const { user, isAdmin, isAdminLoading } = useAuth();
  const navigate = useNavigate();
  const [articles, setArticles] = useState<ColumnArticle[]>([]);
  const [loading, setLoading] = useState(true);

  // Editor state
  const [editing, setEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [category, setCategory] = useState("general");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [isPublished, setIsPublished] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isAdminLoading) return;
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    loadArticles();
  }, [isAdmin, isAdminLoading]);

  const loadArticles = async () => {
    // Admins can see all articles (published + drafts) via the admin policy
    const { data } = await supabase
      .from("columns_articles")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setArticles(data as ColumnArticle[]);
    setLoading(false);
  };

  const resetForm = () => {
    setEditing(false);
    setEditId(null);
    setTitle("");
    setContent("");
    setExcerpt("");
    setCategory("general");
    setThumbnailUrl("");
    setIsPublished(false);
  };

  const handleEdit = (article: ColumnArticle) => {
    setEditing(true);
    setEditId(article.id);
    setTitle(article.title);
    setContent(article.content);
    setExcerpt(article.excerpt || "");
    setCategory(article.category);
    setThumbnailUrl(article.thumbnail_url || "");
    setIsPublished(article.is_published);
  };

  const handleSave = async () => {
    if (!user || !title.trim()) {
      toast({ title: "タイトルを入力してください", variant: "destructive" });
      return;
    }

    setSaving(true);
    const payload = {
      title,
      content,
      excerpt: excerpt || null,
      thumbnail_url: thumbnailUrl || null,
      category,
      is_published: isPublished,
      published_at: isPublished ? new Date().toISOString() : null,
      author_id: user.id,
    };

    if (editId) {
      const { data, error } = await supabase
        .from("columns_articles")
        .update(payload)
        .eq("id", editId)
        .select()
        .single();

      if (error) {
        toast({ title: "エラー", description: error.message, variant: "destructive" });
      } else {
        setArticles((prev) => prev.map((a) => a.id === editId ? (data as ColumnArticle) : a));
        toast({ title: "コラムを更新しました" });
        resetForm();
      }
    } else {
      const { data, error } = await supabase
        .from("columns_articles")
        .insert(payload)
        .select()
        .single();

      if (error) {
        toast({ title: "エラー", description: error.message, variant: "destructive" });
      } else {
        setArticles((prev) => [data as ColumnArticle, ...prev]);
        toast({ title: "コラムを作成しました" });
        resetForm();
      }
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("columns_articles").delete().eq("id", id);
    if (error) {
      toast({ title: "削除に失敗しました", description: error.message, variant: "destructive" });
    } else {
      setArticles((prev) => prev.filter((a) => a.id !== id));
      toast({ title: "コラムを削除しました" });
      if (editId === id) resetForm();
    }
  };

  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split(".").pop();
    const path = `thumbnails/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("column-images").upload(path, file);
    if (error) {
      toast({ title: "アップロードに失敗しました", variant: "destructive" });
      return;
    }
    const { data: { publicUrl } } = supabase.storage.from("column-images").getPublicUrl(path);
    setThumbnailUrl(publicUrl);
  };

  if (loading) {
    return (
      <AppLayout title="コラム管理">
        <p className="text-center text-muted-foreground py-12">読み込み中...</p>
      </AppLayout>
    );
  }

  if (!isAdmin) {
    return (
      <AppLayout title="コラム管理">
        <Card>
          <CardContent className="p-8 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">管理者権限が必要です</p>
            <Button variant="outline" className="mt-4" onClick={() => navigate("/")}>
              ホームに戻る
            </Button>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  if (editing) {
    return (
      <AppLayout title={editId ? "コラム編集" : "新規コラム"}>
        <Button variant="ghost" size="sm" className="mb-4" onClick={resetForm}>
          <ArrowLeft className="h-4 w-4 mr-1" /> 一覧に戻る
        </Button>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>タイトル</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="コラムのタイトル" />
          </div>

          <div className="space-y-2">
            <Label>カテゴリ</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>概要（一覧表示用）</Label>
            <Input value={excerpt} onChange={(e) => setExcerpt(e.target.value)} placeholder="コラムの概要を短く..." />
          </div>

          <div className="space-y-2">
            <Label>サムネイル画像</Label>
            <div className="flex items-center gap-3">
              <Input type="file" accept="image/*" onChange={handleThumbnailUpload} />
            </div>
            {thumbnailUrl && (
              <img src={thumbnailUrl} alt="thumbnail" className="h-24 w-auto rounded-lg object-cover mt-2" />
            )}
          </div>

          <div className="space-y-2">
            <Label>本文</Label>
            <RichTextEditor content={content} onChange={setContent} />
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border">
            <Switch checked={isPublished} onCheckedChange={setIsPublished} />
            <div>
              <p className="text-sm font-medium">{isPublished ? "公開" : "下書き"}</p>
              <p className="text-xs text-muted-foreground">
                {isPublished ? "ユーザーのホーム画面に表示されます" : "保存のみ。ユーザーには表示されません"}
              </p>
            </div>
          </div>

          <Button onClick={handleSave} className="w-full" size="lg" disabled={saving}>
            {saving ? "保存中..." : editId ? "更新する" : "作成する"}
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="コラム管理">
      <Button className="w-full mb-5" onClick={() => setEditing(true)}>
        <Plus className="h-4 w-4 mr-2" /> 新規コラム作成
      </Button>

      {articles.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">まだコラムがありません</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {articles.map((article) => (
            <Card key={article.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {article.thumbnail_url && (
                    <img
                      src={article.thumbnail_url}
                      alt=""
                      className="h-16 w-16 rounded-lg object-cover shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={article.is_published ? "default" : "secondary"} className="text-[10px]">
                        {article.is_published ? "公開中" : "下書き"}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        {CATEGORIES.find((c) => c.value === article.category)?.label || article.category}
                      </Badge>
                    </div>
                    <p className="font-semibold text-sm truncate">{article.title}</p>
                    {article.excerpt && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{article.excerpt}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {new Date(article.updated_at).toLocaleDateString("ja-JP")}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(article)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(article.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </AppLayout>
  );
};

export default AdminColumnsPage;
