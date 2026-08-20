const BYE = "__BYE__";

export type PartidoGenerado = {
  fechaNumero: number;
  equipoLocalId: string;
  equipoVisitanteId: string;
};

/**
 * Genera el fixture de todos-contra-todos usando el método del círculo:
 * un equipo queda fijo y el resto rota una posición por fecha.
 * Si la cantidad de equipos es impar, se agrega un "bye" (fecha libre).
 * Alterna localía por ronda para no repetir siempre el mismo equipo de local.
 */
export function generarRoundRobin(equipoIds: string[]): PartidoGenerado[] {
  if (equipoIds.length < 2) return [];

  const equipos = [...equipoIds];
  if (equipos.length % 2 !== 0) equipos.push(BYE);

  const n = equipos.length;
  const rondas = n - 1;
  const arr = [...equipos];
  const partidos: PartidoGenerado[] = [];

  for (let ronda = 0; ronda < rondas; ronda++) {
    for (let i = 0; i < n / 2; i++) {
      const a = arr[i];
      const b = arr[n - 1 - i];
      if (a === BYE || b === BYE) continue;

      const [local, visitante] = ronda % 2 === 0 ? [a, b] : [b, a];
      partidos.push({ fechaNumero: ronda + 1, equipoLocalId: local, equipoVisitanteId: visitante });
    }

    // Rotar todo menos el primer equipo, que queda fijo.
    const fijo = arr[0];
    const resto = arr.slice(1);
    resto.unshift(resto.pop() as string);
    arr.splice(0, arr.length, fijo, ...resto);
  }

  return partidos;
}

/**
 * Ida y vuelta: repite el fixture invirtiendo localía y corriendo
 * la numeración de fecha.
 */
export function generarIdaYVuelta(equipoIds: string[]): PartidoGenerado[] {
  const ida = generarRoundRobin(equipoIds);
  const totalFechasIda = ida.reduce((max, p) => Math.max(max, p.fechaNumero), 0);

  const vuelta = ida.map((p) => ({
    fechaNumero: p.fechaNumero + totalFechasIda,
    equipoLocalId: p.equipoVisitanteId,
    equipoVisitanteId: p.equipoLocalId,
  }));

  return [...ida, ...vuelta];
}
