"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.url = void 0;
exports.seed = seed;
exports.helpers = helpers;
exports.withFixture = withFixture;
exports.withCommittedFixture = withCommittedFixture;
const database_1 = require("../dist/database/database.service");
const operations_1 = require("./business-operations.cjs");
const common_1 = require("../dist/common/business/context");
exports.url = process.env.TEST_DATABASE_URL;
async function seed(db) {
  const ids = Object.fromEntries(
    [
      "tenant",
      "otherTenant",
      "admin",
      "reception",
      "instructor",
      "inactive",
      "otherAdmin",
      "member",
      "otherMember",
      "plan",
      "otherPlan",
      "noMembership",
    ].map((key) => [key, crypto.randomUUID()]),
  );
  await db.query(
    "insert into public.tenants (id,name,slug) values ($1,'Service test A',$2),($3,'Service test B',$4)",
    [ids.tenant, ids.tenant, ids.otherTenant, ids.otherTenant],
  );
  for (const [key, role, active, tenant] of [
    ["admin", "admin", true, ids.tenant],
    ["reception", "recepcion", true, ids.tenant],
    ["instructor", "instructor", true, ids.tenant],
    ["inactive", "admin", false, ids.tenant],
    ["otherAdmin", "admin", true, ids.otherTenant],
  ]) {
    await db.query(
      "insert into public.profiles (id,firebase_uid,tenant_id,full_name,role,is_active) values ($1,$2,$3,'Service test',$4,$5)",
      [ids[key], ids[key], tenant, role, active],
    );
  }
  for (const [key, tenant, code] of [
    ["member", ids.tenant, "TEST-A"],
    ["otherMember", ids.otherTenant, "TEST-B"],
    ["noMembership", ids.tenant, "TEST-NONE"],
  ]) {
    await db.query(
      "insert into public.members (id,tenant_id,code,first_name,last_name) values ($1,$2,$3,'Test','Member')",
      [ids[key], tenant, code],
    );
  }
  await db.query(
    "insert into public.membership_plans (id,tenant_id,name,price,duration_days,sessions_included) values ($1,$2,'Plan A',100,30,2),($3,$4,'Plan B',100,30,null)",
    [ids.plan, ids.tenant, ids.otherPlan, ids.otherTenant],
  );
  const [clock] = await db.query("select current_date::text as today");
  return { ...ids, today: String(clock.today) };
}
function helpers(db, database, fixture) {
  const execute = (0, operations_1.createOperations)(database);
  const run = (operation, input, actor = fixture.admin) =>
    execute(operation, input, actor);
  const create = (overrides = {}) =>
    run("create-membership", {
      member_id: fixture.member,
      membership_plan_id: fixture.plan,
      start_date: fixture.today,
      ...overrides,
    });
  const pay = (membership_id, amount, overrides = {}) =>
    run("register-payment", {
      member_id: fixture.member,
      membership_id,
      amount,
      concept: "membresia",
      method: "efectivo",
      reference: null,
      ...overrides,
    });
  const row = async (table, id) =>
    (
      await db.query(
        `select *, ${table === "memberships" ? "start_date::text,end_date::text" : "id as test_id"} from public.${table} where id=$1`,
        [id],
      )
    )[0];
  return { run, create, pay, row, addDays: common_1.addDays };
}
async function withFixture(run) {
  const database = (0, database_1.connectDatabase)(exports.url);
  const rollback = new Error("Rollback test fixture");
  try {
    await database.transaction(async (db) => {
      const fixture = await seed(db);
      const nested = {
        transaction: async (action) => {
          await db.query("savepoint service_operation");
          try {
            const result = await action(db);
            await db.query("release savepoint service_operation");
            return result;
          } catch (error) {
            await db.query("rollback to savepoint service_operation");
            await db.query("release savepoint service_operation");
            throw error;
          }
        },
      };
      await run({ ...helpers(db, nested, fixture), fixture, db });
      throw rollback;
    });
  } catch (error) {
    if (error !== rollback) throw error;
  } finally {
    await database.close();
  }
}
async function withCommittedFixture(run) {
  const database = (0, database_1.connectDatabase)(exports.url);
  let fixture;
  try {
    fixture = await database.transaction(seed);
    // Each query has its own committed transaction; service requests use independent pool connections.
    const db = {
      query: (text, values) =>
        database.transaction((connection) => connection.query(text, values)),
    };
    await run({ ...helpers(db, database, fixture), fixture, db, database });
  } finally {
    if (fixture)
      await database.transaction(async (db) => {
        await db.query("delete from public.tenants where id=$1 or id=$2", [
          fixture.tenant,
          fixture.otherTenant,
        ]);
      });
    await database.close();
  }
}
