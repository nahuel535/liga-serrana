-- Liga Serrana - bootstrap de SUPERADMIN inicial y políticas de gestión de perfiles

create or replace function public.is_superadmin()
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
      and role = 'superadmin'
      and active = true
  );
$$;

revoke all on function public.is_superadmin() from public;
grant execute on function public.is_superadmin() to authenticated;

-- Si todavía no existe un superadmin, promover al primer usuario creado.
do $$
begin
  if not exists (
    select 1 from public.profiles where role = 'superadmin'
  ) then
    update public.profiles
    set role = 'superadmin',
        updated_at = now()
    where id = (
      select id
      from auth.users
      order by created_at asc
      limit 1
    );
  end if;
end $$;

-- El usuario puede seguir leyendo su propio perfil.
drop policy if exists "superadmins can read all profiles" on public.profiles;
create policy "superadmins can read all profiles"
on public.profiles
for select
to authenticated
using (public.is_superadmin());

-- Solo SUPERADMIN puede modificar perfiles/roles desde la app.
drop policy if exists "superadmins can update profiles" on public.profiles;
create policy "superadmins can update profiles"
on public.profiles
for update
to authenticated
using (public.is_superadmin())
with check (public.is_superadmin());
