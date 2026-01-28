import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Users, Shuffle, Calendar, MapPin, Clock } from "lucide-react";
import { admin, registrations } from "@/lib/api";

export default function ManageEvents() {
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newEvent, setNewEvent] = useState({
    eventDate: "",
    eventType: "Kvällsspel",
    location: "Boulebanan",
    startTime: "18:00",
    entryFee: 50,
    minPlayers: 16,
  });

  const { data: events, isLoading } = useQuery({
    queryKey: ["admin-events"],
    queryFn: admin.getEvents,
  });

  const createEventMutation = useMutation({
    mutationFn: admin.createEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-events"] });
      setShowCreateModal(false);
      setNewEvent({
        eventDate: "",
        eventType: "Kvällsspel",
        location: "Boulebanan",
        startTime: "18:00",
        entryFee: 50,
        minPlayers: 16,
      });
    },
  });

  const deleteEventMutation = useMutation({
    mutationFn: admin.deleteEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-events"] });
    },
  });

  const generateTeamsMutation = useMutation({
    mutationFn: admin.generateTeams,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-events"] });
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

  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    createEventMutation.mutate(newEvent);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Hantera events</h1>
          <p className="text-gray-600 mt-1">Skapa och hantera spelevent.</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus size={20} />
          Skapa event
        </button>
      </div>

      {/* Events List */}
      {events && events.length > 0 ? (
        <div className="space-y-4">
          {events.map((event) => (
            <div key={event.id} className="card">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {event.eventType}
                    </h3>
                    <span
                      className={`px-2 py-1 text-xs rounded ${
                        event.status === "open"
                          ? "bg-green-100 text-green-800"
                          : event.status === "confirmed"
                          ? "bg-blue-100 text-blue-800"
                          : event.status === "completed"
                          ? "bg-gray-100 text-gray-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {event.status === "open"
                        ? "Öppen"
                        : event.status === "confirmed"
                        ? "Bekräftad"
                        : event.status === "completed"
                        ? "Avslutad"
                        : "Avbokad"}
                    </span>
                    {event.teamsGenerated && (
                      <span className="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded">
                        Lag lottade
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Calendar size={16} />
                      <span>{formatDate(event.eventDate)}</span>
                    </div>
                    {event.startTime && (
                      <div className="flex items-center gap-1">
                        <Clock size={16} />
                        <span>{event.startTime}</span>
                      </div>
                    )}
                    {event.location && (
                      <div className="flex items-center gap-1">
                        <MapPin size={16} />
                        <span>{event.location}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Users size={16} />
                      <span>
                        {event.registrationCount} / {event.minPlayers} anmälda
                      </span>
                    </div>
                  </div>

                  <p className="text-sm text-gray-500">
                    Avgift: {event.entryFee} kr | {event.matchCount} matcher
                  </p>
                </div>

                <div className="flex gap-2">
                  {!event.teamsGenerated &&
                    event.registrationCount >= event.minPlayers && (
                      <button
                        onClick={() => generateTeamsMutation.mutate(event.id)}
                        disabled={generateTeamsMutation.isPending}
                        className="btn btn-primary flex items-center gap-2"
                      >
                        <Shuffle size={18} />
                        Lotta lag
                      </button>
                    )}
                  <button
                    onClick={() => {
                      if (
                        confirm("Är du säker på att du vill ta bort detta event?")
                      ) {
                        deleteEventMutation.mutate(event.id);
                      }
                    }}
                    disabled={deleteEventMutation.isPending}
                    className="btn btn-danger flex items-center gap-2"
                  >
                    <Trash2 size={18} />
                    Ta bort
                  </button>
                </div>
              </div>

              {generateTeamsMutation.isError && (
                <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                  {generateTeamsMutation.error instanceof Error
                    ? generateTeamsMutation.error.message
                    : "Kunde inte lotta lag"}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="card text-center py-12">
          <Calendar className="mx-auto text-gray-400" size={48} />
          <p className="text-gray-500 mt-4">Inga events skapade.</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary mt-4"
          >
            Skapa ditt första event
          </button>
        </div>
      )}

      {/* Create Event Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-4">Skapa nytt event</h2>

            <form onSubmit={handleCreateEvent} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Datum
                </label>
                <input
                  type="date"
                  value={newEvent.eventDate}
                  onChange={(e) =>
                    setNewEvent((prev) => ({ ...prev, eventDate: e.target.value }))
                  }
                  className="input"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Typ av event
                </label>
                <select
                  value={newEvent.eventType}
                  onChange={(e) =>
                    setNewEvent((prev) => ({ ...prev, eventType: e.target.value }))
                  }
                  className="input"
                >
                  <option value="Kvällsspel">Kvällsspel</option>
                  <option value="Onsdagsspel">Onsdagsspel</option>
                  <option value="Torsdagsspel">Torsdagsspel</option>
                  <option value="Helgspel">Helgspel</option>
                  <option value="Turnering">Turnering</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Plats
                </label>
                <input
                  type="text"
                  value={newEvent.location}
                  onChange={(e) =>
                    setNewEvent((prev) => ({ ...prev, location: e.target.value }))
                  }
                  className="input"
                  placeholder="t.ex. Boulebanan"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Starttid
                </label>
                <input
                  type="time"
                  value={newEvent.startTime}
                  onChange={(e) =>
                    setNewEvent((prev) => ({ ...prev, startTime: e.target.value }))
                  }
                  className="input"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Avgift (kr)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newEvent.entryFee}
                    onChange={(e) =>
                      setNewEvent((prev) => ({
                        ...prev,
                        entryFee: parseInt(e.target.value) || 0,
                      }))
                    }
                    className="input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Minsta antal spelare
                  </label>
                  <input
                    type="number"
                    min="4"
                    step="2"
                    value={newEvent.minPlayers}
                    onChange={(e) =>
                      setNewEvent((prev) => ({
                        ...prev,
                        minPlayers: parseInt(e.target.value) || 16,
                      }))
                    }
                    className="input"
                  />
                </div>
              </div>

              {createEventMutation.isError && (
                <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                  {createEventMutation.error instanceof Error
                    ? createEventMutation.error.message
                    : "Kunde inte skapa event"}
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn btn-secondary flex-1"
                >
                  Avbryt
                </button>
                <button
                  type="submit"
                  disabled={createEventMutation.isPending}
                  className="btn btn-primary flex-1"
                >
                  {createEventMutation.isPending ? "Skapar..." : "Skapa event"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
