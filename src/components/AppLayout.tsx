import BottomNav from "./BottomNav";
import AppFooter from "./AppFooter";
import { AppTutorial } from "./AppTutorial";

interface AppLayoutProps {
  children: React.ReactNode;
  title: React.ReactNode;
  /** 背景クラス上書き (例: "bg-gradient-sakura-bg")。デフォルトは bg-background */
  bgClassName?: string;
}

const AppLayout = ({ children, title, bgClassName = "bg-background" }: AppLayoutProps) => {
  return (
    <div className={`font-body min-h-screen ${bgClassName} max-w-2xl mx-auto relative`}>
      <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-lg border-b border-border px-5 py-4">
        <h1 className="text-lg font-bold text-foreground">{title}</h1>
      </header>
      <main className="px-5 py-4 pb-24">
        {children}
        <AppFooter />
      </main>
      <BottomNav />
      <AppTutorial />
    </div>
  );
};

export default AppLayout;
