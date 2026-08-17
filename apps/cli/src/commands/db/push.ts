import { defineCommand } from "citty";
import { run } from "../../lib/process";

export default defineCommand({
  meta: {
    description: "Apply the Drizzle schema to Postgres (non-destructive).",
    name: "push",
  },
  async run() {
    await run("bun run --cwd apps/web db:push", { label: "Applying schema…" });
  },
});
