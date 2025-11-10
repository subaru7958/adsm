import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export const api = axios.create({ baseURL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("auth_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export type LoginResponse = {
  success: boolean;
  message: string;
  token: string;
  user?: { id: string; teamName: string; email: string; teamLogo?: string };
};

export const authApi = {
  adminLogin: (email: string, password: string) =>
    api.post<LoginResponse>("/api/auth/login", { email, password }),
  coachLogin: (email: string, password: string) =>
    api.post<{ success: boolean; message: string; token: string; coach: { id: string; name: string; email: string; admin: string } }>(
      "/api/auth/coach-login",
      { email, password }
    ),
  playerLogin: (email: string, password: string) =>
    api.post<{ success: boolean; message: string; token: string; player: { id: string; name: string; email: string; admin: string; photo?: string } }>(
      "/api/auth/player-login",
      { email, password }
    ),
  register: (data: FormData) => api.post<LoginResponse>("/api/auth/register", data, { headers: { "Content-Type": "multipart/form-data" } }),
};

export const adminApi = {
  stats: () => api.get("/api/admin/stats"),
  completedSessions: (days?: number) => api.get("/api/admin/completed-sessions", { params: { days } }),
  getSettings: () => api.get("/api/admin/settings"),
  updateSettings: (data: FormData) => api.put("/api/admin/settings", data, { headers: { "Content-Type": "multipart/form-data" } }),
  changePassword: (data: { currentPassword: string; newPassword: string }) => api.put("/api/admin/change-password", data),
  players: {
    list: () => api.get("/api/players"),
    create: (data: FormData) => api.post("/api/players", data, { headers: { "Content-Type": "multipart/form-data" } }),
    update: (id: string, data: FormData | Record<string, any>) => api.put(`/api/players/${id}`, data),
    remove: (id: string) => api.delete(`/api/players/${id}`),
  },
  coaches: {
    list: () => api.get("/api/coaches"),
    create: (data: FormData) => api.post("/api/coaches", data, { headers: { "Content-Type": "multipart/form-data" } }),
    update: (id: string, data: FormData | Record<string, any>) => api.put(`/api/coaches/${id}`, data),
    remove: (id: string) => api.delete(`/api/coaches/${id}`),
  },
  groups: {
    list: () => api.get("/api/groups"),
    create: (payload: { name: string; sport: string }) => api.post("/api/groups", payload),
    detail: (id: string) => api.get(`/api/groups/${id}`),
    update: (id: string, payload: { name?: string; sport?: string; players?: string[]; coaches?: string[] }) => api.put(`/api/groups/${id}`, payload),
    remove: (id: string) => api.delete(`/api/groups/${id}`),
  },
  sessions: {
    list: (range?: { start: string; end: string }) =>
      api.get("/api/sessions", { params: range }),
    create: (payload: Record<string, any>) => api.post("/api/sessions", payload),
    update: (id: string, payload: Record<string, any>) => api.put(`/api/sessions/${id}`, payload),
    remove: (id: string) => api.delete(`/api/sessions/${id}`),
  },
  events: {
    list: (range?: { start?: string; end?: string }) =>
      api.get("/api/events", { params: range }),
    create: (payload: Record<string, any>) => api.post("/api/events", payload),
    update: (id: string, payload: Record<string, any>) => api.put(`/api/events/${id}`, payload),
    remove: (id: string) => api.delete(`/api/events/${id}`),
  },
};

export const coachApi = {
  myProfile: () => api.get("/api/coach/me"),
  mySessions: (range?: { start: string; end: string }) => api.get("/api/coach/my-sessions", { params: range }),
  myGroups: () => api.get("/api/coach/my-groups"),
  sessionRoster: (sessionId: string) => api.get(`/api/coach/session-roster/${sessionId}`),
  submitAttendance: (payload: { sessionId: string; date: string; records: { playerId: string; status: string }[] }) =>
    api.post("/api/coach/attendance", payload),
  submitNotes: (payload: { sessionId: string; date: string; generalNote?: string; playerNotes?: { player: string; note: string }[] }) =>
    api.post("/api/coach/notes", payload),
  submitGameScore: (payload: { sessionId: string; teamScore: string; opponentScore: string; gameNotes?: string }) =>
    api.post("/api/coach/game-score", payload),
};

export const playerApi = {
  mySchedule: (range: { start: string; end: string }) => api.get("/api/player/my-schedule", { params: range }),
  myProfile: () => api.get("/api/player/my-profile"),
  updateMyProfile: (data: FormData) => api.put("/api/player/my-profile", data, { headers: { "Content-Type": "multipart/form-data" } }),
  changePassword: (data: { currentPassword: string; newPassword: string }) => api.put("/api/player/change-password", data),
};

export const coachApiPassword = {
  changePassword: (data: { currentPassword: string; newPassword: string }) => api.put("/api/coach/change-password", data),
};

export function setToken(token: string) {
  localStorage.setItem("auth_token", token);
}

export function clearToken() {
  localStorage.removeItem("auth_token");
}
