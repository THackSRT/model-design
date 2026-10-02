import { sql } from 'drizzle-orm';
import type { Database } from './database.js';

export type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];

/**
 * Exécute `work` dans une transaction dont l'organisation est fixée pour les politiques de sécurité au niveau
 * des lignes (`app.organization_id`, locale à la transaction). Toute requête sur une table à sécurité par lignes
 * passe par ici.
 */
export async function inOrganization<T>(
  db: Database,
  organizationId: string,
  work: (tx: Transaction) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.organization_id', ${organizationId}, true)`);
    return work(tx);
  });
}
