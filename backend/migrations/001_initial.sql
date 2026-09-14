-- Provider-independent schema for fresh PostgreSQL/Neon installations.
create extension if not exists pgcrypto;

create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  tax_id text,
  email text,
  phone text,
  address text,
  country text not null default 'Peru',
  currency text not null default 'PEN',
  timezone text not null default 'America/Lima',
  primary_color text not null default '#FF5A1F',
  logo_path text,
  status text not null default 'activo' check (
    status in ('activo', 'suspendido', 'cancelado')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  firebase_uid text not null unique,
  tenant_id uuid not null references public.tenants (id)
    on delete cascade,
  full_name text not null,
  role text not null default 'recepcion' check (
    role in ('admin', 'recepcion', 'instructor')
  ),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.members (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id)
    on delete cascade,
  code text not null default (
    'SOC-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
  ),
  branch_id uuid,
  first_name text not null,
  last_name text not null,
  document_type text,
  document_number text,
  birth_date date,
  gender text check (gender in ('M', 'F', 'O')),
  email text,
  phone text,
  address text,
  photo_path text,
  emergency_name text,
  emergency_phone text,
  emergency_relation text,
  blood_type text,
  medical_conditions text,
  allergies text,
  how_found_us text,
  status text not null default 'activo' check (
    status in ('activo', 'inactivo', 'congelado', 'moroso', 'baja')
  ),
  joined_at date not null default current_date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (tenant_id, code),
  unique (tenant_id, document_number)
);
create index members_tenant_status_idx on public.members (tenant_id, status);

create table public.membership_plans (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id)
    on delete cascade,
  name text not null,
  description text,
  price numeric(10, 2) not null default 0 check (price >= 0),
  enrollment_fee numeric(10, 2) not null default 0 check (enrollment_fee >= 0),
  billing_cycle text not null default 'mensual',
  duration_days int not null default 30 check (duration_days > 0),
  sessions_included int check (sessions_included > 0),
  freeze_days_allowed int not null default 0 check (freeze_days_allowed >= 0),
  access_all_classes boolean not null default true,
  access_from time,
  access_to time,
  color text not null default '#FF5A1F',
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, name)
);

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id)
    on delete cascade,
  member_id uuid not null references public.members (id)
    on delete cascade,
  membership_plan_id uuid not null references public.membership_plans (id)
    on delete restrict,
  code text not null,
  start_date date not null,
  end_date date not null,
  price numeric(10, 2) not null,
  discount numeric(10, 2) not null default 0,
  total numeric(10, 2) not null,
  paid_amount numeric(10, 2) not null default 0,
  sessions_used int not null default 0,
  status text not null default 'pendiente_pago' check (
    status in ('pendiente_pago', 'activa', 'vencida', 'congelada', 'cancelada')
  ),
  auto_renew boolean not null default false,
  sold_by_user_id uuid references public.profiles (id),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, code),
  check (end_date >= start_date),
  check (paid_amount >= 0)
);
create index memberships_tenant_status_idx on public.memberships (
  tenant_id,
  status
);
create index memberships_tenant_end_idx on public.memberships (
  tenant_id,
  end_date
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id)
    on delete cascade,
  member_id uuid references public.members (id)
    on delete set null,
  membership_id uuid references public.memberships (id)
    on delete set null,
  code text not null,
  concept text not null check (
    concept in (
      'membresia',
      'matricula',
      'clase_suelta',
      'producto',
      'servicio',
      'penalidad',
      'otro'
    )
  ),
  amount numeric(10, 2) not null check (amount > 0),
  discount numeric(10, 2) not null default 0 check (discount >= 0),
  total numeric(10, 2) not null check (total >= 0),
  method text not null check (
    method in ('efectivo', 'tarjeta', 'transferencia', 'yape', 'plin')
  ),
  reference text,
  status text not null default 'pagado' check (
    status in ('pagado', 'pendiente', 'anulado', 'reembolsado')
  ),
  paid_at timestamptz,
  due_date date,
  user_id uuid references public.profiles (id),
  notes text,
  voided_at timestamptz,
  voided_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, code)
);
create index payments_tenant_paid_idx on public.payments (
  tenant_id,
  paid_at desc
);

create table public.attendances (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id)
    on delete cascade,
  member_id uuid not null references public.members (id)
    on delete cascade,
  membership_id uuid references public.memberships (id)
    on delete set null,
  check_in timestamptz not null default now(),
  check_out timestamptz,
  minutes_stayed int,
  method text not null default 'manual' check (
    method in ('qr', 'huella', 'tarjeta', 'pin', 'manual', 'facial')
  ),
  result text not null check (result in ('permitido', 'denegado')),
  denied_reason text,
  user_id uuid references public.profiles (id),
  created_at timestamptz not null default now()
);
create index attendances_tenant_checkin_idx on public.attendances (
  tenant_id,
  check_in desc
);
