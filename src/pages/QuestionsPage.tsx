import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MessageCircleQuestion, Plus, MessageSquare, Clock, Heart } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import AppLayout from "@/components/AppLayout";
import { useAchievement } from "@/contexts/AchievementContext";

interface Question {
  id: string;
  title: string;
  body: string;
  anonymous_name: string;
  created_at: string;
  answer_count: number;
  is_approved: boolean;
  is_rejected: boolean;
  user_id: string;
}

const ANONYMOUS_NAMES = [
  "匿名のカイゴさん", "匿名のホップさん", "匿名のケアさん",
  "匿名のスマイルさん", "匿名のハートさん", "匿名のスターさん",
  "匿名のフラワーさん", "匿名のムーンさん", "匿名のサニーさん",
  "匿名のクローバーさん",
];

const getRandomAnonymousName = () =>
  ANONYMOUS_NAMES[Math.floor(Math.random() * ANONYMOUS_NAMES.length)];

const getStatusBadge = (question: Question) => {
  if (question.is_rejected) {
    return { label: "非公開", variant: "destructive" as const };
  }

  if (!question.is_approved) {
    return { label: "承認待ち", variant: "outline" as const };
  }

  return null;
};

const QuestionsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showPoints, checkAchievements } = useAchievement();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [myLikes, setMyLikes] = useState<Set<string>>(new Set());

  const fetchLikes = async (questionIds: string[]) => {
    if (questionIds.length === 0) {
      setLikeCounts({});
      setMyLikes(new Set());
      return;
    }

    const { data: allLikes } = await supabase
      .from("question_likes")
      .select("question_id, user_id")
      .in("question_id", questionIds);

    if (allLikes) {
      const counts: Record<string, number> = {};
      const mine = new Set<string>();
      allLikes.forEach((like: any) => {
        counts[like.question_id] = (counts[like.question_id] || 0) + 1;
        if (user && like.user_id === user.id) mine.add(like.question_id);
      });
      setLikeCounts(counts);
      setMyLikes(mine);
    }
  };

  const fetchQuestions = async () => {
    if (!user) return;
    setLoading(true);

    const { data, error } = await supabase
      .from("questions")
      .select("*")
      .or(`is_approved.eq.true,user_id.eq.${user.id}`)
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "エラー", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    const nextQuestions = (data ?? []) as Question[];
    setQuestions(nextQuestions);
    await fetchLikes(nextQuestions.map((question) => question.id));
    setLoading(false);
  };

  useEffect(() => {
    void fetchQuestions();
  }, [user?.id]);

  const toggleLike = async (e: React.MouseEvent, questionId: string) => {
    e.stopPropagation();
    if (!user) return;

    if (myLikes.has(questionId)) {
      await supabase.from("question_likes").delete().eq("question_id", questionId).eq("user_id", user.id);
      setMyLikes((prev) => {
        const next = new Set(prev);
        next.delete(questionId);
        return next;
      });
      setLikeCounts((prev) => ({ ...prev, [questionId]: Math.max((prev[questionId] || 1) - 1, 0) }));
      return;
    }

    await supabase.from("question_likes").insert({ question_id: questionId, user_id: user.id });
    setMyLikes((prev) => new Set(prev).add(questionId));
    setLikeCounts((prev) => ({ ...prev, [questionId]: (prev[questionId] || 0) + 1 }));
  };

  const handleSubmit = async () => {
    if (!user || !title.trim()) return;
    setSubmitting(true);

    const { data: inserted, error } = await supabase
      .from("questions")
      .insert({
        user_id: user.id,
        title: title.trim(),
        body: body.trim(),
        anonymous_name: getRandomAnonymousName(),
      })
      .select()
      .single();

    if (error) {
      toast({ title: "エラー", description: error.message, variant: "destructive" });
      setSubmitting(false);
      return;
    }

    toast({ title: "投稿しました", description: "管理者の承認後に公開されます" });
    setTitle("");
    setBody("");
    setDialogOpen(false);
    await fetchQuestions();
    setSubmitting(false);

    // H-2: +5pt 付与 RPC (silent fail 設計、granted=false なら何もしない)
    if (inserted?.id) {
      try {
        const { data: result } = await supabase.rpc("grant_question_post_points", {
          p_question_id: inserted.id,
        });
        const granted = (result as any)?.granted === true;
        if (granted) {
          const points = (result as any)?.points ?? 5;
          showPoints(points, "掲示板投稿ボーナス");
          // 投稿系バッジが将来追加されたら自動で発火
          checkAchievements();
        }
        // granted=false (too_short / rate_limit / already_granted) は silent
      } catch (e) {
        // RPC失敗時もユーザーには見せない (投稿自体は成功している)
        console.warn("[QuestionsPage] grant_question_post_points failed", e);
      }
    }
  };

  return (
    <AppLayout title="掲示板">
      <div className="flex items-center justify-between mb-4 gap-3">
        <p className="text-sm text-muted-foreground">
          公開中の投稿と、あなたの投稿状況を確認できます。
        </p>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5 shrink-0">
              <Plus className="h-4 w-4" />
              投稿する
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>掲示板に投稿する</DialogTitle>
            </DialogHeader>
            <p className="text-xs text-muted-foreground">
              投稿者名は匿名で表示されます。公開前に管理者の確認があります。
            </p>
            <div className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label htmlFor="q-title">タイトル</Label>
                <Input
                  id="q-title"
                  placeholder="投稿のタイトル"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={100}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="q-body">詳細（任意）</Label>
                <Textarea
                  id="q-body"
                  placeholder="内容を書いてください..."
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  maxLength={1000}
                  rows={4}
                />
              </div>
              <Button
                className="w-full"
                onClick={handleSubmit}
                disabled={submitting || !title.trim()}
              >
                {submitting ? "送信中..." : "投稿する"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <p className="text-center text-muted-foreground py-8 text-sm">読み込み中...</p>
      ) : questions.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <MessageCircleQuestion className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">まだ投稿がありません</p>
            <p className="text-muted-foreground text-xs mt-1">最初の投稿をしてみましょう！</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {questions.map((question) => {
            const isMine = question.user_id === user?.id;
            const status = getStatusBadge(question);

            return (
              <Card
                key={question.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`/questions/${question.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <MessageCircleQuestion className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm leading-snug line-clamp-2">{question.title}</p>
                      {question.body && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{question.body}</p>
                      )}
                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(question.created_at).toLocaleDateString("ja-JP")}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {question.anonymous_name}
                        </span>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-0.5">
                          <MessageSquare className="h-2.5 w-2.5" />
                          {question.answer_count}
                        </Badge>
                        <button
                          className="flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-destructive transition-colors"
                          onClick={(e) => toggleLike(e, question.id)}
                        >
                          <Heart className={`h-3 w-3 ${myLikes.has(question.id) ? "fill-destructive text-destructive" : ""}`} />
                          {likeCounts[question.id] || 0}
                        </button>
                        {isMine && status && (
                          <Badge variant={status.variant} className="text-[10px] px-1.5 py-0">
                            {status.label}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </AppLayout>
  );
};

export default QuestionsPage;
