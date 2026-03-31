import { useState, useEffect } from "react";
import { Users, Gift, Copy, Check, Share2, Link2, Coins } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  pending: { label: "申請中", variant: "secondary" },
  completed_registered: { label: "取得完了（+100pt）", variant: "default" },
};

function generateCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

const ReferralPage = () => {
  const { user } = useAuth();
  const [referralCount, setReferralCount] = useState(0);
  const [monthlyCount, setMonthlyCount] = useState(0);
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
    <AppLayout title="友人紹介">
      {/* Reward Banner */}
      <Card className="bg-gradient-to-br from-primary to-primary/80 border-0 mb-6">
        <CardContent className="p-6 text-center">
          <Gift className="h-10 w-10 text-primary-foreground mx-auto mb-3" />
          <h2 className="text-xl font-bold text-primary-foreground mb-1">紹介で 100 ポイント！</h2>
          <p className="text-primary-foreground/70 text-sm">友人が登録完了すると紹介元に100ptが付与されます</p>
        </CardContent>
      </Card>

      {/* Explanation */}
      <Card className="mb-5">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start gap-3">
            <span className="h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
            <div>
              <p className="font-semibold text-sm">招待リンクを共有</p>
              <p className="text-xs text-muted-foreground">ボタンを押してリンクをコピー、LINEなどで送信</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
            <div>
              <p className="font-semibold text-sm">友人が登録完了で <span className="text-primary">+100pt</span></p>
              <p className="text-xs text-muted-foreground">管理者承認後にポイントが付与されます</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">★</span>
            <div>
              <p className="font-semibold text-sm">2次紹介ボーナスも！</p>
              <p className="text-xs text-muted-foreground">紹介した人がさらに紹介すると大元の親にも100pt付与</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Create Link Button */}
      <Card className="mb-5">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Share2 className="h-4 w-4" />
            招待リンクを作成
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-3">
            ボタンを押すと招待リンクが作成され、クリップボードにコピーされます。LINEやメッセージで共有してください。
          </p>
          <Button className="w-full gap-2" size="lg" disabled={submitting} onClick={handleCreateLink}>
            <Link2 className="h-4 w-4" />
            {submitting ? "作成中..." : "招待リンクを作成してコピー"}
          </Button>
        </CardContent>
      </Card>

      {/* Referral History */}
      {referrals.length > 0 && (
        <Card className="mb-5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">紹介履歴</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {referrals.map((r) => {
              const status = STATUS_MAP[r.status] || STATUS_MAP.pending;
              const pts = referralPoints[r.id];
              const displayName = r.friend_name || "未登録";
              return (
                <div key={r.id} className="p-3 rounded-lg bg-muted space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{displayName}</p>
                      <p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString("ja-JP")}</p>
                    </div>
                    <Badge variant={status.variant} className="text-xs">
                      {status.label}
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
                      variant="outline"
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
      <Card>
        <CardContent className="p-4 flex items-center gap-3">
          <Users className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm">これまでの紹介: <strong>{referralCount}人</strong></span>
        </CardContent>
      </Card>
    </AppLayout>
  );
};

export default ReferralPage;
