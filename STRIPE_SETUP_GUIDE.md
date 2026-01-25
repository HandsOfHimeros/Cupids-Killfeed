# Stripe Integration Setup Guide

## Overview
Your bot now has full Stripe integration for automated subscription management!

## What's Included:
✅ **Automatic Payment Processing** - Users click button → pay → instant premium access
✅ **Webhook Handlers** - All subscription lifecycle events handled automatically
✅ **Customer Portal** - Users can manage/cancel subscriptions themselves
✅ **Monthly Billing** - Stripe handles recurring charges automatically
✅ **Failed Payment Handling** - Automatic retries and downgrades

---

## Setup Steps

### 1. Create Stripe Account
1. Go to https://stripe.com/
2. Sign up for a free account
3. Complete business verification (takes 1-2 days)

### 2. Create Product & Price
1. Go to Stripe Dashboard → Products
2. Click "Add Product"
3. Name: `Cupid's Killfeed Premium`
4. Description: `Premium access to all bot features`
5. Pricing model: `Recurring`
6. Price: `$5.00 USD`
7. Billing period: `Monthly`
8. Copy the **Price ID** (starts with `price_...`)

### 3. Get API Keys
1. Go to Stripe Dashboard → Developers → API Keys
2. Copy **Publishable Key** (starts with `pk_live_...` or `pk_test_...`)
3. Copy **Secret Key** (starts with `sk_live_...` or `sk_test_...`)

### 4. Set Up Webhook
1. Go to Stripe Dashboard → Developers → Webhooks
2. Click "Add Endpoint"
3. Endpoint URL: `https://cupidskillfeed-3de371f45064.herokuapp.com/webhooks/stripe`
4. Description: `Discord Bot Subscriptions`
5. Events to send: Select these events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
6. Click "Add Endpoint"
7. Copy the **Webhook Signing Secret** (starts with `whsec_...`)

### 5. Configure Heroku Environment Variables
Run these commands (replace with your actual keys):

```bash
heroku config:set STRIPE_SECRET_KEY="sk_test_..." --app cupidskillfeed
heroku config:set STRIPE_PRICE_ID="price_..." --app cupidskillfeed
heroku config:set STRIPE_WEBHOOK_SECRET="whsec_..." --app cupidskillfeed
```

### 6. Deploy Updated Code
```bash
git add .
git commit -m "Add Stripe integration for automated subscriptions"
npm version patch --no-git-tag-version
git add package.json
git commit --amend --no-edit
git push heroku main
```

### 7. Test Stripe Integration
1. In Discord, run `/subscribe`
2. You should see "Upgrade to Premium" button
3. Click button → redirects to Stripe checkout
4. Use test card: `4242 4242 4242 4242` (any future date, any CVC)
5. Complete checkout
6. Bot should automatically upgrade server to premium
7. Run `/subscription` to verify premium status

---

## How It Works

### User Flow:
1. User runs `/subscribe` command
2. Bot generates Stripe checkout session with guild_id in metadata
3. User clicks "Upgrade to Premium" button
4. Redirected to Stripe checkout page
5. Enters payment info and completes purchase
6. Stripe sends webhook to bot: `checkout.session.completed`
7. Bot updates database: guild → premium tier
8. User immediately has premium access (next command checks database)

### Monthly Billing:
- Stripe automatically charges user monthly
- On success: `invoice.paid` webhook → bot extends subscription
- On failure: `invoice.payment_failed` webhook → Stripe retries 3x
- After failed retries: `subscription.deleted` webhook → bot downgrades to free

### Cancellation:
- User clicks "Manage Subscription" in `/subscribe` command
- Opens Stripe customer portal
- User cancels subscription
- Stripe sends `subscription.updated` webhook (cancel_at_period_end = true)
- Bot keeps premium active until period end
- At period end: `subscription.deleted` webhook → downgrade to free

---

## Testing Mode vs Production

### Test Mode (Development):
- Use test API keys (`pk_test_...`, `sk_test_...`)
- No real money charged
- Test cards: https://stripe.com/docs/testing#cards
- Recommended test card: `4242 4242 4242 4242`

### Production Mode (Live):
- Use live API keys (`pk_live_...`, `sk_live_...`)
- Real money charged
- Business verification required
- Enable "Live Mode" toggle in Stripe dashboard

---

## Troubleshooting

### Webhook Not Receiving Events:
1. Check Heroku logs: `heroku logs --tail --app cupidskillfeed`
2. Verify webhook URL is correct in Stripe dashboard
3. Check webhook signing secret matches Heroku config
4. Test webhook: Stripe Dashboard → Webhooks → Your Endpoint → Send Test Webhook

### Checkout Button Not Appearing:
1. Verify environment variables set: `heroku config --app cupidskillfeed`
2. Check for `STRIPE_SECRET_KEY` and `STRIPE_PRICE_ID`
3. Check bot logs for Stripe errors

### Payment Succeeded But Server Not Upgraded:
1. Check webhook received: Heroku logs should show `[STRIPE] Webhook received: checkout.session.completed`
2. Check guild_id in metadata matches Discord server ID
3. Verify database updated: Run `node check_subscriptions.js` locally

---

## Security Notes

⚠️ **Never commit API keys to GitHub**
- Use Heroku config vars only
- Keep `.env` in `.gitignore`
- Rotate keys if accidentally exposed

✅ **Webhook signature verification**
- All webhooks verify Stripe signature
- Prevents malicious requests
- Automatically handled by `stripe.webhooks.constructEvent()`

---

## Support Resources

- **Stripe Documentation**: https://stripe.com/docs
- **Stripe Testing**: https://stripe.com/docs/testing
- **Webhook Events**: https://stripe.com/docs/api/events/types
- **Customer Portal**: https://stripe.com/docs/billing/subscriptions/integrating-customer-portal

---

## Next Steps After Setup

1. ✅ Test with test card
2. ✅ Verify webhooks working in Heroku logs
3. ✅ Complete Stripe business verification
4. ✅ Switch to production API keys
5. ✅ Announce premium features to Discord servers!

