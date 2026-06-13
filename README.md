This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Docker (Demo / Presentation)

Run the full app locally with one command using Docker Compose.

### Prerequisites

- Docker & Docker Compose installed
- Supabase project (free tier works) — get keys from Settings → API

### Quick Start

```bash
# 1. Copy the environment template
cp .env.docker.example .env.docker

# 2. Fill in your Supabase keys in .env.docker
#    - NEXT_PUBLIC_SUPABASE_URL
#    - NEXT_PUBLIC_SUPABASE_ANON_KEY
#    - SUPABASE_SERVICE_ROLE_KEY
#    (MOCK_AI=true is already set — no AI billing needed)

# 3. Build and run
docker compose up --build

# 4. Open in browser
open http://localhost:3000
```

### What works in demo mode (MOCK_AI=true)

- Sign up / Sign in
- Create characters with memory fields
- Upload reference images
- Generate scenes (returns placeholder images)
- View generation history
- Credits deducted normally
- All security features active

### Useful Commands

```bash
# Stop containers
docker compose down

# Stop and remove database volume (fresh start)
docker compose down -v

# View app logs
docker compose logs -f app

# Rebuild after code changes
docker compose up --build
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Auto | Set by Docker Compose (connects to `db` service) |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key |
| `MOCK_AI` | No | Set to `true` to skip Replicate calls (default for demo) |
| `REPLICATE_API_TOKEN` | No | Only needed if `MOCK_AI=false` |
| `R2_*` | No | Cloudflare R2 keys (mock storage used if empty) |
