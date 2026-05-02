/**
 * フロートハート ♡ (5個、下から上へふわふわ浮上)
 * - fixed inset-0、画面下から開始
 * - 異なる位置・遅延・速度で動く
 * - pointer-events-none、aria-hidden
 */

const HEARTS = [
  { left: "10%", delay: 0, duration: 13, size: 28, color: "#FF9FB2" },
  { left: "30%", delay: 3, duration: 14, size: 32, color: "#FFB6C1" },
  { left: "55%", delay: 6, duration: 12, size: 26, color: "#FFA89A" },
  { left: "75%", delay: 9, duration: 15, size: 30, color: "#FFC0CB" },
  { left: "90%", delay: 12, duration: 11, size: 24, color: "#FF8E7A" },
];

const FloatingHearts = () => {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden"
    >
      {HEARTS.map((h, i) => (
        <span
          key={i}
          className="absolute bottom-0 animate-heart-float select-none"
          style={{
            left: h.left,
            fontSize: `${h.size}px`,
            color: h.color,
            animationDelay: `${h.delay}s`,
            animationDuration: `${h.duration}s`,
          }}
        >
          ♡
        </span>
      ))}
    </div>
  );
};

export default FloatingHearts;
