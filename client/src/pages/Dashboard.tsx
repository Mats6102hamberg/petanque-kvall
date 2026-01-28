import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Calendar, Users, MapPin, Clock, CheckCircle } from "lucide-react";
import { events, registrations } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

export default function Dashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: upcomingEvent, isLoading } = useQuery({
    queryKey: ["upcoming-event"],
    queryFn: events.getUpcoming,
  });

  const { data: myRegistrations } = useQuery({
    queryKey: ["my-registrations"],
    queryFn: registrations.getMine,
  });

  const registerMutation = useMutation({
    mutationFn: (eventId: number) => registrations.create({ gameEventId: eventId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["upcoming-event"] });
      queryClient.invalidateQueries({ queryKey: ["my-registrations"] });
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
          Välkommen, {user?.firstName}!
        </h1>
        <p className="text-gray-600 mt-1">
          {user?.status === "pending"
            ? "Ditt konto väntar på godkännande av admin."
            : "Här ser du kommande event och kan anmäla dig."}
        </p>
      </div>

      {/* User Status Warning */}
      {user?.status === "pending" && (
        <div className="card bg-yellow-50 border-yellow-200">
          <div className="flex items-start gap-3">
            <Clock className="text-yellow-600 mt-0.5" size={20} />
            <div>
              <h3 className="font-medium text-yellow-800">Väntar på godkännande</h3>
              <p className="text-sm text-yellow-700 mt-1">
                Din registrering granskas av en administratör. Du kommer kunna anmäla dig till
                event när du blivit godkänd.
              </p>
            </div>
          </div>
        </div>
      )}

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
                  <div className="flex items-center gap-2">
                    <Users size={18} />
                    <span>
                      {upcomingEvent.registrationCount} / {upcomingEvent.minPlayers} anmälda
                    </span>
                  </div>
                </div>
                <p className="text-sm text-gray-500">
                  Avgift: {upcomingEvent.entryFee} kr
                </p>
              </div>

              <div className="flex-shrink-0">
                {upcomingEvent.userRegistered ? (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle size={20} />
                    <span className="font-medium">Du är anmäld!</span>
                  </div>
                ) : user?.status === "approved" ? (
                  <button
                    onClick={() => registerMutation.mutate(upcomingEvent.id)}
                    disabled={registerMutation.isPending}
                    className="btn btn-primary"
                  >
                    {registerMutation.isPending ? "Anmäler..." : "Anmäl mig"}
                  </button>
                ) : (
                  <button disabled className="btn btn-secondary opacity-50 cursor-not-allowed">
                    Anmälan ej tillgänglig
                  </button>
                )}
              </div>
            </div>

            {registerMutation.isError && (
              <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                {registerMutation.error instanceof Error
                  ? registerMutation.error.message
                  : "Kunde inte anmäla"}
              </div>
            )}
          </div>
        ) : (
          <div className="card text-center py-8">
            <Calendar className="mx-auto text-gray-400" size={48} />
            <p className="text-gray-500 mt-4">Inga kommande event just nu.</p>
          </div>
        )}
      </section>

      {/* My Registrations */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Mina anmälningar</h2>
        {myRegistrations && myRegistrations.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {myRegistrations.map((reg) => (
              <div key={reg.id} className="card">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium text-gray-900">
                      {reg.event?.eventType}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {reg.event && formatDate(reg.event.eventDate)}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-1 text-xs rounded ${
                      reg.paymentStatus === "confirmed"
                        ? "bg-green-100 text-green-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {reg.paymentStatus === "confirmed" ? "Bekräftad" : "Väntar"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card text-center py-6">
            <p className="text-gray-500">Du har inga aktiva anmälningar.</p>
          </div>
        )}
      </section>
    </div>
  );
}
