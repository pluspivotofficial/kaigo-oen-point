import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Dashboard from "./pages/Dashboard";
import ShiftPage from "./pages/ShiftPage";
import ProfilePage from "./pages/ProfilePage";
import PointsPage from "./pages/PointsPage";
import ReferralPage from "./pages/ReferralPage";
import AuthPage from "./pages/AuthPage";
import PrefectureRankingPage from "./pages/PrefectureRankingPage";
import AdminColumnsPage from "./pages/AdminColumnsPage";
import ColumnDetailPage from "./pages/ColumnDetailPage";
import QuestionsPage from "./pages/QuestionsPage";
import QuestionDetailPage from "./pages/QuestionDetailPage";
import AdminQuestionsPage from "./pages/AdminQuestionsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

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
          <Routes>
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/shift" element={<ProtectedRoute><ShiftPage /></ProtectedRoute>} />
            <Route path="/points" element={<ProtectedRoute><PointsPage /></ProtectedRoute>} />
            <Route path="/referral" element={<ProtectedRoute><ReferralPage /></ProtectedRoute>} />
            <Route path="/ranking" element={<ProtectedRoute><PrefectureRankingPage /></ProtectedRoute>} />
            <Route path="/column/:id" element={<ProtectedRoute><ColumnDetailPage /></ProtectedRoute>} />
            <Route path="/questions" element={<ProtectedRoute><QuestionsPage /></ProtectedRoute>} />
            <Route path="/questions/:id" element={<ProtectedRoute><QuestionDetailPage /></ProtectedRoute>} />
            <Route path="/admin/columns" element={<ProtectedRoute><AdminColumnsPage /></ProtectedRoute>} />
            <Route path="/admin/questions" element={<ProtectedRoute><AdminQuestionsPage /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
