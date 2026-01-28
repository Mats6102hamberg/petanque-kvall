import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { CheckCircle, Calendar, MapPin, Clock, LogIn, UserCheck } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { registrations } from "@/lib/api";

interface VerifyResponse {
  registered: boolean;
  registration?: {
    id: number;
    checkedInAt: string | null;
  };
  event?: {
    id: number;
    eventDate: string;
    eventType: string;
    location: string | null;
    startTime: string | null;
  };
  user?: {
    firstName: string | null;
    lastName: string | null;
  };
}

export default function CheckIn() {
  const params = useParams();
  const eventId = parseInt(params.eventId || "0");
  const { user, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [checkInSuccess, setCheckInSuccess] = useState(false);

  const { data: verifyData, isLoading: verifyLoading } = useQuery<VerifyResponse>({
    queryKey: ["verify-registration", eventId, user?.id],
    queryFn: async () => {
      const res = await fetch(`/api/public?action=verify&eventId=${eventId}&userId=${user?.id}`);
      if (!res.ok) throw new Error("Kunde inte verifiera");
      return res.json();
    },
    enabled: !!user && eventId > 0,
  });

  const checkInMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/registrations?action=checkin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ eventId }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Kunde inte checka in");
      }
      return res.json();
    },
    onSuccess: () => {
      setCheckInSuccess(true);
      queryClient.invalidateQueries({ queryKey: ["verify-registration", eventId] });
    },
  });

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("sv-SE", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  };

  const isLoading = authLoading || verifyLoading;

  // Not logged in
  if (!authLoading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full">
          <div className="card text-center">
            <LogIn className="mx-auto text-primary-600 mb-4" size={48} />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Logga in för att checka in</h1>
            <p className="text-gray-600 mb-6">
              Du måste vara inloggad för att checka in till eventet.
            </p>
            <Link href={`/login?redirect=/checkin/${eventId}`}>
              <button className="btn btn-primary w-full">Logga in</button>
            </Link>
            <p className="mt-4 text-sm text-gray-500">
              Har du inget konto?{" "}
              <Link href="/register" className="text-primary-600 hover:underline">
                Registrera dig
              </Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Loading
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // Not registered for event
  if (!verifyData?.registered) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full">
          <div className="card text-center">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <UserCheck className="text-yellow-600" size={32} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Inte anmäld</h1>
            <p className="text-gray-600 mb-6">
              Du är inte anmäld till detta event. Gå till startsidan för att anmäla dig.
            </p>
            <Link href="/">
              <button className="btn btn-primary w-full">Till startsidan</button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const event = verifyData.event;
  const alreadyCheckedIn = !!verifyData.registration?.checkedInAt;

  // Already checked in or just checked in
  if (alreadyCheckedIn || checkInSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-primary-50 px-4">
        <div className="max-w-md w-full">
          <div className="card text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
              <CheckCircle className="text-green-600" size={48} />
            </div>
            <h1 className="text-3xl font-bold text-green-700 mb-2">Incheckad!</h1>
            <p className="text-gray-600 mb-6">
              Välkommen {verifyData.user?.firstName}! Du är nu incheckad.
            </p>

            {event && (
              <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left">
                <h2 className="font-semibold text-lg mb-3">{event.eventType}</h2>
                <div className="space-y-2 text-gray-600">
                  <div className="flex items-center gap-2">
                    <Calendar size={18} />
                    <span>{formatDate(event.eventDate)}</span>
                  </div>
                  {event.startTime && (
                    <div className="flex items-center gap-2">
                      <Clock size={18} />
                      <span>{event.startTime}</span>
                    </div>
                  )}
                  {event.location && (
                    <div className="flex items-center gap-2">
                      <MapPin size={18} />
                      <span>{event.location}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <p className="text-sm text-gray-500">
              Ha en trevlig spelkväll!
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Ready to check in
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full">
        <div className="card">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <UserCheck className="text-primary-600" size={32} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Välkommen!</h1>
            <p className="text-gray-600">{verifyData.user?.firstName} {verifyData.user?.lastName}</p>
          </div>

          {event && (
            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <h2 className="font-semibold text-lg mb-3">{event.eventType}</h2>
              <div className="space-y-2 text-gray-600">
                <div className="flex items-center gap-2">
                  <Calendar size={18} />
                  <span>{formatDate(event.eventDate)}</span>
                </div>
                {event.startTime && (
                  <div className="flex items-center gap-2">
                    <Clock size={18} />
                    <span>{event.startTime}</span>
                  </div>
                )}
                {event.location && (
                  <div className="flex items-center gap-2">
                    <MapPin size={18} />
                    <span>{event.location}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {checkInMutation.isError && (
            <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm mb-4">
              {checkInMutation.error instanceof Error
                ? checkInMutation.error.message
                : "Kunde inte checka in"}
            </div>
          )}

          <button
            onClick={() => checkInMutation.mutate()}
            disabled={checkInMutation.isPending}
            className="btn btn-primary w-full text-lg py-4"
          >
            {checkInMutation.isPending ? (
              <span className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Checkar in...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <CheckCircle size={24} />
                Checka in
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
