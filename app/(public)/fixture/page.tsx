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
    <article className="panel">
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
        <ul className="list">
          {proximos.map((partido) => (
            <li key={partido.id} className="partido-row">
              <div>
                <span className={`badge ${partido.estado === "en_vivo" ? "badge-live" : ""}`}>
                  {ETIQUETA_ESTADO[partido.estado]}
                </span>
                <strong>
                  {partido.equipo_local?.nombre ?? "?"} vs {partido.equipo_visitante?.nombre ?? "?"}
                </strong>
                <span className="muted">
                  {partido.fecha_numero ? `Fecha ${partido.fecha_numero} · ` : ""}
                  {partido.llave ? `${partido.llave} · ` : ""}
                  {formatearFecha(partido.fecha_hora)}
                  {partido.cancha ? ` · ${partido.cancha}` : ""}
                </span>
              </div>
              <Link className="button button-secondary" href={`/partidos/${partido.id}`}>
                {partido.estado === "en_vivo" ? "Ver en vivo" : "Ver"}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">No hay partidos programados en esta categoría.</p>
      )}

      <h2>Resultados</h2>
      {resultados.length > 0 ? (
        <ul className="list">
          {resultados.map((partido) => (
            <li key={partido.id} className="partido-row">
              <div>
                <strong>
                  {partido.equipo_local?.nombre ?? "?"} {partido.goles_local} - {partido.goles_visitante}{" "}
                  {partido.equipo_visitante?.nombre ?? "?"}
                </strong>
                <span className="muted">
                  {partido.fecha_numero ? `Fecha ${partido.fecha_numero} · ` : ""}
                  {partido.llave ? `${partido.llave} · ` : ""}
                  {ETIQUETA_ESTADO[partido.estado]}
                </span>
              </div>
              <Link className="button button-secondary" href={`/partidos/${partido.id}`}>Ver</Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">Todavía no hay resultados.</p>
      )}
    </article>
  );
}
