import { userRole } from '@shared/constants';
import {
  pgTable,
  text,
  serial,
  boolean,
  timestamp,
  varchar,
  json,
  index,
  pgEnum,
  integer,
} from 'drizzle-orm/pg-core';

const userRoles = Object.values(userRole) as [string, ...string[]];

export const userRoleEnum = pgEnum('user_role', userRoles);

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  username: text('username').notNull().unique(),
  avatar: text('avatar'),
  bio: text('bio'),
  isVerified: boolean('is_verified').default(false),
  role: userRoleEnum('role').default('user').notNull(),
  // VideoStreamPro SSO fields
  videostreamproId: integer('videostreampro_id').unique().notNull(),
  authProvider: text('auth_provider').default('videostreampro').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// this is not used explicitly in the current codebase, but used via express-session
export const session = pgTable(
  'session',
  {
    sid: varchar('sid').primaryKey(), // character varying NOT NULL
    sess: json('sess').notNull(), // json NOT NULL
    expire: timestamp('expire', { precision: 6 }).notNull(), // timestamp without time zone NOT NULL
  },
  (table) => {
    return {
      expireIndex: index('IDX_session_expire').on(table.expire),
    };
  }
);
