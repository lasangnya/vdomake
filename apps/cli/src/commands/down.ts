import { defineCommand } from "citty";
import { run } from "../lib/process";
import { log } from "../lib/log";

export default defineCommand({
  meta: {
    description: "Stop Postgres + Redis containers.",
    name: "down",
  },
  async run() {
    log.info("Stopping containers…");
    await run("docker compose down");
    log.success("Infrastructure stopped.");
  },
});
