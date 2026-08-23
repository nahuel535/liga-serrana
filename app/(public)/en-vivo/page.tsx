import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function EnVivoPage() {
  const supabase = await createClient();

  const { data: partidos } = await supabase
    .from("partidos")
    .select(
      `id, goles_local, goles_visitante, cancha,
       fase:fases(nombre, categoria:categorias(nombre)),
       equipo_local:equipos!partidos_equipo_local_id_fkey(nombre),
       equipo_visitante:equipos!partidos_equipo_visitante_id_fkey(nombre)`,
    )
    .eq("estado", "en_vivo")
    .order("fecha_hora", { ascending: true });

  return (
    <>
      <h1>En vivo</h1>

      {partidos && partidos.length > 0 ? (
        <div className="ticket-list">
          {partidos.map((partido) => {
            const fase = partido.fase as unknown as { nombre: string; categoria: { nombre: string } } | null;
            const local = partido.equipo_local as unknown as { nombre: string } | null;
            const visitante = partido.equipo_visitante as unknown as { nombre: string } | null;
            return (
              <Link key={partido.id} href={`/partidos/${partido.id}`} className="ticket ticket-live">
                <div className="ticket-main">
                  <div className="ticket-teams">
                    <span className="ticket-team">{local?.nombre ?? "?"}</span>
                    <span className="ticket-score">{partido.goles_local} - {partido.goles_visitante}</span>
                    <span className="ticket-team">{visitante?.nombre ?? "?"}</span>
                  </div>
                  <span className="ticket-meta">
                    {fase?.categoria?.nombre} · {fase?.nombre}
                    {partido.cancha ? ` · ${partido.cancha}` : ""}
                  </span>
                </div>
                <div className="ticket-stub">
                  <span className="badge badge-live">En vivo</span>
                  <span className="ticket-cta">Ver ahora</span>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <p className="empty-state">
          No hay ningún partido en vivo en este momento.<br />
          Mirá el <Link href="/fixture" style={{ color: "var(--accent)" }}>fixture</Link> para ver los próximos.
        </p>
      )}
    </>
  );
}
