import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { ArrowLeft, Calendar } from "lucide-react";

const CATEGORIES: Record<string, string> = {
  "care-tips": "介護のコツ",
  "health": "健康管理",
  "career": "キャリア",
  "lifestyle": "ライフスタイル",
  "news": "ニュース",
  "general": "その他",
};

interface ColumnDetail {
  id: string;
  title: string;
  content: string;
  category: string;
  thumbnail_url: string | null;
  published_at: string | null;
}

const ColumnDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [article, setArticle] = useState<ColumnDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    supabase
      .from("columns_articles")
      .select("id, title, content, category, thumbnail_url, published_at")
      .eq("id", id)
      .eq("is_published", true)
      .single()
      .then(({ data }) => {
        if (data) setArticle(data as ColumnDetail);
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <AppLayout title="コラム">
        <p className="text-center text-muted-foreground py-12">読み込み中...</p>
      </AppLayout>
    );
  }

  if (!article) {
    return (
      <AppLayout title="コラム">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">コラムが見つかりません</p>
            <Button variant="outline" className="mt-4" onClick={() => navigate("/")}>
              ホームに戻る
            </Button>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="コラム">
      <Button variant="ghost" size="sm" className="mb-4" onClick={() => navigate(-1)}>
        <ArrowLeft className="h-4 w-4 mr-1" /> 戻る
      </Button>

      {article.thumbnail_url && (
        <img
          src={article.thumbnail_url}
          alt={article.title}
          className="w-full h-48 object-cover rounded-xl mb-4"
        />
      )}

      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="outline" className="text-xs">
            {CATEGORIES[article.category] || article.category}
          </Badge>
          {article.published_at && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {new Date(article.published_at).toLocaleDateString("ja-JP")}
            </span>
          )}
        </div>
        <h1 className="text-xl font-bold text-foreground leading-tight">{article.title}</h1>
      </div>

      <Card>
        <CardContent className="p-5">
          <div
            className="prose prose-sm max-w-none [&_img]:max-w-full [&_img]:rounded-lg [&_a]:text-primary [&_blockquote]:border-l-primary"
            dangerouslySetInnerHTML={{ __html: article.content }}
          />
        </CardContent>
      </Card>
    </AppLayout>
  );
};

export default ColumnDetailPage;
