# TutorHub - Online Tutoring Platform

A modern, full-featured tutoring management platform built with Next.js, Supabase, and Stripe.

## Features

### For Tutors (Admin)
- 📊 **Dashboard Analytics** - Overview of students, lessons, and earnings
- 👥 **Student Management** - Add students with temporary passwords, edit profiles
- 📅 **Lesson Booking** - Create one-off or weekly recurring lessons (52 weeks/1 year)
- ⚠️ **Double-booking Detection** - Warns when scheduling overlapping lessons
- 💰 **Payment Tracking** - View all student balances and transaction history
- 🌍 **Timezone Support** - View lessons in different timezones (bookings always in UK time)

### For Students/Parents
- 📆 **Lesson Calendar** - View scheduled lessons in your timezone
- ❌ **Cancel Lessons** - Cancel up to 24 hours after the lesson ends (with refund)
- 📝 **Reschedule Lessons** - Reschedule upcoming lessons
- 💳 **Stripe Payments** - Securely add funds to balance (min £5)
- 📜 **Payment History** - View all deposits, charges, and refunds
- ⚙️ **Settings** - Change timezone and password

## Tech Stack

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS with custom design system
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Payments**: Stripe
- **Animations**: Framer Motion

## Getting Started

### 1. Clone and Install

```bash
npm install
```

### 2. Set Up Supabase

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run the schema in `supabase-schema.sql`
3. Copy your project URL and keys from Settings > API

### 3. Set Up Stripe

1. Create a Stripe account at [stripe.com](https://stripe.com)
2. Get your API keys from the Stripe Dashboard
3. Set up a webhook endpoint pointing to `/api/stripe/webhook`
   - Events to listen for: `checkout.session.completed`

### 4. Configure Environment Variables

Create a `.env.local` file (see `env.example.txt` for reference):

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Optional: Cron job secret
CRON_SECRET=your_cron_secret
```

### 5. Create Admin Account

1. Sign up normally through the Supabase Auth UI or directly in the database
2. Run this SQL to make yourself an admin:

```sql
UPDATE profiles SET role = 'admin' WHERE email = 'your-email@example.com';
```

### 6. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Automatic Lesson Processing

Lessons need to be marked as completed and charges need to be applied when lessons end. Set up a cron job to call:

```
GET /api/cron/process-lessons
```

**Options:**
- **Vercel Cron**: Add to `vercel.json`
- **GitHub Actions**: Set up a scheduled workflow
- **External Service**: Use cron-job.org or similar

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import to Vercel
3. Add environment variables
4. Deploy!

Add this to `vercel.json` for cron jobs:

```json
{
  "crons": [
    {
      "path": "/api/cron/process-lessons",
      "schedule": "0 * * * *"
    }
  ]
}
```

## Project Structure

```
├── app/
│   ├── admin/          # Admin pages
│   │   ├── dashboard/  # Admin dashboard
│   │   ├── students/   # Student management
│   │   ├── calendar/   # Lesson calendar
│   │   └── payments/   # Payment tracking
│   ├── student/        # Student pages
│   │   ├── dashboard/  # Student dashboard
│   │   ├── lessons/    # Lesson management
│   │   ├── calendar/   # Calendar view
│   │   ├── balance/    # Balance & deposits
│   │   ├── history/    # Transaction history
│   │   └── settings/   # Account settings
│   ├── api/            # API routes
│   ├── login/          # Login page
│   └── reset-password/ # Password reset
├── components/
│   ├── ui/             # Reusable UI components
│   └── layout/         # Layout components
├── lib/
│   ├── supabase/       # Supabase clients
│   ├── types.ts        # TypeScript types
│   └── utils.ts        # Utility functions
└── supabase-schema.sql # Database schema
```

## Design

The website features a bright, abstract minimalist design with:
- Warm orange/coral primary colors
- Sky blue accent colors
- Soft gradients and glass morphism effects
- Smooth animations and micro-interactions
- Responsive layout for all devices

## License

MIT

