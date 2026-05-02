import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export interface BadgeInfo {
  id: string;
  name: string;
  description: string;
  emoji: string;
  bonus_points: number;
}

interface Props {
  badge: BadgeInfo | null;
  onClose: () => void;
}

/**
 * バッジ獲得モーダル
 * - 大きな絵文字 + 名前 + 説明 + ボーナスpt 表示
 * - 四隅に animate-twinkle のキラキラ装飾
 * - 中央エリア animate-pop-in で気持ちよく登場
 * - 閉じる ボタンで dismiss → キューに次があれば連続表示
 */
const BadgeUnlockModal = ({ badge, onClose }: Props) => {
  return (
    <Dialog open={!!badge} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm overflow-hidden">
        {badge && (
          <div className="text-center py-4 relative">
            {/* 四隅のキラキラ */}
            <span className="absolute -top-2 -left-2 text-2xl animate-twinkle">✨</span>
            <span
              className="absolute -top-2 -right-2 text-2xl animate-twinkle"
              style={{ animationDelay: "0.5s" }}
            >
              ✨
            </span>
            <span
              className="absolute -bottom-2 -left-2 text-xl animate-twinkle"
              style={{ animationDelay: "1s" }}
            >
              ✨
            </span>
            <span
              className="absolute -bottom-2 -right-2 text-xl animate-twinkle"
              style={{ animationDelay: "1.5s" }}
            >
              ✨
            </span>

            {/* セクションキッカー */}
            <p className="text-xs font-display font-bold text-coral tracking-widest mb-2">
              ✿ バッジ獲得 ✿
            </p>

            {/* 大きな絵文字 */}
            <div className="text-7xl mb-3 animate-pop-in" aria-hidden="true">
              {badge.emoji}
            </div>

            {/* 名前 */}
            <h2 className="text-xl font-display font-black text-navy">
              {badge.name}
            </h2>

            {/* 説明 */}
            <p className="text-sm text-muted-foreground mt-2 font-body">
              {badge.description}
            </p>

            {/* ボーナスpt */}
            {badge.bonus_points > 0 && (
              <div className="mt-4 inline-block bg-gradient-sakura-celebration text-white px-5 py-2 rounded-full font-display font-black shadow-sakura-pop">
                ボーナス +{badge.bonus_points.toLocaleString()}pt
              </div>
            )}

            {/* 閉じるボタン */}
            <Button
              variant="sakura"
              className="mt-5 w-full"
              onClick={onClose}
            >
              閉じる
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default BadgeUnlockModal;
