import { Button } from "@/components/ui/button";

const Navbar = () => {
  return (
    <nav className="bg-background border-b border-border sticky top-0 z-50">
      <div className="container mx-auto px-6 flex items-center justify-between h-16">
        <div className="flex items-center gap-2">
          <span className="text-xl font-extrabold tracking-tight text-primary">B2B</span>
          <span className="text-xl font-extrabold tracking-tight text-secondary">Summit</span>
          <span className="text-xs font-semibold text-muted-foreground ml-2">2026</span>
        </div>
        <div className="hidden md:flex items-center gap-8">
          <a href="#speakers" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors duration-200">Speakers</a>
          <a href="#agenda" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors duration-200">Agenda</a>
          <a href="#why" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors duration-200">Why Attend</a>
          <Button variant="cta" size="sm">Register Now</Button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
