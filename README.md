# StateAI Index

A small, public-facing tracker for AI legislation in all 50 states and the District of Columbia. The first slice is deliberately focused: a responsive bill list with a state filter, source links, and proposed/enacted status.

## Run the app

```bash
npm install
npm run dev -- --hostname 0.0.0.0 --port 43123
```

Open `http://localhost:43123`.

## Data mode: fixture first

The app works without credentials. It includes realistic fixtures that retain LegiScan-style fields:

`bill_id`, `number`, `title`, `status`, `status_date`, `last_action`, `last_action_date`, `url`, `state`, `chamber`, `session`, `history`, `sponsors`, `texts`, and `progress`.

All 50 states plus DC appear in the filter. California, Colorado, Texas, Virginia, New York, Illinois, and Utah have active sample records; most other states intentionally return an empty result so empty-state behavior is visible.

The sole bill-source adapter is `src/lib/legiscan.ts`:

- No `LEGISCAN_API_KEY`: it returns the bundled fixtures.
- `LEGISCAN_API_KEY` set: it calls LegiScan's `getSearch` endpoint for an AI query and gracefully falls back to those same fixtures if the request fails.

Copy `.env.example` to `.env.local` to configure a key. The key is server-side only and is never sent to the browser.

## Public JSON API

The UI is backed by the same application data layer as these public routes:

| Endpoint | Description |
| --- | --- |
| `GET /api/bills` | All indexed AI bills |
| `GET /api/bills?state=CA` | Bills filtered to one postal code |
| `GET /api/states` | State summaries for 50 states + DC |
| `GET /api/states/CA/bills` | Bills for one state |
| `GET /api/states/VA/datacenters` | Fixture buildout records for one state |

Responses use `{ data, meta }`; invalid state codes return `404`.

## Python ingestion pipeline

The dependency-free pipeline creates a Convex-shaped local import document:

```bash
cd pipelines
python ingest.py
```

It writes `data/mock-convex-import.json` (ignored by git). Use `--source fixture` to force mock records, or set `LEGISCAN_API_KEY` and use the default `--source auto` to request live data with per-state fixture fallback:

```bash
LEGISCAN_API_KEY=... python ingest.py --source auto
```

If you use [uv](https://docs.astral.sh/uv/), the equivalent is `uv run python ingest.py`. `pipelines/pyproject.toml` has no runtime dependencies.

Set `CONVEX_INGEST_URL` to an HTTP action URL that accepts the generated JSON to POST it after the local write. `convex/schema.ts` defines the corresponding state, bill, and data-center tables; create a Convex deployment and ingest action before setting that URL. Until then, the app intentionally remains fully runnable from its local fixtures.

## Compute fixtures

Compute/buildout records are already shaped and exposed in the data layer and API to support the next UI slice. `EPOCH_DATASET_URL` is reserved for connecting a public Epoch AI source when a stable dataset endpoint is selected; no third-party credential is required for today’s mock fallback.
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
