import Link from "next/link";

export default function Home() {
  return (
    <main className="landing-shell">
      <nav className="topbar">
        <div className="brand-mark">LS</div>
        <div className="brand-copy">
          <strong>Liga Serrana</strong>
          <span>Fútbol</span>
        </div>
        <Link className="button button-secondary" href="/login">Ingresar</Link>
      </nav>

      <section className="hero">
        <div className="eyebrow">Temporada 2026</div>
        <h1>La liga, en un solo lugar.</h1>
        <p>
          Partidos, jugadores, equipos, estadísticas y control de planillas.
          Esta es la base del nuevo sistema digital de Liga Serrana.
        </p>
        <div className="hero-actions">
          <Link className="button button-primary" href="/fixture">Ver fixture</Link>
          <Link className="button button-secondary" href="/en-vivo">En vivo</Link>
          <Link className="button button-secondary" href="/login">Acceso interno</Link>
        </div>
      </section>

      <section className="feature-grid">
        <article className="feature-card">
          <span>01</span>
          <h2>Carnet digital</h2>
          <p>Identidad y habilitación de cada jugador.</p>
        </article>
        <Link href="/fixture" className="feature-card feature-card-link">
          <span>02</span>
          <h2>Fixture y tabla</h2>
          <p>Próximos partidos, resultados y posiciones, sin login.</p>
        </Link>
        <Link href="/en-vivo" className="feature-card feature-card-link">
          <span>03</span>
          <h2>En vivo</h2>
          <p>Resultados y estadísticas actualizados desde cancha.</p>
        </Link>
      </section>
    </main>
  );
}
