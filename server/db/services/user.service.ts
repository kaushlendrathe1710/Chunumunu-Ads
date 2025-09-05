import { db } from '@server/db/connect';
import { eq, and, sql, gte } from 'drizzle-orm';
import { User, InsertUser } from '@shared/types/index';
import { users } from '@server/db/schema';
import session from 'express-session';
import connectPg from 'connect-pg-simple';

const PostgresSessionStore = connectPg(session);
export const sessionStore = new PostgresSessionStore({
  conObject: {
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  },
  createTableIfMissing: true,
});

// User operations
export async function getUserById(id: number): Promise<User | undefined> {
  const result = await db.select().from(users).where(eq(users.id, id));
  return result[0];
}

export async function getUserByEmail(email: string): Promise<User | undefined> {
  const result = await db.select().from(users).where(eq(users.email, email));
  return result[0];
}

export async function getUserByUsername(username: string): Promise<User | undefined> {
  const result = await db.select().from(users).where(eq(users.username, username));
  return result[0];
}

export async function createUser(insertUser: InsertUser): Promise<User> {
  const result = await db.insert(users).values(insertUser).returning();
  return result[0];
}

export async function updateUser(
  id: number,
  updates: Partial<InsertUser>
): Promise<User | undefined> {
  const result = await db.update(users).set(updates).where(eq(users.id, id)).returning();
  return result[0];
}

export async function getUsersCount(): Promise<number> {
  const result = await db.select({ count: sql<number>`COUNT(*)` }).from(users);
  return result[0].count;
}

export async function deleteUser(id: number): Promise<void> {
  await db.delete(users).where(eq(users.id, id));
}

// Export a grouped service object for convenience while keeping named exports
export const userService = {
  // session store
  sessionStore,

  // user functions
  getUserById,
  getUserByEmail,
  getUserByUsername,
  createUser,
  updateUser,
  deleteUser,
  getUsersCount,
};
