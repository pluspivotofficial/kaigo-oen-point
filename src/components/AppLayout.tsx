import BottomNav from "./BottomNav";

const AppLayout = ({ children, title }: { children: React.ReactNode; title: string }) => {
  return (
    <div className="min-h-screen bg-background max-w-2xl mx-auto relative">
      <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-lg border-b border-border px-5 py-4">
        <h1 className="text-lg font-bold text-foreground">{title}</h1>
      </header>
      <main className="px-5 py-4 pb-24">
        {children}
      </main>
      <BottomNav />
    </div>
  );
};

export default AppLayout;
