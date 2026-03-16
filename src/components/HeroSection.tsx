import { Button } from "@/components/ui/button";
import { CalendarDays, MapPin } from "lucide-react";
import heroImage from "@/assets/hero-event.jpg";

const HeroSection = () => {
  return (
    <section className="bg-background">
      <div className="container mx-auto px-6 py-20 lg:py-28">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="flex items-center gap-4 mb-6">
              <span className="inline-flex items-center gap-2 rounded-md bg-accent px-3 py-1 text-sm font-medium text-accent-foreground">
                <CalendarDays className="h-4 w-4" />
                October 15–17, 2026
              </span>
              <span className="inline-flex items-center gap-2 rounded-md bg-accent px-3 py-1 text-sm font-medium text-accent-foreground">
                <MapPin className="h-4 w-4" />
                San Francisco, CA
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-primary leading-tight mb-6">
              The Premier B2B Growth Conference
            </h1>
            <p className="text-lg text-muted-foreground max-w-lg mb-8">
              Join 2,000+ enterprise leaders, founders, and growth experts for three days of actionable insights, deep networking, and cutting-edge strategies.
            </p>
            <div className="flex flex-wrap gap-4">
              <Button variant="cta" size="lg" className="text-base px-8 py-6">
                Register Now
              </Button>
              <Button variant="cta-outline" size="lg" className="text-base px-8 py-6">
                View Agenda
              </Button>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">Early bird pricing ends August 31 — Save 30%</p>
          </div>
          <div className="hidden lg:block">
            <img
              src={heroImage}
              alt="B2B conference keynote with professional audience"
              className="rounded-lg shadow-2xl object-cover w-full h-[480px]"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
