import type { Usuario } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

const TOKEN_KEY = "vr_token";
const USER_KEY = "vr_user";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getUser(): Usuario | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  return raw ? (JSON.parse(raw) as Usuario) : null;
}

function saveSession(token: string, user: Usuario) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  window.location.href = "/recorridos/login/";
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

// El login no devuelve el id numerico directamente, pero viaja en el
// payload del JWT (campo "sub"). Se decodifica ahi en vez de tocar el Worker.
function decodeJwtSub(token: string): number {
  const payload = token.split(".")[1];
  const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
  return Number(JSON.parse(json).sub);
}

export async function login(username: string, password: string): Promise<Usuario> {
  const res = await fetch(`${API_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new ApiError(data.error ?? "Error al iniciar sesion", res.status);
  const user: Usuario = { id: decodeJwtSub(data.token), username: data.username, nombre: data.nombre, rol: data.rol };
  saveSession(data.token, user);
  return user;
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (res.status === 401) {
    logout();
    throw new ApiError("Sesion expirada", 401);
  }

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await res.json() : null;

  if (!res.ok) throw new ApiError((data && data.error) ?? "Error inesperado", res.status);
  return data as T;
}
