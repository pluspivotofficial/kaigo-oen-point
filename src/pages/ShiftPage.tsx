import { useState, useMemo, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { getRandomPraise } from "@/lib/shiftMessages";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react";

type ShiftType = "early" | "day" | "late" | "night" | "off";

const SHIFT_CONFIG: Record<ShiftType, { label: string; color: string; bg: string; border: string; textColor: string }> = {
  early: { label: "早番", color: "text-green-700", bg: "bg-green-50", border: "border-green-500", textColor: "text-green-600" },
  day: { label: "日勤", color: "text-red-600", bg: "bg-red-50", border: "border-red-400", textColor: "text-red-500" },
  late: { label: "遅番", color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-500", textColor: "text-amber-600" },
  night: { label: "夜勤", color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-500", textColor: "text-blue-600" },
  off: { label: "休み", color: "text-pink-600", bg: "bg-pink-50", border: "border-pink-400", textColor: "text-pink-500" },
};

const DAYS_JP = ["日", "月", "火", "水", "木", "金", "土"];
const DAY_COLORS = ["text-red-500", "text-foreground", "text-foreground", "text-foreground", "text-foreground", "text-foreground", "text-blue-500"];

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
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [submittedShifts, setSubmittedShifts] = useState<ShiftRow[]>([]);
  const [firstLaunchDate, setFirstLaunchDate] = useState<Date>(new Date());
  const [isInCampaign, setIsInCampaign] = useState(false);

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

  const shiftByDate = useMemo(() => {
    const map: Record<string, ShiftRow> = {};
    submittedShifts.forEach((s) => { map[s.shift_date] = s; });
    return map;
  }, [submittedShifts]);

  // Build calendar grid
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevDays = new Date(year, month, 0).getDate();

    const days: { date: string; day: number; isCurrentMonth: boolean }[] = [];

    // Previous month padding
    for (let i = firstDay - 1; i >= 0; i--) {
      const d = prevDays - i;
      const m = month === 0 ? 12 : month;
      const y = month === 0 ? year - 1 : year;
      days.push({ date: `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`, day: d, isCurrentMonth: false });
    }

    // Current month
    for (let d = 1; d <= daysInMonth; d++) {
      days.push({ date: `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`, day: d, isCurrentMonth: true });
    }

    // Next month padding
    const remaining = 7 - (days.length % 7);
    if (remaining < 7) {
      for (let d = 1; d <= remaining; d++) {
        const m = month + 2 > 12 ? 1 : month + 2;
        const y = month + 2 > 12 ? year + 1 : year;
        days.push({ date: `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`, day: d, isCurrentMonth: false });
      }
    }

    return days;
  }, [currentMonth]);

  const pointsPerShift = isInCampaign ? 50 : 5;

  const handleShiftSelect = async (type: ShiftType) => {
    if (!selectedDate || !user) return;

    const existing = shiftByDate[selectedDate];

    if (existing) {
      // Update existing shift
      if (existing.shift_type === type) {
        // Same type = delete
        await supabase.from("points_history").delete().eq("shift_id", existing.id);
        await supabase.from("shifts").delete().eq("id", existing.id);
        setSubmittedShifts((prev) => prev.filter((s) => s.id !== existing.id));
        toast({ title: "シフトを削除しました" });
        return;
      }
      // Different type = update
      const config = SHIFT_CONFIG[type];
      const { data, error } = await supabase.from("shifts").update({
        shift_type: type,
        start_time: "00:00",
        end_time: "00:00",
        hours: 1,
        points_earned: type === "off" ? 0 : pointsPerShift,
      }).eq("id", existing.id).select().single();

      if (error) { toast({ title: "エラー", description: error.message, variant: "destructive" }); return; }

      await supabase.from("points_history")
        .update({ points: type === "off" ? 0 : pointsPerShift, description: `${config.label}シフト登録` })
        .eq("shift_id", existing.id);

      setSubmittedShifts((prev) => prev.map((s) => s.id === existing.id ? (data as ShiftRow) : s));
      toast({ title: `${config.label}に変更しました` });
    } else {
      // New shift
      const config = SHIFT_CONFIG[type];
      const { data, error } = await supabase.from("shifts").insert({
        user_id: user.id,
        shift_date: selectedDate,
        shift_type: type,
        start_time: "00:00",
        end_time: "00:00",
        hours: 1,
        points_earned: type === "off" ? 0 : pointsPerShift,
      }).select().single();

      if (error) { toast({ title: "エラー", description: error.message, variant: "destructive" }); return; }

      if (type !== "off") {
        await supabase.from("points_history").insert({
          user_id: user.id,
          description: `${config.label}シフト登録${isInCampaign ? "（キャンペーン10倍）" : ""}`,
          points: pointsPerShift,
          type: "earn",
          shift_id: data.id,
        });
      }

      setSubmittedShifts((prev) => [...prev, data as ShiftRow]);
      toast({
        title: getRandomPraise(),
        description: `${selectedDate} ${config.label}（+${type === "off" ? 0 : pointsPerShift}pt）`,
      });
    }
  };

  const handleDeleteShift = async (dateStr: string) => {
    const shift = shiftByDate[dateStr];
    if (!shift) return;
    await supabase.from("points_history").delete().eq("shift_id", shift.id);
    await supabase.from("shifts").delete().eq("id", shift.id);
    setSubmittedShifts((prev) => prev.filter((s) => s.id !== shift.id));
    toast({ title: "シフトを削除しました" });
  };

  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  const goToday = () => {
    const now = new Date();
    setCurrentMonth(new Date(now.getFullYear(), now.getMonth(), 1));
  };

  const selectedShiftForDate = selectedDate ? shiftByDate[selectedDate] : null;

  return (
    <AppLayout title="シフト登録">
      <Card className="mb-4">
        <CardContent className="p-0">
          {/* Month header */}
          <div className="flex items-center justify-between px-4 py-3 bg-pink-100 rounded-t-lg">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={prevMonth}>
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">{currentMonth.getFullYear()}年</p>
                <p className="text-lg font-bold">{currentMonth.getMonth() + 1}月</p>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={nextMonth}>
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
            <Button variant="outline" size="sm" onClick={goToday} className="text-xs">今日</Button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 border-b">
            {DAYS_JP.map((d, i) => (
              <div key={d} className={cn("text-center py-1.5 text-xs font-bold", DAY_COLORS[i])}>
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7">
            {calendarDays.map((cell, idx) => {
              const shift = shiftByDate[cell.date];
              const shiftConfig = shift ? SHIFT_CONFIG[shift.shift_type as ShiftType] : null;
              const isSelected = selectedDate === cell.date;
              const dayOfWeek = new Date(cell.date + "T00:00:00").getDay();
              const isDisabled = !cell.isCurrentMonth || new Date(cell.date + "T00:00:00") < firstLaunchDate;

              return (
                <button
                  key={idx}
                  onClick={() => !isDisabled && setSelectedDate(cell.date)}
                  disabled={isDisabled}
                  className={cn(
                    "relative flex flex-col items-center justify-start py-1 min-h-[52px] border-b border-r text-sm transition-colors",
                    isDisabled && "opacity-30",
                    !isDisabled && "hover:bg-accent/50",
                    isSelected && "bg-yellow-50 ring-2 ring-inset ring-yellow-400",
                  )}
                >
                  <span className={cn(
                    "text-xs font-bold",
                    dayOfWeek === 0 ? "text-red-500" : dayOfWeek === 6 ? "text-blue-500" : "text-foreground",
                    !cell.isCurrentMonth && "opacity-40"
                  )}>
                    {cell.day}
                  </span>
                  {shiftConfig && (
                    <span className={cn("text-[10px] font-bold mt-0.5", shiftConfig.textColor)}>
                      {shiftConfig.label}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Shift input section */}
      {selectedDate && (
        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-bold text-foreground">
                {(() => {
                  const d = new Date(selectedDate + "T00:00:00");
                  return `${d.getMonth() + 1}/${d.getDate()}(${DAYS_JP[d.getDay()]}) のシフト入力`;
                })()}
              </p>
              {selectedShiftForDate && (
                <Button variant="ghost" size="sm" className="text-destructive text-xs h-7" onClick={() => handleDeleteShift(selectedDate)}>
                  <Trash2 className="h-3.5 w-3.5 mr-1" />削除
                </Button>
              )}
            </div>

            <div className="grid grid-cols-5 gap-2">
              {(Object.entries(SHIFT_CONFIG) as [ShiftType, typeof SHIFT_CONFIG["early"]][]).map(([type, config]) => {
                const isActive = selectedShiftForDate?.shift_type === type;
                return (
                  <button
                    key={type}
                    onClick={() => handleShiftSelect(type)}
                    className={cn(
                      "flex items-center justify-center py-3 px-1 rounded-lg border-2 text-sm font-bold transition-all",
                      isActive
                        ? cn(config.bg, config.border, config.color, "ring-2 ring-offset-1", config.border.replace("border-", "ring-"))
                        : cn("border-border", config.textColor, "hover:border-current")
                    )}
                  >
                    {config.label}
                  </button>
                );
              })}
            </div>

            <p className="text-xs text-muted-foreground mt-3 text-center">
              {isInCampaign ? "🎉 キャンペーン中！1シフト +50pt" : "1シフト登録で +5pt（休みは0pt）"}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Legend */}
      <div className="flex items-center justify-center gap-3 px-1 text-xs text-muted-foreground">
        {(Object.entries(SHIFT_CONFIG) as [ShiftType, typeof SHIFT_CONFIG["early"]][]).map(([, config]) => (
          <div key={config.label} className="flex items-center gap-1">
            <span className={cn("font-bold", config.textColor)}>{config.label}</span>
          </div>
        ))}
      </div>
    </AppLayout>
  );
};

export default ShiftPage;
