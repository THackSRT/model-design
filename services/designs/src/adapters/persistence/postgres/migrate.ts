import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { sql } from 'drizzle-orm';
import type { Database } from './database.js';

const BREAKPOINT = '--> statement-breakpoint';

/** Applique dans l'ordre les migrations SQL pas encore appliquées. Chaque fichier est une transaction. */
export async function runMigrations(db: Database, directory: string): Promise<string[]> {
  await db.execute(
    sql`create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())`,
  );
  const done = await db.execute<{ name: string }>(sql`select name from schema_migrations`);
  const applied = new Set(
    (done as unknown as { rows: { name: string }[] }).rows.map((r) => r.name),
  );
  const pending = readdirSync(directory)
    .filter((f) => f.endsWith('.sql') && !applied.has(f))
    .sort();
  for (const file of pending) {
    const statements = readFileSync(join(directory, file), 'utf8').split(BREAKPOINT);
    await db.transaction(async (tx) => {
      for (const statement of statements)
        if (statement.trim()) await tx.execute(sql.raw(statement));
      await tx.execute(sql`insert into schema_migrations (name) values (${file})`);
    });
  }
  return pending;
}
