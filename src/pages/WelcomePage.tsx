import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import SakuraBg from "@/components/welcome/SakuraBg";
import Sparkles from "@/components/welcome/Sparkles";
import FloatingHearts from "@/components/welcome/FloatingHearts";

/**
 * /welcome - 未ログイン者向けの第一印象画面
 * (説明資料 kaigooenpointo スライド1の完全再現)
 *
 * - 認証済ユーザーは即 / にリダイレクト
 * - スクロール下部に「ログインはこちら」リンクで /auth へ
 * - CTAボタン「今すぐはじめる」で /auth へ
 */
const WelcomePage = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  // 認証済ユーザーは / へ
  useEffect(() => {
    if (!loading && user) {
      navigate("/", { replace: true });
    }
  }, [user, loading, navigate]);

  // ブラウザタブのタイトル動的変更
  useEffect(() => {
    const original = document.title;
    document.title = "介護職応援ポイント | 介護職に新しいポイント";
    return () => {
      document.title = original;
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-sakura-bg flex items-center justify-center">
        <p className="text-coral font-display font-bold">読み込み中...</p>
      </div>
    );
  }

  // 認証済ユーザーは redirect 待ちなので何も描画しない
  if (user) return null;

  return (
    <div className="font-body relative min-h-screen overflow-x-hidden bg-gradient-sakura-bg">
      <SakuraBg />
      <Sparkles />
      <FloatingHearts />

      {/* ===== ヒーローセクション ===== */}
      <section className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-12 text-center">
        {/* リボンバッジ */}
        <div className="ribbon-badge mb-8 animate-welcome-pulse">
          🌸 介護で働くあなたへ 🌸
        </div>

        {/* メインタイトル */}
        <h1
          className="font-display font-black leading-tight mb-8"
          style={{ fontSize: "clamp(38px, 8vw, 90px)", letterSpacing: "-0.01em" }}
        >
          <span className="block hero-line1">介護職 応援</span>
          <span className="block hero-line2 mt-2">
            ポイント{" "}
            <span className="hero-heart inline-block animate-heart-bounce">
              ♡
            </span>
          </span>
        </h1>

        {/* サブタイトル */}
        <div className="font-display max-w-md mb-10 text-navy">
          <p className="text-lg sm:text-xl font-bold mb-3">
            働くほど、つながるほど、ポイントが貯まる。
          </p>
          <p className="text-sm text-navy-soft">1日 = 5pt で現金に・・・</p>
          <p className="text-sm text-navy-soft">
            お給与とは別で貯金できる、新しいポイントです。
          </p>
        </div>

        {/* CTA */}
        <button
          type="button"
          className="hero-cta"
          onClick={() => navigate("/auth")}
          aria-label="今すぐはじめる、ログインまたは新規登録ページへ"
        >
          今すぐはじめる →
        </button>

        {/* スクロールキュー */}
        <div className="mt-16 text-coral font-display font-black text-xs tracking-[0.3em] animate-scroll-drift">
          SCROLL ▼
        </div>
      </section>

      {/* ===== ログイン誘導セクション (スクロール下部) ===== */}
      <section className="relative z-10 px-4 py-16 text-center">
        <div className="bg-white/70 backdrop-blur-sm rounded-sakura-xl p-8 max-w-md mx-auto shadow-sakura-card">
          <p className="text-xs font-display font-bold text-coral tracking-widest mb-2">
            ✿ すでにアカウントをお持ちの方 ✿
          </p>
          <p className="text-sm text-muted-foreground mb-5 font-body">
            ログインして、続きから始めましょう
          </p>
          <button
            type="button"
            className="hero-cta"
            style={{ fontSize: "18px", padding: "16px 36px" }}
            onClick={() => navigate("/auth")}
            aria-label="ログインページへ"
          >
            ログインはこちら →
          </button>
        </div>

        {/* 軽いフッター */}
        <p className="mt-10 text-xs text-muted-foreground font-body">
          🌸 桜のように温かく、コツコツ応援 🌸
        </p>
      </section>
    </div>
  );
};

export default WelcomePage;
