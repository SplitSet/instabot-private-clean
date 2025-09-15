const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  // User who owns the monitored account
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Platform information
  platform: {
    type: String,
    enum: ['instagram', 'facebook'],
    required: true,
    index: true
  },
  
  // Post/Media information
  postId: {
    type: String,
    required: true,
    index: true
  },
  postType: {
    type: String,
    enum: ['photo', 'video', 'carousel', 'story', 'reel', 'post'],
    default: 'post'
  },
  postUrl: String,
  postCaption: String,
  
  // Comment information
  commentId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  commentText: {
    type: String,
    required: true,
    maxLength: 2200 // Instagram/Facebook comment limit
  },
  commentHtml: String, // For formatted comments
  
  // Comment author information
  authorId: {
    type: String,
    required: true,
    index: true
  },
  authorUsername: String,
  authorDisplayName: String,
  authorProfilePicture: String,
  authorIsVerified: {
    type: Boolean,
    default: false
  },
  
  // Comment metadata
  isReply: {
    type: Boolean,
    default: false
  },
  parentCommentId: String,
  replyCount: {
    type: Number,
    default: 0
  },
  likeCount: {
    type: Number,
    default: 0
  },
  
  // Bot processing information
  status: {
    type: String,
    enum: ['pending', 'processed', 'deleted', 'whitelisted', 'flagged', 'hidden'],
    default: 'pending',
    index: true
  },
  
  // Analysis results
  analysis: {
    isAuthorized: {
      type: Boolean,
      default: false
    },
    isOwnerComment: {
      type: Boolean,
      default: false
    },
    isWhitelisted: {
      type: Boolean,
      default: false
    },
    suspiciousScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    flags: [{
      type: {
        type: String,
        enum: [
          'spam',
          'scam',
          'impersonation',
          'inappropriate',
          'promotional',
          'suspicious_link',
          'fake_customer_service',
          'phishing',
          'malware',
          'harassment'
        ]
      },
      confidence: {
        type: Number,
        min: 0,
        max: 100
      },
      reason: String
    }],
    detectedKeywords: [String],
    detectedUrls: [String],
    detectedMentions: [String],
    detectedHashtags: [String]
  },
  
  // Action taken by bot
  action: {
    type: {
      type: String,
      enum: ['none', 'delete', 'hide', 'flag', 'notify'],
      default: 'none'
    },
    timestamp: Date,
    reason: String,
    success: {
      type: Boolean,
      default: false
    },
    error: String,
    retryCount: {
      type: Number,
      default: 0
    }
  },
  
  // Timestamps
  commentCreatedAt: {
    type: Date,
    required: true,
    index: true
  },
  discoveredAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  processedAt: Date,
  
  // Additional metadata
  metadata: {
    userAgent: String,
    ipAddress: String,
    location: {
      country: String,
      city: String,
      coordinates: {
        lat: Number,
        lng: Number
      }
    },
    device: {
      type: String,
      os: String,
      browser: String
    }
  },
  
  // Manual review information
  manualReview: {
    isReviewed: {
      type: Boolean,
      default: false
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reviewedAt: Date,
    reviewAction: {
      type: String,
      enum: ['approve', 'delete', 'hide', 'whitelist_author', 'flag']
    },
    reviewNotes: String
  },
  
  // Backup of original comment (in case of accidental deletion)
  originalData: {
    type: mongoose.Schema.Types.Mixed,
    select: false
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound indexes for better query performance
commentSchema.index({ userId: 1, platform: 1, status: 1 });
commentSchema.index({ userId: 1, discoveredAt: -1 });
commentSchema.index({ postId: 1, commentCreatedAt: -1 });
commentSchema.index({ authorId: 1, platform: 1 });
commentSchema.index({ 'analysis.suspiciousScore': -1 });
commentSchema.index({ commentCreatedAt: -1 });

// Virtual for time since comment was created
commentSchema.virtual('timeSinceCreated').get(function() {
  if (!this.commentCreatedAt) return null;
  return Date.now() - this.commentCreatedAt.getTime();
});

// Virtual for processing time
commentSchema.virtual('processingTime').get(function() {
  if (!this.discoveredAt || !this.processedAt) return null;
  return this.processedAt.getTime() - this.discoveredAt.getTime();
});

// Virtual for formatted comment text (truncated)
commentSchema.virtual('shortText').get(function() {
  if (!this.commentText) return '';
  return this.commentText.length > 100 
    ? this.commentText.substring(0, 100) + '...'
    : this.commentText;
});

// Method to mark as processed
commentSchema.methods.markAsProcessed = function(action, success = true, error = null) {
  this.status = success ? 'processed' : 'flagged';
  this.processedAt = new Date();
  this.action.type = action;
  this.action.timestamp = new Date();
  this.action.success = success;
  if (error) this.action.error = error;
  return this.save();
};

// Method to increment retry count
commentSchema.methods.incrementRetry = function() {
  this.action.retryCount += 1;
  return this.save();
};

// Method to add analysis flag
commentSchema.methods.addFlag = function(type, confidence, reason) {
  this.analysis.flags.push({
    type,
    confidence,
    reason
  });
  
  // Update suspicious score based on flags
  const avgConfidence = this.analysis.flags.reduce((sum, flag) => sum + flag.confidence, 0) / this.analysis.flags.length;
  this.analysis.suspiciousScore = Math.min(100, avgConfidence);
  
  return this.save();
};

// Method to whitelist author
commentSchema.methods.whitelistAuthor = async function() {
  const User = mongoose.model('User');
  const user = await User.findById(this.userId);
  
  if (user && !user.botSettings.whitelistedUsers.includes(this.authorId)) {
    user.botSettings.whitelistedUsers.push(this.authorId);
    await user.save();
  }
  
  this.analysis.isWhitelisted = true;
  this.status = 'whitelisted';
  return this.save();
};

// Static method to find suspicious comments
commentSchema.statics.findSuspicious = function(userId, threshold = 70) {
  return this.find({
    userId,
    'analysis.suspiciousScore': { $gte: threshold },
    status: { $in: ['pending', 'flagged'] }
  }).sort({ 'analysis.suspiciousScore': -1 });
};

// Static method to get comment statistics
commentSchema.statics.getStats = function(userId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return this.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        discoveredAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: null,
        totalComments: { $sum: 1 },
        deletedComments: {
          $sum: { $cond: [{ $eq: ['$status', 'deleted'] }, 1, 0] }
        },
        flaggedComments: {
          $sum: { $cond: [{ $eq: ['$status', 'flagged'] }, 1, 0] }
        },
        averageSuspiciousScore: { $avg: '$analysis.suspiciousScore' },
        platforms: {
          $push: '$platform'
        }
      }
    },
    {
      $project: {
        _id: 0,
        totalComments: 1,
        deletedComments: 1,
        flaggedComments: 1,
        averageSuspiciousScore: { $round: ['$averageSuspiciousScore', 2] },
        instagramComments: {
          $size: {
            $filter: {
              input: '$platforms',
              cond: { $eq: ['$$this', 'instagram'] }
            }
          }
        },
        facebookComments: {
          $size: {
            $filter: {
              input: '$platforms',
              cond: { $eq: ['$$this', 'facebook'] }
            }
          }
        }
      }
    }
  ]);
};

// Static method to find comments by post
commentSchema.statics.findByPost = function(postId, options = {}) {
  const query = { postId };
  const limit = options.limit || 50;
  const skip = options.skip || 0;
  const sort = options.sort || { commentCreatedAt: -1 };
  
  return this.find(query)
    .sort(sort)
    .limit(limit)
    .skip(skip)
    .populate('userId', 'name email')
    .populate('manualReview.reviewedBy', 'name');
};

// Static method to cleanup old comments
commentSchema.statics.cleanup = function(days = 90) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  return this.deleteMany({
    discoveredAt: { $lt: cutoffDate },
    status: { $in: ['processed', 'deleted'] },
    'manualReview.isReviewed': { $ne: true }
  });
};

// Pre-save middleware to extract metadata from comment text
commentSchema.pre('save', function(next) {
  if (this.isModified('commentText')) {
    // Extract URLs
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = this.commentText.match(urlRegex) || [];
    this.analysis.detectedUrls = urls;
    
    // Extract mentions
    const mentionRegex = /@(\w+)/g;
    const mentions = [...this.commentText.matchAll(mentionRegex)].map(match => match[1]);
    this.analysis.detectedMentions = mentions;
    
    // Extract hashtags
    const hashtagRegex = /#(\w+)/g;
    const hashtags = [...this.commentText.matchAll(hashtagRegex)].map(match => match[1]);
    this.analysis.detectedHashtags = hashtags;
  }
  
  next();
});

module.exports = mongoose.model('Comment', commentSchema);
