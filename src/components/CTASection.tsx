import { Button } from "@/components/ui/button";

const CTASection = () => {
  return (
    <section className="bg-primary py-20">
      <div className="container mx-auto px-6 text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
          Secure Your Spot
        </h2>
        <p className="text-primary-foreground/70 text-lg max-w-xl mx-auto mb-8">
          Join 2,000+ B2B leaders in San Francisco this October. Early bird pricing ends August 31.
        </p>
        <div className="flex justify-center gap-4">
          <Button variant="cta" size="lg" className="text-base px-8 py-6">
            Register Now — $499
          </Button>
        </div>
        <p className="text-primary-foreground/50 text-sm mt-4">Regular price $799 · Group discounts available</p>
      </div>
    </section>
  );
};

export default CTASection;
