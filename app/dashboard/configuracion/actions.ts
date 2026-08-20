"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSesion, exigirRol } from "@/lib/liga/auth";

export async function crearTemporada(formData: FormData) {
  const { supabase, perfil } = await requireSesion();
  exigirRol(perfil, ["superadmin", "admin_liga"]);

  const nombre = String(formData.get("nombre") ?? "").trim();
  const marcarActiva = formData.get("activa") === "on";

  if (!nombre) {
    redirect("/dashboard/configuracion?error=El%20nombre%20de%20la%20temporada%20es%20obligatorio");
  }

  if (marcarActiva) {
    // Solo puede haber una temporada activa: primero apagamos la anterior.
    await supabase.from("temporadas").update({ activa: false }).eq("activa", true);
  }

  const { error } = await supabase.from("temporadas").insert({ nombre, activa: marcarActiva });

  if (error) {
    console.error("[temporadas] crearTemporada failed", error.message);
    redirect("/dashboard/configuracion?error=No%20se%20pudo%20crear%20la%20temporada");
  }

  revalidatePath("/dashboard/configuracion");
  redirect("/dashboard/configuracion");
}

export async function activarTemporada(temporadaId: string) {
  const { supabase, perfil } = await requireSesion();
  exigirRol(perfil, ["superadmin", "admin_liga"]);

  await supabase.from("temporadas").update({ activa: false }).eq("activa", true);
  const { error } = await supabase.from("temporadas").update({ activa: true }).eq("id", temporadaId);

  if (error) {
    console.error("[temporadas] activarTemporada failed", error.message);
  }

  revalidatePath("/dashboard/configuracion");
}

export async function crearCategoria(formData: FormData) {
  const { supabase, perfil } = await requireSesion();
  exigirRol(perfil, ["superadmin", "admin_liga"]);

  const nombre = String(formData.get("nombre") ?? "").trim();
  const ordenRaw = String(formData.get("orden") ?? "").trim();

  if (!nombre) {
    redirect("/dashboard/configuracion?error=El%20nombre%20de%20la%20categor%C3%ADa%20es%20obligatorio");
  }

  const { error } = await supabase.from("categorias").insert({
    nombre,
    orden: ordenRaw ? Number(ordenRaw) : 0,
  });

  if (error) {
    console.error("[categorias] crearCategoria failed", error.message);
    const mensaje = error.code === "23505" ? "Ya existe una categoría con ese nombre" : "No se pudo crear la categoría";
    redirect(`/dashboard/configuracion?error=${encodeURIComponent(mensaje)}`);
  }

  revalidatePath("/dashboard/configuracion");
  redirect("/dashboard/configuracion");
}
