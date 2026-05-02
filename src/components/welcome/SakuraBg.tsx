/**
 * 桜ペタル背景 (4色 × 18枚、説明資料 kaigooenpointo より)
 * - fixed inset-0、画面全体に降る
 * - pointer-events-none、aria-hidden
 * - prefers-reduced-motion で index.css の global rule により自動停止
 */

const PETAL_GRADIENTS = [
  // p-pink: 淡いピンク
  "radial-gradient(circle at 30% 30%, #FFE4E9 0%, #FFB6C1 50%, #FF9FB2 100%)",
  // p-coral: コーラル
  "radial-gradient(circle at 30% 30%, #FFD4D0 0%, #FFA89A 50%, #FF8E7A 100%)",
  // p-cream: クリーム→ゴールド
  "radial-gradient(circle at 30% 30%, #FFFBF0 0%, #FFE9CC 50%, #F5C443 100%)",
  // p-white: 白系
  "radial-gradient(circle at 30% 30%, #FFFFFF 0%, #FFF0F4 50%, #FFE4E9 100%)",
];

const PETAL_CLIP =
  "polygon(50% 0%, 80% 30%, 100% 60%, 70% 100%, 30% 100%, 0% 60%, 20% 30%)";

// 18枚を deterministic に分散 (Math.random は SSR/再描画ブレを避けるため不使用)
const PETALS = Array.from({ length: 18 }, (_, i) => ({
  left: `${(i * 5.7) % 100}%`,
  delay: ((i * 0.9) % 8).toFixed(1),
  duration: (9 + (i % 5) * 1.6).toFixed(1),
  size: 16 + (i % 4) * 4,
  gradient: PETAL_GRADIENTS[i % PETAL_GRADIENTS.length],
}));

const SakuraBg = () => {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden"
    >
      {PETALS.map((p, i) => (
        <span
          key={i}
          className="absolute top-0 animate-petal-fall"
          style={{
            left: p.left,
            width: `${p.size}px`,
            height: `${p.size}px`,
            background: p.gradient,
            clipPath: PETAL_CLIP,
            opacity: 0.65,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
    </div>
  );
};

export default SakuraBg;
