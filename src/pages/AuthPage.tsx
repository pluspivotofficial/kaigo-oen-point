import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { LogIn, UserPlus, Gift, Clock, ExternalLink, Ticket, AlertTriangle } from "lucide-react";
import appLogo from "@/assets/logo.png";

const AuthPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [isHopEmployee, setIsHopEmployee] = useState<boolean | null>(null);
  const [careStatus, setCareStatus] = useState<string | null>(null);

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) {
      setReferralCode(ref);
      setIsLogin(false);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLogin && !termsAgreed) {
      toast({ title: "利用規約への同意が必要です", variant: "destructive" });
      return;
    }
    if (!isLogin && isHopEmployee === null) {
      toast({ title: "ホップでの就業状況を選択してください", variant: "destructive" });
      return;
    }
    if (!isLogin && !careStatus) {
      toast({ title: "介護に関する状況を選択してください", variant: "destructive" });
      return;
    }
    setLoading(true);

    try {
      if (isLogin) {
        const { data: signInData, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;

        // 凍結ユーザーチェック (RLS で自分の profile は SELECT 可能)
        if (signInData.user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("is_banned")
            .eq("user_id", signInData.user.id)
            .maybeSingle();

          if (profile?.is_banned) {
            // 即時サインアウト、メッセージ表示、navigate しない
            // ban_reason は意図的に表示しない (法的・個人情報・敵意リスク回避)
            await supabase.auth.signOut();
            toast({
              title: "ログインできません",
              description: "アカウントが凍結されています。",
              variant: "destructive",
            });
            return;
          }
        }

        navigate("/");
      } else {
        const { data: signUpData, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: displayName, referral_code: referralCode || undefined, is_hop_employee: isHopEmployee, care_status: careStatus },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;

        if (referralCode && signUpData.user) {
          await processReferralCode(referralCode, signUpData.user.id, displayName);
        }

        toast({
          title: "アカウントを作成しました！",
          description: "確認メールをご確認ください。",
        });
      }
    } catch (error: any) {
      toast({ title: "エラー", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const processReferralCode = async (code: string, newUserId: string, userName: string) => {
    try {
      const { data: referral } = await supabase
        .from("referrals")
        .select("*")
        .eq("referral_code", code)
        .eq("status", "pending")
        .single();

      if (!referral) return;

      // 自演紹介チェック (referrer 自身が自分のコードで登録するケースを防止)
      if (referral.referrer_id === newUserId) {
        console.warn("Self-referral attempt blocked", { referrer: referral.referrer_id });
        return;
      }

      // referrals 行を更新 (登録完了状態へ遷移)
      await supabase
        .from("referrals")
        .update({
          status: "completed_registered",
          referred_user_id: newUserId,
          friend_name: userName || email,
          points_awarded: true,
        } as any)
        .eq("id", referral.id);

      // Step1 ボーナス: signup_bonus_granted_at IS NULL のときだけ両方付与
      if (!(referral as any).signup_bonus_granted_at) {
        // 紹介人 +100pt
        await supabase.from("points_history").insert({
          user_id: referral.referrer_id,
          description: "紹介ボーナス[Step1]登録完了",
          points: 100,
          type: "earn",
        });

        // 被紹介人 +100pt
        await supabase.from("points_history").insert({
          user_id: newUserId,
          description: "紹介ボーナス[Step1]登録完了",
          points: 100,
          type: "earn",
        });

        // タイムスタンプセット (重複付与防止)
        await supabase
          .from("referrals")
          .update({ signup_bonus_granted_at: new Date().toISOString() } as any)
          .eq("id", referral.id);
      }

    } catch (err) {
      console.error("Referral processing error:", err);
    }
  };

  return (
    <div className="font-body min-h-screen bg-gradient-sakura-bg flex items-center justify-center px-5 py-8">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <img src={appLogo} alt="介護職応援ポイント" className="h-28 mx-auto mb-2" />
          <p className="text-xs font-display font-bold text-coral tracking-widest mb-2">
            ✿ ようこそ ✿
          </p>
          <h1 className="text-2xl font-display font-black text-navy leading-tight">
            毎日、コツコツ、応援。
          </h1>
          <p className="text-sm text-muted-foreground mt-1 font-body">
            介護のお仕事をポイントに。
          </p>
        </div>

        {referralCode && !isLogin && (
          <Card className="mb-4 border-primary/30 bg-primary/5">
            <CardContent className="p-4 flex items-center gap-3">
              <Ticket className="h-5 w-5 text-primary shrink-0" />
              <div>
                <p className="font-semibold text-sm">招待コードが適用されています</p>
                <p className="text-xs text-muted-foreground">登録完了で紹介者に100ポイントが付与されます</p>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="mb-4 border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Gift className="h-5 w-5 text-primary" />
              <span className="font-semibold text-sm">介護職応援ポイントの特典</span>
            </div>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-primary">1</span>
                </div>
                <div className="text-sm">
                  <p className="font-medium">シフト申請でポイントGET</p>
                  <p className="text-muted-foreground text-xs">申請したシフトに対してポイントが付与されます</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-primary">2</span>
                </div>
                <div className="text-sm">
                  <p className="font-medium">🎉 登録7日間キャンペーン</p>
                  <p className="text-muted-foreground text-xs">登録後7日間はシフト1時間あたり10ポイント！</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-primary">3</span>
                </div>
                <div className="text-sm">
                  <p className="font-medium">都道府県チャレンジ 🏆</p>
                  <p className="text-muted-foreground text-xs">同じ都道府県のみんなで累計稼働時間の目標を達成してボーナスポイント！</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card variant="sakura">
          <CardHeader className="pb-4">
            <CardTitle className="text-base text-center font-display font-bold">
              {isLogin ? "ログイン" : "新規登録"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="displayName">お名前</Label>
                    <Input id="displayName" placeholder="山田 太郎" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required={!isLogin} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="referralCode" className="flex items-center gap-1.5">
                      <Ticket className="h-3.5 w-3.5" /> 紹介コード（任意）
                    </Label>
                    <Input id="referralCode" placeholder="HOP-XXXXXX" value={referralCode} onChange={(e) => setReferralCode(e.target.value.toUpperCase())} className="font-mono" />
                    <p className="text-[10px] text-muted-foreground">紹介コードをお持ちの方は入力してください</p>
                  </div>

                  {/* 介護状況確認 */}
                  <Card className="border-primary/30 bg-primary/5">
                    <CardContent className="p-3 space-y-2">
                      <p className="text-sm font-medium">介護に関する状況を選択してください <span className="text-destructive">*</span></p>
                      <div className="flex flex-col gap-2">
                        <Button type="button" size="sm" variant={careStatus === "qualified" ? "default" : "outline"} onClick={() => setCareStatus("qualified")} className="justify-start">
                          介護の資格を持っている
                        </Button>
                        <Button type="button" size="sm" variant={careStatus === "working" ? "default" : "outline"} onClick={() => setCareStatus("working")} className="justify-start">
                          現在介護職として就労中
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* ホップ就業確認 */}
                  <Card className="border-secondary/30 bg-secondary/5">
                    <CardContent className="p-3 space-y-2">
                      <p className="text-sm font-medium flex items-center gap-1.5">
                        <AlertTriangle className="h-4 w-4 text-secondary" />
                        現在ホップで就業していますか？
                      </p>
                      <div className="flex gap-3">
                        <Button type="button" size="sm" variant={isHopEmployee === true ? "default" : "outline"} onClick={() => setIsHopEmployee(true)}>はい</Button>
                        <Button type="button" size="sm" variant={isHopEmployee === false ? "default" : "outline"} onClick={() => setIsHopEmployee(false)}>いいえ</Button>
                      </div>
                      {isHopEmployee === true && (
                        <p className="text-xs text-muted-foreground bg-muted p-2 rounded">
                          既にホップで就業中の方は、稼働ポイントは既存のシステムで対応いたしますので、こちらのアプリでの稼働ポイント付与は行いません。シフト申請によるポイントは通常通り獲得できます。
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  {/* 利用規約同意 */}
                  <div className="flex items-start gap-2">
                    <Checkbox id="terms" checked={termsAgreed} onCheckedChange={(c) => setTermsAgreed(!!c)} className="mt-0.5" />
                    <label htmlFor="terms" className="text-xs leading-relaxed cursor-pointer">
                      <a href="https://www.pluspivot.co.jp/general-8/" target="_blank" rel="noopener noreferrer" className="text-primary underline">利用規約・プライバシーポリシー</a>を確認し、同意します。
                    </label>
                  </div>
                </>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">メールアドレス</Label>
                <Input id="email" type="email" placeholder="taro@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">パスワード</Label>
                <Input id="password" type="password" placeholder="6文字以上" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
              </div>
              <Button
                type="submit"
                variant="sakura"
                className="w-full"
                size="lg"
                disabled={loading || (!isLogin && !termsAgreed)}
              >
                {isLogin ? (
                  <><LogIn className="h-4 w-4 mr-2" />ログイン</>
                ) : (
                  <><UserPlus className="h-4 w-4 mr-2" />アカウント作成</>
                )}
              </Button>
            </form>
            <div className="mt-4 text-center">
              <button type="button" onClick={() => setIsLogin(!isLogin)} className="text-sm text-primary hover:underline">
                {isLogin ? "アカウントをお持ちでない方はこちら" : "すでにアカウントをお持ちの方はこちら"}
              </button>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-4 border-secondary/20 bg-secondary/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-secondary" />
              <span className="font-medium text-sm">ポイント有効化について</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              ホップカイゴで会員登録・仕事を開始すると、
              <span className="text-foreground font-medium">勤務時間に応じて1時間＝1ポイント</span>
              が自動的に加算されます。
            </p>
            <a href="https://hop-kaigo.jp/register/seeker" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-2 text-xs text-secondary hover:underline">
              <ExternalLink className="h-3 w-3" /> ホップカイゴで会員登録する
            </a>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AuthPage;
