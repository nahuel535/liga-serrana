"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSesion, exigirRol } from "@/lib/liga/auth";
import { generarRoundRobin, generarIdaYVuelta } from "@/lib/liga/fixture";

function volverAPartidos(categoriaId: string, error?: string) {
  const base = `/dashboard/partidos?categoria=${categoriaId}`;
  redirect(error ? `${base}&error=${encodeURIComponent(error)}` : base);
}

export async function crearFase(formData: FormData) {
  const { supabase, perfil } = await requireSesion();
  exigirRol(perfil, ["superadmin", "admin_liga"]);

  const categoriaId = String(formData.get("categoria_id") ?? "");
  const tipo = String(formData.get("tipo") ?? "");
  const nombre = String(formData.get("nombre") ?? "").trim();
  const ordenRaw = String(formData.get("orden") ?? "").trim();

  if (!categoriaId || (tipo !== "liga" && tipo !== "playoff") || !nombre) {
    volverAPartidos(categoriaId, "Completá categoría, tipo y nombre de la fase");
  }

  const { data: temporadaActiva } = await supabase
    .from("temporadas")
    .select("id")
    .eq("activa", true)
    .maybeSingle();

  if (!temporadaActiva) {
    volverAPartidos(categoriaId, "No hay ninguna temporada activa");
    return;
  }

  const { error } = await supabase.from("fases").insert({
    temporada_id: temporadaActiva.id,
    categoria_id: categoriaId,
    tipo,
    nombre,
    orden: ordenRaw ? Number(ordenRaw) : 0,
  });

  if (error) {
    console.error("[fases] crearFase failed", error.message);
    volverAPartidos(categoriaId, "No se pudo crear la fase");
  }

  revalidatePath("/dashboard/partidos");
  volverAPartidos(categoriaId);
}

export async function generarFixtureLiga(faseId: string, categoriaId: string, formData: FormData) {
  const { supabase, perfil } = await requireSesion();
  exigirRol(perfil, ["superadmin", "admin_liga"]);

  const idaYVuelta = formData.get("ida_y_vuelta") === "on";

  const { data: fase } = await supabase
    .from("fases")
    .select("id, tipo, temporada_id, categoria_id")
    .eq("id", faseId)
    .maybeSingle();

  if (!fase || fase.tipo !== "liga") {
    volverAPartidos(categoriaId, "La fase no es de tipo liga");
    return;
  }

  const { count: existentes } = await supabase
    .from("partidos")
    .select("id", { count: "exact", head: true })
    .eq("fase_id", faseId);

  if (existentes && existentes > 0) {
    volverAPartidos(categoriaId, "Esta fase ya tiene partidos generados. Borralos antes de volver a generar.");
    return;
  }

  const { data: inscripciones } = await supabase
    .from("inscripciones")
    .select("equipo_id")
    .eq("categoria_id", fase.categoria_id)
    .eq("temporada_id", fase.temporada_id);

  const equipoIds = (inscripciones ?? []).map((i) => i.equipo_id);

  if (equipoIds.length < 2) {
    volverAPartidos(categoriaId, "Necesitás al menos 2 equipos inscriptos en esta categoría/temporada");
    return;
  }

  const partidosGenerados = idaYVuelta ? generarIdaYVuelta(equipoIds) : generarRoundRobin(equipoIds);

  const { error } = await supabase.from("partidos").insert(
    partidosGenerados.map((p) => ({
      fase_id: faseId,
      equipo_local_id: p.equipoLocalId,
      equipo_visitante_id: p.equipoVisitanteId,
      fecha_numero: p.fechaNumero,
      estado: "programado" as const,
    })),
  );

  if (error) {
    console.error("[partidos] generarFixtureLiga failed", error.message);
    volverAPartidos(categoriaId, "No se pudo generar el fixture");
    return;
  }

  revalidatePath("/dashboard/partidos");
  volverAPartidos(categoriaId);
}

export async function crearPartidoPlayoff(faseId: string, categoriaId: string, formData: FormData) {
  const { supabase, perfil } = await requireSesion();
  exigirRol(perfil, ["superadmin", "admin_liga"]);

  const equipoLocalId = String(formData.get("equipo_local_id") ?? "");
  const equipoVisitanteId = String(formData.get("equipo_visitante_id") ?? "");
  const llave = String(formData.get("llave") ?? "").trim();
  const fechaHora = String(formData.get("fecha_hora") ?? "").trim();
  const cancha = String(formData.get("cancha") ?? "").trim();

  if (!equipoLocalId || !equipoVisitanteId || equipoLocalId === equipoVisitanteId) {
    volverAPartidos(categoriaId, "Elegí dos equipos distintos");
    return;
  }

  const { error } = await supabase.from("partidos").insert({
    fase_id: faseId,
    equipo_local_id: equipoLocalId,
    equipo_visitante_id: equipoVisitanteId,
    llave: llave || null,
    fecha_hora: fechaHora || null,
    cancha: cancha || null,
    estado: "programado",
  });

  if (error) {
    console.error("[partidos] crearPartidoPlayoff failed", error.message);
    volverAPartidos(categoriaId, "No se pudo crear el cruce");
    return;
  }

  revalidatePath("/dashboard/partidos");
  volverAPartidos(categoriaId);
}

export async function programarPartido(partidoId: string, categoriaId: string, formData: FormData) {
  const { supabase, perfil } = await requireSesion();
  exigirRol(perfil, ["superadmin", "admin_liga"]);

  const fechaHora = String(formData.get("fecha_hora") ?? "").trim();
  const cancha = String(formData.get("cancha") ?? "").trim();
  const planilleroId = String(formData.get("planillero_id") ?? "").trim();

  const { error } = await supabase
    .from("partidos")
    .update({
      fecha_hora: fechaHora || null,
      cancha: cancha || null,
      planillero_id: planilleroId || null,
    })
    .eq("id", partidoId);

  if (error) {
    console.error("[partidos] programarPartido failed", error.message);
    volverAPartidos(categoriaId, "No se pudo programar el partido");
    return;
  }

  revalidatePath("/dashboard/partidos");
  volverAPartidos(categoriaId);
}
