const axios = require('axios');
const logger = require('../utils/logger');

class MetaApiService {
  constructor() {
    this.baseURL = `https://graph.facebook.com/${process.env.META_API_VERSION || 'v18.0'}`;
    this.appId = process.env.META_APP_ID;
    this.appSecret = process.env.META_APP_SECRET;
    
    // Rate limiting
    this.rateLimitDelay = parseInt(process.env.BOT_RATE_LIMIT_DELAY_MS) || 1000;
    this.lastRequestTime = 0;
    
    // Request retry configuration
    this.maxRetries = 3;
    this.retryDelay = 2000;
  }

  // Rate limiting helper
  async waitForRateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.rateLimitDelay) {
      const waitTime = this.rateLimitDelay - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastRequestTime = Date.now();
  }

  // Generic API request with error handling and retries
  async makeRequest(endpoint, options = {}, retryCount = 0) {
    await this.waitForRateLimit();

    try {
      const config = {
        method: options.method || 'GET',
        url: `${this.baseURL}${endpoint}`,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        timeout: 30000,
        ...options
      };

      logger.meta(`Making request to: ${config.url}`, {
        method: config.method,
        endpoint
      });

      const response = await axios(config);
      
      logger.meta('Meta API request successful', {
        endpoint,
        status: response.status,
        dataSize: JSON.stringify(response.data).length
      });

      return response.data;
    } catch (error) {
      logger.error('Meta API request failed', {
        endpoint,
        error: error.message,
        status: error.response?.status,
        data: error.response?.data,
        retryCount
      });

      // Handle rate limiting
      if (error.response?.status === 429 || 
          (error.response?.data?.error?.code === 4)) {
        if (retryCount < this.maxRetries) {
          const backoffDelay = this.retryDelay * Math.pow(2, retryCount);
          logger.meta(`Rate limited, retrying in ${backoffDelay}ms`, { retryCount });
          
          await new Promise(resolve => setTimeout(resolve, backoffDelay));
          return this.makeRequest(endpoint, options, retryCount + 1);
        }
      }

      // Handle temporary errors
      if (error.response?.status >= 500 && retryCount < this.maxRetries) {
        const backoffDelay = this.retryDelay * Math.pow(2, retryCount);
        logger.meta(`Server error, retrying in ${backoffDelay}ms`, { retryCount });
        
        await new Promise(resolve => setTimeout(resolve, backoffDelay));
        return this.makeRequest(endpoint, options, retryCount + 1);
      }

      throw error;
    }
  }

  // Instagram API Methods

  // Get Instagram Business Account info
  async getInstagramAccount(accessToken) {
    const endpoint = `/me/accounts`;
    const params = {
      access_token: accessToken,
      fields: 'instagram_business_account{id,username,name,profile_picture_url,followers_count,media_count}'
    };

    return this.makeRequest(endpoint, { params });
  }

  // Get Instagram media (posts/reels)
  async getInstagramMedia(businessAccountId, accessToken, options = {}) {
    const endpoint = `/${businessAccountId}/media`;
    const params = {
      access_token: accessToken,
      fields: 'id,media_type,media_url,permalink,caption,timestamp,comments_count,like_count',
      limit: options.limit || 25,
      ...options.params
    };

    return this.makeRequest(endpoint, { params });
  }

  // Get comments for Instagram media
  async getInstagramComments(mediaId, accessToken, options = {}) {
    const endpoint = `/${mediaId}/comments`;
    const params = {
      access_token: accessToken,
      fields: 'id,text,timestamp,username,user{id,username,profile_picture_url},like_count,replies{id,text,timestamp,username,user{id,username}}',
      limit: options.limit || 50,
      ...options.params
    };

    return this.makeRequest(endpoint, { params });
  }

  // Delete Instagram comment
  async deleteInstagramComment(commentId, accessToken) {
    const endpoint = `/${commentId}`;
    const options = {
      method: 'DELETE',
      params: {
        access_token: accessToken
      }
    };

    return this.makeRequest(endpoint, options);
  }

  // Hide Instagram comment
  async hideInstagramComment(commentId, accessToken, hide = true) {
    const endpoint = `/${commentId}`;
    const options = {
      method: 'POST',
      data: {
        hide: hide
      },
      params: {
        access_token: accessToken
      }
    };

    return this.makeRequest(endpoint, options);
  }

  // Facebook API Methods

  // Get Facebook Page info
  async getFacebookPage(pageId, accessToken) {
    const endpoint = `/${pageId}`;
    const params = {
      access_token: accessToken,
      fields: 'id,name,username,picture,fan_count,posts{id,message,created_time,comments_count,reactions.summary(true)}'
    };

    return this.makeRequest(endpoint, { params });
  }

  // Get Facebook posts
  async getFacebookPosts(pageId, accessToken, options = {}) {
    const endpoint = `/${pageId}/posts`;
    const params = {
      access_token: accessToken,
      fields: 'id,message,created_time,permalink_url,comments_count,reactions.summary(true),attachments',
      limit: options.limit || 25,
      ...options.params
    };

    return this.makeRequest(endpoint, { params });
  }

  // Get comments for Facebook post
  async getFacebookComments(postId, accessToken, options = {}) {
    const endpoint = `/${postId}/comments`;
    const params = {
      access_token: accessToken,
      fields: 'id,message,created_time,from{id,name,picture},like_count,comment_count,parent{id}',
      limit: options.limit || 50,
      order: 'reverse_chronological',
      ...options.params
    };

    return this.makeRequest(endpoint, { params });
  }

  // Delete Facebook comment
  async deleteFacebookComment(commentId, accessToken) {
    const endpoint = `/${commentId}`;
    const options = {
      method: 'DELETE',
      params: {
        access_token: accessToken
      }
    };

    return this.makeRequest(endpoint, options);
  }

  // Hide Facebook comment
  async hideFacebookComment(commentId, accessToken, isHidden = true) {
    const endpoint = `/${commentId}`;
    const options = {
      method: 'POST',
      data: {
        is_hidden: isHidden
      },
      params: {
        access_token: accessToken
      }
    };

    return this.makeRequest(endpoint, options);
  }

  // Token Management

  // Exchange short-lived token for long-lived token
  async getLongLivedToken(shortLivedToken) {
    const endpoint = '/oauth/access_token';
    const params = {
      grant_type: 'fb_exchange_token',
      client_id: this.appId,
      client_secret: this.appSecret,
      fb_exchange_token: shortLivedToken
    };

    return this.makeRequest(endpoint, { params });
  }

  // Refresh long-lived token
  async refreshToken(accessToken) {
    const endpoint = '/oauth/access_token';
    const params = {
      grant_type: 'fb_exchange_token',
      client_id: this.appId,
      client_secret: this.appSecret,
      fb_exchange_token: accessToken
    };

    return this.makeRequest(endpoint, { params });
  }

  // Validate token
  async validateToken(accessToken) {
    const endpoint = '/me';
    const params = {
      access_token: accessToken,
      fields: 'id,name'
    };

    try {
      const result = await this.makeRequest(endpoint, { params });
      return { valid: true, data: result };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  // Get token info
  async getTokenInfo(accessToken) {
    const endpoint = '/debug_token';
    const params = {
      input_token: accessToken,
      access_token: `${this.appId}|${this.appSecret}`
    };

    return this.makeRequest(endpoint, { params });
  }

  // Webhook verification
  verifyWebhook(mode, token, challenge) {
    const verifyToken = process.env.META_WEBHOOK_VERIFY_TOKEN;
    
    if (mode === 'subscribe' && token === verifyToken) {
      logger.meta('Webhook verified successfully');
      return challenge;
    } else {
      logger.security('Webhook verification failed', { mode, token });
      return null;
    }
  }

  // Process webhook data
  processWebhookData(body) {
    try {
      const entries = body.entry || [];
      const processedData = [];

      for (const entry of entries) {
        // Instagram webhook data
        if (entry.changes) {
          for (const change of entry.changes) {
            if (change.field === 'comments') {
              processedData.push({
                type: 'instagram_comment',
                platform: 'instagram',
                userId: entry.id,
                data: change.value
              });
            }
          }
        }

        // Facebook webhook data
        if (entry.messaging) {
          for (const message of entry.messaging) {
            processedData.push({
              type: 'facebook_message',
              platform: 'facebook',
              userId: entry.id,
              data: message
            });
          }
        }
      }

      return processedData;
    } catch (error) {
      logger.error('Error processing webhook data:', error);
      throw error;
    }
  }

  // Batch request for multiple API calls
  async batchRequest(requests, accessToken) {
    const endpoint = '/';
    const options = {
      method: 'POST',
      data: {
        access_token: accessToken,
        batch: JSON.stringify(requests)
      }
    };

    return this.makeRequest(endpoint, options);
  }

  // Get user permissions
  async getUserPermissions(userId, accessToken) {
    const endpoint = `/${userId}/permissions`;
    const params = {
      access_token: accessToken
    };

    return this.makeRequest(endpoint, { params });
  }

  // Subscribe to webhook
  async subscribeWebhook(pageId, accessToken) {
    const endpoint = `/${pageId}/subscribed_apps`;
    const options = {
      method: 'POST',
      data: {
        subscribed_fields: 'comments,posts'
      },
      params: {
        access_token: accessToken
      }
    };

    return this.makeRequest(endpoint, options);
  }
}

module.exports = new MetaApiService();
