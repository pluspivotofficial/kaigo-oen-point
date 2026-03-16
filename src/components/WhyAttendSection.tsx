import { Users, Lightbulb, TrendingUp, Handshake } from "lucide-react";

const benefits = [
  {
    icon: Lightbulb,
    title: "Actionable Insights",
    description: "Learn proven frameworks from leaders who've scaled companies from $1M to $1B+ ARR.",
  },
  {
    icon: Users,
    title: "Curated Networking",
    description: "Connect with 2,000+ decision-makers through structured roundtables and 1:1 matchmaking.",
  },
  {
    icon: TrendingUp,
    title: "Growth Strategies",
    description: "Discover the latest in PLG, ABM, and enterprise sales motions that drive pipeline.",
  },
  {
    icon: Handshake,
    title: "Partnership Deals",
    description: "Our attendees close an average of 3 new partnerships within 90 days post-event.",
  },
];

const WhyAttendSection = () => {
  return (
    <section className="bg-accent py-20">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-primary mb-4">Why Attend</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            This isn't just another conference. It's where enterprise deals get done.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {benefits.map((benefit) => (
            <div key={benefit.title} className="bg-background rounded-lg p-6 shadow-sm border border-border transition-shadow duration-200 hover:shadow-md">
              <div className="w-12 h-12 rounded-lg bg-secondary/10 flex items-center justify-center mb-4">
                <benefit.icon className="h-6 w-6 text-secondary" />
              </div>
              <h3 className="text-lg font-semibold text-primary mb-2">{benefit.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{benefit.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhyAttendSection;
