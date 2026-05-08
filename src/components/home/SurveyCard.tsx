import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const SURVEY_URL = "https://forms.gle/tFEeCpPFLQkqUgwb8";

const SurveyCard = () => {
  return (
    <Card className="bg-gradient-to-br from-blue-50 to-pink-soft border-blue-200 shadow-sm hover:shadow-md transition-shadow mb-4">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="text-3xl flex-shrink-0">💬</div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-base mb-1">
              ご意見をお聞かせください
            </h3>
            <p className="text-sm text-gray-600 mb-3 leading-relaxed">
              アプリの改善要望や、ポイント申請などはこちらのアンケートからお手数ですがご回答ください🌸
            </p>
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <a
                href={SURVEY_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                アンケートに回答する →
              </a>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SurveyCard;
