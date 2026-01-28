import { Route, Switch, Redirect } from "wouter";
import { useUser } from "@/hooks/useUser";
import Layout from "@/components/Layout";
import Welcome from "@/pages/Welcome";
import Dashboard from "@/pages/Dashboard";
import MyMatches from "@/pages/MyMatches";
import Statistics from "@/pages/Statistics";
import LiveScoreboard from "@/pages/LiveScoreboard";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import ManageEvents from "@/pages/admin/ManageEvents";
import EventQRCode from "@/pages/admin/EventQRCode";

function RequireName({ children }: { children: React.ReactNode }) {
  const { name } = useUser();

  if (!name) {
    return <Redirect to="/welcome" />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <Switch>
      {/* Public routes */}
      <Route path="/live/:eventId">
        <LiveScoreboard />
      </Route>
      <Route path="/welcome">
        <Welcome />
      </Route>

      {/* App routes (require name) */}
      <Route path="/">
        <RequireName>
          <Layout>
            <Dashboard />
          </Layout>
        </RequireName>
      </Route>
      <Route path="/matches">
        <RequireName>
          <Layout>
            <MyMatches />
          </Layout>
        </RequireName>
      </Route>
      <Route path="/statistics">
        <RequireName>
          <Layout>
            <Statistics />
          </Layout>
        </RequireName>
      </Route>

      {/* Admin routes (open for everyone for now) */}
      <Route path="/admin">
        <RequireName>
          <Layout>
            <AdminDashboard />
          </Layout>
        </RequireName>
      </Route>
      <Route path="/admin/events">
        <RequireName>
          <Layout>
            <ManageEvents />
          </Layout>
        </RequireName>
      </Route>
      <Route path="/admin/events/:eventId/qr">
        <RequireName>
          <Layout>
            <EventQRCode />
          </Layout>
        </RequireName>
      </Route>

      <Route>
        <Redirect to="/" />
      </Route>
    </Switch>
  );
}
