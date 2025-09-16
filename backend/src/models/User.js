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
    index: { unique: true }, // This is the correct way to define a unique index
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  // ... rest of the schema remains the same ...
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance (email index is now handled above)
userSchema.index({ 'subscription.stripeCustomerId': 1 });
userSchema.index({ 'subscription.status': 1 });
userSchema.index({ createdAt: -1 });

// ... rest of the file remains the same ...