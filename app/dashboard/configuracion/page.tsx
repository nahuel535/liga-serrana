import { requireSesion, exigirRol } from "@/lib/liga/auth";
import { crearTemporada, activarTemporada, crearCategoria, guardarReglasDisciplinarias } from "./actions";

export default async function ConfiguracionPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { supabase, perfil } = await requireSesion();
  exigirRol(perfil, ["superadmin", "admin_liga"]);
  const { error } = await searchParams;

  const [{ data: temporadas }, { data: categorias }] = await Promise.all([
    supabase.from("temporadas").select("id, nombre, activa").order("created_at", { ascending: false }),
    supabase.from("categorias").select("id, nombre, orden").order("orden"),
  ]);

  const temporadaActiva = temporadas?.find((t) => t.activa);
  const { data: reglas } = temporadaActiva
    ? await supabase
        .from("reglas_disciplinarias")
        .select("amarillas_para_suspension, partidos_suspension_amarillas, partidos_suspension_roja")
        .eq("temporada_id", temporadaActiva.id)
        .maybeSingle()
    : { data: null };

  return (
    <section className="dashboard-grid">
      <article className="panel">
        {error ? <div className="error-box">{decodeURIComponent(error)}</div> : null}

        <h2>Temporadas</h2>
        {temporadas && temporadas.length > 0 ? (
          <ul className="list">
            {temporadas.map((temporada) => (
              <li key={temporada.id} className="list-row">
                <span>
                  {temporada.nombre}{" "}
                  {temporada.activa ? <span className="badge badge-ok">Activa</span> : null}
                </span>
                {!temporada.activa && (
                  <form action={activarTemporada.bind(null, temporada.id)}>
                    <button className="button button-secondary" type="submit">Activar</button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">Todavía no hay temporadas.</p>
        )}

        <form action={crearTemporada}>
          <div className="field">
            <label htmlFor="nombre-temporada">Nueva temporada</label>
            <input id="nombre-temporada" name="nombre" type="text" placeholder="Apertura 2026" required />
          </div>
          <label className="checkbox-field">
            <input name="activa" type="checkbox" />
            Marcar como activa
          </label>
          <button className="button button-primary full" type="submit">Crear temporada</button>
        </form>
      </article>

      <article className="panel">
        <h2>Categorías</h2>
        {categorias && categorias.length > 0 ? (
          <ul className="list">
            {categorias.map((categoria) => (
              <li key={categoria.id} className="list-row">{categoria.nombre}</li>
            ))}
          </ul>
        ) : (
          <p className="muted">Todavía no hay categorías.</p>
        )}

        <form action={crearCategoria}>
          <div className="field">
            <label htmlFor="nombre-categoria">Nueva categoría</label>
            <input id="nombre-categoria" name="nombre" type="text" placeholder="Primera" required />
          </div>
          <div className="field">
            <label htmlFor="orden">Orden (opcional)</label>
            <input id="orden" name="orden" type="number" defaultValue={0} />
          </div>
          <button className="button button-primary full" type="submit">Crear categoría</button>
        </form>
      </article>

      {temporadaActiva && (
        <article className="panel">
          <h2>Reglas disciplinarias</h2>
          <p className="muted">
            Se aplican a la temporada activa ({temporadaActiva.nombre}). Las tarjetas cargadas en un
            partido en vivo generan la suspensión sola, sin que nadie tenga que hacer nada más.
          </p>
          <form action={guardarReglasDisciplinarias.bind(null, temporadaActiva.id)}>
            <div className="field">
              <label htmlFor="amarillas_para_suspension">Amarillas acumuladas para suspender</label>
              <input
                id="amarillas_para_suspension"
                name="amarillas_para_suspension"
                type="number"
                min={1}
                defaultValue={reglas?.amarillas_para_suspension ?? 3}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="partidos_suspension_amarillas">Fechas de suspensión por acumulación</label>
              <input
                id="partidos_suspension_amarillas"
                name="partidos_suspension_amarillas"
                type="number"
                min={1}
                defaultValue={reglas?.partidos_suspension_amarillas ?? 1}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="partidos_suspension_roja">Fechas de suspensión por roja directa</label>
              <input
                id="partidos_suspension_roja"
                name="partidos_suspension_roja"
                type="number"
                min={1}
                defaultValue={reglas?.partidos_suspension_roja ?? 1}
                required
              />
            </div>
            <button className="button button-primary full" type="submit">Guardar reglas</button>
          </form>
        </article>
      )}
    </section>
  );
}
