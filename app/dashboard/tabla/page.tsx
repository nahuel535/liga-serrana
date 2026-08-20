import Link from "next/link";
import { requireSesion } from "@/lib/liga/auth";

type FilaTabla = {
  fase_id: string;
  equipo_id: string;
  pj: number;
  pg: number;
  pe: number;
  pp: number;
  gf: number;
  gc: number;
  dg: number;
  puntos: number;
};

export default async function TablaPage({
  searchParams,
}: {
  searchParams: Promise<{ categoria?: string }>;
}) {
  const { supabase } = await requireSesion();
  const { categoria: categoriaParam } = await searchParams;

  const { data: categorias } = await supabase.from("categorias").select("id, nombre").order("orden");
  const categoriaId = categoriaParam || categorias?.[0]?.id;

  const { data: temporadaActiva } = await supabase
    .from("temporadas")
    .select("id, nombre")
    .eq("activa", true)
    .maybeSingle();

  let filas: FilaTabla[] = [];
  let nombreFase = "";
  let equiposPorId: Record<string, string> = {};

  if (categoriaId && temporadaActiva) {
    const { data: faseLiga } = await supabase
      .from("fases")
      .select("id, nombre")
      .eq("temporada_id", temporadaActiva.id)
      .eq("categoria_id", categoriaId)
      .eq("tipo", "liga")
      .order("orden")
      .limit(1)
      .maybeSingle();

    if (faseLiga) {
      nombreFase = faseLiga.nombre;
      const [{ data: tabla }, { data: equipos }] = await Promise.all([
        supabase.from("tabla_posiciones").select("*").eq("fase_id", faseLiga.id),
        supabase.from("equipos").select("id, nombre"),
      ]);

      filas = (tabla as FilaTabla[]) ?? [];
      equiposPorId = Object.fromEntries((equipos ?? []).map((e) => [e.id, e.nombre]));
      filas.sort((a, b) => b.puntos - a.puntos || b.dg - a.dg || b.gf - a.gf);
    }
  }

  return (
    <section className="dashboard-grid">
      <article className="panel">
        <h1>Tabla de posiciones</h1>

        {categorias && categorias.length > 0 && (
          <div className="chip-row">
            {categorias.map((c) => (
              <Link
                key={c.id}
                href={`/dashboard/tabla?categoria=${c.id}`}
                className={`chip ${c.id === categoriaId ? "chip-active" : ""}`}
              >
                {c.nombre}
              </Link>
            ))}
          </div>
        )}

        {filas.length > 0 ? (
          <>
            <p className="muted">{nombreFase}</p>
            <table className="table">
              <thead>
                <tr>
                  <th>Equipo</th>
                  <th>PJ</th>
                  <th>PG</th>
                  <th>PE</th>
                  <th>PP</th>
                  <th>GF</th>
                  <th>GC</th>
                  <th>DG</th>
                  <th>Pts</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((fila, indice) => (
                  <tr key={fila.equipo_id}>
                    <td>{indice + 1}. {equiposPorId[fila.equipo_id] ?? "Equipo"}</td>
                    <td>{fila.pj}</td>
                    <td>{fila.pg}</td>
                    <td>{fila.pe}</td>
                    <td>{fila.pp}</td>
                    <td>{fila.gf}</td>
                    <td>{fila.gc}</td>
                    <td>{fila.dg}</td>
                    <td><strong>{fila.puntos}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : (
          <p className="muted">
            Todavía no hay resultados de fase liga para esta categoría.
          </p>
        )}
      </article>
    </section>
  );
}
