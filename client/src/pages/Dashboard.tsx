import { useQuery } from "@tanstack/react-query";
import { Calendar, Users, MapPin, Clock, Monitor } from "lucide-react";
import { Link } from "wouter";
import { useUser } from "@/hooks/useUser";

interface GameEvent {
  id: number;
  eventDate: string;
  eventType: string;
  location: string | null;
  startTime: string | null;
  status: string;
  entryFee: number;
  minPlayers: number;
}

export default function Dashboard() {
  const { name } = useUser();

  const { data: upcomingEvent, isLoading } = useQuery<GameEvent | null>({
    queryKey: ["upcoming-event-public"],
    queryFn: async () => {
      const res = await fetch("/api/public?action=upcoming");
      if (!res.ok) return null;
      return res.json();
    },
  });

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("sv-SE", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Välkommen, {name}!
        </h1>
        <p className="text-gray-600 mt-1">
          Här ser du kommande event och kan följa resultaten.
        </p>
      </div>

      {/* Upcoming Event */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Nästa event</h2>
        {isLoading ? (
          <div className="card">
            <div className="animate-pulse space-y-4">
              <div className="h-6 bg-gray-200 rounded w-1/3"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        ) : upcomingEvent ? (
          <div className="card">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="space-y-3">
                <h3 className="text-xl font-semibold text-gray-900">
                  {upcomingEvent.eventType}
                </h3>
                <div className="flex flex-wrap gap-4 text-gray-600">
                  <div className="flex items-center gap-2">
                    <Calendar size={18} />
                    <span>{formatDate(upcomingEvent.eventDate)}</span>
                  </div>
                  {upcomingEvent.startTime && (
                    <div className="flex items-center gap-2">
                      <Clock size={18} />
                      <span>{upcomingEvent.startTime}</span>
                    </div>
                  )}
                  {upcomingEvent.location && (
                    <div className="flex items-center gap-2">
                      <MapPin size={18} />
                      <span>{upcomingEvent.location}</span>
                    </div>
                  )}
                </div>
                <p className="text-sm text-gray-500">
                  Avgift: {upcomingEvent.entryFee} kr
                </p>
              </div>

              <div className="flex-shrink-0">
                <Link href={`/live/${upcomingEvent.id}`}>
                  <button className="btn btn-primary flex items-center gap-2">
                    <Monitor size={18} />
                    Se Live Scoreboard
                  </button>
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="card text-center py-8">
            <Calendar className="mx-auto text-gray-400" size={48} />
            <p className="text-gray-500 mt-4">Inga kommande event just nu.</p>
            <Link href="/admin/events">
              <button className="btn btn-primary mt-4">Skapa event</button>
            </Link>
          </div>
        )}
      </section>

      {/* Quick Links */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Snabblänkar</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Link href="/matches">
            <div className="card hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary-100 rounded-lg">
                  <Users className="text-primary-600" size={24} />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Matcher</h3>
                  <p className="text-sm text-gray-500">Se alla matcher</p>
                </div>
              </div>
            </div>
          </Link>

          <Link href="/admin/events">
            <div className="card hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Calendar className="text-green-600" size={24} />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Hantera Events</h3>
                  <p className="text-sm text-gray-500">Skapa och redigera</p>
                </div>
              </div>
            </div>
          </Link>

          {upcomingEvent && (
            <Link href={`/live/${upcomingEvent.id}`}>
              <div className="card hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Monitor className="text-purple-600" size={24} />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Live Scoreboard</h3>
                    <p className="text-sm text-gray-500">Följ matcherna</p>
                  </div>
                </div>
              </div>
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}
