const cron = require('cron');
const Queue = require('bull');
const Redis = require('ioredis');
const User = require('../models/User');
const Comment = require('../models/Comment');
const MetaApiService = require('./MetaApiService');
const AnalysisService = require('./AnalysisService');
const NotificationService = require('./NotificationService');
const logger = require('../utils/logger');

class BotService {
  constructor() {
    this.isInitialized = false;
    this.activeJobs = new Map();
    this.redis = null;
    this.commentQueue = null;
    this.monitoringJob = null;
  }

  // Initialize the bot service
  async initialize() {
    try {
      // Initialize Redis connection
      this.redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        db: process.env.REDIS_DB || 0,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true
      });

      await this.redis.connect();
      logger.bot('Redis connected successfully');

      // Initialize Bull queue
      this.commentQueue = new Queue('comment processing', {
        redis: {
          host: process.env.REDIS_HOST || 'localhost',
          port: process.env.REDIS_PORT || 6379,
          password: process.env.REDIS_PASSWORD || undefined,
          db: process.env.REDIS_DB || 0
        }
      });

      // Setup queue processors
      this.setupQueueProcessors();

      // Setup monitoring cron job
      this.setupMonitoringJob();

      // Setup cleanup jobs
      this.setupCleanupJobs();

      this.isInitialized = true;
      logger.bot('Bot service initialized successfully');

    } catch (error) {
      logger.error('Failed to initialize bot service:', error);
      throw error;
    }
  }

  // Setup queue processors
  setupQueueProcessors() {
    // Process individual comments
    this.commentQueue.process('process-comment', 5, async (job) => {
      return this.processComment(job.data);
    });

    // Process user monitoring
    this.commentQueue.process('monitor-user', 3, async (job) => {
      return this.monitorUser(job.data);
    });

    // Process batch comment deletion
    this.commentQueue.process('batch-delete', 1, async (job) => {
      return this.batchDeleteComments(job.data);
    });

    // Queue event handlers
    this.commentQueue.on('completed', (job) => {
      logger.bot(`Job completed: ${job.id}`, { type: job.name });
    });

    this.commentQueue.on('failed', (job, err) => {
      logger.error(`Job failed: ${job.id}`, { type: job.name, error: err.message });
    });

    this.commentQueue.on('stalled', (job) => {
      logger.warn(`Job stalled: ${job.id}`, { type: job.name });
    });
  }

  // Setup monitoring cron job
  setupMonitoringJob() {
    const cronPattern = '*/5 * * * *'; // Every 5 minutes
    
    this.monitoringJob = new cron.CronJob(cronPattern, async () => {
      await this.runMonitoringCycle();
    }, null, false, 'UTC');

    this.monitoringJob.start();
    logger.bot('Monitoring cron job started', { pattern: cronPattern });
  }

  // Setup cleanup cron jobs
  setupCleanupJobs() {
    // Daily cleanup at 2 AM UTC
    const cleanupJob = new cron.CronJob('0 2 * * *', async () => {
      await this.runCleanupTasks();
    }, null, false, 'UTC');

    cleanupJob.start();
    logger.bot('Cleanup cron job started');
  }

  // Main monitoring cycle
  async runMonitoringCycle() {
    try {
      logger.bot('Starting monitoring cycle');

      // Get all active users with valid subscriptions
      const activeUsers = await User.find({
        'botSettings.isEnabled': true,
        'subscription.status': { $in: ['active', 'trialing'] },
        isActive: true
      }).select('_id email botSettings metaTokens subscription');

      logger.bot(`Found ${activeUsers.length} active users to monitor`);

      // Queue monitoring jobs for each user
      for (const user of activeUsers) {
        await this.commentQueue.add('monitor-user', {
          userId: user._id.toString(),
          settings: user.botSettings,
          tokens: user.metaTokens
        }, {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000
          },
          removeOnComplete: 10,
          removeOnFail: 5
        });
      }

      logger.bot('Monitoring cycle queued successfully');

    } catch (error) {
      logger.error('Error in monitoring cycle:', error);
    }
  }

  // Monitor individual user
  async monitorUser(data) {
    const { userId, settings, tokens } = data;
    
    try {
      logger.bot(`Monitoring user: ${userId}`);

      const results = {
        instagram: { processed: 0, deleted: 0, errors: 0 },
        facebook: { processed: 0, deleted: 0, errors: 0 }
      };

      // Monitor Instagram if enabled
      if (settings.monitorInstagram && tokens.instagramAccessToken) {
        try {
          const instagramResults = await this.monitorInstagram(userId, tokens, settings);
          results.instagram = instagramResults;
        } catch (error) {
          logger.error(`Instagram monitoring failed for user ${userId}:`, error);
          results.instagram.errors = 1;
        }
      }

      // Monitor Facebook if enabled
      if (settings.monitorFacebook && tokens.facebookAccessToken) {
        try {
          const facebookResults = await this.monitorFacebook(userId, tokens, settings);
          results.facebook = facebookResults;
        } catch (error) {
          logger.error(`Facebook monitoring failed for user ${userId}:`, error);
          results.facebook.errors = 1;
        }
      }

      // Update user usage statistics
      const user = await User.findById(userId);
      if (user) {
        const totalProcessed = results.instagram.processed + results.facebook.processed;
        const totalDeleted = results.instagram.deleted + results.facebook.deleted;
        await user.updateUsage(totalProcessed, totalDeleted, 1);
      }

      // Send notifications if enabled
      if (settings.notifyOnDeletion && (results.instagram.deleted > 0 || results.facebook.deleted > 0)) {
        await NotificationService.sendCommentDeletionNotification(userId, results);
      }

      logger.bot(`User monitoring completed: ${userId}`, results);
      return results;

    } catch (error) {
      logger.error(`Error monitoring user ${userId}:`, error);
      throw error;
    }
  }

  // Monitor Instagram for a user
  async monitorInstagram(userId, tokens, settings) {
    const results = { processed: 0, deleted: 0, errors: 0 };

    try {
      // Get recent Instagram media
      const mediaResponse = await MetaApiService.getInstagramMedia(
        tokens.instagramBusinessAccountId,
        tokens.instagramAccessToken,
        { limit: 10 } // Monitor last 10 posts
      );

      if (!mediaResponse.data) {
        return results;
      }

      // Process each media item
      for (const media of mediaResponse.data) {
        try {
          // Get comments for this media
          const commentsResponse = await MetaApiService.getInstagramComments(
            media.id,
            tokens.instagramAccessToken,
            { limit: 50 }
          );

          if (!commentsResponse.data) {
            continue;
          }

          // Process each comment
          for (const comment of commentsResponse.data) {
            results.processed++;

            // Check if comment should be processed
            const shouldProcess = await this.shouldProcessComment(
              comment,
              userId,
              'instagram',
              settings
            );

            if (shouldProcess) {
              // Queue comment for detailed processing
              await this.commentQueue.add('process-comment', {
                userId,
                platform: 'instagram',
                comment,
                media,
                settings,
                accessToken: tokens.instagramAccessToken
              });
            }
          }

        } catch (error) {
          logger.error(`Error processing Instagram media ${media.id}:`, error);
          results.errors++;
        }
      }

    } catch (error) {
      logger.error('Instagram monitoring error:', error);
      results.errors++;
      throw error;
    }

    return results;
  }

  // Monitor Facebook for a user
  async monitorFacebook(userId, tokens, settings) {
    const results = { processed: 0, deleted: 0, errors: 0 };

    try {
      // Get recent Facebook posts
      const postsResponse = await MetaApiService.getFacebookPosts(
        tokens.facebookPageId,
        tokens.facebookAccessToken,
        { limit: 10 } // Monitor last 10 posts
      );

      if (!postsResponse.data) {
        return results;
      }

      // Process each post
      for (const post of postsResponse.data) {
        try {
          // Get comments for this post
          const commentsResponse = await MetaApiService.getFacebookComments(
            post.id,
            tokens.facebookAccessToken,
            { limit: 50 }
          );

          if (!commentsResponse.data) {
            continue;
          }

          // Process each comment
          for (const comment of commentsResponse.data) {
            results.processed++;

            // Check if comment should be processed
            const shouldProcess = await this.shouldProcessComment(
              comment,
              userId,
              'facebook',
              settings
            );

            if (shouldProcess) {
              // Queue comment for detailed processing
              await this.commentQueue.add('process-comment', {
                userId,
                platform: 'facebook',
                comment,
                post,
                settings,
                accessToken: tokens.facebookAccessToken
              });
            }
          }

        } catch (error) {
          logger.error(`Error processing Facebook post ${post.id}:`, error);
          results.errors++;
        }
      }

    } catch (error) {
      logger.error('Facebook monitoring error:', error);
      results.errors++;
      throw error;
    }

    return results;
  }

  // Check if comment should be processed
  async shouldProcessComment(comment, userId, platform, settings) {
    try {
      // Check if comment already exists in database
      const existingComment = await Comment.findOne({
        commentId: comment.id,
        platform
      });

      if (existingComment) {
        return false; // Already processed
      }

      // Check if comment is from the account owner
      const user = await User.findById(userId);
      if (!user) return false;

      let isOwnerComment = false;
      if (platform === 'instagram') {
        isOwnerComment = comment.user?.id === user.metaTokens.instagramBusinessAccountId;
      } else if (platform === 'facebook') {
        isOwnerComment = comment.from?.id === user.metaTokens.facebookPageId;
      }

      // Don't process owner's own comments
      if (isOwnerComment) {
        return false;
      }

      // Check if author is whitelisted
      const authorId = platform === 'instagram' ? comment.user?.id : comment.from?.id;
      if (settings.whitelistedUsers.includes(authorId)) {
        return false;
      }

      return true;

    } catch (error) {
      logger.error('Error checking if comment should be processed:', error);
      return false;
    }
  }

  // Process individual comment
  async processComment(data) {
    const { userId, platform, comment, media, post, settings, accessToken } = data;

    try {
      logger.bot(`Processing comment: ${comment.id}`, { platform, userId });

      // Create comment record
      const commentData = this.buildCommentData(comment, userId, platform, media || post);
      const commentDoc = new Comment(commentData);

      // Run analysis on the comment
      const analysisResult = await AnalysisService.analyzeComment(commentDoc, settings);
      commentDoc.analysis = analysisResult;

      // Determine action based on settings and analysis
      let action = 'none';
      if (settings.deleteUnauthorizedComments && !analysisResult.isAuthorized) {
        action = 'delete';
      } else if (analysisResult.suspiciousScore > 80) {
        action = 'flag';
      }

      // Execute action
      let actionResult = { success: false, error: null };
      if (action === 'delete') {
        try {
          if (platform === 'instagram') {
            await MetaApiService.deleteInstagramComment(comment.id, accessToken);
          } else if (platform === 'facebook') {
            await MetaApiService.deleteFacebookComment(comment.id, accessToken);
          }
          
          actionResult.success = true;
          commentDoc.status = 'deleted';
          
          logger.bot(`Comment deleted successfully: ${comment.id}`, { platform, userId });

        } catch (error) {
          actionResult.error = error.message;
          commentDoc.status = 'flagged';
          logger.error(`Failed to delete comment ${comment.id}:`, error);
        }
      }

      // Update comment record
      commentDoc.action = {
        type: action,
        timestamp: new Date(),
        success: actionResult.success,
        error: actionResult.error
      };

      await commentDoc.save();

      // Emit real-time update
      const io = require('../server').app?.get('io');
      if (io) {
        io.to(`user-${userId}`).emit('comment-processed', {
          comment: commentDoc,
          action,
          success: actionResult.success
        });
      }

      return {
        commentId: comment.id,
        action,
        success: actionResult.success,
        suspiciousScore: analysisResult.suspiciousScore
      };

    } catch (error) {
      logger.error(`Error processing comment ${comment.id}:`, error);
      throw error;
    }
  }

  // Build comment data object
  buildCommentData(comment, userId, platform, mediaOrPost) {
    const baseData = {
      userId,
      platform,
      commentId: comment.id,
      commentText: platform === 'instagram' ? comment.text : comment.message,
      commentCreatedAt: new Date(comment.timestamp || comment.created_time),
      discoveredAt: new Date(),
      postId: mediaOrPost.id,
      postUrl: mediaOrPost.permalink || mediaOrPost.permalink_url
    };

    if (platform === 'instagram') {
      return {
        ...baseData,
        postType: mediaOrPost.media_type?.toLowerCase() || 'post',
        postCaption: mediaOrPost.caption,
        authorId: comment.user?.id,
        authorUsername: comment.user?.username,
        authorDisplayName: comment.username,
        likeCount: comment.like_count || 0,
        isReply: !!comment.parent_id,
        parentCommentId: comment.parent_id
      };
    } else if (platform === 'facebook') {
      return {
        ...baseData,
        postType: 'post',
        postCaption: mediaOrPost.message,
        authorId: comment.from?.id,
        authorDisplayName: comment.from?.name,
        authorProfilePicture: comment.from?.picture?.data?.url,
        likeCount: comment.like_count || 0,
        replyCount: comment.comment_count || 0,
        isReply: !!comment.parent?.id,
        parentCommentId: comment.parent?.id
      };
    }

    return baseData;
  }

  // Batch delete comments
  async batchDeleteComments(data) {
    const { userId, commentIds, accessToken, platform } = data;

    const results = {
      total: commentIds.length,
      deleted: 0,
      failed: 0,
      errors: []
    };

    try {
      for (const commentId of commentIds) {
        try {
          if (platform === 'instagram') {
            await MetaApiService.deleteInstagramComment(commentId, accessToken);
          } else if (platform === 'facebook') {
            await MetaApiService.deleteFacebookComment(commentId, accessToken);
          }

          // Update comment status
          await Comment.findOneAndUpdate(
            { commentId, platform },
            {
              status: 'deleted',
              'action.type': 'delete',
              'action.timestamp': new Date(),
              'action.success': true
            }
          );

          results.deleted++;
          logger.bot(`Batch deleted comment: ${commentId}`);

        } catch (error) {
          results.failed++;
          results.errors.push({
            commentId,
            error: error.message
          });

          // Update comment with error
          await Comment.findOneAndUpdate(
            { commentId, platform },
            {
              status: 'flagged',
              'action.type': 'delete',
              'action.timestamp': new Date(),
              'action.success': false,
              'action.error': error.message
            }
          );

          logger.error(`Failed to batch delete comment ${commentId}:`, error);
        }

        // Add delay between deletions to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      logger.bot(`Batch deletion completed for user ${userId}`, results);
      return results;

    } catch (error) {
      logger.error(`Batch deletion error for user ${userId}:`, error);
      throw error;
    }
  }

  // Run cleanup tasks
  async runCleanupTasks() {
    try {
      logger.bot('Starting cleanup tasks');

      // Clean up old processed comments (older than 90 days)
      const cleanupResult = await Comment.cleanup(90);
      logger.bot(`Cleaned up ${cleanupResult.deletedCount} old comments`);

      // Clean up expired refresh tokens
      await User.updateMany(
        {},
        {
          $pull: {
            refreshTokens: {
              expiresAt: { $lt: new Date() }
            }
          }
        }
      );

      // Clean up completed queue jobs
      await this.commentQueue.clean(24 * 60 * 60 * 1000, 'completed'); // 24 hours
      await this.commentQueue.clean(7 * 24 * 60 * 60 * 1000, 'failed'); // 7 days

      logger.bot('Cleanup tasks completed');

    } catch (error) {
      logger.error('Error in cleanup tasks:', error);
    }
  }

  // Start monitoring for a user
  async startMonitoring(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      if (!user.hasValidSubscription()) {
        throw new Error('Valid subscription required');
      }

      // Update user settings
      user.botSettings.isEnabled = true;
      await user.save();

      logger.bot(`Monitoring started for user: ${userId}`);
      return { success: true, message: 'Monitoring started successfully' };

    } catch (error) {
      logger.error(`Failed to start monitoring for user ${userId}:`, error);
      throw error;
    }
  }

  // Stop monitoring for a user
  async stopMonitoring(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Update user settings
      user.botSettings.isEnabled = false;
      await user.save();

      // Remove any pending jobs for this user
      const jobs = await this.commentQueue.getJobs(['waiting', 'delayed']);
      for (const job of jobs) {
        if (job.data.userId === userId) {
          await job.remove();
        }
      }

      logger.bot(`Monitoring stopped for user: ${userId}`);
      return { success: true, message: 'Monitoring stopped successfully' };

    } catch (error) {
      logger.error(`Failed to stop monitoring for user ${userId}:`, error);
      throw error;
    }
  }

  // Get monitoring status
  async getMonitoringStatus(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Get queue statistics
      const waiting = await this.commentQueue.getWaiting();
      const active = await this.commentQueue.getActive();
      const completed = await this.commentQueue.getCompleted();
      const failed = await this.commentQueue.getFailed();

      const userJobs = {
        waiting: waiting.filter(job => job.data.userId === userId).length,
        active: active.filter(job => job.data.userId === userId).length,
        completed: completed.filter(job => job.data.userId === userId).length,
        failed: failed.filter(job => job.data.userId === userId).length
      };

      return {
        isEnabled: user.botSettings.isEnabled,
        hasValidSubscription: user.hasValidSubscription(),
        lastBotRun: user.usage.lastBotRun,
        totalProcessed: user.usage.commentsProcessed,
        totalDeleted: user.usage.commentsDeleted,
        queueStats: userJobs,
        settings: user.botSettings
      };

    } catch (error) {
      logger.error(`Failed to get monitoring status for user ${userId}:`, error);
      throw error;
    }
  }

  // Get service health
  getHealth() {
    return {
      initialized: this.isInitialized,
      redis: this.redis?.status || 'disconnected',
      queue: {
        waiting: this.commentQueue?.getWaiting().length || 0,
        active: this.commentQueue?.getActive().length || 0,
        completed: this.commentQueue?.getCompleted().length || 0,
        failed: this.commentQueue?.getFailed().length || 0
      },
      monitoring: this.monitoringJob?.running || false
    };
  }
}

module.exports = new BotService();
