"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function RestablecerForm() {
  const router = useRouter();
  const [verificando, setVerificando] = useState(true);
  const [listo, setListo] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setListo(true);
        setVerificando(false);
      }
    });

    // Si el link ya vencío o es invalido, el evento nunca llega: no nos
    // quedamos esperando para siempre.
    const timeout = setTimeout(() => setVerificando(false), 3000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres");
      return;
    }
    if (password !== confirmar) {
      setError("Las contraseñas no coinciden");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });

      if (updateError) {
        setError("No se pudo actualizar la contraseña. El link puede haber vencido — pedí uno nuevo.");
        setLoading(false);
        return;
      }

      setOk(true);
      setLoading(false);
      setTimeout(() => router.push("/dashboard"), 1500);
    } catch (err) {
      console.error("[restablecer] unexpected error", err);
      setError("No se pudo actualizar la contraseña. Intentá nuevamente.");
      setLoading(false);
    }
  }

  if (ok) {
    return <p className="muted">Listo, tu contraseña se actualizó. Te llevamos al panel…</p>;
  }

  if (verificando) {
    return <p className="muted">Verificando el link…</p>;
  }

  if (!listo) {
    return (
      <p className="muted">
        Este link no es válido o ya venció. Pedí uno nuevo desde{" "}
        <a href="/recuperar">recuperar contraseña</a>.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      {error ? <div className="error-box">{error}</div> : null}
      <div className="field">
        <label htmlFor="password">Nueva contraseña</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          minLength={8}
        />
      </div>
      <div className="field">
        <label htmlFor="confirmar">Repetir contraseña</label>
        <input
          id="confirmar"
          name="confirmar"
          type="password"
          autoComplete="new-password"
          value={confirmar}
          onChange={(event) => setConfirmar(event.target.value)}
          required
          minLength={8}
        />
      </div>
      <button className="button button-primary full" type="submit" disabled={loading}>
        {loading ? "Guardando…" : "Guardar nueva contraseña"}
      </button>
    </form>
  );
}
