import { db } from '@server/db/connect';
import { eq, and, sql, gte } from 'drizzle-orm';
import { User, InsertUser } from '@shared/types/index';
import { users, teams, teamMembers } from '@server/db/schema';
import { teamRole, userRole } from '@shared/constants';
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
  const result = await db.transaction(async (tx) => {
    // Create the user
    const [newUser] = await tx.insert(users).values(insertUser).returning();

    // Create default team for the user
    const [defaultTeam] = await tx
      .insert(teams)
      .values({
        name: `${newUser.username}'s Team`,
        description: `Default team for ${newUser.username}`,
        ownerId: newUser.id,
      })
      .returning();

    // Add user as team owner
    await tx.insert(teamMembers).values({
      teamId: defaultTeam.id,
      userId: newUser.id,
      role: teamRole.owner,
      permissions: [], // Empty permissions for owner - they have all permissions by default
    });

    return newUser;
  });

  return result;
}

export async function updateUser(
  id: number,
  updates: Partial<InsertUser>
): Promise<User | undefined> {
  const result = await db.update(users).set(updates).where(eq(users.id, id)).returning();
  return result[0];
}

export async function getUserByVideostreamproId(videostreamproId: number): Promise<User | undefined> {
  const result = await db.select().from(users).where(eq(users.videostreamproId, videostreamproId));
  return result[0];
}

export async function createVideostreamproUser(insertUser: InsertUser): Promise<User> {
  const result = await db.transaction(async (tx) => {
    // Create the user with VideoStreamPro data
    const [newUser] = await tx.insert(users).values({
      ...insertUser,
      authProvider: 'videostreampro',
      isVerified: true, // VideoStreamPro users are pre-verified
    }).returning();

    // Create default team for the user
    const [defaultTeam] = await tx
      .insert(teams)
      .values({
        name: `${newUser.username}'s Team`,
        description: `Default team for ${newUser.username}`,
        ownerId: newUser.id,
      })
      .returning();

    // Add user as team owner
    await tx.insert(teamMembers).values({
      teamId: defaultTeam.id,
      userId: newUser.id,
      role: teamRole.owner,
      permissions: [], // Empty permissions for owner - they have all permissions by default
    });

    return newUser;
  });

  return result;
}

export async function upsertVideostreamproUser(videostreamproUser: {
  id: number;
  email: string;
  username: string;
  avatar?: string;
}): Promise<User> {
  // Check if user exists by VideoStreamPro ID
  let existingUser = await getUserByVideostreamproId(videostreamproUser.id);
  
  if (existingUser) {
    // Update existing user with latest data from VideoStreamPro
    const updatedUser = await updateUser(existingUser.id, {
      email: videostreamproUser.email,
      username: videostreamproUser.username,
      avatar: videostreamproUser.avatar,
    });
    return updatedUser!;
  }

  // Check if user exists by email (migration case)
  existingUser = await getUserByEmail(videostreamproUser.email);
  
  if (existingUser) {
    // Update existing user to link with VideoStreamPro
    const updatedUser = await updateUser(existingUser.id, {
      videostreamproId: videostreamproUser.id,
      username: videostreamproUser.username,
      avatar: videostreamproUser.avatar,
      authProvider: 'videostreampro',
      isVerified: true,
    });
    return updatedUser!;
  }

  // Create new user
  return await createVideostreamproUser({
    email: videostreamproUser.email,
    username: videostreamproUser.username,
    avatar: videostreamproUser.avatar,
    videostreamproId: videostreamproUser.id,
    role: userRole.user,
    authProvider: 'videostreampro',
    isVerified: true,
  });
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
  getUserByVideostreamproId,
  createUser,
  createVideostreamproUser,
  upsertVideostreamproUser,
  updateUser,
  deleteUser,
  getUsersCount,
};
