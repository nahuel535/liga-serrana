import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireSesion } from "@/lib/liga/auth";
import { iniciarPartido, finalizarPartido, cargarEvento, borrarEvento } from "./actions";
import MarcadorEnVivo from "@/app/components/marcador-en-vivo";

export default async function PartidoVivoPage({ params }: { params: Promise<{ id: string }> }) {
  const { supabase, perfil } = await requireSesion();
  const { id } = await params;
  const esAdmin = perfil.role === "superadmin" || perfil.role === "admin_liga";

  const { data: partido } = await supabase
    .from("partidos")
    .select(
      `id, estado, goles_local, goles_visitante, planillero_id,
       equipo_local:equipos!partidos_equipo_local_id_fkey(id, nombre),
       equipo_visitante:equipos!partidos_equipo_visitante_id_fkey(id, nombre)`,
    )
    .eq("id", id)
    .maybeSingle();

  if (!partido) notFound();

  const equipoLocal = partido.equipo_local as unknown as { id: string; nombre: string };
  const equipoVisitante = partido.equipo_visitante as unknown as { id: string; nombre: string };

  const puedeEditar = esAdmin || partido.planillero_id === perfil.id;
  if (!puedeEditar) redirect("/dashboard/partidos");

  const [{ data: jugadoresLocal }, { data: jugadoresVisitante }, { data: eventos }] = await Promise.all([
    supabase
      .from("jugadores")
      .select("id, nombre_completo, numero_camiseta")
      .eq("equipo_id", equipoLocal.id)
      .eq("habilitado", true)
      .order("numero_camiseta"),
    supabase
      .from("jugadores")
      .select("id, nombre_completo, numero_camiseta")
      .eq("equipo_id", equipoVisitante.id)
      .eq("habilitado", true)
      .order("numero_camiseta"),
    supabase
      .from("eventos_partido")
      .select("id, partido_id, jugador_id, equipo_id, tipo, minuto")
      .eq("partido_id", id),
  ]);

  const jugadoresPorId: Record<string, string> = {};
  [...(jugadoresLocal ?? []), ...(jugadoresVisitante ?? [])].forEach((j) => {
    jugadoresPorId[j.id] = j.numero_camiseta ? `#${j.numero_camiseta} ${j.nombre_completo}` : j.nombre_completo;
  });

  const cargarEventoDePartido = cargarEvento.bind(null, id);

  return (
    <section className="dashboard-grid">
      <article className="panel">
        <Link className="back-link" href="/dashboard/partidos">← Partidos</Link>

        <MarcadorEnVivo
          partidoId={id}
          equipoLocalId={equipoLocal.id}
          equipoLocalNombre={equipoLocal.nombre}
          equipoVisitanteId={equipoVisitante.id}
          equipoVisitanteNombre={equipoVisitante.nombre}
          golesLocalInicial={partido.goles_local}
          golesVisitanteInicial={partido.goles_visitante}
          estadoInicial={partido.estado}
          eventosIniciales={eventos ?? []}
          jugadoresPorId={jugadoresPorId}
          puedeEditar={puedeEditar}
          onBorrarEvento={borrarEvento}
        />
      </article>

      {puedeEditar && (
        <article className="panel">
          {partido.estado === "programado" && (
            <form action={iniciarPartido.bind(null, id)}>
              <button className="button button-primary full" type="submit">Iniciar partido</button>
            </form>
          )}

          {partido.estado === "en_vivo" && (
            <>
              <h2>Cargar evento</h2>
              <form action={cargarEventoDePartido}>
                <div className="field">
                  <label htmlFor="jugador_equipo">Jugador</label>
                  <select id="jugador_equipo" name="jugador_equipo" required defaultValue="">
                    <option value="" disabled>Elegí un jugador</option>
                    <optgroup label={equipoLocal.nombre}>
                      {(jugadoresLocal ?? []).map((j) => (
                        <option key={j.id} value={`${j.id}::${equipoLocal.id}`}>
                          {j.numero_camiseta ? `#${j.numero_camiseta} ` : ""}{j.nombre_completo}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label={equipoVisitante.nombre}>
                      {(jugadoresVisitante ?? []).map((j) => (
                        <option key={j.id} value={`${j.id}::${equipoVisitante.id}`}>
                          {j.numero_camiseta ? `#${j.numero_camiseta} ` : ""}{j.nombre_completo}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="tipo">Evento</label>
                  <select id="tipo" name="tipo" defaultValue="gol">
                    <option value="gol">Gol</option>
                    <option value="gol_en_contra">Gol en contra</option>
                    <option value="tarjeta_amarilla">Tarjeta amarilla</option>
                    <option value="tarjeta_roja">Tarjeta roja</option>
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="minuto">Minuto</label>
                  <input id="minuto" name="minuto" type="number" min={0} max={200} />
                </div>
                <button className="button button-primary full" type="submit">Agregar</button>
              </form>

              <form action={finalizarPartido.bind(null, id)}>
                <button className="button button-secondary full" type="submit">Finalizar partido</button>
              </form>
            </>
          )}

          {(partido.estado === "finalizado" || partido.estado === "suspendido") && (
            <p className="muted">Este partido ya terminó. La planilla queda de solo lectura.</p>
          )}
        </article>
      )}
    </section>
  );
}
