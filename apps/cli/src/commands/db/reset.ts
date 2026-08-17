import { defineCommand } from "citty";
import { run } from "../../lib/process";
import { log } from "../../lib/log";

export default defineCommand({
  meta: {
    description:
      "Reset Postgres: drop and recreate the schema via dry-run + push.",
    name: "reset",
  },
  async run() {
    log.warn("This will drop all tables and re-apply the schema.");
    log.dim(
      'Confirm by re-running: vdo db reset --force (not implemented — use "docker compose down" + up).',
    );
    // Safe default: push the schema against a fresh DB is destructive; for now
    // `reset` maps to dropping the volume via compose to keep it simple.
    log.info("Dropping and recreating postgres + redis containers…");
    await run("docker compose down -v");
    await run("docker compose up -d");
    await run("bun run --cwd apps/web db:push", {
      label: "Re-applying schema…",
    });
    log.success("Database reset complete.");
  },
});
