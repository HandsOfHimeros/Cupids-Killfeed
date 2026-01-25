// Stripe Checkout Session Creation
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

/**
 * Create a Stripe checkout session for premium subscription
 * @param {string} guildId - Discord guild ID
 * @param {string} guildName - Discord guild name
 * @param {string} userEmail - Customer email (optional)
 * @returns {Promise<string>} - Checkout session URL
 */
async function createCheckoutSession(guildId, guildName, userEmail = null) {
    try {
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price: process.env.STRIPE_PRICE_ID, // Set this in Heroku config
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            success_url: `https://discord.com/channels/${guildId}`,
            cancel_url: `https://discord.com/channels/${guildId}`,
            customer_email: userEmail,
            metadata: {
                guild_id: guildId,
                guild_name: guildName
            },
            subscription_data: {
                metadata: {
                    guild_id: guildId,
                    guild_name: guildName
                }
            }
        });
        
        console.log(`[STRIPE] Created checkout session for guild ${guildId}: ${session.id}`);
        return session.url;
    } catch (error) {
        console.error('[STRIPE] Error creating checkout session:', error.message);
        throw error;
    }
}

/**
 * Create a customer portal session for managing subscription
 * @param {string} customerId - Stripe customer ID
 * @param {string} guildId - Discord guild ID (for return URL)
 * @returns {Promise<string>} - Portal session URL
 */
async function createPortalSession(customerId, guildId) {
    try {
        const session = await stripe.billingPortal.sessions.create({
            customer: customerId,
            return_url: `https://discord.com/channels/${guildId}`,
        });
        
        console.log(`[STRIPE] Created portal session for customer ${customerId}`);
        return session.url;
    } catch (error) {
        console.error('[STRIPE] Error creating portal session:', error.message);
        throw error;
    }
}

module.exports = {
    createCheckoutSession,
    createPortalSession
};
