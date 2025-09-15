const express = require('express');
const router = express.Router();
const ModerationService = require('../services/ModerationService');
const MetaApiService = require('../services/MetaApiService');
const logger = require('../utils/logger');

// POST /api/moderation/sweep
// Body: { platform: 'facebook'|'instagram', parentId: string, accessToken: string, authorId?: string }
router.post('/sweep', async (req, res) => {
  try {
    const { platform, parentId, accessToken, authorId } = req.body;
    if (!platform || !parentId || !accessToken) {
      return res.status(400).json({ success: false, message: 'platform, parentId, accessToken required' });
    }

    // Fetch comments for the parent (post/media/comment) and delete replies not from author
    const results = [];

    if (platform === 'instagram') {
      const comments = await MetaApiService.getInstagramComments(parentId, accessToken);
      for (const c of comments?.data || []) {
        // First-level comments: sweep replies
        if (Array.isArray(c.replies?.data)) {
          for (const r of c.replies.data) {
            const outcome = await ModerationService.handleInstagramComment(r, accessToken, authorId);
            results.push(outcome);
          }
        }
      }
    } else if (platform === 'facebook') {
      const comments = await MetaApiService.getFacebookComments(parentId, accessToken);
      for (const c of comments?.data || []) {
        if (c.parent?.id) {
          const outcome = await ModerationService.handleFacebookComment(c, accessToken, authorId);
          results.push(outcome);
        }
      }
    } else {
      return res.status(400).json({ success: false, message: 'Unsupported platform' });
    }

    logger.meta('Sweep completed', { platform, parentId, summary: { total: results.length } });
    res.json({ success: true, data: results });
  } catch (error) {
    logger.error('Sweep failed', { error: error.message });
    res.status(500).json({ success: false, message: 'Sweep failed', error: error.message });
  }
});

module.exports = router;


