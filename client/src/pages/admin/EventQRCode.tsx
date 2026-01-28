import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { ArrowLeft, Users, CheckCircle, Clock, QrCode, Monitor, ExternalLink } from "lucide-react";
import QRCodeComponent from "@/components/QRCode";
import { admin, registrations } from "@/lib/api";

export default function EventQRCode() {
  const params = useParams();
  const eventId = parseInt(params.eventId || "0");

  const { data: allEvents } = useQuery({
    queryKey: ["admin-events"],
    queryFn: admin.getEvents,
  });

  const { data: eventRegistrations, isLoading: regsLoading } = useQuery({
    queryKey: ["registrations", eventId],
    queryFn: () => registrations.getByEvent(eventId),
    refetchInterval: 10000, // Refresh every 10 seconds to see check-ins
    enabled: eventId > 0,
  });

  const event = allEvents?.find((e) => e.id === eventId);

  if (!event) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Event hittades inte</p>
        <Link href="/admin" className="text-primary-600 hover:underline mt-2 inline-block">
          Tillbaka till admin
        </Link>
      </div>
    );
  }

  const checkinUrl = `${window.location.origin}/checkin/${eventId}`;
  const liveUrl = `${window.location.origin}/live/${eventId}`;

  const checkedInCount = eventRegistrations?.filter((r) => r.checkedInAt).length || 0;
  const totalCount = eventRegistrations?.length || 0;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("sv-SE", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin">
          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft size={24} />
          </button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{event.eventType}</h1>
          <p className="text-gray-600">{formatDate(event.eventDate)}</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* QR Code Section */}
        <div className="card text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <QrCode className="text-primary-600" size={24} />
            <h2 className="text-xl font-semibold">Incheckning</h2>
          </div>

          <p className="text-gray-600 mb-6">
            Visa denna QR-kod vid entrén. Spelare scannar för att checka in.
          </p>

          <div className="flex justify-center mb-6">
            <QRCodeComponent value={checkinUrl} size={220} />
          </div>

          <a
            href={checkinUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-600 hover:underline text-sm flex items-center justify-center gap-1"
          >
            Öppna incheckning <ExternalLink size={14} />
          </a>
        </div>

        {/* Live Scoreboard Section */}
        <div className="card text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Monitor className="text-primary-600" size={24} />
            <h2 className="text-xl font-semibold">Live Scoreboard</h2>
          </div>

          <p className="text-gray-600 mb-6">
            Visa denna länk på en skärm för att visa resultat i realtid.
          </p>

          <div className="flex justify-center mb-6">
            <QRCodeComponent value={liveUrl} size={220} />
          </div>

          <a
            href={liveUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary inline-flex items-center gap-2"
          >
            <Monitor size={18} />
            Öppna Live Scoreboard
          </a>
        </div>
      </div>

      {/* Check-in Status */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Users size={24} />
            Incheckade spelare
          </h2>
          <div className="text-2xl font-bold text-primary-600">
            {checkedInCount} / {totalCount}
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-4 bg-gray-100 rounded-full overflow-hidden mb-6">
          <div
            className="h-full bg-gradient-to-r from-primary-500 to-green-500 transition-all duration-500"
            style={{ width: `${totalCount > 0 ? (checkedInCount / totalCount) * 100 : 0}%` }}
          ></div>
        </div>

        {regsLoading ? (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
          </div>
        ) : eventRegistrations && eventRegistrations.length > 0 ? (
          <div className="space-y-2">
            {eventRegistrations.map((reg) => (
              <div
                key={reg.id}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  reg.checkedInAt ? "bg-green-50" : "bg-gray-50"
                }`}
              >
                <div className="flex items-center gap-3">
                  {reg.checkedInAt ? (
                    <CheckCircle className="text-green-600" size={20} />
                  ) : (
                    <Clock className="text-gray-400" size={20} />
                  )}
                  <span className={reg.checkedInAt ? "text-green-800" : "text-gray-600"}>
                    {reg.user?.firstName} {reg.user?.lastName}
                  </span>
                </div>
                {reg.checkedInAt && (
                  <span className="text-sm text-green-600">
                    {new Date(reg.checkedInAt).toLocaleTimeString("sv-SE", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-500 py-4">Inga anmälda spelare ännu</p>
        )}
      </div>
    </div>
  );
}
