import { requireSesion, exigirRol } from "@/lib/liga/auth";
import { crearTemporada, activarTemporada, crearCategoria } from "./actions";

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
    </section>
  );
}
