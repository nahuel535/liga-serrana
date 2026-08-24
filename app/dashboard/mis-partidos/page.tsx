import Link from "next/link";
import { requireSesion, exigirRol } from "@/lib/liga/auth";

type PartidoFila = {
  id: string;
  fecha_hora: string | null;
  cancha: string | null;
  fecha_numero: number | null;
  llave: string | null;
  estado: "programado" | "en_vivo" | "finalizado" | "suspendido";
  goles_local: number;
  goles_visitante: number;
  fase: { nombre: string; categoria: { nombre: string } } | null;
  equipo_local: { nombre: string } | null;
  equipo_visitante: { nombre: string } | null;
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

export default async function MisPartidosPage() {
  const { supabase, perfil } = await requireSesion();
  exigirRol(perfil, ["planillero"]);

  const { data: partidosData } = await supabase
    .from("partidos")
    .select(
      `id, fecha_hora, cancha, fecha_numero, llave, estado, goles_local, goles_visitante,
       fase:fases(nombre, categoria:categorias(nombre)),
       equipo_local:equipos!partidos_equipo_local_id_fkey(nombre),
       equipo_visitante:equipos!partidos_equipo_visitante_id_fkey(nombre)`,
    )
    .eq("planillero_id", perfil.id)
    .order("fecha_hora", { ascending: true, nullsFirst: false });

  const partidos = (partidosData as unknown as PartidoFila[]) ?? [];
  const enVivo = partidos.filter((p) => p.estado === "en_vivo");
  const proximos = partidos.filter((p) => p.estado === "programado");
  const finalizados = partidos
    .filter((p) => p.estado === "finalizado" || p.estado === "suspendido")
    .sort((a, b) => (b.fecha_hora ?? "").localeCompare(a.fecha_hora ?? ""));

  return (
    <section className="dashboard-grid">
      <article className="panel">
        <h1>Mis partidos</h1>
        <p className="muted">Acá aparecen únicamente los partidos que tenés asignados como planillero.</p>

        {enVivo.length > 0 && (
          <>
            <h2>En vivo ahora</h2>
            <ul className="list">
              {enVivo.map((p) => (
                <li key={p.id} className="partido-row">
                  <div>
                    <span className="badge badge-live">En vivo</span>
                    <strong>
                      {p.equipo_local?.nombre ?? "?"} {p.goles_local} - {p.goles_visitante} {p.equipo_visitante?.nombre ?? "?"}
                    </strong>
                    <span className="muted">
                      {p.fase?.categoria?.nombre} · {p.fase?.nombre}
                      {p.cancha ? ` · ${p.cancha}` : ""}
                    </span>
                  </div>
                  <Link className="button button-primary" href={`/dashboard/partidos/${p.id}/vivo`}>
                    Continuar
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}

        <h2>Próximos</h2>
        {proximos.length > 0 ? (
          <ul className="list">
            {proximos.map((p) => (
              <li key={p.id} className="partido-row">
                <div>
                  <strong>{p.equipo_local?.nombre ?? "?"} vs {p.equipo_visitante?.nombre ?? "?"}</strong>
                  <span className="muted">
                    {p.fase?.categoria?.nombre} · {p.fase?.nombre}
                    {p.fecha_numero ? ` · Fecha ${p.fecha_numero}` : ""}
                    {p.llave ? ` · ${p.llave}` : ""}
                    {" · "}{formatearFecha(p.fecha_hora)}
                    {p.cancha ? ` · ${p.cancha}` : ""}
                  </span>
                </div>
                <Link className="button button-secondary" href={`/dashboard/partidos/${p.id}/vivo`}>
                  Planilla
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">No tenés partidos programados por ahora.</p>
        )}

        <h2>Ya planillados</h2>
        {finalizados.length > 0 ? (
          <ul className="list">
            {finalizados.slice(0, 10).map((p) => (
              <li key={p.id} className="partido-row">
                <div>
                  <strong>
                    {p.equipo_local?.nombre ?? "?"} {p.goles_local} - {p.goles_visitante} {p.equipo_visitante?.nombre ?? "?"}
                  </strong>
                  <span className="muted">
                    {p.fase?.categoria?.nombre} · {p.fase?.nombre}
                    {p.fecha_numero ? ` · Fecha ${p.fecha_numero}` : ""}
                  </span>
                </div>
                <Link className="button button-secondary" href={`/dashboard/partidos/${p.id}/vivo`}>
                  Ver
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">Todavía no planillaste ningún partido.</p>
        )}
      </article>
    </section>
  );
}
