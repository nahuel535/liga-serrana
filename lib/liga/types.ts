export type FaseTipo = "liga" | "playoff";
export type PartidoEstado = "programado" | "en_vivo" | "finalizado" | "suspendido";
export type EventoTipo = "gol" | "gol_en_contra" | "tarjeta_amarilla" | "tarjeta_roja";

export type Temporada = {
  id: string;
  nombre: string;
  activa: boolean;
};

export type Categoria = {
  id: string;
  nombre: string;
  orden: number;
};

export type Equipo = {
  id: string;
  nombre: string;
  escudo_url: string | null;
  delegado_id: string | null;
};

export type Jugador = {
  id: string;
  equipo_id: string;
  profile_id: string | null;
  nombre_completo: string;
  dni: string;
  fecha_nacimiento: string | null;
  foto_url: string | null;
  numero_camiseta: number | null;
  habilitado: boolean;
};

export type Fase = {
  id: string;
  temporada_id: string;
  categoria_id: string;
  tipo: FaseTipo;
  nombre: string;
  orden: number;
};

export type Partido = {
  id: string;
  fase_id: string;
  equipo_local_id: string;
  equipo_visitante_id: string;
  fecha_hora: string | null;
  cancha: string | null;
  fecha_numero: number | null;
  llave: string | null;
  estado: PartidoEstado;
  goles_local: number;
  goles_visitante: number;
  planillero_id: string | null;
};

export type EventoPartido = {
  id: string;
  partido_id: string;
  jugador_id: string;
  equipo_id: string;
  tipo: EventoTipo;
  minuto: number | null;
  created_at: string;
};

export type ReglasDisciplinarias = {
  id: string;
  temporada_id: string;
  amarillas_para_suspension: number;
  partidos_suspension_amarillas: number;
  partidos_suspension_roja: number;
};

export type Sancion = {
  id: string;
  jugador_id: string;
  equipo_id: string;
  motivo: "acumulacion_amarillas" | "tarjeta_roja" | "doble_amarilla" | "manual";
  partido_origen_id: string | null;
  partidos_totales: number;
  partidos_cumplidos: number;
  activa: boolean;
};

export const ETIQUETA_MOTIVO_SANCION: Record<Sancion["motivo"], string> = {
  acumulacion_amarillas: "Acumulación de amarillas",
  tarjeta_roja: "Tarjeta roja",
  doble_amarilla: "Expulsión (doble amarilla)",
  manual: "Sanción del tribunal",
};

export const ETIQUETA_ESTADO: Record<PartidoEstado, string> = {
  programado: "Programado",
  en_vivo: "En vivo",
  finalizado: "Finalizado",
  suspendido: "Suspendido",
};

export const ETIQUETA_EVENTO: Record<EventoTipo, string> = {
  gol: "Gol",
  gol_en_contra: "Gol en contra",
  tarjeta_amarilla: "Tarjeta amarilla",
  tarjeta_roja: "Tarjeta roja",
};
