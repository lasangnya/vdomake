import { defineCommand } from "citty";
import { runPersistent } from "../../lib/process";

export default defineCommand({
  meta: {
    description: "Open Drizzle Studio (interactive DB browser).",
    name: "studio",
  },
  async run() {
    await runPersistent("bun", ["run", "--cwd", "apps/web", "db:studio"], {
      label: "Drizzle Studio",
    });
  },
});
