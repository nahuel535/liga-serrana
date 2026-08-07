import Link from "next/link";
import { login } from "./actions";

type Props = {
  searchParams: Promise<{ error?: string }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const { error } = await searchParams;

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="brand-mark">LS</div>
        <h1>Ingreso interno</h1>
        <p>Acceso para administración, planilleros y usuarios autorizados.</p>

        {error ? <div className="error-box">{error}</div> : null}

        <form action={login}>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" autoComplete="email" required />
          </div>
          <div className="field">
            <label htmlFor="password">Contraseña</label>
            <input id="password" name="password" type="password" autoComplete="current-password" required />
          </div>
          <button className="button button-primary full" type="submit">Ingresar</button>
        </form>

        <Link className="back-link" href="/">← Volver a Liga Serrana</Link>
      </section>
    </main>
  );
}
