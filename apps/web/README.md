This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Lilia API integration

This dashboard talks to the Fastify API through the server-side proxy at
`/api/lilia/*` (`src/app/api/lilia/[...path]/route.ts`), which injects the
bearer key. The key is never sent to the browser.

1. Copy `.env.local.example` to `.env.local` and fill it in:
   - `LILIA_API_BASE_URL` — Fastify API base URL (default `http://127.0.0.1:4000`)
   - `LILIA_API_KEY` — same value as the API server's `LILIA_API_KEY`
2. Start the API (`bun run dev` from the repository root).
3. Start this app (`bun run dev`) and open http://localhost:3000.

Live screens: Overview, Agents, Policies, Transactions, Threats, Integrations
(status), and Simulation Lab (real `/api/simulation/run` calls; off-chain only).
See `../../docs/FRONTEND_INTEGRATION_PLAN.md` for the full plan.

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
