const Footer = () => {
  return (
    <footer className="bg-primary py-12">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            <span className="text-xl font-extrabold text-primary-foreground">B2B Summit</span>
            <span className="text-xs text-primary-foreground/50 ml-2">2026</span>
          </div>
          <div className="flex gap-8">
            <a href="#" className="text-sm text-primary-foreground/60 hover:text-primary-foreground transition-colors duration-200">Privacy Policy</a>
            <a href="#" className="text-sm text-primary-foreground/60 hover:text-primary-foreground transition-colors duration-200">Terms</a>
            <a href="#" className="text-sm text-primary-foreground/60 hover:text-primary-foreground transition-colors duration-200">Contact</a>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t border-primary-foreground/10 text-center">
          <p className="text-sm text-primary-foreground/40">© 2026 B2B Summit. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
