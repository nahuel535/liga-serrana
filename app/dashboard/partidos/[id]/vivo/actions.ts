"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSesion } from "@/lib/liga/auth";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Perfil } from "@/lib/liga/auth";

async function puedeOperar(supabase: SupabaseClient, perfil: Perfil, partidoId: string) {
  if (perfil.role === "superadmin" || perfil.role === "admin_liga") return true;
  if (perfil.role !== "planillero") return false;

  const { data } = await supabase
    .from("partidos")
    .select("planillero_id")
    .eq("id", partidoId)
    .maybeSingle();

  return data?.planillero_id === perfil.id;
}

export async function iniciarPartido(partidoId: string) {
  const { supabase, perfil } = await requireSesion();
  if (!(await puedeOperar(supabase, perfil, partidoId))) redirect("/dashboard/partidos");

  const { error } = await supabase.from("partidos").update({ estado: "en_vivo" }).eq("id", partidoId);
  if (error) console.error("[vivo] iniciarPartido failed", error.message);

  revalidatePath(`/dashboard/partidos/${partidoId}/vivo`);
}

export async function finalizarPartido(partidoId: string) {
  const { supabase, perfil } = await requireSesion();
  if (!(await puedeOperar(supabase, perfil, partidoId))) redirect("/dashboard/partidos");

  const { error } = await supabase.from("partidos").update({ estado: "finalizado" }).eq("id", partidoId);
  if (error) console.error("[vivo] finalizarPartido failed", error.message);

  revalidatePath(`/dashboard/partidos/${partidoId}/vivo`);
  revalidatePath("/dashboard/partidos");
  revalidatePath("/dashboard/tabla");
}

export async function cargarEvento(partidoId: string, formData: FormData) {
  const { supabase, perfil } = await requireSesion();
  if (!(await puedeOperar(supabase, perfil, partidoId))) redirect("/dashboard/partidos");

  const combinado = String(formData.get("jugador_equipo") ?? "");
  const tipo = String(formData.get("tipo") ?? "");
  const minutoRaw = String(formData.get("minuto") ?? "").trim();
  const [jugadorId, equipoId] = combinado.split("::");

  if (!jugadorId || !equipoId || !tipo) {
    revalidatePath(`/dashboard/partidos/${partidoId}/vivo`);
    return;
  }

  const { error } = await supabase.from("eventos_partido").insert({
    partido_id: partidoId,
    jugador_id: jugadorId,
    equipo_id: equipoId,
    tipo,
    minuto: minutoRaw ? Number(minutoRaw) : null,
    created_by: perfil.id,
  });

  if (error) console.error("[vivo] cargarEvento failed", error.message);

  revalidatePath(`/dashboard/partidos/${partidoId}/vivo`);
}

export async function borrarEvento(eventoId: string, partidoId: string) {
  const { supabase, perfil } = await requireSesion();
  if (!(await puedeOperar(supabase, perfil, partidoId))) redirect("/dashboard/partidos");

  const { error } = await supabase.from("eventos_partido").delete().eq("id", eventoId);
  if (error) console.error("[vivo] borrarEvento failed", error.message);

  revalidatePath(`/dashboard/partidos/${partidoId}/vivo`);
}
