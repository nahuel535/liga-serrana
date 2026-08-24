import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function CarnetVerificacionPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { id } = await params;

  const { data: jugador } = await supabase
    .from("jugadores_publico")
    .select("id, equipo_id, nombre_completo, numero_camiseta, foto_url, habilitado")
    .eq("id", id)
    .maybeSingle();

  if (!jugador) notFound();

  const [{ data: equipo }, { data: sancion }] = await Promise.all([
    supabase.from("equipos").select("nombre").eq("id", jugador.equipo_id).maybeSingle(),
    supabase.from("jugadores_sancionados").select("partidos_restantes").eq("jugador_id", jugador.id).maybeSingle(),
  ]);

  const suspendido = sancion && sancion.partidos_restantes > 0;

  return (
    <main className="landing-shell tema-hincha">
      <section className="publico-shell">
        <article className="panel carnet-verificacion">
          <p className="eyebrow">Verificación de carnet</p>

          <div className="carnet-foto carnet-foto-grande">
            {jugador.foto_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={jugador.foto_url} alt={jugador.nombre_completo} />
            ) : (
              <span>{jugador.nombre_completo.slice(0, 1)}</span>
            )}
          </div>

          <h1 style={{ marginBottom: 2 }}>{jugador.nombre_completo}</h1>
          <p className="muted" style={{ marginTop: 0 }}>
            {equipo?.nombre ?? "Sin equipo"}
            {jugador.numero_camiseta ? ` · #${jugador.numero_camiseta}` : ""}
          </p>

          <div className="carnet-verificacion-estados">
            <span className={`badge ${jugador.habilitado ? "badge-ok" : "badge-off"}`}>
              {jugador.habilitado ? "Jugador habilitado" : "Inhabilitado"}
            </span>
            {suspendido ? (
              <span className="badge badge-off">
                Suspendido — {sancion!.partidos_restantes} fecha{sancion!.partidos_restantes === 1 ? "" : "s"} más
              </span>
            ) : (
              <span className="badge badge-ok">Sin suspensiones</span>
            )}
          </div>
        </article>
      </section>
    </main>
  );
}
