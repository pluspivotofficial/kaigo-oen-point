/**
 * 桜ペタル降下背景（ヒーロー領域用）
 *
 * 親要素 (relative + sufficient height) の中に絶対配置し、
 * 5枚のペタルを異なる位置・タイミングで降らせる。
 *
 * 制約:
 * - pointer-events: none (操作妨害しない)
 * - z-0 (コンテンツの後ろ)
 * - aria-hidden (装飾)
 * - prefers-reduced-motion 対応 (index.css の global rule で動きが停止)
 */
const PETALS = [
  { left: "8%", size: 18, delay: 0, duration: 11 },
  { left: "26%", size: 22, delay: 2.4, duration: 13 },
  { left: "44%", size: 16, delay: 4.8, duration: 10 },
  { left: "62%", size: 24, delay: 7.2, duration: 14 },
  { left: "82%", size: 20, delay: 9.6, duration: 12 },
];

const PetalRain = () => {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-x-0 top-0 h-[600px] overflow-hidden pointer-events-none z-0 select-none"
    >
      {PETALS.map((p, i) => (
        <span
          key={i}
          className="absolute top-0 animate-petal-fall opacity-60"
          style={{
            left: p.left,
            fontSize: `${p.size}px`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        >
          🌸
        </span>
      ))}
    </div>
  );
};

export default PetalRain;
