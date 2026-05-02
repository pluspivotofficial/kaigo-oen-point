import { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowRight,
  Shield,
  Ban,
  Activity,
  ExternalLink,
  ArrowDown,
  ArrowUp,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  userId: string | null;
  open: boolean;
  onClose: () => void;
}

interface ProfileFull {
  user_id: string;
  display_name: string | null;
  email: string | null;
  full_name: string | null;
  prefecture: string | null;
  address: string | null;
  date_of_birth: string | null;
  gender: string | null;
  phone_number: string | null;
  facility_name: string | null;
  current_status: string | null;
  current_job: string | null;
  employment_type: string | null;
  care_qualifications: string | null;
  care_experience: string | null;
  dispatch_company: string | null;
  hourly_rate: number | null;
  contract_end_date: string | null;
  work_location: string | null;
  weekly_days: string | null;
  preferred_shift: string | null;
  avatar_url: string | null;
  is_admin: boolean;
  is_banned: boolean;
  ban_reason: string | null;
  banned_at: string | null;
  banned_by: string | null;
  created_at: string;
  updated_at: string;
  first_launch_date: string;
}

interface PointEntry {
  id: string;
  points: number;
  description: string;
  reason: string | null;
  type: string;
  admin_action: boolean;
  created_at: string;
}

interface ShiftEntry {
  id: string;
  shift_date: string;
  shift_type: string;
  hours: number;
  points_earned: number;
  start_time: string;
  end_time: string;
}

interface ReferralEntry {
  id: string;
  referrer_id: string;
  referred_user_id: string | null;
  friend_name: string | null;
  status: string;
  points_awarded: boolean;
  referral_code: string | null;
  signup_bonus_granted_at: string | null;
  profile_bonus_granted_at: string | null;
  created_at: string;
}

interface CounterpartProfile {
  display_name: string | null;
  email: string | null;
}

interface UserDetailData {
  profile: ProfileFull;
  points: PointEntry[];
  shifts: ShiftEntry[];
  refsAsReferrer: ReferralEntry[];
  refsAsReferred: ReferralEntry[];
  lastSignInAt: string | null;
  counterparts: Map<string, CounterpartProfile>;
}

// 共通の Field 表示
const Field = ({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) => (
  <div className="space-y-0.5">
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="text-sm">
      {value !== null && value !== undefined && value !== "" ? (
        value
      ) : (
        <span className="text-muted-foreground">—</span>
      )}
    </p>
  </div>
);

const fmtDate = (iso: string | null) =>
  iso ? format(new Date(iso), "yyyy/MM/dd") : null;
const fmtDateTime = (iso: string | null) =>
  iso ? format(new Date(iso), "yyyy/MM/dd HH:mm") : null;

const UserDetailModal = ({ userId, open, onClose }: Props) => {
  const { data, isLoading, error } = useQuery<UserDetailData>({
    queryKey: ["adminUserDetail", userId],
    enabled: !!userId && open,
    queryFn: async () => {
      if (!userId) throw new Error("no userId");

      // Stage 1: 6並列
      const [
        profileRes,
        pointsRes,
        shiftsRes,
        refsAsReferrerRes,
        refsAsReferredRes,
        lastSignInRes,
      ] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", userId).single(),
        supabase
          .from("points_history")
          .select("id, points, description, reason, type, admin_action, created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(100),
        supabase
          .from("shifts")
          .select("id, shift_date, shift_type, hours, points_earned, start_time, end_time")
          .eq("user_id", userId)
          .order("shift_date", { ascending: false })
          .limit(100),
        supabase
          .from("referrals")
          .select("*")
          .eq("referrer_id", userId)
          .order("created_at", { ascending: false }),
        supabase
          .from("referrals")
          .select("*")
          .eq("referred_user_id", userId)
          .order("created_at", { ascending: false }),
        supabase.rpc("get_user_last_sign_in", { _user_ids: [userId] }),
      ]);

      if (profileRes.error) throw profileRes.error;

      // Stage 2: 紹介相手の profiles を必要時のみ追加取得
      const counterpartIds = new Set<string>();
      (refsAsReferrerRes.data ?? []).forEach((r: any) => {
        if (r.referred_user_id) counterpartIds.add(r.referred_user_id);
      });
      (refsAsReferredRes.data ?? []).forEach((r: any) => {
        if (r.referrer_id) counterpartIds.add(r.referrer_id);
      });

      const counterparts = new Map<string, CounterpartProfile>();
      if (counterpartIds.size > 0) {
        const { data: cps } = await supabase
          .from("profiles")
          .select("user_id, display_name, email")
          .in("user_id", Array.from(counterpartIds));
        (cps ?? []).forEach((p) => {
          counterparts.set(p.user_id, {
            display_name: p.display_name,
            email: p.email,
          });
        });
      }

      const lastSignInAt =
        ((lastSignInRes.data ?? [])[0] as any)?.last_sign_in_at ?? null;

      return {
        profile: profileRes.data as ProfileFull,
        points: (pointsRes.data ?? []) as PointEntry[],
        shifts: (shiftsRes.data ?? []) as ShiftEntry[],
        refsAsReferrer: (refsAsReferrerRes.data ?? []) as ReferralEntry[],
        refsAsReferred: (refsAsReferredRes.data ?? []) as ReferralEntry[],
        lastSignInAt,
        counterparts,
      };
    },
  });

  useEffect(() => {
    if (error) {
      toast({
        title: "ユーザー詳細の取得に失敗しました",
        description: error instanceof Error ? error.message : "Unknown",
        variant: "destructive",
      });
    }
  }, [error]);

  // 集計値（タブ間で参照）
  const stats = useMemo(() => {
    if (!data) return null;
    let earned = 0;
    let used = 0;
    data.points.forEach((p) => {
      if (p.points > 0) earned += p.points;
      else if (p.points < 0) used += Math.abs(p.points);
    });
    const balance = earned - used;
    return { earned, used, balance };
  }, [data]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        {isLoading || !data ? (
          <div className="space-y-4 py-2">
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : (
          <>
            <DialogHeader>
              <div className="flex items-start justify-between gap-3 pr-8">
                <div className="min-w-0">
                  <DialogTitle className="truncate">
                    {data.profile.display_name || "(表示名未設定)"}
                  </DialogTitle>
                  <p className="text-sm text-muted-foreground mt-1 truncate">
                    {data.profile.email || "—"}
                  </p>
                  <div className="flex gap-1 mt-2 flex-wrap">
                    {data.profile.is_admin && (
                      <Badge variant="default">
                        <Shield className="h-3 w-3 mr-1" />管理者
                      </Badge>
                    )}
                    {data.profile.is_banned && (
                      <Badge variant="destructive">
                        <Ban className="h-3 w-3 mr-1" />凍結
                      </Badge>
                    )}
                    {!data.profile.is_admin && !data.profile.is_banned && (
                      <Badge variant="outline">通常</Badge>
                    )}
                  </div>
                </div>
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  onClick={onClose}
                >
                  <Link to={`/admin/users/${data.profile.user_id}`}>
                    詳細ページ
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Link>
                </Button>
              </div>
            </DialogHeader>

            {/* ストリップ: 集計値サマリ */}
            {stats && (
              <div className="grid grid-cols-3 gap-3 py-2 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">残高</p>
                  <p className="font-mono font-bold">
                    {stats.balance.toLocaleString()} pt
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">累計獲得</p>
                  <p className="font-mono text-green-600">
                    +{stats.earned.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">累計使用</p>
                  <p className="font-mono text-red-600">
                    -{stats.used.toLocaleString()}
                  </p>
                </div>
              </div>
            )}

            <Tabs defaultValue="info" className="mt-2">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="info">基本情報</TabsTrigger>
                <TabsTrigger value="points">
                  ポイント
                  {data.points.length > 0 && (
                    <span className="ml-1 text-xs text-muted-foreground">
                      ({data.points.length})
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="shifts">
                  シフト
                  {data.shifts.length > 0 && (
                    <span className="ml-1 text-xs text-muted-foreground">
                      ({data.shifts.length})
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="referrals">紹介</TabsTrigger>
                <TabsTrigger value="activity">アクティビティ</TabsTrigger>
              </TabsList>

              {/* === Tab 1: 基本情報 === */}
              <TabsContent value="info" className="space-y-5 pt-3">
                <section>
                  <h3 className="text-sm font-semibold mb-2 text-foreground">
                    基本
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <Field label="表示名" value={data.profile.display_name} />
                    <Field label="メアド" value={data.profile.email} />
                    <Field label="フリガナ" value={data.profile.full_name} />
                    <Field label="電話番号" value={data.profile.phone_number} />
                    <Field
                      label="生年月日"
                      value={fmtDate(data.profile.date_of_birth)}
                    />
                    <Field label="性別" value={data.profile.gender} />
                    <Field label="都道府県" value={data.profile.prefecture} />
                    <Field label="住所" value={data.profile.address} />
                    <Field label="施設名" value={data.profile.facility_name} />
                  </div>
                </section>

                <section>
                  <h3 className="text-sm font-semibold mb-2 text-foreground">
                    勤務情報
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <Field
                      label="現在の状態"
                      value={data.profile.current_status}
                    />
                    <Field label="お仕事" value={data.profile.current_job} />
                    <Field
                      label="雇用形態"
                      value={data.profile.employment_type}
                    />
                    <Field
                      label="お持ちの資格"
                      value={data.profile.care_qualifications}
                    />
                    <Field
                      label="経験年数"
                      value={data.profile.care_experience}
                    />
                    <Field
                      label="勤務地"
                      value={data.profile.work_location}
                    />
                    <Field
                      label="希望勤務日数"
                      value={data.profile.weekly_days}
                    />
                    <Field
                      label="希望シフト"
                      value={data.profile.preferred_shift}
                    />
                  </div>
                </section>

                <section>
                  <h3 className="text-sm font-semibold mb-2 text-foreground">
                    派遣情報
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <Field
                      label="派遣会社"
                      value={data.profile.dispatch_company}
                    />
                    <Field
                      label="時給"
                      value={
                        data.profile.hourly_rate
                          ? `¥${data.profile.hourly_rate.toLocaleString()}`
                          : null
                      }
                    />
                    <Field
                      label="契約終了"
                      value={fmtDate(data.profile.contract_end_date)}
                    />
                  </div>
                </section>

                {data.profile.is_banned && (
                  <section>
                    <h3 className="text-sm font-semibold mb-2 text-destructive">
                      凍結情報
                    </h3>
                    <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 space-y-2 text-sm">
                      <Field
                        label="凍結理由"
                        value={data.profile.ban_reason}
                      />
                      <Field
                        label="凍結日時"
                        value={fmtDateTime(data.profile.banned_at)}
                      />
                    </div>
                  </section>
                )}

                <section>
                  <h3 className="text-sm font-semibold mb-2 text-foreground">
                    システム
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <Field
                      label="登録日"
                      value={fmtDate(data.profile.created_at)}
                    />
                    <Field
                      label="最終更新"
                      value={fmtDateTime(data.profile.updated_at)}
                    />
                    <Field
                      label="user_id"
                      value={
                        <span className="text-xs font-mono break-all">
                          {data.profile.user_id}
                        </span>
                      }
                    />
                  </div>
                </section>
              </TabsContent>

              {/* === Tab 2: ポイント履歴 === */}
              <TabsContent value="points" className="pt-3">
                {data.points.length === 0 ? (
                  <p className="text-center py-12 text-muted-foreground text-sm">
                    ポイント履歴なし
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>日時</TableHead>
                        <TableHead>説明</TableHead>
                        <TableHead className="text-right">変動</TableHead>
                        <TableHead>種別</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.points.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="text-xs whitespace-nowrap">
                            {format(new Date(p.created_at), "MM/dd HH:mm")}
                          </TableCell>
                          <TableCell className="text-sm">
                            <div>{p.description}</div>
                            {p.admin_action && p.reason && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                理由: {p.reason}
                              </p>
                            )}
                          </TableCell>
                          <TableCell
                            className={`text-right font-mono ${
                              p.points >= 0 ? "text-green-600" : "text-red-600"
                            }`}
                          >
                            {p.points >= 0 ? "+" : ""}
                            {p.points.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={p.admin_action ? "default" : "outline"}
                              className="text-[10px]"
                            >
                              {p.admin_action ? "管理者" : p.type}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>

              {/* === Tab 3: シフト履歴 === */}
              <TabsContent value="shifts" className="pt-3">
                {data.shifts.length === 0 ? (
                  <p className="text-center py-12 text-muted-foreground text-sm">
                    シフト履歴なし
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>日付</TableHead>
                        <TableHead>シフト種別</TableHead>
                        <TableHead>時間</TableHead>
                        <TableHead className="text-right">時間数</TableHead>
                        <TableHead className="text-right">獲得pt</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.shifts.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell className="text-sm whitespace-nowrap">
                            {format(new Date(s.shift_date), "yyyy/MM/dd")}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px]">
                              {s.shift_type}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs whitespace-nowrap">
                            {s.start_time?.slice(0, 5)} - {s.end_time?.slice(0, 5)}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {s.hours}h
                          </TableCell>
                          <TableCell className="text-right font-mono text-green-600">
                            +{s.points_earned}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>

              {/* === Tab 4: 紹介関係 === */}
              <TabsContent value="referrals" className="space-y-5 pt-3">
                <section>
                  <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <ArrowUp className="h-4 w-4 text-primary" />
                    招待した人 ({data.refsAsReferrer.length})
                  </h3>
                  {data.refsAsReferrer.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4">
                      まだ誰も招待していません
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>招待コード</TableHead>
                          <TableHead>相手</TableHead>
                          <TableHead>状態</TableHead>
                          <TableHead>Step1</TableHead>
                          <TableHead>Step2</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.refsAsReferrer.map((r) => {
                          const counterpart = r.referred_user_id
                            ? data.counterparts.get(r.referred_user_id)
                            : null;
                          return (
                            <TableRow key={r.id}>
                              <TableCell className="font-mono text-xs">
                                {r.referral_code || "—"}
                              </TableCell>
                              <TableCell className="text-sm">
                                {counterpart ? (
                                  <>
                                    <div>
                                      {counterpart.display_name || "(未設定)"}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      {counterpart.email}
                                    </div>
                                  </>
                                ) : (
                                  <span className="text-muted-foreground">
                                    {r.friend_name || "未登録"}
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className="text-[10px]"
                                >
                                  {r.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs">
                                {r.signup_bonus_granted_at
                                  ? "✓ +100"
                                  : "—"}
                              </TableCell>
                              <TableCell className="text-xs">
                                {r.profile_bonus_granted_at
                                  ? "✓ +500"
                                  : "—"}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </section>

                <section>
                  <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <ArrowDown className="h-4 w-4 text-primary" />
                    招待された記録 ({data.refsAsReferred.length})
                  </h3>
                  {data.refsAsReferred.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4">
                      招待経由の登録ではありません
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>招待者</TableHead>
                          <TableHead>状態</TableHead>
                          <TableHead>Step1</TableHead>
                          <TableHead>Step2</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.refsAsReferred.map((r) => {
                          const counterpart = data.counterparts.get(r.referrer_id);
                          return (
                            <TableRow key={r.id}>
                              <TableCell className="text-sm">
                                {counterpart ? (
                                  <>
                                    <div>
                                      {counterpart.display_name || "(未設定)"}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      {counterpart.email}
                                    </div>
                                  </>
                                ) : (
                                  <span className="text-muted-foreground">
                                    —
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className="text-[10px]"
                                >
                                  {r.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs">
                                {r.signup_bonus_granted_at
                                  ? fmtDateTime(r.signup_bonus_granted_at)
                                  : "—"}
                              </TableCell>
                              <TableCell className="text-xs">
                                {r.profile_bonus_granted_at
                                  ? fmtDateTime(r.profile_bonus_granted_at)
                                  : "—"}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </section>
              </TabsContent>

              {/* === Tab 5: アクティビティ === */}
              <TabsContent value="activity" className="space-y-3 pt-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-md border p-4">
                    <p className="text-xs text-muted-foreground mb-1">
                      最終ログイン
                    </p>
                    <p className="text-sm font-medium">
                      {data.lastSignInAt ? (
                        <>
                          {formatDistanceToNow(new Date(data.lastSignInAt), {
                            addSuffix: true,
                            locale: ja,
                          })}
                          <span className="block text-xs text-muted-foreground mt-0.5">
                            {fmtDateTime(data.lastSignInAt)}
                          </span>
                        </>
                      ) : (
                        <span className="text-muted-foreground">未ログイン</span>
                      )}
                    </p>
                  </div>

                  <div className="rounded-md border p-4">
                    <p className="text-xs text-muted-foreground mb-1">登録日</p>
                    <p className="text-sm font-medium">
                      {fmtDateTime(data.profile.created_at)}
                    </p>
                  </div>

                  <div className="rounded-md border p-4">
                    <p className="text-xs text-muted-foreground mb-1">
                      最後のシフト
                    </p>
                    <p className="text-sm font-medium">
                      {data.shifts[0] ? (
                        <>
                          {fmtDate(data.shifts[0].shift_date)}
                          <span className="block text-xs text-muted-foreground mt-0.5">
                            {data.shifts[0].shift_type} / {data.shifts[0].hours}h
                          </span>
                        </>
                      ) : (
                        <span className="text-muted-foreground">なし</span>
                      )}
                    </p>
                  </div>

                  <div className="rounded-md border p-4">
                    <p className="text-xs text-muted-foreground mb-1">
                      最後のポイント変動
                    </p>
                    <p className="text-sm font-medium">
                      {data.points[0] ? (
                        <>
                          {fmtDateTime(data.points[0].created_at)}
                          <span
                            className={`block text-xs mt-0.5 font-mono ${
                              data.points[0].points >= 0
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            {data.points[0].points >= 0 ? "+" : ""}
                            {data.points[0].points.toLocaleString()} pt -{" "}
                            {data.points[0].description}
                          </span>
                        </>
                      ) : (
                        <span className="text-muted-foreground">なし</span>
                      )}
                    </p>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground flex items-start gap-1.5">
                  <Activity className="h-3 w-3 mt-0.5 shrink-0" />
                  詳細な監査ログテーブルは未実装。最終ログイン以外の主要イベントは履歴タブで確認可能。
                </p>
              </TabsContent>
            </Tabs>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default UserDetailModal;
