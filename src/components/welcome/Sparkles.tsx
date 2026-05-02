/**
 * キラキラ装飾 ✨ (8個、ランダム配置の twinkle アニメ)
 * - fixed inset-0、画面全体に散らす
 * - pointer-events-none、aria-hidden
 */

const SPARKLES = [
  { top: "8%", left: "10%", delay: 0, size: 24 },
  { top: "15%", left: "85%", delay: 0.5, size: 20 },
  { top: "30%", left: "5%", delay: 1.0, size: 28 },
  { top: "45%", left: "92%", delay: 1.5, size: 22 },
  { top: "60%", left: "8%", delay: 2.0, size: 26 },
  { top: "70%", left: "88%", delay: 2.5, size: 20 },
  { top: "82%", left: "12%", delay: 3.0, size: 24 },
  { top: "92%", left: "82%", delay: 3.5, size: 22 },
];

const Sparkles = () => {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-0"
    >
      {SPARKLES.map((s, i) => (
        <span
          key={i}
          className="absolute animate-twinkle select-none"
          style={{
            top: s.top,
            left: s.left,
            fontSize: `${s.size}px`,
            animationDelay: `${s.delay}s`,
          }}
        >
          ✨
        </span>
      ))}
    </div>
  );
};

export default Sparkles;
