const Stripe = require('stripe');
const User = require('../models/User');
const logger = require('../utils/logger');

class StripeService {
  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    this.webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    this.priceId = process.env.STRIPE_PRICE_ID; // Monthly subscription price ID
  }

  // Create Stripe customer
  async createCustomer(user) {
    try {
      const customer = await this.stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: {
          userId: user._id.toString()
        }
      });

      // Update user with Stripe customer ID
      user.subscription.stripeCustomerId = customer.id;
      await user.save();

      logger.payment('Stripe customer created', {
        userId: user._id,
        customerId: customer.id,
        email: user.email
      });

      return customer;

    } catch (error) {
      logger.error('Error creating Stripe customer:', error);
      throw error;
    }
  }

  // Get or create customer
  async getOrCreateCustomer(user) {
    try {
      if (user.subscription.stripeCustomerId) {
        // Try to retrieve existing customer
        try {
          const customer = await this.stripe.customers.retrieve(user.subscription.stripeCustomerId);
          if (!customer.deleted) {
            return customer;
          }
        } catch (error) {
          logger.warn('Existing Stripe customer not found, creating new one:', error);
        }
      }

      // Create new customer
      return await this.createCustomer(user);

    } catch (error) {
      logger.error('Error getting or creating Stripe customer:', error);
      throw error;
    }
  }

  // Create subscription
  async createSubscription(userId, priceId = null) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Get or create Stripe customer
      const customer = await this.getOrCreateCustomer(user);

      // Create subscription
      const subscription = await this.stripe.subscriptions.create({
        customer: customer.id,
        items: [{
          price: priceId || this.priceId
        }],
        payment_behavior: 'default_incomplete',
        payment_settings: {
          save_default_payment_method: 'on_subscription'
        },
        expand: ['latest_invoice.payment_intent'],
        metadata: {
          userId: user._id.toString()
        }
      });

      // Update user subscription info
      user.subscription.stripeSubscriptionId = subscription.id;
      user.subscription.status = 'inactive'; // Will be updated via webhook
      user.subscription.priceId = priceId || this.priceId;
      await user.save();

      logger.payment('Subscription created', {
        userId: user._id,
        subscriptionId: subscription.id,
        customerId: customer.id
      });

      return {
        subscriptionId: subscription.id,
        clientSecret: subscription.latest_invoice.payment_intent.client_secret,
        status: subscription.status
      };

    } catch (error) {
      logger.error('Error creating subscription:', error);
      throw error;
    }
  }

  // Cancel subscription
  async cancelSubscription(userId, immediately = false) {
    try {
      const user = await User.findById(userId);
      if (!user || !user.subscription.stripeSubscriptionId) {
        throw new Error('Subscription not found');
      }

      let subscription;
      
      if (immediately) {
        // Cancel immediately
        subscription = await this.stripe.subscriptions.cancel(
          user.subscription.stripeSubscriptionId
        );
      } else {
        // Cancel at period end
        subscription = await this.stripe.subscriptions.update(
          user.subscription.stripeSubscriptionId,
          {
            cancel_at_period_end: true
          }
        );
      }

      // Update user subscription info
      user.subscription.cancelAtPeriodEnd = !immediately;
      if (immediately) {
        user.subscription.status = 'cancelled';
      }
      await user.save();

      logger.payment('Subscription cancelled', {
        userId: user._id,
        subscriptionId: subscription.id,
        immediately
      });

      return subscription;

    } catch (error) {
      logger.error('Error cancelling subscription:', error);
      throw error;
    }
  }

  // Resume subscription
  async resumeSubscription(userId) {
    try {
      const user = await User.findById(userId);
      if (!user || !user.subscription.stripeSubscriptionId) {
        throw new Error('Subscription not found');
      }

      // Resume subscription
      const subscription = await this.stripe.subscriptions.update(
        user.subscription.stripeSubscriptionId,
        {
          cancel_at_period_end: false
        }
      );

      // Update user subscription info
      user.subscription.cancelAtPeriodEnd = false;
      await user.save();

      logger.payment('Subscription resumed', {
        userId: user._id,
        subscriptionId: subscription.id
      });

      return subscription;

    } catch (error) {
      logger.error('Error resuming subscription:', error);
      throw error;
    }
  }

  // Get subscription details
  async getSubscription(userId) {
    try {
      const user = await User.findById(userId);
      if (!user || !user.subscription.stripeSubscriptionId) {
        return null;
      }

      const subscription = await this.stripe.subscriptions.retrieve(
        user.subscription.stripeSubscriptionId,
        {
          expand: ['latest_invoice', 'customer', 'items.data.price']
        }
      );

      return subscription;

    } catch (error) {
      logger.error('Error getting subscription:', error);
      throw error;
    }
  }

  // Create payment method setup intent
  async createSetupIntent(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const customer = await this.getOrCreateCustomer(user);

      const setupIntent = await this.stripe.setupIntents.create({
        customer: customer.id,
        payment_method_types: ['card'],
        usage: 'off_session'
      });

      logger.payment('Setup intent created', {
        userId: user._id,
        setupIntentId: setupIntent.id,
        customerId: customer.id
      });

      return {
        clientSecret: setupIntent.client_secret,
        customerId: customer.id
      };

    } catch (error) {
      logger.error('Error creating setup intent:', error);
      throw error;
    }
  }

  // Get customer payment methods
  async getPaymentMethods(userId) {
    try {
      const user = await User.findById(userId);
      if (!user || !user.subscription.stripeCustomerId) {
        return [];
      }

      const paymentMethods = await this.stripe.paymentMethods.list({
        customer: user.subscription.stripeCustomerId,
        type: 'card'
      });

      return paymentMethods.data;

    } catch (error) {
      logger.error('Error getting payment methods:', error);
      throw error;
    }
  }

  // Delete payment method
  async deletePaymentMethod(userId, paymentMethodId) {
    try {
      const user = await User.findById(userId);
      if (!user || !user.subscription.stripeCustomerId) {
        throw new Error('Customer not found');
      }

      // Verify payment method belongs to customer
      const paymentMethod = await this.stripe.paymentMethods.retrieve(paymentMethodId);
      
      if (paymentMethod.customer !== user.subscription.stripeCustomerId) {
        throw new Error('Payment method does not belong to customer');
      }

      await this.stripe.paymentMethods.detach(paymentMethodId);

      logger.payment('Payment method deleted', {
        userId: user._id,
        paymentMethodId,
        customerId: user.subscription.stripeCustomerId
      });

      return true;

    } catch (error) {
      logger.error('Error deleting payment method:', error);
      throw error;
    }
  }

  // Get customer invoices
  async getInvoices(userId, limit = 10) {
    try {
      const user = await User.findById(userId);
      if (!user || !user.subscription.stripeCustomerId) {
        return [];
      }

      const invoices = await this.stripe.invoices.list({
        customer: user.subscription.stripeCustomerId,
        limit,
        expand: ['data.subscription', 'data.payment_intent']
      });

      return invoices.data;

    } catch (error) {
      logger.error('Error getting invoices:', error);
      throw error;
    }
  }

  // Handle webhook events
  async handleWebhook(payload, signature) {
    try {
      const event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        this.webhookSecret
      );

      logger.payment('Stripe webhook received', {
        type: event.type,
        id: event.id
      });

      switch (event.type) {
        case 'customer.subscription.created':
          await this.handleSubscriptionCreated(event.data.object);
          break;

        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event.data.object);
          break;

        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object);
          break;

        case 'invoice.payment_succeeded':
          await this.handlePaymentSucceeded(event.data.object);
          break;

        case 'invoice.payment_failed':
          await this.handlePaymentFailed(event.data.object);
          break;

        case 'customer.subscription.trial_will_end':
          await this.handleTrialWillEnd(event.data.object);
          break;

        default:
          logger.payment('Unhandled webhook event', { type: event.type });
      }

      return { received: true };

    } catch (error) {
      logger.error('Webhook handling error:', error);
      throw error;
    }
  }

  // Handle subscription created
  async handleSubscriptionCreated(subscription) {
    try {
      const userId = subscription.metadata.userId;
      const user = await User.findById(userId);

      if (user) {
        user.subscription.stripeSubscriptionId = subscription.id;
        user.subscription.status = subscription.status;
        user.subscription.currentPeriodStart = new Date(subscription.current_period_start * 1000);
        user.subscription.currentPeriodEnd = new Date(subscription.current_period_end * 1000);
        
        if (subscription.trial_end) {
          user.subscription.trialEnd = new Date(subscription.trial_end * 1000);
        }

        await user.save();

        logger.payment('Subscription created in database', {
          userId,
          subscriptionId: subscription.id,
          status: subscription.status
        });
      }

    } catch (error) {
      logger.error('Error handling subscription created:', error);
    }
  }

  // Handle subscription updated
  async handleSubscriptionUpdated(subscription) {
    try {
      const userId = subscription.metadata.userId;
      const user = await User.findById(userId);

      if (user) {
        user.subscription.status = subscription.status;
        user.subscription.currentPeriodStart = new Date(subscription.current_period_start * 1000);
        user.subscription.currentPeriodEnd = new Date(subscription.current_period_end * 1000);
        user.subscription.cancelAtPeriodEnd = subscription.cancel_at_period_end;

        if (subscription.trial_end) {
          user.subscription.trialEnd = new Date(subscription.trial_end * 1000);
        }

        await user.save();

        logger.payment('Subscription updated in database', {
          userId,
          subscriptionId: subscription.id,
          status: subscription.status
        });
      }

    } catch (error) {
      logger.error('Error handling subscription updated:', error);
    }
  }

  // Handle subscription deleted
  async handleSubscriptionDeleted(subscription) {
    try {
      const userId = subscription.metadata.userId;
      const user = await User.findById(userId);

      if (user) {
        user.subscription.status = 'cancelled';
        user.subscription.cancelAtPeriodEnd = false;
        await user.save();

        logger.payment('Subscription deleted in database', {
          userId,
          subscriptionId: subscription.id
        });
      }

    } catch (error) {
      logger.error('Error handling subscription deleted:', error);
    }
  }

  // Handle payment succeeded
  async handlePaymentSucceeded(invoice) {
    try {
      if (invoice.subscription) {
        const subscription = await this.stripe.subscriptions.retrieve(invoice.subscription);
        const userId = subscription.metadata.userId;
        const user = await User.findById(userId);

        if (user) {
          user.subscription.status = 'active';
          user.subscription.lastPaymentDate = new Date(invoice.created * 1000);
          user.subscription.nextBillingDate = new Date(subscription.current_period_end * 1000);
          await user.save();

          logger.payment('Payment succeeded', {
            userId,
            subscriptionId: subscription.id,
            invoiceId: invoice.id,
            amount: invoice.amount_paid
          });
        }
      }

    } catch (error) {
      logger.error('Error handling payment succeeded:', error);
    }
  }

  // Handle payment failed
  async handlePaymentFailed(invoice) {
    try {
      if (invoice.subscription) {
        const subscription = await this.stripe.subscriptions.retrieve(invoice.subscription);
        const userId = subscription.metadata.userId;
        const user = await User.findById(userId);

        if (user) {
          user.subscription.status = 'past_due';
          await user.save();

          logger.payment('Payment failed', {
            userId,
            subscriptionId: subscription.id,
            invoiceId: invoice.id,
            amount: invoice.amount_due
          });

          // TODO: Send payment failed notification email
        }
      }

    } catch (error) {
      logger.error('Error handling payment failed:', error);
    }
  }

  // Handle trial will end
  async handleTrialWillEnd(subscription) {
    try {
      const userId = subscription.metadata.userId;
      const user = await User.findById(userId);

      if (user) {
        logger.payment('Trial will end', {
          userId,
          subscriptionId: subscription.id,
          trialEnd: subscription.trial_end
        });

        // TODO: Send trial ending notification email
      }

    } catch (error) {
      logger.error('Error handling trial will end:', error);
    }
  }

  // Get pricing information
  async getPricing() {
    try {
      const price = await this.stripe.prices.retrieve(this.priceId, {
        expand: ['product']
      });

      return {
        id: price.id,
        amount: price.unit_amount,
        currency: price.currency,
        interval: price.recurring.interval,
        intervalCount: price.recurring.interval_count,
        product: {
          id: price.product.id,
          name: price.product.name,
          description: price.product.description
        }
      };

    } catch (error) {
      logger.error('Error getting pricing:', error);
      throw error;
    }
  }

  // Create customer portal session
  async createPortalSession(userId, returnUrl) {
    try {
      const user = await User.findById(userId);
      if (!user || !user.subscription.stripeCustomerId) {
        throw new Error('Customer not found');
      }

      const session = await this.stripe.billingPortal.sessions.create({
        customer: user.subscription.stripeCustomerId,
        return_url: returnUrl || `${process.env.FRONTEND_URL}/dashboard/subscription`
      });

      logger.payment('Customer portal session created', {
        userId,
        customerId: user.subscription.stripeCustomerId,
        sessionId: session.id
      });

      return session.url;

    } catch (error) {
      logger.error('Error creating portal session:', error);
      throw error;
    }
  }
}

module.exports = new StripeService();
