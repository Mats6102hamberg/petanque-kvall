import { BarChart3 } from "lucide-react";

export default function Statistics() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Statistik</h1>
        <p className="text-gray-600 mt-1">Statistik kommer snart!</p>
      </div>

      <div className="card text-center py-12">
        <BarChart3 className="mx-auto text-gray-400" size={48} />
        <p className="text-gray-500 mt-4">Statistik är under utveckling.</p>
        <p className="text-sm text-gray-400 mt-2">
          Här kommer du kunna se resultat och rankingar.
        </p>
      </div>
    </div>
  );
}
