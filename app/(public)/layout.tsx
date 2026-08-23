import Link from "next/link";

export default function PublicoLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="landing-shell">
      <nav className="topbar">
        <Link href="/" className="brand-mark-link">
          <div className="brand-mark">LS</div>
        </Link>
        <div className="brand-copy">
          <strong>Liga Serrana</strong>
          <span>Fútbol</span>
        </div>
        <Link href="/fixture" className="public-nav-link">Fixture</Link>
        <Link href="/tabla" className="public-nav-link">Tabla</Link>
        <Link href="/en-vivo" className="public-nav-link">En vivo</Link>
        <Link className="button button-secondary" href="/login">Ingresar</Link>
      </nav>

      <section className="publico-shell">{children}</section>
    </main>
  );
}
