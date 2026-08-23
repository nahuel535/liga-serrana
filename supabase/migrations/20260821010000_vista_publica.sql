-- Liga Serrana - Paso 3
-- Habilita lectura pública (sin login) para fixture, resultados, tabla de
-- posiciones y partido en vivo. A propósito NO se expone la tabla
-- `jugadores` completa (tiene DNI y fecha de nacimiento): se crea una
-- vista reducida solo con lo necesario para mostrar goleadores en la
-- planilla pública.

-- ============================================================
-- Vista segura de jugadores para el sitio público.
-- Sin security_invoker: corre con los privilegios del owner de la vista,
-- así puede leer la tabla `jugadores` (protegida por RLS) y exponer
-- únicamente las columnas no sensibles. La vista ES el límite de
-- seguridad acá, a propósito.
-- ============================================================

create view public.jugadores_publico as
select id, equipo_id, nombre_completo, numero_camiseta, foto_url, habilitado
from public.jugadores;

grant select on public.jugadores_publico to anon, authenticated;

-- ============================================================
-- Policies de lectura para el rol anon (visitantes sin login).
-- Se suman a las policies "to authenticated" ya existentes, no las
-- reemplazan.
-- ============================================================

create policy "publico lee temporadas" on public.temporadas for select to anon using (true);
create policy "publico lee categorias" on public.categorias for select to anon using (true);
create policy "publico lee equipos" on public.equipos for select to anon using (true);
create policy "publico lee fases" on public.fases for select to anon using (true);
create policy "publico lee partidos" on public.partidos for select to anon using (true);
create policy "publico lee eventos" on public.eventos_partido for select to anon using (true);

grant select on public.tabla_posiciones to anon;
