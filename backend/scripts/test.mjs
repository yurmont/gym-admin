import { mkdtemp, writeFile, unlink, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";
import { spawn } from "node:child_process";
import { createServer } from "node:net";

let postgres;
let windowsStop;
let databaseDir;
const env = { ...process.env };
const executable = (file, args) =>
  new Promise((done, reject) => {
    const child = spawn(file, args, { stdio: "pipe", windowsHide: true });
    let output = "";
    child.stdout.on("data", (chunk) => {
      output += chunk;
    });
    child.stderr.on("data", (chunk) => {
      output += chunk;
    });
    child.on("error", reject);
    child.on("exit", (code) =>
      code === 0
        ? done()
        : reject(new Error(`Local PostgreSQL startup failed: ${output}`)),
    );
  });
try {
  // Always use a fresh temporary database; tests never migrate a user-supplied URL.
  const server = createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  databaseDir = await mkdtemp(join(tmpdir(), "gym-api-test-"));
  if (process.platform === "win32") {
    // pg_ctl launches PostgreSQL with a restricted token on Windows, including admin shells.
    const { initdb, pg_ctl } = await import("@embedded-postgres/windows-x64");
    const passwordFile = join(databaseDir, "test-password");
    await writeFile(passwordFile, "local-test-only\n");
    try {
      await executable(initdb, [
        "-D",
        join(databaseDir, "data"),
        "-U",
        "postgres",
        "--auth=password",
        "--encoding=UTF8",
        "--locale=C",
        `--pwfile=${passwordFile}`,
      ]);
    } finally {
      await unlink(passwordFile);
    }
    await executable(pg_ctl, [
      "-D",
      join(databaseDir, "data"),
      "-l",
      join(databaseDir, "postgres.log"),
      "-o",
      `-p ${port} -h 127.0.0.1`,
      "-w",
      "start",
    ]);
    windowsStop = () =>
      executable(pg_ctl, [
        "-D",
        join(databaseDir, "data"),
        "-m",
        "fast",
        "-w",
        "stop",
      ]);
  } else {
    const { default: EmbeddedPostgres } = await import("embedded-postgres");
    postgres = new EmbeddedPostgres({
      databaseDir,
      user: "postgres",
      password: "local-test-only",
      port,
      persistent: false,
      postgresFlags: ["-h", "127.0.0.1"],
      onLog: () => {},
      onError: () => {},
      initdbFlags: ["--encoding=UTF8", "--locale=C"],
    });
    await postgres.initialise();
    await postgres.start();
  }
  env.DATABASE_URL = `postgresql://postgres:local-test-only@127.0.0.1:${port}/postgres`;
  env.DATABASE_DIRECT_URL = env.DATABASE_URL;
  env.TEST_DATABASE_URL = env.DATABASE_URL;
  env.NODE_ENV = "test";
  env.FIREBASE_PROJECT_ID = "demo-gym-admin";
  env.GCS_BUCKET_NAME = "test-bucket";
  const run = (args) =>
    new Promise((resolve, reject) => {
      const child = spawn(process.execPath, args, { env, stdio: "inherit" });
      child.on("error", reject);
      child.on("exit", (code) => resolve(code ?? 1));
    });
  const migrate = await run(["scripts/migrate.mjs"]);
  if (migrate) process.exitCode = migrate;
  else
    process.exitCode = await run([
      "--test",
      "--test-concurrency=1",
      "test/*.test.cjs",
    ]);
} catch (error) {
  console.error(
    error instanceof Error ? error.message : "Local database startup failed",
  );
  process.exitCode = 1;
} finally {
  if (windowsStop) await windowsStop();
  if (postgres) await postgres.stop();
  if (databaseDir && process.platform === "win32") {
    const target = resolve(databaseDir);
    if (
      !target.startsWith(resolve(tmpdir()) + sep) ||
      !target.split(sep).at(-1).startsWith("gym-api-test-")
    )
      throw new Error("Unexpected temporary database path");
    await rm(target, { recursive: true, force: true });
  }
}
process.exit(process.exitCode ?? 0);
