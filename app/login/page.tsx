import Link from "next/link";
import LoginForm from "./login-form";

export default function LoginPage() {
  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="brand-mark">LS</div>
        <h1>Ingreso interno</h1>
        <p>Acceso para administración, planilleros y usuarios autorizados.</p>

        <LoginForm />

        <Link className="back-link" href="/">← Volver a Liga Serrana</Link>
      </section>
    </main>
  );
}
