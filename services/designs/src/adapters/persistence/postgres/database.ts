import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';

/** Base PostgreSQL vue par Drizzle, quel que soit le pilote (node-postgres en production, PGlite en test). */
export type Database = PgDatabase<PgQueryResultHKT>;
