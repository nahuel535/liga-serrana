import Link from "next/link";
import RestablecerForm from "./restablecer-form";

export default function RestablecerPage() {
  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="brand-mark">LS</div>
        <h1>Elegí tu nueva contraseña</h1>

        <RestablecerForm />

        <Link className="back-link" href="/login">← Volver al login</Link>
      </section>
    </main>
  );
}
