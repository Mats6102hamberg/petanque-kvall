const API_BASE = "/api";

function getToken(): string | null {
  return localStorage.getItem("token");
}

export function setToken(token: string): void {
  localStorage.setItem("token", token);
}

export function clearToken(): void {
  localStorage.removeItem("token");
}

async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Ett fel uppstod" }));
    throw new Error(error.message || "Ett fel uppstod");
  }

  if (response.status === 204) return undefined as T;
  return response.json();
}

// Types
export interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  isAdmin: boolean;
  status: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface GameEvent {
  id: number;
  eventDate: string;
  eventType: string;
  location: string | null;
  startTime: string | null;
  status: string;
  entryFee: number;
  minPlayers: number;
  teamsGenerated: boolean;
  registrationCount?: number;
  userRegistered?: boolean;
}

export interface Registration {
  id: number;
  gameEventId: number;
  userId: string;
  phoneNumber: string | null;
  paymentStatus: string;
  registeredAt: string;
  checkedInAt?: string | null;
  event?: GameEvent;
  user?: { id: string; firstName: string | null; lastName: string | null };
}

export interface TeamMember {
  id: number;
  teamId: number;
  userId: string;
  user: { id: string; firstName: string | null; lastName: string | null };
}

export interface Team {
  id: number;
  teamName: string;
  members: TeamMember[];
}

export interface Match {
  id: number;
  gameEventId: number;
  team1Id: number;
  team2Id: number;
  courtNumber: number | null;
  roundNumber: number;
  status: string;
  team1Score: number | null;
  team2Score: number | null;
  winnerId: number | null;
  team1?: Team;
  team2?: Team;
}

export interface UserStats {
  gamesPlayed: number;
  wins: number;
  losses: number;
  winPercentage: number;
  totalPointsScored: number;
  totalPointsConceded: number;
}

export interface MatchHistory {
  id: number;
  eventDate: string;
  opponentTeam: string;
  userTeamScore: number;
  opponentScore: number;
  won: boolean;
  roundNumber: number;
}

// Auth
export const auth = {
  register: (data: { email: string; password: string; firstName: string; lastName: string }) =>
    fetchApi<AuthResponse>("/auth?action=register", { method: "POST", body: JSON.stringify(data) }),

  login: (data: { email: string; password: string }) =>
    fetchApi<AuthResponse>("/auth?action=login", { method: "POST", body: JSON.stringify(data) }),

  getUser: () => fetchApi<User>("/auth?action=user"),
};

// Events
export const events = {
  getUpcoming: () => fetchApi<GameEvent | null>("/events?type=upcoming"),
  getWithMatches: () => fetchApi<Array<GameEvent & { matches: Match[]; userTeamId?: number }>>("/events?type=with-matches"),
};

// Registrations
export const registrations = {
  create: (data: { gameEventId: number; phoneNumber?: string }) =>
    fetchApi<Registration>("/registrations", { method: "POST", body: JSON.stringify(data) }),
  getMine: () => fetchApi<Registration[]>("/registrations"),
  getByEvent: (eventId: number) => fetchApi<Registration[]>(`/registrations?eventId=${eventId}`),
  checkIn: (eventId: number) =>
    fetchApi<{ success: boolean; checkedInAt: string }>("/registrations?action=checkin", {
      method: "POST",
      body: JSON.stringify({ eventId }),
    }),
};

// Matches
export const matches = {
  getById: (id: number) => fetchApi<Match>(`/matches?id=${id}`),
  updateResult: (id: number, team1Score: number, team2Score: number) =>
    fetchApi<Match>(`/matches?id=${id}`, { method: "PATCH", body: JSON.stringify({ team1Score, team2Score }) }),
};

// Stats
export const stats = {
  getUser: () => fetchApi<UserStats>("/stats"),
  getDetailed: () => fetchApi<UserStats & { matchHistory: MatchHistory[] }>("/stats?detailed=true"),
};

// Admin
export const admin = {
  getUsers: () => fetchApi<User[]>("/admin?resource=users"),
  updateUserStatus: (userId: string, status: string) =>
    fetchApi<User>(`/admin?resource=users&id=${userId}&action=status`, { method: "PATCH", body: JSON.stringify({ status }) }),
  getEvents: () => fetchApi<Array<GameEvent & { registrationCount: number; matchCount: number }>>("/admin?resource=events"),
  createEvent: (data: Partial<GameEvent>) =>
    fetchApi<GameEvent>("/admin?resource=events", { method: "POST", body: JSON.stringify(data) }),
  deleteEvent: (id: number) => fetchApi<void>(`/admin?resource=events&id=${id}`, { method: "DELETE" }),
  generateTeams: (eventId: number) =>
    fetchApi<void>(`/admin?resource=events&id=${eventId}&action=generate-teams`, { method: "POST" }),
};
