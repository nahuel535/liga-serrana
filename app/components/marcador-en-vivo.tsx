"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ETIQUETA_ESTADO, ETIQUETA_EVENTO, type EventoTipo, type PartidoEstado } from "@/lib/liga/types";

type EventoRealtime = {
  id: string;
  partido_id: string;
  jugador_id: string;
  equipo_id: string;
  tipo: EventoTipo;
  minuto: number | null;
};

export default function MarcadorEnVivo({
  partidoId,
  equipoLocalId,
  equipoLocalNombre,
  equipoVisitanteId,
  equipoVisitanteNombre,
  golesLocalInicial,
  golesVisitanteInicial,
  estadoInicial,
  eventosIniciales,
  jugadoresPorId,
  puedeEditar = false,
  onBorrarEvento,
}: {
  partidoId: string;
  equipoLocalId: string;
  equipoLocalNombre: string;
  equipoVisitanteId: string;
  equipoVisitanteNombre: string;
  golesLocalInicial: number;
  golesVisitanteInicial: number;
  estadoInicial: PartidoEstado;
  eventosIniciales: EventoRealtime[];
  jugadoresPorId: Record<string, string>;
  puedeEditar?: boolean;
  onBorrarEvento?: (eventoId: string, partidoId: string) => Promise<void> | void;
}) {
  const [golesLocal, setGolesLocal] = useState(golesLocalInicial);
  const [golesVisitante, setGolesVisitante] = useState(golesVisitanteInicial);
  const [estado, setEstado] = useState<PartidoEstado>(estadoInicial);
  const [eventos, setEventos] = useState<EventoRealtime[]>(eventosIniciales);

  useEffect(() => {
    const supabase = createClient();

    const canal = supabase
      .channel(`partido-${partidoId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "partidos", filter: `id=eq.${partidoId}` },
        (payload) => {
          const nuevo = payload.new as { goles_local: number; goles_visitante: number; estado: PartidoEstado };
          setGolesLocal(nuevo.goles_local);
          setGolesVisitante(nuevo.goles_visitante);
          setEstado(nuevo.estado);
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "eventos_partido", filter: `partido_id=eq.${partidoId}` },
        (payload) => {
          setEventos((prev) => [...prev, payload.new as EventoRealtime]);
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "eventos_partido", filter: `partido_id=eq.${partidoId}` },
        (payload) => {
          const borrado = payload.old as { id: string };
          setEventos((prev) => prev.filter((e) => e.id !== borrado.id));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [partidoId]);

  const nombreEquipo = (equipoId: string) =>
    equipoId === equipoLocalId ? equipoLocalNombre : equipoVisitanteNombre;

  return (
    <div>
      <div className="marcador">
        <span className="marcador-equipo">{equipoLocalNombre}</span>
        <span className="marcador-resultado">{golesLocal} - {golesVisitante}</span>
        <span className="marcador-equipo">{equipoVisitanteNombre}</span>
      </div>
      <div className="marcador-estado">
        <span className={`badge ${estado === "en_vivo" ? "badge-live" : ""}`}>{ETIQUETA_ESTADO[estado]}</span>
      </div>

      <h2>Planilla</h2>
      {eventos.length > 0 ? (
        <ul className="list">
          {[...eventos]
            .sort((a, b) => (a.minuto ?? 0) - (b.minuto ?? 0))
            .map((evento) => (
              <li key={evento.id} className="list-row">
                <span>
                  {evento.minuto != null ? `${evento.minuto}' · ` : ""}
                  {ETIQUETA_EVENTO[evento.tipo]} · {jugadoresPorId[evento.jugador_id] ?? "Jugador"} ({nombreEquipo(evento.equipo_id)})
                </span>
                {puedeEditar && onBorrarEvento && estado === "en_vivo" && (
                  <button
                    className="button button-secondary"
                    type="button"
                    onClick={() => onBorrarEvento(evento.id, partidoId)}
                  >
                    Borrar
                  </button>
                )}
              </li>
            ))}
        </ul>
      ) : (
        <p className="muted">Todavía no hay eventos cargados.</p>
      )}
    </div>
  );
}
