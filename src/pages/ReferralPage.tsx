import { useState, useEffect } from "react";
import { Users, Gift, Copy, Check, Share2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  pending: { label: "申請中", variant: "secondary" },
  registered: { label: "登録済み（+500pt）", variant: "outline" },
  active: { label: "稼働開始（+15,000pt）", variant: "default" },
};

const ReferralPage = () => {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [friendName, setFriendName] = useState("");
  const [friendContact, setFriendContact] = useState("");
  const [referralCount, setReferralCount] = useState(0);
  const [referrals, setReferrals] = useState<{ id: string; friend_name: string; status: string; created_at: string; points_awarded: boolean }[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const referralCode = user ? `HOP-${user.id.slice(0, 6).toUpperCase()}` : "";

  useEffect(() => {
    if (!user) return;
    supabase
      .from("referrals")
      .select("*")
      .eq("referrer_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) {
          setReferrals(data);
          setReferralCount(data.length);
        }
      });
  }, [user]);

  const handleCopy = () => {
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    toast({ title: "コピーしました！" });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmitReferral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!friendName || !friendContact || !user) {
      toast({ title: "お名前と連絡先を入力してください", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    const { data, error } = await supabase.from("referrals").insert({
      referrer_id: user.id,
      friend_name: friendName,
      friend_contact: friendContact,
    }).select().single();

    if (error) {
      toast({ title: "エラーが発生しました", description: error.message, variant: "destructive" });
      setSubmitting(false);
      return;
    }

    setReferrals((prev) => [data, ...prev]);
    setReferralCount((c) => c + 1);
    toast({
      title: "紹介を送信しました！",
      description: `${friendName}さんが登録すると500ポイント、稼働開始で15,000ポイントが付与されます`,
    });
    setFriendName("");
    setFriendContact("");
    setSubmitting(false);
  };

  return (
    <AppLayout title="友人紹介">
      {/* Reward Banner */}
      <Card className="bg-gradient-to-br from-reward-purple to-reward-purple/80 border-0 mb-6">
        <CardContent className="p-6 text-center">
          <Gift className="h-10 w-10 text-white mx-auto mb-3" />
          <h2 className="text-xl font-bold text-white mb-1">最大 15,500 ポイント！</h2>
          <p className="text-white/70 text-sm">登録で500pt + 稼働開始で15,000pt</p>
        </CardContent>
      </Card>

      {/* 2-step explanation */}
      <Card className="mb-5">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start gap-3">
            <span className="h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
            <div>
              <p className="font-semibold text-sm">登録完了で <span className="text-primary">+500pt</span></p>
              <p className="text-xs text-muted-foreground">紹介した友人が会員登録を完了した時点で自動付与</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
            <div>
              <p className="font-semibold text-sm">稼働開始で <span className="text-primary">+15,000pt</span></p>
              <p className="text-xs text-muted-foreground">友人が初回勤務を開始した時点で管理者が付与</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Referral Code */}
      <Card className="mb-5">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">あなたの紹介コード</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-muted rounded-lg px-4 py-3 font-mono text-lg font-bold text-foreground text-center tracking-wider">
              {referralCode}
            </div>
            <Button variant="outline" size="icon" className="h-12 w-12" onClick={handleCopy}>
              {copied ? <Check className="h-5 w-5 text-secondary" /> : <Copy className="h-5 w-5" />}
            </Button>
          </div>
          <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>これまでの紹介: <strong className="text-foreground">{referralCount}人</strong></span>
          </div>
        </CardContent>
      </Card>

      {/* Referral Form */}
      <Card className="mb-5">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Share2 className="h-4 w-4" />
            友人を紹介する
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmitReferral} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="friendName">お友達のお名前</Label>
              <Input id="friendName" placeholder="山田 太郎" value={friendName} onChange={(e) => setFriendName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="friendContact">メールアドレスまたは電話番号</Label>
              <Input id="friendContact" placeholder="taro@example.com" value={friendContact} onChange={(e) => setFriendContact(e.target.value)} />
            </div>
            <Button type="submit" className="w-full" size="lg" disabled={submitting}>
              {submitting ? "送信中..." : "紹介を送信する"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Referral History */}
      {referrals.length > 0 && (
        <Card className="mb-5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">紹介履歴</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {referrals.map((r) => {
              const status = STATUS_MAP[r.status] || STATUS_MAP.pending;
              return (
                <div key={r.id} className="flex items-center justify-between p-3 rounded-lg bg-muted">
                  <div>
                    <p className="text-sm font-medium">{r.friend_name}</p>
                    <p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString("ja-JP")}</p>
                  </div>
                  <Badge variant={status.variant} className="text-xs">
                    {status.label}
                  </Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </AppLayout>
  );
};

export default ReferralPage;
