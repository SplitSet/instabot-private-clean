const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxLength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minLength: [8, 'Password must be at least 8 characters'],
    select: false // Don't include password in queries by default
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  emailVerificationExpires: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  
  // Profile information
  avatar: String,
  timezone: {
    type: String,
    default: 'UTC'
  },
  language: {
    type: String,
    default: 'en'
  },
  
  // Meta API tokens and settings
  metaTokens: {
    instagramAccessToken: {
      type: String,
      select: false
    },
    instagramTokenExpires: Date,
    facebookAccessToken: {
      type: String,
      select: false
    },
    facebookTokenExpires: Date,
    instagramBusinessAccountId: String,
    facebookPageId: String,
    lastTokenRefresh: Date
  },
  
  // Bot settings
  botSettings: {
    isEnabled: {
      type: Boolean,
      default: false
    },
    monitorInstagram: {
      type: Boolean,
      default: true
    },
    monitorFacebook: {
      type: Boolean,
      default: true
    },
    checkIntervalMinutes: {
      type: Number,
      default: 5,
      min: 1,
      max: 60
    },
    deleteUnauthorizedComments: {
      type: Boolean,
      default: true
    },
    notifyOnDeletion: {
      type: Boolean,
      default: true
    },
    whitelistedUsers: [String],
    blacklistedKeywords: [String],
    customRules: [{
      name: String,
      condition: String,
      action: {
        type: String,
        enum: ['delete', 'hide', 'flag'],
        default: 'delete'
      },
      isEnabled: {
        type: Boolean,
        default: true
      }
    }]
  },
  
  // Subscription information
  subscription: {
    status: {
      type: String,
      enum: ['active', 'inactive', 'cancelled', 'past_due', 'trialing'],
      default: 'inactive'
    },
    stripeCustomerId: String,
    stripeSubscriptionId: String,
    currentPeriodStart: Date,
    currentPeriodEnd: Date,
    cancelAtPeriodEnd: {
      type: Boolean,
      default: false
    },
    trialEnd: Date,
    lastPaymentDate: Date,
    nextBillingDate: Date,
    plan: {
      type: String,
      enum: ['basic', 'pro', 'enterprise'],
      default: 'basic'
    },
    priceId: String
  },
  
  // Usage statistics
  usage: {
    commentsProcessed: {
      type: Number,
      default: 0
    },
    commentsDeleted: {
      type: Number,
      default: 0
    },
    postsMonitored: {
      type: Number,
      default: 0
    },
    lastBotRun: Date,
    monthlyUsage: {
      month: String,
      year: Number,
      commentsProcessed: Number,
      commentsDeleted: Number
    }
  },
  
  // Notification preferences
  notifications: {
    email: {
      commentDeleted: {
        type: Boolean,
        default: true
      },
      subscriptionExpiring: {
        type: Boolean,
        default: true
      },
      botErrors: {
        type: Boolean,
        default: true
      },
      weeklyReport: {
        type: Boolean,
        default: true
      }
    },
    inApp: {
      commentDeleted: {
        type: Boolean,
        default: true
      },
      botStatus: {
        type: Boolean,
        default: true
      }
    }
  },
  
  // Security and audit
  lastLogin: Date,
  lastLoginIP: String,
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: Date,
  refreshTokens: [{
    token: String,
    createdAt: {
      type: Date,
      default: Date.now
    },
    expiresAt: Date,
    isActive: {
      type: Boolean,
      default: true
    }
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
userSchema.index({ email: 1 });
userSchema.index({ 'subscription.stripeCustomerId': 1 });
userSchema.index({ 'subscription.status': 1 });
userSchema.index({ createdAt: -1 });

// Virtual for account lock status
userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Virtual for subscription active status
userSchema.virtual('isSubscriptionActive').get(function() {
  return this.subscription.status === 'active' || this.subscription.status === 'trialing';
});

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    this.password = await bcrypt.hash(this.password, saltRounds);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to generate JWT token
userSchema.methods.generateAuthToken = function() {
  const payload = {
    id: this._id,
    email: this.email,
    role: this.role
  };
  
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '15m'
  });
};

// Method to generate refresh token
userSchema.methods.generateRefreshToken = function() {
  const payload = {
    id: this._id,
    type: 'refresh'
  };
  
  const token = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d'
  });
  
  // Store refresh token
  this.refreshTokens.push({
    token,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
  });
  
  return token;
};

// Method to increment login attempts
userSchema.methods.incLoginAttempts = function() {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 }
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  
  // Lock account after 5 attempts for 2 hours
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 };
  }
  
  return this.updateOne(updates);
};

// Method to reset login attempts
userSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $unset: { loginAttempts: 1, lockUntil: 1 }
  });
};

// Method to check if subscription is valid
userSchema.methods.hasValidSubscription = function() {
  if (!this.subscription) return false;
  
  const now = new Date();
  return (
    this.subscription.status === 'active' ||
    (this.subscription.status === 'trialing' && this.subscription.trialEnd > now)
  );
};

// Method to update usage statistics
userSchema.methods.updateUsage = function(commentsProcessed = 0, commentsDeleted = 0, postsMonitored = 0) {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  
  // Update overall usage
  this.usage.commentsProcessed += commentsProcessed;
  this.usage.commentsDeleted += commentsDeleted;
  this.usage.postsMonitored += postsMonitored;
  this.usage.lastBotRun = now;
  
  // Update monthly usage
  if (!this.usage.monthlyUsage || 
      this.usage.monthlyUsage.month !== currentMonth.toString() || 
      this.usage.monthlyUsage.year !== currentYear) {
    this.usage.monthlyUsage = {
      month: currentMonth.toString(),
      year: currentYear,
      commentsProcessed,
      commentsDeleted
    };
  } else {
    this.usage.monthlyUsage.commentsProcessed += commentsProcessed;
    this.usage.monthlyUsage.commentsDeleted += commentsDeleted;
  }
  
  return this.save();
};

// Static method to find user by email
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

// Static method to find users with expiring subscriptions
userSchema.statics.findExpiringSubscriptions = function(days = 3) {
  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() + days);
  
  return this.find({
    'subscription.status': 'active',
    'subscription.currentPeriodEnd': { $lte: expirationDate }
  });
};

module.exports = mongoose.model('User', userSchema);
