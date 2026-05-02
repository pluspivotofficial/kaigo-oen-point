import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AchievementProvider } from "@/contexts/AchievementContext";
import Dashboard from "./pages/Dashboard";
import ShiftPage from "./pages/ShiftPage";
import ProfilePage from "./pages/ProfilePage";
import PointsPage from "./pages/PointsPage";
import ReferralPage from "./pages/ReferralPage";
import AuthPage from "./pages/AuthPage";
import PrefectureRankingPage from "./pages/PrefectureRankingPage";
import Achievements from "./pages/Achievements";
import ColumnDetailPage from "./pages/ColumnDetailPage";
import QuestionsPage from "./pages/QuestionsPage";
import QuestionDetailPage from "./pages/QuestionDetailPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import AdminUsersPage from "./pages/AdminUsersPage";
import AdminUserDetailPage from "./pages/AdminUserDetailPage";
import AdminLogsPage from "./pages/AdminLogsPage";
import AdminCampaignsPage from "./pages/AdminCampaignsPage";
import AdminColumnsPage from "./pages/AdminColumnsPage";
import AdminQuestionsPage from "./pages/AdminQuestionsPage";
import AdminReferralsPage from "./pages/AdminReferralsPage";
import AdminPointsPage from "./pages/AdminPointsPage";
import AdminNoticesPage from "./pages/AdminNoticesPage";
import ProtectedAdminRoute from "./components/ProtectedAdminRoute";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5分間キャッシュ有効
      gcTime: 10 * 60 * 1000, // 10分間GC保持
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><p className="text-muted-foreground">読み込み中...</p></div>;
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AchievementProvider>
          <Routes>
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/shift" element={<ProtectedRoute><ShiftPage /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
            <Route path="/points" element={<ProtectedRoute><PointsPage /></ProtectedRoute>} />
            <Route path="/referral" element={<ProtectedRoute><ReferralPage /></ProtectedRoute>} />
            <Route path="/ranking" element={<ProtectedRoute><PrefectureRankingPage /></ProtectedRoute>} />
            <Route path="/achievements" element={<ProtectedRoute><Achievements /></ProtectedRoute>} />
            <Route path="/column/:id" element={<ProtectedRoute><ColumnDetailPage /></ProtectedRoute>} />
            <Route path="/questions" element={<ProtectedRoute><QuestionsPage /></ProtectedRoute>} />
            <Route path="/questions/:id" element={<ProtectedRoute><QuestionDetailPage /></ProtectedRoute>} />

            {/* Admin routes - require is_admin=true (defense in depth: ProtectedAdminRoute + per-page check) */}
            <Route path="/admin" element={<ProtectedAdminRoute><AdminDashboardPage /></ProtectedAdminRoute>} />
            <Route path="/admin/users" element={<ProtectedAdminRoute><AdminUsersPage /></ProtectedAdminRoute>} />
            <Route path="/admin/users/:id" element={<ProtectedAdminRoute><AdminUserDetailPage /></ProtectedAdminRoute>} />
            <Route path="/admin/logs" element={<ProtectedAdminRoute><AdminLogsPage /></ProtectedAdminRoute>} />
            <Route path="/admin/campaigns" element={<ProtectedAdminRoute><AdminCampaignsPage /></ProtectedAdminRoute>} />
            <Route path="/admin/columns" element={<ProtectedAdminRoute><AdminColumnsPage /></ProtectedAdminRoute>} />
            <Route path="/admin/questions" element={<ProtectedAdminRoute><AdminQuestionsPage /></ProtectedAdminRoute>} />
            <Route path="/admin/referrals" element={<ProtectedAdminRoute><AdminReferralsPage /></ProtectedAdminRoute>} />
            <Route path="/admin/points" element={<ProtectedAdminRoute><AdminPointsPage /></ProtectedAdminRoute>} />
            <Route path="/admin/notices" element={<ProtectedAdminRoute><AdminNoticesPage /></ProtectedAdminRoute>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
          </AchievementProvider>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
