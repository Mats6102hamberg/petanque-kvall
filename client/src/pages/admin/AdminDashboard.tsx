import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Calendar, Trophy, Monitor } from "lucide-react";

interface GameEvent {
  id: number;
  eventDate: string;
  eventType: string;
  status: string;
  registrationCount: number;
  matchCount: number;
}

export default function AdminDashboard() {
  const { data: events } = useQuery<GameEvent[]>({
    queryKey: ["admin-events"],
    queryFn: async () => {
      const res = await fetch("/api/admin?resource=events");
      if (!res.ok) throw new Error("Kunde inte hämta events");
      return res.json();
    },
  });

  const upcomingEvents = events?.filter((e) => e.status === "open" || e.status === "confirmed") || [];
  const totalMatches = events?.reduce((sum, e) => sum + e.matchCount, 0) || 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Administration</h1>
        <p className="text-gray-600 mt-1">Hantera events och matcher.</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
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
            <div className="p-2 bg-green-100 rounded-lg">
              <Trophy className="text-green-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Totalt matcher</p>
              <p className="text-2xl font-bold text-gray-900">{totalMatches}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Monitor className="text-blue-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Totalt events</p>
              <p className="text-2xl font-bold text-gray-900">{events?.length || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid md:grid-cols-2 gap-4">
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

        <Link href="/matches" className="card hover:shadow-md transition-shadow">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <Trophy className="text-green-600" size={24} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Se matcher</h3>
              <p className="text-sm text-gray-500">Rapportera resultat</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Recent Events */}
      {upcomingEvents.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Kommande events</h2>
          <div className="space-y-3">
            {upcomingEvents.slice(0, 3).map((event) => (
              <div key={event.id} className="card flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900">{event.eventType}</h3>
                  <p className="text-sm text-gray-500">
                    {new Date(event.eventDate).toLocaleDateString("sv-SE", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                    })}
                  </p>
                </div>
                <Link href={`/admin/events/${event.id}/qr`}>
                  <button className="btn btn-secondary text-sm">
                    QR & Live
                  </button>
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
