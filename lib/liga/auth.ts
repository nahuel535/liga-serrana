import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Rol = "superadmin" | "admin_liga" | "planillero" | "delegado" | "jugador";

export type Perfil = {
  id: string;
  full_name: string | null;
  role: Rol;
  active: boolean;
};

/**
 * Exige una sesión válida con perfil activo. A diferencia del dashboard
 * original, si el perfil no carga correctamente NO se sigue de largo con
 * valores por defecto: se corta y se manda a /login. Fail-closed, no
 * fail-open, sobre todo porque acá se decide qué puede ver cada rol.
 */
export async function requireSesion() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const { data: perfil, error: perfilError } = await supabase
    .from("profiles")
    .select("id, full_name, role, active")
    .eq("id", user.id)
    .maybeSingle<Perfil>();

  if (perfilError || !perfil || !perfil.active) {
    redirect("/login");
  }

  return { supabase, user, perfil: perfil as Perfil };
}

/** Corta la renderización si el rol del perfil no está en la lista permitida. */
export function exigirRol(perfil: Perfil, permitidos: Rol[]) {
  if (!permitidos.includes(perfil.role)) {
    redirect("/dashboard");
  }
}

export const ETIQUETA_ROL: Record<Rol, string> = {
  superadmin: "Superadmin",
  admin_liga: "Admin de liga",
  planillero: "Planillero",
  delegado: "Delegado",
  jugador: "Jugador",
};
