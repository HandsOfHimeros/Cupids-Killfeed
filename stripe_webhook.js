// Stripe Webhook Handler for Subscription Management
const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const db = require('./database.js');

const app = express();

// Stripe webhook endpoint - needs RAW body for signature verification
app.post('/webhooks/stripe', express.raw({type: 'application/json'}), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    let event;
    
    try {
        // Verify webhook signature
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
        console.log(`[STRIPE] Webhook received: ${event.type}`);
    } catch (err) {
        console.error(`[STRIPE] Webhook signature verification failed: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    
    // Handle different event types
    try {
        switch (event.type) {
            case 'checkout.session.completed':
                await handleCheckoutCompleted(event.data.object);
                break;
                
            case 'customer.subscription.created':
                await handleSubscriptionCreated(event.data.object);
                break;
                
            case 'customer.subscription.updated':
                await handleSubscriptionUpdated(event.data.object);
                break;
                
            case 'customer.subscription.deleted':
                await handleSubscriptionDeleted(event.data.object);
                break;
                
            case 'invoice.paid':
                await handleInvoicePaid(event.data.object);
                break;
                
            case 'invoice.payment_failed':
                await handleInvoicePaymentFailed(event.data.object);
                break;
                
            default:
                console.log(`[STRIPE] Unhandled event type: ${event.type}`);
        }
        
        res.json({received: true});
    } catch (err) {
        console.error(`[STRIPE] Error handling webhook: ${err.message}`);
        res.status(500).send('Internal Server Error');
    }
});

// Checkout session completed - initial purchase
async function handleCheckoutCompleted(session) {
    const guildId = session.metadata.guild_id;
    const customerId = session.customer;
    const subscriptionId = session.subscription;
    
    console.log(`[STRIPE] Checkout completed for guild ${guildId}`);
    
    // Update subscription with Stripe IDs
    await db.createSubscription(guildId, {
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId,
        planTier: 'premium',
        status: 'active',
        currentPeriodStart: null, // Will be set when subscription.created fires
        currentPeriodEnd: null,
        trialEnd: null
    });
    
    console.log(`[STRIPE] Guild ${guildId} upgraded to premium`);
}

// Subscription created - set billing period
async function handleSubscriptionCreated(subscription) {
    const guildId = subscription.metadata.guild_id;
    const currentPeriodStart = new Date(subscription.current_period_start * 1000);
    const currentPeriodEnd = new Date(subscription.current_period_end * 1000);
    
    console.log(`[STRIPE] Subscription created for guild ${guildId}`);
    
    await db.createSubscription(guildId, {
        stripeCustomerId: subscription.customer,
        stripeSubscriptionId: subscription.id,
        planTier: 'premium',
        status: subscription.status,
        currentPeriodStart: currentPeriodStart,
        currentPeriodEnd: currentPeriodEnd,
        trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null
    });
    
    console.log(`[STRIPE] Guild ${guildId} subscription active until ${currentPeriodEnd.toISOString()}`);
}

// Subscription updated - renewal, cancellation scheduled, etc.
async function handleSubscriptionUpdated(subscription) {
    const guildId = subscription.metadata.guild_id;
    const currentPeriodEnd = new Date(subscription.current_period_end * 1000);
    
    console.log(`[STRIPE] Subscription updated for guild ${guildId}: ${subscription.status}`);
    
    // If user canceled but still has access until period end
    if (subscription.cancel_at_period_end) {
        console.log(`[STRIPE] Guild ${guildId} will be downgraded at ${currentPeriodEnd.toISOString()}`);
    }
    
    await db.updateSubscriptionStatus(guildId, subscription.status, currentPeriodEnd);
}

// Subscription deleted - cancel immediately or at period end
async function handleSubscriptionDeleted(subscription) {
    const guildId = subscription.metadata.guild_id;
    
    console.log(`[STRIPE] Subscription deleted for guild ${guildId}`);
    
    // Downgrade to free tier
    await db.createSubscription(guildId, {
        stripeCustomerId: subscription.customer,
        stripeSubscriptionId: null,
        planTier: 'free',
        status: 'inactive',
        currentPeriodStart: null,
        currentPeriodEnd: null,
        trialEnd: null
    });
    
    await db.cancelSubscription(guildId);
    
    console.log(`[STRIPE] Guild ${guildId} downgraded to free tier`);
}

// Invoice paid - successful monthly renewal
async function handleInvoicePaid(invoice) {
    const subscriptionId = invoice.subscription;
    
    if (!subscriptionId) return; // Not a subscription invoice
    
    // Fetch subscription to get guild_id from metadata
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const guildId = subscription.metadata.guild_id;
    
    console.log(`[STRIPE] Invoice paid for guild ${guildId}`);
    
    // Extend subscription period
    const currentPeriodEnd = new Date(subscription.current_period_end * 1000);
    await db.updateSubscriptionStatus(guildId, 'active', currentPeriodEnd);
    
    console.log(`[STRIPE] Guild ${guildId} subscription extended until ${currentPeriodEnd.toISOString()}`);
}

// Invoice payment failed - retry or cancel
async function handleInvoicePaymentFailed(invoice) {
    const subscriptionId = invoice.subscription;
    
    if (!subscriptionId) return;
    
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const guildId = subscription.metadata.guild_id;
    
    console.log(`[STRIPE] Payment failed for guild ${guildId}`);
    
    // Stripe will retry automatically, but we can log it
    // If all retries fail, subscription.deleted event will fire
}

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'stripe-webhook' });
});

// Start webhook server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`[STRIPE] Webhook server listening on port ${PORT}`);
    console.log(`[STRIPE] Webhook URL: https://your-app.herokuapp.com/webhooks/stripe`);
});

module.exports = app;
