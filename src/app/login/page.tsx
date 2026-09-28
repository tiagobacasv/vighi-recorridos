"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { login, ApiError } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const user = await login(username, password);
      router.push(user.rol === "CADETE" ? "/cadete/" : "/dashboard/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo conectar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex-1 flex items-center justify-center p-4 bg-clinical-surface">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-clinical-border p-7 space-y-5"
      >
        <div className="text-center space-y-2">
          <Image src="/recorridos/logo.png" alt="CAP Vighi" width={56} height={56} className="mx-auto" />
          <div>
            <h1 className="text-lg font-bold uppercase tracking-tight text-clinical-blue">CAP Vighi</h1>
            <p className="text-sm text-clinical-slate">Recorridos · Iniciá sesión para continuar</p>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-clinical-blue" htmlFor="username">
            Usuario
          </label>
          <input
            id="username"
            type="text"
            required
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full rounded-lg border border-clinical-border px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-clinical-accent"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-clinical-blue" htmlFor="password">
            Contraseña
          </label>
          <input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-clinical-border px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-clinical-accent"
          />
        </div>

        {error && <p className="text-sm text-clinical-destructive">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-clinical-blue text-white font-medium py-2.5 shadow-sm hover:bg-clinical-blue/90 transition-colors disabled:opacity-50"
        >
          {loading ? "Ingresando..." : "Ingresar"}
        </button>
      </form>
    </main>
  );
}
