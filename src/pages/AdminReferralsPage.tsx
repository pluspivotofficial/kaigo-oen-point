import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AdminLayout from "@/components/AdminLayout";
import { Users, CheckCircle } from "lucide-react";
import { format } from "date-fns";

interface Referral {
  id: string;
  referrer_id: string;
  friend_name: string;
  friend_contact: string;
  referred_user_id: string | null;
  status: string;
  points_awarded: boolean;
  signup_bonus_granted_at: string | null;
  profile_bonus_granted_at: string | null;
  created_at: string;
}

interface ApproveResult {
  granted: boolean;
  reason?: string;
  points?: number;
}

const REASON_MESSAGES: Record<string, string> = {
  already_granted: "既に承認済みです",
  race_lost: "別の管理者が先に承認しました",
  not_found: "対象が見つかりません",
};

const AdminReferralsPage = () => {
  const { isAdmin, isAdminLoading } = useAuth();
  const navigate = useNavigate();
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  const fetchReferrals = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("referrals")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setReferrals(data as Referral[]);
    setLoading(false);
  };

  useEffect(() => {
    if (isAdminLoading) return;
    if (!isAdmin) {
      navigate("/");
      return;
    }
    void fetchReferrals();
  }, [isAdmin, isAdminLoading, navigate]);

  // pending = 未承認、それ以外は承認済み扱い (signup_bonus_granted_at の有無で監査)
  const { pendingList, approvedList } = useMemo(() => {
    const pending: Referral[] = [];
    const approved: Referral[] = [];
    referrals.forEach((r) => {
      if (r.status === "pending") pending.push(r);
      else approved.push(r);
    });
    return { pendingList: pending, approvedList: approved };
  }, [referrals]);

  const handleApprove = async (referral: Referral) => {
    setProcessing(referral.id);
    const { data, error } = await supabase.rpc(
      "approve_referral_signup_bonus",
      { p_referral_id: referral.id }
    );
    setProcessing(null);

    if (error) {
      toast({
        title: "エラー",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    const result = data as unknown as ApproveResult;
    if (!result?.granted) {
      const reason = result?.reason ?? "unknown";
      toast({
        title: "承認できませんでした",
        description: REASON_MESSAGES[reason] ?? `理由: ${reason}`,
        variant: "destructive",
      });
      // 競合や状態ズレに備えて再同期
      void fetchReferrals();
      return;
    }

    // 成功時のローカル状態更新
    setReferrals((prev) =>
      prev.map((r) =>
        r.id === referral.id
          ? {
              ...r,
              status: "completed_registered",
              points_awarded: true,
              signup_bonus_granted_at: new Date().toISOString(),
            }
          : r
      )
    );
    toast({
      title: `${referral.friend_name || "紹介ユーザー"}さんを承認し、100ptを付与しました`,
    });
  };

  const statusBadge = (r: Referral) => {
    if (r.status === "completed_registered") {
      const hasStep2 = !!r.profile_bonus_granted_at;
      return (
        <Badge variant={hasStep2 ? "default" : "secondary"} className="text-xs">
          {hasStep2 ? "Step2 完了 (+600pt)" : "登録完了 (+100pt)"}
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="text-xs">
        申請中
      </Badge>
    );
  };

  const formatDateTime = (iso: string | null) =>
    iso ? format(new Date(iso), "yyyy/MM/dd HH:mm") : "—";

  const renderRow = (r: Referral, withButton: boolean) => (
    <div key={r.id} className="p-3 rounded-lg bg-muted space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">
            {r.friend_name || "未登録"}
          </p>
          {r.friend_contact && (
            <p className="text-xs text-muted-foreground truncate">
              {r.friend_contact}
            </p>
          )}
          <p className="text-[10px] text-muted-foreground">
            申請: {format(new Date(r.created_at), "yyyy/MM/dd")}
            {r.signup_bonus_granted_at && (
              <>
                {" / "}承認: {formatDateTime(r.signup_bonus_granted_at)}
              </>
            )}
          </p>
        </div>
        {statusBadge(r)}
      </div>
      {withButton && (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="text-xs gap-1"
            disabled={processing === r.id}
            onClick={() => handleApprove(r)}
          >
            <CheckCircle className="h-3 w-3" />
            {processing === r.id ? "処理中..." : "登録承認(+100pt)"}
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <AdminLayout title="紹介管理">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            紹介一覧
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">読み込み中...</p>
          ) : referrals.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              紹介はまだありません
            </p>
          ) : (
            <Tabs defaultValue="pending">
              <TabsList>
                <TabsTrigger value="pending">
                  未承認 ({pendingList.length})
                </TabsTrigger>
                <TabsTrigger value="approved">
                  承認済み ({approvedList.length})
                </TabsTrigger>
              </TabsList>
              <TabsContent value="pending" className="mt-3 space-y-3">
                {pendingList.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    未承認の紹介はありません
                  </p>
                ) : (
                  pendingList.map((r) => renderRow(r, true))
                )}
              </TabsContent>
              <TabsContent value="approved" className="mt-3 space-y-3">
                {approvedList.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    承認済みの紹介はありません
                  </p>
                ) : (
                  approvedList.map((r) => renderRow(r, false))
                )}
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  );
};

export default AdminReferralsPage;
