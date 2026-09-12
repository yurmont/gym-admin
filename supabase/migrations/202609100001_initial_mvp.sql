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
  id uuid primary key references auth.users (id)
    on delete cascade,
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

create or replace function public.current_tenant_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select tenant_id
  from public.profiles
  where id = auth.uid() and is_active
  limit 1;
$$;
create or replace function public.current_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid() and is_active limit 1;
$$;
create or replace function public.can_manage()
returns boolean
language sql
stable
as $$
  select public.current_role() in ('admin', 'recepcion');
$$;

create table public.members (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default public.current_tenant_id(

  ) references public.tenants (id)
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
  tenant_id uuid not null default public.current_tenant_id(

  ) references public.tenants (id)
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

alter table public.tenants enable row level security;
alter table public.profiles enable row level security;
alter table public.members enable row level security;
alter table public.membership_plans enable row level security;
alter table public.memberships enable row level security;
alter table public.payments enable row level security;
alter table public.attendances enable row level security;

create policy tenants_read on public.tenants
for select
using (id = public.current_tenant_id());
create policy tenants_admin_update on public.tenants
for update
using (id = public.current_tenant_id() and public.current_role() = 'admin')
with check (id = public.current_tenant_id());
create policy profiles_read on public.profiles
for select
using (tenant_id = public.current_tenant_id());
create policy profiles_admin_update on public.profiles
for update
using (
  tenant_id = public.current_tenant_id()
  and public.current_role() = 'admin'
)
with check (
  tenant_id = public.current_tenant_id()
  and role in ('admin', 'recepcion', 'instructor')
);
create policy members_read on public.members
for select
using (tenant_id = public.current_tenant_id());
create policy members_insert on public.members
for insert
with check (tenant_id = public.current_tenant_id() and public.can_manage());
create policy members_update on public.members
for update
using (tenant_id = public.current_tenant_id() and public.can_manage())
with check (tenant_id = public.current_tenant_id());
create policy plans_read on public.membership_plans
for select
using (tenant_id = public.current_tenant_id());
create policy plans_insert on public.membership_plans
for insert
with check (tenant_id = public.current_tenant_id() and public.can_manage());
create policy plans_update on public.membership_plans
for update
using (tenant_id = public.current_tenant_id() and public.can_manage())
with check (tenant_id = public.current_tenant_id());
create policy memberships_read on public.memberships
for select
using (tenant_id = public.current_tenant_id());
create policy payments_read on public.payments
for select
using (tenant_id = public.current_tenant_id());
create policy attendances_read on public.attendances
for select
using (tenant_id = public.current_tenant_id());

create or replace function public.assert_operator(p_actor uuid)
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_tenant uuid;
begin
  select tenant_id
  into v_tenant
  from profiles
  where id = p_actor and is_active and role in ('admin', 'recepcion');
  if v_tenant is null then
    raise exception 'Usuario sin permisos para esta operación';
  end if;
  return v_tenant;
end;
$$;

create or replace function public.rpc_register_payment(
  p_actor uuid,
  p_member uuid,
  p_membership uuid,
  p_concept text,
  p_amount numeric,
  p_discount numeric,
  p_method text,
  p_reference text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant uuid;
  v_id uuid := gen_random_uuid();
  v_total numeric := greatest(0, p_amount - coalesce(p_discount, 0));
  v_ms memberships;
begin
  v_tenant := assert_operator(p_actor);
  if
    p_amount <= 0
    or p_discount < 0
    or p_method not in ('efectivo', 'tarjeta', 'transferencia', 'yape', 'plin')
  then
    raise exception 'Datos de pago inválidos';
  end if;
  if
    p_member is not null
    and not exists (
      select 1 from members where id = p_member and tenant_id = v_tenant
    )
  then
    raise exception 'Socio no encontrado';
  end if;
  if p_membership is not null then
    select *
    into v_ms
    from memberships
    where id = p_membership and tenant_id = v_tenant
    for update;
    if not found then
      raise exception 'Membresía no encontrada';
    end if;
  end if;
  insert into payments
    (
      id,
      tenant_id,
      member_id,
      membership_id,
      code,
      concept,
      amount,
      discount,
      total,
      method,
      reference,
      status,
      paid_at,
      user_id
    )
  values
    (
      v_id,
      v_tenant,
      coalesce(p_member, v_ms.member_id),
      p_membership,
      'PAG-' || upper(substr(replace(v_id::text, '-', ''), 1, 8)),
      p_concept,
      p_amount,
      p_discount,
      v_total,
      p_method,
      p_reference,
      'pagado',
      now(),
      p_actor
    );
  if p_membership is not null then
    update memberships
    set
      paid_amount = least(total, paid_amount + v_total),
      status = case
        when paid_amount + v_total >= total then 'activa'
        else 'pendiente_pago'
      end,
      updated_at = now()
    where id = p_membership;
    update members
    set
      status = case
        when (
          select paid_amount >= total from memberships where id = p_membership
        ) then 'activo'
        else 'moroso'
      end,
      updated_at = now()
    where id = v_ms.member_id and status in ('activo', 'inactivo', 'moroso');
  end if;
  return v_id;
end;
$$;

create or replace function public.rpc_create_membership(
  p_actor uuid,
  p_member uuid,
  p_plan uuid,
  p_start date,
  p_discount numeric default 0,
  p_pay_now boolean default false,
  p_method text default 'efectivo',
  p_auto_renew boolean default false,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant uuid;
  v_plan membership_plans;
  v_id uuid := gen_random_uuid();
  v_total numeric;
begin
  v_tenant := assert_operator(p_actor);
  select *
  into v_plan
  from membership_plans
  where id = p_plan and tenant_id = v_tenant and is_active;
  if not found then
    raise exception 'Plan no disponible';
  end if;
  if
    not exists (
      select 1
      from members
      where id = p_member and tenant_id = v_tenant and status <> 'baja'
    )
  then
    raise exception 'Socio no disponible';
  end if;
  v_total := greatest(0, v_plan.price - coalesce(p_discount, 0));
  insert into memberships
    (
      id,
      tenant_id,
      member_id,
      membership_plan_id,
      code,
      start_date,
      end_date,
      price,
      discount,
      total,
      paid_amount,
      status,
      auto_renew,
      sold_by_user_id,
      notes
    )
  values
    (
      v_id,
      v_tenant,
      p_member,
      p_plan,
      'MEM-' || upper(substr(replace(v_id::text, '-', ''), 1, 8)),
      p_start,
      p_start + v_plan.duration_days,
      v_plan.price,
      p_discount,
      v_total,
      0,
      'pendiente_pago',
      p_auto_renew,
      p_actor,
      p_notes
    );
  if p_pay_now and v_total > 0 then
    perform
      rpc_register_payment(
        p_actor,
        p_member,
        v_id,
        'membresia',
        v_plan.price,
        p_discount,
        p_method,
        null
      );
  else
    update members
    set
      status = 'moroso',
      updated_at = now()
    where id = p_member and status in ('activo', 'inactivo', 'moroso');
  end if;
  if v_total = 0 then
    update memberships set status = 'activa' where id = v_id;
    update members set status = 'activo' where id = p_member;
  end if;
  return v_id;
end;
$$;

create or replace function public.rpc_cancel_membership(
  p_actor uuid,
  p_membership uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant uuid;
begin
  v_tenant := assert_operator(p_actor);
  update memberships
  set
    status = 'cancelada',
    updated_at = now()
  where
    id = p_membership
    and tenant_id = v_tenant
    and status not in ('cancelada', 'vencida');
  if not found then
    raise exception 'Membresía no disponible';
  end if;
  return p_membership;
end;
$$;

create or replace function public.rpc_renew_membership(
  p_actor uuid,
  p_membership uuid,
  p_discount numeric default 0,
  p_pay_now boolean default false,
  p_method text default 'efectivo'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant uuid;
  v_old memberships;
  v_start date;
begin
  v_tenant := assert_operator(p_actor);
  select *
  into v_old
  from memberships
  where id = p_membership and tenant_id = v_tenant;
  if not found then
    raise exception 'Membresía no encontrada';
  end if;
  v_start := greatest(current_date, v_old.end_date + 1);
  return rpc_create_membership(
    p_actor,
    v_old.member_id,
    v_old.membership_plan_id,
    v_start,
    p_discount,
    p_pay_now,
    p_method,
    v_old.auto_renew,
    'Renovación de ' || v_old.code
  );
end;
$$;

create or replace function public.rpc_void_payment(p_actor uuid, p_payment uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant uuid;
  v_pay payments;
begin
  v_tenant := assert_operator(p_actor);
  select *
  into v_pay
  from payments
  where id = p_payment and tenant_id = v_tenant
  for update;
  if not found or v_pay.status <> 'pagado' then
    raise exception 'Pago no disponible para anulación';
  end if;
  update payments
  set
    status = 'anulado',
    voided_at = now(),
    voided_by = p_actor,
    updated_at = now()
  where id = p_payment;
  if v_pay.membership_id is not null then
    update memberships
    set
      paid_amount = greatest(0, paid_amount - v_pay.total),
      status = 'pendiente_pago',
      updated_at = now()
    where id = v_pay.membership_id;
    update members
    set
      status = 'moroso',
      updated_at = now()
    where id = v_pay.member_id and status <> 'baja';
  end if;
  return p_payment;
end;
$$;

create or replace function public.rpc_attendance_check_in(
  p_actor uuid,
  p_identifier text,
  p_method text default 'manual'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_tenant uuid;v_member members;v_ms memberships;v_plan membership_plans;v_allowed boolean:=true;v_reason text;v_id uuid:=gen_random_uuid();
begin
 v_tenant:=assert_operator(p_actor);select * into v_member from members where tenant_id=v_tenant and deleted_at is null and (code=p_identifier or document_number=p_identifier) limit 1;
 if not found then raise exception 'No se encontró un socio con ese código o documento';end if;
 if exists(select 1 from attendances where tenant_id=v_tenant and member_id=v_member.id and result='permitido' and check_out is null and check_in::date=current_date) then raise exception 'El socio ya registró su ingreso';end if;
 select * into v_ms from memberships where tenant_id=v_tenant and member_id=v_member.id and status in ('activa','pendiente_pago','congelada') order by end_date desc limit 1; if found then select * into v_plan from membership_plans where id=v_ms.membership_plan_id;end if;
 if v_member.status='baja' then v_allowed:=false;v_reason:='El socio está dado de baja';
 elsif v_member.status='congelado' or v_ms.status='congelada' then v_allowed:=false;v_reason:='La membresía está congelada';
 elsif v_ms.id is null then v_allowed:=false;v_reason:='No tiene una membresía vigente';
 elsif v_ms.status='pendiente_pago' or v_ms.paid_amount<v_ms.total then v_allowed:=false;v_reason:='La membresía tiene saldo pendiente';
 elsif v_ms.end_date<current_date then v_allowed:=false;v_reason:='La membresía está vencida';
 elsif v_plan.sessions_included is not null and v_ms.sessions_used>=v_plan.sessions_included then v_allowed:=false;v_reason:='Agotó las sesiones incluidas';
 elsif v_plan.access_from is not null and v_plan.access_to is not null and localtime not between v_plan.access_from and v_plan.access_to then v_allowed:=false;v_reason:='Está fuera del horario de su plan';end if;
 insert into attendances(id,tenant_id,member_id,membership_id,method,result,denied_reason,user_id) values(v_id,v_tenant,v_member.id,v_ms.id,p_method,case when v_allowed then 'permitido' else 'denegado' end,v_reason,p_actor);
 if v_allowed and v_plan.sessions_included is not null then update memberships set sessions_used=sessions_used+1 where id=v_ms.id;end if;
 return jsonb_build_object('id',v_id,'allowed',v_allowed,'member_name',v_member.first_name||' '||v_member.last_name,'reason',v_reason);
end $$;

create or replace function public.rpc_attendance_check_out(
  p_actor uuid,
  p_attendance uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant uuid;
begin
  v_tenant := assert_operator(p_actor);
  update attendances
  set
    check_out = now(),
    minutes_stayed = greatest(
      0,
      extract(epoch from (now() - check_in)) / 60
    )::int
  where
    id = p_attendance
    and tenant_id = v_tenant
    and result = 'permitido'
    and check_out is null;
  if not found then
    raise exception 'Registro de ingreso no disponible';
  end if;
  return p_attendance;
end;
$$;

revoke all
on function public.rpc_create_membership(
  uuid,
  uuid,
  uuid,
  date,
  numeric,
  boolean,
  text,
  boolean,
  text
)
from public, anon, authenticated;
revoke all
on function public.rpc_register_payment(
  uuid,
  uuid,
  uuid,
  text,
  numeric,
  numeric,
  text,
  text
)
from public, anon, authenticated;
revoke all
on function public.rpc_cancel_membership(uuid, uuid)
from public, anon, authenticated;
revoke all
on function public.rpc_renew_membership(uuid, uuid, numeric, boolean, text)
from public, anon, authenticated;
revoke all
on function public.rpc_void_payment(uuid, uuid)
from public, anon, authenticated;
revoke all
on function public.rpc_attendance_check_in(uuid, text, text)
from public, anon, authenticated;
revoke all
on function public.rpc_attendance_check_out(uuid, uuid)
from public, anon, authenticated;
grant execute
on function public.rpc_create_membership(
  uuid,
  uuid,
  uuid,
  date,
  numeric,
  boolean,
  text,
  boolean,
  text
)
to service_role;
grant execute
on function public.rpc_register_payment(
  uuid,
  uuid,
  uuid,
  text,
  numeric,
  numeric,
  text,
  text
)
to service_role;
grant execute
on function public.rpc_cancel_membership(uuid, uuid)
to service_role;
grant execute
on function public.rpc_renew_membership(uuid, uuid, numeric, boolean, text)
to service_role;
grant execute on function public.rpc_void_payment(uuid, uuid) to service_role;
grant execute
on function public.rpc_attendance_check_in(uuid, text, text)
to service_role;
grant execute
on function public.rpc_attendance_check_out(uuid, uuid)
to service_role;

insert into storage.buckets
  (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'member-photos',
    'member-photos',
    false,
    2097152,
    array['image/png', 'image/jpeg', 'image/webp']
  )
on conflict (id) do nothing;
create policy member_photos_read on storage.objects
for select
using (
  bucket_id = 'member-photos'
  and (storage.foldername(name))[1] = public.current_tenant_id()::text
);
create policy member_photos_write on storage.objects
for insert
with check (
  bucket_id = 'member-photos'
  and (storage.foldername(name))[1] = public.current_tenant_id()::text
  and public.can_manage()
);
