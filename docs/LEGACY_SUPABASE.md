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

Para una instalación nueva, usa los comandos siguientes. Si la instalación ya está en uso, sigue primero **Migrar una instalación existente**: los nuevos endpoints deben verificarse antes de eliminar los RPC.

```bash
supabase login
supabase link --project-ref TU_PROJECT_REF
supabase db push
supabase db seed
supabase functions deploy
```

Las migraciones crean las tablas, índices, políticas RLS y el bucket privado de fotos. Los servicios TypeScript implementan las operaciones transaccionales. El seed crea el tenant demo y tres planes.

Para el primer acceso:

1. Crea un usuario en **Authentication → Users** desde el dashboard de Supabase.
2. Copia su UUID.
3. Ejecuta en el SQL Editor la sentencia comentada al final de `supabase/seed.sql`, reemplazando `USER_UUID`.
4. Inicia sesión con el correo y contraseña de ese usuario.

## Seguridad y operaciones críticas

El navegador hace CRUD directo sobre socios y planes, con RLS. Las membresías, pagos y asistencias pasan por Edge Functions que verifican el JWT y validan el payload con Zod antes de ejecutar servicios TypeScript en `_shared/services/`.

`_shared/operations.ts` deriva el tenant del perfil autenticado y exige un usuario activo con rol admin o recepción. Todas las consultas CRUD están parametrizadas y filtradas por tenant. `_shared/database.ts` usa Postgres.js y transacciones reales; un error revierte todas las escrituras de la operación. Un bloqueo por tenant serializa las operaciones de negocio concurrentes para evitar pérdidas de saldo e ingresos duplicados. Las operaciones de un mismo gimnasio pueden esperar unas por otras.

Los únicos helpers SQL conservados son `current_tenant_id`, `current_role` y `can_manage`, necesarios para RLS. La migración inicial es histórica; la migración `202609120001_move_business_logic_to_typescript.sql` elimina los RPC de negocio.

### Migrar una instalación existente

1. Configura el secreto **server-only** `SUPABASE_DB_URL` con la URL del transaction pooler de Supabase (puerto 6543). Consulta `supabase/functions/.env.example`. El driver desactiva prepared statements para ese modo. No uses `NEXT_PUBLIC_` ni expongas la contraseña al navegador.
2. Despliega y verifica primero las nuevas Edge Functions, conservando los antiguos RPC mientras se valida el cambio.
3. Aplica después la nueva migración que elimina los RPC. No elimina tablas ni datos. Aplicarla antes de desplegar los endpoints rompe las operaciones antiguas.

En local, Supabase CLI inyecta `SUPABASE_DB_URL` al ejecutar `supabase functions serve`. Ninguna migración ni función se despliega a producción automáticamente por ejecutar los tests.

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
supabase/migrations/       esquema, RLS y eliminación de RPC históricos
supabase/functions/        siete operaciones críticas
supabase/seed.sql          tenant y planes de demostración
```

La comparación con el producto original está en `docs/LEGACY_MAPPING.md`.

## Tests del backend

Requisitos: Deno 2, Docker Desktop en ejecución y Supabase CLI.

```bash
supabase start
supabase migration up --local
npm run test:backend
```

- `test:edge`: tests del handler con `describe`, `it` y `expect`; simula Auth y la capa de servicio, sin acceso de red.
- `test:services`: tests de integración TypeScript contra PostgreSQL local. Cubren membresías, pagos, asistencia, autorización, rollback y concurrencia. Fixtures compartidos en `supabase/functions/integration-tests/fixture.ts`; cada escenario revierte sus datos o elimina únicamente sus fixtures.
- `test:db`: pgTAP para RLS y permisos. Verifica que los RPC de negocio ya no existen. Los tests SQL revierten sus fixtures mediante rollback.
- `test:http`: inicia el runtime local y prueba los siete endpoints reales con JWTs locales, Zod, servicios y PostgreSQL. Comprueba también payloads inválidos y tenant incorrecto. El runner no imprime secretos y finaliza su proceso al terminar.

Los tests de integración y HTTP solo conectan a `127.0.0.1` en los puertos locales por defecto 54321 y 54322. No usan producción. La CI inicia Supabase desechable y ejecuta las cuatro suites.
