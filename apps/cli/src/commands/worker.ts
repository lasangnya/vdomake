import { defineCommand } from "citty";
import { runPersistent } from "../lib/process";
import { log } from "../lib/log";

export default defineCommand({
  meta: {
    description: "Start the capture worker process (URL → screenshots).",
    name: "worker",
  },
  async run() {
    log.info('Starting capture worker (queue "capture")…');
    log.dim("Leave this terminal running — captures won't process without it.");
    await runPersistent("bun", ["run", "worker"], { label: "capture worker" });
  },
});
