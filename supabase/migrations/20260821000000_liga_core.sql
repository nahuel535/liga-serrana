-- Liga Serrana - Paso 2
-- Modelo de competencia: temporadas, categorias, equipos, jugadores,
-- fases (liga/playoff), partidos, eventos de partido (goles/tarjetas)
-- y tabla de posiciones calculada.

-- ============================================================
-- ENUMS
-- ============================================================

create type public.fase_tipo as enum ('liga', 'playoff');
create type public.partido_estado as enum ('programado', 'en_vivo', 'finalizado', 'suspendido');
create type public.evento_tipo as enum ('gol', 'gol_en_contra', 'tarjeta_amarilla', 'tarjeta_roja');

-- ============================================================
-- FUNCIONES DE ROL (se suman a is_superadmin() ya existente)
-- ============================================================

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role in ('superadmin', 'admin_liga')
      and active = true
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

create or replace function public.is_planillero()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'planillero'
      and active = true
  );
$$;

revoke all on function public.is_planillero() from public;
grant execute on function public.is_planillero() to authenticated;

-- Los admins (superadmin + admin_liga) necesitan ver todos los perfiles
-- para poder asignar delegados/planilleros a equipos y partidos.
drop policy if exists "admins pueden leer perfiles" on public.profiles;
create policy "admins pueden leer perfiles"
on public.profiles
for select
to authenticated
using (public.is_admin());

-- ============================================================
-- TABLAS
-- ============================================================

create table public.temporadas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  activa boolean not null default false,
  created_at timestamptz not null default now()
);

-- Solo puede haber una temporada activa a la vez.
create unique index temporadas_una_activa
on public.temporadas (activa)
where activa;

create table public.categorias (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  orden int not null default 0
);

create table public.equipos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  escudo_url text,
  delegado_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Un equipo se inscribe en una categoria para una temporada puntual.
create table public.inscripciones (
  id uuid primary key default gen_random_uuid(),
  equipo_id uuid not null references public.equipos(id) on delete cascade,
  categoria_id uuid not null references public.categorias(id) on delete restrict,
  temporada_id uuid not null references public.temporadas(id) on delete cascade,
  unique (equipo_id, categoria_id, temporada_id)
);

create table public.jugadores (
  id uuid primary key default gen_random_uuid(),
  equipo_id uuid not null references public.equipos(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete set null,
  nombre_completo text not null,
  dni text not null,
  fecha_nacimiento date,
  foto_url text,
  numero_camiseta int,
  habilitado boolean not null default true,
  created_at timestamptz not null default now(),
  unique (equipo_id, dni)
);

-- Fase liga o fase playoff, siempre atada a una categoria+temporada.
create table public.fases (
  id uuid primary key default gen_random_uuid(),
  temporada_id uuid not null references public.temporadas(id) on delete cascade,
  categoria_id uuid not null references public.categorias(id) on delete cascade,
  tipo public.fase_tipo not null,
  nombre text not null,
  orden int not null default 0
);

create table public.partidos (
  id uuid primary key default gen_random_uuid(),
  fase_id uuid not null references public.fases(id) on delete cascade,
  equipo_local_id uuid not null references public.equipos(id) on delete restrict,
  equipo_visitante_id uuid not null references public.equipos(id) on delete restrict,
  fecha_hora timestamptz,
  cancha text,
  fecha_numero int,
  llave text,
  estado public.partido_estado not null default 'programado',
  goles_local int not null default 0,
  goles_visitante int not null default 0,
  planillero_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint equipos_distintos check (equipo_local_id <> equipo_visitante_id)
);

create table public.eventos_partido (
  id uuid primary key default gen_random_uuid(),
  partido_id uuid not null references public.partidos(id) on delete cascade,
  jugador_id uuid not null references public.jugadores(id) on delete cascade,
  equipo_id uuid not null references public.equipos(id) on delete cascade,
  tipo public.evento_tipo not null,
  minuto int,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null
);

create index idx_inscripciones_temporada on public.inscripciones (temporada_id, categoria_id);
create index idx_jugadores_equipo on public.jugadores (equipo_id);
create index idx_fases_temporada_categoria on public.fases (temporada_id, categoria_id);
create index idx_partidos_fase on public.partidos (fase_id);
create index idx_partidos_fecha on public.partidos (fecha_hora);
create index idx_eventos_partido on public.eventos_partido (partido_id);

-- ============================================================
-- TRIGGER: mantener el marcador de partidos.goles_* sincronizado
-- con los eventos cargados (goles y goles en contra).
-- ============================================================

create or replace function public.actualizar_goles_partido()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_partido_id uuid;
begin
  v_partido_id := coalesce(new.partido_id, old.partido_id);

  update public.partidos p
  set goles_local = (
        select count(*) from public.eventos_partido e
        where e.partido_id = v_partido_id and e.equipo_id = p.equipo_local_id and e.tipo = 'gol'
      ) + (
        select count(*) from public.eventos_partido e
        where e.partido_id = v_partido_id and e.equipo_id = p.equipo_visitante_id and e.tipo = 'gol_en_contra'
      ),
      goles_visitante = (
        select count(*) from public.eventos_partido e
        where e.partido_id = v_partido_id and e.equipo_id = p.equipo_visitante_id and e.tipo = 'gol'
      ) + (
        select count(*) from public.eventos_partido e
        where e.partido_id = v_partido_id and e.equipo_id = p.equipo_local_id and e.tipo = 'gol_en_contra'
      )
  where p.id = v_partido_id;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_actualizar_goles on public.eventos_partido;
create trigger trg_actualizar_goles
after insert or delete on public.eventos_partido
for each row execute procedure public.actualizar_goles_partido();

-- ============================================================
-- RLS
-- ============================================================

alter table public.temporadas enable row level security;
create policy "leer temporadas" on public.temporadas for select to authenticated using (true);
create policy "admins gestionan temporadas" on public.temporadas for all to authenticated using (public.is_admin()) with check (public.is_admin());

alter table public.categorias enable row level security;
create policy "leer categorias" on public.categorias for select to authenticated using (true);
create policy "admins gestionan categorias" on public.categorias for all to authenticated using (public.is_admin()) with check (public.is_admin());

alter table public.equipos enable row level security;
create policy "leer equipos" on public.equipos for select to authenticated using (true);
create policy "admins gestionan equipos" on public.equipos for all to authenticated using (public.is_admin()) with check (public.is_admin());

alter table public.inscripciones enable row level security;
create policy "leer inscripciones" on public.inscripciones for select to authenticated using (true);
create policy "admins gestionan inscripciones" on public.inscripciones for all to authenticated using (public.is_admin()) with check (public.is_admin());

alter table public.jugadores enable row level security;
create policy "leer jugadores" on public.jugadores for select to authenticated using (true);
create policy "admins gestionan jugadores" on public.jugadores for all to authenticated using (public.is_admin()) with check (public.is_admin());

alter table public.fases enable row level security;
create policy "leer fases" on public.fases for select to authenticated using (true);
create policy "admins gestionan fases" on public.fases for all to authenticated using (public.is_admin()) with check (public.is_admin());

alter table public.partidos enable row level security;
create policy "leer partidos" on public.partidos for select to authenticated using (true);
create policy "admins gestionan partidos" on public.partidos for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- El planillero solo puede tocar el partido que tiene asignado.
create policy "planillero actualiza su partido"
on public.partidos
for update
to authenticated
using (public.is_planillero() and planillero_id = auth.uid())
with check (public.is_planillero() and planillero_id = auth.uid());

alter table public.eventos_partido enable row level security;
create policy "leer eventos" on public.eventos_partido for select to authenticated using (true);
create policy "admins gestionan eventos" on public.eventos_partido for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- El planillero solo carga/borra eventos de un partido propio y "en_vivo".
create policy "planillero carga eventos"
on public.eventos_partido
for insert
to authenticated
with check (
  public.is_planillero()
  and exists (
    select 1 from public.partidos p
    where p.id = partido_id
      and p.planillero_id = auth.uid()
      and p.estado = 'en_vivo'
  )
);

create policy "planillero borra eventos"
on public.eventos_partido
for delete
to authenticated
using (
  public.is_planillero()
  and exists (
    select 1 from public.partidos p
    where p.id = partido_id
      and p.planillero_id = auth.uid()
      and p.estado = 'en_vivo'
  )
);

-- ============================================================
-- VISTA: tabla de posiciones (solo fases de tipo 'liga')
-- security_invoker hace que respete las policies del usuario que consulta.
-- ============================================================

create view public.tabla_posiciones
with (security_invoker = true)
as
with resultados as (
  select
    p.fase_id,
    p.equipo_local_id as equipo_id,
    case when p.goles_local > p.goles_visitante then 3
         when p.goles_local = p.goles_visitante then 1
         else 0 end as puntos,
    1 as pj,
    case when p.goles_local > p.goles_visitante then 1 else 0 end as pg,
    case when p.goles_local = p.goles_visitante then 1 else 0 end as pe,
    case when p.goles_local < p.goles_visitante then 1 else 0 end as pp,
    p.goles_local as gf,
    p.goles_visitante as gc
  from public.partidos p
  join public.fases f on f.id = p.fase_id
  where f.tipo = 'liga' and p.estado = 'finalizado'
  union all
  select
    p.fase_id,
    p.equipo_visitante_id as equipo_id,
    case when p.goles_visitante > p.goles_local then 3
         when p.goles_visitante = p.goles_local then 1
         else 0 end as puntos,
    1,
    case when p.goles_visitante > p.goles_local then 1 else 0 end,
    case when p.goles_visitante = p.goles_local then 1 else 0 end,
    case when p.goles_visitante < p.goles_local then 1 else 0 end,
    p.goles_visitante,
    p.goles_local
  from public.partidos p
  join public.fases f on f.id = p.fase_id
  where f.tipo = 'liga' and p.estado = 'finalizado'
)
select
  fase_id,
  equipo_id,
  sum(pj)::int as pj,
  sum(pg)::int as pg,
  sum(pe)::int as pe,
  sum(pp)::int as pp,
  sum(gf)::int as gf,
  sum(gc)::int as gc,
  sum(gf - gc)::int as dg,
  sum(puntos)::int as puntos
from resultados
group by fase_id, equipo_id;

grant select on public.tabla_posiciones to authenticated;

-- ============================================================
-- REALTIME: sin esto, la pantalla de "partido en vivo" no recibe
-- los cambios de marcador/eventos en las demás pantallas conectadas.
-- ============================================================

alter publication supabase_realtime add table public.partidos;
alter publication supabase_realtime add table public.eventos_partido;
