import Link from "next/link";
import { requireSesion, ETIQUETA_ROL } from "@/lib/liga/auth";

type ResumenPartidoVivo = {
  id: string;
  goles_local: number;
  goles_visitante: number;
  equipo_local: { nombre: string } | null;
  equipo_visitante: { nombre: string } | null;
};

export default async function DashboardPage() {
  const { supabase, perfil } = await requireSesion();

  let partidoEnVivo: ResumenPartidoVivo | null = null;

  if (perfil.role === "planillero") {
    const { data } = await supabase
      .from("partidos")
      .select(
        `id, goles_local, goles_visitante,
         equipo_local:equipos!partidos_equipo_local_id_fkey(nombre),
         equipo_visitante:equipos!partidos_equipo_visitante_id_fkey(nombre)`,
      )
      .eq("planillero_id", perfil.id)
      .eq("estado", "en_vivo")
      .maybeSingle();
    partidoEnVivo = (data as unknown as ResumenPartidoVivo) ?? null;
  }

  return (
    <section className="dashboard-grid">
      <article className="panel">
        <span className="role-pill">{ETIQUETA_ROL[perfil.role]}</span>
        <h1>Hola, {perfil.full_name || "Usuario Liga Serrana"}</h1>

        {perfil.role === "planillero" && (
          <>
            {partidoEnVivo ? (
              <>
                <p className="muted">Tenés un partido en vivo ahora mismo:</p>
                <p style={{ fontSize: "1.1rem", fontWeight: 700 }}>
                  {partidoEnVivo.equipo_local?.nombre ?? "?"} {partidoEnVivo.goles_local} - {partidoEnVivo.goles_visitante}{" "}
                  {partidoEnVivo.equipo_visitante?.nombre ?? "?"}
                </p>
                <Link className="button button-primary full" href={`/dashboard/partidos/${partidoEnVivo.id}/vivo`}>
                  Continuar planillando
                </Link>
              </>
            ) : (
              <p className="muted">
                No tenés ningún partido en vivo en este momento.{" "}
                <Link href="/dashboard/mis-partidos">Mirá tus próximos partidos</Link>.
              </p>
            )}
          </>
        )}

        {perfil.role === "delegado" && (
          <p className="muted">
            Gestioná el plantel y mirá los partidos de tu equipo desde{" "}
            <Link href="/dashboard/mi-equipo">Mi equipo</Link>.
          </p>
        )}

        {perfil.role === "jugador" && (
          <p className="muted">
            Tu identificación digital y tu código de verificación están en{" "}
            <Link href="/dashboard/carnet">Mi carnet</Link>.
          </p>
        )}

        {(perfil.role === "superadmin" || perfil.role === "admin_liga") && (
          <p className="muted">
            Usá el menú de arriba para gestionar equipos, armar el fixture o cargar partidos.
          </p>
        )}
      </article>
    </section>
  );
}
