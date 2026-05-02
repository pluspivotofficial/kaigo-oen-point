import { useState, useEffect } from "react";
import { Users, Gift, Copy, Check, Share2, Link2, Coins, AlertTriangle, Smartphone, MessageSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  pending: { label: "申請中", variant: "secondary" },
  completed_registered: { label: "登録完了", variant: "default" },
};

function generateCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

const ReferralPage = () => {
  const { user } = useAuth();
  const [referralCount, setReferralCount] = useState(0);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [referralPoints, setReferralPoints] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

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
          fetchReferralPoints();
        }
      });
  }, [user]);

  const fetchReferralPoints = async () => {
    if (!user) return;
    const { data } = await supabase.rpc("get_referral_user_points", { _referrer_id: user.id });
    if (data) {
      const map: Record<string, number> = {};
      (data as any[]).forEach((row: any) => {
        map[row.referral_id] = Number(row.total_points);
      });
      setReferralPoints(map);
    }
  };

  const handleCopyLink = (referral: any) => {
    const link = `${window.location.origin}/auth?ref=${referral.referral_code}`;
    navigator.clipboard.writeText(link);
    setCopiedId(referral.id);
    toast({ title: "招待リンクをコピーしました！", description: "LINEやメッセージアプリで共有してください" });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCreateLink = async () => {
    if (!user) return;
    if (referralCount >= 5) {
      toast({ title: "紹介上限に達しています", description: "紹介は5枠までです", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const referralCode = `HOP-${generateCode()}`;
    const { data, error } = await supabase.from("referrals").insert({
      referrer_id: user.id,
      friend_name: "",
      friend_contact: "",
      referral_code: referralCode,
    }).select().single();

    if (error) {
      toast({ title: "エラーが発生しました", description: error.message, variant: "destructive" });
      setSubmitting(false);
      return;
    }

    const link = `${window.location.origin}/auth?ref=${referralCode}`;
    navigator.clipboard.writeText(link);

    setReferrals((prev) => [data, ...prev]);
    setReferralCount((c) => c + 1);
    toast({
      title: "招待リンクを作成しました！",
      description: "クリップボードにコピーされました。LINEなどで共有してください。",
    });
    setSubmitting(false);
  };

  return (
    <AppLayout bgClassName="bg-gradient-sakura-bg" title="友人紹介">
      {/* セクションキッカー */}
      <div className="text-center mb-3">
        <p className="text-xs font-display font-bold text-coral tracking-widest">
          ✿ 仲間と一緒に応援 ✿
        </p>
        <h2 className="text-base font-display font-bold text-navy mt-1">
          友達に紹介して、一緒にポイントを貯めよう 🌸
        </h2>
      </div>

      {/* Reward Banner (sakura-highlight + animate-pop-in) */}
      <Card variant="sakura-highlight" className="mb-6 animate-pop-in">
        <CardContent className="p-6 text-center">
          <Gift className="h-10 w-10 text-white mx-auto mb-3" />
          <h2 className="text-2xl font-display font-black text-white mb-1">
            紹介で最大 <span className="text-gold">600</span> ポイント！
          </h2>
          <p className="text-white/85 text-sm font-display">
            登録完了で <strong>+100pt</strong> + プロフィール完了で <strong>+500pt</strong>
          </p>
        </CardContent>
      </Card>

      {/* Important Notice */}
      <Card className="mb-5 border-destructive/30 bg-destructive/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm text-destructive">紹介先への注意事項</p>
              <p className="text-xs text-muted-foreground mt-1">
                本アプリは<strong>介護職として就労中の方</strong>、または<strong>介護資格を保有している方</strong>を対象としたアプリです。
                紹介先の方が対象外の場合、ポイント付与が承認されない場合があります。
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Step1/Step2 Explanation (sakura-tappable) */}
      <Card variant="sakura-tappable" className="mb-5">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start gap-3">
            <span className="h-7 w-7 rounded-full bg-gradient-sakura-coral text-white text-xs font-display font-black flex items-center justify-center shrink-0 mt-0.5">
              1
            </span>
            <div>
              <p className="font-display font-bold text-sm">
                友人が登録完了で <span className="text-coral font-black">+100pt</span>
              </p>
              <p className="text-xs text-muted-foreground">招待コード経由で登録すると即座に付与されます</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="h-7 w-7 rounded-full bg-gradient-sakura-coral text-white text-xs font-display font-black flex items-center justify-center shrink-0 mt-0.5">
              2
            </span>
            <div>
              <p className="font-display font-bold text-sm">
                紹介先がプロフィール⑨まで入力で <span className="text-coral font-black">+500pt</span>
              </p>
              <p className="text-xs text-muted-foreground">紹介先が基本情報①〜⑤ + お仕事状況⑥〜⑨を入力すると付与</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Limit info - Meter */}
      <Card variant="sakura" data-tour="referral-meter" className="mb-5">
        <CardContent className="p-4">
          <div className="flex items-end justify-between mb-2">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-coral" />
              <span className="text-sm font-display font-bold">紹介枠の利用状況</span>
            </div>
            <span className="text-sm">
              <strong className="text-2xl font-display font-black text-coral">{referralCount}</strong>
              <span className="text-muted-foreground"> / 5 枠</span>
            </span>
          </div>
          <div className="w-full h-3 bg-pink-soft rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                referralCount >= 5
                  ? "bg-destructive"
                  : referralCount >= 4
                  ? "bg-gold"
                  : "bg-gradient-sakura-coral"
              }`}
              style={{ width: `${Math.min((referralCount / 5) * 100, 100)}%` }}
            />
          </div>
          <p className="text-[11px] text-muted-foreground mt-2 text-center">
            {referralCount >= 5
              ? "紹介上限に達しました"
              : `あと ${5 - referralCount} 枠 紹介できます`}
          </p>
        </CardContent>
      </Card>

      {/* Create Link Button with Visual Steps */}
      <Card variant="sakura" className="mb-5">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-display font-bold flex items-center gap-2">
            <Share2 className="h-4 w-4 text-coral" />
            招待リンクを作成
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Visual How-To Steps */}
          <div className="bg-cream rounded-sakura-md p-4 mb-4 space-y-3">
            <p className="text-xs font-display font-bold text-foreground mb-2">📋 招待リンクの送り方</p>
            <div className="flex items-start gap-3">
              <div className="h-7 w-7 rounded-full bg-gradient-sakura-coral text-white text-xs font-display font-black flex items-center justify-center shrink-0">
                ①
              </div>
              <div className="flex items-center gap-2 flex-1">
                <Copy className="h-4 w-4 text-muted-foreground shrink-0" />
                <p className="text-xs text-muted-foreground">下のボタンを押して<strong className="text-foreground">招待リンクをコピー</strong></p>
              </div>
            </div>
            <div className="flex justify-center">
              <div className="h-4 border-l-2 border-dashed border-pink-mid" />
            </div>
            <div className="flex items-start gap-3">
              <div className="h-7 w-7 rounded-full bg-gradient-sakura-coral text-white text-xs font-display font-black flex items-center justify-center shrink-0">
                ②
              </div>
              <div className="flex items-center gap-2 flex-1">
                <div className="flex gap-1">
                  <MessageSquare className="h-4 w-4 text-green-600 shrink-0" />
                  <Smartphone className="h-4 w-4 text-blue-500 shrink-0" />
                </div>
                <p className="text-xs text-muted-foreground"><strong className="text-foreground">LINEやSMS</strong>にペーストすると招待コード付きリンクが送れます</p>
              </div>
            </div>
          </div>

          <Button
            variant="sakura"
            className="w-full gap-2"
            size="lg"
            disabled={submitting || referralCount >= 5}
            onClick={handleCreateLink}
          >
            <Link2 className="h-4 w-4" />
            {referralCount >= 5 ? "紹介上限に達しました" : submitting ? "作成中..." : "招待リンクを作成してコピー"}
          </Button>
        </CardContent>
      </Card>

      {/* Referral History */}
      {referrals.length > 0 && (
        <Card variant="sakura" className="mb-5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-display font-bold">紹介履歴</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {referrals.map((r) => {
              const status = STATUS_MAP[r.status] || STATUS_MAP.pending;
              const pts = referralPoints[r.id];
              const displayName = r.friend_name || "未登録";
              const step1Done = !!r.signup_bonus_granted_at;
              const step2Done = !!r.profile_bonus_granted_at;
              return (
                <div key={r.id} className="p-3 rounded-sakura-md bg-cream space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-display font-bold">{displayName}</p>
                      <p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString("ja-JP")}</p>
                    </div>
                    <Badge variant={status.variant} className="text-xs">
                      {status.label}
                    </Badge>
                  </div>

                  {/* Step1/Step2 状態バッジ */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge
                      variant={step1Done ? "sakura-coral" : "outline"}
                      className="text-[10px]"
                    >
                      {step1Done ? "✓ Step1 +100pt" : "Step1 未達成"}
                    </Badge>
                    <Badge
                      variant={step2Done ? "sakura-gold" : "outline"}
                      className="text-[10px]"
                    >
                      {step2Done ? "✓ Step2 +500pt" : "Step2 未達成"}
                    </Badge>
                  </div>

                  {pts !== undefined && pts > 0 && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Coins className="h-3 w-3" />
                      <span>紹介先の現在ポイント: <strong className="text-foreground">{pts.toLocaleString()}pt</strong></span>
                    </div>
                  )}
                  {r.referral_code && r.status === "pending" && !r.referred_user_id && (
                    <Button
                      variant="sakura-secondary"
                      size="sm"
                      className="w-full text-xs gap-1.5"
                      onClick={() => handleCopyLink(r)}
                    >
                      {copiedId === r.id ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      {copiedId === r.id ? "コピーしました" : "招待リンクをコピー"}
                    </Button>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <Card variant="sakura">
        <CardContent className="p-4 flex items-center gap-3">
          <Users className="h-5 w-5 text-coral" />
          <span className="text-sm font-display">これまでの紹介: <strong className="font-black text-coral">{referralCount}</strong>人</span>
        </CardContent>
      </Card>
    </AppLayout>
  );
};

export default ReferralPage;
