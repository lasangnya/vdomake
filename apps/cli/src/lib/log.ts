import colors from "yoctocolors";

export const log = {
  dim(message: string): void {
    process.stderr.write(`${colors.dim(message)}\n`);
  },
  error(message: string): void {
    process.stderr.write(`${colors.red("✗")} ${message}\n`);
  },
  info(message: string): void {
    process.stderr.write(`${colors.cyan("›")} ${message}\n`);
  },
  plain(message: string): void {
    process.stderr.write(`${message}\n`);
  },
  step(message: string): void {
    process.stderr.write(`${colors.dim("·")} ${colors.dim(message)}\n`);
  },
  success(message: string): void {
    process.stderr.write(`${colors.green("✓")} ${message}\n`);
  },
  warn(message: string): void {
    process.stderr.write(`${colors.yellow("!")} ${message}\n`);
  },
};

export { colors };
