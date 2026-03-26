import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import { Users, CheckCircle, Play } from "lucide-react";

interface Referral {
  id: string;
  referrer_id: string;
  friend_name: string;
  friend_contact: string;
  referred_user_id: string | null;
  status: string;
  points_awarded: boolean;
  created_at: string;
}

const AdminReferralsPage = () => {
  const { user } = useAuth();
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("referrals")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) setReferrals(data as Referral[]);
        setLoading(false);
      });
  }, [user]);

  const handleApproveRegistered = async (referral: Referral) => {
    setProcessing(referral.id);
    const { error } = await supabase
      .from("referrals")
      .update({ status: "completed_registered", points_awarded: true })
      .eq("id", referral.id);

    if (error) {
      toast({ title: "エラー", description: error.message, variant: "destructive" });
      setProcessing(null);
      return;
    }

    // Award 500pt to referrer
    await supabase.from("points_history").insert({
      user_id: referral.referrer_id,
      description: `紹介ボーナス（${referral.friend_name || "紹介ユーザー"}さん登録）`,
      points: 500,
      type: "earn",
    });

    // Check for grandparent referrer (2nd level)
    await awardGrandparentBonus(referral.referrer_id, referral.friend_name || "紹介ユーザー", "登録");

    setReferrals((prev) => prev.map((r) => r.id === referral.id ? { ...r, status: "completed_registered", points_awarded: true } : r));
    toast({ title: `${referral.friend_name || "紹介ユーザー"}さんを承認し、500ptを付与しました` });
    setProcessing(null);
  };

  const handleApproveActive = async (referral: Referral) => {
    setProcessing(referral.id);
    const { error } = await supabase
      .from("referrals")
      .update({ status: "completed_active", points_awarded: true })
      .eq("id", referral.id);

    if (error) {
      toast({ title: "エラー", description: error.message, variant: "destructive" });
      setProcessing(null);
      return;
    }

    // Award 10,000pt to referrer
    await supabase.from("points_history").insert({
      user_id: referral.referrer_id,
      description: `紹介ボーナス（${referral.friend_name || "紹介ユーザー"}さん稼働開始）`,
      points: 10000,
      type: "earn",
    });

    // Award 10,000pt to the referred user
    if (referral.referred_user_id) {
      await supabase.from("points_history").insert({
        user_id: referral.referred_user_id,
        description: `稼働開始ボーナス（紹介経由）`,
        points: 10000,
        type: "earn",
      });
    }

    // Check for grandparent referrer (2nd level)
    await awardGrandparentBonus(referral.referrer_id, referral.friend_name || "紹介ユーザー", "稼働開始");

    setReferrals((prev) => prev.map((r) => r.id === referral.id ? { ...r, status: "completed_active", points_awarded: true } : r));
    toast({ title: `${referral.friend_name || "紹介ユーザー"}さんを承認し、ポイントを付与しました` });
    setProcessing(null);
  };

  const awardGrandparentBonus = async (referrerId: string, friendName: string, action: string) => {
    try {
      const { data: parentReferral } = await supabase
        .from("referrals")
        .select("referrer_id")
        .eq("referred_user_id", referrerId)
        .limit(1)
        .maybeSingle();

      if (parentReferral) {
        await supabase.from("points_history").insert({
          user_id: parentReferral.referrer_id,
          description: `2次紹介ボーナス（${friendName}さん${action}）`,
          points: 100,
          type: "earn",
        });
      }
    } catch (err) {
      console.error("Grandparent bonus error:", err);
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "completed_registered": return <Badge variant="outline" className="text-xs">承認済み（登録）</Badge>;
      case "completed_active": return <Badge variant="default" className="text-xs">承認済み（稼働）</Badge>;
      default: return <Badge variant="secondary" className="text-xs">申請中</Badge>;
    }
  };

  return (
    <AppLayout title="紹介管理">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            全紹介一覧
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading && <p className="text-sm text-muted-foreground">読み込み中...</p>}
          {!loading && referrals.length === 0 && <p className="text-sm text-muted-foreground">紹介はまだありません</p>}
          {referrals.map((r) => (
            <div key={r.id} className="p-3 rounded-lg bg-muted space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{r.friend_name || "未登録"}</p>
                  {r.friend_contact && <p className="text-xs text-muted-foreground">{r.friend_contact}</p>}
                  <p className="text-[10px] text-muted-foreground">{new Date(r.created_at).toLocaleDateString("ja-JP")}</p>
                </div>
                {statusBadge(r.status)}
              </div>
              {r.status === "pending" && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs gap-1"
                    disabled={processing === r.id}
                    onClick={() => handleApproveRegistered(r)}
                  >
                    <CheckCircle className="h-3 w-3" />
                    登録承認（+500pt）
                  </Button>
                </div>
              )}
              {r.status === "completed_registered" && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="text-xs gap-1"
                    disabled={processing === r.id}
                    onClick={() => handleApproveActive(r)}
                  >
                    <Play className="h-3 w-3" />
                    稼働承認（+10,000pt）
                  </Button>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </AppLayout>
  );
};

export default AdminReferralsPage;
