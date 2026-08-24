-- Liga Serrana - Paso 6
-- La pantalla de verificacion de carnet (a donde apunta el QR del carnet
-- del jugador) necesita poder leer si el jugador esta suspendido, sin
-- login. No expone nada sensible (dni, fecha de nacimiento siguen
-- protegidos via jugadores_publico), solo cuantas fechas de suspension
-- le quedan.

grant select on public.jugadores_sancionados to anon;
