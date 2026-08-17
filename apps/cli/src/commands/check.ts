import { defineCommand } from "citty";
import { run } from "../lib/process";
import { log } from "../lib/log";

export default defineCommand({
  meta: {
    description:
      "Run the full quality gate (lint + typecheck + format + test) across workspaces.",
    name: "check",
  },
  async run() {
    log.info("Running lint + typecheck + format + test (turbo)…");
    await run("bun run check");
    log.success("All checks passed.");
  },
});
