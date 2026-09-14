const { before, after, test } = require("node:test");
const assert = require("node:assert/strict");
const { Test } = require("@nestjs/testing");
const { AppModule } = require("../dist/app.module");
const { configureApplication } = require("../dist/application");
const { FirebaseIdentity } = require("../dist/auth/auth");
const { GcsObjects } = require("../dist/storage/storage");
const { withCommittedFixture } = require("./fixture.cjs");

let app, base;
const files = new Map();
const calls = [];
const identity = {
  async verify(token) {
    if (["invalid", "expired"].includes(token))
      throw new Error("Invalid ID token");
    return { uid: token };
  },
};
const objects = {
  async sign(path, action, contentType) {
    calls.push({ path, action, contentType });
    if (path.includes("failure")) throw new Error("private-key-secret");
    return {
      url: "https://storage.example.test/signed",
      expires_at: new Date(Date.now() + 300000).toISOString(),
    };
  },
  async metadata(path) {
    if (!files.has(path)) throw new Error("internal-bucket-secret");
    return files.get(path);
  },
  async delete(path) {
    files.delete(path);
  },
};
before(async () => {
  const module = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(FirebaseIdentity)
    .useValue(identity)
    .overrideProvider(GcsObjects)
    .useValue(objects)
    .compile();
  app = module.createNestApplication({ logger: false });
  configureApplication(app, ["http://localhost:3000"]);
  await app.listen(0, "127.0.0.1");
  base = await app.getUrl();
});
after(async () => {
  await app?.close();
});
async function request(
  path,
  uid,
  body,
  method = body === undefined ? "GET" : "POST",
) {
  const response = await fetch(base + path, {
    method,
    headers: {
      ...(uid ? { Authorization: `Bearer ${uid}` } : {}),
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  return {
    status: response.status,
    body: await response.json(),
    id: response.headers.get("x-request-id"),
  };
}

test("health is public; missing, invalid, and expired tokens are rejected", async () => {
  assert.equal((await request("/health")).status, 200);
  assert.equal((await request("/health/ready")).status, 200);
  for (const token of [undefined, "invalid", "expired"]) {
    const r = await request("/api/v1/me", token);
    assert.equal(r.status, 401);
    assert.equal(r.body.success, false);
    assert.ok(r.id);
  }
});
test("unknown Firebase UID cannot self-provision a role", async () => {
  assert.equal((await request("/api/v1/me", "unassigned-user")).status, 403);
});
test("malformed JSON is a safe client error; duplicate records use conflict semantics", () =>
  withCommittedFixture(async ({ fixture: f }) => {
    const response = await fetch(base + "/api/v1/members", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${f.admin}`,
        "Content-Type": "application/json",
      },
      body: "{bad-json",
    });
    assert.equal(response.status, 400);
    const detail = await response.json();
    assert.equal(detail.success, false);
    assert.ok(!JSON.stringify(detail).includes("bad-json"));
    const payload = {
      first_name: "Duplicate",
      last_name: "Member",
      document_number: "same-document",
    };
    assert.equal(
      (await request("/api/v1/members", f.admin, payload)).status,
      200,
    );
    const duplicate = await request("/api/v1/members", f.admin, payload);
    assert.equal(duplicate.status, 409);
    assert.ok(!JSON.stringify(duplicate.body).includes("constraint"));
  }));
test("verified UID resolves the database profile; inactive accounts are denied", () =>
  withCommittedFixture(async ({ fixture: f }) => {
    const r = await request("/api/v1/me", f.admin);
    assert.equal(r.status, 200);
    assert.equal(r.body.data.id, f.admin);
    assert.equal(r.body.data.tenant, f.tenant);
    assert.equal((await request("/api/v1/me", f.inactive)).status, 403);
  }));
test("read APIs preserve nested objects, counts and tenant isolation", () =>
  withCommittedFixture(async ({ fixture: f, create }) => {
    await create();
    const members = await request("/api/v1/members", f.admin);
    assert.equal(members.status, 200);
    assert.ok(members.body.data.some((m) => m.id === f.member));
    assert.ok(!members.body.data.some((m) => m.id === f.otherMember));
    const escaped = await request(
      "/api/v1/members?q=" + encodeURIComponent("' OR true --"),
      f.admin,
    );
    assert.equal(escaped.status, 200);
    assert.equal(escaped.body.data.length, 0);
    const ms = await request("/api/v1/memberships", f.admin);
    assert.equal(ms.body.data[0].member.id, f.member);
    assert.equal(ms.body.data[0].plan.id, f.plan);
    assert.equal(typeof ms.body.data[0].total, "number");
    for (const path of [
      "/membership-plans",
      "/memberships/options",
      "/payments",
      "/payments/options",
    ])
      assert.equal((await request("/api/v1" + path, f.admin)).status, 200);
    const since = encodeURIComponent(new Date().toISOString());
    assert.equal(
      (
        await request(
          `/api/v1/dashboard?today=${since}&month=${since}`,
          f.admin,
        )
      ).status,
      200,
    );
    assert.equal(
      (await request(`/api/v1/attendances?since=${since}`, f.admin)).status,
      200,
    );
  }));
test("member CRUD validates, rejects identity spoofing and isolates writes", () =>
  withCommittedFixture(async ({ fixture: f }) => {
    assert.equal((await request("/api/v1/members", f.admin, {})).status, 422);
    const payload = {
      first_name: "New",
      last_name: "Member",
      tenant_id: f.otherTenant,
      firebase_uid: f.otherAdmin,
    };
    const created = await request("/api/v1/members", f.admin, payload);
    assert.equal(created.status, 200);
    assert.equal(created.body.data.tenant_id, f.tenant);
    const id = created.body.data.id;
    const edited = await request(
      `/api/v1/members/${id}`,
      f.admin,
      { first_name: "Edited", last_name: "Member" },
      "PATCH",
    );
    assert.equal(edited.body.data.first_name, "Edited");
    assert.equal(
      (await request(`/api/v1/members/${id}`, f.otherAdmin, payload, "PATCH"))
        .status,
      404,
    );
    assert.equal(
      (await request("/api/v1/members", f.instructor, payload)).status,
      403,
    );
    assert.equal(
      (await request("/api/v1/members", f.reception, payload)).status,
      200,
    );
  }));
test("plan CRUD and activation preserve backend authorization", () =>
  withCommittedFixture(async ({ fixture: f }) => {
    const payload = {
      name: "New plan",
      price: 35.5,
      duration_days: 10,
      sessions_included: null,
      color: "#FF5A1F",
    };
    const r = await request("/api/v1/membership-plans", f.admin, payload);
    assert.equal(r.status, 200);
    assert.equal(r.body.data.price, 35.5);
    const path = `/api/v1/membership-plans/${r.body.data.id}`;
    assert.equal(
      (await request(path, f.admin, { ...payload, price: 40 }, "PATCH")).status,
      200,
    );
    assert.equal(
      (await request(path + "/status", f.admin, { is_active: false }, "PATCH"))
        .body.data.is_active,
      false,
    );
    assert.equal(
      (
        await request(
          path + "/status",
          f.otherAdmin,
          { is_active: true },
          "PATCH",
        )
      ).status,
      404,
    );
    assert.equal(
      (
        await request("/api/v1/membership-plans", f.admin, {
          ...payload,
          price: -1,
        })
      ).status,
      422,
    );
  }));
test("all seven migrated operations run end to end through auth, validation and PostgreSQL", () =>
  withCommittedFixture(async ({ fixture: f, row }) => {
    const created = await request("/api/v1/memberships", f.admin, {
      member_id: f.member,
      membership_plan_id: f.plan,
      start_date: f.today,
      pay_now: true,
    });
    assert.equal(created.status, 200);
    const id = created.body.data;
    assert.equal((await row("memberships", id)).status, "activa");
    const payment = await request("/api/v1/payments", f.admin, {
      member_id: f.member,
      membership_id: null,
      amount: 15,
      discount: 0,
      concept: "otro",
      method: "efectivo",
      reference: null,
    });
    assert.equal(payment.status, 200);
    const entry = await request("/api/v1/attendances/check-in", f.admin, {
      identifier: "TEST-A",
    });
    assert.equal(entry.status, 200);
    assert.equal(entry.body.data.allowed, true);
    assert.equal(
      (
        await request(
          `/api/v1/attendances/${entry.body.data.id}/check-out`,
          f.admin,
          {},
        )
      ).status,
      200,
    );
    assert.equal(
      (await request(`/api/v1/payments/${payment.body.data}/void`, f.admin, {}))
        .status,
      200,
    );
    const renew = await request(`/api/v1/memberships/${id}/renew`, f.admin, {});
    assert.equal(renew.status, 200);
    assert.equal(
      (
        await request(
          `/api/v1/memberships/${renew.body.data}/cancel`,
          f.admin,
          {},
        )
      ).status,
      200,
    );
  }));
test("invalid input, absent resources and unauthorized operations use safe errors", () =>
  withCommittedFixture(async ({ fixture: f }) => {
    assert.equal(
      (await request("/api/v1/memberships", f.admin, {})).status,
      422,
    );
    assert.equal(
      (await request("/api/v1/memberships", f.instructor, {})).status,
      403,
    );
    assert.equal(
      (
        await request(
          `/api/v1/memberships/${crypto.randomUUID()}/cancel`,
          f.admin,
          {},
        )
      ).status,
      404,
    );
    assert.equal(
      (
        await request(
          `/api/v1/memberships/${f.otherMember}/cancel`,
          f.admin,
          {},
        )
      ).status,
      404,
    );
    assert.equal(
      (await request("/api/v1/attendances?since=garbage", f.admin)).status,
      422,
    );
  }));
test("denied attendance is persisted and returned as a successful business result", () =>
  withCommittedFixture(async ({ fixture: f, row }) => {
    const r = await request("/api/v1/attendances/check-in", f.admin, {
      identifier: "TEST-NONE",
    });
    assert.equal(r.status, 200);
    assert.equal(r.body.data.allowed, false);
    assert.equal((await row("attendances", r.body.data.id)).result, "denegado");
  }));
test("signed photo workflow authorizes upload, verifies metadata, downloads and deletes", () =>
  withCommittedFixture(async ({ fixture: f, row }) => {
    const path = `/api/v1/members/${f.member}/photo`;
    const upload = await request(path + "/upload-url", f.admin, {
      content_type: "image/png",
    });
    assert.equal(upload.status, 200);
    assert.ok(
      upload.body.data.path.startsWith(`${f.tenant}/members/${f.member}/`),
    );
    assert.equal(upload.body.data.headers["x-goog-if-generation-match"], "0");
    files.set(upload.body.data.path, {
      size: "1234",
      contentType: "image/png",
    });
    const confirm = await request(path + "/confirm", f.admin, {
      path: upload.body.data.path,
    });
    assert.equal(confirm.status, 200);
    assert.equal(
      (await row("members", f.member)).photo_path,
      upload.body.data.path,
    );
    assert.equal((await request(path + "/download-url", f.admin)).status, 200);
    assert.equal(
      (await request(path, f.admin, undefined, "DELETE")).status,
      200,
    );
    assert.equal((await row("members", f.member)).photo_path, null);
  }));
test("storage rejects cross-tenant paths, oversized uploads and non-image metadata", () =>
  withCommittedFixture(async ({ fixture: f }) => {
    const path = `/api/v1/members/${f.member}/photo`;
    assert.equal(
      (
        await request(path + "/upload-url", f.otherAdmin, {
          content_type: "image/png",
        })
      ).status,
      404,
    );
    assert.equal(
      (
        await request(path + "/upload-url", f.instructor, {
          content_type: "image/png",
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await request(path + "/upload-url", f.admin, {
          content_type: "text/html",
        })
      ).status,
      422,
    );
    assert.equal(
      (
        await request(path + "/confirm", f.admin, {
          path: `${f.otherTenant}/members/${f.member}/${crypto.randomUUID()}.png`,
        })
      ).status,
      422,
    );
    const upload = await request(path + "/upload-url", f.admin, {
      content_type: "image/png",
    });
    for (const metadata of [
      { size: "99999999", contentType: "image/png" },
      { size: "1", contentType: "text/html" },
    ]) {
      files.set(upload.body.data.path, metadata);
      assert.equal(
        (
          await request(path + "/confirm", f.admin, {
            path: upload.body.data.path,
          })
        ).status,
        422,
      );
    }
  }));
test("storage and database failures do not leak infrastructure details", () =>
  withCommittedFixture(async ({ fixture: f, db }) => {
    const path = `${f.tenant}/members/${f.member}/${crypto.randomUUID()}.png`;
    const r = await request(
      `/api/v1/members/${f.member}/photo/confirm`,
      f.admin,
      { path },
    );
    assert.equal(r.status, 500);
    assert.ok(!JSON.stringify(r.body).includes("secret"));
    await db.query("select 1");
    const { DatabaseService } = require("../dist/database/database");
    const database = app.get(DatabaseService),
      original = database.query;
    database.query = async () => {
      throw new Error("database-password-secret");
    };
    try {
      const failure = await request("/health/ready");
      assert.equal(failure.status, 500);
      assert.ok(!JSON.stringify(failure.body).includes("secret"));
    } finally {
      database.query = original;
    }
  }));
