# Database Migration Guide

After implementing the ad serving API, you need to update your database schema to include the new tables and enums.

## New Schema Changes

1. **New Enum**: `impression_status` with values: reserved, served, confirmed, expired, cancelled
2. **New Table**: `impressions` with columns for tracking ad serving and billing
3. **Updated Relations**: Added relationships between impressions, ads, and campaigns

## Running the Migration

1. Generate the migration files:

```bash
npm run db:generate
```

2. Apply the migration to your database:

```bash
npm run db:migrate
```

Alternatively, if you're in development and want to push schema changes directly:

```bash
npm run db:push
```

## Verification

After running the migration, you can verify the changes using Drizzle Studio:

```bash
npm run db:studio
```

This will open a web interface where you can inspect your database schema and data.

## Manual SQL (if needed)

If you need to apply the changes manually, here's the equivalent SQL:

```sql
-- Create impression status enum
CREATE TYPE impression_status AS ENUM ('reserved', 'served', 'confirmed', 'expired', 'cancelled');

-- Create impressions table
CREATE TABLE impressions (
    id SERIAL PRIMARY KEY,
    token TEXT NOT NULL UNIQUE,
    ad_id INTEGER NOT NULL REFERENCES ads(id) ON DELETE CASCADE,
    campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    viewer_id TEXT,
    session_id TEXT,
    video_id TEXT NOT NULL,
    category TEXT NOT NULL,
    tags TEXT[] NOT NULL,
    cost_cents INTEGER NOT NULL,
    status impression_status NOT NULL DEFAULT 'reserved',
    expires_at TIMESTAMP NOT NULL,
    served_at TIMESTAMP,
    confirmed_at TIMESTAMP,
    user_agent TEXT,
    ip_address TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_impressions_token ON impressions(token);
CREATE INDEX idx_impressions_ad_id ON impressions(ad_id);
CREATE INDEX idx_impressions_campaign_id ON impressions(campaign_id);
CREATE INDEX idx_impressions_status ON impressions(status);
CREATE INDEX idx_impressions_expires_at ON impressions(expires_at);
CREATE INDEX idx_impressions_created_at ON impressions(created_at);
```

## Environment Variables

Make sure you have the following environment variables set for JWT token signing:

```env
JWT_SECRET=your-secret-key-here
```

If not set, the system will use a default key for development, but this should be changed for production.
