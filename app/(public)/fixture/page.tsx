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

function formatearFecha(fechaIso: string | null) {
  if (!fechaIso) return "Sin fecha";
  return new Date(fechaIso).toLocaleString("es-AR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function FixturePublicoPage({
  searchParams,
}: {
  searchParams: Promise<{ categoria?: string }>;
}) {
  const supabase = await createClient();
  const { categoria: categoriaParam } = await searchParams;

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

      <h2>Próximos partidos</h2>
      {proximos.length > 0 ? (
        <div className="ticket-list">
          {proximos.map((partido) => (
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
        <p className="empty-state">No hay partidos programados en esta categoría.</p>
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
