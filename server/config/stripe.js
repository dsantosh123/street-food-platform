const stripe = require('stripe');
require('dotenv').config();

// Initialize Stripe with secret key
const stripeClient = stripe(process.env.STRIPE_SECRET_KEY);

// Stripe configuration
const stripeConfig = {
  secretKey: process.env.STRIPE_SECRET_KEY,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  currency: 'usd', // Default currency
  successUrl: process.env.CLIENT_URL + '/payment/success',
  cancelUrl: process.env.CLIENT_URL + '/payment/cancel'
};

// Create payment intent
const createPaymentIntent = async (amount, currency = 'usd', metadata = {}) => {
  try {
    const paymentIntent = await stripeClient.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency,
      metadata,
      automatic_payment_methods: {
        enabled: true,
      },
    });
    return paymentIntent;
  } catch (error) {
    throw new Error(`Payment intent creation failed: ${error.message}`);
  }
};

// Create checkout session
const createCheckoutSession = async (lineItems, customerId, orderId) => {
  try {
    const session = await stripeClient.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      customer: customerId,
      metadata: {
        orderId: orderId.toString()
      },
      success_url: `${stripeConfig.successUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: stripeConfig.cancelUrl,
    });
    return session;
  } catch (error) {
    throw new Error(`Checkout session creation failed: ${error.message}`);
  }
};

// Create customer
const createCustomer = async (email, name, metadata = {}) => {
  try {
    const customer = await stripeClient.customers.create({
      email,
      name,
      metadata
    });
    return customer;
  } catch (error) {
    throw new Error(`Customer creation failed: ${error.message}`);
  }
};

// Retrieve checkout session
const retrieveSession = async (sessionId) => {
  try {
    const session = await stripeClient.checkout.sessions.retrieve(sessionId);
    return session;
  } catch (error) {
    throw new Error(`Session retrieval failed: ${error.message}`);
  }
};

// Construct webhook event
const constructWebhookEvent = (payload, signature) => {
  try {
    const event = stripeClient.webhooks.constructEvent(
      payload,
      signature,
      stripeConfig.webhookSecret
    );
    return event;
  } catch (error) {
    throw new Error(`Webhook signature verification failed: ${error.message}`);
  }
};

module.exports = {
  stripeClient,
  stripeConfig,
  createPaymentIntent,
  createCheckoutSession,
  createCustomer,
  retrieveSession,
  constructWebhookEvent
};