import pg from "pg";
import { databaseOptions } from "./database-config.cjs";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const firebaseUid = args.find((arg) => !arg.startsWith("--"));

if (!process.env.DATABASE_URL) throw new Error("Set backend DATABASE_URL");

const pool = new pg.Pool(databaseOptions(process.env.DATABASE_URL, 1));
const client = await pool.connect();

const today = new Date();
const isoDate = (offsetDays) => {
  const value = new Date(today);
  value.setUTCDate(value.getUTCDate() + offsetDays);
  return value.toISOString().slice(0, 10);
};
const period = today.toISOString().slice(0, 7).replace("-", "");
const memberCodes = ["SOC-1001", "SOC-1002", "SOC-1003", "SOC-1004"];
const documentNumbers = ["48291375", "45982716", "70184623", "42850691"];
const planNames = ["Mensual Full", "Trimestral Full", "Pack 12 Clases"];

async function resolveActor() {
  if (firebaseUid) {
    const { rows } = await client.query(
      `select id, tenant_id, full_name
      from public.profiles
      where firebase_uid = $1 and is_active = true`,
      [firebaseUid],
    );
    if (rows.length !== 1)
      throw new Error(
        `No active profile found for Firebase UID ${firebaseUid}`,
      );
    return rows[0];
  }

  const { rows } = await client.query(
    `select id, tenant_id, full_name
    from public.profiles
    where role = 'admin' and is_active = true
    order by created_at`,
  );
  if (rows.length !== 1)
    throw new Error("Pass a Firebase UID: npm run seed:demo -- <firebase-uid>");
  return rows[0];
}

async function upsertPlan(plan) {
  const { rows } = await client.query(
    `insert into public.membership_plans
      (tenant_id, name, description, price, duration_days, sessions_included, color, sort_order)
    values ($1, $2, $3, $4, $5, $6, $7, $8)
    on conflict (tenant_id, name) do update set
      description = excluded.description,
      price = excluded.price,
      duration_days = excluded.duration_days,
      sessions_included = excluded.sessions_included,
      color = excluded.color,
      sort_order = excluded.sort_order,
      is_active = true,
      updated_at = now()
    returning id, price, duration_days`,
    [
      plan.tenantId,
      plan.name,
      plan.description,
      plan.price,
      plan.durationDays,
      plan.sessionsIncluded,
      plan.color,
      plan.sortOrder,
    ],
  );
  return rows[0];
}

async function insertMember(member) {
  const { rows } = await client.query(
    `insert into public.members
      (tenant_id, code, first_name, last_name, document_type, document_number, birth_date,
       gender, email, phone, address, emergency_name, emergency_phone, emergency_relation,
       how_found_us, status, joined_at, notes)
    values
      ($1, $2, $3, $4, 'DNI', $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
    returning id`,
    [
      member.tenantId,
      member.code,
      member.firstName,
      member.lastName,
      member.documentNumber,
      member.birthDate,
      member.gender,
      member.email,
      member.phone,
      member.address,
      member.emergencyName,
      member.emergencyPhone,
      member.emergencyRelation,
      member.howFoundUs,
      member.status,
      member.joinedAt,
      member.notes,
    ],
  );
  return rows[0].id;
}

async function insertMembership(membership) {
  const { rows } = await client.query(
    `insert into public.memberships
      (tenant_id, member_id, membership_plan_id, code, start_date, end_date,
       price, discount, total, paid_amount, status, sold_by_user_id, notes)
    values
      ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    returning id`,
    [
      membership.tenantId,
      membership.memberId,
      membership.planId,
      membership.code,
      membership.startDate,
      membership.endDate,
      membership.price,
      membership.discount,
      membership.total,
      membership.paidAmount,
      membership.status,
      membership.actorId,
      membership.notes,
    ],
  );
  return rows[0].id;
}

async function insertPayment(payment) {
  await client.query(
    `insert into public.payments
      (tenant_id, member_id, membership_id, code, concept, amount, discount,
       total, method, reference, status, paid_at, due_date, user_id, notes)
    values
      ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
    [
      payment.tenantId,
      payment.memberId,
      payment.membershipId,
      payment.code,
      payment.concept,
      payment.amount,
      payment.discount,
      payment.total,
      payment.method,
      payment.reference,
      payment.status,
      payment.paidAt,
      payment.dueDate,
      payment.actorId,
      payment.notes,
    ],
  );
}

async function insertAttendance(attendance) {
  await client.query(
    `insert into public.attendances
      (tenant_id, member_id, membership_id, check_in, check_out,
       minutes_stayed, method, result, denied_reason, user_id)
    values
      ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      attendance.tenantId,
      attendance.memberId,
      attendance.membershipId,
      attendance.checkIn,
      attendance.checkOut,
      attendance.minutesStayed,
      attendance.method,
      attendance.result,
      attendance.deniedReason,
      attendance.actorId,
    ],
  );
}

try {
  await client.query("BEGIN");
  const actor = await resolveActor();
  const tenantId = actor.tenant_id;

  await client.query(
    `delete from public.attendances
    where tenant_id = $1
      and member_id in (
        select id from public.members
        where tenant_id = $1
          and (code like 'DEMO-%' or code = any($2) or document_number = any($3))
      )`,
    [tenantId, memberCodes, documentNumbers],
  );
  await client.query(
    `delete from public.payments
    where tenant_id = $1
      and (
        code like 'DEMO-PAY-%'
        or code = any($2)
        or member_id in (
          select id from public.members
          where tenant_id = $1
            and (code like 'DEMO-%' or code = any($3) or document_number = any($4))
        )
      )`,
    [
      tenantId,
      [`PAY-${period}-001`, `PAY-${period}-002`, `PAY-${period}-003`],
      memberCodes,
      documentNumbers,
    ],
  );
  await client.query(
    `delete from public.memberships
    where tenant_id = $1
      and (
        code like 'DEMO-MEM-%'
        or code = any($2)
        or member_id in (
          select id from public.members
          where tenant_id = $1
            and (code like 'DEMO-%' or code = any($3) or document_number = any($4))
        )
      )`,
    [
      tenantId,
      [
        `MEM-${period}-001`,
        `MEM-${period}-002`,
        `MEM-${period}-003`,
        `MEM-${period}-004`,
      ],
      memberCodes,
      documentNumbers,
    ],
  );
  await client.query(
    `delete from public.members
    where tenant_id = $1
      and (code like 'DEMO-%' or code = any($2) or document_number = any($3))`,
    [tenantId, memberCodes, documentNumbers],
  );
  await client.query(
    `delete from public.membership_plans
    where tenant_id = $1
      and name in ('Demo Mensual', 'Demo Trimestral', 'Demo 12 Clases')`,
    [tenantId],
  );

  const monthly = await upsertPlan({
    tenantId,
    name: "Mensual Full",
    description: "Acceso ilimitado a sala de musculacion y clases grupales",
    price: 120,
    durationDays: 30,
    sessionsIncluded: null,
    color: "#FF5A1F",
    sortOrder: 10,
  });
  const quarterly = await upsertPlan({
    tenantId,
    name: "Trimestral Full",
    description: "Acceso ilimitado por 90 dias con tarifa preferencial",
    price: 320,
    durationDays: 90,
    sessionsIncluded: null,
    color: "#0E9F6E",
    sortOrder: 20,
  });
  const classes = await upsertPlan({
    tenantId,
    name: "Pack 12 Clases",
    description: "Paquete flexible para entrenamiento funcional y baile",
    price: 180,
    durationDays: 45,
    sessionsIncluded: 12,
    color: "#1A56DB",
    sortOrder: 30,
  });

  const members = {};
  for (const member of [
    {
      code: "SOC-1001",
      firstName: "Valeria",
      lastName: "Rojas Mendoza",
      documentNumber: "48291375",
      birthDate: "1994-03-18",
      gender: "F",
      email: "valeria.rojas@correo.test",
      phone: "+51984231567",
      address: "Av. Primavera 1280, Surco",
      emergencyName: "Camila Rojas",
      emergencyPhone: "+51973642018",
      emergencyRelation: "Hermana",
      howFoundUs: "Instagram",
      status: "activo",
      joinedAt: isoDate(-45),
      notes: "Prefiere entrenar por la manana.",
    },
    {
      code: "SOC-1002",
      firstName: "Marco",
      lastName: "Salazar Paredes",
      documentNumber: "45982716",
      birthDate: "1988-11-02",
      gender: "M",
      email: "marco.salazar@correo.test",
      phone: "+51965420831",
      address: "Jr. Los Fresnos 455, San Borja",
      emergencyName: "Lucia Salazar",
      emergencyPhone: "+51987612044",
      emergencyRelation: "Esposa",
      howFoundUs: "Referido",
      status: "moroso",
      joinedAt: isoDate(-80),
      notes: "Tiene una cuota pendiente por regularizar.",
    },
    {
      code: "SOC-1003",
      firstName: "Daniela",
      lastName: "Vega Torres",
      documentNumber: "70184623",
      birthDate: "1999-07-24",
      gender: "F",
      email: "daniela.vega@correo.test",
      phone: "+51932177894",
      address: "Calle Las Moras 210, Miraflores",
      emergencyName: "Rafael Vega",
      emergencyPhone: "+51944561209",
      emergencyRelation: "Padre",
      howFoundUs: "Fachada del local",
      status: "activo",
      joinedAt: isoDate(-10),
      notes: "Asiste a clases de funcional tres veces por semana.",
    },
    {
      code: "SOC-1004",
      firstName: "Andres",
      lastName: "Quispe Huaman",
      documentNumber: "42850691",
      birthDate: "1991-01-09",
      gender: "M",
      email: "andres.quispe@correo.test",
      phone: "+51978543012",
      address: "Av. La Marina 808, Pueblo Libre",
      emergencyName: "Sofia Quispe",
      emergencyPhone: "+51961239870",
      emergencyRelation: "Prima",
      howFoundUs: "Google Maps",
      status: "inactivo",
      joinedAt: isoDate(-120),
      notes: "Solicito pausa temporal por viaje.",
    },
  ]) {
    members[member.code] = await insertMember({ ...member, tenantId });
  }

  const memberships = {};
  memberships.activeMonthly = await insertMembership({
    tenantId,
    memberId: members["SOC-1001"],
    planId: monthly.id,
    code: `MEM-${period}-001`,
    startDate: isoDate(-7),
    endDate: isoDate(23),
    price: monthly.price,
    discount: 0,
    total: monthly.price,
    paidAmount: monthly.price,
    status: "activa",
    actorId: actor.id,
    notes: "Renovacion mensual pagada al contado.",
  });
  memberships.pendingQuarterly = await insertMembership({
    tenantId,
    memberId: members["SOC-1002"],
    planId: quarterly.id,
    code: `MEM-${period}-002`,
    startDate: isoDate(-3),
    endDate: isoDate(87),
    price: quarterly.price,
    discount: 20,
    total: Number(quarterly.price) - 20,
    paidAmount: 0,
    status: "pendiente_pago",
    actorId: actor.id,
    notes: "Separacion de cupo con pago pendiente.",
  });
  memberships.classPack = await insertMembership({
    tenantId,
    memberId: members["SOC-1003"],
    planId: classes.id,
    code: `MEM-${period}-003`,
    startDate: isoDate(-5),
    endDate: isoDate(40),
    price: classes.price,
    discount: 0,
    total: classes.price,
    paidAmount: classes.price,
    status: "activa",
    actorId: actor.id,
    notes: "Paquete activo para clases grupales.",
  });
  memberships.expired = await insertMembership({
    tenantId,
    memberId: members["SOC-1004"],
    planId: monthly.id,
    code: `MEM-${period}-004`,
    startDate: isoDate(-55),
    endDate: isoDate(-25),
    price: monthly.price,
    discount: 0,
    total: monthly.price,
    paidAmount: monthly.price,
    status: "vencida",
    actorId: actor.id,
    notes: "Membresia vencida, pendiente de renovacion.",
  });

  await insertPayment({
    tenantId,
    memberId: members["SOC-1001"],
    membershipId: memberships.activeMonthly,
    code: `PAY-${period}-001`,
    concept: "membresia",
    amount: monthly.price,
    discount: 0,
    total: monthly.price,
    method: "yape",
    reference: "YAPE-842315",
    status: "pagado",
    paidAt: `${isoDate(-7)}T15:25:00-05:00`,
    dueDate: null,
    actorId: actor.id,
    notes: "Pago recibido por Yape.",
  });
  await insertPayment({
    tenantId,
    memberId: members["SOC-1003"],
    membershipId: memberships.classPack,
    code: `PAY-${period}-002`,
    concept: "membresia",
    amount: classes.price,
    discount: 0,
    total: classes.price,
    method: "tarjeta",
    reference: "POS-003184",
    status: "pagado",
    paidAt: `${isoDate(-4)}T19:10:00-05:00`,
    dueDate: null,
    actorId: actor.id,
    notes: "Pago con tarjeta en recepcion.",
  });
  await insertPayment({
    tenantId,
    memberId: members["SOC-1002"],
    membershipId: memberships.pendingQuarterly,
    code: `PAY-${period}-003`,
    concept: "membresia",
    amount: Number(quarterly.price) - 20,
    discount: 20,
    total: Number(quarterly.price) - 20,
    method: "transferencia",
    reference: "BCP-284516",
    status: "pendiente",
    paidAt: null,
    dueDate: isoDate(2),
    actorId: actor.id,
    notes: "Pendiente de confirmacion bancaria.",
  });

  await insertAttendance({
    tenantId,
    memberId: members["SOC-1001"],
    membershipId: memberships.activeMonthly,
    checkIn: `${isoDate(0)}T07:30:00-05:00`,
    checkOut: `${isoDate(0)}T08:35:00-05:00`,
    minutesStayed: 65,
    method: "manual",
    result: "permitido",
    deniedReason: null,
    actorId: actor.id,
  });
  await insertAttendance({
    tenantId,
    memberId: members["SOC-1003"],
    membershipId: memberships.classPack,
    checkIn: `${isoDate(0)}T18:05:00-05:00`,
    checkOut: null,
    minutesStayed: null,
    method: "manual",
    result: "permitido",
    deniedReason: null,
    actorId: actor.id,
  });
  await insertAttendance({
    tenantId,
    memberId: members["SOC-1002"],
    membershipId: memberships.pendingQuarterly,
    checkIn: `${isoDate(-1)}T18:40:00-05:00`,
    checkOut: null,
    minutesStayed: null,
    method: "manual",
    result: "denegado",
    deniedReason: "Pago pendiente",
    actorId: actor.id,
  });

  if (dryRun) await client.query("ROLLBACK");
  else await client.query("COMMIT");

  console.log(
    JSON.stringify(
      {
        dry_run: dryRun,
        tenant_id: tenantId,
        actor: actor.full_name,
        inserted: {
          plans: 3,
          members: 4,
          memberships: 4,
          payments: 3,
          attendances: 3,
        },
      },
      null,
      2,
    ),
  );
} catch (error) {
  await client.query("ROLLBACK").catch(() => undefined);
  throw error;
} finally {
  client.release();
  await pool.end();
}
