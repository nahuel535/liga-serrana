"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSesion, exigirRol } from "@/lib/liga/auth";

async function equipoPropio(supabase: Awaited<ReturnType<typeof requireSesion>>["supabase"], delegadoId: string) {
  const { data } = await supabase.from("equipos").select("id").eq("delegado_id", delegadoId).maybeSingle();
  return data;
}

export async function crearJugadorPropio(formData: FormData) {
  const { supabase, perfil } = await requireSesion();
  exigirRol(perfil, ["delegado"]);

  const equipo = await equipoPropio(supabase, perfil.id);
  if (!equipo) redirect("/dashboard/mi-equipo");

  const nombreCompleto = String(formData.get("nombre_completo") ?? "").trim();
  const dni = String(formData.get("dni") ?? "").trim();
  const fechaNacimiento = String(formData.get("fecha_nacimiento") ?? "").trim();
  const fotoUrl = String(formData.get("foto_url") ?? "").trim();
  const numeroRaw = String(formData.get("numero_camiseta") ?? "").trim();

  if (!nombreCompleto || !dni) {
    redirect("/dashboard/mi-equipo?error=Nombre%20y%20DNI%20son%20obligatorios");
  }

  const { error } = await supabase.from("jugadores").insert({
    equipo_id: equipo.id,
    nombre_completo: nombreCompleto,
    dni,
    fecha_nacimiento: fechaNacimiento || null,
    foto_url: fotoUrl || null,
    numero_camiseta: numeroRaw ? Number(numeroRaw) : null,
  });

  if (error) {
    console.error("[mi-equipo] crearJugadorPropio failed", error.message);
    const mensaje = error.code === "23505" ? "Ya existe un jugador con ese DNI en el equipo" : "No se pudo crear el jugador";
    redirect(`/dashboard/mi-equipo?error=${encodeURIComponent(mensaje)}`);
  }

  revalidatePath("/dashboard/mi-equipo");
  redirect("/dashboard/mi-equipo");
}

export async function alternarHabilitadoPropio(jugadorId: string, habilitado: boolean) {
  const { supabase, perfil } = await requireSesion();
  exigirRol(perfil, ["delegado"]);

  const equipo = await equipoPropio(supabase, perfil.id);
  if (!equipo) redirect("/dashboard/mi-equipo");

  const { error } = await supabase
    .from("jugadores")
    .update({ habilitado: !habilitado })
    .eq("id", jugadorId)
    .eq("equipo_id", equipo.id);

  if (error) {
    console.error("[mi-equipo] alternarHabilitadoPropio failed", error.message);
  }

  revalidatePath("/dashboard/mi-equipo");
}

export async function vincularJugadorPropio(jugadorId: string, formData: FormData) {
  const { supabase, perfil } = await requireSesion();
  exigirRol(perfil, ["delegado"]);

  const equipo = await equipoPropio(supabase, perfil.id);
  if (!equipo) redirect("/dashboard/mi-equipo");

  const profileId = String(formData.get("profile_id") ?? "").trim();

  const { error } = await supabase
    .from("jugadores")
    .update({ profile_id: profileId || null })
    .eq("id", jugadorId)
    .eq("equipo_id", equipo.id);

  if (error) {
    console.error("[mi-equipo] vincularJugadorPropio failed", error.message);
  }

  revalidatePath("/dashboard/mi-equipo");
}
