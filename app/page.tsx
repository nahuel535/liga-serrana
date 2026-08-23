import Link from "next/link";

export default function Home() {
  return (
    <main className="landing-shell tema-hincha">
      <nav className="topbar">
        <div className="brand-mark">LS</div>
        <div className="brand-copy">
          <strong>Liga Serrana</strong>
          <span>Fútbol · Río Ceballos</span>
        </div>
        <Link className="button button-secondary" href="/login">Ingresar</Link>
      </nav>

      <section className="hero">
        <div className="eyebrow">Temporada 2026</div>
        <h1>La liga, en un solo lugar.</h1>
        <p>
          Fixture, resultados y partidos en vivo sin bajar nada ni hacer login.
          El carnet, las planillas y la gestión del equipo quedan del lado de dentro.
        </p>
        <div className="hero-actions">
          <Link className="button button-primary" href="/fixture">Ver fixture</Link>
          <Link className="button button-secondary" href="/en-vivo">En vivo</Link>
          <Link className="button button-secondary" href="/login">Acceso interno</Link>
        </div>
      </section>

      <section className="feature-grid">
        <article className="feature-card">
          <span>ID</span>
          <h2>Carnet digital</h2>
          <p>Identidad y habilitación de cada jugador.</p>
        </article>
        <Link href="/fixture" className="feature-card feature-card-link">
          <span>FIX</span>
          <h2>Fixture y tabla</h2>
          <p>Próximos partidos, resultados y posiciones, sin login.</p>
        </Link>
        <Link href="/en-vivo" className="feature-card feature-card-link">
          <span>LIVE</span>
          <h2>En vivo</h2>
          <p>Goles y tarjetas actualizados desde la cancha, al instante.</p>
        </Link>
      </section>
    </main>
  );
}
