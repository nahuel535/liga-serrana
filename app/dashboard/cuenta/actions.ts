"use server";

import { redirect } from "next/navigation";
import { requireSesion } from "@/lib/liga/auth";

export async function cambiarContrasena(formData: FormData) {
  const { supabase } = await requireSesion();

  const password = String(formData.get("password") ?? "");
  const confirmar = String(formData.get("confirmar") ?? "");

  if (password.length < 8) {
    redirect("/dashboard/cuenta?error=La%20contrase%C3%B1a%20debe%20tener%20al%20menos%208%20caracteres");
  }
  if (password !== confirmar) {
    redirect("/dashboard/cuenta?error=Las%20contrase%C3%B1as%20no%20coinciden");
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    console.error("[cuenta] cambiarContrasena failed", error.message);
    redirect("/dashboard/cuenta?error=No%20se%20pudo%20cambiar%20la%20contrase%C3%B1a");
  }

  redirect("/dashboard/cuenta?ok=1");
}
