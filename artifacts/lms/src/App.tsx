import { Switch, Route, Router as WouterRouter, Redirect, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import { ThemeProvider } from "@/lib/theme";
import LoginPage from "@/pages/login";
import SignupPage from "@/pages/signup";
import DashboardPage from "@/pages/dashboard";
import CoursesPage from "@/pages/courses";
import CourseDetailPage from "@/pages/course-detail";
import CommunityPage from "@/pages/community";
import VipPostsPage from "@/pages/vip-posts";
import ProfilePage from "@/pages/profile";
import AdminPage from "@/pages/admin";
import UserProfilePage from "@/pages/user-profile";
import MessagesPage from "@/pages/messages";
import ResetPasswordPage from "@/pages/reset-password";
import WaitingApprovalPage from "@/pages/waiting-approval";
import MaintenancePage from "@/pages/maintenance";
import AiToolsPage from "@/pages/ai-tools";
import PostDetailPage from "@/pages/post-detail";
import ToolDetailPage from "@/pages/tool-detail";
import NotFound from "@/pages/not-found";
import LandingPage from "@/pages/landing";
import { WhatsAppButton } from "@/components/whatsapp-button";
import { useEffect, useRef } from "react";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30 * 1000,
    },
  },
});

type MaintenanceData = {
  isActive: boolean;
  startTime: string | null;
  endTime: string | null;
  description: string | null;
};

function MaintenanceGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const [location, setLocation] = useLocation();
  const checkedRef = useRef(false);

  useEffect(() => {
    // Don't check if already on maintenance page, or auth is loading, or user is admin
    if (location === "/maintenance" || isLoading) return;
    if (user?.role === "admin") return;
    if (checkedRef.current) return;
    checkedRef.current = true;

    fetch("/api/maintenance")
      .then(r => r.json())
      .then((data: MaintenanceData) => {
        if (!data.isActive) return;
        const now = new Date();
        const start = data.startTime ? new Date(data.startTime) : null;
        const end = data.endTime ? new Date(data.endTime) : null;
        const inWindow =
          (!start || now >= start) &&
          (!end || now <= end);
        if (inWindow) {
          setLocation("/maintenance");
        }
      })
      .catch(() => {});
  }, [location, user, isLoading, setLocation]);

  // Reset check flag on route change so new pages also get checked
  useEffect(() => {
    checkedRef.current = false;
  }, [location]);

  return <>{children}</>;
}

function ProtectedRoute({ component: Component, adminOnly = false }: {
  component: React.ComponentType;
  adminOnly?: boolean;
}) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  const isApproved = (user as Record<string, unknown>).isApproved === true;
  const isAdmin = user.role === "admin";
  if (!isApproved && !isAdmin) {
    return <Redirect to="/waiting-approval" />;
  }

  if (adminOnly && user.role !== "admin") {
    return <Redirect to="/dashboard" />;
  }

  return <Component />;
}

function PublicRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();

  if (isLoading) return null;
  if (user) return <Redirect to="/dashboard" />;
  return <Component />;
}

function Router() {
  return (
    <MaintenanceGuard>
      <Switch>
        <Route path="/">
          <PublicRoute component={LandingPage} />
        </Route>
        <Route path="/login">
          <PublicRoute component={LoginPage} />
        </Route>
        <Route path="/signup">
          <PublicRoute component={SignupPage} />
        </Route>
        <Route path="/reset-password" component={ResetPasswordPage} />
        <Route path="/waiting-approval" component={WaitingApprovalPage} />
        <Route path="/maintenance" component={MaintenancePage} />
        <Route path="/dashboard">
          <ProtectedRoute component={DashboardPage} />
        </Route>
        <Route path="/courses">
          <ProtectedRoute component={CoursesPage} />
        </Route>
        <Route path="/ai-tools">
          <ProtectedRoute component={AiToolsPage} />
        </Route>
        <Route path="/courses/:id">
          <ProtectedRoute component={CourseDetailPage} />
        </Route>
        <Route path="/vip-posts">
          <ProtectedRoute component={VipPostsPage} />
        </Route>
        <Route path="/community">
          <ProtectedRoute component={CommunityPage} />
        </Route>
        <Route path="/profile">
          <ProtectedRoute component={ProfilePage} />
        </Route>
        <Route path="/admin">
          <ProtectedRoute component={AdminPage} adminOnly />
        </Route>
        <Route path="/users/:id">
          <ProtectedRoute component={UserProfilePage} />
        </Route>
        <Route path="/profile/:id">
          <ProtectedRoute component={UserProfilePage} />
        </Route>
        <Route path="/messages/:userId">
          <ProtectedRoute component={MessagesPage} />
        </Route>
        <Route path="/messages">
          <ProtectedRoute component={MessagesPage} />
        </Route>
        <Route path="/post/:id">
          <ProtectedRoute component={PostDetailPage} />
        </Route>
        <Route path="/tool/:id">
          <ProtectedRoute component={ToolDetailPage} />
        </Route>
        <Route component={NotFound} />
      </Switch>
    </MaintenanceGuard>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <TooltipProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Router />
            </WouterRouter>
            <Toaster />
            <WhatsAppButton />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
