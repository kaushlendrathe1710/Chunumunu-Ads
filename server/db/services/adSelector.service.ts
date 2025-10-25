import { db } from '../connect';
import { ads, campaigns, adImpressions } from '../schema';
import { and, eq, gte, lte, or, isNull, sql } from 'drizzle-orm';
import {
  CandidateAd,
  ScoringResult,
  ServeAdRequest,
  ServeAdResponse,
} from '../../schemas/adSchemas';
import {
  COST_PER_VIEW_CENTS,
  SCORING_WEIGHTS,
  AD_SERVING_LIMITS,
  IMPRESSION_TTL_MINUTES,
} from '../../constants';
import { generateImpressionToken } from '../../utils/token';

export class AdSelectorService {
  /**
   * Fetch candidate ads that are eligible for serving
   * Enhanced to be more lenient and find the best available ads
   * Supports optional category and tags (at least one must be provided)
   */
  static async fetchCandidateAds(category?: string, tags?: string[]): Promise<CandidateAd[]> {
    const now = new Date().toISOString(); // Convert to ISO string for PostgreSQL

    // Build WHERE conditions based on what's provided
    const hasCategory = category && category.trim().length > 0;
    const hasTags = tags && tags.length > 0;

    // Build the match condition dynamically
    let matchCondition = sql`TRUE`;
    
    if (hasCategory && hasTags) {
      // Both provided - match either category or tags
      const tagsArray = `{${tags.map((tag) => `"${tag.replace(/"/g, '""')}"`).join(',')}}`;
      matchCondition = sql`(
        a.categories && ARRAY[${category}]::text[]
        OR a.tags && ${tagsArray}::text[]
      )`;
    } else if (hasCategory) {
      // Only category provided
      matchCondition = sql`a.categories && ARRAY[${category}]::text[]`;
    } else if (hasTags) {
      // Only tags provided
      const tagsArray = `{${tags.map((tag) => `"${tag.replace(/"/g, '""')}"`).join(',')}}`;
      matchCondition = sql`a.tags && ${tagsArray}::text[]`;
    }

    // First try to find ads with exact category/tag matches
    let result = await db.execute(sql`
      SELECT 
        a.id,
        a.title,
        a.description,
        a.categories,
        a.tags,
        a.cta_link as "ctaLink",
        a.video_url as "videoUrl",
        a.thumbnail_url as "thumbnailUrl",
        a.budget,
        a.spent,
        a.campaign_id as "campaignId",
        c.budget as "campaignBudget",
        c.spent as "campaignSpent"
      FROM ads a
      INNER JOIN campaigns c ON a.campaign_id = c.id
      WHERE a.status = 'active'
        AND c.status = 'active'
        AND (c.start_date IS NULL OR c.start_date <= ${now})
        AND (c.end_date IS NULL OR c.end_date >= ${now})
        AND ${matchCondition}
      ORDER BY RANDOM()
      LIMIT ${AD_SERVING_LIMITS.MAX_CANDIDATES}
    `);

    // If no exact matches found, get ALL available ads and let scoring decide
    if (result.length === 0) {
      console.log('No exact matches found, fetching all available ads for scoring...');
      result = await db.execute(sql`
        SELECT 
          a.id,
          a.title,
          a.description,
          a.categories,
          a.tags,
          a.cta_link as "ctaLink",
          a.video_url as "videoUrl",
          a.thumbnail_url as "thumbnailUrl",
          a.budget,
          a.spent,
          a.campaign_id as "campaignId",
          c.budget as "campaignBudget",
          c.spent as "campaignSpent"
        FROM ads a
        INNER JOIN campaigns c ON a.campaign_id = c.id
        WHERE a.status = 'active'
          AND c.status = 'active'
          AND (c.start_date IS NULL OR c.start_date <= ${now})
          AND (c.end_date IS NULL OR c.end_date >= ${now})
        ORDER BY RANDOM()
        LIMIT ${AD_SERVING_LIMITS.MAX_CANDIDATES}
      `);
    }

    const candidateAds = result;

    console.log(`Found ${candidateAds.length} candidate ads (category: ${category || 'none'}, tags: ${tags?.join(',') || 'none'})`);

    return candidateAds.map((ad: any) => ({
      ...ad,
      spent: ad.spent || '0',
      campaignSpent: ad.campaignSpent || '0',
    }));
  }

  /**
   * Check if an ad has sufficient budget
   */
  static hasAdSufficientBudget(ad: CandidateAd, costCents: number): boolean {
    // If ad budget is -1, fall back to campaign budget
    let availableBudget: number;

    if (ad.budget === null || ad.budget === '-1') {
      // Use campaign budget
      if (ad.campaignBudget === null) {
        return false; // No budget set
      }
      const campaignBudgetCents = Math.floor(parseFloat(ad.campaignBudget) * 100);
      const campaignSpentCents = Math.floor(parseFloat(ad.campaignSpent) * 100);
      availableBudget = campaignBudgetCents - campaignSpentCents;
    } else {
      // Use ad-specific budget
      const adBudgetCents = Math.floor(parseFloat(ad.budget) * 100);
      const adSpentCents = Math.floor(parseFloat(ad.spent) * 100);
      availableBudget = adBudgetCents - adSpentCents;
    }

    return availableBudget >= costCents;
  }

  /**
   * Calculate tag overlap score between video tags and ad tags
   * Returns 0 if no tags provided
   */
  static calculateTagOverlap(videoTags: string[] | undefined, adTags: string[]): number {
    if (!videoTags || videoTags.length === 0 || adTags.length === 0) {
      return 0;
    }

    const videoTagsSet = new Set(videoTags.map((tag) => tag.toLowerCase()));
    const adTagsSet = new Set(adTags.map((tag) => tag.toLowerCase()));

    const intersection = Array.from(videoTagsSet).filter((tag) => adTagsSet.has(tag));
    const union = new Set([...Array.from(videoTagsSet), ...Array.from(adTagsSet)]);

    // Jaccard similarity
    return intersection.length / union.size;
  }

  /**
   * Calculate category match score
   * Returns 0 if no category provided
   */
  static calculateCategoryMatch(videoCategory: string | undefined, adCategories: string[]): number {
    if (!videoCategory || !videoCategory.trim()) {
      return 0;
    }

    const videoCategoryLower = videoCategory.toLowerCase();
    const adCategoriesLower = adCategories.map((cat) => cat.toLowerCase());

    // Direct match gets full score
    if (adCategoriesLower.includes(videoCategoryLower)) {
      return 1.0;
    }

    // Partial match could be implemented here (e.g., category hierarchies)
    // For now, no match = 0
    return 0;
  }

  /**
   * Calculate budget factor (higher remaining budget = higher score)
   */
  static calculateBudgetFactor(ad: CandidateAd): number {
    let totalBudgetCents: number;
    let totalSpentCents: number;

    if (ad.budget === null || ad.budget === '-1') {
      // Use campaign budget
      if (ad.campaignBudget === null) {
        return 0; // No budget = no score
      }
      totalBudgetCents = Math.floor(parseFloat(ad.campaignBudget) * 100);
      totalSpentCents = Math.floor(parseFloat(ad.campaignSpent) * 100);
    } else {
      // Use ad-specific budget
      totalBudgetCents = Math.floor(parseFloat(ad.budget) * 100);
      totalSpentCents = Math.floor(parseFloat(ad.spent) * 100);
    }

    if (totalBudgetCents <= 0) {
      return 0;
    }

    const remainingRatio = Math.max(0, (totalBudgetCents - totalSpentCents) / totalBudgetCents);
    return remainingRatio;
  }

  /**
   * Calculate bid amount factor (placeholder for future bidding functionality)
   */
  static calculateBidAmount(_ad: CandidateAd): number {
    // For now, return a neutral score since bidding is not implemented
    return 0.5;
  }

  /**
   * Score a single ad candidate
   * Handles optional category and tags
   */
  static scoreAd(ad: CandidateAd, videoCategory?: string, videoTags?: string[]): ScoringResult {
    const tagOverlap = this.calculateTagOverlap(videoTags, ad.tags);
    const categoryMatch = this.calculateCategoryMatch(videoCategory, ad.categories);
    const budgetFactor = this.calculateBudgetFactor(ad);
    const bidAmount = this.calculateBidAmount(ad);

    // Adjust weights dynamically based on what's provided
    const hasCategory = videoCategory && videoCategory.trim().length > 0;
    const hasTags = videoTags && videoTags.length > 0;

    let score = 0;
    
    if (hasCategory && hasTags) {
      // Both provided - use standard weights
      score =
        tagOverlap * SCORING_WEIGHTS.TAG_OVERLAP +
        categoryMatch * SCORING_WEIGHTS.CATEGORY_MATCH +
        budgetFactor * SCORING_WEIGHTS.BUDGET_FACTOR +
        bidAmount * SCORING_WEIGHTS.BID_AMOUNT;
    } else if (hasCategory) {
      // Only category - give it more weight
      const categoryWeight = SCORING_WEIGHTS.CATEGORY_MATCH + SCORING_WEIGHTS.TAG_OVERLAP;
      score =
        categoryMatch * categoryWeight +
        budgetFactor * SCORING_WEIGHTS.BUDGET_FACTOR +
        bidAmount * SCORING_WEIGHTS.BID_AMOUNT;
    } else if (hasTags) {
      // Only tags - give them more weight
      const tagsWeight = SCORING_WEIGHTS.TAG_OVERLAP + SCORING_WEIGHTS.CATEGORY_MATCH;
      score =
        tagOverlap * tagsWeight +
        budgetFactor * SCORING_WEIGHTS.BUDGET_FACTOR +
        bidAmount * SCORING_WEIGHTS.BID_AMOUNT;
    }

    return {
      adId: ad.id,
      score,
      factors: {
        tagOverlap,
        categoryMatch,
        budgetFactor,
        bidAmount,
      },
    };
  }

  /**
   * Select the best ad from candidates
   */
  static selectBestAd(
    candidates: CandidateAd[],
    scoringResults: ScoringResult[]
  ): CandidateAd | null {
    if (candidates.length === 0 || scoringResults.length === 0) {
      return null;
    }

    // Filter out ads with insufficient scores
    const eligibleResults = scoringResults.filter(
      (result) => result.score >= AD_SERVING_LIMITS.MIN_SCORE
    );

    if (eligibleResults.length === 0) {
      return null;
    }

    // Sort by score (highest first)
    eligibleResults.sort((a, b) => b.score - a.score);

    // If there's a tie at the top, add some randomness for fairness
    const topScore = eligibleResults[0].score;
    const topCandidates = eligibleResults.filter((result) => result.score === topScore);

    const selectedResult = topCandidates[Math.floor(Math.random() * topCandidates.length)];

    return candidates.find((ad) => ad.id === selectedResult.adId) || null;
  }

  /**
   * Create an impression record with database transaction safety
   */
  static async createImpressionRecord(data: {
    token: string;
    adId: number;
    campaignId: number;
    userId?: string;
    anonId?: string;
    sessionId?: string;
    videoId: string;
    category?: string;
    tags?: string[];
    costCents: number;
    expiresAt: Date;
    userAgent?: string;
    ipAddress?: string;
    deviceInfo?: { os: string; deviceType: string };
  }) {
    return await db.transaction(async (tx) => {
      // Double-check ad eligibility within transaction
      const [adCheck] = await tx
        .select({
          id: ads.id,
          budget: ads.budget,
          spent: ads.spent,
          campaignBudget: campaigns.budget,
          campaignSpent: campaigns.spent,
          status: ads.status,
          campaignStatus: campaigns.status,
        })
        .from(ads)
        .innerJoin(campaigns, eq(ads.campaignId, campaigns.id))
        .where(eq(ads.id, data.adId))
        .for('update'); // Lock the row to prevent concurrent modifications

      if (!adCheck) {
        throw new Error('Ad not found');
      }

      if (adCheck.status !== 'active' || adCheck.campaignStatus !== 'active') {
        throw new Error('Ad or campaign is not active');
      }

      // Check budget again within transaction
      const candidateAd: CandidateAd = {
        id: adCheck.id,
        budget: adCheck.budget,
        spent: adCheck.spent || '0',
        campaignBudget: adCheck.campaignBudget,
        campaignSpent: adCheck.campaignSpent || '0',
        // These fields are not needed for budget check
        title: '',
        description: null,
        categories: [],
        tags: [],
        ctaLink: null,
        videoUrl: '',
        thumbnailUrl: '',
        campaignId: data.campaignId,
      };

      if (!this.hasAdSufficientBudget(candidateAd, data.costCents)) {
        throw new Error('Insufficient budget');
      }

      // Create the impression record
      const [impression] = await tx
        .insert(adImpressions)
        .values({
          token: data.token,
          adId: data.adId,
          campaignId: data.campaignId,
          viewerId: data.userId, // Store authenticated user ID in viewerId
          anonId: data.anonId, // Store anonymous ID in anonId
          sessionId: data.sessionId,
          videoId: data.videoId,
          category: data.category || null, // Optional category
          tags: data.tags || [], // Optional tags
          costCents: data.costCents,
          expiresAt: data.expiresAt,
          userAgent: data.userAgent,
          ipAddress: data.ipAddress,
          osType: (data.deviceInfo?.os as any) || 'unknown',
          deviceType: (data.deviceInfo?.deviceType as any) || 'unknown',
          status: 'reserved', // Initial status when ad is served
          action: 'view', // Default action for served impressions
          servedAt: new Date(), // Mark when the ad was served
        })
        .returning();

      return impression;
    });
  }

  /**
   * Get impression by token
   */
  static async getImpressionByToken(token: string) {
    const [impression] = await db
      .select()
      .from(adImpressions)
      .where(eq(adImpressions.token, token))
      .limit(1);

    return impression;
  }

  /**
   * Main function to serve an ad based on the request
   */
  static async serveAd(
    request: ServeAdRequest,
    userAgent?: string,
    ipAddress?: string,
    deviceInfo?: { os: string; deviceType: string }
  ): Promise<ServeAdResponse | { reason: 'no_eligible_ads' }> {
    try {
      // 1. Fetch candidate ads
      const candidates = await this.fetchCandidateAds(request.category, request.tags);

      if (candidates.length === 0) {
        return { reason: 'no_eligible_ads' };
      }

      // 2. Filter candidates by budget
      const budgetEligibleCandidates = candidates.filter((ad) =>
        this.hasAdSufficientBudget(ad, COST_PER_VIEW_CENTS)
      );

      if (budgetEligibleCandidates.length === 0) {
        return { reason: 'no_eligible_ads' };
      }

      // 3. Score all eligible candidates
      const scoringResults = budgetEligibleCandidates.map((ad) =>
        this.scoreAd(ad, request.category, request.tags)
      );

      // 4. Select the best ad
      const selectedAd = this.selectBestAd(budgetEligibleCandidates, scoringResults);

      if (!selectedAd) {
        return { reason: 'no_eligible_ads' };
      }

      // 5. Generate impression token and expiration
      const expiresAt = new Date(Date.now() + IMPRESSION_TTL_MINUTES * 60 * 1000);
      const token = generateImpressionToken(0, expiresAt); // Will be updated with actual impression ID

      // 6. Create impression record in database transaction
      const impression = await this.createImpressionRecord({
        token,
        adId: selectedAd.id,
        campaignId: selectedAd.campaignId,
        userId: request.user_id, // Authenticated user ID
        anonId: request.anon_id, // Anonymous user ID
        sessionId: request.sessionId,
        videoId: request.videoId,
        category: request.category,
        tags: request.tags,
        costCents: COST_PER_VIEW_CENTS,
        expiresAt,
        userAgent,
        ipAddress,
        deviceInfo,
      });

      // 7. Generate final token with actual impression ID
      const finalToken = generateImpressionToken(impression.id, expiresAt);

      // Update the impression record with the final token
      await db
        .update(adImpressions)
        .set({ token: finalToken })
        .where(eq(adImpressions.id, impression.id));

      // 8. Return ad metadata and impression details
      return {
        ad: {
          id: selectedAd.id,
          title: selectedAd.title,
          description: selectedAd.description,
          videoUrl: selectedAd.videoUrl,
          thumbnailUrl: selectedAd.thumbnailUrl,
          categories: selectedAd.categories,
          tags: selectedAd.tags,
          ctaLink: selectedAd.ctaLink,
        },
        impressionToken: finalToken,
        costCents: COST_PER_VIEW_CENTS,
        expiresAt: expiresAt.toISOString(),
      };
    } catch (error) {
      console.error('Error serving ad:', error);
      return { reason: 'no_eligible_ads' };
    }
  }

  /**
   * Confirm an impression and handle billing
   * Handles all event types: served, clicked, completed, skipped
   * Only 'served' events trigger billing, others are just tracked
   */
  static async confirmImpression(
    token: string,
    event: 'served' | 'clicked' | 'completed' | 'skipped',
    metadata?: {
      userAgent?: string;
      ipAddress?: string;
      viewDuration?: number;
      videoProgress?: number;
      os?: string;
      deviceType?: string;
      user_id?: string; // Optional user identification
      anon_id?: string; // Optional anonymous identification
    }
  ) {
    const impression = await this.getImpressionByToken(token);
    if (!impression) {
      throw new Error('Impression not found');
    }

    // Check if impression has expired
    if (
      impression.status === 'expired' ||
      (impression.expiresAt && impression.expiresAt < new Date())
    ) {
      throw new Error('Impression has expired');
    }

    // Validate event transitions
    const currentStatus = impression.status || 'pending';
    if (!this.isValidEventTransition(currentStatus, event)) {
      throw new Error(`Invalid event transition from ${currentStatus} to ${event}`);
    }

    // Process the impression event
    if (event === 'served') {
      // Only 'served' events trigger billing
      const billingSuccess = await this.processBillingForServedImpression(impression, metadata);
      if (!billingSuccess) {
        throw new Error('Billing processing failed - transaction did not complete successfully');
      }
    } else {
      // For other events (clicked, completed, skipped), just update tracking
      await this.updateImpressionEvent(impression, event, metadata);
    }

    return impression;
  }

  /**
   * Process billing for served impression with proper budget management
   * Returns true if billing was successfully processed and creator revenue was credited
   * Returns false if billing failed or creator revenue crediting failed
   */
  private static async processBillingForServedImpression(
    impression: any,
    metadata?: {
      userAgent?: string;
      ipAddress?: string;
      viewDuration?: number;
      videoProgress?: number;
      os?: string;
      deviceType?: string;
      user_id?: string;
      anon_id?: string;
    }
  ): Promise<boolean> {
    try {
      await db.transaction(async (tx) => {
        // Get ad and campaign for budget deduction
        const [adData] = await tx
          .select({
            adId: ads.id,
            adBudget: ads.budget,
            adSpent: ads.spent,
            campaignId: campaigns.id,
            campaignBudget: campaigns.budget,
            campaignSpent: campaigns.spent,
            teamId: campaigns.teamId,
          })
          .from(ads)
          .innerJoin(campaigns, eq(ads.campaignId, campaigns.id))
          .where(eq(ads.id, impression.adId))
          .for('update'); // Lock for concurrent safety

        if (!adData) {
          throw new Error('Ad or campaign not found');
        }

        const costDollars = (impression.costCents || 0) / 100;

        // Determine budget source based on ad budget setting
        // If ad budget is -1 or null/undefined, use campaign budget
        // Otherwise, use ad-specific budget
        const useAdBudget = adData.adBudget && adData.adBudget !== '-1' && adData.adBudget !== '0';
        
        if (useAdBudget) {
          // Deduct from ad-specific budget
          const currentAdSpent = parseFloat(adData.adSpent || '0');
          const adBudgetLimit = parseFloat(adData.adBudget || '0');
          
          // Check if ad budget would be exceeded
          if (currentAdSpent + costDollars > adBudgetLimit) {
            throw new Error('Ad budget would be exceeded');
          }
          
          await tx
            .update(ads)
            .set({
              spent: sql`${ads.spent} + ${costDollars}`,
              updatedAt: new Date(),
            })
            .where(eq(ads.id, impression.adId));
        } else {
          // Deduct from campaign budget
          const currentCampaignSpent = parseFloat(adData.campaignSpent || '0');
          const campaignBudgetLimit = parseFloat(adData.campaignBudget || '0');
          
          // Check if campaign budget would be exceeded
          if (campaignBudgetLimit > 0 && currentCampaignSpent + costDollars > campaignBudgetLimit) {
            throw new Error('Campaign budget would be exceeded');
          }
          
          await tx
            .update(campaigns)
            .set({
              spent: sql`${campaigns.spent} + ${costDollars}`,
              updatedAt: new Date(),
            })
            .where(eq(campaigns.id, impression.campaignId));
        }

        // Update impression status to 'served' with metadata
        // If user identification is provided, update the impression record
        const updateData: any = {
          status: 'served',
          action: 'view',
          userAgent: metadata?.userAgent,
          ipAddress: metadata?.ipAddress,
          osType: (metadata?.os as any) || null,
          deviceType: (metadata?.deviceType as any) || null,
          viewDuration: metadata?.viewDuration,
          videoProgress: metadata?.videoProgress?.toString(),
          confirmedAt: new Date(),
          updatedAt: new Date(),
        };

        // Update user identification if provided (for user session bridging)
        if (metadata?.user_id) {
          updateData.viewerId = metadata.user_id;
          updateData.anonId = null; // Clear anon_id if user becomes authenticated
        } else if (metadata?.anon_id && !impression.viewerId) {
          // Only update anon_id if no authenticated user is already associated
          updateData.anonId = metadata.anon_id;
        }

        await tx
          .update(adImpressions)
          .set(updateData)
          .where(eq(adImpressions.token, impression.token));
      });

      // After successful billing, credit the creator revenue
      // This happens outside the transaction to avoid blocking the impression confirmation
      await this.creditCreatorRevenue(impression);

      // Transaction completed successfully and creator revenue was processed
      return true;
    } catch (error) {
      // Log the billing error and return false
      console.error(
        `[BILLING ERROR] Failed to process billing for impression ${impression.id}:`,
        error instanceof Error ? error.message : String(error)
      );
      return false;
    }
  }

  /**
   * Credit creator revenue by notifying VideoStreamPro for monetization
   * Called after billing has been successfully processed for an ad impression
   */
  private static async creditCreatorRevenue(
    impression: any
  ): Promise<void> {
    // Only credit if we have all required data
    if (!impression.videoId || !impression.costCents) {
      console.log(
        `[MONETIZATION] Skipping creator revenue credit - missing data. VideoId: ${impression.videoId || 'missing'}, CostCents: ${impression.costCents || 'missing'}`
      );
      return;
    }

    try {
      // Import dynamically to avoid circular dependencies
      const { VideoStreamProService } = await import('../../services/videostreampro.service');

      console.log(
        `[MONETIZATION] Crediting creator revenue for video ${impression.videoId} - notifying VideoStreamPro (adId: ${impression.adId}, cost: ${impression.costCents} cents)`
      );

      // Notify VideoStreamPro about ad serving (fire and forget, don't block response)
      const response = await VideoStreamProService.notifyAdConfirmation({
        videoId: impression.videoId,
        viewerId: impression.viewerId || undefined,
        adId: impression.adId,
        costCents: impression.costCents,
      });

      if (response.success) {
        console.log(
          `[MONETIZATION] Successfully credited creator revenue - monetization enabled: ${response.monetizationEnabled}`
        );
        if (response.data) {
          console.log(
            `[MONETIZATION] Creator earned ${response.data.amountCents} cents (${response.data.revenueShare * 100}% of ${response.data.adCostCents} cents)`
          );
        }
      } else {
        console.log(
          `[MONETIZATION] Creator revenue credit failed: ${response.message}`
        );
      }
    } catch (error) {
      // Log but don't fail the request
      console.error(
        `[MONETIZATION] Error crediting creator revenue:`,
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Update impression for non-billing events (clicked, completed, skipped)
   */
  private static async updateImpressionEvent(
    impression: any,
    event: 'clicked' | 'completed' | 'skipped',
    metadata?: {
      userAgent?: string;
      ipAddress?: string;
      viewDuration?: number;
      videoProgress?: number;
      os?: string;
      deviceType?: string;
      user_id?: string;
      anon_id?: string;
    }
  ) {
    const actionMap = {
      clicked: 'click',
      completed: 'complete',
      skipped: 'skip',
    };

    const updateData: any = {
      status: 'confirmed',
      action: actionMap[event] as any,
      userAgent: metadata?.userAgent,
      ipAddress: metadata?.ipAddress,
      osType: (metadata?.os as any) || null,
      deviceType: (metadata?.deviceType as any) || null,
      viewDuration: metadata?.viewDuration,
      videoProgress: metadata?.videoProgress?.toString(),
      confirmedAt: new Date(),
      updatedAt: new Date(),
    };

    // Update user identification if provided (for user session bridging)
    if (metadata?.user_id) {
      updateData.viewerId = metadata.user_id;
      updateData.anonId = null; // Clear anon_id if user becomes authenticated
    } else if (metadata?.anon_id && !impression.viewerId) {
      // Only update anon_id if no authenticated user is already associated
      updateData.anonId = metadata.anon_id;
    }

    await db
      .update(adImpressions)
      .set(updateData)
      .where(eq(adImpressions.token, impression.token));
  }

  /**
   * Check if event transition is valid
   */
  private static isValidEventTransition(currentStatus: string, event: string): boolean {
    switch (currentStatus) {
      case 'reserved':
        return event === 'served';
      case 'served':
        return ['clicked', 'completed', 'skipped'].includes(event);
      case 'confirmed':
        return false; // No further transitions allowed
      case 'expired':
      case 'cancelled':
        return false; // No transitions from terminal states
      default:
        return event === 'served'; // Default case
    }
  }

  /**
   * Get scoring weights for external use or debugging
   */
  static getScoringWeights() {
    return SCORING_WEIGHTS;
  }

  /**
   * Debug function to get detailed scoring for all candidates
   */
  static async debugAdScoring(
    request: ServeAdRequest
  ): Promise<Array<{ ad: CandidateAd; scoring: ScoringResult }>> {
    const candidates = await this.fetchCandidateAds(request.category, request.tags);

    return candidates
      .filter((ad) => this.hasAdSufficientBudget(ad, COST_PER_VIEW_CENTS))
      .map((ad) => ({
        ad,
        scoring: this.scoreAd(ad, request.category, request.tags),
      }))
      .sort((a, b) => b.scoring.score - a.scoring.score);
  }
}
