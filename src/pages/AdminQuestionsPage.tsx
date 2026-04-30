import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Check, X, MessageCircleQuestion, Clock, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

interface Question {
  id: string;
  title: string;
  body: string;
  anonymous_name: string;
  created_at: string;
  is_approved: boolean;
  is_rejected: boolean;
  answer_count: number;
}

const AdminQuestionsPage = () => {
  const navigate = useNavigate();
  const { user, isAdmin, isAdminLoading } = useAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (isAdminLoading) return;
    if (!isAdmin) navigate("/");
  }, [isAdmin, isAdminLoading, navigate]);

  const fetchQuestions = async () => {
    const { data } = await supabase
      .from("questions")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setQuestions(data as Question[]);
    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin) fetchQuestions();
  }, [isAdmin]);

  const handleApprove = async (id: string) => {
    const { error } = await supabase.from("questions").update({
      is_approved: true,
      is_rejected: false,
      approved_at: new Date().toISOString(),
    }).eq("id", id);
    if (error) {
      toast({ title: "エラー", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "承認しました" });
      fetchQuestions();
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    // delete dependent records first (likes, answers) then question
    await supabase.from("question_likes").delete().eq("question_id", deleteId);
    await supabase.from("question_answers").delete().eq("question_id", deleteId);
    const { error } = await supabase.from("questions").delete().eq("id", deleteId);
    if (error) {
      toast({ title: "エラー", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "削除しました" });
      setDeleteId(null);
      fetchQuestions();
    }
  };

  const handleReject = async (id: string) => {
    const { error } = await supabase.from("questions").update({
      is_approved: false,
      is_rejected: true,
    }).eq("id", id);
    if (error) {
      toast({ title: "エラー", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "却下しました" });
      fetchQuestions();
    }
  };

  const pending = questions.filter((q) => !q.is_approved && !q.is_rejected);
  const approved = questions.filter((q) => q.is_approved);
  const rejected = questions.filter((q) => q.is_rejected);

  const QuestionCard = ({ q, showActions }: { q: Question; showActions: boolean }) => (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
            <MessageCircleQuestion className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm leading-snug">{q.title}</p>
            {q.body && <p className="text-xs text-muted-foreground mt-1 line-clamp-3">{q.body}</p>}
            <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-foreground">
              <Clock className="h-3 w-3" />
              {new Date(q.created_at).toLocaleDateString("ja-JP")}
              <span>• {q.anonymous_name}</span>
              <Badge variant="outline" className="text-[10px] px-1 py-0">回答 {q.answer_count}</Badge>
            </div>
          </div>
        </div>
        <div className="flex gap-2 mt-3 justify-end flex-wrap">
          {showActions && (
            <>
              <Button size="sm" variant="outline" className="gap-1 text-destructive" onClick={() => handleReject(q.id)}>
                <X className="h-3.5 w-3.5" /> 却下
              </Button>
              <Button size="sm" className="gap-1" onClick={() => handleApprove(q.id)}>
                <Check className="h-3.5 w-3.5" /> 承認
              </Button>
            </>
          )}
          <Button size="sm" variant="outline" className="gap-1 text-destructive" onClick={() => setDeleteId(q.id)}>
            <Trash2 className="h-3.5 w-3.5" /> 削除
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background max-w-2xl mx-auto">
      <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-lg border-b border-border px-5 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("/")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-sm font-bold text-foreground">質問管理</h1>
      </header>

      <main className="px-5 py-4">
        <Tabs defaultValue="pending">
          <TabsList className="w-full mb-4">
            <TabsTrigger value="pending" className="flex-1">
              未承認 ({pending.length})
            </TabsTrigger>
            <TabsTrigger value="approved" className="flex-1">
              公開中 ({approved.length})
            </TabsTrigger>
            <TabsTrigger value="rejected" className="flex-1">
              却下 ({rejected.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-3">
            {pending.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-8">未承認の質問はありません</p>
            ) : pending.map((q) => <QuestionCard key={q.id} q={q} showActions />)}
          </TabsContent>

          <TabsContent value="approved" className="space-y-3">
            {approved.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-8">承認済みの質問はありません</p>
            ) : approved.map((q) => <QuestionCard key={q.id} q={q} showActions={false} />)}
          </TabsContent>

          <TabsContent value="rejected" className="space-y-3">
            {rejected.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-8">却下された質問はありません</p>
            ) : rejected.map((q) => <QuestionCard key={q.id} q={q} showActions={false} />)}
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>質問を削除しますか？</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            この質問とすべての回答・いいねが削除されます。この操作は取り消せません。
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>キャンセル</Button>
            <Button variant="destructive" onClick={handleDelete}>削除する</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminQuestionsPage;
