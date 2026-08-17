import { defineCommand } from "citty";
import { run } from "../lib/process";
import { log } from "../lib/log";

export default defineCommand({
  meta: {
    description: "Build all packages and the Next.js app.",
    name: "build",
  },
  async run() {
    log.info("Building workspace…");
    await run("bun run build");
    log.success("Build complete.");
  },
});
