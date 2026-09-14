const { test } = require("node:test");
const assert = require("node:assert/strict");
const { validateConfig } = require("../dist/config");
const { databaseOptions } = require("../scripts/database-config.cjs");
const base = {
  DATABASE_URL: "postgresql://user:password@localhost/db",
  FIREBASE_PROJECT_ID: "demo-gym-admin",
  GCS_BUCKET_NAME: "test-bucket",
};
test("configuration applies small pool/port defaults and rejects unsafe production emulator settings", () => {
  const config = validateConfig(base);
  assert.equal(config.DB_POOL_MAX, 3);
  assert.equal(config.PORT, 8080);
  assert.throws(() => validateConfig({ ...base, DB_POOL_MAX: 100 }));
  assert.throws(() => validateConfig({ ...base, CORS_ORIGINS: "*" }));
  assert.throws(() =>
    validateConfig({
      ...base,
      NODE_ENV: "production",
      FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099",
    }),
  );
  assert.throws(() => validateConfig({ ...base, DATABASE_URL: "" }));
});
test("Neon URI options enable channel binding and verified TLS without overriding explicit SSL configuration", () => {
  const config = databaseOptions(
    "postgresql://test:test@sample-pooler.region.aws.neon.tech/db?sslmode=require&channel_binding=require",
  );
  assert.deepEqual(config.ssl, { rejectUnauthorized: true });
  assert.equal(config.enableChannelBinding, true);
  assert.equal(config.max, 3);
  assert.ok(!config.connectionString.includes("sslmode"));
  assert.ok(!config.connectionString.includes("channel_binding"));
  assert.equal(
    databaseOptions("postgresql://test:test@127.0.0.1/db").ssl,
    false,
  );
});
