const MetaApiService = require('./MetaApiService');
const logger = require('../utils/logger');

class ModerationService {
  constructor() {
    this.pageAuthorIds = {
      facebookPageId: process.env.FACEBOOK_PAGE_ID || '',
      instagramBusinessAccountId: process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID || ''
    };
  }

  isReply(changeValue) {
    // For IG: replies appear under comments/replies; for FB: parent.id present indicates reply
    return !!(changeValue?.parent_id || changeValue?.parent?.id);
  }

  isFromAuthorPlatform(changeValue, platform, overrideAuthorId) {
    if (platform === 'facebook') {
      const authorId = changeValue?.from?.id || changeValue?.from_id || changeValue?.sender_id;
      const expected = overrideAuthorId || this.pageAuthorIds.facebookPageId;
      return !!expected && authorId === expected;
    }
    if (platform === 'instagram') {
      const userId = changeValue?.from?.id || changeValue?.user_id || changeValue?.user?.id;
      const expected = overrideAuthorId || this.pageAuthorIds.instagramBusinessAccountId;
      return !!expected && userId === expected;
    }
    return false;
  }

  async handleInstagramComment(changeValue, accessToken, authorId) {
    try {
      if (!this.isReply(changeValue)) return { skipped: true, reason: 'not_a_reply' };
      if (this.isFromAuthorPlatform(changeValue, 'instagram', authorId)) return { skipped: true, reason: 'author_reply' };

      const commentId = changeValue?.id || changeValue?.comment_id;
      if (!commentId) return { skipped: true, reason: 'no_comment_id' };

      await MetaApiService.deleteInstagramComment(commentId, accessToken);
      logger.meta('Deleted Instagram reply comment', { commentId });
      return { deleted: true, platform: 'instagram', commentId };
    } catch (error) {
      logger.error('Failed to delete Instagram comment reply', { error: error.message });
      return { error: true, message: error.message };
    }
  }

  async handleFacebookComment(changeValue, accessToken, authorId) {
    try {
      if (!this.isReply(changeValue)) return { skipped: true, reason: 'not_a_reply' };
      if (this.isFromAuthorPlatform(changeValue, 'facebook', authorId)) return { skipped: true, reason: 'author_reply' };

      const commentId = changeValue?.comment_id || changeValue?.id;
      if (!commentId) return { skipped: true, reason: 'no_comment_id' };

      await MetaApiService.deleteFacebookComment(commentId, accessToken);
      logger.meta('Deleted Facebook reply comment', { commentId });
      return { deleted: true, platform: 'facebook', commentId };
    } catch (error) {
      logger.error('Failed to delete Facebook comment reply', { error: error.message });
      return { error: true, message: error.message };
    }
  }
}

module.exports = new ModerationService();


