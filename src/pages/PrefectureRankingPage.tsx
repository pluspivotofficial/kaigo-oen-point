import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import { Trophy, MapPin, Users, Flame, Star } from "lucide-react";
import { MILESTONE_HOURS, MILESTONE_REWARD_POINTS } from "@/lib/prefectures";
import { cn } from "@/lib/utils";

interface PrefectureData {
  prefecture: string;
  total_hours: number;
  user_count: number;
}

const PrefectureRankingPage = () => {
  const { user } = useAuth();
  const [rankings, setRankings] = useState<PrefectureData[]>([]);
  const [userPrefecture, setUserPrefecture] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      // Get user prefecture
      const { data: profile } = await supabase
        .from("profiles")
        .select("prefecture")
        .eq("user_id", user.id)
        .single();

      if (profile?.prefecture) setUserPrefecture(profile.prefecture);

      // Get prefecture rankings from the view
      const { data } = await supabase
        .from("prefecture_hours")
        .select("*")
        .order("total_hours", { ascending: false });

      if (data) setRankings(data as PrefectureData[]);
      setLoading(false);
    };

    fetchData();
  }, [user]);

  const getNextMilestone = (hours: number) => {
    return MILESTONE_HOURS.find((m) => m > hours) ?? MILESTONE_HOURS[MILESTONE_HOURS.length - 1];
  };

  const getAchievedMilestones = (hours: number) => {
    return MILESTONE_HOURS.filter((m) => hours >= m).length;
  };

  const getRankIcon = (index: number) => {
    if (index === 0) return <Trophy className="h-5 w-5 text-reward-gold" />;
    if (index === 1) return <Trophy className="h-5 w-5 text-muted-foreground" />;
    if (index === 2) return <Trophy className="h-5 w-5 text-orange-400" />;
    return <span className="text-sm font-bold text-muted-foreground w-5 text-center">{index + 1}</span>;
  };

  const myPrefData = rankings.find((r) => r.prefecture === userPrefecture);

  return (
    <AppLayout title="都道府県チャレンジ">
      {/* Explanation */}
      <Card className="mb-5 border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Flame className="h-5 w-5 text-primary" />
            <span className="font-semibold text-sm">みんなで目標達成！</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            同じ都道府県のユーザー全員の累計稼働時間が目標に達すると、
            <span className="text-foreground font-medium">全員に{MILESTONE_REWARD_POINTS}ポイント</span>
            がボーナスとして付与されます。みんなで力を合わせよう！
          </p>
          <div className="flex flex-wrap gap-1.5 mt-3">
            {MILESTONE_HOURS.map((h) => (
              <Badge key={h} variant="outline" className="text-[10px]">
                {h.toLocaleString()}時間
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* My Prefecture */}
      {myPrefData && (
        <Card className="mb-5 border-secondary/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-4 w-4 text-secondary" />
              あなたの都道府県: {myPrefData.prefecture}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">累計稼働時間</span>
              <span className="font-bold">{myPrefData.total_hours.toLocaleString()} 時間</span>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>次の目標: {getNextMilestone(myPrefData.total_hours).toLocaleString()}時間</span>
                <span>{Math.min(100, Math.round((myPrefData.total_hours / getNextMilestone(myPrefData.total_hours)) * 100))}%</span>
              </div>
              <Progress 
                value={Math.min(100, (myPrefData.total_hours / getNextMilestone(myPrefData.total_hours)) * 100)} 
                className="h-3"
              />
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" /> {myPrefData.user_count}人参加中
              </span>
              <span className="flex items-center gap-1">
                <Star className="h-3 w-3" /> {getAchievedMilestones(myPrefData.total_hours)}個達成
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {!userPrefecture && !loading && (
        <Card className="mb-5 border-destructive/20 bg-destructive/5">
          <CardContent className="p-4 text-sm text-muted-foreground">
            プロフィールで都道府県を設定すると、チャレンジに参加できます。
          </CardContent>
        </Card>
      )}

      {/* Rankings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Trophy className="h-4 w-4 text-reward-gold" />
            都道府県ランキング
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-8">読み込み中...</p>
          ) : rankings.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">まだデータがありません。シフトを申請して最初の記録を作ろう！</p>
          ) : (
            rankings.map((r, i) => {
              const nextMilestone = getNextMilestone(r.total_hours);
              const progress = Math.min(100, (r.total_hours / nextMilestone) * 100);
              const isMyPref = r.prefecture === userPrefecture;

              return (
                <div
                  key={r.prefecture}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg",
                    isMyPref ? "bg-secondary/10 border border-secondary/20" : "bg-muted/50"
                  )}
                >
                  <div className="w-6 flex justify-center">{getRankIcon(i)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold flex items-center gap-1">
                        {r.prefecture}
                        {isMyPref && <Badge variant="secondary" className="text-[9px] px-1 py-0 ml-1">あなた</Badge>}
                      </span>
                      <span className="text-xs font-mono font-bold">{r.total_hours.toLocaleString()}h</span>
                    </div>
                    <Progress value={progress} className="h-1.5" />
                    <div className="flex justify-between mt-1">
                      <span className="text-[10px] text-muted-foreground">{r.user_count}人</span>
                      <span className="text-[10px] text-muted-foreground">
                        次: {nextMilestone.toLocaleString()}h
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </AppLayout>
  );
};

export default PrefectureRankingPage;
