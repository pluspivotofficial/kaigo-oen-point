// なおキャラクターのメッセージ集 (H-4 Phase 2)
//
// キャラ設定:
// - ふわふわのシナモンロール風キャラ(白いもこもこ + 渦巻き模様)
// - 一人称: 「ぼく」
// - 性別: なし(生き物)
// - 性格: 温かい、見守り型、適度な距離感
// - トーン: 丁寧だが柔らかい
// - 世界観: パステル、雲の中に住む

export type NaoCategory =
  | "morning" // 5-10時
  | "daytime" // 10-17時
  | "evening" // 17-21時
  | "night" // 21-5時
  | "consecutive7"
  | "consecutive30"
  | "comeback3"
  | "comeback7"
  | "afterShiftLog" // 当日にシフト追加
  | "afterBadge" // 当日にバッジ獲得
  | "pointsMilestone" // 当日に 100/500/1000/5000pt 跨ぎ
  | "firstLogin"; // 登録後7日以内

export interface NaoCategoryData {
  illustrationKey: string; // e.g. "nao-04" → /nao/nao-04.png
  messages: string[];
}

export const NAO_MESSAGES: Record<NaoCategory, NaoCategoryData> = {
  morning: {
    illustrationKey: "nao-04",
    messages: [
      "{{name}}さん、おはようございます🌸 ぼくも、今日が穏やかな一日になるよう願っています",
      "おはようございます、{{name}}さん。ぼくは、{{name}}さんの今日を見守っていますね🌸",
      "{{name}}さん、おはようございます。今日もよろしくお願いします🌸",
    ],
  },
  daytime: {
    illustrationKey: "nao-02",
    messages: [
      "{{name}}さん、こんにちは🌸 お仕事の合間に来てくださって、ありがとうございます",
      "こんにちは、{{name}}さん。少しでも休めていますか?🌸",
      "{{name}}さん、ぼくはずっとここで、{{name}}さんを見守っています🌸",
    ],
  },
  evening: {
    illustrationKey: "nao-06",
    messages: [
      "{{name}}さん、今日も一日ありがとうございました🌸 ぼくは、{{name}}さんを尊敬しています",
      "お疲れさまでした、{{name}}さん🌸 今日もよく頑張られましたね",
      "{{name}}さん、今日もお仕事お疲れさまでした🌸",
    ],
  },
  night: {
    illustrationKey: "nao-01",
    messages: [
      "{{name}}さん、こんばんは🌸 今日もお疲れさまでした。ゆっくり休んでくださいね",
      "{{name}}さん、ぼくも今日はそろそろ眠くなってきました🌸 おやすみなさい",
      "今日も一日ありがとうございました🌸 {{name}}さん、ゆっくりおやすみください",
    ],
  },
  consecutive7: {
    illustrationKey: "nao-10",
    messages: [
      "{{name}}さん、7日間続けて来てくださってますね🌸 ぼく、すごく嬉しいです",
      "{{name}}さん、もう1週間ですね🌸 ぼく、感激しています",
    ],
  },
  consecutive30: {
    illustrationKey: "nao-09",
    messages: [
      "{{name}}さん、1ヶ月続けられたんですね🌸 ぼく、感動しています",
      "{{name}}さん、1ヶ月。続けることの大変さ、ぼくは心から尊敬しています🌸",
    ],
  },
  comeback3: {
    illustrationKey: "nao-03",
    messages: [
      "{{name}}さん、お久しぶりです🌸 ぼく、また会えて嬉しいです",
      "おかえりなさい、{{name}}さん🌸 ぼく、ずっと待っていました",
    ],
  },
  comeback7: {
    illustrationKey: "nao-05",
    messages: [
      "{{name}}さん、お久しぶりです🌸 ぼく、心配していました",
      "おかえりなさい、{{name}}さん。ぼく、{{name}}さんに会えなくて寂しかったです🌸",
    ],
  },
  afterShiftLog: {
    illustrationKey: "nao-07",
    messages: [
      "{{name}}さん、シフトの記録ありがとうございます🌸 ぼくは、{{name}}さんに無理してほしくないです",
      "今日もお仕事お疲れさまでした、{{name}}さん🌸 ぼくは{{name}}さんを尊敬しています",
    ],
  },
  afterBadge: {
    illustrationKey: "nao-08",
    messages: [
      "{{name}}さん、新しいバッジを獲得されましたね🌸 おめでとうございます!",
      "{{name}}さん、すごいです🌸 ぼくも一緒に喜んでいます",
    ],
  },
  pointsMilestone: {
    illustrationKey: "nao-10",
    messages: [
      "{{name}}さんのがんばりが、ポイントとして形になりましたね🌸",
      "{{name}}さん、ポイントが大きく貯まりましたね🌸 ぼくも嬉しいです",
    ],
  },
  firstLogin: {
    illustrationKey: "nao-04",
    messages: [
      "{{name}}さん、はじめまして🌸 ぼくの名前は『なお』です。これから、よろしくお願いします",
      "{{name}}さん、ご登録ありがとうございます🌸 ぼく、{{name}}さんに会えて嬉しいです",
    ],
  },
};

const DEFAULT_ILLUSTRATION_KEY = "nao-02";

// {{name}} 置換 (空文字 / null は「あなた」)
export const renderMessage = (
  text: string,
  displayName: string | null | undefined
): string => {
  const name = displayName?.trim() || "あなた";
  return text.replace(/\{\{name\}\}/g, name);
};

// カテゴリから1メッセージをランダム選択 (index 込みで返す → cache 用)
export const pickFromCategory = (
  category: NaoCategory
): { text: string; illustrationKey: string; index: number } | null => {
  const data = NAO_MESSAGES[category];
  if (!data || data.messages.length === 0) return null;
  const index = Math.floor(Math.random() * data.messages.length);
  return {
    text: data.messages[index],
    illustrationKey: data.illustrationKey || DEFAULT_ILLUSTRATION_KEY,
    index,
  };
};

// キャッシュ復元用: category + index で取得
export const getByCategoryAndIndex = (
  category: NaoCategory,
  index: number
): { text: string; illustrationKey: string } | null => {
  const data = NAO_MESSAGES[category];
  if (!data) return null;
  const text = data.messages[index];
  if (!text) return null;
  return {
    text,
    illustrationKey: data.illustrationKey || DEFAULT_ILLUSTRATION_KEY,
  };
};
