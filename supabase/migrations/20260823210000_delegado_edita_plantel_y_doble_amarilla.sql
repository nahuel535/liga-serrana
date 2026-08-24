-- Liga Serrana - Paso 5
-- 1) El delegado puede agregar/editar jugadores de SU propio equipo
--    (antes solo el admin podia).
-- 2) Doble amarilla en el mismo partido = expulsion, se sanciona como
--    una roja directa. Esas dos amarillas se marcan "consumidas" para
--    no contarlas otra vez en la acumulacion de temporada.

-- ============================================================
-- 1) RLS: delegado gestiona el plantel de su equipo
-- ============================================================

create policy "delegado inserta jugadores de su equipo"
on public.jugadores
for insert
to authenticated
with check (
  exists (
    select 1 from public.equipos e
    where e.id = equipo_id and e.delegado_id = (select auth.uid())
  )
);

create policy "delegado actualiza jugadores de su equipo"
on public.jugadores
for update
to authenticated
using (
  exists (
    select 1 from public.equipos e
    where e.id = equipo_id and e.delegado_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.equipos e
    where e.id = equipo_id and e.delegado_id = (select auth.uid())
  )
);

-- ============================================================
-- 2) Doble amarilla en el mismo partido
-- ============================================================

create or replace function public.evaluar_sancion_por_evento()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_temporada_id uuid;
  v_umbral int;
  v_partidos_amarillas int;
  v_partidos_roja int;
  v_amarillas_en_partido int;
  v_amarillas_sin_consumir int;
begin
  select f.temporada_id into v_temporada_id
  from public.partidos p
  join public.fases f on f.id = p.fase_id
  where p.id = new.partido_id;

  select amarillas_para_suspension, partidos_suspension_amarillas, partidos_suspension_roja
  into v_umbral, v_partidos_amarillas, v_partidos_roja
  from public.reglas_disciplinarias
  where temporada_id = v_temporada_id;

  if v_umbral is null then v_umbral := 3; end if;
  if v_partidos_amarillas is null then v_partidos_amarillas := 1; end if;
  if v_partidos_roja is null then v_partidos_roja := 1; end if;

  if new.tipo = 'tarjeta_roja' then
    insert into public.sanciones (jugador_id, equipo_id, motivo, partido_origen_id, partidos_totales)
    values (new.jugador_id, new.equipo_id, 'tarjeta_roja', new.partido_id, v_partidos_roja);

  elsif new.tipo = 'tarjeta_amarilla' then
    select count(*) into v_amarillas_en_partido
    from public.eventos_partido e
    where e.jugador_id = new.jugador_id
      and e.partido_id = new.partido_id
      and e.tipo = 'tarjeta_amarilla';

    if v_amarillas_en_partido = 2 then
      -- Segunda amarilla del partido: expulsion. Se sanciona como roja y
      -- esas dos tarjetas quedan afuera del conteo de acumulacion de
      -- temporada (ya "gastaron" su consecuencia aca).
      update public.eventos_partido
      set consumida = true
      where jugador_id = new.jugador_id
        and partido_id = new.partido_id
        and tipo = 'tarjeta_amarilla';

      insert into public.sanciones (jugador_id, equipo_id, motivo, partido_origen_id, partidos_totales)
      values (new.jugador_id, new.equipo_id, 'doble_amarilla', new.partido_id, v_partidos_roja);
    else
      select count(*) into v_amarillas_sin_consumir
      from public.eventos_partido e
      join public.partidos p on p.id = e.partido_id
      join public.fases f on f.id = p.fase_id
      where e.jugador_id = new.jugador_id
        and e.tipo = 'tarjeta_amarilla'
        and e.consumida = false
        and f.temporada_id = v_temporada_id;

      if v_amarillas_sin_consumir >= v_umbral then
        update public.eventos_partido
        set consumida = true
        where id in (
          select e.id
          from public.eventos_partido e
          join public.partidos p on p.id = e.partido_id
          join public.fases f on f.id = p.fase_id
          where e.jugador_id = new.jugador_id
            and e.tipo = 'tarjeta_amarilla'
            and e.consumida = false
            and f.temporada_id = v_temporada_id
          order by e.created_at asc
          limit v_umbral
        );

        insert into public.sanciones (jugador_id, equipo_id, motivo, partido_origen_id, partidos_totales)
        values (new.jugador_id, new.equipo_id, 'acumulacion_amarillas', new.partido_id, v_partidos_amarillas);
      end if;
    end if;
  end if;

  return new;
end;
$$;
