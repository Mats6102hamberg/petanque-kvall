import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Trophy, Users, Clock, CheckCircle, RefreshCw } from "lucide-react";

interface TeamMember {
  user: { firstName: string | null; lastName: string | null };
}

interface Team {
  id: number;
  teamName: string;
  members: TeamMember[];
}

interface Match {
  id: number;
  team1Id: number;
  team2Id: number;
  team1Score: number | null;
  team2Score: number | null;
  status: string;
  roundNumber: number;
  courtNumber: number | null;
  winnerId: number | null;
  team1?: Team;
  team2?: Team;
}

interface EventData {
  id: number;
  eventDate: string;
  eventType: string;
  location: string | null;
  startTime: string | null;
  status: string;
  matches: Match[];
  lastUpdated: string;
}

export default function LiveScoreboard() {
  const params = useParams();
  const eventId = params.eventId;

  const { data: event, isLoading, error, dataUpdatedAt } = useQuery<EventData>({
    queryKey: ["live-scoreboard", eventId],
    queryFn: async () => {
      const res = await fetch(`/api/public?eventId=${eventId}`);
      if (!res.ok) throw new Error("Kunde inte hämta data");
      return res.json();
    },
    refetchInterval: 5000, // Update every 5 seconds
    enabled: !!eventId,
  });

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("sv-SE", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  };

  const getMemberNames = (members?: TeamMember[]) => {
    if (!members) return "";
    return members
      .map((m) => `${m.user.firstName || ""} ${m.user.lastName || ""}`.trim())
      .join(" & ");
  };

  const getLastUpdateTime = () => {
    if (!dataUpdatedAt) return "";
    return new Date(dataUpdatedAt).toLocaleTimeString("sv-SE");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary-500 border-t-transparent mx-auto"></div>
          <p className="text-white mt-4 text-xl">Laddar resultat...</p>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center text-white">
          <Trophy className="mx-auto text-gray-500" size={64} />
          <h1 className="text-2xl font-bold mt-4">Event hittades inte</h1>
          <p className="text-gray-400 mt-2">Kontrollera länken och försök igen.</p>
        </div>
      </div>
    );
  }

  // Group matches by round
  const matchesByRound = event.matches.reduce((acc, match) => {
    const round = match.roundNumber;
    if (!acc[round]) acc[round] = [];
    acc[round].push(match);
    return acc;
  }, {} as Record<number, Match[]>);

  const completedCount = event.matches.filter((m) => m.status === "completed").length;
  const totalCount = event.matches.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4 md:p-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl md:text-6xl font-bold text-white mb-2">
          {event.eventType}
        </h1>
        <p className="text-xl md:text-2xl text-primary-400">
          {formatDate(event.eventDate)}
          {event.location && ` • ${event.location}`}
        </p>

        {/* Progress bar */}
        <div className="max-w-md mx-auto mt-6">
          <div className="flex justify-between text-sm text-gray-400 mb-2">
            <span>Matcher klara</span>
            <span>{completedCount} / {totalCount}</span>
          </div>
          <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary-500 to-green-500 transition-all duration-500"
              style={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }}
            ></div>
          </div>
        </div>

        {/* Last update indicator */}
        <div className="flex items-center justify-center gap-2 mt-4 text-gray-500 text-sm">
          <RefreshCw size={14} className="animate-spin" style={{ animationDuration: "3s" }} />
          <span>Uppdateras automatiskt • Senast {getLastUpdateTime()}</span>
        </div>
      </div>

      {/* Matches by round */}
      {Object.keys(matchesByRound)
        .sort((a, b) => Number(a) - Number(b))
        .map((roundNum) => (
          <div key={roundNum} className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-4 text-center">
              Omgång {roundNum}
            </h2>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {matchesByRound[Number(roundNum)].map((match) => (
                <MatchCard key={match.id} match={match} getMemberNames={getMemberNames} />
              ))}
            </div>
          </div>
        ))}

      {event.matches.length === 0 && (
        <div className="text-center py-16">
          <Clock className="mx-auto text-gray-500" size={64} />
          <p className="text-gray-400 text-xl mt-4">Inga matcher ännu</p>
          <p className="text-gray-500 mt-2">Väntar på att lag ska lottas...</p>
        </div>
      )}
    </div>
  );
}

function MatchCard({
  match,
  getMemberNames,
}: {
  match: Match;
  getMemberNames: (members?: TeamMember[]) => string;
}) {
  const isCompleted = match.status === "completed";
  const isOngoing = match.status === "ongoing";

  return (
    <div
      className={`
        relative rounded-xl p-4 transition-all duration-300
        ${isCompleted ? "bg-gray-800/80" : isOngoing ? "bg-gradient-to-br from-yellow-900/50 to-orange-900/50 ring-2 ring-yellow-500/50" : "bg-gray-800/50"}
      `}
    >
      {/* Status badge */}
      <div className="absolute -top-2 -right-2">
        {isCompleted && (
          <span className="bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
            <CheckCircle size={12} />
            Klar
          </span>
        )}
        {isOngoing && (
          <span className="bg-yellow-500 text-gray-900 text-xs font-bold px-2 py-1 rounded-full animate-pulse">
            PÅGÅR
          </span>
        )}
      </div>

      {/* Court number */}
      {match.courtNumber && (
        <div className="text-xs text-gray-500 mb-2">Bana {match.courtNumber}</div>
      )}

      {/* Team 1 */}
      <div
        className={`flex items-center justify-between p-3 rounded-lg mb-2 transition-colors ${
          match.winnerId === match.team1Id
            ? "bg-green-500/20 ring-1 ring-green-500/50"
            : "bg-gray-700/50"
        }`}
      >
        <div className="flex-1">
          <p className="font-semibold text-white">{match.team1?.teamName || "Lag 1"}</p>
          <p className="text-xs text-gray-400">{getMemberNames(match.team1?.members)}</p>
        </div>
        <div
          className={`text-3xl font-bold ${
            match.winnerId === match.team1Id ? "text-green-400" : "text-white"
          }`}
        >
          {match.team1Score ?? "-"}
        </div>
      </div>

      {/* VS divider */}
      <div className="text-center text-gray-500 text-sm my-1">vs</div>

      {/* Team 2 */}
      <div
        className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
          match.winnerId === match.team2Id
            ? "bg-green-500/20 ring-1 ring-green-500/50"
            : "bg-gray-700/50"
        }`}
      >
        <div className="flex-1">
          <p className="font-semibold text-white">{match.team2?.teamName || "Lag 2"}</p>
          <p className="text-xs text-gray-400">{getMemberNames(match.team2?.members)}</p>
        </div>
        <div
          className={`text-3xl font-bold ${
            match.winnerId === match.team2Id ? "text-green-400" : "text-white"
          }`}
        >
          {match.team2Score ?? "-"}
        </div>
      </div>
    </div>
  );
}
