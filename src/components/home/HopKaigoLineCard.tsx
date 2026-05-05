import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const HOP_KAIGO_LINE_URL = "https://line.me/R/ti/p/@005xqgpa";

const HopKaigoLineCard = () => {
  return (
    <Card className="bg-gradient-to-br from-green-50 to-pink-soft border-green-200 shadow-sm hover:shadow-md transition-shadow mb-4">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="text-3xl flex-shrink-0">🎁</div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-base mb-1">
              介護派遣のお仕事を見る
            </h3>
            <p className="text-sm text-gray-600 mb-3 leading-relaxed">
              hop-kaigo の公式LINEで、あなたに合う介護派遣のお仕事情報をお届けします🌸
            </p>
            <Button
              asChild
              className="bg-[#00B900] hover:bg-[#009900] text-white w-full sm:w-auto"
            >
              <a
                href={HOP_KAIGO_LINE_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                LINE で友達追加 →
              </a>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default HopKaigoLineCard;
