"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSesion, exigirRol } from "@/lib/liga/auth";

export async function crearJugador(equipoId: string, formData: FormData) {
  const { supabase, perfil } = await requireSesion();
  exigirRol(perfil, ["superadmin", "admin_liga"]);

  const nombreCompleto = String(formData.get("nombre_completo") ?? "").trim();
  const dni = String(formData.get("dni") ?? "").trim();
  const fechaNacimiento = String(formData.get("fecha_nacimiento") ?? "").trim();
  const fotoUrl = String(formData.get("foto_url") ?? "").trim();
  const numeroRaw = String(formData.get("numero_camiseta") ?? "").trim();

  if (!nombreCompleto || !dni) {
    redirect(`/dashboard/equipos/${equipoId}?error=Nombre%20y%20DNI%20son%20obligatorios`);
  }

  const { error } = await supabase.from("jugadores").insert({
    equipo_id: equipoId,
    nombre_completo: nombreCompleto,
    dni,
    fecha_nacimiento: fechaNacimiento || null,
    foto_url: fotoUrl || null,
    numero_camiseta: numeroRaw ? Number(numeroRaw) : null,
  });

  if (error) {
    console.error("[jugadores] crearJugador failed", error.message);
    const mensaje = error.code === "23505" ? "Ya existe un jugador con ese DNI en el equipo" : "No se pudo crear el jugador";
    redirect(`/dashboard/equipos/${equipoId}?error=${encodeURIComponent(mensaje)}`);
  }

  revalidatePath(`/dashboard/equipos/${equipoId}`);
  redirect(`/dashboard/equipos/${equipoId}`);
}

export async function alternarHabilitado(equipoId: string, jugadorId: string, habilitado: boolean) {
  const { supabase, perfil } = await requireSesion();
  exigirRol(perfil, ["superadmin", "admin_liga"]);

  const { error } = await supabase
    .from("jugadores")
    .update({ habilitado: !habilitado })
    .eq("id", jugadorId);

  if (error) {
    console.error("[jugadores] alternarHabilitado failed", error.message);
  }

  revalidatePath(`/dashboard/equipos/${equipoId}`);
}

export async function vincularJugador(equipoId: string, jugadorId: string, formData: FormData) {
  const { supabase, perfil } = await requireSesion();
  exigirRol(perfil, ["superadmin", "admin_liga"]);

  const profileId = String(formData.get("profile_id") ?? "").trim();

  const { error } = await supabase
    .from("jugadores")
    .update({ profile_id: profileId || null })
    .eq("id", jugadorId);

  if (error) {
    console.error("[jugadores] vincularJugador failed", error.message);
  }

  revalidatePath(`/dashboard/equipos/${equipoId}`);
}

export async function inscribirEquipo(equipoId: string, formData: FormData) {
  const { supabase, perfil } = await requireSesion();
  exigirRol(perfil, ["superadmin", "admin_liga"]);

  const categoriaId = String(formData.get("categoria_id") ?? "");
  const temporadaId = String(formData.get("temporada_id") ?? "");

  if (!categoriaId || !temporadaId) {
    redirect(`/dashboard/equipos/${equipoId}?error=Eleg%C3%AD%20categor%C3%ADa%20y%20temporada`);
  }

  const { error } = await supabase.from("inscripciones").insert({
    equipo_id: equipoId,
    categoria_id: categoriaId,
    temporada_id: temporadaId,
  });

  if (error) {
    console.error("[inscripciones] inscribirEquipo failed", error.message);
    const mensaje = error.code === "23505" ? "El equipo ya está inscripto en esa categoría/temporada" : "No se pudo inscribir el equipo";
    redirect(`/dashboard/equipos/${equipoId}?error=${encodeURIComponent(mensaje)}`);
  }

  revalidatePath(`/dashboard/equipos/${equipoId}`);
  redirect(`/dashboard/equipos/${equipoId}`);
}
