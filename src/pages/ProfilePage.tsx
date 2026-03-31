import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { User, MapPin, Briefcase, Award, Camera, Check, CalendarDays, Building2, Clock, DollarSign, CalendarCheck, Sun } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";

interface ProfileData {
  display_name: string | null;
  full_name: string | null;
  avatar_url: string | null;
  address: string | null;
  date_of_birth: string | null;
  care_experience: string | null;
  care_qualifications: string | null;
  employment_type: string | null;
  dispatch_company: string | null;
  hourly_rate: number | null;
  weekly_days: string | null;
  preferred_shift: string | null;
}

const QUALIFICATION_OPTIONS = [
  "初任者研修",
  "実務者研修",
  "介護福祉士",
  "社会福祉士",
  "ケアマネジャー",
  "看護師",
  "保育士",
];

const EXPERIENCE_OPTIONS = [
  { value: "none", label: "なし" },
  { value: "less_than_6m", label: "半年未満" },
  { value: "less_than_1y", label: "1年未満" },
  { value: "less_than_3y", label: "3年未満" },
  { value: "less_than_5y", label: "5年未満" },
  { value: "5y_plus", label: "5年以上" },
];

const EMPLOYMENT_TYPE_OPTIONS = [
  { value: "fulltime", label: "正社員" },
  { value: "parttime", label: "バイト" },
  { value: "dispatch", label: "派遣" },
];

const WEEKLY_DAYS_OPTIONS = [
  { value: "1", label: "1日" },
  { value: "2", label: "2日" },
  { value: "3", label: "3日" },
  { value: "4", label: "4日" },
  { value: "5", label: "5日" },
];

const PREFERRED_SHIFT_OPTIONS = [
  { value: "early", label: "早番" },
  { value: "mid", label: "中番" },
  { value: "late", label: "遅番" },
];

// Fields that count toward completion
const PROFILE_FIELDS: { key: keyof ProfileData; label: string }[] = [
  { key: "avatar_url", label: "プロフィール写真" },
  { key: "full_name", label: "氏名" },
  { key: "date_of_birth", label: "生年月日" },
  { key: "address", label: "住所" },
  { key: "care_experience", label: "介護経験年数" },
  { key: "care_qualifications", label: "保有資格" },
  { key: "employment_type", label: "就業形態" },
  { key: "dispatch_company", label: "登録派遣会社" },
  { key: "hourly_rate", label: "現在の時給" },
  { key: "weekly_days", label: "週日数" },
  { key: "preferred_shift", label: "希望働き方" },
];

const isFieldFilled = (key: keyof ProfileData, value: any): boolean => {
  if (key === "hourly_rate") return value !== null && value !== undefined && value > 0;
  if (typeof value === "string") return value.trim() !== "";
  return !!value;
};

const ProfilePage = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfileData>({
    display_name: null, full_name: null, avatar_url: null, address: null,
    date_of_birth: null, care_experience: null, care_qualifications: null,
    employment_type: null, dispatch_company: null, hourly_rate: null,
    weekly_days: null, preferred_shift: null,
  });
  const [originalProfile, setOriginalProfile] = useState<ProfileData | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [completedFields, setCompletedFields] = useState(0);
  const [qualificationOther, setQualificationOther] = useState("");
  const [completionBonusClaimed, setCompletionBonusClaimed] = useState(false);

  const selectedQualifications: string[] = (() => {
    try {
      if (!profile.care_qualifications) return [];
      return JSON.parse(profile.care_qualifications);
    } catch { return []; }
  })();

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("display_name, full_name, avatar_url, address, date_of_birth, care_experience, care_qualifications, employment_type, dispatch_company, hourly_rate, weekly_days, preferred_shift")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          const p = data as unknown as ProfileData;
          setProfile(p);
          setOriginalProfile(p);
          countCompleted(p);
          try {
            const quals: string[] = JSON.parse(p.care_qualifications || "[]");
            const other = quals.find((q) => !QUALIFICATION_OPTIONS.includes(q));
            if (other) setQualificationOther(other);
          } catch { /* ignore */ }
        }
      });

    // Check if completion bonus already claimed
    supabase.from("points_history")
      .select("id")
      .eq("user_id", user.id)
      .eq("description", "プロフィール完成ボーナス")
      .limit(1)
      .then(({ data }) => {
        if (data && data.length > 0) setCompletionBonusClaimed(true);
      });
  }, [user]);

  const countCompleted = (p: ProfileData) => {
    let count = 0;
    PROFILE_FIELDS.forEach((f) => {
      if (isFieldFilled(f.key, p[f.key])) count++;
    });
    setCompletedFields(count);
    return count;
  };

  const toggleQualification = (qual: string, checked: boolean) => {
    let current = [...selectedQualifications];
    if (checked) current.push(qual);
    else current = current.filter((q) => q !== qual);
    setProfile((prev) => ({ ...prev, care_qualifications: JSON.stringify(current) }));
  };

  const updateOtherQualification = (text: string) => {
    setQualificationOther(text);
    let current = selectedQualifications.filter((q) => QUALIFICATION_OPTIONS.includes(q));
    if (text.trim()) current.push(text.trim());
    setProfile((prev) => ({ ...prev, care_qualifications: JSON.stringify(current) }));
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !e.target.files?.[0]) return;
    const file = e.target.files[0];
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "ファイルサイズは2MB以下にしてください", variant: "destructive" });
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `avatars/${user.id}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("column-images").upload(path, file, { upsert: true });
    if (uploadError) {
      toast({ title: "アップロードに失敗しました", description: uploadError.message, variant: "destructive" });
      setUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage.from("column-images").getPublicUrl(path);
    const avatarUrl = urlData.publicUrl + `?t=${Date.now()}`;
    setProfile((prev) => ({ ...prev, avatar_url: avatarUrl }));
    setUploading(false);
  };

  const handleSave = async () => {
    if (!user || !originalProfile) return;
    setSaving(true);

    let newPoints = 0;
    PROFILE_FIELDS.forEach((f) => {
      const wasEmpty = !isFieldFilled(f.key, originalProfile[f.key]);
      const nowFilled = isFieldFilled(f.key, profile[f.key]);
      if (wasEmpty && nowFilled) newPoints += 5;
    });

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: profile.full_name,
        avatar_url: profile.avatar_url,
        address: profile.address,
        date_of_birth: profile.date_of_birth,
        care_experience: profile.care_experience,
        care_qualifications: profile.care_qualifications,
        employment_type: profile.employment_type,
        dispatch_company: profile.dispatch_company,
        hourly_rate: profile.hourly_rate,
        weekly_days: profile.weekly_days,
        preferred_shift: profile.preferred_shift,
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
        description: `プロフィール入力ボーナス（${newPoints / 5}項目）`,
        points: newPoints,
        type: "earn",
      });
    }

    // Check if all fields are now filled → award 500pt completion bonus
    const updatedCount = countCompleted(profile);
    if (updatedCount === PROFILE_FIELDS.length && !completionBonusClaimed) {
      await supabase.from("points_history").insert({
        user_id: user.id,
        description: "プロフィール完成ボーナス",
        points: 500,
        type: "earn",
      });
      setCompletionBonusClaimed(true);
      newPoints += 500;
    }

    // Check if all non-photo fields filled → award 500pt to referrer
    const nonPhotoFields = PROFILE_FIELDS.filter(f => f.key !== "avatar_url");
    const nonPhotoComplete = nonPhotoFields.every(f => isFieldFilled(f.key, profile[f.key]));
    if (nonPhotoComplete) {
      // Check if this user was referred
      const { data: refData } = await supabase
        .from("referrals")
        .select("id, referrer_id")
        .eq("referred_user_id", user.id)
        .limit(1);
      if (refData && refData.length > 0) {
        const referral = refData[0];
        // Check if bonus already awarded
        const { data: existingBonus } = await supabase
          .from("points_history")
          .select("id")
          .eq("user_id", referral.referrer_id)
          .eq("description", `紹介先プロフィール完成ボーナス（${user.id}）`)
          .limit(1);
        if (!existingBonus || existingBonus.length === 0) {
          await supabase.from("points_history").insert({
            user_id: referral.referrer_id,
            description: `紹介先プロフィール完成ボーナス（${user.id}）`,
            points: 500,
            type: "earn",
          });
        }
      }
    }

    setOriginalProfile({ ...profile });
    setSaving(false);
    toast({
      title: "プロフィールを保存しました！",
      description: newPoints > 0 ? `+${newPoints}ポイント獲得しました🎉` : undefined,
    });
  };

  const totalPossible = PROFILE_FIELDS.length;

  return (
    <AppLayout title="プロフィール">
      {/* Completion Progress */}
      <Card className="mb-5">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">入力状況</span>
            <Badge variant={completedFields === totalPossible ? "default" : "secondary"} className="text-xs">
              {completedFields}/{totalPossible} 完了
            </Badge>
          </div>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${(completedFields / totalPossible) * 100}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            各項目を入力すると1項目につき <span className="font-semibold text-primary">5ポイント</span> 獲得！
          </p>
          {completedFields === totalPossible && completionBonusClaimed && (
            <p className="text-xs text-primary font-semibold mt-1">✅ プロフィール完成ボーナス +500pt 獲得済み</p>
          )}
          {completedFields < totalPossible && (
            <p className="text-xs text-primary font-semibold mt-1">🎯 全項目入力で追加 500ポイント ボーナス！</p>
          )}
        </CardContent>
      </Card>

      {/* Avatar */}
      <Card className="mb-5">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Camera className="h-4 w-4" />
            プロフィール写真
            {profile.avatar_url && <Check className="h-4 w-4 text-primary" />}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-4">
          <Avatar className="h-20 w-20">
            <AvatarImage src={profile.avatar_url || undefined} />
            <AvatarFallback className="text-2xl bg-muted">
              <User className="h-8 w-8" />
            </AvatarFallback>
          </Avatar>
          <div>
            <label htmlFor="avatar-upload">
              <Button variant="outline" size="sm" asChild disabled={uploading}>
                <span>{uploading ? "アップロード中..." : "写真を変更"}</span>
              </Button>
            </label>
            <input id="avatar-upload" type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
            <p className="text-xs text-muted-foreground mt-1">2MB以下のJPG/PNG</p>
          </div>
        </CardContent>
      </Card>

      {/* Form Fields */}
      <Card className="mb-5">
        <CardContent className="p-4 space-y-4">
          {/* 氏名 */}
          <div className="space-y-1.5">
            <Label htmlFor="full_name" className="text-sm flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" /> 氏名
              {profile.full_name && profile.full_name.trim() !== "" && <Check className="h-3.5 w-3.5 text-primary" />}
            </Label>
            <Input id="full_name" placeholder="山田 太郎" value={profile.full_name || ""} onChange={(e) => setProfile((p) => ({ ...p, full_name: e.target.value }))} />
          </div>

          {/* 生年月日 */}
          <div className="space-y-1.5">
            <Label htmlFor="date_of_birth" className="text-sm flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5" /> 生年月日
              {profile.date_of_birth && profile.date_of_birth.trim() !== "" && <Check className="h-3.5 w-3.5 text-primary" />}
            </Label>
            <Input id="date_of_birth" type="date" value={profile.date_of_birth || ""} onChange={(e) => setProfile((p) => ({ ...p, date_of_birth: e.target.value }))} />
          </div>

          {/* 住所 */}
          <div className="space-y-1.5">
            <Label htmlFor="address" className="text-sm flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" /> 住所
              {profile.address && profile.address.trim() !== "" && <Check className="h-3.5 w-3.5 text-primary" />}
            </Label>
            <Input id="address" placeholder="東京都渋谷区..." value={profile.address || ""} onChange={(e) => setProfile((p) => ({ ...p, address: e.target.value }))} />
          </div>

          {/* 就業形態 */}
          <div className="space-y-1.5">
            <Label className="text-sm flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5" /> 就業形態
              {profile.employment_type && <Check className="h-3.5 w-3.5 text-primary" />}
            </Label>
            <Select value={profile.employment_type || ""} onValueChange={(v) => setProfile((p) => ({ ...p, employment_type: v }))}>
              <SelectTrigger><SelectValue placeholder="選択してください" /></SelectTrigger>
              <SelectContent>
                {EMPLOYMENT_TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 登録派遣会社 */}
          <div className="space-y-1.5">
            <Label htmlFor="dispatch_company" className="text-sm flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5" /> 登録派遣会社
              {profile.dispatch_company && profile.dispatch_company.trim() !== "" && <Check className="h-3.5 w-3.5 text-primary" />}
            </Label>
            <Input id="dispatch_company" placeholder="〇〇派遣会社" value={profile.dispatch_company || ""} onChange={(e) => setProfile((p) => ({ ...p, dispatch_company: e.target.value }))} />
          </div>

          {/* 現在の時給 */}
          <div className="space-y-1.5">
            <Label htmlFor="hourly_rate" className="text-sm flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5" /> 現在の時給
              {profile.hourly_rate && profile.hourly_rate > 0 && <Check className="h-3.5 w-3.5 text-primary" />}
            </Label>
            <Input id="hourly_rate" type="number" placeholder="1500" value={profile.hourly_rate || ""} onChange={(e) => setProfile((p) => ({ ...p, hourly_rate: e.target.value ? parseInt(e.target.value) : null }))} />
          </div>

          {/* 週日数 */}
          <div className="space-y-1.5">
            <Label className="text-sm flex items-center gap-1.5">
              <CalendarCheck className="h-3.5 w-3.5" /> 週日数
              {profile.weekly_days && <Check className="h-3.5 w-3.5 text-primary" />}
            </Label>
            <Select value={profile.weekly_days || ""} onValueChange={(v) => setProfile((p) => ({ ...p, weekly_days: v }))}>
              <SelectTrigger><SelectValue placeholder="選択してください" /></SelectTrigger>
              <SelectContent>
                {WEEKLY_DAYS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 希望働き方 */}
          <div className="space-y-1.5">
            <Label className="text-sm flex items-center gap-1.5">
              <Sun className="h-3.5 w-3.5" /> 希望働き方
              {profile.preferred_shift && <Check className="h-3.5 w-3.5 text-primary" />}
            </Label>
            <Select value={profile.preferred_shift || ""} onValueChange={(v) => setProfile((p) => ({ ...p, preferred_shift: v }))}>
              <SelectTrigger><SelectValue placeholder="選択してください" /></SelectTrigger>
              <SelectContent>
                {PREFERRED_SHIFT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 介護経験年数 */}
          <div className="space-y-1.5">
            <Label className="text-sm flex items-center gap-1.5">
              <Briefcase className="h-3.5 w-3.5" /> 介護経験年数
              {profile.care_experience && profile.care_experience.trim() !== "" && <Check className="h-3.5 w-3.5 text-primary" />}
            </Label>
            <Select value={profile.care_experience || ""} onValueChange={(v) => setProfile((p) => ({ ...p, care_experience: v }))}>
              <SelectTrigger><SelectValue placeholder="選択してください" /></SelectTrigger>
              <SelectContent>
                {EXPERIENCE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 保有資格 */}
          <div className="space-y-1.5">
            <Label className="text-sm flex items-center gap-1.5">
              <Award className="h-3.5 w-3.5" /> 保有資格
              {selectedQualifications.length > 0 && <Check className="h-3.5 w-3.5 text-primary" />}
            </Label>
            <div className="space-y-2 pl-1">
              {QUALIFICATION_OPTIONS.map((qual) => (
                <div key={qual} className="flex items-center gap-2">
                  <Checkbox id={`qual-${qual}`} checked={selectedQualifications.includes(qual)} onCheckedChange={(checked) => toggleQualification(qual, !!checked)} />
                  <label htmlFor={`qual-${qual}`} className="text-sm cursor-pointer">{qual}</label>
                </div>
              ))}
              <div className="flex items-center gap-2">
                <Checkbox id="qual-other" checked={qualificationOther.trim() !== ""} onCheckedChange={(checked) => { if (!checked) updateOtherQualification(""); }} />
                <label htmlFor="qual-other" className="text-sm cursor-pointer">その他</label>
              </div>
              {(qualificationOther.trim() !== "" || selectedQualifications.some((q) => !QUALIFICATION_OPTIONS.includes(q))) && (
                <Input placeholder="資格名を入力" value={qualificationOther} onChange={(e) => updateOtherQualification(e.target.value)} className="ml-6 w-auto" />
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} className="w-full" size="lg" disabled={saving}>
        {saving ? "保存中..." : "プロフィールを保存する"}
      </Button>
    </AppLayout>
  );
};

export default ProfilePage;
