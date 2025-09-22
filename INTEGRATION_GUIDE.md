# API Summary and Integration Guide

## 📡 **Created APIs**

### 1. **POST /api/service/ad/serve**

- **Purpose**: Main ad serving endpoint for video streaming platforms
- **Authentication**: Public (no auth required)
- **Function**: Returns the best matching ad for given video content
- **Usage**: Call before every ad break in your video player

### 2. **POST /api/service/impression/confirm**

- **Purpose**: Confirm ad events and handle billing
- **Authentication**: Token-based (uses impression token)
- **Function**: Tracks ad events (served, clicked, completed, skipped) and processes billing
- **Usage**: Call when ad events occur in your video player

### 3. **GET /api/service/impression/:token**

- **Purpose**: Get impression details (debugging/analytics)
- **Authentication**: Public
- **Function**: Retrieve impression information by token
- **Usage**: Optional - for debugging impression issues

## 🎬 **Video Streaming Integration Scenarios**

### **Scenario 1: YouTube-like Platform**

```javascript
// Pre-roll ads before main video
async function playVideo(videoId) {
  // 1. Get ad before playing main content
  const ad = await getAd(videoId, 'entertainment', ['comedy', 'viral']);

  if (ad) {
    // 2. Play 15-30 second ad
    await playPreRollAd(ad);

    // 3. Confirm ad was served (triggers billing)
    await confirmAdEvent(ad.impressionToken, 'served');
  }

  // 4. Play main video content
  playMainVideo(videoId);
}

// Mid-roll ads during long videos
videoPlayer.addEventListener('timeupdate', async () => {
  if (shouldShowMidRollAd(videoPlayer.currentTime)) {
    pauseVideo();
    const ad = await getAd(currentVideoId, 'entertainment', ['action']);
    await playMidRollAd(ad);
    resumeVideo();
  }
});
```

## 🛠️ **Integration Helper Functions**

### **Core Ad Integration Functions**

```javascript
// Main function to get an ad
async function getAd(videoId, category, tags, viewerId = null, sessionId = null) {
  try {
    const response = await fetch('/api/service/ad/serve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        videoId,
        category,
        tags,
        viewerId,
        sessionId: sessionId || generateSessionId(),
      }),
    });

    if (response.status === 204) {
      return null; // No ads available
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to fetch ad:', error);
    return null;
  }
}

// Confirm ad events
async function confirmAdEvent(token, event, metadata = {}) {
  try {
    await fetch('/api/service/impression/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        event,
        metadata: {
          userAgent: navigator.userAgent,
          viewDuration: metadata.viewDuration,
          videoProgress: metadata.videoProgress,
          ...metadata,
        },
      }),
    });
  } catch (error) {
    console.error('Failed to confirm ad event:', error);
  }
}

// Video player integration
class AdEnabledVideoPlayer {
  constructor(videoElement) {
    this.video = videoElement;
    this.currentAd = null;
    this.adStartTime = null;
  }

  async playWithAds(videoId, category, tags) {
    // Get pre-roll ad
    const preRollAd = await getAd(videoId, category, tags);

    if (preRollAd) {
      await this.playAd(preRollAd);
    }

    // Play main content
    this.playMainContent();

    // Set up mid-roll ads
    this.setupMidRollAds(videoId, category, tags);
  }

  async playAd(adData) {
    this.currentAd = adData;
    this.video.src = adData.ad.videoUrl;
    this.video.poster = adData.ad.thumbnailUrl;

    // Show ad UI
    this.showAdOverlay(adData.ad);

    // Track ad start
    this.adStartTime = Date.now();
    await this.video.play();

    // Confirm ad served
    await confirmAdEvent(adData.impressionToken, 'served');

    // Handle ad completion
    this.video.addEventListener('ended', this.handleAdComplete.bind(this), { once: true });
  }

  async handleAdComplete() {
    if (this.currentAd) {
      const viewDuration = (Date.now() - this.adStartTime) / 1000;
      const videoProgress = 100; // Ad completed fully

      await confirmAdEvent(this.currentAd.impressionToken, 'completed', {
        viewDuration,
        videoProgress,
      });

      this.hideAdOverlay();
      this.currentAd = null;
    }
  }

  setupMidRollAds(videoId, category, tags) {
    this.video.addEventListener('timeupdate', async () => {
      const currentTime = this.video.currentTime;
      const duration = this.video.duration;

      // Show mid-roll every 10 minutes for long content
      if (duration > 600 && currentTime % 600 < 1 && !this.hasShownAdAt(currentTime)) {
        this.video.pause();

        const midRollAd = await getAd(videoId, category, tags);
        if (midRollAd) {
          await this.playAd(midRollAd);
        }

        this.video.play();
        this.markAdShownAt(currentTime);
      }
    });
  }

  showAdOverlay(ad) {
    // Create and show ad overlay UI
    const overlay = document.createElement('div');
    overlay.className = 'ad-overlay';
    overlay.innerHTML = `
      <div class="ad-content">
        <h3>${ad.title}</h3>
        <p>${ad.description}</p>
        ${ad.ctaLink ? `<button onclick="window.open('${ad.ctaLink}', '_blank')">Learn More</button>` : ''}
        <span class="ad-label">Advertisement</span>
      </div>
    `;

    this.video.parentElement.appendChild(overlay);

    // Track clicks on CTA
    if (ad.ctaLink) {
      overlay.querySelector('button').addEventListener('click', () => {
        confirmAdEvent(this.currentAd.impressionToken, 'clicked');
      });
    }
  }

  hideAdOverlay() {
    const overlay = this.video.parentElement.querySelector('.ad-overlay');
    if (overlay) {
      overlay.remove();
    }
  }
}
```

## 📊 **Event Tracking for Analytics**

### **Required Events to Track:**

1. **"served"** - Ad starts playing (triggers billing)
2. **"completed"** - Ad finishes or is dismissed
3. **"clicked"** - User clicks ad or CTA
4. **"skipped"** - User skips ad (if skip allowed)

### **Analytics Data Collection:**

```javascript
// Track detailed ad performance
async function trackAdPerformance(token, event, additionalData = {}) {
  const metadata = {
    // Standard tracking
    userAgent: navigator.userAgent,
    timestamp: new Date().toISOString(),

    // Video player data
    viewDuration: additionalData.viewDuration || 0,
    videoProgress: additionalData.videoProgress || 0,

    // User interaction data
    mouseX: additionalData.mouseX,
    mouseY: additionalData.mouseY,
    clickCount: additionalData.clickCount || 0,

    // Technical data
    connectionSpeed: navigator.connection?.effectiveType,
    deviceMemory: navigator.deviceMemory,
    screenResolution: `${screen.width}x${screen.height}`,

    // Video context
    videoQuality: additionalData.videoQuality,
    volumeLevel: additionalData.volumeLevel,
    fullscreenMode: additionalData.fullscreenMode || false,

    ...additionalData,
  };

  await confirmAdEvent(token, event, metadata);
}
```

## 🎯 **Advanced Integration Patterns**

### **A/B Testing Integration**

```javascript
// Test different ad placement strategies
async function getAdWithABTest(videoId, category, tags) {
  const userGroup = getUserABTestGroup();

  if (userGroup === 'control') {
    return null; // No ads for control group
  }

  return await getAd(videoId, category, tags);
}
```

### **Frequency Capping**

```javascript
// Limit ad exposure per user
async function getAdWithFrequencyControl(videoId, category, tags, userId) {
  const userAdCount = await getUserAdCountToday(userId);

  if (userAdCount >= MAX_ADS_PER_DAY) {
    return null;
  }

  return await getAd(videoId, category, tags, userId);
}
```

### **Revenue Optimization**

```javascript
// Prefer higher-value ads during peak hours
async function getOptimizedAd(videoId, category, tags) {
  const isPeakHour = isCurrentlyPeakHour();
  const adjustedCategory = isPeakHour ? 'premium-' + category : category;

  return await getAd(videoId, adjustedCategory, tags);
}
```

This integration guide provides comprehensive examples for implementing the ad serving APIs in various video streaming scenarios, from simple pre-roll ads to complex live streaming platforms.
