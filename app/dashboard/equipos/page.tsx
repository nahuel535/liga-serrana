import Link from "next/link";
import { requireSesion, exigirRol } from "@/lib/liga/auth";
import { crearEquipo } from "./actions";

export default async function EquiposPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { supabase, perfil } = await requireSesion();
  exigirRol(perfil, ["superadmin", "admin_liga"]);
  const { error } = await searchParams;

  const { data: equipos, error: fetchError } = await supabase
    .from("equipos")
    .select("id, nombre, escudo_url")
    .order("nombre", { ascending: true });

  if (fetchError) {
    console.error("[equipos] fetch failed", fetchError.message);
  }

  return (
    <section className="dashboard-grid">
      <article className="panel">
        <h1>Equipos</h1>
        {equipos && equipos.length > 0 ? (
          <ul className="list">
            {equipos.map((equipo) => (
              <li key={equipo.id} className="list-row">
                <Link href={`/dashboard/equipos/${equipo.id}`}>{equipo.nombre}</Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">Todavía no hay equipos cargados.</p>
        )}
      </article>

      <article className="panel">
        <h2>Nuevo equipo</h2>
        {error ? <div className="error-box">{decodeURIComponent(error)}</div> : null}
        <form action={crearEquipo}>
          <div className="field">
            <label htmlFor="nombre">Nombre</label>
            <input id="nombre" name="nombre" type="text" required />
          </div>
          <div className="field">
            <label htmlFor="escudo_url">Escudo (URL, opcional)</label>
            <input id="escudo_url" name="escudo_url" type="url" />
          </div>
          <button className="button button-primary full" type="submit">Crear equipo</button>
        </form>
      </article>
    </section>
  );
}
