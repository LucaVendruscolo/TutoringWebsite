# Luca's Tutoring

A tutoring management website built with Next.js, Supabase, and Stripe.

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Database (Supabase)

1. Create a project at supabase.com
2. Run `supabase-schema.sql` in the SQL Editor
3. Copy your URL and keys from Settings > API

### 3. Payments (Stripe)

1. Get API keys from stripe.com
2. Create a webhook pointing to `/api/stripe/webhook`
3. Listen for `checkout.session.completed` events

### 4. Environment Variables

Create `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_pk
STRIPE_SECRET_KEY=your_stripe_sk
STRIPE_WEBHOOK_SECRET=your_webhook_secret
```

### 5. Make yourself admin

After signing up, run this SQL:

```sql
UPDATE profiles SET role = 'admin' WHERE email = 'your@email.com';
```

### 6. Run

```bash
npm run dev
```

## Deploy to Vercel

1. Push to GitHub
2. Import to Vercel
3. Add environment variables
4. Deploy

## Tech

- Next.js 15
- Supabase (database + auth)
- Stripe (payments)
- Tailwind CSS
