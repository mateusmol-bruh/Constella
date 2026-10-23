const { test } = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const path = require("node:path");

test("seed exige opt-in explícito de desenvolvimento antes de conectar/gravar", () => {
  for (const config of [
    { NODE_ENV: "production", ALLOW_DEVELOPMENT_SEED: "true" },
    { NODE_ENV: "", ALLOW_DEVELOPMENT_SEED: "true" },
    { NODE_ENV: "development", ALLOW_DEVELOPMENT_SEED: "false" }
  ]) {
    const r = spawnSync(process.execPath, ["--import", "tsx", "src/prisma/seed.ts"], {
      cwd: path.resolve(__dirname, ".."), encoding: "utf8", timeout: 30000,
      env: { ...process.env, ...config, DATABASE_URL: "postgresql://unused:unused@127.0.0.1:1/unused", SEED_PASSWORD: "" }
    });
    assert.equal(r.status, 1);
    assert.match(r.stderr, /Seed bloqueado/);
    assert.doesNotMatch(r.stdout, /concluído/);
  }
});
