import { defineCommand } from "citty";

function lazy<T>(loader: () => Promise<{ default: T }>): () => Promise<T> {
  return async () => {
    const module = await loader();
    return module.default;
  };
}

export default defineCommand({
  meta: {
    description: "Database lifecycle commands (push, generate, studio, reset).",
    name: "db",
  },
  subCommands: {
    push: lazy(() => import("./push")),
    studio: lazy(() => import("./studio")),
    generate: lazy(() => import("./generate")),
    reset: lazy(() => import("./reset")),
  },
});
