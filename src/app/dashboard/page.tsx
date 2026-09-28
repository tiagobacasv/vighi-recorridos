"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { apiFetch, getUser, logout } from "@/lib/api";
import type { EstadoParada, Parada } from "@/lib/types";

const POLL_MS = 6000;

function hoy() {
  return new Date().toISOString().slice(0, 10);
}

const ESTADO_LABEL: Record<EstadoParada, string> = {
  PENDIENTE: "Pendiente",
  REALIZADA: "Realizada",
  NO_REALIZADA: "No realizada",
};

const ESTADO_COLOR: Record<EstadoParada, string> = {
  PENDIENTE: "bg-clinical-surface text-clinical-blue",
  REALIZADA: "bg-green-100 text-green-800",
  NO_REALIZADA: "bg-red-100 text-red-800",
};

export default function DashboardPage() {
  const router = useRouter();
  const [user] = useState(() => getUser());
  const [fecha, setFecha] = useState(hoy());
  const [paradas, setParadas] = useState<Parada[]>([]);
  const [loading, setLoading] = useState(true);
  const [generando, setGenerando] = useState(false);
  const lastFetchRef = useRef<string>(new Date(0).toISOString());

  useEffect(() => {
    if (!user) { router.replace("/login/"); return; }
    if (user.rol === "CADETE") { router.replace("/cadete/"); return; }
  }, [user, router]);

  const cargar = useCallback(async (full: boolean) => {
    const since = full ? null : lastFetchRef.current;
    const url = `/paradas?fecha=${fecha}${since ? `&updatedSince=${encodeURIComponent(since)}` : ""}`;
    const nowIso = new Date().toISOString();
    try {
      const data = await apiFetch<Parada[]>(url);
      lastFetchRef.current = nowIso;
      setParadas((prev) => {
        if (full) return data;
        const map = new Map(prev.map((p) => [p.id, p]));
        for (const p of data) map.set(p.id, p);
        return Array.from(map.values());
      });
    } finally {
      setLoading(false);
    }
  }, [fecha]);

  useEffect(() => {
    if (!user || user.rol === "CADETE") return;
    setLoading(true);
    lastFetchRef.current = new Date(0).toISOString();
    cargar(true);
    const interval = setInterval(() => cargar(false), POLL_MS);
    return () => clearInterval(interval);
  }, [user, cargar]);

  async function generar() {
    setGenerando(true);
    try {
      await apiFetch("/paradas/generar", { method: "POST", body: JSON.stringify({ fecha }) });
      await cargar(true);
    } finally {
      setGenerando(false);
    }
  }

  async function confirmarAviso(id: number) {
    await apiFetch(`/paradas/${id}/confirmar`, { method: "PUT" });
    await cargar(true);
  }

  if (!user || user.rol === "CADETE") return null;

  const pendientes = paradas.filter((p) => p.estado === "PENDIENTE");
  const realizadas = paradas.filter((p) => p.estado === "REALIZADA");
  const noRealizadas = paradas.filter((p) => p.estado === "NO_REALIZADA");
  const urgentes = paradas.filter((p) => p.muestrasUrgentes.length > 0);
  const esperandoAviso = paradas.filter((p) => p.sanatorio.tipoVisita === "A_DEMANDA" && p.confirmadaAt === null && p.estado === "PENDIENTE");

  const filas = [...paradas].sort((a, b) => a.sanatorio.nombre.localeCompare(b.sanatorio.nombre));

  return (
    <div className="flex-1 flex flex-col bg-clinical-surface">
      <header className="bg-white border-b border-clinical-border px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Image src="/recorridos/logo.png" alt="CAP Vighi" width={36} height={36} />
          <div>
            <p className="font-semibold leading-tight text-clinical-blue text-sm">Dashboard de recorridos</p>
            <p className="text-xs text-clinical-slate">{user.nombre || user.username}</p>
          </div>
        </div>
        <button onClick={logout} className="text-sm font-medium text-clinical-accent">
          Salir
        </button>
      </header>

      <main className="flex-1 p-4 space-y-4 max-w-5xl w-full mx-auto">
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="rounded-lg border border-clinical-border px-3 py-2 text-sm"
          />
          <button
            onClick={generar}
            disabled={generando}
            className="rounded-lg bg-clinical-blue text-white text-sm font-medium px-4 py-2 disabled:opacity-50"
          >
            {generando ? "Generando..." : "Generar paradas del día"}
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          <Stat label="Pendientes" value={pendientes.length} />
          <Stat label="Realizadas" value={realizadas.length} color="text-green-700" />
          <Stat label="No realizadas" value={noRealizadas.length} color="text-clinical-destructive" />
          <Stat label="Urgentes" value={urgentes.length} color="text-amber-700" />
          <Stat label="Esperando aviso" value={esperandoAviso.length} color="text-clinical-slate" />
        </div>

        {loading ? (
          <p className="text-center text-clinical-slate py-8">Cargando...</p>
        ) : (
          <div className="bg-white rounded-xl border border-clinical-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-clinical-surface text-clinical-slate text-left">
                <tr>
                  <th className="px-3 py-2 font-medium">Sanatorio</th>
                  <th className="px-3 py-2 font-medium">Cadete</th>
                  <th className="px-3 py-2 font-medium">Estado</th>
                  <th className="px-3 py-2 font-medium">PAPs</th>
                  <th className="px-3 py-2 font-medium">Biopsias</th>
                  <th className="px-3 py-2 font-medium">Urgente</th>
                  <th className="px-3 py-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {filas.map((p) => (
                  <tr key={p.id} className="border-t border-clinical-border">
                    <td className="px-3 py-2">
                      <p className="font-medium text-clinical-blue">{p.sanatorio.nombre}</p>
                      {p.sanatorio.zona && <p className="text-xs text-clinical-slate">{p.sanatorio.zona}</p>}
                      {p.estado === "NO_REALIZADA" && (
                        <p className="text-xs text-clinical-destructive">{p.motivoNoRealizada}</p>
                      )}
                    </td>
                    <td className="px-3 py-2 text-clinical-slate">{p.cadeteNombre ?? "—"}</td>
                    <td className="px-3 py-2">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${ESTADO_COLOR[p.estado]}`}>
                        {ESTADO_LABEL[p.estado]}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-clinical-blue">{p.estado === "REALIZADA" ? p.cantidadPaps : "—"}</td>
                    <td className="px-3 py-2 text-clinical-blue">{p.estado === "REALIZADA" ? p.cantidadBiopsias : "—"}</td>
                    <td className="px-3 py-2">
                      {p.muestrasUrgentes.length > 0 ? (
                        <span className="text-xs text-amber-700">
                          {p.muestrasUrgentes.map((u) => `${u.nombre}${u.cantidad != null ? ` (${u.cantidad})` : " (?)"}`).join(", ")}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {p.sanatorio.tipoVisita === "A_DEMANDA" && p.confirmadaAt === null && p.estado === "PENDIENTE" && (
                        <button
                          onClick={() => confirmarAviso(p.id)}
                          className="text-xs font-medium text-clinical-blue underline whitespace-nowrap"
                        >
                          Confirmar aviso
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {filas.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-3 py-8 text-center text-clinical-slate">
                      Sin paradas para esta fecha. Probá &quot;Generar paradas del día&quot;.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="bg-white rounded-xl border border-clinical-border p-3">
      <p className={`text-2xl font-bold ${color ?? "text-clinical-blue"}`}>{value}</p>
      <p className="text-xs text-clinical-slate">{label}</p>
    </div>
  );
}
