import { defineCommand } from "citty";
import { run } from "../../lib/process";

export default defineCommand({
  meta: {
    description: "Generate Drizzle migration SQL from the schema.",
    name: "generate",
  },
  async run() {
    await run("bun run --cwd apps/web db:generate", {
      label: "Generating migrations…",
    });
  },
});
