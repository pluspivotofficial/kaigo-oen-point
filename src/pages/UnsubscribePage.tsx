import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { CheckCircle2, AlertCircle, Loader2, Heart } from "lucide-react";
import SakuraBg from "@/components/welcome/SakuraBg";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

type Status = "loading" | "success" | "already_used" | "missing_token" | "invalid_token" | "error";

interface UnsubscribeResult {
  success: boolean;
  reason?: string;
  email?: string;
  already_used?: boolean;
}

const UnsubscribePage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<Status>("loading");
  const [email, setEmail] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const original = document.title;
    document.title = "配信停止 | 介護職応援ポイント";
    return () => {
      document.title = original;
    };
  }, []);

  useEffect(() => {
    if (!token) {
      setStatus("missing_token");
      return;
    }

    void (async () => {
      const { data, error } = await supabase.rpc("use_unsubscribe_token", {
        p_token: token,
      });
      if (error) {
        setStatus("error");
        setErrorMsg(error.message);
        return;
      }
      const result = data as unknown as UnsubscribeResult;
      if (!result?.success) {
        if (result?.reason === "invalid_token") {
          setStatus("invalid_token");
        } else {
          setStatus("error");
          setErrorMsg(result?.reason ?? "不明なエラー");
        }
        return;
      }
      setEmail(result.email ?? null);
      setStatus(result.already_used ? "already_used" : "success");
    })();
  }, [token]);

  const renderContent = () => {
    if (status === "loading") {
      return (
        <div className="text-center space-y-3 py-6">
          <Loader2 className="h-10 w-10 text-coral mx-auto animate-spin" />
          <p className="font-display text-base text-ink/80">処理中...</p>
        </div>
      );
    }

    if (status === "success" || status === "already_used") {
      return (
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-coral/10">
            <CheckCircle2 className="h-9 w-9 text-coral" />
          </div>
          <div className="space-y-2">
            <h1 className="font-display font-bold text-2xl text-ink">
              {status === "already_used"
                ? "配信は既に停止されています"
                : "配信を停止しました"}
            </h1>
            {email && (
              <p className="font-body text-sm text-ink/70">
                <span className="font-mono text-xs bg-cream/60 px-2 py-1 rounded">
                  {email}
                </span>
                <span className="block mt-2">宛のメール配信を停止しました。</span>
              </p>
            )}
            <p className="font-body text-xs text-ink/60 pt-2 leading-relaxed">
              今後、運営からのお知らせメールは送信されません。
              <br />
              ご利用ありがとうございました。
            </p>
          </div>
        </div>
      );
    }

    if (status === "missing_token") {
      return (
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-100">
            <AlertCircle className="h-9 w-9 text-amber-600" />
          </div>
          <div className="space-y-2">
            <h1 className="font-display font-bold text-xl text-ink">
              リンクが正しくありません
            </h1>
            <p className="font-body text-sm text-ink/70 leading-relaxed">
              配信停止トークンが見つかりません。
              <br />
              メール内のリンクをもう一度お試しください。
            </p>
          </div>
        </div>
      );
    }

    if (status === "invalid_token") {
      return (
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-100">
            <AlertCircle className="h-9 w-9 text-amber-600" />
          </div>
          <div className="space-y-2">
            <h1 className="font-display font-bold text-xl text-ink">
              リンクが無効です
            </h1>
            <p className="font-body text-sm text-ink/70 leading-relaxed">
              このリンクは無効か、期限切れです。
              <br />
              最新のメールに記載の配信停止リンクをご利用ください。
            </p>
            <p className="font-body text-xs text-ink/60 pt-2">
              アプリにログイン中の方は、設定画面からも配信停止できます。
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10">
          <AlertCircle className="h-9 w-9 text-destructive" />
        </div>
        <div className="space-y-2">
          <h1 className="font-display font-bold text-xl text-ink">
            エラーが発生しました
          </h1>
          <p className="font-body text-sm text-ink/70 leading-relaxed">
            時間をおいてもう一度お試しください。
            <br />
            問題が続く場合は運営までお問い合わせください。
          </p>
          {errorMsg && (
            <p className="font-mono text-[10px] text-ink/40 pt-2">
              {errorMsg}
            </p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="font-body relative min-h-screen overflow-x-hidden bg-gradient-sakura-bg">
      <SakuraBg />

      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-sakura p-7 sm:p-8 border border-pink-100">
            {/* ロゴ */}
            <div className="flex flex-col items-center gap-2 mb-6">
              <img
                src="/icon-512.png"
                alt="介護職応援ポイント"
                className="w-14 h-14 rounded-xl"
              />
              <p className="font-display font-bold text-sm text-coral tracking-wide">
                <span className="text-pink/80">✿</span>&nbsp;介護職応援ポイント&nbsp;<span className="text-pink/80">✿</span>
              </p>
            </div>

            {renderContent()}

            {/* CTA */}
            {status !== "loading" && (
              <div className="mt-7 pt-5 border-t border-pink-100/60">
                <Button asChild variant="ghost" size="sm" className="w-full text-coral hover:bg-coral/5">
                  <Link to="/welcome">
                    <Heart className="h-4 w-4 mr-1.5" />
                    介護職応援ポイントを見る
                  </Link>
                </Button>
              </div>
            )}
          </div>

          <p className="text-center text-[10px] text-ink/50 mt-4">
            © 2026 介護職応援ポイント / 株式会社プラス・ピボット
          </p>
        </div>
      </div>
    </div>
  );
};

export default UnsubscribePage;
