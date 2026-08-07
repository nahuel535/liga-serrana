import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logout } from "./actions";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error("[dashboard] auth.getUser failed", userError?.message ?? "no user");
    redirect("/login");
  }

  let displayName = user.user_metadata?.full_name || "Usuario Liga Serrana";
  let role = "sin rol";

  try {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("full_name, role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error("[dashboard] profile query failed", profileError.message);
    } else if (profile) {
      displayName = profile.full_name || displayName;
      role = typeof profile.role === "string" ? profile.role : role;
    }
  } catch (error) {
    console.error("[dashboard] unexpected profile error", error);
  }

  return (
    <main className="dashboard-shell">
      <header className="dashboard-head">
        <div className="brand-mark">LS</div>
        <div className="brand-copy">
          <strong>Liga Serrana</strong>
          <span>Panel interno</span>
        </div>
        <form action={logout}>
          <button className="button button-secondary" type="submit">Cerrar sesión</button>
        </form>
      </header>

      <section className="dashboard-grid">
        <article className="panel">
          <span className="role-pill">{role.replaceAll("_", " ")}</span>
          <h1>Hola, {displayName}</h1>
          <p className="muted">El acceso ya está funcionando. En el próximo bloque vamos a convertir este panel según el rol del usuario.</p>
        </article>
        <article className="panel">
          <h2>Paso 1</h2>
          <p className="muted">✓ Autenticación</p>
          <p className="muted">✓ Perfil de usuario</p>
          <p className="muted">✓ Roles base</p>
          <p className="muted">✓ Área privada</p>
        </article>
      </section>
    </main>
  );
}
