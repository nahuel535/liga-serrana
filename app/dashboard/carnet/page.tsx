import { headers } from "next/headers";
import QRCode from "qrcode";
import { requireSesion } from "@/lib/liga/auth";

export default async function CarnetPage() {
  const { supabase, perfil } = await requireSesion();

  const { data: jugador } = await supabase
    .from("jugadores")
    .select(
      `id, nombre_completo, dni, fecha_nacimiento, foto_url, numero_camiseta, habilitado,
       equipos(nombre)`,
    )
    .eq("profile_id", perfil.id)
    .maybeSingle();

  const equipo = jugador?.equipos as unknown as { nombre: string } | null;

  const { data: sancion } = jugador
    ? await supabase
        .from("jugadores_sancionados")
        .select("partidos_restantes")
        .eq("jugador_id", jugador.id)
        .maybeSingle()
    : { data: null };

  let qrDataUrl: string | null = null;
  if (jugador) {
    const headersList = await headers();
    const host = headersList.get("host") ?? "";
    const protocolo = host.startsWith("localhost") ? "http" : "https";
    const urlVerificacion = `${protocolo}://${host}/carnet/${jugador.id}`;
    qrDataUrl = await QRCode.toDataURL(urlVerificacion, {
      margin: 1,
      width: 220,
      color: { dark: "#0a1510", light: "#ffffff" },
    });
  }

  const suspendido = sancion && sancion.partidos_restantes > 0;

  return (
    <section className="dashboard-grid">
      <article className="panel">
        <h1>Mi carnet</h1>

        {jugador ? (
          <div className="carnet-credencial">
            <div className="carnet-credencial-header">
              <span className="carnet-credencial-marca">LS</span>
              <span>Liga Serrana</span>
            </div>

            <div className="carnet-credencial-body">
              <div className="carnet-credencial-foto">
                {jugador.foto_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={jugador.foto_url} alt={jugador.nombre_completo} />
                ) : (
                  <span>{jugador.nombre_completo.slice(0, 1)}</span>
                )}
              </div>

              <strong className="carnet-credencial-nombre">{jugador.nombre_completo}</strong>
              <p className="muted" style={{ margin: 0 }}>{equipo?.nombre ?? "Sin equipo"}</p>

              {jugador.numero_camiseta ? (
                <div className="carnet-credencial-numero">#{jugador.numero_camiseta}</div>
              ) : null}

              <dl className="carnet-credencial-datos">
                <div>
                  <dt>DNI</dt>
                  <dd>{jugador.dni}</dd>
                </div>
                {jugador.fecha_nacimiento && (
                  <div>
                    <dt>Nacimiento</dt>
                    <dd>{new Date(jugador.fecha_nacimiento + "T00:00:00").toLocaleDateString("es-AR")}</dd>
                  </div>
                )}
              </dl>

              <div className="carnet-credencial-estados">
                <span className={`badge ${jugador.habilitado ? "badge-ok" : "badge-off"}`}>
                  {jugador.habilitado ? "Habilitado" : "Inhabilitado"}
                </span>
                {suspendido && (
                  <span className="badge badge-off">
                    Suspendido · {sancion!.partidos_restantes} fecha{sancion!.partidos_restantes === 1 ? "" : "s"}
                  </span>
                )}
              </div>

              {qrDataUrl && (
                <>
                  <div className="carnet-credencial-qr">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={qrDataUrl} alt="Código QR de verificación del carnet" width={180} height={180} />
                  </div>
                  <p className="muted carnet-credencial-hint">
                    Mostrale este código al planillero antes del partido para que verifique tu carnet.
                  </p>
                </>
              )}
            </div>
          </div>
        ) : (
          <p className="muted">
            Todavía no tenés un carnet asociado a tu cuenta. Pedile al delegado de tu equipo o al admin
            de la liga que te vincule desde la ficha del plantel.
          </p>
        )}
      </article>
    </section>
  );
}
