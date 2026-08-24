"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function RecuperarForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const supabase = createClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/restablecer`,
      });

      if (resetError) {
        setError("No se pudo enviar el email. Intentá nuevamente.");
        setLoading(false);
        return;
      }

      setEnviado(true);
      setLoading(false);
    } catch (err) {
      console.error("[recuperar] unexpected error", err);
      setError("No se pudo enviar el email. Intentá nuevamente.");
      setLoading(false);
    }
  }

  if (enviado) {
    return (
      <p className="muted">
        Si ese email está registrado, te llegó un link para elegir una nueva contraseña.
        Revisá también la carpeta de spam — puede tardar unos minutos.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      {error ? <div className="error-box">{error}</div> : null}
      <div className="field">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </div>
      <button className="button button-primary full" type="submit" disabled={loading}>
        {loading ? "Enviando…" : "Enviar link"}
      </button>
    </form>
  );
}
