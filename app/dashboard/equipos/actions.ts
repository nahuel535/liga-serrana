"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSesion, exigirRol } from "@/lib/liga/auth";

export async function crearEquipo(formData: FormData) {
  const { supabase, perfil } = await requireSesion();
  exigirRol(perfil, ["superadmin", "admin_liga"]);

  const nombre = String(formData.get("nombre") ?? "").trim();
  const escudoUrl = String(formData.get("escudo_url") ?? "").trim();

  if (!nombre) {
    redirect("/dashboard/equipos?error=El%20nombre%20es%20obligatorio");
  }

  const { error } = await supabase.from("equipos").insert({
    nombre,
    escudo_url: escudoUrl || null,
  });

  if (error) {
    console.error("[equipos] crearEquipo failed", error.message);
    redirect("/dashboard/equipos?error=No%20se%20pudo%20crear%20el%20equipo");
  }

  revalidatePath("/dashboard/equipos");
  redirect("/dashboard/equipos");
}
