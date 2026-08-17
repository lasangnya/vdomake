import { defineCommand } from "citty";
import { isDockerRunning } from "../lib/docker";
import { log } from "../lib/log";
import { run } from "../lib/process";

export default defineCommand({
  args: {
    detach: {
      description:
        "Run containers in the background (default). Use -f to follow logs.",
      required: false,
      type: "boolean",
    },
  },
  meta: {
    description: "Start Postgres + Redis via docker compose.",
    name: "up",
  },
  async run() {
    if (!(await isDockerRunning())) {
      throw new Error(
        "Docker daemon is not reachable. Start Docker Desktop and try again.",
      );
    }
    log.info("Starting Postgres + Redis…");
    await run("docker compose up -d");
    log.success("Infrastructure is up (postgres:5432, redis:6379).");
  },
});
