import { requireSesion, ETIQUETA_ROL } from "@/lib/liga/auth";

export default async function DashboardPage() {
  const { perfil } = await requireSesion();

  return (
    <section className="dashboard-grid">
      <article className="panel">
        <span className="role-pill">{ETIQUETA_ROL[perfil.role]}</span>
        <h1>Hola, {perfil.full_name || "Usuario Liga Serrana"}</h1>
        <p className="muted">
          Usá el menú de arriba para gestionar equipos, cargar partidos o ver la tabla de posiciones.
        </p>
      </article>
      <article className="panel">
        <h2>Paso 2</h2>
        <p className="muted">✓ Equipos y jugadores</p>
        <p className="muted">✓ Fixture de liga y cruces de playoff</p>
        <p className="muted">✓ Partido en vivo (goles y tarjetas)</p>
        <p className="muted">✓ Tabla de posiciones</p>
      </article>
    </section>
  );
}
