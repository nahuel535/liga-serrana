# Liga Serrana

Aplicación web para la gestión integral de Liga Serrana.

## Paso 1

Base del sistema:

- Inicio público
- Login con Supabase Auth
- Sesión SSR con cookies
- Dashboard privado
- Perfiles
- Roles base: `superadmin`, `admin_liga`, `planillero`, `delegado`, `jugador`

## Stack

- Next.js 16
- React 19
- TypeScript
- Supabase (PostgreSQL + Auth + Realtime más adelante)

## Configuración

1. Crear un proyecto en Supabase.
2. Copiar `.env.example` como `.env.local`.
3. Completar:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
4. Ejecutar `supabase/schema.sql` en el SQL Editor de Supabase.
5. Crear el primer usuario desde Supabase Auth.
6. Cambiar su rol a `superadmin` en la tabla `profiles`.
7. Ejecutar:

```bash
npm install
npm run dev
```

## Próximo bloque

Panel de administración y gestión de equipos/jugadores.

<!-- redeploy trigger -->
