# SportSuite 360 — Next.js + Supabase

MVP multiempresa para gimnasios reconstruido a partir del producto Laravel original. Incluye autenticación, aislamiento por tenant, socios, planes, membresías, pagos, asistencia y dashboard.

## Stack

- Next.js (App Router), React, TypeScript y Tailwind CSS
- TanStack Query, React Hook Form y Zod
- Supabase Auth, PostgreSQL, Storage, Row Level Security y Edge Functions

## Desarrollo local

Requisitos: Node.js 20 o superior, npm, una cuenta Supabase y Supabase CLI para trabajar con la base local o remota.

```bash
npm install
copy .env.example .env.local
npm run dev
```

Completa `.env.local` con los valores de **Project Settings → API**. `SUPABASE_SERVICE_ROLE_KEY` nunca lleva el prefijo `NEXT_PUBLIC_` y no se utiliza en el navegador.

## Preparar Supabase

```bash
supabase login
supabase link --project-ref TU_PROJECT_REF
supabase db push
supabase db seed
supabase functions deploy
```

La migración crea todas las tablas, índices, políticas RLS, el bucket privado de fotos y las funciones SQL transaccionales. El seed crea el tenant demo y tres planes.

Para el primer acceso:

1. Crea un usuario en **Authentication → Users** desde el dashboard de Supabase.
2. Copia su UUID.
3. Ejecuta en el SQL Editor la sentencia comentada al final de `supabase/seed.sql`, reemplazando `USER_UUID`.
4. Inicia sesión con el correo y contraseña de ese usuario.

## Seguridad y operaciones críticas

El navegador solo hace CRUD directo sobre socios y planes. RLS adjunta y valida el `tenant_id` del usuario autenticado. Las membresías, pagos y asistencias pasan por Edge Functions que:

1. verifican el JWT;
2. validan el payload con Zod;
3. ejecutan una función PostgreSQL atómica con la clave de servicio;
4. vuelven a validar tenant, usuario activo y rol dentro de PostgreSQL.

Los RPC críticos no tienen permiso de ejecución para `anon` ni `authenticated`; solo `service_role` puede invocarlos.

## Validación

```bash
npm run typecheck
npm run build
```

## Formato del código

Prettier y sus plugins para PostgreSQL/PL/pgSQL y TOML están incluidos como dependencias de desarrollo. Después de `npm install`, ejecuta:

```bash
npm run format
npm run format:check
```

`format` aplica el formato y `format:check` comprueba los archivos sin modificarlos. La configuración compartida está en `.prettierrc.json`; `.prettierignore` excluye dependencias, archivos generados, secretos y estado local de Supabase.

En VS Code, abre la carpeta del repositorio e instala la extensión recomendada **Prettier – Code formatter** (`esbenp.prettier-vscode`). Los ajustes de `.vscode/settings.json` activan el formato al guardar, también para SQL y TOML. Las instrucciones de `AGENTS.md` requieren usar esta configuración en futuros cambios.

## Despliegue en Vercel

1. Importa este repositorio en Vercel.
2. Agrega `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` a todos los entornos requeridos.
3. Despliega. Vercel detectará Next.js automáticamente.

Las Edge Functions y migraciones se despliegan en Supabase, no en Vercel. Configura en Supabase los dominios de producción y vista previa permitidos para Auth.

## Estructura

```text
app/                       rutas y layouts
components/                shell y componentes compartidos
features/                  UI y consultas por dominio
lib/supabase/              clientes browser/server
lib/api/                   cliente de Edge Functions
supabase/migrations/       esquema, RLS y RPC transaccionales
supabase/functions/        siete operaciones críticas
supabase/seed.sql          tenant y planes de demostración
```

La comparación con el producto original está en `docs/LEGACY_MAPPING.md`.
