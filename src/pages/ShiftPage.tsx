import { useState, useMemo, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Sun, Clock, Moon, Check, Pencil, Building2, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { getRandomPraise } from "@/lib/shiftMessages";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";

type ShiftType = "early" | "mid" | "late";

const SHIFT_DEFAULTS: Record<ShiftType, { label: string; startTime: string; endTime: string; icon: React.ElementType; color: string; bgColor: string; calendarColor: string }> = {
  early: { label: "朝番", startTime: "07:00", endTime: "16:00", icon: Sun, color: "text-orange-600", bgColor: "bg-orange-100", calendarColor: "bg-orange-200 text-orange-800" },
  mid: { label: "中番", startTime: "10:00", endTime: "19:00", icon: Clock, color: "text-emerald-600", bgColor: "bg-emerald-100", calendarColor: "bg-emerald-200 text-emerald-800" },
  late: { label: "遅番", startTime: "16:00", endTime: "01:00", icon: Moon, color: "text-indigo-600", bgColor: "bg-indigo-100", calendarColor: "bg-indigo-200 text-indigo-800" },
};

function calcHours(start: string, end: string, isLate: boolean): number {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  let diff = (eh * 60 + em) - (sh * 60 + sm);
  if (diff <= 0 || isLate) diff += 24 * 60;
  return Math.max(1, Math.round(diff / 60));
}

interface ShiftRow {
  id: string;
  shift_date: string;
  shift_type: string;
  start_time: string;
  end_time: string;
  hours: number;
  points_earned: number;
  facility_name?: string | null;
}

const ShiftPage = () => {
  const { user } = useAuth();
  const [firstLaunchDate, setFirstLaunchDate] = useState<Date>(new Date());
  const [isInCampaign, setIsInCampaign] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedShift, setSelectedShift] = useState<ShiftType | null>(null);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [submittedShifts, setSubmittedShifts] = useState<ShiftRow[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [facilityName, setFacilityName] = useState("");
  const [editingShiftId, setEditingShiftId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("first_launch_date").eq("user_id", user.id).single()
      .then(({ data }) => {
        if (data?.first_launch_date) {
          const launch = new Date(data.first_launch_date);
          setFirstLaunchDate(launch);
          const diffDays = Math.ceil((new Date().getTime() - launch.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays <= 7) setIsInCampaign(true);
        }
      });
    supabase.from("shifts").select("*").eq("user_id", user.id).order("shift_date", { ascending: true })
      .then(({ data }) => {
        if (data) setSubmittedShifts(data as ShiftRow[]);
      });
  }, [user]);

  const handleSelectShift = (type: ShiftType) => {
    setSelectedShift(type);
    const defaults = SHIFT_DEFAULTS[type];
    setStartTime(defaults.startTime);
    setEndTime(defaults.endTime);
  };

  const pointsPerHour = isInCampaign ? 10 : 1;

  const hours = useMemo(() => {
    if (!startTime || !endTime || !selectedShift) return 0;
    return calcHours(startTime, endTime, selectedShift === "late");
  }, [startTime, endTime, selectedShift]);

  const earnedPoints = hours * pointsPerHour;

  const resetForm = () => {
    setSelectedDate(undefined);
    setSelectedShift(null);
    setStartTime("");
    setEndTime("");
    setFacilityName("");
    setEditingShiftId(null);
  };

  const handleSubmit = async () => {
    if (!selectedDate || !selectedShift || !user) {
      toast({ title: "日付とシフトタイプを選択してください", variant: "destructive" });
      return;
    }

    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, "0");
    const day = String(selectedDate.getDate()).padStart(2, "0");
    const dateStr = `${year}-${month}-${day}`;
    setSubmitting(true);
    const defaults = SHIFT_DEFAULTS[selectedShift];

    if (editingShiftId) {
      const { data: updatedShift, error } = await supabase.from("shifts").update({
        shift_type: selectedShift,
        start_time: startTime,
        end_time: endTime,
        hours,
        points_earned: earnedPoints,
        facility_name: facilityName || null,
      }).eq("id", editingShiftId).select().single();

      if (error) {
        toast({ title: "エラーが発生しました", description: error.message, variant: "destructive" });
        setSubmitting(false);
        return;
      }

      await supabase.from("points_history")
        .update({ points: earnedPoints, description: `${defaults.label}勤務${isInCampaign ? "（キャンペーン10倍）" : ""}` })
        .eq("shift_id", editingShiftId);

      setSubmittedShifts((prev) => prev.map((s) => s.id === editingShiftId ? (updatedShift as ShiftRow) : s));
      toast({ title: "シフトを更新しました！" });
    } else {
      const alreadyExists = submittedShifts.some((s) => s.shift_date === dateStr);
      if (alreadyExists) {
        toast({ title: "この日はすでにシフトが登録されています", variant: "destructive" });
        setSubmitting(false);
        return;
      }

      const { data: shiftData, error: shiftError } = await supabase.from("shifts").insert({
        user_id: user.id,
        shift_date: dateStr,
        shift_type: selectedShift,
        start_time: startTime,
        end_time: endTime,
        hours,
        points_earned: earnedPoints,
        facility_name: facilityName || null,
      }).select().single();

      if (shiftError) {
        toast({ title: "エラーが発生しました", description: shiftError.message, variant: "destructive" });
        setSubmitting(false);
        return;
      }

      await supabase.from("points_history").insert({
        user_id: user.id,
        description: `${defaults.label}勤務${isInCampaign ? "（キャンペーン10倍）" : ""}`,
        points: earnedPoints,
        type: "earn",
        shift_id: shiftData.id,
      });

      setSubmittedShifts((prev) => [...prev, shiftData as ShiftRow]);
      toast({
        title: getRandomPraise(),
        description: `${selectedDate.toLocaleDateString("ja-JP")} ${defaults.label} ${startTime}〜${endTime}（+${earnedPoints}ポイント）`,
      });
    }

    resetForm();
    setSubmitting(false);
  };

  const handleEdit = (shift: ShiftRow) => {
    setEditingShiftId(shift.id);
    setSelectedDate(new Date(shift.shift_date + "T00:00:00"));
    setSelectedShift(shift.shift_type as ShiftType);
    setStartTime(shift.start_time.slice(0, 5));
    setEndTime(shift.end_time.slice(0, 5));
    setFacilityName(shift.facility_name || "");
  };

  const handleDelete = async (shiftId: string) => {
    if (!user) return;
    await supabase.from("points_history").delete().eq("shift_id", shiftId);
    const { error } = await supabase.from("shifts").delete().eq("id", shiftId);
    if (error) {
      toast({ title: "削除に失敗しました", description: error.message, variant: "destructive" });
      return;
    }
    setSubmittedShifts((prev) => prev.filter((s) => s.id !== shiftId));
    toast({ title: "シフトを削除しました" });
    if (editingShiftId === shiftId) resetForm();
  };

  // Build shift lookup by date for calendar coloring
  const shiftByDate = useMemo(() => {
    const map: Record<string, ShiftType> = {};
    submittedShifts.forEach((s) => {
      map[s.shift_date] = s.shift_type as ShiftType;
    });
    return map;
  }, [submittedShifts]);

  const earlyDates = submittedShifts.filter((s) => s.shift_type === "early").map((s) => new Date(s.shift_date + "T00:00:00"));
  const midDates = submittedShifts.filter((s) => s.shift_type === "mid").map((s) => new Date(s.shift_date + "T00:00:00"));
  const lateDates = submittedShifts.filter((s) => s.shift_type === "late").map((s) => new Date(s.shift_date + "T00:00:00"));
  // Support legacy "night" type
  const nightDates = submittedShifts.filter((s) => s.shift_type === "night").map((s) => new Date(s.shift_date + "T00:00:00"));

  return (
    <AppLayout title="シフト申請">
      {/* Legend */}
      <div className="flex items-center gap-3 mb-3 px-1">
        <div className="flex items-center gap-1"><div className="h-3 w-3 rounded-full bg-orange-300" /><span className="text-xs">朝番</span></div>
        <div className="flex items-center gap-1"><div className="h-3 w-3 rounded-full bg-emerald-300" /><span className="text-xs">中番</span></div>
        <div className="flex items-center gap-1"><div className="h-3 w-3 rounded-full bg-indigo-300" /><span className="text-xs">遅番</span></div>
      </div>

      <Card className="mb-5">
        <CardContent className="p-3">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => { setSelectedDate(date); setEditingShiftId(null); setSelectedShift(null); }}
            className="pointer-events-auto"
            modifiers={{
              early: earlyDates,
              mid: midDates,
              late: lateDates,
              night: nightDates,
            }}
            modifiersClassNames={{
              early: "bg-orange-200 text-orange-800 font-bold rounded-full",
              mid: "bg-emerald-200 text-emerald-800 font-bold rounded-full",
              late: "bg-indigo-200 text-indigo-800 font-bold rounded-full",
              night: "bg-indigo-200 text-indigo-800 font-bold rounded-full",
            }}
            disabled={(date) => date < firstLaunchDate}
          />
        </CardContent>
      </Card>

      {selectedDate && (
        <Card className="mb-5">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                {selectedDate.toLocaleDateString("ja-JP", { month: "long", day: "numeric", weekday: "short" })} のシフト
                {editingShiftId && <Badge variant="outline" className="ml-2 text-[10px]">編集中</Badge>}
              </CardTitle>
              {editingShiftId && (
                <Button variant="ghost" size="sm" onClick={resetForm}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {(Object.entries(SHIFT_DEFAULTS) as [ShiftType, typeof SHIFT_DEFAULTS["early"]][]).map(([value, option]) => (
              <button
                key={value}
                onClick={() => handleSelectShift(value)}
                className={cn(
                  "w-full flex items-center gap-4 p-4 rounded-lg border-2 transition-all",
                  selectedShift === value ? "border-primary bg-accent" : "border-border hover:border-primary/30"
                )}
              >
                <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center", option.bgColor)}>
                  <option.icon className={cn("h-5 w-5", option.color)} />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-sm">{option.label}</p>
                  <p className="text-xs text-muted-foreground">{option.startTime} 〜 {option.endTime}</p>
                </div>
                {selectedShift === value && <Check className="h-5 w-5 text-primary" />}
              </button>
            ))}

            {selectedShift && (
              <div className="mt-4 p-4 rounded-lg bg-muted/50 border border-border space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="facilityName" className="text-xs flex items-center gap-1">
                    <Building2 className="h-3.5 w-3.5" /> 施設名
                  </Label>
                  <Input id="facilityName" placeholder="〇〇介護施設" value={facilityName} onChange={(e) => setFacilityName(e.target.value)} />
                </div>
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Pencil className="h-4 w-4 text-muted-foreground" /> 時間を編集
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="startTime" className="text-xs">開始時間</Label>
                    <Input id="startTime" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="endTime" className="text-xs">終了時間</Label>
                    <Input id="endTime" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">勤務時間</span>
                  <Badge variant="secondary" className="text-xs font-mono">{hours}時間 → +{earnedPoints} pt{isInCampaign ? " (10倍)" : ""}</Badge>
                </div>
              </div>
            )}

            <Button onClick={handleSubmit} className="w-full mt-4" size="lg" disabled={submitting}>
              {submitting ? "送信中..." : editingShiftId ? "シフトを更新する" : "シフトを申請する"}
            </Button>
          </CardContent>
        </Card>
      )}

      {submittedShifts.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">申請済みシフト</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {submittedShifts.map((shift) => {
              const option = SHIFT_DEFAULTS[shift.shift_type as ShiftType];
              if (!option) return null;
              const Icon = option.icon;
              const isEditing = editingShiftId === shift.id;
              return (
                <div
                  key={shift.id}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg",
                    isEditing ? "bg-accent border border-primary/30" : "bg-muted"
                  )}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={cn("h-8 w-8 rounded-full flex items-center justify-center", option.bgColor)}>
                      <Icon className={cn("h-4 w-4", option.color)} />
                    </div>
                    <div className="min-w-0">
                      <span className="text-sm font-medium">
                        {new Date(shift.shift_date + "T00:00:00").toLocaleDateString("ja-JP", { month: "short", day: "numeric", weekday: "short" })}
                      </span>
                      <p className="text-xs text-muted-foreground truncate">
                        {shift.start_time.slice(0, 5)}〜{shift.end_time.slice(0, 5)}
                        {shift.facility_name && ` @ ${shift.facility_name}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Badge className={cn("text-xs border-0", option.bgColor, option.color)}>{option.label}</Badge>
                    <span className="text-xs text-muted-foreground">+{shift.points_earned}pt</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(shift)}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(shift.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </AppLayout>
  );
};

export default ShiftPage;
