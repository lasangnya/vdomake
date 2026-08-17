import { execa } from "execa";

/** Checks whether the Docker daemon is reachable. */
export async function isDockerRunning(): Promise<boolean> {
  try {
    await execa("docker", ["info"], { stdio: "ignore", timeout: 8000 });
    return true;
  } catch {
    return false;
  }
}
