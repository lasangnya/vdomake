import { execa } from "execa";
import { resolveRepoRoot } from "./paths";
import { log } from "./log";

interface RunOptions {
  cwd?: string;
  env?: Record<string, string | undefined>;
  /** When true, inherits stdio so the child's output streams to the terminal. */
  stream?: boolean;
  label?: string;
}

/**
 * Runs a command relative to the repo root. Throws on non-zero exit with a
 * concise message; streams child output when `stream` is true.
 */
export async function run(
  command: string,
  options: RunOptions = {},
): Promise<void> {
  const repoRoot = resolveRepoRoot();
  if (options.label) {
    log.info(options.label);
  }
  try {
    await execa(command, {
      cwd: options.cwd ?? repoRoot,
      stdio: options.stream ? "inherit" : "pipe",
      ...(options.env ? { env: options.env } : {}),
    });
    if (options.label) {
      log.dim(`done: ${options.label}`);
    }
  } catch (error) {
    const code =
      "exitCode" in (error as object)
        ? String((error as { exitCode?: number }).exitCode)
        : "unknown";
    throw new Error(`${options.label ?? command} failed (exit ${code})`, {
      cause: error,
    });
  }
}

/**
 * Long-running process (dev server, worker). Streams output and blocks until
 * the child exits; returns the child so callers can forward signals.
 */
export async function runPersistent(
  command: string,
  args: string[],
  options: RunOptions = {},
): Promise<void> {
  const repoRoot = resolveRepoRoot();
  const child = execa(command, args, {
    cwd: options.cwd ?? repoRoot,
    stdio: "inherit",
    env: options.env,
  });
  child.on("exit", (code) => {
    if ((code ?? 0) !== 0 && code !== null && code !== 130) {
      log.error(`${options.label ?? command} exited with code ${code}`);
    }
  });
  // Forward SIGINT/SIGTERM so Ctrl+C kills the child too.
  const forward = () => {
    child.kill("SIGTERM");
  };
  process.once("SIGINT", forward);
  process.once("SIGTERM", forward);
  await child;
}
