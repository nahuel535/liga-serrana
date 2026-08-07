import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logout } from "./actions";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();

  if (claimsError || !claimsData?.claims?.sub) {
    redirect("/login");
  }

  const userId = claimsData.claims.sub;
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", userId)
    .maybeSingle();

  const displayName = profile?.full_name || "Usuario Liga Serrana";
  const role = profile?.role || "sin rol";

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
