import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import Joyride, { CallBackProps, STATUS, Step } from "react-joyride";

// 各ルートに対応するチュートリアルステップ定義
const TUTORIAL_STEPS: Record<string, Step[]> = {
  "/": [
    {
      target: "body",
      placement: "center",
      title: "ようこそ！介護職応援ポイントへ 🎉",
      content:
        "このアプリでは、シフト登録やプロフィール入力、友人紹介でポイントが貯まります。各ページの使い方を順にご案内します。",
      disableBeacon: true,
    },
    {
      target: '[data-tour="dashboard-points"]',
      title: "あなたの累計ポイント",
      content: "ここで現在の累計ポイントを確認できます。1pt = 1円相当です。",
    },
    {
      target: '[data-tour="dashboard-actions"]',
      title: "クイックアクション",
      content: "シフト申請・ポイント確認・友人紹介など、よく使う機能にここから素早くアクセスできます。",
    },
    {
      target: '[data-tour="bottom-nav"]',
      title: "下部メニュー",
      content: "ホーム・シフト・掲示板・ポイント・紹介・マイページの6画面を切り替えられます。",
      placement: "top",
    },
  ],
  "/shift": [
    {
      target: "body",
      placement: "center",
      title: "シフト登録ページ 📅",
      content: "カレンダーから日付を選び、勤務種別を選ぶだけでシフトを登録できます。",
      disableBeacon: true,
    },
    {
      target: '[data-tour="shift-calendar"]',
      title: "カレンダー",
      content: "日付をタップして選択します。祝日は赤色で表示されます。",
    },
    {
      target: '[data-tour="shift-buttons"]',
      title: "シフト種別ボタン",
      content:
        "早番・日勤・遅番・夜勤・休みから選択。登録すると自動的に翌日へ移動するので連続登録できます。1シフト+5pt獲得！",
      placement: "top",
    },
  ],
  "/points": [
    {
      target: "body",
      placement: "center",
      title: "ポイントページ 💰",
      content: "獲得したポイントの推移と履歴を確認できます。",
      disableBeacon: true,
    },
    {
      target: '[data-tour="points-chart"]',
      title: "獲得推移グラフ",
      content: "これまでの累計ポイントの推移を折れ線グラフで確認できます。",
    },
    {
      target: '[data-tour="points-earn"]',
      title: "ポイント獲得導線",
      content: "ここから直接シフト登録やプロフィール入力、ホップ会員登録ページへ移動できます。",
    },
  ],
  "/referral": [
    {
      target: "body",
      placement: "center",
      title: "友人紹介ページ 👥",
      content: "友人を紹介すると最大600ptが獲得できます。",
      disableBeacon: true,
    },
    {
      target: '[data-tour="referral-meter"]',
      title: "紹介枠メーター",
      content: "紹介枠は最大5枠です。残り枠数がメーターで一目でわかります。",
    },
  ],
  "/profile": [
    {
      target: "body",
      placement: "center",
      title: "マイページ 👤",
      content: "プロフィールを入力するとポイントがもらえます。各項目+100pt、セクション完了で+500ptボーナス！",
      disableBeacon: true,
    },
  ],
  "/questions": [
    {
      target: "body",
      placement: "center",
      title: "掲示板 💬",
      content: "他の介護職の方と匿名で質問・相談ができます。",
      disableBeacon: true,
    },
  ],
};

const STORAGE_KEY = "tutorial_completed_routes_v1";

const getCompletedRoutes = (): string[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const markRouteCompleted = (route: string) => {
  const completed = getCompletedRoutes();
  if (!completed.includes(route)) {
    completed.push(route);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(completed));
  }
};

export const AppTutorial = () => {
  const location = useLocation();
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  const steps = useMemo(() => TUTORIAL_STEPS[location.pathname] || [], [location.pathname]);

  useEffect(() => {
    setRun(false);
    setStepIndex(0);
    if (steps.length === 0) return;
    const completed = getCompletedRoutes();
    if (completed.includes(location.pathname)) return;

    // DOM描画を待つ
    const timer = setTimeout(() => setRun(true), 600);
    return () => clearTimeout(timer);
  }, [location.pathname, steps.length]);

  const handleCallback = (data: CallBackProps) => {
    const { status, index, type } = data;
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

    if (finishedStatuses.includes(status)) {
      markRouteCompleted(location.pathname);
      setRun(false);
      setStepIndex(0);
    } else if (type === "step:after") {
      setStepIndex(index + 1);
    }
  };

  if (steps.length === 0) return null;

  return (
    <Joyride
      steps={steps}
      run={run}
      stepIndex={stepIndex}
      continuous
      showSkipButton
      showProgress
      disableScrolling={false}
      callback={handleCallback}
      locale={{
        back: "戻る",
        close: "閉じる",
        last: "完了",
        next: "次へ",
        skip: "スキップ",
        nextLabelWithProgress: "次へ ({step}/{steps}ステップ)",
      }}
      styles={{
        options: {
          primaryColor: "hsl(var(--primary))",
          backgroundColor: "hsl(var(--card))",
          textColor: "hsl(var(--foreground))",
          arrowColor: "hsl(var(--card))",
          overlayColor: "rgba(0, 0, 0, 0.5)",
          zIndex: 10000,
        },
        tooltip: {
          borderRadius: "12px",
          fontSize: "16px",
          padding: "20px",
        },
        tooltipTitle: {
          fontSize: "19px",
          fontWeight: 700,
          marginBottom: "8px",
        },
        tooltipContent: {
          fontSize: "16px",
          lineHeight: 1.7,
          padding: "8px 0",
        },
        buttonNext: {
          backgroundColor: "hsl(var(--primary))",
          borderRadius: "8px",
          fontSize: "15px",
          padding: "10px 20px",
          fontWeight: 600,
        },
        buttonBack: {
          color: "hsl(var(--muted-foreground))",
          fontSize: "15px",
        },
        buttonSkip: {
          color: "hsl(var(--muted-foreground))",
          fontSize: "14px",
        },
      }}
    />
  );
};

// チュートリアルを再表示するためのヘルパー
export const resetTutorials = () => {
  localStorage.removeItem(STORAGE_KEY);
};
