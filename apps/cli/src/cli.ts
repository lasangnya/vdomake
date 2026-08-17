import { defineCommand } from "citty";

function lazy<T>(loader: () => Promise<{ default: T }>): () => Promise<T> {
  return async () => {
    const module = await loader();
    return module.default;
  };
}

export const main = defineCommand({
  meta: {
    description:
      "Developer workflow CLI for the VDOMake monorepo (docker, dev servers, db ops).",
    name: "vdo",
    version: "0.1.0",
  },
  subCommands: {
    up: lazy(() => import("./commands/up")),
    down: lazy(() => import("./commands/down")),
    dev: lazy(() => import("./commands/dev")),
    worker: lazy(() => import("./commands/worker")),
    build: lazy(() => import("./commands/build")),
    check: lazy(() => import("./commands/check")),
    db: lazy(() => import("./commands/db")),
  },
});
