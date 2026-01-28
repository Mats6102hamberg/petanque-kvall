import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, XCircle, Clock, Shield } from "lucide-react";
import { admin } from "@/lib/api";

export default function ManageUsers() {
  const queryClient = useQueryClient();

  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: admin.getUsers,
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ userId, status }: { userId: string; status: string }) =>
      admin.updateUserStatus(userId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleDateString("sv-SE", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const pendingUsers = users?.filter((u) => u.status === "pending") || [];
  const approvedUsers = users?.filter((u) => u.status === "approved") || [];
  const inactiveUsers = users?.filter((u) => u.status === "inactive") || [];

  const UserRow = ({ user }: { user: typeof users extends (infer U)[] | undefined ? U : never }) => (
    <tr>
      <td className="px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
            <span className="text-primary-700 font-medium">
              {user.firstName?.[0]}
              {user.lastName?.[0]}
            </span>
          </div>
          <div>
            <p className="font-medium text-gray-900">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-sm text-gray-500">{user.email}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-4">
        <span
          className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded ${
            user.status === "approved"
              ? "bg-green-100 text-green-800"
              : user.status === "pending"
              ? "bg-yellow-100 text-yellow-800"
              : "bg-gray-100 text-gray-800"
          }`}
        >
          {user.status === "approved" ? (
            <CheckCircle size={12} />
          ) : user.status === "pending" ? (
            <Clock size={12} />
          ) : (
            <XCircle size={12} />
          )}
          {user.status === "approved"
            ? "Godkänd"
            : user.status === "pending"
            ? "Väntar"
            : "Inaktiv"}
        </span>
        {user.isAdmin && (
          <span className="ml-2 inline-flex items-center gap-1 px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded">
            <Shield size={12} />
            Admin
          </span>
        )}
      </td>
      <td className="px-4 py-4 text-sm text-gray-500">
        {formatDate(user.createdAt as string)}
      </td>
      <td className="px-4 py-4">
        <div className="flex gap-2">
          {user.status !== "approved" && (
            <button
              onClick={() =>
                updateStatusMutation.mutate({ userId: user.id, status: "approved" })
              }
              disabled={updateStatusMutation.isPending}
              className="px-3 py-1 text-sm bg-green-100 text-green-700 hover:bg-green-200 rounded transition-colors"
            >
              Godkänn
            </button>
          )}
          {user.status !== "inactive" && !user.isAdmin && (
            <button
              onClick={() =>
                updateStatusMutation.mutate({ userId: user.id, status: "inactive" })
              }
              disabled={updateStatusMutation.isPending}
              className="px-3 py-1 text-sm bg-red-100 text-red-700 hover:bg-red-200 rounded transition-colors"
            >
              Inaktivera
            </button>
          )}
          {user.status === "inactive" && (
            <button
              onClick={() =>
                updateStatusMutation.mutate({ userId: user.id, status: "pending" })
              }
              disabled={updateStatusMutation.isPending}
              className="px-3 py-1 text-sm bg-yellow-100 text-yellow-700 hover:bg-yellow-200 rounded transition-colors"
            >
              Återaktivera
            </button>
          )}
        </div>
      </td>
    </tr>
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Hantera användare</h1>
        <p className="text-gray-600 mt-1">
          Godkänn nya användare och hantera befintliga konton.
        </p>
      </div>

      {/* Pending Users */}
      {pendingUsers.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Clock className="text-yellow-600" size={20} />
            Väntar på godkännande ({pendingUsers.length})
          </h2>
          <div className="card overflow-hidden p-0">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                    Användare
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                    Registrerad
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                    Åtgärder
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {pendingUsers.map((user) => (
                  <UserRow key={user.id} user={user} />
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Approved Users */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <CheckCircle className="text-green-600" size={20} />
          Aktiva användare ({approvedUsers.length})
        </h2>
        {approvedUsers.length > 0 ? (
          <div className="card overflow-hidden p-0">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                    Användare
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                    Registrerad
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                    Åtgärder
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {approvedUsers.map((user) => (
                  <UserRow key={user.id} user={user} />
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="card text-center py-8">
            <p className="text-gray-500">Inga aktiva användare.</p>
          </div>
        )}
      </section>

      {/* Inactive Users */}
      {inactiveUsers.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <XCircle className="text-gray-400" size={20} />
            Inaktiva användare ({inactiveUsers.length})
          </h2>
          <div className="card overflow-hidden p-0">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                    Användare
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                    Registrerad
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                    Åtgärder
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {inactiveUsers.map((user) => (
                  <UserRow key={user.id} user={user} />
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
