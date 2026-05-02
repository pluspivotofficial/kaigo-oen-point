import { useEffect } from "react";

interface Props {
  amount: number;
  description?: string;
  visible: boolean;
  onComplete: () => void;
}

/**
 * ポイント獲得時の祝祭オーバーレイ
 * - 中央に +Npt を bg-gradient-sakura-celebration で表示
 * - 桜ペタル5枚が降る
 * - 1.8秒で自動消失
 * - pointer-events-none で操作妨害なし
 * - prefers-reduced-motion 対応 (index.css の global rule で動きが軽減)
 */
const PointsCelebration = ({ amount, description, visible, onComplete }: Props) => {
  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(onComplete, 1800);
    return () => clearTimeout(t);
  }, [visible, onComplete]);

  if (!visible) return null;

  return (
    <div
      aria-live="polite"
      className="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none"
    >
      {/* 桜ペタル (祝祭、低密度) */}
      <div className="absolute inset-0 overflow-hidden">
        {[0, 1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className="absolute top-0 animate-petal-fall opacity-80 select-none"
            style={{
              left: `${10 + i * 18}%`,
              fontSize: `${22 + (i % 3) * 6}px`,
              animationDelay: `${i * 0.3}s`,
              animationDuration: `${4 + (i % 3)}s`,
            }}
          >
            🌸
          </span>
        ))}
      </div>

      {/* 中央の +Npt バナー */}
      <div className="relative animate-pop-in">
        <div className="bg-gradient-sakura-celebration text-white px-10 py-5 rounded-sakura-xl shadow-sakura-celebration text-center">
          <p className="text-5xl font-display font-black tracking-tight leading-none">
            +{amount.toLocaleString()}
            <span className="text-2xl ml-1 align-baseline">pt</span>
          </p>
          {description && (
            <p className="text-sm font-display font-bold mt-2 text-white/90">
              {description}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default PointsCelebration;
