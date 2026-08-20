import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSesion, exigirRol } from "@/lib/liga/auth";
import { crearJugador, alternarHabilitado, inscribirEquipo, vincularJugador } from "./actions";

export default async function EquipoDetallePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { supabase, perfil } = await requireSesion();
  exigirRol(perfil, ["superadmin", "admin_liga"]);
  const { id } = await params;
  const { error } = await searchParams;

  const [{ data: equipo }, { data: jugadores }, { data: inscripciones }, { data: categorias }, { data: temporadas }, { data: perfilesJugador }] =
    await Promise.all([
      supabase.from("equipos").select("id, nombre, escudo_url").eq("id", id).maybeSingle(),
      supabase
        .from("jugadores")
        .select("id, nombre_completo, dni, numero_camiseta, habilitado, profile_id")
        .eq("equipo_id", id)
        .order("numero_camiseta", { ascending: true, nullsFirst: false }),
      supabase
        .from("inscripciones")
        .select("id, categorias(nombre), temporadas(nombre)")
        .eq("equipo_id", id),
      supabase.from("categorias").select("id, nombre").order("orden"),
      supabase.from("temporadas").select("id, nombre, activa").order("created_at", { ascending: false }),
      supabase.from("profiles").select("id, full_name").eq("role", "jugador").eq("active", true),
    ]);

  if (!equipo) notFound();

  const crearJugadorConEquipo = crearJugador.bind(null, equipo.id);
  const inscribirConEquipo = inscribirEquipo.bind(null, equipo.id);

  return (
    <section className="dashboard-grid">
      <article className="panel">
        <Link className="back-link" href="/dashboard/equipos">← Equipos</Link>
        <h1>{equipo.nombre}</h1>

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
                <th>Cuenta vinculada (carnet)</th>
              </tr>
            </thead>
            <tbody>
              {jugadores.map((jugador) => (
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
                    <form
                      action={alternarHabilitado.bind(null, equipo.id, jugador.id, jugador.habilitado)}
                    >
                      <button className="button button-secondary" type="submit">
                        {jugador.habilitado ? "Inhabilitar" : "Habilitar"}
                      </button>
                    </form>
                  </td>
                  <td>
                    <form action={vincularJugador.bind(null, equipo.id, jugador.id)} className="inline-form">
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
              ))}
            </tbody>
          </table>
        ) : (
          <p className="muted">Todavía no hay jugadores cargados.</p>
        )}

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
          <p className="muted">El equipo todavía no está inscripto en ninguna categoría.</p>
        )}
      </article>

      <article className="panel">
        {error ? <div className="error-box">{decodeURIComponent(error)}</div> : null}

        <h2>Agregar jugador</h2>
        <form action={crearJugadorConEquipo}>
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

        <h2>Inscribir en categoría</h2>
        {categorias && categorias.length > 0 && temporadas && temporadas.length > 0 ? (
          <form action={inscribirConEquipo}>
            <div className="field">
              <label htmlFor="temporada_id">Temporada</label>
              <select id="temporada_id" name="temporada_id" required defaultValue={temporadas.find((t) => t.activa)?.id ?? ""}>
                <option value="" disabled>Elegí una temporada</option>
                {temporadas.map((temporada) => (
                  <option key={temporada.id} value={temporada.id}>
                    {temporada.nombre}{temporada.activa ? " (activa)" : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="categoria_id">Categoría</label>
              <select id="categoria_id" name="categoria_id" required defaultValue="">
                <option value="" disabled>Elegí una categoría</option>
                {categorias.map((categoria) => (
                  <option key={categoria.id} value={categoria.id}>{categoria.nombre}</option>
                ))}
              </select>
            </div>
            <button className="button button-secondary full" type="submit">Inscribir</button>
          </form>
        ) : (
          <p className="muted">
            Primero creá al menos una temporada y una categoría en{" "}
            <Link href="/dashboard/configuracion">Configuración</Link>.
          </p>
        )}
      </article>
    </section>
  );
}
