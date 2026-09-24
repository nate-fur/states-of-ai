# States of AI

A public tracker for AI legislation in all 50 states and the District of Columbia. The current slice is a responsive, searchable bill list with state filtering, proposed/enacted status, and source links.

## Run locally

```bash
npm install
npm run dev -- --hostname 0.0.0.0 --port 43123
```

The app runs from bundled LegiScan-shaped fixtures when Convex is not configured. This makes local development and the bill-list UI available without credentials.

## Convex backend

The deployed app reads bills from the `bills:list` Convex query whenever `NEXT_PUBLIC_CONVEX_URL` is set. If the URL is absent or Convex is unavailable, it falls back to the local fixture adapter.

This project uses the existing Convex project **states-of-ai** (team `nmfurbearr-gmail-com`):

- Development deployment: `dev/mac`
- Production deployment: `production`

Run this once from a machine authenticated to that Convex account to generate bindings and configure local development:

```bash
npx convex dev --once --configure existing --team nmfurbearr-gmail-com --project states-of-ai
```

That command writes the correct `CONVEX_DEPLOYMENT` and `NEXT_PUBLIC_CONVEX_URL` values to `.env.local`. It does not create a new Convex project.

### Fixture seed and pipeline

`convex/seed.ts` contains an idempotent internal `seed:fixtures` mutation (`npx convex run seed:fixtures`). It fills the states and regulation areas from the committed seed and empties every other table.

Preview deployments run `seed:fromSource` instead. It copies the tables the site renders from the deployment at `SEED_SOURCE_URL` (set as a default environment variable for preview deployments in the Convex dashboard) through its public `snapshot:page` query, and falls back to `seed:fixtures` when the URL is unset or unreadable. Bill texts are not copied.

The Python pipeline still supports fixture or live-LegiScan normalization:

```bash
cd pipelines
python3 ingest.py --source fixture
```

It writes `data/mock-convex-import.json`. To upload that document to an existing deployment, set these environment variables:

```bash
CONVEX_INGEST_URL=https://<deployment>.convex.site/ingest
CONVEX_INGEST_TOKEN=<long-random-token>
python3 ingest.py --source auto
```

Set the identical `CONVEX_INGEST_TOKEN` in Convex Dashboard → Settings → Environment Variables. The `/ingest` endpoint rejects calls without it.

## Vercel previews with Origin

`vercel.json` uses `npm run build:vercel`. That invokes:

```bash
npx convex deploy --cmd 'npm run build' \
  --cmd-url-env-var-name NEXT_PUBLIC_CONVEX_URL \
  --preview-run seed:fromSource
```

Convex deploys the backend first, exposes the matching deployment URL to the Next.js build as `NEXT_PUBLIC_CONVEX_URL`, and then builds the frontend. The preview seed is ignored by production deployments.

In the connected Vercel project, add `CONVEX_DEPLOY_KEY` twice:

| Vercel environment | Value |
| --- | --- |
| Preview | Preview Deploy Key from Convex Dashboard → states-of-ai → Settings |
| Production | Production Deploy Key from the same page |

Keep both values secret; do not commit them or place them in `.env.example`. A Vercel preview created from a GitHub branch push will then receive an isolated Convex preview deployment.

## Cursor MCP connections

The project configures a Vercel MCP server at `https://mcp.vercel.com` and starts the Convex MCP server locally through `npx convex mcp start`.

Vercel MCP requires a Cursor OAuth approval: when Cursor marks the server **Needs login**, select it and complete the browser sign-in. Convex MCP uses the local CLI session, so authenticate it with the same account used for `npx convex dev`.

## LegiScan fixture adapter

The fixture records retain these LegiScan-style fields: `bill_id`, `number`, `title`, `status`, `status_date`, `last_action`, `last_action_date`, `url`, `state`, `chamber`, `session`, `history`, `sponsors`, `texts`, and `progress`.

Without `LEGISCAN_API_KEY`, the adapter returns committed mock records. With it, the adapter discovers bills through `getSearch`, enriches records through `getBill`, and uses fixtures if the live source fails.

## Public JSON API

| Endpoint | Description |
| --- | --- |
| `GET /api/bills` | All indexed AI bills |
| `GET /api/bills?state=CA` | Bills filtered to one state |
| `GET /api/states` | State summaries for 50 states + DC |
| `GET /api/states/CA/bills` | Bills for a state |
| `GET /api/states/VA/datacenters` | Fixture buildout records |

Responses use `{ data, meta }`; invalid state codes return `404`.
