/**
 * Minimal type for the archiver v8 `ZipArchive` named export. The published
 * @types/archiver@8 declarations only cover the base `Archiver` class; this
 * augments the module with the zip-specific class we use, self-contained so
 * the base types are untouched.
 */
declare module 'archiver' {
  export interface ProgressData {
    entries: { processed: number; total: number };
  }
  export interface ZipArchiveOptions {
    zlib?: { level?: number };
  }
  export class ZipArchive {
    constructor(options?: ZipArchiveOptions);
    pipe<T extends NodeJS.WritableStream>(destination: T): T;
    directory(dirpath: string, destpath: false | string): this;
    finalize(): Promise<void>;
    on(event: 'error', listener: (error: Error) => void): this;
    on(event: 'progress', listener: (progress: ProgressData) => void): this;
  }
}
