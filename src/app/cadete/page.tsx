"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { apiFetch, getUser, logout } from "@/lib/api";
import type { MotivoNoRealizada, Parada, TipoUrgencia } from "@/lib/types";

const POLL_MS = 8000;

function hoy() {
  return new Date().toISOString().slice(0, 10);
}

const MOTIVOS: { value: MotivoNoRealizada; label: string }[] = [
  { value: "TRAFICO", label: "Tráfico" },
  { value: "CERRADO", label: "Cerrado" },
  { value: "SIN_TIEMPO", label: "Sin tiempo" },
  { value: "CENTRO_AVISO_NO_PASAR", label: "El centro avisó que no hace falta pasar" },
  { value: "OTRO", label: "Otro" },
];

export default function CadetePage() {
  const router = useRouter();
  const [user] = useState(() => getUser());
  const [paradas, setParadas] = useState<Parada[]>([]);
  const [tiposUrgencia, setTiposUrgencia] = useState<TipoUrgencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [seleccionada, setSeleccionada] = useState<Parada | null>(null);
  const [modo, setModo] = useState<"realizar" | "no-realizar" | null>(null);
  const lastFetchRef = useRef<string>(new Date(0).toISOString());

  useEffect(() => {
    if (!user) { router.replace("/login/"); return; }
    if (user.rol !== "CADETE") { router.replace("/dashboard/"); return; }
  }, [user, router]);

  const cargar = useCallback(async (full: boolean) => {
    const since = full ? null : lastFetchRef.current;
    const url = `/paradas?fecha=${hoy()}${since ? `&updatedSince=${encodeURIComponent(since)}` : ""}`;
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
  }, []);

  useEffect(() => {
    if (!user || user.rol !== "CADETE") return;
    cargar(true);
    apiFetch<TipoUrgencia[]>("/tipos-urgencia").then(setTiposUrgencia).catch(() => {});
    apiFetch("/cadete-recorridos/iniciar", { method: "POST" }).catch(() => {});
    const interval = setInterval(() => cargar(false), POLL_MS);
    return () => clearInterval(interval);
  }, [user, cargar]);

  async function tomar(id: number) {
    try {
      await apiFetch(`/paradas/${id}/tomar`, { method: "POST" });
      await cargar(true);
    } catch {
      await cargar(true);
    }
  }

  function cerrarModal() {
    setSeleccionada(null);
    setModo(null);
  }

  async function onGuardado() {
    cerrarModal();
    await cargar(true);
  }

  if (!user || user.rol !== "CADETE") return null;

  const disponibles = paradas.filter(
    (p) => p.estado === "PENDIENTE" && p.idCadete === null && (p.sanatorio.tipoVisita === "RUTINA" || p.confirmadaAt !== null)
  );
  const esperandoAviso = paradas.filter(
    (p) => p.estado === "PENDIENTE" && p.idCadete === null && p.sanatorio.tipoVisita === "A_DEMANDA" && p.confirmadaAt === null
  );
  const mias = paradas.filter((p) => p.estado === "PENDIENTE" && p.idCadete === user.id);
  const completadas = paradas.filter((p) => p.estado !== "PENDIENTE" && p.idCadete === user.id);

  return (
    <div className="flex-1 flex flex-col bg-clinical-surface">
      <header className="bg-white border-b border-clinical-border px-4 py-2.5 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2.5">
          <Image src="/recorridos/logo.png" alt="CAP Vighi" width={36} height={36} />
          <div>
            <p className="font-semibold leading-tight text-clinical-blue text-sm">{user.nombre || user.username}</p>
            <p className="text-xs text-clinical-slate">{hoy()}</p>
          </div>
        </div>
        <button onClick={logout} className="text-sm font-medium text-clinical-accent">
          Salir
        </button>
      </header>

      <main className="flex-1 p-3 space-y-5 pb-8">
        {loading && <p className="text-center text-clinical-slate py-8">Cargando...</p>}

        {!loading && mias.length > 0 && (
          <Seccion titulo={`Mis paradas (${mias.length})`}>
            {mias.map((p) => (
              <TarjetaParada key={p.id} parada={p} destacada onClick={() => setSeleccionada(p)} />
            ))}
          </Seccion>
        )}

        {!loading && (
          <Seccion titulo={`Disponibles (${disponibles.length})`}>
            {disponibles.length === 0 && <p className="text-sm text-clinical-slate px-1">Sin paradas disponibles por ahora.</p>}
            {disponibles.map((p) => (
              <TarjetaParada key={p.id} parada={p} onClick={() => tomar(p.id)} accion="Tomar" />
            ))}
          </Seccion>
        )}

        {!loading && esperandoAviso.length > 0 && (
          <Seccion titulo={`Esperando aviso (${esperandoAviso.length})`}>
            {esperandoAviso.map((p) => (
              <TarjetaParada key={p.id} parada={p} atenuada />
            ))}
          </Seccion>
        )}

        {!loading && completadas.length > 0 && (
          <Seccion titulo={`Hoy (${completadas.length})`}>
            {completadas.map((p) => (
              <TarjetaParada key={p.id} parada={p} atenuada />
            ))}
          </Seccion>
        )}
      </main>

      {seleccionada && modo === null && (
        <ModalAcciones
          parada={seleccionada}
          onCerrar={cerrarModal}
          onRealizar={() => setModo("realizar")}
          onNoRealizar={() => setModo("no-realizar")}
        />
      )}
      {seleccionada && modo === "realizar" && (
        <FormRealizar parada={seleccionada} tiposUrgencia={tiposUrgencia} onCerrar={cerrarModal} onGuardado={onGuardado} />
      )}
      {seleccionada && modo === "no-realizar" && (
        <FormNoRealizar parada={seleccionada} onCerrar={cerrarModal} onGuardado={onGuardado} />
      )}
    </div>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold text-clinical-slate px-1">{titulo}</h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function TarjetaParada({
  parada,
  onClick,
  accion,
  destacada,
  atenuada,
}: {
  parada: Parada;
  onClick?: () => void;
  accion?: string;
  destacada?: boolean;
  atenuada?: boolean;
}) {
  const urgente = parada.muestrasUrgentes.length > 0;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`w-full text-left rounded-xl border p-3 flex items-center justify-between gap-3 ${
        destacada ? "border-clinical-blue bg-clinical-blue/5" : "border-clinical-border bg-white"
      } ${atenuada ? "opacity-60" : ""} ${onClick ? "active:scale-[0.99]" : ""}`}
    >
      <div className="min-w-0">
        <p className="font-medium text-clinical-blue truncate">{parada.sanatorio.nombre}</p>
        {parada.sanatorio.zona && <p className="text-xs text-clinical-slate">{parada.sanatorio.zona}</p>}
        {parada.sanatorio.infoAdicional && (
          <p className="text-xs text-clinical-slate mt-0.5">ⓘ {parada.sanatorio.infoAdicional}</p>
        )}
        {parada.estado === "NO_REALIZADA" && (
          <p className="text-xs text-clinical-destructive mt-0.5">No realizada — {parada.motivoNoRealizada}</p>
        )}
        {parada.estado === "REALIZADA" && (
          <p className="text-xs text-green-700 mt-0.5">
            {parada.cantidadPaps} PAPs · {parada.cantidadBiopsias} biopsias{urgente ? " · urgente" : ""}
          </p>
        )}
      </div>
      {accion && <span className="shrink-0 text-sm font-medium text-clinical-blue">{accion}</span>}
    </button>
  );
}

function Sheet({ children, onCerrar }: { children: React.ReactNode; onCerrar: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center sm:justify-center z-20" onClick={onCerrar}>
      <div
        className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md p-4 space-y-4 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

function ModalAcciones({
  parada,
  onCerrar,
  onRealizar,
  onNoRealizar,
}: {
  parada: Parada;
  onCerrar: () => void;
  onRealizar: () => void;
  onNoRealizar: () => void;
}) {
  return (
    <Sheet onCerrar={onCerrar}>
      <h3 className="font-semibold text-clinical-blue">{parada.sanatorio.nombre}</h3>
      {parada.sanatorio.infoAdicional && <p className="text-sm text-clinical-slate">ⓘ {parada.sanatorio.infoAdicional}</p>}
      <div className="space-y-2 pt-2">
        <button onClick={onRealizar} className="w-full rounded-lg bg-clinical-blue text-white font-medium py-2.5">
          Marcar como realizada
        </button>
        <button onClick={onNoRealizar} className="w-full rounded-lg border border-clinical-border text-clinical-blue font-medium py-2.5">
          No pude ir
        </button>
        <button onClick={onCerrar} className="w-full text-clinical-slate text-sm py-1">
          Cancelar
        </button>
      </div>
    </Sheet>
  );
}

function FormRealizar({
  parada,
  tiposUrgencia,
  onCerrar,
  onGuardado,
}: {
  parada: Parada;
  tiposUrgencia: TipoUrgencia[];
  onCerrar: () => void;
  onGuardado: () => void;
}) {
  const [paps, setPaps] = useState("0");
  const [biopsias, setBiopsias] = useState("0");
  const [tieneUrgente, setTieneUrgente] = useState(false);
  const [seleccionUrgencias, setSeleccionUrgencias] = useState<Record<number, string>>({});
  const [guardando, setGuardando] = useState(false);

  function toggleUrgencia(id: number) {
    setSeleccionUrgencias((prev) => {
      const next = { ...prev };
      if (id in next) delete next[id];
      else next[id] = "";
      return next;
    });
  }

  async function guardar() {
    setGuardando(true);
    try {
      const urgencias = Object.entries(seleccionUrgencias).map(([idTipo, cantidad]) => ({
        idTipo: Number(idTipo),
        cantidad: cantidad.trim() === "" ? null : Number(cantidad),
      }));
      await apiFetch(`/paradas/${parada.id}/realizar`, {
        method: "PUT",
        body: JSON.stringify({
          cantidadPaps: Number(paps) || 0,
          cantidadBiopsias: Number(biopsias) || 0,
          urgencias: tieneUrgente ? urgencias : [],
        }),
      });
      onGuardado();
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Sheet onCerrar={onCerrar}>
      <h3 className="font-semibold text-clinical-blue">{parada.sanatorio.nombre}</h3>

      <div className="grid grid-cols-2 gap-3">
        <Campo label="Cantidad de PAPs">
          <input
            type="number"
            min={0}
            inputMode="numeric"
            value={paps}
            onChange={(e) => setPaps(e.target.value)}
            className="w-full rounded-lg border border-clinical-border px-3 py-2.5 text-base"
          />
        </Campo>
        <Campo label="Cantidad de biopsias">
          <input
            type="number"
            min={0}
            inputMode="numeric"
            value={biopsias}
            onChange={(e) => setBiopsias(e.target.value)}
            className="w-full rounded-lg border border-clinical-border px-3 py-2.5 text-base"
          />
        </Campo>
      </div>

      <label className="flex items-center gap-2 text-sm font-medium text-clinical-blue">
        <input type="checkbox" checked={tieneUrgente} onChange={(e) => setTieneUrgente(e.target.checked)} className="w-4 h-4" />
        ¿Trajo alguna muestra urgente?
      </label>

      {tieneUrgente && (
        <div className="space-y-2 pl-1">
          {tiposUrgencia.map((t) => {
            const marcado = t.id in seleccionUrgencias;
            return (
              <div key={t.id} className="flex items-center gap-2">
                <label className="flex items-center gap-2 text-sm text-clinical-blue flex-1">
                  <input type="checkbox" checked={marcado} onChange={() => toggleUrgencia(t.id)} className="w-4 h-4" />
                  {t.nombre}
                </label>
                {marcado && (
                  <input
                    type="number"
                    min={0}
                    inputMode="numeric"
                    placeholder="Cantidad (si sabe)"
                    value={seleccionUrgencias[t.id]}
                    onChange={(e) => setSeleccionUrgencias((prev) => ({ ...prev, [t.id]: e.target.value }))}
                    className="w-32 rounded-lg border border-clinical-border px-2 py-1.5 text-sm"
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <button onClick={onCerrar} className="flex-1 rounded-lg border border-clinical-border text-clinical-blue font-medium py-2.5">
          Cancelar
        </button>
        <button
          onClick={guardar}
          disabled={guardando}
          className="flex-1 rounded-lg bg-clinical-blue text-white font-medium py-2.5 disabled:opacity-50"
        >
          {guardando ? "Guardando..." : "Guardar"}
        </button>
      </div>
    </Sheet>
  );
}

function FormNoRealizar({ parada, onCerrar, onGuardado }: { parada: Parada; onCerrar: () => void; onGuardado: () => void }) {
  const [motivo, setMotivo] = useState<MotivoNoRealizada>("TRAFICO");
  const [reprogramar, setReprogramar] = useState(false);
  const [fecha, setFecha] = useState("");
  const [guardando, setGuardando] = useState(false);

  async function guardar() {
    setGuardando(true);
    try {
      await apiFetch(`/paradas/${parada.id}/no-realizar`, {
        method: "PUT",
        body: JSON.stringify({
          motivo,
          reprogramarFecha: reprogramar && fecha ? fecha : undefined,
        }),
      });
      onGuardado();
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Sheet onCerrar={onCerrar}>
      <h3 className="font-semibold text-clinical-blue">{parada.sanatorio.nombre}</h3>
      <Campo label="Motivo">
        <select
          value={motivo}
          onChange={(e) => setMotivo(e.target.value as MotivoNoRealizada)}
          className="w-full rounded-lg border border-clinical-border px-3 py-2.5 text-base bg-white"
        >
          {MOTIVOS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </Campo>

      <label className="flex items-center gap-2 text-sm font-medium text-clinical-blue">
        <input type="checkbox" checked={reprogramar} onChange={(e) => setReprogramar(e.target.checked)} className="w-4 h-4" />
        Reprogramar para otro día
      </label>
      {reprogramar && (
        <input
          type="date"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          className="w-full rounded-lg border border-clinical-border px-3 py-2.5 text-base"
        />
      )}

      <div className="flex gap-2 pt-2">
        <button onClick={onCerrar} className="flex-1 rounded-lg border border-clinical-border text-clinical-blue font-medium py-2.5">
          Cancelar
        </button>
        <button
          onClick={guardar}
          disabled={guardando}
          className="flex-1 rounded-lg bg-clinical-blue text-white font-medium py-2.5 disabled:opacity-50"
        >
          {guardando ? "Guardando..." : "Guardar"}
        </button>
      </div>
    </Sheet>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium text-clinical-blue">{label}</label>
      {children}
    </div>
  );
}
