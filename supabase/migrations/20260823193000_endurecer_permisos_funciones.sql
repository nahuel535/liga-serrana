-- Liga Serrana - Paso 3.1
-- Supabase otorga EXECUTE a anon/authenticated por default a toda funcion
-- nueva del schema public (via default privileges), ademas del PUBLIC
-- estandar de Postgres. El "revoke ... from public" de las migraciones
-- anteriores no alcanzaba esos grants explicitos. Esto lo corrige:
--
-- - is_admin/is_planillero/is_superadmin: le sacamos el permiso a anon
--   (nadie sin login necesita llamarlas; las policies que las usan son
--   todas "to authenticated"). Se lo dejamos a authenticated, que sí lo
--   necesita para que las RLS policies puedan evaluarlas.
-- - actualizar_goles_partido/handle_new_user: son funciones de trigger,
--   no estan pensadas para llamarse por API. Postgres ya bloquea la
--   invocacion directa de funciones "returns trigger" fuera de un
--   trigger, pero les sacamos el permiso igual para no dejarlas
--   expuestas como endpoint RPC innecesario.

revoke execute on function public.is_admin() from anon;
revoke execute on function public.is_planillero() from anon;
revoke execute on function public.is_superadmin() from anon;

revoke execute on function public.actualizar_goles_partido() from anon, authenticated;
revoke execute on function public.handle_new_user() from anon, authenticated;

-- Estas dos funciones de trigger tenian el privilegio EXECUTE otorgado a
-- PUBLIC (el default estandar de Postgres al crear una funcion), que es
-- distinto de los grants explicitos a anon/authenticated ya revocados
-- arriba. PUBLIC alcanza para que cualquiera (incluido anon) resuelva
-- el privilegio, asi que hay que revocarlo tambien ahi.

revoke execute on function public.actualizar_goles_partido() from public;
revoke execute on function public.handle_new_user() from public;
