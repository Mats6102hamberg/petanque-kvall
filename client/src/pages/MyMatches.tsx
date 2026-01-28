import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Trophy, Users, Hash, CheckCircle, Clock } from "lucide-react";
import { events, matches as matchesApi, type Match } from "@/lib/api";

export default function MyMatches() {
  const queryClient = useQueryClient();
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [scores, setScores] = useState({ team1: 0, team2: 0 });

  const { data: eventsWithMatches, isLoading } = useQuery({
    queryKey: ["events-with-matches"],
    queryFn: events.getWithMatches,
  });

  const updateResultMutation = useMutation({
    mutationFn: ({
      matchId,
      team1Score,
      team2Score,
    }: {
      matchId: number;
      team1Score: number;
      team2Score: number;
    }) => matchesApi.updateResult(matchId, team1Score, team2Score),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events-with-matches"] });
      setSelectedMatch(null);
    },
  });

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("sv-SE", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const getMemberNames = (members: Array<{ user: { firstName: string | null; lastName: string | null } }>) => {
    return members
      .map((m) => `${m.user.firstName || ""} ${m.user.lastName || ""}`.trim())
      .join(" & ");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const activeEvents = eventsWithMatches?.filter(
    (e) => e.matches && e.matches.length > 0
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mina matcher</h1>
        <p className="text-gray-600 mt-1">Se dina matcher och rapportera resultat.</p>
      </div>

      {activeEvents && activeEvents.length > 0 ? (
        activeEvents.map((event) => (
          <div key={event.id} className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">
              {event.eventType} - {formatDate(event.eventDate)}
            </h2>

            <div className="grid gap-4">
              {event.matches.map((match) => {
                const isMyMatch =
                  match.team1Id === event.userTeamId ||
                  match.team2Id === event.userTeamId;

                return (
                  <div
                    key={match.id}
                    className={`card ${isMyMatch ? "ring-2 ring-primary-500" : ""}`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Hash size={16} />
                        <span>Omgång {match.roundNumber}</span>
                        {match.courtNumber && (
                          <>
                            <span className="mx-2">|</span>
                            <span>Bana {match.courtNumber}</span>
                          </>
                        )}
                      </div>
                      <span
                        className={`px-2 py-1 text-xs rounded ${
                          match.status === "completed"
                            ? "bg-green-100 text-green-800"
                            : match.status === "ongoing"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {match.status === "completed"
                          ? "Avslutad"
                          : match.status === "ongoing"
                          ? "Pågår"
                          : "Väntar"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div
                          className={`flex items-center gap-2 ${
                            match.team1Id === event.userTeamId
                              ? "font-semibold text-primary-700"
                              : ""
                          }`}
                        >
                          <Users size={18} />
                          <div>
                            <p>{match.team1?.teamName}</p>
                            <p className="text-sm text-gray-500">
                              {match.team1 && getMemberNames(match.team1.members)}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="px-6 text-center">
                        {match.status === "completed" ? (
                          <div className="flex items-center gap-2 text-2xl font-bold">
                            <span
                              className={
                                match.winnerId === match.team1Id
                                  ? "text-green-600"
                                  : ""
                              }
                            >
                              {match.team1Score}
                            </span>
                            <span className="text-gray-300">-</span>
                            <span
                              className={
                                match.winnerId === match.team2Id
                                  ? "text-green-600"
                                  : ""
                              }
                            >
                              {match.team2Score}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-lg">vs</span>
                        )}
                      </div>

                      <div className="flex-1 text-right">
                        <div
                          className={`flex items-center justify-end gap-2 ${
                            match.team2Id === event.userTeamId
                              ? "font-semibold text-primary-700"
                              : ""
                          }`}
                        >
                          <div>
                            <p>{match.team2?.teamName}</p>
                            <p className="text-sm text-gray-500">
                              {match.team2 && getMemberNames(match.team2.members)}
                            </p>
                          </div>
                          <Users size={18} />
                        </div>
                      </div>
                    </div>

                    {isMyMatch && match.status !== "completed" && (
                      <div className="mt-4 pt-4 border-t">
                        <button
                          onClick={() => {
                            setSelectedMatch(match);
                            setScores({
                              team1: match.team1Score || 0,
                              team2: match.team2Score || 0,
                            });
                          }}
                          className="btn btn-primary w-full"
                        >
                          Rapportera resultat
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))
      ) : (
        <div className="card text-center py-12">
          <Trophy className="mx-auto text-gray-400" size={48} />
          <p className="text-gray-500 mt-4">Inga matcher att visa.</p>
          <p className="text-sm text-gray-400 mt-2">
            Anmäl dig till ett event för att se dina matcher.
          </p>
        </div>
      )}

      {/* Result Modal */}
      {selectedMatch && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Rapportera resultat</h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {selectedMatch.team1?.teamName}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={scores.team1}
                    onChange={(e) =>
                      setScores((prev) => ({
                        ...prev,
                        team1: parseInt(e.target.value) || 0,
                      }))
                    }
                    className="input text-center text-xl"
                  />
                </div>
                <span className="text-xl text-gray-400">-</span>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {selectedMatch.team2?.teamName}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={scores.team2}
                    onChange={(e) =>
                      setScores((prev) => ({
                        ...prev,
                        team2: parseInt(e.target.value) || 0,
                      }))
                    }
                    className="input text-center text-xl"
                  />
                </div>
              </div>

              {updateResultMutation.isError && (
                <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                  {updateResultMutation.error instanceof Error
                    ? updateResultMutation.error.message
                    : "Kunde inte spara resultat"}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setSelectedMatch(null)}
                  className="btn btn-secondary flex-1"
                >
                  Avbryt
                </button>
                <button
                  onClick={() =>
                    updateResultMutation.mutate({
                      matchId: selectedMatch.id,
                      team1Score: scores.team1,
                      team2Score: scores.team2,
                    })
                  }
                  disabled={updateResultMutation.isPending}
                  className="btn btn-primary flex-1"
                >
                  {updateResultMutation.isPending ? "Sparar..." : "Spara"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
