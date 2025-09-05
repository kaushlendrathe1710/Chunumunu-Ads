import dotenv from 'dotenv';
dotenv.config();
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@server/db/schema';

// Create the connection
const connectionString = process.env.DATABASE_URL || '';
const client = postgres(connectionString, { max: 1 });
export const db = drizzle(client, { schema, logger: true });

// Initialize database
export async function initDatabase() {
  console.log('Initializing database connection...');
  try {
    // Test connection with postgres.js
    await client`SELECT 1`;
    console.log('Database connection successful');
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    throw error;
  }
}
