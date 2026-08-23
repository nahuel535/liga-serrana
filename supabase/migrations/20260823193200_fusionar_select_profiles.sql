-- Liga Serrana - Paso 3.3
-- "admins pueden leer perfiles" y "users can read own profile" eran dos
-- policies permisivas de SELECT sobre la misma tabla y rol: se fusionan
-- en una sola con OR (mismo efecto, una sola evaluacion por consulta).

drop policy "admins pueden leer perfiles" on public.profiles;
drop policy "users can read own profile" on public.profiles;

create policy "leer perfil propio o admin"
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id or public.is_admin());
