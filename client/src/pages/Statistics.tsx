import { useQuery } from "@tanstack/react-query";
import { Trophy, Target, TrendingUp, Award } from "lucide-react";
import { stats } from "@/lib/api";

export default function Statistics() {
  const { data, isLoading } = useQuery({
    queryKey: ["detailed-stats"],
    queryFn: stats.getDetailed,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("sv-SE", {
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Min statistik</h1>
        <p className="text-gray-600 mt-1">Se hur du presterat i dina matcher.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-100 rounded-lg">
              <Trophy className="text-primary-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Matcher spelade</p>
              <p className="text-2xl font-bold text-gray-900">
                {data?.gamesPlayed || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Award className="text-green-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Vinster</p>
              <p className="text-2xl font-bold text-green-600">{data?.wins || 0}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <TrendingUp className="text-yellow-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Vinstprocent</p>
              <p className="text-2xl font-bold text-gray-900">
                {data?.winPercentage || 0}%
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Target className="text-blue-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Poäng gjorda</p>
              <p className="text-2xl font-bold text-gray-900">
                {data?.totalPointsScored || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Stats */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Poängstatistik</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Poäng gjorda</span>
              <span className="font-medium text-gray-900">
                {data?.totalPointsScored || 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Poäng insläppta</span>
              <span className="font-medium text-gray-900">
                {data?.totalPointsConceded || 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Poängdifferens</span>
              <span
                className={`font-medium ${
                  (data?.totalPointsScored || 0) - (data?.totalPointsConceded || 0) >= 0
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {(data?.totalPointsScored || 0) - (data?.totalPointsConceded || 0) >= 0
                  ? "+"
                  : ""}
                {(data?.totalPointsScored || 0) - (data?.totalPointsConceded || 0)}
              </span>
            </div>
          </div>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Matchresultat</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Vinster</span>
              <span className="font-medium text-green-600">{data?.wins || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Förluster</span>
              <span className="font-medium text-red-600">{data?.losses || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Vinstprocent</span>
              <span className="font-medium text-gray-900">
                {data?.winPercentage || 0}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Match History */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Matchhistorik</h2>
        {data?.matchHistory && data.matchHistory.length > 0 ? (
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                    Datum
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                    Omgång
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                    Motståndare
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">
                    Resultat
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.matchHistory.map((match) => (
                  <tr key={match.id}>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {formatDate(match.eventDate)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {match.roundNumber}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {match.opponentTeam}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-1 text-sm rounded ${
                          match.won
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {match.userTeamScore} - {match.opponentScore}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="card text-center py-8">
            <Trophy className="mx-auto text-gray-400" size={48} />
            <p className="text-gray-500 mt-4">Ingen matchhistorik ännu.</p>
          </div>
        )}
      </section>
    </div>
  );
}
