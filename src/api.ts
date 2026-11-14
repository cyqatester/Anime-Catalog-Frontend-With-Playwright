import axios from "axios";
import type { Anime, AnimeInput, CatalogUser, Genre, GenreInput, UserInput, UserRole } from "./types";

export interface AuthSession {
  token: string;
  username: string;
  name: string;
  role: UserRole;
}

const AUTH_STORAGE_KEY = "anime-catalog-auth";
export const getStoredSession = (): AuthSession | null => {
  try {
    const raw = sessionStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as AuthSession;
    return value?.token && value?.username && (value.role === "ADMIN" || value.role === "STANDARD") ? value : null;
  } catch { return null; }
};

export const saveSession = (session: AuthSession) => sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
export const clearSession = () => sessionStorage.removeItem(AUTH_STORAGE_KEY);

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api",
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const session = getStoredSession();
  if (session?.token) config.headers.Authorization = `Bearer ${session.token}`;
  return config;
});

function unwrapList<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === "object") {
    const obj = payload as Record<string, unknown>;
    if (Array.isArray(obj.content)) return obj.content as T[];
    if (Array.isArray(obj.data)) return obj.data as T[];
    if (Array.isArray(obj.items)) return obj.items as T[];
  }
  return [];
}

export const authApi = {
  login: async (username: string, password: string): Promise<AuthSession> => {
    const endpoint = import.meta.env.VITE_AUTH_ENDPOINT || "/auth/login";
    const { data } = await axios.post(`${api.defaults.baseURL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`, { username, password }, {
      headers: { "Content-Type": "application/json" },
    });
    const payload = (data?.data && typeof data.data === "object" ? data.data : data) as Record<string, any>;
    const user = (payload.user && typeof payload.user === "object" ? payload.user : payload) as Record<string, any>;
    const token = payload.token || payload.accessToken || payload.jwt || payload.access_token;
    const role = String(user.role || payload.role || "").toUpperCase() as UserRole;
    const resolvedUsername = user.username || payload.username || username;
    if (!token || (role !== "ADMIN" && role !== "STANDARD")) {
      throw new Error("The login response must include an access token and a user role (ADMIN or STANDARD). Check the backend login response contract.");
    }
    return { token, username: resolvedUsername, name: user.name || user.fullName || resolvedUsername, role };
  },
};

export const animeApi = {
  list: async (search = "") => unwrapList<Anime>((await api.get("/anime", {
    params: search ? { title: search } : undefined,
  })).data),
  create: async (body: AnimeInput) => (await api.post("/anime", body)).data,
  update: async (id: number, body: AnimeInput) => (await api.put(`/anime/${id}`, body)).data,
  remove: async (id: number) => api.delete(`/anime/${id}`),
};

export const genreApi = {
  list: async (search = "") => unwrapList<Genre>((await api.get("/genres", {
    params: search ? { search } : undefined,
  })).data),
  create: async (body: GenreInput) => (await api.post("/genres", body)).data,
  update: async (id: number, body: GenreInput) => (await api.put(`/genres/${id}`, body)).data,
  remove: async (id: number) => api.delete(`/genres/${id}`),
};

export const userApi = {
  list: async (search = "") => unwrapList<CatalogUser>((await api.get("/admin/users", {
    params: search ? { search } : undefined,
  })).data),
  create: async (body: UserInput) => (await api.post("/admin/users", body)).data,
  update: async (id: number, body: UserInput) => (await api.put(`/admin/users/${id}`, body)).data,
  remove: async (id: number) => api.delete(`/admin/users/${id}`),
};
