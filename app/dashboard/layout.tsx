import Link from "next/link";
import { requireSesion, ETIQUETA_ROL } from "@/lib/liga/auth";
import { logout } from "./actions";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { perfil } = await requireSesion();

  const esAdmin = perfil.role === "superadmin" || perfil.role === "admin_liga";

  const links = [
    { href: "/dashboard", label: "Inicio", show: true },
    { href: "/dashboard/equipos", label: "Equipos", show: esAdmin },
    { href: "/dashboard/configuracion", label: "Temporadas y categorías", show: esAdmin },
    { href: "/dashboard/partidos", label: "Partidos", show: true },
    { href: "/dashboard/tabla", label: "Tabla de posiciones", show: true },
    { href: "/dashboard/mi-equipo", label: "Mi equipo", show: perfil.role === "delegado" },
    { href: "/dashboard/carnet", label: "Mi carnet", show: perfil.role === "jugador" },
    { href: "/dashboard/cuenta", label: "Mi cuenta", show: true },
  ].filter((link) => link.show);

  return (
    <main className="dashboard-shell">
      <header className="dashboard-head">
        <div className="brand-mark">LS</div>
        <div className="brand-copy">
          <strong>Liga Serrana</strong>
          <span>Panel interno</span>
        </div>
        <span className="role-pill">{ETIQUETA_ROL[perfil.role]}</span>
        <form action={logout}>
          <button className="button button-secondary" type="submit">Cerrar sesión</button>
        </form>
      </header>

      <nav className="dashboard-nav">
        {links.map((link) => (
          <Link key={link.href} href={link.href} className="dashboard-nav-link">
            {link.label}
          </Link>
        ))}
      </nav>

      {children}
    </main>
  );
}
