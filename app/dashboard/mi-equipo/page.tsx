import Link from "next/link";
import { requireSesion, exigirRol } from "@/lib/liga/auth";
import { ETIQUETA_ESTADO, ETIQUETA_MOTIVO_SANCION } from "@/lib/liga/types";
import { crearJugadorPropio, alternarHabilitadoPropio, vincularJugadorPropio } from "./actions";

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

export default async function MiEquipoPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { supabase, perfil } = await requireSesion();
  exigirRol(perfil, ["delegado"]);
  const { error } = await searchParams;

  const { data: equipo } = await supabase
    .from("equipos")
    .select("id, nombre, escudo_url")
    .eq("delegado_id", perfil.id)
    .maybeSingle();

  if (!equipo) {
    return (
      <section className="dashboard-grid">
        <article className="panel">
          <h1>Mi equipo</h1>
          <p className="muted">
            Todavía no te asignaron ningún equipo como delegado. Pedile al admin de la liga que te
            asigne desde la ficha del equipo correspondiente.
          </p>
        </article>
      </section>
    );
  }

  const [{ data: jugadores }, { data: inscripciones }, { data: sanciones }, { data: partidosData }, { data: perfilesJugador }] =
    await Promise.all([
      supabase
        .from("jugadores")
        .select("id, nombre_completo, dni, numero_camiseta, habilitado, profile_id")
        .eq("equipo_id", equipo.id)
        .order("numero_camiseta", { ascending: true, nullsFirst: false }),
      supabase
        .from("inscripciones")
        .select("id, categorias(nombre), temporadas(nombre)")
        .eq("equipo_id", equipo.id),
      supabase
        .from("sanciones")
        .select("id, jugador_id, motivo, partidos_totales, partidos_cumplidos")
        .eq("equipo_id", equipo.id)
        .eq("activa", true),
      supabase
        .from("partidos")
        .select(
          `id, fecha_hora, cancha, fecha_numero, llave, estado, goles_local, goles_visitante,
           fase:fases(nombre, categoria:categorias(nombre)),
           equipo_local:equipos!partidos_equipo_local_id_fkey(id, nombre),
           equipo_visitante:equipos!partidos_equipo_visitante_id_fkey(id, nombre)`,
        )
        .or(`equipo_local_id.eq.${equipo.id},equipo_visitante_id.eq.${equipo.id}`)
        .order("fecha_hora", { ascending: true, nullsFirst: false }),
      supabase.from("profiles").select("id, full_name").eq("role", "jugador").eq("active", true),
    ]);

  const partidos = (partidosData as unknown as PartidoFila[]) ?? [];
  const proximos = partidos.filter((p) => p.estado === "programado" || p.estado === "en_vivo");
  const resultados = partidos.filter((p) => p.estado === "finalizado" || p.estado === "suspendido");

  const sancionesPorJugador = new Map<string, { restantes: number; motivo: string }>();
  (sanciones ?? []).forEach((s) => {
    const restantes = s.partidos_totales - s.partidos_cumplidos;
    const previa = sancionesPorJugador.get(s.jugador_id);
    sancionesPorJugador.set(s.jugador_id, {
      restantes: (previa?.restantes ?? 0) + restantes,
      motivo: ETIQUETA_MOTIVO_SANCION[s.motivo as keyof typeof ETIQUETA_MOTIVO_SANCION] ?? s.motivo,
    });
  });

  return (
    <section className="dashboard-grid">
      <article className="panel">
        <h1>{equipo.nombre}</h1>

        <h2>Inscripciones</h2>
        {inscripciones && inscripciones.length > 0 ? (
          <ul className="list">
            {inscripciones.map((inscripcion) => (
              <li key={inscripcion.id} className="list-row">
                {/* @ts-expect-error -- join anidado de Supabase */}
                {inscripcion.categorias?.nombre} · {/* @ts-expect-error -- join anidado de Supabase */}
                {inscripcion.temporadas?.nombre}
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">Todavía no está inscripto en ninguna categoría.</p>
        )}

        <h2>Plantel</h2>
        {jugadores && jugadores.length > 0 ? (
          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                <th>Nombre</th>
                <th>DNI</th>
                <th>Estado</th>
                <th></th>
                <th>Suspensión</th>
                <th>Cuenta vinculada (carnet)</th>
              </tr>
            </thead>
            <tbody>
              {jugadores.map((jugador) => {
                const sancion = sancionesPorJugador.get(jugador.id);
                return (
                  <tr key={jugador.id}>
                    <td>{jugador.numero_camiseta ?? "—"}</td>
                    <td>{jugador.nombre_completo}</td>
                    <td>{jugador.dni}</td>
                    <td>
                      <span className={`badge ${jugador.habilitado ? "badge-ok" : "badge-off"}`}>
                        {jugador.habilitado ? "Habilitado" : "Inhabilitado"}
                      </span>
                    </td>
                    <td>
                      <form action={alternarHabilitadoPropio.bind(null, jugador.id, jugador.habilitado)}>
                        <button className="button button-secondary" type="submit">
                          {jugador.habilitado ? "Inhabilitar" : "Habilitar"}
                        </button>
                      </form>
                    </td>
                    <td>
                      {sancion ? (
                        <span className="badge badge-off">
                          {sancion.restantes} fecha{sancion.restantes === 1 ? "" : "s"} · {sancion.motivo}
                        </span>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td>
                      <form action={vincularJugadorPropio.bind(null, jugador.id)} className="inline-form">
                        <select name="profile_id" defaultValue={jugador.profile_id ?? ""}>
                          <option value="">Sin vincular</option>
                          {(perfilesJugador ?? []).map((p) => (
                            <option key={p.id} value={p.id}>{p.full_name ?? p.id}</option>
                          ))}
                        </select>
                        <button className="button button-secondary" type="submit">Vincular</button>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p className="muted">Todavía no hay jugadores cargados.</p>
        )}
        <p className="muted">
          Las sanciones las administra el admin de la liga (o se generan solas por acumulación de
          tarjetas) — desde acá manejás el plantel, no las suspensiones.
        </p>

        <h2>Agregar jugador</h2>
        {error ? <div className="error-box">{decodeURIComponent(error)}</div> : null}
        <form action={crearJugadorPropio}>
          <div className="field">
            <label htmlFor="nombre_completo">Nombre completo</label>
            <input id="nombre_completo" name="nombre_completo" type="text" required />
          </div>
          <div className="field">
            <label htmlFor="dni">DNI</label>
            <input id="dni" name="dni" type="text" required />
          </div>
          <div className="field">
            <label htmlFor="fecha_nacimiento">Fecha de nacimiento</label>
            <input id="fecha_nacimiento" name="fecha_nacimiento" type="date" />
          </div>
          <div className="field">
            <label htmlFor="numero_camiseta">Número de camiseta</label>
            <input id="numero_camiseta" name="numero_camiseta" type="number" min={1} />
          </div>
          <div className="field">
            <label htmlFor="foto_url">Foto (URL, opcional)</label>
            <input id="foto_url" name="foto_url" type="url" />
          </div>
          <button className="button button-primary full" type="submit">Agregar jugador</button>
        </form>
      </article>

      <article className="panel">
        <h2>Próximos partidos</h2>
        {proximos.length > 0 ? (
          <ul className="list">
            {proximos.map((partido) => {
              const rival = partido.equipo_local?.id === equipo.id ? partido.equipo_visitante : partido.equipo_local;
              const deLocal = partido.equipo_local?.id === equipo.id;
              return (
                <li key={partido.id} className="partido-row">
                  <div>
                    <span className={`badge ${partido.estado === "en_vivo" ? "badge-live" : ""}`}>
                      {ETIQUETA_ESTADO[partido.estado]}
                    </span>
                    <strong>{deLocal ? "vs" : "en cancha de"} {rival?.nombre ?? "?"}</strong>
                    <span className="muted">
                      {partido.fase?.categoria?.nombre} · {partido.fase?.nombre}
                      {partido.fecha_numero ? ` · Fecha ${partido.fecha_numero}` : ""}
                      {" · "}{formatearFecha(partido.fecha_hora)}
                      {partido.cancha ? ` · ${partido.cancha}` : ""}
                    </span>
                  </div>
                  <Link className="button button-secondary" href={`/partidos/${partido.id}`}>Ver</Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="muted">No hay partidos programados.</p>
        )}

        <h2>Resultados</h2>
        {resultados.length > 0 ? (
          <ul className="list">
            {resultados.map((partido) => {
              const rival = partido.equipo_local?.id === equipo.id ? partido.equipo_visitante : partido.equipo_local;
              const deLocal = partido.equipo_local?.id === equipo.id;
              const golesPropios = deLocal ? partido.goles_local : partido.goles_visitante;
              const golesRival = deLocal ? partido.goles_visitante : partido.goles_local;
              return (
                <li key={partido.id} className="partido-row">
                  <div>
                    <strong>
                      {golesPropios} - {golesRival} {deLocal ? "vs" : "en cancha de"} {rival?.nombre ?? "?"}
                    </strong>
                    <span className="muted">
                      {partido.fase?.categoria?.nombre} · {partido.fase?.nombre}
                      {partido.fecha_numero ? ` · Fecha ${partido.fecha_numero}` : ""}
                    </span>
                  </div>
                  <Link className="button button-secondary" href={`/partidos/${partido.id}`}>Ver</Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="muted">Todavía no hay resultados.</p>
        )}
      </article>
    </section>
  );
}
