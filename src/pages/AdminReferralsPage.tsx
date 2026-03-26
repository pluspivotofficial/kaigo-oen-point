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

  const handleMarkRegistered = async (referral: Referral) => {
    setProcessing(referral.id);
    // Update status to registered
    const { error } = await supabase
      .from("referrals")
      .update({ status: "registered" })
      .eq("id", referral.id);

    if (error) {
      toast({ title: "エラー", description: error.message, variant: "destructive" });
      setProcessing(null);
      return;
    }

    // Award 500 points to referrer
    await supabase.from("points_history").insert({
      user_id: referral.referrer_id,
      description: `紹介ボーナス（${referral.friend_name}さん登録）`,
      points: 500,
      type: "earn",
    });

    setReferrals((prev) => prev.map((r) => r.id === referral.id ? { ...r, status: "registered" } : r));
    toast({ title: `${referral.friend_name}さんを登録済みにし、500ptを付与しました` });
    setProcessing(null);
  };

  const handleMarkActive = async (referral: Referral) => {
    setProcessing(referral.id);
    const { error } = await supabase
      .from("referrals")
      .update({ status: "active", points_awarded: true })
      .eq("id", referral.id);

    if (error) {
      toast({ title: "エラー", description: error.message, variant: "destructive" });
      setProcessing(null);
      return;
    }

    // Award 15000 points to referrer
    await supabase.from("points_history").insert({
      user_id: referral.referrer_id,
      description: `紹介ボーナス（${referral.friend_name}さん稼働開始）`,
      points: 15000,
      type: "earn",
    });

    setReferrals((prev) => prev.map((r) => r.id === referral.id ? { ...r, status: "active", points_awarded: true } : r));
    toast({ title: `${referral.friend_name}さんを稼働開始にし、15,000ptを付与しました` });
    setProcessing(null);
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "registered": return <Badge variant="outline" className="text-xs">登録済み</Badge>;
      case "active": return <Badge variant="default" className="text-xs">稼働開始</Badge>;
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
                  <p className="text-sm font-medium">{r.friend_name}</p>
                  <p className="text-xs text-muted-foreground">{r.friend_contact}</p>
                  <p className="text-[10px] text-muted-foreground">{new Date(r.created_at).toLocaleDateString("ja-JP")}</p>
                </div>
                {statusBadge(r.status)}
              </div>
              <div className="flex gap-2">
                {r.status === "pending" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs gap-1"
                    disabled={processing === r.id}
                    onClick={() => handleMarkRegistered(r)}
                  >
                    <CheckCircle className="h-3 w-3" />
                    登録済みにする（+500pt）
                  </Button>
                )}
                {r.status === "registered" && (
                  <Button
                    size="sm"
                    className="text-xs gap-1"
                    disabled={processing === r.id}
                    onClick={() => handleMarkActive(r)}
                  >
                    <Play className="h-3 w-3" />
                    稼働開始にする（+15,000pt）
                  </Button>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </AppLayout>
  );
};

export default AdminReferralsPage;
