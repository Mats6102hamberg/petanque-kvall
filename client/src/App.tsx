import { useEffect } from "react";
import { Route, Switch, Redirect } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import Layout from "@/components/Layout";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Dashboard from "@/pages/Dashboard";
import MyMatches from "@/pages/MyMatches";
import Statistics from "@/pages/Statistics";
import LiveScoreboard from "@/pages/LiveScoreboard";
import CheckIn from "@/pages/CheckIn";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import ManageUsers from "@/pages/admin/ManageUsers";
import ManageEvents from "@/pages/admin/ManageEvents";
import EventQRCode from "@/pages/admin/EventQRCode";

function ProtectedRoute({
  children,
  adminOnly = false,
}: {
  children: React.ReactNode;
  adminOnly?: boolean;
}) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  if (adminOnly && !user.isAdmin) {
    return <Redirect to="/" />;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (user) {
    return <Redirect to="/" />;
  }

  return <>{children}</>;
}

export default function App() {
  const { checkAuth } = useAuth();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <Switch>
      {/* Public routes (no auth required) */}
      <Route path="/live/:eventId">
        <LiveScoreboard />
      </Route>
      <Route path="/checkin/:eventId">
        <CheckIn />
      </Route>
      <Route path="/login">
        <PublicRoute>
          <Login />
        </PublicRoute>
      </Route>
      <Route path="/register">
        <PublicRoute>
          <Register />
        </PublicRoute>
      </Route>
      <Route path="/">
        <ProtectedRoute>
          <Layout>
            <Dashboard />
          </Layout>
        </ProtectedRoute>
      </Route>
      <Route path="/matches">
        <ProtectedRoute>
          <Layout>
            <MyMatches />
          </Layout>
        </ProtectedRoute>
      </Route>
      <Route path="/statistics">
        <ProtectedRoute>
          <Layout>
            <Statistics />
          </Layout>
        </ProtectedRoute>
      </Route>
      <Route path="/admin">
        <ProtectedRoute adminOnly>
          <Layout>
            <AdminDashboard />
          </Layout>
        </ProtectedRoute>
      </Route>
      <Route path="/admin/users">
        <ProtectedRoute adminOnly>
          <Layout>
            <ManageUsers />
          </Layout>
        </ProtectedRoute>
      </Route>
      <Route path="/admin/events">
        <ProtectedRoute adminOnly>
          <Layout>
            <ManageEvents />
          </Layout>
        </ProtectedRoute>
      </Route>
      <Route path="/admin/events/:eventId/qr">
        <ProtectedRoute adminOnly>
          <Layout>
            <EventQRCode />
          </Layout>
        </ProtectedRoute>
      </Route>
      <Route>
        <Redirect to="/" />
      </Route>
    </Switch>
  );
}
