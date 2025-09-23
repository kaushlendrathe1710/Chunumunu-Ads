# Ad Impression Tracking for Authenticated and Anonymous Users

## Overview
The ad impression system now supports both authenticated users (with `user_id`) and anonymous users (with `anon_id`). This allows comprehensive tracking of ad interactions across user sessions.

## API Usage

### 1. Serving Ads (`POST /ads/serve`)

**For Authenticated Users:**
```json
{
  "videoId": "video123",
  "category": "entertainment",
  "tags": ["comedy", "viral"],
  "user_id": "user_12345"
}
```

**For Anonymous Users:**
```json
{
  "videoId": "video123", 
  "category": "entertainment",
  "tags": ["comedy", "viral"],
  "anon_id": "anon_67890"
}
```

**Response:**
```json
{
  "ad": {
    "id": 1,
    "title": "Ad Title",
    "description": "Ad Description",
    "videoUrl": "https://...",
    "thumbnailUrl": "https://...",
    "categories": ["entertainment"],
    "tags": ["comedy"],
    "ctaLink": "https://..."
  },
  "impressionToken": "eyJ...",
  "costCents": 25,
  "expiresAt": "2025-09-22T10:30:00Z"
}
```

### 2. Confirming Impressions (`POST /impressions/confirm`)

**Basic Request:**
```json
{
  "token": "eyJ...",
  "event": "served"
}
```

**With Optional User Identification (for session bridging):**
```json
{
  "token": "eyJ...",
  "event": "clicked",
  "user_id": "user_12345",  // If user became authenticated
  "metadata": {
    "viewDuration": 15,
    "videoProgress": 75
  }
}
```

**For Anonymous Users:**
```json
{
  "token": "eyJ...",
  "event": "completed",
  "anon_id": "anon_67890",
  "metadata": {
    "viewDuration": 30,
    "videoProgress": 100
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Ad click recorded successfully"
}
```

## Event Types

1. **"served"** - Ad was successfully displayed (triggers billing)
2. **"clicked"** - User clicked on the ad
3. **"completed"** - User watched the ad to completion
4. **"skipped"** - User skipped the ad

## Database Schema

The `ad_impressions` table now includes:
- `viewerId` - For authenticated users
- `anonId` - For anonymous users  
- User identification can be updated during impression confirmation for session bridging

## Session Bridging

If an anonymous user becomes authenticated during an ad session, you can update the impression:

```json
{
  "token": "eyJ...",
  "event": "clicked",
  "user_id": "user_12345"  // This will update viewerId and clear anonId
}
```

## Validation Rules

- Cannot provide both `user_id` and `anon_id` in the same request
- If `user_id` is provided, it will override any existing `anon_id`
- If `anon_id` is provided and no authenticated user exists, it will be stored
- Session bridging allows anonymous sessions to be linked to authenticated users