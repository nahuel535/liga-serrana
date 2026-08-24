import Link from "next/link";
import RecuperarForm from "./recuperar-form";

export default function RecuperarPage() {
  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="brand-mark">LS</div>
        <h1>Recuperar contraseña</h1>
        <p>Te mandamos un link a tu email para que puedas elegir una nueva.</p>

        <RecuperarForm />

        <Link className="back-link" href="/login">← Volver al login</Link>
      </section>
    </main>
  );
}
