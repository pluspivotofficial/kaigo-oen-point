import { useState, useMemo } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Sun, Sunset, Moon, Check, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import AppLayout from "@/components/AppLayout";

type ShiftType = "early" | "late" | "night";

const SHIFT_DEFAULTS: Record<ShiftType, { label: string; startTime: string; endTime: string; icon: React.ElementType }> = {
  early: { label: "早番", startTime: "07:00", endTime: "16:00", icon: Sun },
  late: { label: "遅番", startTime: "10:00", endTime: "19:00", icon: Sunset },
  night: { label: "夜勤", startTime: "16:30", endTime: "09:30", icon: Moon },
};

function calcHours(start: string, end: string, isNight: boolean): number {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  let diff = (eh * 60 + em) - (sh * 60 + sm);
  if (diff <= 0 || isNight) diff += 24 * 60; // overnight
  return Math.max(1, Math.round(diff / 60));
}

interface ShiftEntry {
  date: Date;
  type: ShiftType;
  startTime: string;
  endTime: string;
  hours: number;
}

const ShiftPage = () => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedShift, setSelectedShift] = useState<ShiftType | null>(null);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [submittedShifts, setSubmittedShifts] = useState<ShiftEntry[]>([]);

  const handleSelectShift = (type: ShiftType) => {
    setSelectedShift(type);
    const defaults = SHIFT_DEFAULTS[type];
    setStartTime(defaults.startTime);
    setEndTime(defaults.endTime);
  };

  const hours = useMemo(() => {
    if (!startTime || !endTime || !selectedShift) return 0;
    return calcHours(startTime, endTime, selectedShift === "night");
  }, [startTime, endTime, selectedShift]);

  const handleSubmit = () => {
    if (!selectedDate || !selectedShift) {
      toast({ title: "日付とシフトタイプを選択してください", variant: "destructive" });
      return;
    }

    const alreadyExists = submittedShifts.some(
      (s) => s.date.toDateString() === selectedDate.toDateString()
    );

    if (alreadyExists) {
      toast({ title: "この日はすでにシフトが登録されています", variant: "destructive" });
      return;
    }

    const defaults = SHIFT_DEFAULTS[selectedShift];
    setSubmittedShifts((prev) => [
      ...prev,
      { date: selectedDate, type: selectedShift, startTime, endTime, hours },
    ]);

    toast({
      title: "シフトを申請しました！",
      description: `${selectedDate.toLocaleDateString("ja-JP")} ${defaults.label} ${startTime}〜${endTime}（${hours}ポイント獲得予定）`,
    });

    setSelectedDate(undefined);
    setSelectedShift(null);
    setStartTime("");
    setEndTime("");
  };

  const shiftDates = submittedShifts.map((s) => s.date);

  return (
    <AppLayout title="シフト申請">
      {/* Calendar */}
      <Card className="mb-5">
        <CardContent className="p-3">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            className="pointer-events-auto"
            modifiers={{ booked: shiftDates }}
            modifiersClassNames={{ booked: "bg-primary/20 text-primary font-bold rounded-full" }}
            disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
          />
        </CardContent>
      </Card>

      {/* Shift Type Selection */}
      {selectedDate && (
        <Card className="mb-5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {selectedDate.toLocaleDateString("ja-JP", { month: "long", day: "numeric", weekday: "short" })} のシフト
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(Object.entries(SHIFT_DEFAULTS) as [ShiftType, typeof SHIFT_DEFAULTS["early"]][]).map(([value, option]) => (
              <button
                key={value}
                onClick={() => handleSelectShift(value)}
                className={cn(
                  "w-full flex items-center gap-4 p-4 rounded-lg border-2 transition-all",
                  selectedShift === value
                    ? "border-primary bg-accent"
                    : "border-border hover:border-primary/30"
                )}
              >
                <div className={cn(
                  "h-10 w-10 rounded-lg flex items-center justify-center",
                  value === "early" && "bg-accent text-accent-foreground",
                  value === "late" && "bg-primary/10 text-primary",
                  value === "night" && "bg-reward-purple/10 text-reward-purple",
                )}>
                  <option.icon className="h-5 w-5" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-sm">{option.label}</p>
                  <p className="text-xs text-muted-foreground">{option.startTime} 〜 {option.endTime}</p>
                </div>
                {selectedShift === value && (
                  <Check className="h-5 w-5 text-primary" />
                )}
              </button>
            ))}

            {/* Time Editor */}
            {selectedShift && (
              <div className="mt-4 p-4 rounded-lg bg-muted/50 border border-border space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Pencil className="h-4 w-4 text-muted-foreground" />
                  時間を編集
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="startTime" className="text-xs">開始時間</Label>
                    <Input
                      id="startTime"
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="endTime" className="text-xs">終了時間</Label>
                    <Input
                      id="endTime"
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">勤務時間</span>
                  <Badge variant="secondary" className="text-xs font-mono">
                    {hours}時間 → +{hours} pt
                  </Badge>
                </div>
              </div>
            )}

            <Button onClick={handleSubmit} className="w-full mt-4" size="lg">
              シフトを申請する
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Submitted Shifts */}
      {submittedShifts.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">申請済みシフト</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {submittedShifts
              .sort((a, b) => a.date.getTime() - b.date.getTime())
              .map((shift, i) => {
                const option = SHIFT_DEFAULTS[shift.type];
                return (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted">
                    <div className="flex items-center gap-3">
                      <option.icon className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <span className="text-sm font-medium">
                          {shift.date.toLocaleDateString("ja-JP", { month: "short", day: "numeric", weekday: "short" })}
                        </span>
                        <p className="text-xs text-muted-foreground">{shift.startTime}〜{shift.endTime}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">{option.label}</Badge>
                      <span className="text-xs text-muted-foreground">+{shift.hours}pt</span>
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
