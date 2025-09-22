# Ad Serving API Implementation

This implementation provides a complete ad serving system for your Node.js ads platform with the following endpoints:

## 🚀 **API Endpoints for Video Streaming Integration**

### POST /api/service/ad/serve

**Purpose**: Get an ad to display in your video player  
**Authentication**: None required (public endpoint)  
**Usage**: Call this before showing an ad break in your video content

**Request Body:**

```json
{
  "videoId": "video_123", // Your video's unique ID
  "category": "entertainment", // Video category (entertainment, sports, news, etc.)
  "tags": ["action", "adventure"], // Video tags for ad matching
  "viewerId": "user_456", // Optional: Logged-in user ID
  "sessionId": "session_789" // Optional: Session identifier
}
```

**Success Response (200):**

```json
{
  "ad": {
    "id": 123,
    "title": "Amazing Product Ad",
    "description": "Check out our amazing product",
    "videoUrl": "https://cdn.example.com/ads/ad123.mp4",
    "thumbnailUrl": "https://cdn.example.com/ads/thumb123.jpg",
    "categories": ["entertainment"],
    "tags": ["action", "adventure"],
    "ctaLink": "https://example.com/product"
  },
  "impressionToken": "eyJhbGciOiJIUzI1NiIs...", // Use this token for confirmation
  "costCents": 10, // Cost for this impression
  "expiresAt": "2025-09-19T15:30:00.000Z" // Token expiration
}
```

**No Ads Available (204):**

```json
{
  "reason": "no_eligible_ads"
}
```

### POST /api/service/impression/confirm

**Purpose**: Confirm ad events and handle billing  
**Authentication**: None required (uses impression token)  
**Usage**: Call this when ad events occur (served, clicked, completed, etc.)

**Request Body:**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...", // Token from /ads/serve response
  "event": "served", // "served" | "clicked" | "completed" | "skipped"
  "metadata": {
    "userAgent": "Mozilla/5.0...",
    "ipAddress": "192.168.1.1",
    "viewDuration": 30, // seconds watched
    "videoProgress": 75.5 // percentage of ad watched
  }
}
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "Impression confirmed and billed successfully",
  "billingDetails": {
    "costCents": 10,
    "remainingBudget": 5000
  }
}
```

### GET /api/service/impression/:token

**Purpose**: Get impression details (for debugging/analytics)  
**Authentication**: None required  
**Usage**: Optional endpoint for debugging impression issues

## 🎥 **Video Streaming Platform Integration Guide**

### 1. **Pre-Roll Ad Integration**

```javascript
// Before playing main video content
async function loadPreRollAd(videoId, category, tags) {
  try {
    const response = await fetch('/api/service/ad/serve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        videoId,
        category,
        tags,
        viewerId: getCurrentUserId(), // optional
        sessionId: getSessionId(), // optional
      }),
    });

    if (response.status === 204) {
      // No ads available, skip to main content
      playMainVideo();
      return;
    }

    const adData = await response.json();
    await playAd(adData);
  } catch (error) {
    console.error('Ad serving failed:', error);
    playMainVideo(); // Fallback to main content
  }
}

async function playAd(adData) {
  const { ad, impressionToken } = adData;

  // Load ad video
  videoPlayer.src = ad.videoUrl;
  videoPlayer.poster = ad.thumbnailUrl;

  // Show ad overlay with title, description, CTA
  showAdOverlay(ad.title, ad.description, ad.ctaLink);

  // Confirm ad was served
  await confirmImpression(impressionToken, 'served');

  // Play the ad
  await videoPlayer.play();

  // Track ad completion
  videoPlayer.addEventListener('ended', () => {
    confirmImpression(impressionToken, 'completed');
    playMainVideo();
  });

  // Track clicks if user clicks CTA
  ctaButton.addEventListener('click', () => {
    confirmImpression(impressionToken, 'clicked');
    window.open(ad.ctaLink, '_blank');
  });
}

async function confirmImpression(token, event) {
  try {
    await fetch('/api/service/impression/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        event,
        metadata: {
          userAgent: navigator.userAgent,
          viewDuration: Math.floor(videoPlayer.currentTime),
          videoProgress: (videoPlayer.currentTime / videoPlayer.duration) * 100,
        },
      }),
    });
  } catch (error) {
    console.error('Failed to confirm impression:', error);
  }
}
```

### 2. **Mid-Roll Ad Integration**

```javascript
// During video playback at designated ad breaks
videoPlayer.addEventListener('timeupdate', () => {
  const currentTime = videoPlayer.currentTime;

  // Check for mid-roll ad breaks (e.g., every 10 minutes)
  if (shouldShowMidRollAd(currentTime)) {
    pauseMainVideo();
    loadMidRollAd();
  }
});

function shouldShowMidRollAd(currentTime) {
  const adBreaks = [600, 1200, 1800]; // 10, 20, 30 minutes
  return adBreaks.some(
    (breakTime) => Math.abs(currentTime - breakTime) < 1 && !hasShownAdAt(breakTime)
  );
}
```

### 3. **Overlay/Banner Ad Integration**

```javascript
// For non-intrusive overlay ads
async function loadOverlayAd() {
  const adData = await fetchAd();
  if (adData.reason === 'no_eligible_ads') return;

  // Show overlay banner
  const overlay = createAdOverlay(adData.ad);
  videoContainer.appendChild(overlay);

  // Auto-remove after 10 seconds
  setTimeout(() => {
    overlay.remove();
    confirmImpression(adData.impressionToken, 'completed');
  }, 10000);
}
```

## 📊 **Event Tracking Best Practices**

### Required Events:

- **"served"**: When ad starts playing (triggers billing)
- **"completed"**: When ad finishes or is dismissed
- **"clicked"**: When user clicks CTA or ad content
- **"skipped"**: When user skips the ad (if skip is allowed)

### Optional Metadata:

- `viewDuration`: How long the ad was watched
- `videoProgress`: Percentage of ad content viewed
- `userAgent`: For device/browser analytics
- `ipAddress`: For geographic analytics (handled server-side)

## 🗂️ **File Structure (Consolidated)**

```
server/
├── constants/index.ts              # Cost and scoring configuration
├── schemas/adSchemas.ts            # Zod validation schemas
├── utils/token.ts                  # JWT token utilities
├── controllers/
│   ├── ads.controller.ts           # Updated with serveAd method
│   └── impression.controller.ts    # Impression confirmation handling
├── db/
│   ├── schema/
│   │   ├── analytics.schema.ts     # Enhanced adImpressions table
│   │   ├── enums.ts               # Added impression status enum
│   │   └── relations.ts           # Updated relations
│   └── services/
│       └── adSelector.service.ts   # 🆕 Consolidated ad serving service
└── routes/
    ├── ads.routes.ts              # Updated with serve endpoint
    ├── impression.routes.ts       # Impression confirmation routes
    └── index.ts                   # Updated route registration
```

## 🔧 **Configuration**

### Environment Variables:

```env
JWT_SECRET=your-secret-key-here
COST_PER_VIEW_CENTS=10
```

### Scoring Algorithm (Configurable):

- **Tag Overlap**: 40% weight - Jaccard similarity between video and ad tags
- **Category Match**: 30% weight - Direct category matching
- **Budget Factor**: 20% weight - Remaining budget ratio
- **Bid Amount**: 10% weight - Future bidding system placeholder

## 🚀 **Getting Started**

1. **Run Database Migration**:

```bash
npm run db:generate
npm run db:migrate
```

2. **Test Ad Serving**:

```bash
curl -X POST http://localhost:3000/api/service/ad/serve \
  -H "Content-Type: application/json" \
  -d '{
    "videoId": "test_video",
    "category": "entertainment",
    "tags": ["action", "adventure"]
  }'
```

3. **Test Impression Confirmation**:

```bash
curl -X POST http://localhost:3000/api/service/impression/confirm \
  -H "Content-Type: application/json" \
  -d '{
    "token": "impression_token_from_serve_response",
    "event": "served"
  }'
```

## 📈 **Integration Benefits**

- ✅ **Revenue Optimization**: Smart ad selection maximizes earnings
- ✅ **Budget Protection**: Prevents overspending with transaction safety
- ✅ **User Experience**: Contextual ad matching improves relevance
- ✅ **Scalability**: Handles high-volume ad serving efficiently
- ✅ **Analytics Ready**: Rich event tracking for performance insights
- ✅ **Flexible Integration**: Works with any video player technology

## 🔮 **Future Enhancements**

- Real-time bidding integration
- Machine learning-based ad optimization
- Frequency capping and user targeting
- Advanced fraud detection
- Geographic and demographic targeting
