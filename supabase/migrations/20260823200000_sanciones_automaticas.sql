-- Liga Serrana - Paso 4
-- Suspensiones automaticas por tarjetas: acumulacion de amarillas
-- (configurable por temporada) y roja directa. Las sanciones se
-- descuentan solas a medida que el equipo del jugador juega partidos.

-- ============================================================
-- Reglas disciplinarias por temporada (una fila por temporada)
-- ============================================================

create table public.reglas_disciplinarias (
  id uuid primary key default gen_random_uuid(),
  temporada_id uuid not null unique references public.temporadas(id) on delete cascade,
  amarillas_para_suspension int not null default 3,
  partidos_suspension_amarillas int not null default 1,
  partidos_suspension_roja int not null default 1,
  created_at timestamptz not null default now()
);

-- ============================================================
-- Sanciones activas/historicas por jugador
-- ============================================================

create table public.sanciones (
  id uuid primary key default gen_random_uuid(),
  jugador_id uuid not null references public.jugadores(id) on delete cascade,
  equipo_id uuid not null references public.equipos(id) on delete cascade,
  motivo text not null, -- 'acumulacion_amarillas' | 'tarjeta_roja' | 'manual'
  partido_origen_id uuid references public.partidos(id) on delete set null,
  partidos_totales int not null,
  partidos_cumplidos int not null default 0,
  activa boolean not null default true,
  created_at timestamptz not null default now()
);

create index idx_sanciones_jugador on public.sanciones (jugador_id);
create index idx_sanciones_equipo_activa on public.sanciones (equipo_id) where activa;

-- Marca que tarjetas amarillas ya fueron "gastadas" en una suspension,
-- para no volver a contarlas en la proxima acumulacion.
alter table public.eventos_partido add column consumida boolean not null default false;
create index idx_eventos_jugador_tipo_consumida on public.eventos_partido (jugador_id, tipo, consumida);

-- ============================================================
-- Trigger: evalua cada tarjeta cargada y genera la sancion si
-- corresponde.
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

  return new;
end;
$$;

create trigger trg_evaluar_sancion
after insert on public.eventos_partido
for each row execute procedure public.evaluar_sancion_por_evento();

-- ============================================================
-- Trigger: descuenta una fecha a las sanciones activas del equipo
-- cuando uno de sus partidos pasa a "finalizado".
-- ============================================================

create or replace function public.avanzar_sanciones_por_partido()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.estado = 'finalizado' and old.estado is distinct from 'finalizado' then
    update public.sanciones
    set partidos_cumplidos = partidos_cumplidos + 1,
        activa = (partidos_cumplidos + 1 < partidos_totales)
    where activa = true
      and equipo_id in (new.equipo_local_id, new.equipo_visitante_id);
  end if;
  return new;
end;
$$;

create trigger trg_avanzar_sanciones
after update on public.partidos
for each row execute procedure public.avanzar_sanciones_por_partido();

-- Ninguna de estas dos funciones esta pensada para llamarse por API.
revoke execute on function public.evaluar_sancion_por_evento() from public, anon, authenticated;
revoke execute on function public.avanzar_sanciones_por_partido() from public, anon, authenticated;

-- ============================================================
-- Vista: suspension vigente por jugador (suma si tuviera mas de una
-- sancion activa a la vez).
-- ============================================================

create view public.jugadores_sancionados
with (security_invoker = true)
as
select jugador_id, equipo_id, sum(partidos_totales - partidos_cumplidos) as partidos_restantes
from public.sanciones
where activa = true
group by jugador_id, equipo_id;

grant select on public.jugadores_sancionados to authenticated;

-- ============================================================
-- RLS
-- ============================================================

alter table public.reglas_disciplinarias enable row level security;
create policy "leer reglas" on public.reglas_disciplinarias for select to authenticated using (true);
create policy "admins insertan reglas" on public.reglas_disciplinarias for insert to authenticated with check (public.is_admin());
create policy "admins actualizan reglas" on public.reglas_disciplinarias for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins borran reglas" on public.reglas_disciplinarias for delete to authenticated using (public.is_admin());

alter table public.sanciones enable row level security;
create policy "leer sanciones" on public.sanciones for select to authenticated using (true);
create policy "admins insertan sanciones" on public.sanciones for insert to authenticated with check (public.is_admin());
create policy "admins actualizan sanciones" on public.sanciones for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins borran sanciones" on public.sanciones for delete to authenticated using (public.is_admin());
