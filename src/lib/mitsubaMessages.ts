// みつばキャラクターのメッセージ集
//
// キャラ設定:
// - 名前: みつば
// - 性別中性的、20代、介護職応援ポイント運営の若手スタッフ
// - 真面目、リスペクト深い、過度に明るくない
// - 丁寧語、敬称必須、誠実
//
// トーン基準: 文学的、句点で余韻を残す、感謝+尊敬+心配のニュアンス
// 「がんばれ!」より「お疲れさま」を選ぶ

export type MessageCategory =
  | "morning" // 5-10時
  | "daytime" // 10-17時
  | "evening" // 17-21時
  | "night" // 21-5時
  | "streak_7"
  | "streak_30"
  | "absent_3"
  | "absent_7"
  | "shift_added" // 当日 (00:00以降)
  | "badge_earned" // 当日 (00:00以降)
  | "milestone_100"
  | "milestone_500"
  | "milestone_1000"
  | "milestone_5000"
  | "new_user"; // 登録後7日以内

export interface MitsubaMessage {
  id: string;
  category: MessageCategory;
  text: string;
}

export const MITSUBA_MESSAGES: MitsubaMessage[] = [
  // 朝 (5-10時)
  {
    id: "morning_001",
    category: "morning",
    text: "おはようございます。{{name}}さんの今日が、穏やかでありますように。",
  },
  {
    id: "morning_002",
    category: "morning",
    text: "{{name}}さん、おはようございます。今日も静かに、はじめましょう。",
  },
  {
    id: "morning_003",
    category: "morning",
    text: "おはようございます、{{name}}さん。少しずつで、大丈夫です。",
  },

  // 日中 (10-17時)
  {
    id: "daytime_001",
    category: "daytime",
    text: "{{name}}さん、いつもお仕事お疲れさまです。少しの休息も、大切に。",
  },
  {
    id: "daytime_002",
    category: "daytime",
    text: "{{name}}さん、お昼の時間ですね。一息ついてくださいね。",
  },
  {
    id: "daytime_003",
    category: "daytime",
    text: "{{name}}さん、午後のひととき。ゆっくり過ごせますように。",
  },

  // 夕方 (17-21時)
  {
    id: "evening_001",
    category: "evening",
    text: "{{name}}さん、今日も一日、ありがとうございました。",
  },
  {
    id: "evening_002",
    category: "evening",
    text: "お疲れさまです、{{name}}さん。一日の終わりが、近づいていますね。",
  },
  {
    id: "evening_003",
    category: "evening",
    text: "{{name}}さん、夕方ですね。今日の自分を、少し褒めてあげてください。",
  },

  // 夜 (21-5時)
  {
    id: "night_001",
    category: "night",
    text: "お疲れさまでした、{{name}}さん。ゆっくり休まれてくださいね。",
  },
  {
    id: "night_002",
    category: "night",
    text: "{{name}}さん、夜遅くまで。今日も、本当にありがとうございました。",
  },
  {
    id: "night_003",
    category: "night",
    text: "{{name}}さん、ゆっくり休んでください。明日も、また会えますように。",
  },

  // 連続7日
  {
    id: "streak_7_001",
    category: "streak_7",
    text: "{{name}}さん、7日間続けてお越しくださり、ありがとうございます。",
  },
  {
    id: "streak_7_002",
    category: "streak_7",
    text: "7日連続でいらしていただいて、{{name}}さん、嬉しく思っています。",
  },

  // 連続30日
  {
    id: "streak_30_001",
    category: "streak_30",
    text: "{{name}}さん、1ヶ月。続けることの大変さ、心から尊敬しています。",
  },
  {
    id: "streak_30_002",
    category: "streak_30",
    text: "30日。{{name}}さんの継続に、ただ頭が下がる思いです。",
  },

  // 久しぶり3日
  {
    id: "absent_3_001",
    category: "absent_3",
    text: "{{name}}さん、お久しぶりです。お元気でしたか。",
  },
  {
    id: "absent_3_002",
    category: "absent_3",
    text: "{{name}}さん、またお会いできて。お疲れさまでした。",
  },

  // 久しぶり7日
  {
    id: "absent_7_001",
    category: "absent_7",
    text: "{{name}}さん、お久しぶりです。またお会いできて、嬉しいです。",
  },
  {
    id: "absent_7_002",
    category: "absent_7",
    text: "{{name}}さん、お忙しくされていましたか。お体だけは、お大事に。",
  },

  // シフト追加直後 (当日)
  {
    id: "shift_added_001",
    category: "shift_added",
    text: "シフトの記録、ありがとうございます。{{name}}さん、無理のないように。",
  },
  {
    id: "shift_added_002",
    category: "shift_added",
    text: "{{name}}さん、シフトの登録、お疲れさまでした。一つずつ、確実に。",
  },

  // バッジ獲得 (当日)
  {
    id: "badge_earned_001",
    category: "badge_earned",
    text: "{{name}}さん、新しいバッジの獲得、おめでとうございます。",
  },
  {
    id: "badge_earned_002",
    category: "badge_earned",
    text: "バッジ、増えましたね。{{name}}さんの歩みを、見守らせてください。",
  },

  // ポイント節目
  {
    id: "milestone_100",
    category: "milestone_100",
    text: "{{name}}さんのがんばりが、ポイントとして形になりました。",
  },
  {
    id: "milestone_500",
    category: "milestone_500",
    text: "500ポイント。{{name}}さんの努力の積み重ね、ですね。",
  },
  {
    id: "milestone_1000",
    category: "milestone_1000",
    text: "1000ポイント、おめでとうございます。{{name}}さんの一歩一歩が、ここに。",
  },
  {
    id: "milestone_5000",
    category: "milestone_5000",
    text: "5000ポイント。{{name}}さんへの、ささやかな感謝の証として。",
  },

  // 新規 (登録後7日以内)
  {
    id: "new_user_001",
    category: "new_user",
    text: "{{name}}さん、ご登録ありがとうございます。これから、よろしくお願いいたします。",
  },
  {
    id: "new_user_002",
    category: "new_user",
    text: "{{name}}さん、はじめまして。みつばと申します。よろしくお願いいたします。",
  },
];

// {{name}} 置換 (空文字 / null は「あなた」)
export const renderMessage = (
  text: string,
  displayName: string | null | undefined
): string => {
  const name = displayName?.trim() || "あなた";
  return text.replace(/\{\{name\}\}/g, name);
};

// カテゴリから1メッセージをランダム選択
export const pickRandomMessageByCategory = (
  category: MessageCategory
): MitsubaMessage | null => {
  const candidates = MITSUBA_MESSAGES.filter((m) => m.category === category);
  if (candidates.length === 0) return null;
  return candidates[Math.floor(Math.random() * candidates.length)];
};

// メッセージID指定で取得
export const getMessageById = (id: string): MitsubaMessage | null =>
  MITSUBA_MESSAGES.find((m) => m.id === id) ?? null;
