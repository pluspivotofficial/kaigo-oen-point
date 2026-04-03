import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, MessageSquare, Clock, Send, Heart } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

interface Question {
  id: string;
  title: string;
  body: string;
  anonymous_name: string;
  created_at: string;
  answer_count: number;
  user_id: string;
  is_approved: boolean;
  is_rejected: boolean;
}

interface Answer {
  id: string;
  body: string;
  anonymous_name: string;
  created_at: string;
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

const QuestionDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [question, setQuestion] = useState<Question | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [answerText, setAnswerText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [questionLiked, setQuestionLiked] = useState(false);
  const [questionLikeCount, setQuestionLikeCount] = useState(0);
  const [answerLikeCounts, setAnswerLikeCounts] = useState<Record<string, number>>({});
  const [myAnswerLikes, setMyAnswerLikes] = useState<Set<string>>(new Set());

  const fetchQuestionLikes = async () => {
    if (!id) return;
    const { data } = await supabase.from("question_likes").select("user_id").eq("question_id", id);
    if (data) {
      setQuestionLikeCount(data.length);
      setQuestionLiked(user ? data.some((like: any) => like.user_id === user.id) : false);
    }
  };

  const fetchAnswerLikes = async (answerIds: string[]) => {
    if (answerIds.length === 0) {
      setAnswerLikeCounts({});
      setMyAnswerLikes(new Set());
      return;
    }

    const { data } = await supabase.from("answer_likes").select("answer_id, user_id").in("answer_id", answerIds);
    if (data) {
      const counts: Record<string, number> = {};
      const mine = new Set<string>();
      data.forEach((like: any) => {
        counts[like.answer_id] = (counts[like.answer_id] || 0) + 1;
        if (user && like.user_id === user.id) mine.add(like.answer_id);
      });
      setAnswerLikeCounts(counts);
      setMyAnswerLikes(mine);
    }
  };

  const fetchData = async () => {
    if (!id) return;
    setLoading(true);

    const { data: questionData, error } = await supabase
      .from("questions")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      toast({ title: "エラー", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    const nextQuestion = questionData as Question | null;
    if (!nextQuestion || (!nextQuestion.is_approved && nextQuestion.user_id !== user?.id)) {
      setQuestion(null);
      setAnswers([]);
      setLoading(false);
      return;
    }

    setQuestion(nextQuestion);
    await fetchQuestionLikes();

    if (!nextQuestion.is_approved) {
      setAnswers([]);
      setAnswerLikeCounts({});
      setMyAnswerLikes(new Set());
      setLoading(false);
      return;
    }

    const { data: answersData } = await supabase
      .from("question_answers")
      .select("*")
      .eq("question_id", id)
      .order("created_at", { ascending: true });

    const nextAnswers = (answersData ?? []) as Answer[];
    setAnswers(nextAnswers);
    await fetchAnswerLikes(nextAnswers.map((answer) => answer.id));
    setLoading(false);
  };

  useEffect(() => {
    void fetchData();
  }, [id, user?.id]);

  const toggleQuestionLike = async () => {
    if (!user || !id) return;
    if (questionLiked) {
      await supabase.from("question_likes").delete().eq("question_id", id).eq("user_id", user.id);
      setQuestionLiked(false);
      setQuestionLikeCount((count) => Math.max(count - 1, 0));
      return;
    }

    await supabase.from("question_likes").insert({ question_id: id, user_id: user.id });
    setQuestionLiked(true);
    setQuestionLikeCount((count) => count + 1);
  };

  const toggleAnswerLike = async (answerId: string) => {
    if (!user) return;
    if (myAnswerLikes.has(answerId)) {
      await supabase.from("answer_likes").delete().eq("answer_id", answerId).eq("user_id", user.id);
      setMyAnswerLikes((prev) => {
        const next = new Set(prev);
        next.delete(answerId);
        return next;
      });
      setAnswerLikeCounts((prev) => ({ ...prev, [answerId]: Math.max((prev[answerId] || 1) - 1, 0) }));
      return;
    }

    await supabase.from("answer_likes").insert({ answer_id: answerId, user_id: user.id });
    setMyAnswerLikes((prev) => new Set(prev).add(answerId));
    setAnswerLikeCounts((prev) => ({ ...prev, [answerId]: (prev[answerId] || 0) + 1 }));
  };

  const handleSubmitAnswer = async () => {
    if (!user || !id || !answerText.trim() || !question?.is_approved) return;
    setSubmitting(true);

    const { error } = await supabase.from("question_answers").insert({
      question_id: id,
      user_id: user.id,
      body: answerText.trim(),
      anonymous_name: getRandomAnonymousName(),
    });

    if (error) {
      toast({ title: "エラー", description: error.message, variant: "destructive" });
      setSubmitting(false);
      return;
    }

    setAnswerText("");
    await fetchData();
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground text-sm">読み込み中...</p>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="min-h-screen bg-background max-w-2xl mx-auto p-5">
        <Button variant="ghost" size="sm" onClick={() => navigate("/questions")} className="mb-4 gap-1">
          <ArrowLeft className="h-4 w-4" /> 戻る
        </Button>
        <p className="text-center text-muted-foreground">投稿が見つかりません</p>
      </div>
    );
  }

  const ownStatus = question.user_id === user?.id && !question.is_approved
    ? question.is_rejected
      ? { label: "非公開", variant: "destructive" as const }
      : { label: "承認待ち", variant: "outline" as const }
    : null;

  return (
    <div className="min-h-screen bg-background max-w-2xl mx-auto">
      <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-lg border-b border-border px-5 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("/questions")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-sm font-bold text-foreground truncate">掲示板</h1>
      </header>

      <main className="px-5 py-4 pb-8 space-y-4">
        <Card className="border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-2 mb-2 flex-wrap">
              <h2 className="font-bold text-base leading-snug">{question.title}</h2>
              {ownStatus && <Badge variant={ownStatus.variant}>{ownStatus.label}</Badge>}
            </div>
            {question.body && (
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{question.body}</p>
            )}
            <div className="flex items-center gap-3 mt-3 text-[11px] text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {new Date(question.created_at).toLocaleDateString("ja-JP")}
              </span>
              <span>{question.anonymous_name}</span>
              <button
                className="flex items-center gap-1 hover:text-destructive transition-colors ml-auto"
                onClick={toggleQuestionLike}
              >
                <Heart className={`h-3.5 w-3.5 ${questionLiked ? "fill-destructive text-destructive" : ""}`} />
                <span className="text-xs">{questionLikeCount}</span>
              </button>
            </div>
          </CardContent>
        </Card>

        {!question.is_approved ? (
          <Card className="border-secondary/20 bg-secondary/5">
            <CardContent className="p-4 text-sm text-muted-foreground">
              {question.is_rejected
                ? "この投稿は現在公開されていません。内容を見直して再投稿してください。"
                : "この投稿は管理者の承認後に掲示板へ公開されます。公開されるまで回答は表示されません。"}
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="flex items-center gap-2 mt-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-semibold text-muted-foreground">
                回答 ({answers.length})
              </span>
            </div>

            {answers.length === 0 ? (
              <p className="text-center text-muted-foreground text-xs py-6">まだ回答がありません。最初に回答してみましょう！</p>
            ) : (
              <div className="space-y-3">
                {answers.map((answer) => (
                  <Card key={answer.id}>
                    <CardContent className="p-3">
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{answer.body}</p>
                      <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
                        <span>{answer.anonymous_name}</span>
                        <span>{new Date(answer.created_at).toLocaleDateString("ja-JP")}</span>
                        <button
                          className="flex items-center gap-1 hover:text-destructive transition-colors ml-auto"
                          onClick={() => toggleAnswerLike(answer.id)}
                        >
                          <Heart className={`h-3 w-3 ${myAnswerLikes.has(answer.id) ? "fill-destructive text-destructive" : ""}`} />
                          <span className="text-xs">{answerLikeCounts[answer.id] || 0}</span>
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            <Card>
              <CardContent className="p-4 space-y-3">
                <p className="text-sm font-semibold">回答する</p>
                <p className="text-xs text-muted-foreground">あなたの名前は匿名で表示されます</p>
                <Textarea
                  placeholder="回答を入力..."
                  value={answerText}
                  onChange={(e) => setAnswerText(e.target.value)}
                  maxLength={1000}
                  rows={3}
                />
                <Button
                  className="w-full gap-1.5"
                  onClick={handleSubmitAnswer}
                  disabled={submitting || !answerText.trim()}
                >
                  <Send className="h-4 w-4" />
                  {submitting ? "送信中..." : "回答を投稿"}
                </Button>
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
};

export default QuestionDetailPage;
