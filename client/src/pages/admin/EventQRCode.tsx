import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { ArrowLeft, QrCode, Monitor, ExternalLink } from "lucide-react";
import QRCodeComponent from "@/components/QRCode";

interface GameEvent {
  id: number;
  eventDate: string;
  eventType: string;
  location: string | null;
  registrationCount: number;
  matchCount: number;
}

export default function EventQRCode() {
  const params = useParams();
  const eventId = parseInt(params.eventId || "0");

  const { data: allEvents } = useQuery<GameEvent[]>({
    queryKey: ["admin-events"],
    queryFn: async () => {
      const res = await fetch("/api/admin?resource=events");
      if (!res.ok) throw new Error("Kunde inte hämta events");
      return res.json();
    },
  });

  const event = allEvents?.find((e) => e.id === eventId);

  if (!event) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Event hittades inte</p>
        <Link href="/admin/events" className="text-primary-600 hover:underline mt-2 inline-block">
          Tillbaka till events
        </Link>
      </div>
    );
  }

  const liveUrl = `${window.location.origin}/live/${eventId}`;

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
        <Link href="/admin/events">
          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft size={24} />
          </button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{event.eventType}</h1>
          <p className="text-gray-600">{formatDate(event.eventDate)}</p>
        </div>
      </div>

      {/* Live Scoreboard QR */}
      <div className="card text-center max-w-md mx-auto">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Monitor className="text-primary-600" size={24} />
          <h2 className="text-xl font-semibold">Live Scoreboard</h2>
        </div>

        <p className="text-gray-600 mb-6">
          Visa denna länk på en storskärm för att visa resultat i realtid.
        </p>

        <div className="flex justify-center mb-6">
          <QRCodeComponent value={liveUrl} size={280} />
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

        <p className="text-sm text-gray-400 mt-4 break-all">
          {liveUrl}
        </p>
      </div>

      {/* Info */}
      <div className="card bg-blue-50 border-blue-200 max-w-md mx-auto">
        <div className="flex gap-3">
          <QrCode className="text-blue-600 flex-shrink-0" size={24} />
          <div>
            <h3 className="font-medium text-blue-900">Tips</h3>
            <p className="text-sm text-blue-700 mt-1">
              Scanna QR-koden med mobilen eller klicka på knappen för att öppna live scoreboardet.
              Perfekt att visa på en TV eller storskärm vid spelplatsen!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
