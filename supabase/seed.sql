-- Development tenant. Create an Auth user in the Supabase dashboard, then replace
-- USER_UUID below with its UUID before running the profiles insert.
insert into public.tenants (id, name, slug, email)
values
  (
    '00000000-0000-4000-8000-000000000001',
    'IronFit Gym',
    'ironfit-demo',
    'admin@ironfit.test'
  )
on conflict (id) do nothing;

insert into public.membership_plans
  (tenant_id, name, description, price, duration_days, color, sort_order)
values
  (
    '00000000-0000-4000-8000-000000000001',
    'Mensual',
    'Acceso ilimitado por 30 días',
    120,
    30,
    '#FF5A1F',
    1
  ),
  (
    '00000000-0000-4000-8000-000000000001',
    'Trimestral',
    'Acceso ilimitado por 90 días',
    320,
    90,
    '#C4F82A',
    2
  ),
  (
    '00000000-0000-4000-8000-000000000001',
    '10 sesiones',
    'Paquete flexible de sesiones',
    90,
    60,
    '#12C4E0',
    3
  )
on conflict (tenant_id, name) do nothing;
-- insert into public.profiles(id,tenant_id,full_name,role)
-- values ('USER_UUID','00000000-0000-4000-8000-000000000001','Administrador Demo','admin');
