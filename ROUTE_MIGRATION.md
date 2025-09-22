# 🚚 Route Migration Guide

## Route Changes Summary

The ad serving and impression APIs have been consolidated and moved to avoid authentication conflicts. All ad serving related endpoints are now under the `/api/service` prefix and are publicly accessible.

## Updated Routes

### ✅ **New Routes (Current)**

```
POST   /api/service/ad/serve              # Get ad for video content
POST   /api/service/impression/confirm    # Confirm ad events & billing
GET    /api/service/impression/:token     # Get impression details
```

### ❌ **Old Routes (Deprecated)**

```
POST   /api/ads/serve                     # REMOVED - was blocked by auth
POST   /api/impressions/confirm           # MOVED
GET    /api/impressions/:token            # MOVED
```

## Why This Change?

The original ad serving endpoint `/api/ads/serve` was placed under the ads routes which require authentication. This prevented external video streaming platforms from accessing the public ad serving API.

By moving all ad serving related endpoints to `/api/service`, we ensure:

- ✅ **No Authentication Required** - Public endpoints for external integration
- ✅ **Logical Grouping** - All ad serving functions under one prefix
- ✅ **Clean Separation** - Admin ad management vs public ad serving

## Migration Steps

### 1. **Update Client Code**

Replace old API calls in your video streaming integration:

```diff
// Old
- const response = await fetch('/api/ads/serve', {
+ const response = await fetch('/api/service/ad/serve', {

// Old
- await fetch('/api/impressions/confirm', {
+ await fetch('/api/service/impression/confirm', {

// Old
- const impression = await fetch('/api/impressions/token123');
+ const impression = await fetch('/api/service/impression/token123');
```

### 2. **Update Environment/Config Files**

If you have API base URLs in config:

```diff
// config.js
- API_AD_SERVE: '/api/ads/serve'
+ API_AD_SERVE: '/api/service/ad/serve'

- API_IMPRESSION_CONFIRM: '/api/impressions/confirm'
+ API_IMPRESSION_CONFIRM: '/api/service/impression/confirm'
```

### 3. **Update Documentation/SDKs**

Update any documentation, SDK, or wrapper libraries that reference the old endpoints.

## Testing the New Routes

```bash
# Test ad serving
curl -X POST http://localhost:3000/api/service/ad/serve \
  -H "Content-Type: application/json" \
  -d '{
    "videoId": "test_video",
    "category": "entertainment",
    "tags": ["action", "adventure"]
  }'

# Test impression confirmation
curl -X POST http://localhost:3000/api/service/impression/confirm \
  -H "Content-Type: application/json" \
  -d '{
    "token": "your_impression_token_here",
    "event": "served"
  }'

# Test impression details
curl http://localhost:3000/api/service/impression/your_token_here
```

## Route Structure Overview

```
/api/
├── auth/           # Authentication endpoints (protected)
├── user/           # User management (protected)
├── teams/          # Team management (protected)
├── wallet/         # Wallet operations (protected)
├── upload/         # File uploads (protected)
└── service/        # 🆕 PUBLIC ad serving endpoints
    ├── ad/
    │   └── serve   # Get ads for content
    └── impression/
        ├── confirm # Confirm ad events
        └── :token  # Get impression details
```

This new structure provides clear separation between administrative functions (which require authentication) and public ad serving functions (which external platforms need to access freely).
