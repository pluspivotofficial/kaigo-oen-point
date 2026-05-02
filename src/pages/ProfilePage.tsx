import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { User, MapPin, Briefcase, Award, Check, CalendarDays, Building2, DollarSign, Phone, Heart, HelpCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import { resetTutorials } from "@/components/AppTutorial";
import { useNavigate } from "react-router-dom";
import { useAchievement } from "@/contexts/AchievementContext";
import { Trophy } from "lucide-react";

interface ProfileData {
  display_name: string | null;
  full_name: string | null;
  address: string | null;
  date_of_birth: string | null;
  phone_number: string | null;
  gender: string | null;
  current_status: string | null;
  current_job: string | null;
  employment_type: string | null;
  care_qualifications: string | null;
  care_experience: string | null;
  dispatch_company: string | null;
  hourly_rate: number | null;
  contract_end_date: string | null;
  work_location: string | null;
}

const QUALIFICATION_OPTIONS = [
  "初任者研修", "実務者研修", "介護福祉士", "ケアマネ", "社会福祉士", "看護師", "保育士", "その他", "無資格",
];

const EXPERIENCE_OPTIONS = [
  { value: "10y_plus", label: "10年以上" },
  { value: "5y_plus", label: "5年以上" },
  { value: "1y_plus", label: "1年以上" },
  { value: "less_than_1y", label: "1年未満" },
  { value: "none", label: "なし" },
];

const STATUS_OPTIONS = [
  { value: "working", label: "就業中" },
  { value: "searching", label: "お探し中" },
  { value: "other", label: "その他" },
];

const JOB_OPTIONS = [
  { value: "care", label: "介護職" },
  { value: "nurse", label: "看護職" },
  { value: "nursery", label: "保育職" },
  { value: "nurse_assistant", label: "看護助手" },
  { value: "other_job", label: "その他職種" },
  { value: "not_working", label: "働いてない" },
];

const EMPLOYMENT_TYPE_OPTIONS = [
  { value: "fulltime", label: "正社員" },
  { value: "contract_parttime", label: "契約社員、アルバイト" },
  { value: "dispatch", label: "派遣社員" },
  { value: "spot", label: "スポットワーク" },
  { value: "other", label: "その他" },
  { value: "not_working", label: "働いていない" },
];

const GENDER_OPTIONS = [
  { value: "male", label: "男性" },
  { value: "female", label: "女性" },
  { value: "other", label: "その他" },
];

// Basic info fields (①-⑤) = 100pt each
const BASIC_FIELDS: { key: keyof ProfileData; label: string }[] = [
  { key: "full_name", label: "お名前（ふりがな）" },
  { key: "date_of_birth", label: "生年月日" },
  { key: "gender", label: "性別" },
  { key: "address", label: "住所" },
  { key: "phone_number", label: "電話番号" },
];

// Work info fields (⑥-⑩) = 100pt each, +500pt bonus
const WORK_FIELDS: { key: keyof ProfileData; label: string }[] = [
  { key: "current_status", label: "現在の状態は？" },
  { key: "current_job", label: "現在のお仕事は？" },
  { key: "employment_type", label: "現在の雇用形態は？" },
  { key: "care_qualifications", label: "お持ちの資格は？" },
  { key: "care_experience", label: "介護の経験年数は？" },
];

// Dispatch-only fields (A-D) = 100pt each, +500pt bonus
const DISPATCH_FIELDS: { key: keyof ProfileData; label: string }[] = [
  { key: "dispatch_company", label: "派遣会社はどこですか？" },
  { key: "hourly_rate", label: "お時給はいくらですか？" },
  { key: "contract_end_date", label: "契約期間はいつまでですか？" },
  { key: "work_location", label: "現在の就業場所はどこですか？" },
];

const isFieldFilled = (key: keyof ProfileData, value: any): boolean => {
  if (key === "hourly_rate") return value !== null && value !== undefined && value > 0;
  if (typeof value === "string") return value.trim() !== "";
  return !!value;
};

const ProfilePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { checkAchievements } = useAchievement();
  const [profile, setProfile] = useState<ProfileData>({
    display_name: null, full_name: null, address: null, date_of_birth: null,
    phone_number: null, gender: null, current_status: null, current_job: null,
    employment_type: null, care_qualifications: null, care_experience: null,
    dispatch_company: null, hourly_rate: null, contract_end_date: null, work_location: null,
  });
  const [originalProfile, setOriginalProfile] = useState<ProfileData | null>(null);
  const [saving, setSaving] = useState(false);
  const [qualificationOther, setQualificationOther] = useState("");

  const selectedQualifications: string[] = (() => {
    try {
      if (!profile.care_qualifications) return [];
      return JSON.parse(profile.care_qualifications);
    } catch { return []; }
  })();

  const isDispatch = profile.employment_type === "dispatch";

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("display_name, full_name, address, date_of_birth, care_experience, care_qualifications, employment_type, dispatch_company, hourly_rate, phone_number, gender, current_status, current_job, contract_end_date, work_location")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          const p = data as unknown as ProfileData;
          setProfile(p);
          setOriginalProfile(p);
          try {
            const quals: string[] = JSON.parse(p.care_qualifications || "[]");
            const other = quals.find((q) => !QUALIFICATION_OPTIONS.includes(q));
            if (other) setQualificationOther(other);
          } catch { /* ignore */ }
        }
      });
  }, [user]);

  const toggleQualification = (qual: string, checked: boolean) => {
    let current = [...selectedQualifications];
    if (checked) current.push(qual);
    else current = current.filter((q) => q !== qual);
    setProfile((prev) => ({ ...prev, care_qualifications: JSON.stringify(current) }));
  };

  const updateOtherQualification = (text: string) => {
    setQualificationOther(text);
    let current = selectedQualifications.filter((q) => QUALIFICATION_OPTIONS.includes(q) && q !== "その他");
    if (selectedQualifications.includes("その他")) current.push("その他");
    if (text.trim()) current.push(text.trim());
    setProfile((prev) => ({ ...prev, care_qualifications: JSON.stringify(current) }));
  };

  const countFilledInGroup = (fields: { key: keyof ProfileData }[]) =>
    fields.filter((f) => isFieldFilled(f.key, profile[f.key])).length;

  const basicFilled = countFilledInGroup(BASIC_FIELDS);
  const workFilled = countFilledInGroup(WORK_FIELDS);
  const dispatchFilled = countFilledInGroup(DISPATCH_FIELDS);

  const basicPoints = basicFilled * 100;
  const workPoints = workFilled * 100 + (workFilled === WORK_FIELDS.length ? 500 : 0);
  const dispatchPoints = isDispatch ? dispatchFilled * 100 + (dispatchFilled === DISPATCH_FIELDS.length ? 500 : 0) : 0;
  const totalPossiblePoints = 500 + 1000 + (isDispatch ? 900 : 0);

  const handleSave = async () => {
    if (!user || !originalProfile) return;
    setSaving(true);

    // Calculate newly filled fields and points
    let newPoints = 0;
    const allFields = [...BASIC_FIELDS, ...WORK_FIELDS, ...(isDispatch ? DISPATCH_FIELDS : [])];
    allFields.forEach((f) => {
      const wasEmpty = !isFieldFilled(f.key, originalProfile[f.key]);
      const nowFilled = isFieldFilled(f.key, profile[f.key]);
      if (wasEmpty && nowFilled) newPoints += 100;
    });

    // Check work section bonus
    const origWorkFilled = WORK_FIELDS.filter((f) => isFieldFilled(f.key, originalProfile[f.key])).length;
    const newWorkFilled = countFilledInGroup(WORK_FIELDS);
    if (origWorkFilled < WORK_FIELDS.length && newWorkFilled === WORK_FIELDS.length) {
      newPoints += 500;
    }

    // Check dispatch section bonus
    if (isDispatch) {
      const origDispatchFilled = DISPATCH_FIELDS.filter((f) => isFieldFilled(f.key, originalProfile[f.key])).length;
      const newDispatchFilled = countFilledInGroup(DISPATCH_FIELDS);
      if (origDispatchFilled < DISPATCH_FIELDS.length && newDispatchFilled === DISPATCH_FIELDS.length) {
        newPoints += 500;
      }
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: profile.full_name,
        address: profile.address,
        date_of_birth: profile.date_of_birth,
        care_experience: profile.care_experience,
        care_qualifications: profile.care_qualifications,
        employment_type: profile.employment_type,
        dispatch_company: profile.dispatch_company,
        hourly_rate: profile.hourly_rate,
        phone_number: profile.phone_number,
        gender: profile.gender,
        current_status: profile.current_status,
        current_job: profile.current_job,
        contract_end_date: profile.contract_end_date,
        work_location: profile.work_location,
      } as any)
      .eq("user_id", user.id);

    if (error) {
      toast({ title: "保存に失敗しました", description: error.message, variant: "destructive" });
      setSaving(false);
      return;
    }

    if (newPoints > 0) {
      await supabase.from("points_history").insert({
        user_id: user.id,
        description: `プロフィール入力ボーナス（+${newPoints}pt）`,
        points: newPoints,
        type: "earn",
      });
    }

    // Step2 紹介ボーナス: 全9項目入力完了で紹介人・被紹介人に各 +500pt
    // 旧実装の "care_qualifications transition 起点" によるバグを修正
    // (順序逆だと永遠に発火しない問題) → 毎回 save 後に判定
    const fieldsUpTo9 = [...BASIC_FIELDS, ...WORK_FIELDS.slice(0, 4)];
    const all9Filled = fieldsUpTo9.every((f) => isFieldFilled(f.key, profile[f.key]));
    if (all9Filled) {
      const { data: refData } = await supabase
        .from("referrals")
        .select("id, referrer_id, profile_bonus_granted_at")
        .eq("referred_user_id", user.id)
        .limit(1);
      if (refData && refData.length > 0) {
        const referral = refData[0] as any;
        // タイムスタンプベースで重複付与防止
        if (!referral.profile_bonus_granted_at) {
          // 紹介人 +500pt
          await supabase.from("points_history").insert({
            user_id: referral.referrer_id,
            description: "紹介ボーナス[Step2]プロフィール完成",
            points: 500,
            type: "earn",
          });

          // 被紹介人 +500pt (新規)
          await supabase.from("points_history").insert({
            user_id: user.id,
            description: "紹介ボーナス[Step2]プロフィール完成",
            points: 500,
            type: "earn",
          });

          // タイムスタンプセット (次回以降の重複付与を防止)
          await supabase
            .from("referrals")
            .update({ profile_bonus_granted_at: new Date().toISOString() } as any)
            .eq("id", referral.id);
        }
      }
    }

    setOriginalProfile({ ...profile });
    setSaving(false);
    toast({
      title: "プロフィールを保存しました！",
      description: newPoints > 0 ? `+${newPoints}ポイント獲得しました🎉` : undefined,
    });

    // バッジ判定 (profile_complete 等)
    checkAchievements();
  };

  const renderFieldCheck = (key: keyof ProfileData) => {
    if (isFieldFilled(key, profile[key])) return <Check className="h-3.5 w-3.5 text-primary" />;
    return null;
  };

  return (
    <AppLayout bgClassName="bg-gradient-sakura-bg" title="プロフィール">
      {/* セクションキッカー */}
      <div className="text-center mb-3">
        <p className="text-xs font-display font-bold text-coral tracking-widest">
          ✿ プロフィール ✿
        </p>
      </div>

      {/* Progress Overview */}
      <Card variant="sakura" className="mb-5">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">基本情報</span>
            <Badge variant={basicFilled === BASIC_FIELDS.length ? "default" : "secondary"} className="text-xs">
              {basicFilled}/{BASIC_FIELDS.length} 完了 (+{basicPoints}pt)
            </Badge>
          </div>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(basicFilled / BASIC_FIELDS.length) * 100}%` }} />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">お仕事状況</span>
            <Badge variant={workFilled === WORK_FIELDS.length ? "default" : "secondary"} className="text-xs">
              {workFilled}/{WORK_FIELDS.length} 完了 {workFilled === WORK_FIELDS.length && "+500pt🎉"}
            </Badge>
          </div>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-secondary rounded-full transition-all" style={{ width: `${(workFilled / WORK_FIELDS.length) * 100}%` }} />
          </div>

          {isDispatch && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">派遣社員限定</span>
                <Badge variant={dispatchFilled === DISPATCH_FIELDS.length ? "default" : "secondary"} className="text-xs">
                  {dispatchFilled}/{DISPATCH_FIELDS.length} 完了 {dispatchFilled === DISPATCH_FIELDS.length && "+500pt🎉"}
                </Badge>
              </div>
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-reward-purple rounded-full transition-all" style={{ width: `${(dispatchFilled / DISPATCH_FIELDS.length) * 100}%` }} />
              </div>
            </>
          )}

          <p className="text-xs text-muted-foreground">
            各項目 <span className="font-semibold text-primary">100pt</span>、セクション完了で <span className="font-semibold text-primary">+500ptボーナス</span>
          </p>
        </CardContent>
      </Card>

      {/* Basic Info Section */}
      <Card className="mb-5">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4" /> 基本情報
            <Badge variant="outline" className="text-[10px]">各100pt</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* ① お名前（ふりがな） */}
          <div className="space-y-1.5">
            <Label className="text-sm flex items-center gap-1.5">
              ① お名前（ふりがな） {renderFieldCheck("full_name")}
            </Label>
            <Input placeholder="やまだ たろう" value={profile.full_name || ""} onChange={(e) => setProfile((p) => ({ ...p, full_name: e.target.value }))} />
          </div>

          {/* ② 生年月日 */}
          <div className="space-y-1.5">
            <Label className="text-sm flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5" /> ② 生年月日 {renderFieldCheck("date_of_birth")}
            </Label>
            <Input type="date" value={profile.date_of_birth || ""} onChange={(e) => setProfile((p) => ({ ...p, date_of_birth: e.target.value }))} />
          </div>

          {/* ③ 性別 */}
          <div className="space-y-1.5">
            <Label className="text-sm flex items-center gap-1.5">
              <Heart className="h-3.5 w-3.5" /> ③ 性別 {renderFieldCheck("gender")}
            </Label>
            <Select value={profile.gender || ""} onValueChange={(v) => setProfile((p) => ({ ...p, gender: v }))}>
              <SelectTrigger><SelectValue placeholder="選択してください" /></SelectTrigger>
              <SelectContent>
                {GENDER_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* ④ 住所 */}
          <div className="space-y-1.5">
            <Label className="text-sm flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" /> ④ 住所 {renderFieldCheck("address")}
            </Label>
            <Input placeholder="東京都渋谷区..." value={profile.address || ""} onChange={(e) => setProfile((p) => ({ ...p, address: e.target.value }))} />
          </div>

          {/* ⑤ 電話番号 */}
          <div className="space-y-1.5">
            <Label className="text-sm flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5" /> ⑤ 電話番号 {renderFieldCheck("phone_number")}
            </Label>
            <Input type="tel" placeholder="090-1234-5678" value={profile.phone_number || ""} onChange={(e) => setProfile((p) => ({ ...p, phone_number: e.target.value }))} />
          </div>
        </CardContent>
      </Card>

      {/* Work Status Section */}
      <Card className="mb-5">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Briefcase className="h-4 w-4" /> お仕事状況
            <Badge variant="outline" className="text-[10px]">各100pt + 完了500pt</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* ⑥ 現在の状態 */}
          <div className="space-y-1.5">
            <Label className="text-sm flex items-center gap-1.5">
              ⑥ 現在の状態は？ {renderFieldCheck("current_status")}
            </Label>
            <Select value={profile.current_status || ""} onValueChange={(v) => setProfile((p) => ({ ...p, current_status: v }))}>
              <SelectTrigger><SelectValue placeholder="選択してください" /></SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* ⑦ 現在のお仕事 */}
          <div className="space-y-1.5">
            <Label className="text-sm flex items-center gap-1.5">
              ⑦ 現在のお仕事は？ {renderFieldCheck("current_job")}
            </Label>
            <Select value={profile.current_job || ""} onValueChange={(v) => setProfile((p) => ({ ...p, current_job: v }))}>
              <SelectTrigger><SelectValue placeholder="選択してください" /></SelectTrigger>
              <SelectContent>
                {JOB_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* ⑧ 雇用形態 */}
          <div className="space-y-1.5">
            <Label className="text-sm flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5" /> ⑧ 現在の雇用形態は？ {renderFieldCheck("employment_type")}
            </Label>
            <Select value={profile.employment_type || ""} onValueChange={(v) => setProfile((p) => ({ ...p, employment_type: v }))}>
              <SelectTrigger><SelectValue placeholder="選択してください" /></SelectTrigger>
              <SelectContent>
                {EMPLOYMENT_TYPE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* ⑨ 資格 */}
          <div className="space-y-1.5">
            <Label className="text-sm flex items-center gap-1.5">
              <Award className="h-3.5 w-3.5" /> ⑨ お持ちの資格は？（複数選択可）{renderFieldCheck("care_qualifications")}
            </Label>
            <div className="space-y-2 pl-1">
              {QUALIFICATION_OPTIONS.map((qual) => (
                <div key={qual} className="flex items-center gap-2">
                  <Checkbox id={`qual-${qual}`} checked={selectedQualifications.includes(qual)} onCheckedChange={(checked) => toggleQualification(qual, !!checked)} />
                  <label htmlFor={`qual-${qual}`} className="text-sm cursor-pointer">{qual}</label>
                </div>
              ))}
              {selectedQualifications.includes("その他") && (
                <Input placeholder="資格名を入力" value={qualificationOther} onChange={(e) => updateOtherQualification(e.target.value)} className="ml-6 w-auto" />
              )}
            </div>
          </div>

          {/* ⑩ 経験年数 */}
          <div className="space-y-1.5">
            <Label className="text-sm flex items-center gap-1.5">
              ⑩ 介護の経験年数は？ {renderFieldCheck("care_experience")}
            </Label>
            <Select value={profile.care_experience || ""} onValueChange={(v) => setProfile((p) => ({ ...p, care_experience: v }))}>
              <SelectTrigger><SelectValue placeholder="選択してください" /></SelectTrigger>
              <SelectContent>
                {EXPERIENCE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Dispatch Section */}
      {isDispatch && (
        <Card className="mb-5 border-reward-purple/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4 text-reward-purple" /> 派遣社員限定
              <Badge variant="outline" className="text-[10px] border-reward-purple/30 text-reward-purple">各100pt + 完了500pt</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-sm flex items-center gap-1.5">
                A. 派遣会社はどこですか？ {renderFieldCheck("dispatch_company")}
              </Label>
              <Input placeholder="〇〇派遣会社" value={profile.dispatch_company || ""} onChange={(e) => setProfile((p) => ({ ...p, dispatch_company: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm flex items-center gap-1.5">
                <DollarSign className="h-3.5 w-3.5" /> B. お時給はいくらですか？ {renderFieldCheck("hourly_rate")}
              </Label>
              <Input type="number" placeholder="1500" value={profile.hourly_rate || ""} onChange={(e) => setProfile((p) => ({ ...p, hourly_rate: e.target.value ? parseInt(e.target.value) : null }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" /> C. 契約期間はいつまでですか？ {renderFieldCheck("contract_end_date")}
              </Label>
              <Input type="date" value={profile.contract_end_date || ""} onChange={(e) => setProfile((p) => ({ ...p, contract_end_date: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" /> D. 現在の就業場所はどこですか？ {renderFieldCheck("work_location")}
              </Label>
              <Input placeholder="〇〇介護施設" value={profile.work_location || ""} onChange={(e) => setProfile((p) => ({ ...p, work_location: e.target.value }))} />
            </div>
          </CardContent>
        </Card>
      )}

      <Button onClick={handleSave} variant="sakura" className="w-full" size="lg" disabled={saving}>
        {saving ? "保存中..." : "プロフィールを保存する"}
      </Button>

      {/* 実績ページへのリンク */}
      <Button
        variant="outline"
        className="w-full mt-3"
        onClick={() => navigate("/achievements")}
      >
        <Trophy className="h-4 w-4 mr-1 text-coral" />
        実績バッジを見る
      </Button>

      <Button
        variant="outline"
        className="w-full mt-3 gap-2"
        onClick={() => {
          resetTutorials();
          toast({ title: "チュートリアルをリセットしました", description: "各ページを開くと再表示されます" });
        }}
      >
        <HelpCircle className="h-4 w-4" />
        アプリの使い方をもう一度見る
      </Button>
    </AppLayout>
  );
};

export default ProfilePage;
