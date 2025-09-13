import { teamRole, permission } from '@shared/constants';
import { pgTable, text, serial, timestamp, integer, pgEnum } from 'drizzle-orm/pg-core';
import { users } from './user.schema';

const teamRoles = Object.values(teamRole) as [string, ...string[]];
const permissions = Object.values(permission) as [string, ...string[]];

export const teamRoleEnum = pgEnum('team_role', teamRoles);
export const permissionEnum = pgEnum('permission', permissions);

export const teams = pgTable('teams', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  avatar: text('avatar'),
  ownerId: integer('owner_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const teamMembers = pgTable('team_members', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id')
    .notNull()
    .references(() => teams.id, { onDelete: 'cascade' }),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  role: teamRoleEnum('role').notNull(),
  permissions: permissionEnum('permissions').array(),
  joinedAt: timestamp('joined_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
