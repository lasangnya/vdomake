import { defineCommand } from "citty";
import { runPersistent } from "../lib/process";
import { log } from "../lib/log";

export default defineCommand({
  args: {
    worker: {
      description: "Also start the capture worker alongside the dev server.",
      required: false,
      type: "boolean",
    },
  },
  meta: {
    description:
      "Start the Next.js dev server (optionally with the capture worker).",
    name: "dev",
  },
  async run({ args }) {
    if (args.worker) {
      log.info("Starting capture worker…");
      void runPersistent("bun", ["run", "worker"], { label: "worker" });
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
    log.info("Starting Next.js dev server at http://localhost:3000…");
    await runPersistent("bun", ["run", "dev"], { label: "dev server" });
  },
});
