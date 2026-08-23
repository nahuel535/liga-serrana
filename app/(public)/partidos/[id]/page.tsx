import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MarcadorEnVivo from "@/app/components/marcador-en-vivo";

export default async function PartidoPublicoPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { id } = await params;

  const { data: partido } = await supabase
    .from("partidos")
    .select(
      `id, estado, goles_local, goles_visitante, fecha_hora, cancha,
       fase:fases(nombre, categoria:categorias(nombre)),
       equipo_local:equipos!partidos_equipo_local_id_fkey(id, nombre),
       equipo_visitante:equipos!partidos_equipo_visitante_id_fkey(id, nombre)`,
    )
    .eq("id", id)
    .maybeSingle();

  if (!partido) notFound();

  const equipoLocal = partido.equipo_local as unknown as { id: string; nombre: string };
  const equipoVisitante = partido.equipo_visitante as unknown as { id: string; nombre: string };
  const fase = partido.fase as unknown as { nombre: string; categoria: { nombre: string } } | null;

  const [{ data: jugadoresLocal }, { data: jugadoresVisitante }, { data: eventos }] = await Promise.all([
    supabase
      .from("jugadores_publico")
      .select("id, nombre_completo, numero_camiseta")
      .eq("equipo_id", equipoLocal.id),
    supabase
      .from("jugadores_publico")
      .select("id, nombre_completo, numero_camiseta")
      .eq("equipo_id", equipoVisitante.id),
    supabase
      .from("eventos_partido")
      .select("id, partido_id, jugador_id, equipo_id, tipo, minuto")
      .eq("partido_id", id),
  ]);

  const jugadoresPorId: Record<string, string> = {};
  [...(jugadoresLocal ?? []), ...(jugadoresVisitante ?? [])].forEach((j) => {
    jugadoresPorId[j.id] = j.numero_camiseta ? `#${j.numero_camiseta} ${j.nombre_completo}` : j.nombre_completo;
  });

  return (
    <article className="panel">
      <Link className="back-link" href="/fixture">← Fixture</Link>
      <p className="muted">
        {fase?.categoria?.nombre} · {fase?.nombre}
        {partido.cancha ? ` · ${partido.cancha}` : ""}
      </p>

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
        puedeEditar={false}
      />
    </article>
  );
}
