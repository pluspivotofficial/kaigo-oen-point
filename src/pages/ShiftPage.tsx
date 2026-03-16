import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Sun, Sunset, Moon, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import AppLayout from "@/components/AppLayout";

type ShiftType = "early" | "late" | "night";

const SHIFT_OPTIONS: { value: ShiftType; label: string; time: string; hours: number; icon: React.ElementType }[] = [
  { value: "early", label: "早番", time: "7:00 ~ 16:00", hours: 8, icon: Sun },
  { value: "late", label: "遅番", time: "10:00 ~ 19:00", hours: 8, icon: Sunset },
  { value: "night", label: "夜勤", time: "16:30 ~ 翌9:30", hours: 16, icon: Moon },
];

interface ShiftEntry {
  date: Date;
  type: ShiftType;
}

const ShiftPage = () => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedShift, setSelectedShift] = useState<ShiftType | null>(null);
  const [submittedShifts, setSubmittedShifts] = useState<ShiftEntry[]>([]);

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

    const shiftOption = SHIFT_OPTIONS.find((o) => o.value === selectedShift)!;
    setSubmittedShifts((prev) => [...prev, { date: selectedDate, type: selectedShift }]);

    toast({
      title: "シフトを申請しました！",
      description: `${selectedDate.toLocaleDateString("ja-JP")} ${shiftOption.label}（${shiftOption.hours}ポイント獲得予定）`,
    });

    setSelectedDate(undefined);
    setSelectedShift(null);
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
            {SHIFT_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setSelectedShift(option.value)}
                className={cn(
                  "w-full flex items-center gap-4 p-4 rounded-lg border-2 transition-all",
                  selectedShift === option.value
                    ? "border-primary bg-accent"
                    : "border-border hover:border-primary/30"
                )}
              >
                <div className={cn(
                  "h-10 w-10 rounded-lg flex items-center justify-center",
                  option.value === "early" && "bg-accent text-accent-foreground",
                  option.value === "late" && "bg-primary/10 text-primary",
                  option.value === "night" && "bg-reward-purple/10 text-reward-purple",
                )}>
                  <option.icon className="h-5 w-5" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-sm">{option.label}</p>
                  <p className="text-xs text-muted-foreground">{option.time}</p>
                </div>
                <Badge variant="secondary" className="text-xs">
                  +{option.hours} pt
                </Badge>
                {selectedShift === option.value && (
                  <Check className="h-5 w-5 text-primary" />
                )}
              </button>
            ))}

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
                const option = SHIFT_OPTIONS.find((o) => o.value === shift.type)!;
                return (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted">
                    <div className="flex items-center gap-3">
                      <option.icon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        {shift.date.toLocaleDateString("ja-JP", { month: "short", day: "numeric", weekday: "short" })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">{option.label}</Badge>
                      <span className="text-xs text-muted-foreground">+{option.hours}pt</span>
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
