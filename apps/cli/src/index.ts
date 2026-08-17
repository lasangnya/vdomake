#!/usr/bin/env bun
import { runMain } from "citty";
import { main } from "./cli";
import { log } from "./lib/log";

try {
  await runMain(main);
} catch (error) {
  if (error instanceof Error) {
    log.error(error.message);
  } else {
    log.error(String(error));
  }
  process.exit(1);
}
