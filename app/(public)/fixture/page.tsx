import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ETIQUETA_ESTADO } from "@/lib/liga/types";

type PartidoFila = {
  id: string;
  fecha_hora: string | null;
  cancha: string | null;
  fecha_numero: number | null;
  llave: string | null;
  estado: "programado" | "en_vivo" | "finalizado" | "suspendido";
  goles_local: number;
  goles_visitante: number;
  equipo_local: { id: string; nombre: string } | null;
  equipo_visitante: { id: string; nombre: string } | null;
};

const ZONA_HORARIA = "America/Argentina/Cordoba";

function formatearFecha(fechaIso: string | null) {
  if (!fechaIso) return "Sin fecha";
  return new Date(fechaIso).toLocaleString("es-AR", {
    timeZone: ZONA_HORARIA,
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Clave YYYY-MM-DD en huso horario local, para agrupar partidos por día. */
function claveDia(fechaIso: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA_HORARIA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(fechaIso));
}

function etiquetaDiaCorta(fechaIso: string) {
  const partes = new Intl.DateTimeFormat("es-AR", {
    timeZone: ZONA_HORARIA,
    weekday: "short",
    day: "2-digit",
  }).formatToParts(new Date(fechaIso));
  const dia = partes.find((p) => p.type === "weekday")?.value.replace(".", "") ?? "";
  const numero = partes.find((p) => p.type === "day")?.value ?? "";
  return { dia: dia.toUpperCase(), numero };
}

export default async function FixturePublicoPage({
  searchParams,
}: {
  searchParams: Promise<{ categoria?: string; dia?: string }>;
}) {
  const supabase = await createClient();
  const { categoria: categoriaParam, dia: diaSeleccionado } = await searchParams;

  const { data: categorias } = await supabase.from("categorias").select("id, nombre").order("orden");
  const categoriaId = categoriaParam || categorias?.[0]?.id;

  const { data: temporadaActiva } = await supabase
    .from("temporadas")
    .select("id, nombre")
    .eq("activa", true)
    .maybeSingle();

  let partidos: PartidoFila[] = [];

  if (categoriaId && temporadaActiva) {
    const { data: fases } = await supabase
      .from("fases")
      .select("id")
      .eq("temporada_id", temporadaActiva.id)
      .eq("categoria_id", categoriaId);

    const faseIds = (fases ?? []).map((f) => f.id);

    if (faseIds.length > 0) {
      const { data: partidosData } = await supabase
        .from("partidos")
        .select(
          `id, fecha_hora, cancha, fecha_numero, llave, estado, goles_local, goles_visitante,
           equipo_local:equipos!partidos_equipo_local_id_fkey(id, nombre),
           equipo_visitante:equipos!partidos_equipo_visitante_id_fkey(id, nombre)`,
        )
        .in("fase_id", faseIds)
        .order("fecha_hora", { ascending: true, nullsFirst: false });
      partidos = (partidosData as unknown as PartidoFila[]) ?? [];
    }
  }

  const proximos = partidos.filter((p) => p.estado === "programado" || p.estado === "en_vivo");
  const resultados = partidos.filter((p) => p.estado === "finalizado" || p.estado === "suspendido");

  // Días con partidos próximos, en orden, sin repetir.
  const diasVistos = new Set<string>();
  const diasDisponibles: { clave: string; dia: string; numero: string }[] = [];
  proximos.forEach((p) => {
    if (!p.fecha_hora) return;
    const clave = claveDia(p.fecha_hora);
    if (diasVistos.has(clave)) return;
    diasVistos.add(clave);
    diasDisponibles.push({ clave, ...etiquetaDiaCorta(p.fecha_hora) });
  });

  const proximosFiltrados = diaSeleccionado
    ? proximos.filter((p) => p.fecha_hora && claveDia(p.fecha_hora) === diaSeleccionado)
    : proximos;

  return (
    <>
      <h1>Fixture</h1>

      {categorias && categorias.length > 0 && (
        <div className="chip-row">
          {categorias.map((c) => (
            <Link
              key={c.id}
              href={`/fixture?categoria=${c.id}`}
              className={`chip ${c.id === categoriaId ? "chip-active" : ""}`}
            >
              {c.nombre}
            </Link>
          ))}
        </div>
      )}

      {!temporadaActiva && <p className="muted">No hay ninguna temporada activa por el momento.</p>}

      {diasDisponibles.length > 0 && (
        <div className="dia-selector">
          <Link
            href={`/fixture?categoria=${categoriaId}`}
            className={`dia-pill dia-pill-todos ${!diaSeleccionado ? "dia-pill-active" : ""}`}
          >
            <span className="dia-pill-label">Todos</span>
          </Link>
          {diasDisponibles.map((d) => (
            <Link
              key={d.clave}
              href={`/fixture?categoria=${categoriaId}&dia=${d.clave}`}
              className={`dia-pill ${diaSeleccionado === d.clave ? "dia-pill-active" : ""}`}
            >
              <span className="dia-pill-weekday">{d.dia}</span>
              <span className="dia-pill-number">{d.numero}</span>
            </Link>
          ))}
        </div>
      )}

      <h2>Próximos partidos</h2>
      {proximosFiltrados.length > 0 ? (
        <div className="ticket-list">
          {proximosFiltrados.map((partido) => (
            <Link key={partido.id} href={`/partidos/${partido.id}`} className={`ticket ${partido.estado === "en_vivo" ? "ticket-live" : ""}`}>
              <div className="ticket-main">
                <div className="ticket-teams">
                  <span className="ticket-team">{partido.equipo_local?.nombre ?? "?"}</span>
                  <span className="ticket-vs">vs</span>
                  <span className="ticket-team">{partido.equipo_visitante?.nombre ?? "?"}</span>
                </div>
                <span className="ticket-meta">
                  {partido.fecha_numero ? `Fecha ${partido.fecha_numero} · ` : ""}
                  {partido.llave ? `${partido.llave} · ` : ""}
                  {formatearFecha(partido.fecha_hora)}
                  {partido.cancha ? ` · ${partido.cancha}` : ""}
                </span>
              </div>
              <div className="ticket-stub">
                <span className={`badge ${partido.estado === "en_vivo" ? "badge-live" : ""}`}>
                  {ETIQUETA_ESTADO[partido.estado]}
                </span>
                <span className="ticket-cta">{partido.estado === "en_vivo" ? "Ver ahora" : "Ver"}</span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <p className="empty-state">
          {diaSeleccionado ? "No hay partidos ese día." : "No hay partidos programados en esta categoría."}
        </p>
      )}

      <h2>Resultados</h2>
      {resultados.length > 0 ? (
        <div className="ticket-list">
          {resultados.map((partido) => (
            <Link key={partido.id} href={`/partidos/${partido.id}`} className="ticket">
              <div className="ticket-main">
                <div className="ticket-teams">
                  <span className="ticket-team">{partido.equipo_local?.nombre ?? "?"}</span>
                  <span className="ticket-score">{partido.goles_local} - {partido.goles_visitante}</span>
                  <span className="ticket-team">{partido.equipo_visitante?.nombre ?? "?"}</span>
                </div>
                <span className="ticket-meta">
                  {partido.fecha_numero ? `Fecha ${partido.fecha_numero} · ` : ""}
                  {partido.llave ? `${partido.llave} · ` : ""}
                  {ETIQUETA_ESTADO[partido.estado]}
                </span>
              </div>
              <div className="ticket-stub">
                <span className="ticket-cta">Ver</span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <p className="empty-state">Todavía no hay resultados.</p>
      )}
    </>
  );
}
