const speakers = [
  {
    name: "Sarah Chen",
    role: "CEO",
    company: "ScaleForce",
    topic: "Building a $500M ARR Enterprise Engine",
    initials: "SC",
  },
  {
    name: "Marcus Johnson",
    role: "VP of Growth",
    company: "DataPipe",
    topic: "PLG Meets Enterprise: A Hybrid Playbook",
    initials: "MJ",
  },
  {
    name: "Elena Rodriguez",
    role: "CRO",
    company: "CloudSync",
    topic: "From 0 to 10,000 Customers in 18 Months",
    initials: "ER",
  },
  {
    name: "David Kim",
    role: "Founder & CTO",
    company: "NexusAI",
    topic: "AI-Powered Sales: What Actually Works",
    initials: "DK",
  },
  {
    name: "Rachel Nguyen",
    role: "CMO",
    company: "Elevate",
    topic: "ABM at Scale: Lessons from the Trenches",
    initials: "RN",
  },
  {
    name: "James Porter",
    role: "Managing Partner",
    company: "Vertex Capital",
    topic: "What VCs Look For in B2B SaaS in 2026",
    initials: "JP",
  },
];

const SpeakersSection = () => {
  return (
    <section className="bg-background py-20">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-primary mb-4">Featured Speakers</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Learn from operators who've been in the trenches and built world-class B2B companies.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {speakers.map((speaker) => (
            <div
              key={speaker.name}
              className="group border border-border rounded-lg p-6 transition-all duration-200 hover:shadow-md hover:border-secondary/30"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg">
                  {speaker.initials}
                </div>
                <div>
                  <h3 className="font-semibold text-primary">{speaker.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {speaker.role}, {speaker.company}
                  </p>
                </div>
              </div>
              <p className="text-sm text-foreground font-medium">"{speaker.topic}"</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SpeakersSection;
