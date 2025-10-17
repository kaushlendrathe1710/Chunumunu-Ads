# Ad Serving API Update - Category and Tags Made Optional

## Summary of Changes

The serve API has been updated to make `category` and `tags` parameters **optional** instead of mandatory. Now, **at least one** of them must be provided (not both required).

## What Changed

### 1. **Request Schema** (`server/schemas/adSchemas.ts`)

- `category` is now optional
- `tags` is now optional
- Added validation: at least one of `category` or `tags` must be provided
- Maintained existing validation: either `user_id` or `anon_id` is required

**Example Valid Requests:**

```json
// With category only
{
  "videoId": "video_123",
  "category": "entertainment",
  "user_id": "user_456"
}

// With tags only
{
  "videoId": "video_123",
  "tags": ["action", "adventure"],
  "anon_id": "anon_789"
}

// With both category and tags
{
  "videoId": "video_123",
  "category": "sports",
  "tags": ["football", "live"],
  "user_id": "user_456"
}
```

### 2. **Ad Selection Logic** (`server/db/services/adSelector.service.ts`)

#### Enhanced `fetchCandidateAds` Method:

- Now accepts optional `category` and `tags` parameters
- Dynamically builds SQL WHERE conditions based on what's provided:
  - **Both provided**: Match ads with either category OR tags
  - **Only category**: Match ads with that category
  - **Only tags**: Match ads with those tags
- Better logging to show which parameters were used

#### Improved `scoreAd` Method:

- Handles optional parameters gracefully
- **Dynamic weight adjustment**:
  - If only category provided: combines category + tag weights for category matching
  - If only tags provided: combines category + tag weights for tag matching
  - If both provided: uses standard weight distribution
- This ensures fair scoring regardless of which parameter(s) are provided

#### Updated Score Calculation Methods:

- `calculateTagOverlap`: Returns 0 if no tags provided
- `calculateCategoryMatch`: Returns 0 if no category provided

### 3. **Impression Tracking** (`createImpressionRecord`)

- Updated to handle optional `category` and `tags`
- Stores `null` for category if not provided
- Stores empty array for tags if not provided

### 4. **Documentation** (`AD_SERVING_API.md`)

- Updated API documentation to reflect optional parameters
- Added note explaining that at least one of `category` or `tags` must be provided
- Updated examples with correct field names (`user_id` and `anon_id`)

## Benefits

1. **More Flexible Integration**: Video platforms can choose to provide category, tags, or both based on their data availability
2. **Better Ad Matching**: The system now finds the most appropriate ad based on available information
3. **Improved Scoring**: Dynamic weight adjustment ensures relevant ads are selected even with partial information
4. **Backward Compatible**: Existing integrations providing both parameters continue to work as before

## Technical Details

### Scoring Weight Distribution

| Scenario      | Category Weight | Tag Weight      | Result                              |
| ------------- | --------------- | --------------- | ----------------------------------- |
| Both provided | 0.30 (default)  | 0.30 (default)  | Standard scoring                    |
| Category only | 0.60 (combined) | 0               | Category gets full relevance weight |
| Tags only     | 0               | 0.60 (combined) | Tags get full relevance weight      |

_Note: Budget (0.20) and Bid (0.20) weights remain constant_

### Query Optimization

The system uses a two-tier approach:

1. **First attempt**: Find ads matching the provided criteria (category/tags)
2. **Fallback**: If no matches, fetch all eligible ads and let scoring algorithm select the best fit

This ensures ads are always served when available, even if there's no perfect match.

## Testing Recommendations

Test the API with these scenarios:

1. ✅ Request with only category
2. ✅ Request with only tags
3. ✅ Request with both category and tags
4. ❌ Request with neither (should return validation error)
5. ✅ Request with category that doesn't match any ads (should fallback to scoring)
6. ✅ Request with tags that don't match any ads (should fallback to scoring)

## Migration Notes

- **No database changes required**
- **No breaking changes** - existing API calls continue to work
- The API is now more lenient and user-friendly
- Consider updating client applications to take advantage of the flexibility
