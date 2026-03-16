const companies = [
  "Salesforce", "HubSpot", "Stripe", "Snowflake", "Datadog", "Figma", "Notion", "Airtable"
];

const TrustedBySection = () => {
  return (
    <section className="bg-background py-16 border-y border-border">
      <div className="container mx-auto px-6">
        <p className="text-center text-sm font-medium text-muted-foreground uppercase tracking-wider mb-8">
          Trusted by teams at
        </p>
        <div className="flex flex-wrap justify-center items-center gap-x-12 gap-y-6">
          {companies.map((company) => (
            <span key={company} className="text-xl font-bold text-muted-foreground/40 select-none">
              {company}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TrustedBySection;
