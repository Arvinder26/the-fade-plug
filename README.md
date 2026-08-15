# Fade Plug

Booking website for Fade Plug in Papakura, with mobile grooming across Auckland.

## Local development

Requires Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

Use `.dev.vars.example` as the key-name template for local configuration. Keep real values only in the ignored `.dev.vars` file or the hosting provider's encrypted secret store.

## Production setup

The site uses:

- Cloudflare D1 for bookings, occupied time slots, request throttling and webhook idempotency
- Cloudflare R2 for private reference images
- Stripe Checkout for the 20% deposit and processing charge
- Resend for confirmations and private management links
- Cloudflare Turnstile for server-verified bot protection

Apply `drizzle/0000_fade_plug_bookings.sql` before enabling live bookings. Configure every value listed in `.dev.vars.example`; `BOOKING_TOKEN_SECRET` must be a random value of at least 32 characters. Stripe should send only `checkout.session.completed` and `checkout.session.expired` events to `/api/stripe/webhook`.

## Verification

```bash
npm run lint
npx tsc --noEmit
npm test
npm audit --omit=dev
```

The application validates prices and service combinations on the server, reserves the complete combined appointment duration, verifies Stripe webhook signatures and payment totals, deduplicates webhook events, checks uploaded file signatures, rate-limits public actions, and keeps management tokens out of query strings and Stripe metadata.
