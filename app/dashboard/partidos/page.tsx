import Link from "next/link";
import { requireSesion, exigirRol } from "@/lib/liga/auth";
import { ETIQUETA_ESTADO } from "@/lib/liga/types";
import { crearFase, generarFixtureLiga, crearPartidoPlayoff, programarPartido } from "./actions";

type PartidoFila = {
  id: string;
  fase_id: string;
  fecha_hora: string | null;
  cancha: string | null;
  fecha_numero: number | null;
  llave: string | null;
  estado: "programado" | "en_vivo" | "finalizado" | "suspendido";
  goles_local: number;
  goles_visitante: number;
  planillero_id: string | null;
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

export default async function PartidosPage({
  searchParams,
}: {
  searchParams: Promise<{ categoria?: string; error?: string }>;
}) {
  const { supabase, perfil } = await requireSesion();
  const { categoria: categoriaParam, error } = await searchParams;
  const esAdmin = perfil.role === "superadmin" || perfil.role === "admin_liga";

  const { data: categorias } = await supabase.from("categorias").select("id, nombre").order("orden");
  const categoriaId = categoriaParam || categorias?.[0]?.id;

  const { data: temporadaActiva } = await supabase
    .from("temporadas")
    .select("id, nombre")
    .eq("activa", true)
    .maybeSingle();

  let fases: { id: string; tipo: "liga" | "playoff"; nombre: string; orden: number }[] = [];
  let partidos: PartidoFila[] = [];
  let equiposInscriptos: { id: string; nombre: string }[] = [];
  let planilleros: { id: string; full_name: string | null }[] = [];

  if (categoriaId && temporadaActiva) {
    const { data: fasesData } = await supabase
      .from("fases")
      .select("id, tipo, nombre, orden")
      .eq("temporada_id", temporadaActiva.id)
      .eq("categoria_id", categoriaId)
      .order("orden");
    fases = fasesData ?? [];

    const faseIds = fases.map((f) => f.id);
    if (faseIds.length > 0) {
      const { data: partidosData } = await supabase
        .from("partidos")
        .select(
          `id, fase_id, fecha_hora, cancha, fecha_numero, llave, estado, goles_local, goles_visitante, planillero_id,
           equipo_local:equipos!partidos_equipo_local_id_fkey(id, nombre),
           equipo_visitante:equipos!partidos_equipo_visitante_id_fkey(id, nombre)`,
        )
        .in("fase_id", faseIds)
        .order("fecha_hora", { ascending: true, nullsFirst: false });
      partidos = (partidosData as unknown as PartidoFila[]) ?? [];
    }

    if (esAdmin) {
      const { data: inscripciones } = await supabase
        .from("inscripciones")
        .select("equipos(id, nombre)")
        .eq("categoria_id", categoriaId)
        .eq("temporada_id", temporadaActiva.id);
      equiposInscriptos = (inscripciones ?? [])
        .map((i) => i.equipos as unknown as { id: string; nombre: string } | null)
        .filter((e): e is { id: string; nombre: string } => Boolean(e));

      const { data: planillerosData } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("role", "planillero")
        .eq("active", true);
      planilleros = planillerosData ?? [];
    }
  }

  const proximos = partidos.filter((p) => p.estado === "programado" || p.estado === "en_vivo");
  const resultados = partidos.filter((p) => p.estado === "finalizado" || p.estado === "suspendido");

  const fasesLiga = fases.filter((f) => f.tipo === "liga");
  const fasesPlayoff = fases.filter((f) => f.tipo === "playoff");

  function puedeEntrarAVivo(partido: PartidoFila) {
    return esAdmin || partido.planillero_id === perfil.id;
  }

  return (
    <section className="dashboard-grid">
      <article className="panel">
        <h1>Partidos</h1>

        {categorias && categorias.length > 0 ? (
          <div className="chip-row">
            {categorias.map((c) => (
              <Link
                key={c.id}
                href={`/dashboard/partidos?categoria=${c.id}`}
                className={`chip ${c.id === categoriaId ? "chip-active" : ""}`}
              >
                {c.nombre}
              </Link>
            ))}
          </div>
        ) : (
          <p className="muted">
            Todavía no hay categorías. Creá una en Configuración.
          </p>
        )}

        {!temporadaActiva && (
          <p className="muted">No hay ninguna temporada activa. Activá una en Configuración.</p>
        )}

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
                {puedeEntrarAVivo(partido) && (
                  <Link className="button button-secondary" href={`/dashboard/partidos/${partido.id}/vivo`}>
                    {partido.estado === "en_vivo" ? "Ver en vivo" : "Planilla"}
                  </Link>
                )}
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
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">Todavía no hay resultados.</p>
        )}
      </article>

      {esAdmin && categoriaId && temporadaActiva && (
        <article className="panel">
          {error ? <div className="error-box">{decodeURIComponent(error)}</div> : null}

          <h2>Fases</h2>
          {fases.length > 0 ? (
            <ul className="list">
              {fases.map((fase) => (
                <li key={fase.id} className="list-row">
                  {fase.nombre} <span className="muted">({fase.tipo})</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">Todavía no hay fases en esta categoría.</p>
          )}

          <form action={crearFase}>
            <input type="hidden" name="categoria_id" value={categoriaId} />
            <div className="field">
              <label htmlFor="nombre-fase">Nombre de la fase</label>
              <input id="nombre-fase" name="nombre" type="text" placeholder="Fase Liga" required />
            </div>
            <div className="field">
              <label htmlFor="tipo-fase">Tipo</label>
              <select id="tipo-fase" name="tipo" defaultValue="liga">
                <option value="liga">Liga (todos contra todos)</option>
                <option value="playoff">Playoff (cruces)</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="orden-fase">Orden</label>
              <input id="orden-fase" name="orden" type="number" defaultValue={0} />
            </div>
            <button className="button button-primary full" type="submit">Crear fase</button>
          </form>

          {fasesLiga.map((fase) => (
            <form key={fase.id} action={generarFixtureLiga.bind(null, fase.id, categoriaId)}>
              <h3>Generar fixture — {fase.nombre}</h3>
              <label className="checkbox-field">
                <input name="ida_y_vuelta" type="checkbox" />
                Ida y vuelta
              </label>
              <button className="button button-secondary full" type="submit">
                Generar fixture ({equiposInscriptos.length} equipos inscriptos)
              </button>
            </form>
          ))}

          {fasesPlayoff.map((fase) => (
            <form key={fase.id} action={crearPartidoPlayoff.bind(null, fase.id, categoriaId)}>
              <h3>Nuevo cruce — {fase.nombre}</h3>
              <div className="field">
                <label htmlFor={`local-${fase.id}`}>Local</label>
                <select id={`local-${fase.id}`} name="equipo_local_id" required defaultValue="">
                  <option value="" disabled>Elegí un equipo</option>
                  {equiposInscriptos.map((eq) => (
                    <option key={eq.id} value={eq.id}>{eq.nombre}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor={`visitante-${fase.id}`}>Visitante</label>
                <select id={`visitante-${fase.id}`} name="equipo_visitante_id" required defaultValue="">
                  <option value="" disabled>Elegí un equipo</option>
                  {equiposInscriptos.map((eq) => (
                    <option key={eq.id} value={eq.id}>{eq.nombre}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor={`llave-${fase.id}`}>Llave</label>
                <input id={`llave-${fase.id}`} name="llave" type="text" placeholder="Cuartos - Llave 1" />
              </div>
              <button className="button button-secondary full" type="submit">Crear cruce</button>
            </form>
          ))}

          {proximos.length > 0 && (
            <>
              <h2>Programar partidos</h2>
              {proximos.map((partido) => (
                <form key={partido.id} action={programarPartido.bind(null, partido.id, categoriaId)}>
                  <p className="muted">
                    {partido.equipo_local?.nombre ?? "?"} vs {partido.equipo_visitante?.nombre ?? "?"}
                  </p>
                  <div className="field">
                    <label htmlFor={`fecha-${partido.id}`}>Fecha y hora</label>
                    <input
                      id={`fecha-${partido.id}`}
                      name="fecha_hora"
                      type="datetime-local"
                      defaultValue={partido.fecha_hora ? partido.fecha_hora.slice(0, 16) : ""}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor={`cancha-${partido.id}`}>Cancha</label>
                    <input id={`cancha-${partido.id}`} name="cancha" type="text" defaultValue={partido.cancha ?? ""} />
                  </div>
                  <div className="field">
                    <label htmlFor={`planillero-${partido.id}`}>Planillero</label>
                    <select
                      id={`planillero-${partido.id}`}
                      name="planillero_id"
                      defaultValue={partido.planillero_id ?? ""}
                    >
                      <option value="">Sin asignar</option>
                      {planilleros.map((p) => (
                        <option key={p.id} value={p.id}>{p.full_name ?? p.id}</option>
                      ))}
                    </select>
                  </div>
                  <button className="button button-secondary full" type="submit">Guardar</button>
                </form>
              ))}
            </>
          )}
        </article>
      )}
    </section>
  );
}
