import { requireSesion } from "@/lib/liga/auth";

export default async function CarnetPage() {
  const { supabase, perfil } = await requireSesion();

  const { data: jugador } = await supabase
    .from("jugadores")
    .select(
      `id, nombre_completo, dni, fecha_nacimiento, foto_url, numero_camiseta, habilitado,
       equipos(nombre)`,
    )
    .eq("profile_id", perfil.id)
    .maybeSingle();

  const equipo = jugador?.equipos as unknown as { nombre: string } | null;

  return (
    <section className="dashboard-grid">
      <article className="panel">
        <h1>Mi carnet</h1>

        {jugador ? (
          <div className="carnet">
            <div className="carnet-foto">
              {jugador.foto_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={jugador.foto_url} alt={jugador.nombre_completo} />
              ) : (
                <span>{jugador.nombre_completo.slice(0, 1)}</span>
              )}
            </div>
            <div className="carnet-datos">
              <strong>{jugador.nombre_completo}</strong>
              <span className="muted">DNI {jugador.dni}</span>
              <span className="muted">{equipo?.nombre ?? "Sin equipo"}</span>
              {jugador.numero_camiseta && <span className="muted">Camiseta #{jugador.numero_camiseta}</span>}
              <span className={`badge ${jugador.habilitado ? "badge-ok" : "badge-off"}`}>
                {jugador.habilitado ? "Habilitado para jugar" : "Inhabilitado"}
              </span>
            </div>
          </div>
        ) : (
          <p className="muted">
            Todavía no tenés un carnet asociado a tu cuenta. Pedile al delegado de tu equipo o al admin
            de la liga que te vincule desde la ficha del plantel.
          </p>
        )}
      </article>
    </section>
  );
}
