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
    <article className="panel">
      <h1>En vivo</h1>

      {partidos && partidos.length > 0 ? (
        <ul className="list">
          {partidos.map((partido) => {
            const fase = partido.fase as unknown as { nombre: string; categoria: { nombre: string } } | null;
            const local = partido.equipo_local as unknown as { nombre: string } | null;
            const visitante = partido.equipo_visitante as unknown as { nombre: string } | null;
            return (
              <li key={partido.id} className="partido-row">
                <div>
                  <span className="badge badge-live">En vivo</span>
                  <strong>
                    {local?.nombre ?? "?"} {partido.goles_local} - {partido.goles_visitante} {visitante?.nombre ?? "?"}
                  </strong>
                  <span className="muted">
                    {fase?.categoria?.nombre} · {fase?.nombre}
                    {partido.cancha ? ` · ${partido.cancha}` : ""}
                  </span>
                </div>
                <Link className="button button-primary" href={`/partidos/${partido.id}`}>Ver</Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="muted">
          No hay ningún partido en vivo en este momento. Mirá el{" "}
          <Link href="/fixture">fixture</Link> para ver los próximos.
        </p>
      )}
    </article>
  );
}
