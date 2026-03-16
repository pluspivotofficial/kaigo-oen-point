import { useState } from "react";

const days = [
  {
    label: "Day 1 — Oct 15",
    sessions: [
      { time: "9:00 AM", title: "Registration & Networking Breakfast", type: "Networking" },
      { time: "10:00 AM", title: "Opening Keynote: The State of B2B in 2026", type: "Keynote" },
      { time: "11:30 AM", title: "Panel: Scaling Enterprise Sales Teams", type: "Panel" },
      { time: "1:00 PM", title: "Lunch & Expo Hall", type: "Break" },
      { time: "2:30 PM", title: "Workshop: Building Your ICP Framework", type: "Workshop" },
      { time: "4:30 PM", title: "Fireside Chat: From Startup to IPO", type: "Fireside" },
      { time: "6:00 PM", title: "Welcome Reception", type: "Networking" },
    ],
  },
  {
    label: "Day 2 — Oct 16",
    sessions: [
      { time: "9:00 AM", title: "Breakfast Roundtables by Track", type: "Networking" },
      { time: "10:00 AM", title: "Keynote: AI-First GTM Strategies", type: "Keynote" },
      { time: "11:30 AM", title: "Breakout: PLG for Enterprise Products", type: "Breakout" },
      { time: "1:00 PM", title: "Lunch & 1:1 Matchmaking Sessions", type: "Networking" },
      { time: "2:30 PM", title: "Workshop: Revenue Operations Masterclass", type: "Workshop" },
      { time: "4:30 PM", title: "Panel: Customer Success as a Growth Lever", type: "Panel" },
      { time: "7:00 PM", title: "VIP Dinner (Invite Only)", type: "Networking" },
    ],
  },
  {
    label: "Day 3 — Oct 17",
    sessions: [
      { time: "9:00 AM", title: "Networking Breakfast", type: "Networking" },
      { time: "10:00 AM", title: "Keynote: The Future of B2B Partnerships", type: "Keynote" },
      { time: "11:30 AM", title: "Closing Panel: Predictions for 2027", type: "Panel" },
      { time: "12:30 PM", title: "Closing Remarks & Farewell Lunch", type: "Break" },
    ],
  },
];

const typeColors: Record<string, string> = {
  Keynote: "bg-secondary/10 text-secondary",
  Panel: "bg-primary/10 text-primary",
  Workshop: "bg-green-100 text-green-800",
  Networking: "bg-amber-100 text-amber-800",
  Break: "bg-muted text-muted-foreground",
  Fireside: "bg-orange-100 text-orange-800",
  Breakout: "bg-purple-100 text-purple-800",
};

const AgendaSection = () => {
  const [activeDay, setActiveDay] = useState(0);

  return (
    <section className="bg-accent py-20">
      <div className="container mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-primary mb-4">Agenda</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Three days packed with keynotes, workshops, and high-value networking.
          </p>
        </div>

        <div className="flex justify-center gap-2 mb-10">
          {days.map((day, index) => (
            <button
              key={day.label}
              onClick={() => setActiveDay(index)}
              className={`px-5 py-2.5 rounded-md text-sm font-semibold transition-all duration-200 ${
                activeDay === index
                  ? "bg-secondary text-secondary-foreground shadow-sm"
                  : "bg-background text-muted-foreground hover:bg-background/80 border border-border"
              }`}
            >
              {day.label}
            </button>
          ))}
        </div>

        <div className="max-w-3xl mx-auto space-y-3">
          {days[activeDay].sessions.map((session, i) => (
            <div
              key={i}
              className="flex items-center gap-4 bg-background rounded-lg p-4 border border-border transition-shadow duration-200 hover:shadow-sm"
            >
              <span className="text-sm font-medium text-muted-foreground w-20 shrink-0">{session.time}</span>
              <div className="flex-1">
                <p className="font-medium text-primary">{session.title}</p>
              </div>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full shrink-0 ${typeColors[session.type] || ""}`}>
                {session.type}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default AgendaSection;
