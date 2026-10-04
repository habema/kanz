import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set.');

export const db = drizzle(new pg.Pool({ connectionString: process.env.DATABASE_URL }));

export * from './schema';
