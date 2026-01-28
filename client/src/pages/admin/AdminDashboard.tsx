import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Users, Calendar, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { admin } from "@/lib/api";

export default function AdminDashboard() {
  const { data: users } = useQuery({
    queryKey: ["admin-users"],
    queryFn: admin.getUsers,
  });

  const { data: events } = useQuery({
    queryKey: ["admin-events"],
    queryFn: admin.getEvents,
  });

  const pendingUsers = users?.filter((u) => u.status === "pending") || [];
  const approvedUsers = users?.filter((u) => u.status === "approved") || [];
  const upcomingEvents = events?.filter((e) => e.status === "open" || e.status === "confirmed") || [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Administration</h1>
        <p className="text-gray-600 mt-1">Hantera användare och events.</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="text-yellow-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Väntar på godkännande</p>
              <p className="text-2xl font-bold text-gray-900">{pendingUsers.length}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="text-green-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Aktiva användare</p>
              <p className="text-2xl font-bold text-gray-900">{approvedUsers.length}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-100 rounded-lg">
              <Calendar className="text-primary-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Kommande events</p>
              <p className="text-2xl font-bold text-gray-900">{upcomingEvents.length}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="text-blue-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Totalt användare</p>
              <p className="text-2xl font-bold text-gray-900">{users?.length || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Pending Users Alert */}
      {pendingUsers.length > 0 && (
        <div className="card bg-yellow-50 border-yellow-200">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-yellow-600 mt-0.5" size={20} />
            <div className="flex-1">
              <h3 className="font-medium text-yellow-800">
                {pendingUsers.length} användare väntar på godkännande
              </h3>
              <p className="text-sm text-yellow-700 mt-1">
                Granska och godkänn nya användare så de kan anmäla sig till events.
              </p>
              <Link
                href="/admin/users"
                className="inline-block mt-2 text-sm font-medium text-yellow-800 hover:underline"
              >
                Hantera användare →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Quick Links */}
      <div className="grid md:grid-cols-2 gap-4">
        <Link href="/admin/users" className="card hover:shadow-md transition-shadow">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary-100 rounded-lg">
              <Users className="text-primary-600" size={24} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Hantera användare</h3>
              <p className="text-sm text-gray-500">Godkänn, inaktivera och hantera användare</p>
            </div>
          </div>
        </Link>

        <Link href="/admin/events" className="card hover:shadow-md transition-shadow">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary-100 rounded-lg">
              <Calendar className="text-primary-600" size={24} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Hantera events</h3>
              <p className="text-sm text-gray-500">Skapa events och lotta lag</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Recent Users */}
      {pendingUsers.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Senaste registreringar</h2>
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Namn</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">E-post</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {pendingUsers.slice(0, 5).map((user) => (
                  <tr key={user.id}>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {user.firstName} {user.lastName}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{user.email}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">
                        Väntar
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
