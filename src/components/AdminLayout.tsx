import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Activity,
  FileText,
  Megaphone,
  MessageCircleQuestion,
  Coins,
  Share2,
  Sparkles,
  Mail,
  LogOut,
  Menu,
} from "lucide-react";

type NavItem = {
  path: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
};

type NavGroup = {
  label?: string;
  items: NavItem[];
};

const navGroups: NavGroup[] = [
  {
    items: [
      { path: "/admin", label: "ダッシュボード", icon: LayoutDashboard, exact: true },
    ],
  },
  {
    label: "ユーザー管理",
    items: [
      { path: "/admin/users", label: "ユーザー一覧", icon: Users },
      { path: "/admin/logs", label: "操作ログ", icon: Activity },
    ],
  },
  {
    label: "コンテンツ",
    items: [
      { path: "/admin/columns", label: "コラム", icon: FileText },
      { path: "/admin/notices", label: "お知らせ", icon: Megaphone },
      { path: "/admin/questions", label: "Q&A", icon: MessageCircleQuestion },
    ],
  },
  {
    label: "運用",
    items: [
      { path: "/admin/points", label: "ポイント", icon: Coins },
      { path: "/admin/referrals", label: "紹介", icon: Share2 },
      { path: "/admin/campaigns", label: "キャンペーン", icon: Sparkles },
      { path: "/admin/email-campaigns", label: "メール配信", icon: Mail },
    ],
  },
];

const SidebarNav = ({ onNavigate }: { onNavigate?: () => void }) => {
  const location = useLocation();
  const isActive = (path: string, exact?: boolean) =>
    exact
      ? location.pathname === path
      : location.pathname === path || location.pathname.startsWith(path + "/");

  return (
    <nav className="flex-1 overflow-y-auto py-4">
      {navGroups.map((group, gi) => (
        <div key={gi} className="mb-4">
          {group.label && (
            <p className="px-4 mb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {group.label}
            </p>
          )}
          <ul>
            {group.items.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path, item.exact);
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    onClick={onNavigate}
                    className={cn(
                      "flex items-center gap-3 px-4 py-2 text-sm transition-colors border-l-2",
                      active
                        ? "bg-primary/10 text-primary font-medium border-primary"
                        : "text-foreground/80 hover:bg-muted hover:text-foreground border-transparent"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
};

const AdminLayout = ({ children, title }: { children: React.ReactNode; title?: string }) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <div className="font-sans min-h-screen bg-background flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-border bg-card">
        <div className="px-6 py-5 border-b border-border">
          <h2 className="text-base font-bold text-foreground">管理画面</h2>
          <p className="text-xs text-muted-foreground mt-0.5">介護職応援ポイント</p>
        </div>
        <SidebarNav />
      </aside>

      {/* Main column */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-lg border-b border-border px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0 flex flex-col">
                <div className="px-6 py-5 border-b border-border">
                  <h2 className="text-base font-bold text-foreground">管理画面</h2>
                </div>
                <SidebarNav onNavigate={() => setMobileOpen(false)} />
              </SheetContent>
            </Sheet>
            {title && <h1 className="text-lg font-bold text-foreground">{title}</h1>}
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-sm text-muted-foreground truncate max-w-[200px]">
              {user?.email}
            </span>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-1" />
              ログアウト
            </Button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto px-5 py-4">{children}</main>
      </div>
    </div>
  );
};

export default AdminLayout;
