import { requireSesion, ETIQUETA_ROL } from "@/lib/liga/auth";
import { cambiarContrasena } from "./actions";

export default async function CuentaPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const { perfil } = await requireSesion();
  const { error, ok } = await searchParams;

  return (
    <section className="dashboard-grid">
      <article className="panel">
        <span className="role-pill">{ETIQUETA_ROL[perfil.role]}</span>
        <h1>Mi cuenta</h1>
        <p className="muted">{perfil.full_name || "Usuario Liga Serrana"}</p>

        <h2>Cambiar contraseña</h2>
        {ok ? <p className="muted">✓ Contraseña actualizada correctamente.</p> : null}
        {error ? <div className="error-box">{decodeURIComponent(error)}</div> : null}
        <form action={cambiarContrasena}>
          <div className="field">
            <label htmlFor="password">Nueva contraseña</label>
            <input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} />
          </div>
          <div className="field">
            <label htmlFor="confirmar">Repetir contraseña</label>
            <input id="confirmar" name="confirmar" type="password" autoComplete="new-password" required minLength={8} />
          </div>
          <button className="button button-primary full" type="submit">Guardar</button>
        </form>
      </article>
    </section>
  );
}
