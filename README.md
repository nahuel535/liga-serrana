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

## Paso 2

Módulo de competencia:

- Temporadas y categorías (ej. Primera, Reserva)
- Equipos y jugadores (carnet digital)
- Fases por categoría: liga (todos contra todos) y playoff (cruces)
- Fixture: generación automática de la fase de liga
- Partido en vivo: el planillero carga goles y tarjetas, todo se actualiza
  en tiempo real vía Supabase Realtime
- Tabla de posiciones calculada a partir de los resultados

## Stack

- Next.js 16
- React 19
- TypeScript
- Supabase (PostgreSQL + Auth + Realtime)

## Configuración

1. Crear un proyecto en Supabase.
2. Copiar `.env.example` como `.env.local`.
3. Completar:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
4. Aplicar las migraciones de `supabase/migrations/` **en orden**, ya sea:
   - pegando cada archivo en el SQL Editor de Supabase, o
   - dejando que lo haga el workflow `supabase-deploy.yml` al pushear a `main`
     (requiere los secrets `SUPABASE_ACCESS_TOKEN` y `SUPABASE_PROJECT_ID`).
5. Crear el primer usuario desde Supabase Auth.
6. Su rol pasa a `superadmin` automáticamente (lo hace la migración
   `bootstrap_superadmin` con el usuario más antiguo). Para los siguientes
   usuarios, cambiar el rol a mano desde la tabla `profiles`.
7. Ejecutar:

```bash
npm install
npm run dev
```

> No existe `schema.sql`: las migraciones en `supabase/migrations/` son la
> única fuente de verdad del esquema. Si necesitás un snapshot completo,
> generalo con `supabase db dump` en vez de mantenerlo a mano.

## Próximo bloque

Vistas públicas (fixture y tabla de posiciones sin login) y notificaciones.

<!-- redeploy trigger -->
