import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Coins, LogIn, UserPlus, Gift, Clock, ExternalLink } from "lucide-react";

const AuthPage = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate("/");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: displayName },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        toast({
          title: "アカウントを作成しました！",
          description: "確認メールをご確認ください。",
        });
      }
    } catch (error: any) {
      toast({
        title: "エラー",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-5 py-8">
      <div className="w-full max-w-sm">
        {/* Logo and Title */}
        <div className="text-center mb-6">
          <div className="h-16 w-16 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4">
            <Coins className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">ホップポイント</h1>
          <p className="text-sm text-muted-foreground mt-1">介護派遣ポイ活アプリ</p>
        </div>

        {/* Point Benefits Card */}
        <Card className="mb-4 border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Gift className="h-5 w-5 text-primary" />
              <span className="font-semibold text-sm">ホップポイントの特典</span>
            </div>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-reward-gold/20 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-reward-gold">1</span>
                </div>
                <div className="text-sm">
                  <p className="font-medium">シフト申請でポイントGET</p>
                  <p className="text-muted-foreground text-xs">申請したシフトに対してポイントが付与されます</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-reward-gold/20 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-reward-gold">2</span>
                </div>
                <div className="text-sm">
                  <p className="font-medium">勤務でさらにポイントUP</p>
                  <p className="text-muted-foreground text-xs">会員登録後、実際の勤務時間に応じてポイントが加算</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-reward-gold/20 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-reward-gold">3</span>
                </div>
                <div className="text-sm">
                  <p className="font-medium">都道府県チャレンジ 🏆</p>
                  <p className="text-muted-foreground text-xs">同じ都道府県のみんなで累計稼働時間の目標を達成してボーナスポイント！</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Auth Form Card */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base text-center">
              {isLogin ? "ログイン" : "新規登録"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="displayName">お名前</Label>
                  <Input
                    id="displayName"
                    placeholder="山田 太郎"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    required={!isLogin}
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">メールアドレス</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="taro@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">パスワード</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="6文字以上"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {isLogin ? (
                  <><LogIn className="h-4 w-4 mr-2" />ログイン</>
                ) : (
                  <><UserPlus className="h-4 w-4 mr-2" />アカウント作成</>
                )}
              </Button>
            </form>
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-sm text-primary hover:underline"
              >
                {isLogin ? "アカウントをお持ちでない方はこちら" : "すでにアカウントをお持ちの方はこちら"}
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Point Activation Note */}
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
            <a
              href="https://hop-kaigo.jp/register/seeker"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-2 text-xs text-secondary hover:underline"
            >
              <ExternalLink className="h-3 w-3" />
              ホップカイゴで会員登録する
            </a>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AuthPage;
