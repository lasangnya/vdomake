import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString =
  process.env.DATABASE_URL ?? 'postgres://vdomake:vdomake_dev@localhost:5432/vdomake';

// postgres.js connects lazily on first query, so importing this module is safe
// even when the database is not yet reachable (e.g. during `next build`).
const client = postgres(connectionString, { prepare: false, max: 10 });

export const db = drizzle(client, { schema });
