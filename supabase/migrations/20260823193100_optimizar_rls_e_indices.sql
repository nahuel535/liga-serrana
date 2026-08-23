-- Liga Serrana - Paso 3.2
-- Limpieza de rendimiento detectada por el advisor de Supabase:
-- 1) Indices de FK que faltaban.
-- 2) "admins gestionan X" (FOR ALL) se solapaba con "leer X" (SELECT):
--    dos policies permisivas evaluandose en cada lectura. Se separan en
--    insert/update/delete puntuales (el select ya lo cubre "leer X").
-- 3) partidos/eventos_partido tenian una policy de admin + otra de
--    planillero para la misma accion (update/insert/delete): se
--    fusionan en una sola con OR, y de paso se envuelve auth.uid() en
--    (select auth.uid()) para que Postgres lo evalue una sola vez por
--    consulta en vez de una vez por fila.
-- 4) profiles: "superadmins can read all profiles" quedo subsumida por
--    "admins pueden leer perfiles" (is_admin() ya incluye superadmin).
-- Ningun cambio altera quien puede hacer que: es la misma logica de
-- permisos, reorganizada para que el planificador de Postgres la
-- evalue de forma mas barata.

-- ============================================================
-- Indices de FK faltantes
-- ============================================================
create index if not exists idx_equipos_delegado on public.equipos (delegado_id);
create index if not exists idx_eventos_created_by on public.eventos_partido (created_by);
create index if not exists idx_eventos_equipo on public.eventos_partido (equipo_id);
create index if not exists idx_eventos_jugador on public.eventos_partido (jugador_id);
create index if not exists idx_fases_categoria on public.fases (categoria_id);
create index if not exists idx_inscripciones_categoria on public.inscripciones (categoria_id);
create index if not exists idx_jugadores_profile on public.jugadores (profile_id);
create index if not exists idx_partidos_equipo_local on public.partidos (equipo_local_id);
create index if not exists idx_partidos_equipo_visitante on public.partidos (equipo_visitante_id);
create index if not exists idx_partidos_planillero on public.partidos (planillero_id);

-- ============================================================
-- Tablas simples
-- ============================================================

drop policy "admins gestionan temporadas" on public.temporadas;
create policy "admins insertan temporadas" on public.temporadas for insert to authenticated with check (public.is_admin());
create policy "admins actualizan temporadas" on public.temporadas for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins borran temporadas" on public.temporadas for delete to authenticated using (public.is_admin());

drop policy "admins gestionan categorias" on public.categorias;
create policy "admins insertan categorias" on public.categorias for insert to authenticated with check (public.is_admin());
create policy "admins actualizan categorias" on public.categorias for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins borran categorias" on public.categorias for delete to authenticated using (public.is_admin());

drop policy "admins gestionan equipos" on public.equipos;
create policy "admins insertan equipos" on public.equipos for insert to authenticated with check (public.is_admin());
create policy "admins actualizan equipos" on public.equipos for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins borran equipos" on public.equipos for delete to authenticated using (public.is_admin());

drop policy "admins gestionan inscripciones" on public.inscripciones;
create policy "admins insertan inscripciones" on public.inscripciones for insert to authenticated with check (public.is_admin());
create policy "admins actualizan inscripciones" on public.inscripciones for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins borran inscripciones" on public.inscripciones for delete to authenticated using (public.is_admin());

drop policy "admins gestionan jugadores" on public.jugadores;
create policy "admins insertan jugadores" on public.jugadores for insert to authenticated with check (public.is_admin());
create policy "admins actualizan jugadores" on public.jugadores for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins borran jugadores" on public.jugadores for delete to authenticated using (public.is_admin());

drop policy "admins gestionan fases" on public.fases;
create policy "admins insertan fases" on public.fases for insert to authenticated with check (public.is_admin());
create policy "admins actualizan fases" on public.fases for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins borran fases" on public.fases for delete to authenticated using (public.is_admin());

-- ============================================================
-- partidos
-- ============================================================

drop policy "admins gestionan partidos" on public.partidos;
drop policy "planillero actualiza su partido" on public.partidos;

create policy "admins insertan partidos" on public.partidos for insert to authenticated with check (public.is_admin());
create policy "admins borran partidos" on public.partidos for delete to authenticated using (public.is_admin());
create policy "actualizar partido" on public.partidos for update to authenticated
using (public.is_admin() or (public.is_planillero() and planillero_id = (select auth.uid())))
with check (public.is_admin() or (public.is_planillero() and planillero_id = (select auth.uid())));

-- ============================================================
-- eventos_partido
-- ============================================================

drop policy "admins gestionan eventos" on public.eventos_partido;
drop policy "planillero carga eventos" on public.eventos_partido;
drop policy "planillero borra eventos" on public.eventos_partido;

create policy "admins actualizan eventos" on public.eventos_partido for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "cargar evento" on public.eventos_partido for insert to authenticated
with check (
  public.is_admin()
  or (
    public.is_planillero()
    and exists (
      select 1 from public.partidos p
      where p.id = partido_id
        and p.planillero_id = (select auth.uid())
        and p.estado = 'en_vivo'
    )
  )
);

create policy "borrar evento" on public.eventos_partido for delete to authenticated
using (
  public.is_admin()
  or (
    public.is_planillero()
    and exists (
      select 1 from public.partidos p
      where p.id = partido_id
        and p.planillero_id = (select auth.uid())
        and p.estado = 'en_vivo'
    )
  )
);

-- ============================================================
-- profiles
-- ============================================================

drop policy "superadmins can read all profiles" on public.profiles;
