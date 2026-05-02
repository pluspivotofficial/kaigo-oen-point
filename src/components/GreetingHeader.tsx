/**
 * 時間帯別の挨拶ヘッダー（AppLayout の title prop 内に配置）
 *
 * 表示例:
 * - おはようございます、田中さん 🌸
 *   今日も応援しています
 *
 * フォールバック:
 * - displayName 不在: "ようこそ" + 🌸
 * - サブテキスト「今日も応援しています」はモバイルで非表示 (hidden sm:block)
 */

const getGreeting = (hour: number): string => {
  if (hour >= 5 && hour < 10) return "おはようございます";
  if (hour >= 10 && hour < 17) return "こんにちは";
  if (hour >= 17 && hour < 22) return "こんばんは";
  return "おつかれさまです";
};

interface Props {
  displayName: string | null | undefined;
}

const GreetingHeader = ({ displayName }: Props) => {
  const greeting = getGreeting(new Date().getHours());
  const namePart = displayName ? `、${displayName}さん` : "、ようこそ";

  return (
    <div className="text-right min-w-0">
      <p className="font-display font-bold text-sm sm:text-base text-coral truncate leading-tight">
        {greeting}
        {namePart} 🌸
      </p>
      <p className="hidden sm:block text-[10px] text-muted-foreground font-body mt-0.5">
        今日も応援しています
      </p>
    </div>
  );
};

export default GreetingHeader;
