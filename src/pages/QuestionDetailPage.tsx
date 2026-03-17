import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, MessageSquare, Clock, Send } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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

  const fetchData = async () => {
    if (!id) return;
    const [qRes, aRes] = await Promise.all([
      supabase.from("questions").select("*").eq("id", id).eq("is_approved", true).single(),
      supabase.from("question_answers").select("*").eq("question_id", id).order("created_at", { ascending: true }),
    ]);
    if (qRes.data) setQuestion(qRes.data as Question);
    if (aRes.data) setAnswers(aRes.data as Answer[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleSubmitAnswer = async () => {
    if (!user || !id || !answerText.trim()) return;
    setSubmitting(true);
    const { error } = await supabase.from("question_answers").insert({
      question_id: id,
      user_id: user.id,
      body: answerText.trim(),
      anonymous_name: getRandomAnonymousName(),
    });
    if (error) {
      toast({ title: "エラー", description: error.message, variant: "destructive" });
    } else {
      setAnswerText("");
      fetchData();
    }
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
        <p className="text-center text-muted-foreground">質問が見つかりません</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background max-w-2xl mx-auto">
      <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-lg border-b border-border px-5 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("/questions")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-sm font-bold text-foreground truncate">質問詳細</h1>
      </header>

      <main className="px-5 py-4 pb-8 space-y-4">
        {/* Question */}
        <Card className="border-primary/20">
          <CardContent className="p-4">
            <h2 className="font-bold text-base leading-snug mb-2">{question.title}</h2>
            {question.body && (
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{question.body}</p>
            )}
            <div className="flex items-center gap-3 mt-3 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {new Date(question.created_at).toLocaleDateString("ja-JP")}
              </span>
              <span>{question.anonymous_name}</span>
            </div>
          </CardContent>
        </Card>

        {/* Answers */}
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
            {answers.map((a) => (
              <Card key={a.id}>
                <CardContent className="p-3">
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{a.body}</p>
                  <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
                    <span>{a.anonymous_name}</span>
                    <span>{new Date(a.created_at).toLocaleDateString("ja-JP")}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Answer form */}
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
      </main>
    </div>
  );
};

export default QuestionDetailPage;
