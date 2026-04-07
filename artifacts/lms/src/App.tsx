import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
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
import NotFound from "@/pages/not-found";
import { WhatsAppButton } from "@/components/whatsapp-button";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30 * 1000,
    },
  },
});

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
    <Switch>
      <Route path="/">
        <Redirect to="/dashboard" />
      </Route>
      <Route path="/login">
        <PublicRoute component={LoginPage} />
      </Route>
      <Route path="/signup">
        <PublicRoute component={SignupPage} />
      </Route>
      <Route path="/dashboard">
        <ProtectedRoute component={DashboardPage} />
      </Route>
      <Route path="/courses">
        <ProtectedRoute component={CoursesPage} />
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
      <Route component={NotFound} />
    </Switch>
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
